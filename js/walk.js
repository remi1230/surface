//*****************************************************************************************************//
//******************************************* SURFACE WALK ********************************************//
//*****************************************************************************************************//
//
// First-person traversal of the mesh. The character lives in parametric space (u, v);
// its world position comes from ShaderMeshBase#probePoints, which runs the very vertex
// shader the mesh is rendered with. So the ground under the character is the surface
// actually drawn — blender, symmetry, wave deformation, the deformation expression and
// the geometry editor's raw GLSL all included, animated in time like everything else.
//
// The camera is never moved directly: a TransformNode ("walkRig") is placed on the
// surface and the camera is parented to it. In WebXR the headset owns the camera pose,
// so the rig is the only place a locomotion system can write — building it this way now
// is what makes VR a matter of attaching an XR experience to the same node later.
//

/** Tunables for the walk mode. Distances are expressed as fractions of the mesh scale. */
const WALK = {
	/**
	 * Eye height above the surface, as a fraction of the mesh bounding-box diagonal, at
	 * the default body size. Multiplied by {@link glo.walk.bodyScale} — see
	 * {@link walkApplyScale} for why that knob has to exist.
	 */
	EYE_RATIO: 0.02,
	/** Walking speed in eye-heights per second. */
	SPEED_EYES: 1.6,
	/** Body turn rate (rad/s) for the left/right arrows. */
	TURN_SPEED: 1.5,
	/** Mouse look sensitivity (rad per pixel) when the pointer is locked. */
	MOUSE_SENS: 0.0025,
	/** Jump apex, in eye heights. */
	JUMP_EYES: 0.55,
	/** Gravity, in eye heights per second squared. */
	GRAVITY_EYES: 6.0,
	/** Time constant (s) of the low-pass filter on the surface frame. */
	SMOOTH_TAU: 0.09,
	/** Max pitch away from the tangent plane (rad). Kept clear of the LookAt singularity. */
	PITCH_LIMIT: 1.45,
	/** Resolution of the one-shot survey used to measure scale, centroid and closure. */
	SURVEY: 12,
	/** Relative distance below which two domain edges are considered to be the same seam. */
	CLOSURE_EPS: 0.002,
	/** Per-frame displacement ceiling, in grid cells (the probe patch stays valid). */
	MAX_CELLS_PER_FRAME: 0.5,
	/** Target duration of one rail lap in fullscreen video mode, in seconds. */
	CINEMA_LAP_SECONDS: 24,
	/**
	 * Viewpoint height change rate, in e-foldings per second. Multiplicative rather than
	 * additive because the useful range spans four orders of magnitude — from nose to the
	 * surface up to a wide overview — and a fixed increment would be useless at one end
	 * and unusable at the other.
	 */
	HEIGHT_RATE: 1.2,
	/** Bounds on the viewpoint height multiplier. */
	HEIGHT_MIN_SCALE: 0.02,
	HEIGHT_MAX_SCALE: 150,
	/** Body size factor per press of Shift + PageUp / PageDown. Halving or doubling. */
	BODY_STEP: 2,
	/**
	 * Bounds on the body size multiplier — i.e. on how giant a surface can be made to feel,
	 * since `1 / bodyScale` *is* the apparent size of the world.
	 *
	 * The lower bound is set by float32, not by taste. Vertex positions come back from the
	 * probe (and go through the GPU) in single precision, so they are quantized to about
	 * 6e-8 of the form's own size; the eye sits at `EYE_RATIO * bodyScale` of it. At
	 * 1e-3 the quantization is 0.3% of an eye height — invisible. A decade lower it is 3%,
	 * and the ground under a tiny walker visibly shimmers.
	 *
	 * The upper bound is set by the grid: a stride is capped at {@link MAX_CELLS_PER_FRAME}
	 * cells, so a character much bigger than this walks into the throttle (`agent.clamped`)
	 * instead of going faster. Raise the mesh resolution to go further.
	 */
	BODY_MIN_SCALE: 1e-3,
	BODY_MAX_SCALE: 8,
	/**
	 * Largest far/near ratio allowed on the walking camera. A 24-bit depth buffer resolves
	 * roughly this much; past it the surface z-fights with itself. It is the far plane that
	 * gives way, never the near one — raising the near plane instead would clip the ground
	 * at the character's own feet, which is worse than a horizon.
	 */
	DEPTH_RANGE: 1e5,
	/** Mini-map side, as a fraction of the view height. */
	MAP_SIZE: 0.26,
	/** Gap between the mini-map and the edge of the view, same units. */
	MAP_MARGIN: 0.02,
	/** Border thickness of the mini-map, same units. */
	MAP_BORDER: 0.005,
	/** Mini-map render target resolution, in pixels. Fixed: it need not follow the screen. */
	MAP_TEXTURE: 384,
	/** Refresh the mini-map every N frames. A map does not need 60 Hz. */
	MAP_REFRESH: 4,
	/** How far the mini-map camera sits from the form, in bounding-box diagonals. */
	MAP_DISTANCE: 1.05,
	/** Avatar size, as a fraction of the bounding-box diagonal. */
	MAP_AVATAR_RATIO: 0.075,
};

/**
 * Layer masks splitting what each camera sees.
 *
 * Babylon tests `camera.layerMask & mesh.layerMask`, so a camera cannot subtract
 * anything: the split has to be arranged so the right bits already line up. Giving the
 * mini-map camera a bit of its own, and the mesh both bits, means the map sees the
 * surface and the avatar while the first-person camera sees the surface and the GUI —
 * and neither sees the other's. Without this the fullscreen GUI, which is a layer like
 * any other, would be squeezed into the mini-map viewport.
 */
const WALK_LAYER = {
	/** Default for everything already in the scene: GUI, grid, axes. */
	MAIN: 0x0FFFFFFF,
	/** The mini-map camera and the avatar, invisible to the walking camera. */
	MAP: 0x10000000,
	/** The mesh, so both cameras draw it. */
	BOTH: 0x1FFFFFFF,
};

// Scratch buffers — allocated once, the walk loop must not churn the GC. The patch
// buffers moved to agents.js along with the surface sampling; what is left here serves
// the one-shot survey and the rig pose.
const _walkSurveyIdx = new Float32Array(WALK.SURVEY * WALK.SURVEY * 2);
const _wTmpA = new BABYLON.Vector3();
const _wTmpB = new BABYLON.Vector3();
const _wTmpC = new BABYLON.Vector3();
const _wWorldPos = new BABYLON.Vector3();
const _wWorldTu  = new BABYLON.Vector3();
const _wWorldTv  = new BABYLON.Vector3();
const _wUp       = new BABYLON.Vector3();
const _wFwd      = new BABYLON.Vector3();
const _wRight    = new BABYLON.Vector3();
const _wBasis    = new BABYLON.Matrix();

/**
 * Uniform Catmull-Rom spline through `p1` and `p2`, with `p0`/`p3` as the surrounding
 * control points. Writes the point at `t` into `out` and, when `outD` is provided, the
 * derivative with respect to `t`.
 *
 * Catmull-Rom is what buys C1 continuity across cell boundaries: it passes exactly
 * through every control point (so the character touches the real vertices) while its
 * derivative is continuous from one cell to the next (so the tangent frame — and hence
 * the camera — never jerks when a boundary is crossed).
 *
 * @param {BABYLON.Vector3} p0 - Control point before the segment.
 * @param {BABYLON.Vector3} p1 - Start of the segment.
 * @param {BABYLON.Vector3} p2 - End of the segment.
 * @param {BABYLON.Vector3} p3 - Control point after the segment.
 * @param {number} t - Parameter in [0, 1] between `p1` and `p2`.
 * @param {BABYLON.Vector3} out - Receives the interpolated point.
 * @param {BABYLON.Vector3|null} [outD=null] - Receives the derivative, when given.
 */
function walkCatmullRom(p0, p1, p2, p3, t, out, outD) {
	const t2 = t * t, t3 = t2 * t;
	const cx1 = p2.x - p0.x, cy1 = p2.y - p0.y, cz1 = p2.z - p0.z;
	const cx2 = 2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x;
	const cy2 = 2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y;
	const cz2 = 2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z;
	const cx3 = -p0.x + 3 * p1.x - 3 * p2.x + p3.x;
	const cy3 = -p0.y + 3 * p1.y - 3 * p2.y + p3.y;
	const cz3 = -p0.z + 3 * p1.z - 3 * p2.z + p3.z;

	out.set(
		0.5 * (2 * p1.x + cx1 * t + cx2 * t2 + cx3 * t3),
		0.5 * (2 * p1.y + cy1 * t + cy2 * t2 + cy3 * t3),
		0.5 * (2 * p1.z + cz1 * t + cz2 * t2 + cz3 * t3)
	);
	if (outD) {
		outD.set(
			0.5 * (cx1 + 2 * cx2 * t + 3 * cx3 * t2),
			0.5 * (cy1 + 2 * cy2 * t + 3 * cy3 * t2),
			0.5 * (cz1 + 2 * cz2 * t + 3 * cz3 * t2)
		);
	}
}

/**
 * Returns the active GPU shader mesh instance and its actual grid size, or `null`
 * when there is nothing walkable (no mesh, or a degenerate grid because the
 * equations do not depend on u or v).
 * @returns {{inst: ShaderMeshBase, gridU: number, gridV: number}|null}
 */
function walkMeshInfo() {
	const inst = glo.ribbon && glo.ribbon.shaderMeshInstance;
	if (!inst) return null;

	// create() collapses an unused parameter to a single row — mirror that here so we
	// never index a cell the mesh does not have.
	const gridU = inst.uvInfos && !inst.uvInfos.isU ? 0 : inst.stepsU;
	const gridV = inst.uvInfos && !inst.uvInfos.isV ? 0 : inst.stepsV;
	if (gridU < 2 || gridV < 2) return null;

	return { inst, gridU, gridV };
}

/**
 * Evaluates the surface at one parametric position, in **object space**.
 *
 * A thin wrapper over {@link agentEvalAt} kept for the one-shot callers — dropping the
 * character on entry, measuring a rail. The per-frame path does not come through here:
 * it goes through {@link agentsStep}, which batches every agent into a single probe call.
 *
 * @param {object} info - Result of {@link walkMeshInfo}.
 * @param {number} u - Parametric u.
 * @param {number} v - Parametric v.
 * @returns {object} A frame, reused between calls; check `.valid`.
 */
function walkEvalSurface(info, u, v) {
	return agentEvalAt(info, glo.walk, u, v);
}

/**
 * One-shot coarse survey of the surface: bounding box, centroid and whether the domain
 * closes on itself along u and v.
 *
 * Closure detection is what turns the domain edge from an invisible wall into a seamless
 * loop: on a torus or a sphere the last row of vertices coincides with the first, so the
 * character can walk across it forever. Costs a single probe at mode entry.
 *
 * @returns {{scale: number, center: BABYLON.Vector3, closedU: boolean, closedV: boolean}|null}
 */
function walkSurveySurface() {
	const info = walkMeshInfo();
	if (!info) return null;
	const { inst, gridU, gridV } = info;

	const n = WALK.SURVEY;
	let k = 0;
	for (let a = 0; a < n; a++) {
		for (let b = 0; b < n; b++) {
			_walkSurveyIdx[k++] = Math.round(a * gridU / (n - 1));
			_walkSurveyIdx[k++] = Math.round(b * gridV / (n - 1));
		}
	}

	const probe = inst.probePoints(_walkSurveyIdx, n * n);
	if (!probe) return null;

	const min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
	const max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
	const sum = new BABYLON.Vector3(0, 0, 0);
	let valid = 0;
	for (let p = 0; p < n * n; p++) {
		const x = probe.positions[p * 3], y = probe.positions[p * 3 + 1], z = probe.positions[p * 3 + 2];
		if (!isFinite(x) || !isFinite(y) || !isFinite(z)) continue;
		min.set(Math.min(min.x, x), Math.min(min.y, y), Math.min(min.z, z));
		max.set(Math.max(max.x, x), Math.max(max.y, y), Math.max(max.z, z));
		sum.addInPlaceFromFloats(x, y, z);
		valid++;
	}
	if (!valid) return null;

	const scale = Math.max(max.subtract(min).length(), 1e-4);
	const center = sum.scaleInPlace(1 / valid);

	// Closure: compare the two extreme rows (and columns) of the survey grid, both
	// straight across and with the other parameter mirrored.
	//
	// The mirrored test is what a Möbius strip needs. Its seam does close — the two
	// u-edges are the same curve — but only after reversing v, so a straight comparison
	// finds a gap and calls it a border. The character then bounces off the one place
	// that makes the surface interesting. A figure-8 Klein bottle carries the same
	// identification. Measured, the mirrored gap on both is exactly 0.
	const at = (a, b) => _wTmpA.set(
		probe.positions[(a * n + b) * 3],
		probe.positions[(a * n + b) * 3 + 1],
		probe.positions[(a * n + b) * 3 + 2]
	);
	let maxU = 0, maxV = 0, maxUTwist = 0, maxVTwist = 0;
	for (let b = 0; b < n; b++) {
		_wTmpB.copyFrom(at(0, b));
		maxU      = Math.max(maxU,      BABYLON.Vector3.Distance(_wTmpB, at(n - 1, b)));
		maxUTwist = Math.max(maxUTwist, BABYLON.Vector3.Distance(_wTmpB, at(n - 1, n - 1 - b)));
	}
	for (let a = 0; a < n; a++) {
		_wTmpB.copyFrom(at(a, 0));
		maxV      = Math.max(maxV,      BABYLON.Vector3.Distance(_wTmpB, at(a, n - 1)));
		maxVTwist = Math.max(maxVTwist, BABYLON.Vector3.Distance(_wTmpB, at(n - 1 - a, n - 1)));
	}

	const tol = WALK.CLOSURE_EPS * scale;
	const closedU = maxU < tol;
	const closedV = maxV < tol;
	return {
		scale,
		center,
		closedU,
		closedV,
		// Plain closure wins: on a form that matches both ways, wrapping straight is the
		// simpler truth and mirroring would twist a perfectly orientable surface.
		twistedU: !closedU && maxUTwist < tol,
		twistedV: !closedV && maxVTwist < tol
	};
}

/**
 * Creates the walk rig and its camera. The rig carries the surface pose (position +
 * tangent frame); the camera only carries the head pitch, as a child. Called once from
 * the {@link Player} constructor.
 * @param {BABYLON.Scene} scene - The BabylonJS scene.
 */
function initWalkRig(scene) {
	const rig = new BABYLON.TransformNode("walkRig", scene);
	// Quaternion, not Euler: the surface frame is fed in as a basis and must survive
	// orientations that have no Euler representation.
	rig.rotationQuaternion = new BABYLON.Quaternion();

	const cam = new BABYLON.UniversalCamera("WalkCamera", BABYLON.Vector3.Zero(), scene);
	cam.inputs.clear();          // locomotion is ours, not Babylon's
	cam.parent = rig;
	cam.minZ = 0.01;
	cam.fov = 1.2;
	// Derive the up vector from the camera's own rotation instead of the fixed local
	// +Y. With a fixed up, the view matrix is built by looking along a direction that
	// becomes parallel to it as the head pitches towards the surface, and the basis
	// tips over — the view snaps upside down. Deriving it keeps up perpendicular to
	// the gaze at every pitch.
	cam.updateUpVectorFromRotation = true;

	glo.walkRig = rig;
	glo.walkCamera = cam;

	// The character is agent 0 of the shared population: the same integrator that will
	// carry the bullets and the enemies already carries it. `glo.walk` is augmented in
	// place rather than replaced — the walk, cinema and mini-map code all refer to it by
	// name. It is never reaped, so leaving it registered outside walk mode is harmless:
	// nothing steps the population unless walkUpdate does.
	agentInit(glo.walk, {
		patch: 'bicubic',
		ground: 'stick',
		smoothTau: WALK.SMOOTH_TAU,
		maxCells: WALK.MAX_CELLS_PER_FRAME,
		turnSpeed: WALK.TURN_SPEED,
		kind: 'player',
		reap: false
	});
	agentsRegister(glo.walk);

	initWalkMap(scene);
	initGameMarkers(scene);
	initTrace(scene);
}

/**
 * Recomputes the body size, the eye height and the camera's depth range from the measured
 * mesh size and the two user multipliers.
 *
 * `baseEye` is the character's own size and drives speed, gravity and jump; `eyeHeight`
 * is where the camera sits and is the only one the viewpoint setting touches. Keeping
 * them apart means raising the viewpoint reframes the shot without quietly making the
 * character walk faster and jump higher.
 *
 * **Why `bodyScale` has to exist.** Everything else here is *measured*: `scale` is the
 * bounding-box diagonal of whatever is on screen, and the body is a fixed fraction of it.
 * That makes every form walkable with no tuning — but it also makes the walk exactly
 * scale-invariant, so the two obvious ways to get a bigger surface do nothing at all.
 * Multiply the equations by 10, or widen the u/v domain: the diagonal grows by 10 and so
 * does the walker, along with its speed, its gravity, its jump and the camera planes. The
 * view is identical, pixel for pixel. Writing `glo.walk.scale` by hand does not work
 * either — it is a measurement, overwritten by the next survey.
 *
 * A surface is therefore not made giant by enlarging the mesh. It is made giant by
 * shrinking the character, which is what this multiplier does; `1 / bodyScale` is the
 * factor the world grows by. It is stored as a multiplier, like `heightScale` and
 * `speedScale`, so it survives a change of form or of resolution.
 *
 * Called every frame from {@link walkUpdate}, so poking `bodyScale`, `heightScale` — or
 * even `scale` — from the console takes effect on the next frame rather than at the next
 * rebuild.
 */
function walkApplyScale() {
	const w = glo.walk;
	w.bodyScale = Math.min(Math.max(w.bodyScale || 1, WALK.BODY_MIN_SCALE), WALK.BODY_MAX_SCALE);
	w.heightScale = Math.min(Math.max(w.heightScale || 1, WALK.HEIGHT_MIN_SCALE), WALK.HEIGHT_MAX_SCALE);
	w.baseEye = w.scale * WALK.EYE_RATIO * w.bodyScale;
	w.eyeHeight = w.baseEye * w.heightScale;

	const cam = glo.walkCamera;
	if (!cam) return;
	// The near plane follows the eye, the far plane the form — capped so the two never
	// spread wider than the depth buffer can tell apart. At the default body size the cap
	// is exactly the old `scale * 20`; it only bites once the character is small, where it
	// trades the far half of the form for a clean picture of the ground it stands on.
	cam.minZ = Math.max(w.eyeHeight * 0.01, 1e-5);
	cam.maxZ = Math.min(w.scale * 20, cam.minZ * WALK.DEPTH_RANGE);
}

/**
 * Changes the character's size by a factor, and with it the apparent size of the surface.
 * Bound to Shift + PageUp / PageDown.
 * @param {number} factor - Multiplier on the body size; below 1 the world grows.
 */
function walkScaleBody(factor) {
	const w = glo.walk;
	w.bodyScale = (w.bodyScale || 1) * factor;
	walkApplyScale();
}

/**
 * Enters first-person mode: surveys the surface, drops the character at the centre of
 * the parametric domain, swaps the active camera and detaches orbit input.
 * @param {boolean} [autopilot=false] - When true the character walks on its own,
 *   turning slowly — a travelling shot along the surface rather than a controlled walk.
 * @returns {boolean} `true` if the mode was entered.
 */
function startWalk(autopilot = false) {
	const info = walkMeshInfo();
	if (!info || !glo.walkRig) return false;

	const survey = walkSurveySurface();
	if (!survey) return false;

	const w = glo.walk;
	w._lastInst = info.inst;
	w.autopilot = autopilot;
	w.scale = survey.scale;
	w.center.copyFrom(survey.center);
	w.closedU = survey.closedU;
	w.closedV = survey.closedV;
	w.twistedU = survey.twistedU;
	w.twistedV = survey.twistedV;
	// Sets the body size, the eye height and the camera's near/far planes together.
	walkApplyScale();

	// Drop the character in the middle of the domain, at rest.
	const inst = info.inst;
	w.u = (inst.min_u + inst.max_u) / 2;
	w.v = (inst.min_v + inst.max_v) / 2;
	w.height = 0;
	w.vSpeed = 0;
	w.viewYaw = 0;
	// Babylon pitches down for a positive rotation.x — the autopilot tilts slightly
	// downwards so the surface, not the void above it, fills the frame.
	w.pitch = autopilot ? 0.22 : 0;
	w.turnPhase = 0;
	w.keys.clear();
	w.frameReady = false;

	const frame = walkEvalSurface(info, w.u, w.v);
	if (!frame.valid) return false;

	// Everything from here on is world space.
	const world = glo.ribbon.getWorldMatrix();
	BABYLON.Vector3.TransformCoordinatesToRef(frame.position, world, _wWorldPos);
	BABYLON.Vector3.TransformNormalToRef(frame.tangentU, world, _wWorldTu);
	BABYLON.Vector3.TransformNormalToRef(frame.tangentV, world, _wWorldTv);
	BABYLON.Vector3.CrossToRef(_wWorldTu, _wWorldTv, _wTmpA);
	if (_wTmpA.lengthSquared() < 1e-24) return false;
	_wTmpA.normalize();

	// Land on the side the user was already looking at. Comparing against the surface
	// centroid instead would be a coin toss on anything flat, since the centroid of a
	// plane lies *on* the plane. Reversible with X.
	const eye = glo.orbitCamera ? glo.orbitCamera.position : _wWorldPos;
	_wTmpB.copyFrom(eye).subtractInPlace(_wWorldPos);
	w.flip = BABYLON.Vector3.Dot(_wTmpA, _wTmpB) < 0 ? -1 : 1;
	w.smoothNormal.copyFrom(_wTmpA).scaleInPlace(w.flip);

	// Initial heading: along the u parameter line, projected into the tangent plane.
	w.heading.copyFrom(_wWorldTu);
	walkTangentialize(w.heading, w.smoothNormal, _wWorldTv);

	if (glo.cameraMode === 'travelling') stopTravelling();
	if (glo.orbitCamera) glo.orbitCamera.detachControl(glo.canvas);

	glo.scene.activeCamera = glo.walkCamera;
	glo.camera = glo.walkCamera;
	glo.cameraMode = 'walk';

	traceSurveySurface();

	walkUpdate(true);
	walkShowHud();
	return true;
}

/**
 * Leaves first-person mode and restores the user-controlled orbit camera at the pose it
 * had before, mirroring {@link stopTravelling}.
 */
function stopWalk() {
	if (glo.cameraMode !== 'walk') return;

	// A take in progress must be closed down first, or the overlays it hid would stay
	// hidden and the recording would never be written out.
	if (glo.walkCinema.active) stopWalkCinema();
	// The map holds the scene's camera list and the mesh's layer mask; leaving it up
	// would keep the orbit view rendering into a corner it no longer owns.
	if (glo.walkMapOn) walkDisableMap();

	walkReleasePointer();
	if (_game.active) gameStop(); else gameClear();
	golfStop();
	traceClear();
	glo.scene.activeCamera = glo.orbitCamera;
	glo.orbitCamera.attachControl(glo.canvas, true);
	glo.camera = glo.orbitCamera;
	glo.cameraTarget = glo.orbitCamera.getTarget();
	glo.cameraMode = 'orbit';
	glo.walk.keys.clear();
	walkHideHud();
}

/**
 * Toggles first-person mode.
 * @param {boolean} [autopilot=false] - Enter in autopilot (surface travelling) mode.
 */
function toggleWalk(autopilot = false) {
	if (glo.cameraMode === 'walk') {
		// Same key switches between manual and autopilot without leaving the surface.
		if (glo.walk.autopilot !== autopilot) { glo.walk.autopilot = autopilot; walkShowHud(); return; }
		stopWalk();
	} else {
		if (!startWalk(autopilot)) {
			console.warn('[Walk] No walkable mesh (need a 2D grid with u and v in the equations).');
		}
	}
}

/**
 * Projects a vector into the tangent plane and normalizes it in place, falling back to a
 * secondary tangent when the projection collapses (heading exactly along the normal).
 * @param {BABYLON.Vector3} vec - Vector to make tangent, modified in place.
 * @param {BABYLON.Vector3} normal - Unit surface normal.
 * @param {BABYLON.Vector3} fallback - Any vector known to be tangent.
 */
function walkTangentialize(vec, normal, fallback) {
	const d = BABYLON.Vector3.Dot(vec, normal);
	vec.subtractInPlace(_wTmpC.copyFrom(normal).scaleInPlace(d));
	let len = vec.length();
	if (!isFinite(len) || len < 1e-9) {
		vec.copyFrom(fallback);
		const d2 = BABYLON.Vector3.Dot(vec, normal);
		vec.subtractInPlace(_wTmpC.copyFrom(normal).scaleInPlace(d2));
		len = vec.length();
		if (!isFinite(len) || len < 1e-9) { vec.set(1, 0, 0); len = 1; }
	}
	vec.scaleInPlace(1 / len);
}

/**
 * Locomotion override for the video rail, handed to {@link agentsStep}.
 *
 * Walking a geodesic is the right default, but a geodesic almost never returns to its
 * starting point, so it cannot produce a seamless loop. A rail advances along u (or v) at
 * a constant *world* speed and stops after exactly one period, which on a closed direction
 * lands back on the start — same position, same heading, so the last frame joins the first.
 *
 * Returning `true` suppresses steering and the metric step for the frame: while a rail is
 * engaged it, and not the player, decides where the body goes.
 *
 * @param {object} agent - The agent being stepped.
 * @param {object} ctx - The step context.
 * @param {number} dt - Timestep in seconds.
 * @param {BABYLON.Vector3} up - The agent's smoothed surface normal.
 * @returns {boolean} `true` if the rail took over.
 */
function walkRailDrive(agent, ctx, dt, up) {
	const w = glo.walk;
	if (agent !== w || !w.rail) return false;

	const along = w.rail === 'u' ? agent.worldTu : agent.worldTv;
	const len = along.length();
	// A degenerate parameter line still counts as driven: the rail is engaged, and letting
	// the arrows through for one frame would be a jolt in the middle of a take.
	if (len <= 1e-9) return true;

	w.heading.copyFrom(along).scaleInPlace(1 / len);
	walkTangentialize(w.heading, up, along);

	const speed = w.railSpeed > 0 ? w.railSpeed : w.moveSpeed;
	let step = (speed * dt) / len;   // world distance -> parameter distance

	// Land exactly on the target rather than overshooting: the loop must close on the
	// parameter, not on the frame count, so a dropped frame cannot lengthen the lap. Same
	// trick the rotation loop uses in rotateCamera.
	if (w.railTarget > 0 && w.railTravelled + step >= w.railTarget) {
		step = w.railTarget - w.railTravelled;
		w.railDone = true;
	}
	w.railTravelled += step;
	if (w.rail === 'u') w.u += step; else w.v += step;

	return true;
}

/**
 * Re-measures the surface after the mesh has been rebuilt under the character's feet.
 *
 * A rebuild — a new form, a new equation, a new resolution — throws `glo.ribbon` away and
 * makes a new shader mesh. The walk state survives that by design, but the *measurements*
 * taken on entry do not: the bounding-box scale, the centroid and the domain closure flags
 * all describe the old geometry. Left stale, the character keeps the previous form's body
 * size, and therefore its walking speed, its gravity and its jump height — switching from
 * a torus to a plane left it striding at 1.6x the right speed, and a pair of forms further
 * apart in size would be far worse.
 *
 * Detected by comparing the shader mesh instance rather than by hooking every rebuild
 * path: a new mesh is a new object, so there is no bookkeeping to keep in sync — the same
 * argument that keys the probe's program cache on its shader source.
 *
 * @param {object} info - Result of {@link walkMeshInfo} for the new mesh.
 */
function walkOnSurfaceRebuilt(info) {
	const w = glo.walk;
	w._lastInst = info.inst;

	const survey = walkSurveySurface();
	if (survey) {
		w.scale = survey.scale;
		w.center.copyFrom(survey.center);
		w.closedU = survey.closedU;
		w.closedV = survey.closedV;
		w.twistedU = survey.twistedU;
		w.twistedV = survey.twistedV;
		// The new form has a new size; the body multiplier is deliberately kept, so a
		// character shrunk to explore a giant surface stays that size across a rebuild.
		walkApplyScale();
		if (glo.walkMapOn) walkAimMapCamera();
	}

	// New geometry means a new tangent plane: the filtered frame describes a surface that
	// no longer exists, so let the next step establish it from scratch. `flip` carries the
	// side across, which is exactly what the snap branch uses it for.
	w.frameReady = false;

	if (typeof gameOnSurfaceRebuilt === 'function') gameOnSurfaceRebuilt();
	if (typeof golfOnSurfaceRebuilt === 'function') golfOnSurfaceRebuilt();
	if (typeof traceSurveySurface === 'function') traceSurveySurface();
}

/**
 * Per-frame update of the character and the rig. Called from the render loop in
 * `bab.js` while {@link glo.cameraMode} is `'walk'`.
 *
 * The character is agent 0 of the population in `agents.js`, so the surface sampling, the
 * metric step, the domain edges and the gravity all happen there, shared with every other
 * moving thing. What stays here is what is specific to *this* agent: reading the keyboard,
 * scaling locomotion to the mesh, and posing the rig the camera hangs from.
 *
 * @param {boolean} [snap=false] - Skip the temporal smoothing (used on entry).
 */
function walkUpdate(snap = false) {
	const info = walkMeshInfo();
	const w = glo.walk;
	if (!info || !glo.walkRig) { stopWalk(); return; }

	// The mesh can be rebuilt under the character at any time; re-measure when it is.
	if (w._lastInst !== info.inst) walkOnSurfaceRebuilt(info);

	const dt = Math.min(Math.max(glo.engine.getDeltaTime() / 1000, 0), 0.1);

	// --- Viewpoint height: Shift + up/down -----------------------------------------
	// Read from a live Shift flag rather than baked into the key at press time: holding
	// an arrow and tapping Shift has to switch meaning straight away, and a key stored
	// under a modified name would never be cleared by its own keyup.
	let heightHeld = false;
	if (w.shiftHeld && !w.autopilot) {
		let dir = 0;
		if (w.keys.has('ArrowUp')) dir += 1;
		if (w.keys.has('ArrowDown')) dir -= 1;
		if (dir !== 0) {
			heightHeld = true;
			w.heightScale *= Math.exp(dir * WALK.HEIGHT_RATE * dt);
			walkShowHud();
		}
	}
	// The multipliers become world units here, once, whether they were changed by the ramp
	// above, by a key, by a rebuild — or written straight into `glo.walk` from elsewhere.
	walkApplyScale();

	// --- Input -------------------------------------------------------------------
	let forward = 0, turn = 0, strafe = 0, jump = false;
	if (w.autopilot) {
		w.turnPhase += dt;
		forward = 1;
		turn = 0.35 * Math.sin(w.turnPhase * 0.31) + 0.12 * Math.sin(w.turnPhase * 0.13);
	} else {
		// While the height is being adjusted the same arrows must not also walk.
		if (!heightHeld) {
			if (w.keys.has('ArrowUp')) forward += 1;
			if (w.keys.has('ArrowDown')) forward -= 1;
		}
		// The left and right arrows sidestep rather than turn. Turning was theirs and the
		// mouse's both, which wasted the only pair of keys that could dodge a shot; aiming
		// is the mouse's job, and now the feet have one of their own.
		if (w.keys.has('ArrowLeft')) strafe -= 1;
		if (w.keys.has('ArrowRight')) strafe += 1;
		// Turning stays on the keyboard too: mouse look needs a click to capture the
		// pointer, and without this there would be no way to turn round before that.
		if (w.keys.has('a')) turn -= 1;
		if (w.keys.has('e')) turn += 1;
		jump = w.keys.has(' ');
	}
	w.input.forward = forward;
	w.input.turn = turn;
	w.input.strafe = strafe;
	w.input.jump = jump;

	// --- Locomotion scale ---------------------------------------------------------
	// Re-derived every frame from the measured mesh size, so a rebuild or a change of
	// form is picked up immediately. `baseEye` is the body, never `eyeHeight`: raising
	// the viewpoint must reframe the shot without quietly making the character faster.
	w.gravity = w.baseEye * WALK.GRAVITY_EYES;
	w.moveSpeed = w.baseEye * WALK.SPEED_EYES * w.speedScale;
	w.jumpSpeed = Math.sqrt(2 * w.gravity * w.baseEye * WALK.JUMP_EYES);

	// Entities decide before the step, which consumes `input`.
	gameThink(dt);
	// Points are laid down at the position the agent currently occupies, so this runs
	// before the step moves it.
	traceRecord(dt);

	// The population steps in one batched probe call; `glo.walk` carries the domain
	// closure flags measured on entry.
	agentsStep(info, w, dt, snap, walkRailDrive);
	if (!w._stepped) return;

	// --- Rig pose ----------------------------------------------------------------
	// The smoothed normal is what the character actually stands on: using the raw
	// per-frame normal here would throw away the filtering and reintroduce the jolt at
	// every cell boundary.
	_wUp.copyFrom(w.up);
	_wFwd.copyFrom(w.heading);
	walkTangentialize(_wFwd, _wUp, w.worldTu);

	BABYLON.Vector3.CrossToRef(_wUp, _wFwd, _wRight);
	if (_wRight.lengthSquared() > 1e-16) {
		_wRight.normalize();
		// Re-derive up from right × forward so the basis is exactly orthonormal even
		// after filtering — an ever-so-slightly skewed basis shears the whole view.
		BABYLON.Vector3.CrossToRef(_wFwd, _wRight, _wUp);
		_wUp.normalize();

		// A quaternion built straight from the basis, never Euler angles: Babylon's
		// Euler decomposition collapses (and silently drops the roll) whenever the
		// forward axis lines up with world Y, which a walker on a horizontal surface
		// hits simply by turning around.
		BABYLON.Matrix.FromValuesToRef(
			_wRight.x, _wRight.y, _wRight.z, 0,
			_wUp.x,    _wUp.y,    _wUp.z,    0,
			_wFwd.x,   _wFwd.y,   _wFwd.z,   0,
			0, 0, 0, 1, _wBasis);
		if (!glo.walkRig.rotationQuaternion) glo.walkRig.rotationQuaternion = new BABYLON.Quaternion();
		BABYLON.Quaternion.FromRotationMatrixToRef(_wBasis, glo.walkRig.rotationQuaternion);
	}

	glo.walkRig.position.copyFrom(w.worldPos).addInPlace(
		_wTmpB.copyFrom(_wUp).scaleInPlace(w.eyeHeight + w.height)
	);

	glo.walkCamera.rotation.x = w.pitch;
	glo.walkCamera.rotation.y = w.viewYaw;   // zero unless a rail is holding the body
	glo.walkCamera.rotation.z = 0;

	walkUpdateMap();
	gameUpdate(dt, info, w);
	golfUpdate(dt);
	// After the step: every trace point has just been re-resolved to where the surface
	// holds it now, so the ribbon is rebuilt from fresh world positions.
	traceUpdate();

	// The lap closed on this frame: the pose above is the one that matches the take's
	// first frame, so end the recording now, not on the next tick.
	if (w.railDone) { w.railDone = false; finishWalkCinemaLoop(); }
}

// ==================== INPUT ====================

/**
 * Hands control back to the player, dropping whatever was driving — the rail of a video
 * take or the wandering autopilot. Works like cruise control: touching the controls
 * disengages it.
 *
 * The direction the camera is actually facing becomes the body's heading, so taking over
 * never snaps the view. A take carries on recording, but it can no longer promise a
 * seamless loop, and the badge says so.
 */
function walkDisengageAutoDrive() {
	const w = glo.walk;
	if (!w.rail && !w.autopilot) return;

	if (w.viewYaw !== 0) {
		const q = BABYLON.Quaternion.RotationAxis(w.smoothNormal, w.viewYaw);
		w.heading.rotateByQuaternionToRef(q, w.heading);
		w.viewYaw = 0;
	}

	w.rail = null;
	w.railSpeed = 0;
	w.railTarget = 0;
	w.railTravelled = 0;
	w.railDone = false;
	w.autopilot = false;

	if (glo.walkCinema.active) {
		glo.walkCinema.loop = false;
		walkShowRecIndicator(null, false);
	}
}

/**
 * Keyboard handler for walk mode, consulted before the global shortcut registry so the
 * arrows and space bar mean "move" and "jump" here instead of their usual bindings.
 * @param {KeyboardEvent} e - The keydown event.
 * @returns {boolean} `true` if the key was consumed by walk mode.
 */
function walkHandleKeyDown(e) {
	if (glo.cameraMode !== 'walk') return false;
	const w = glo.walk;
	w.shiftHeld = e.shiftKey;

	switch (e.key) {
		case 'ArrowUp': case 'ArrowDown': case 'ArrowLeft': case 'ArrowRight': case ' ':
			// Steering takes the wheel from the rail, but raising the viewpoint does not:
			// height is a framing control, like the pitch, and reframing a shot is no
			// reason to cancel the take's loop.
			if (!(e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown'))) {
				walkDisengageAutoDrive();
			}
			w.keys.add(e.key);
			e.preventDefault();
			return true;
		case 'a': case 'A': case 'e': case 'E':
			// Held keys, not one-shot actions: stored folded to lower case so a Shift
			// pressed or released mid-hold cannot strand them in the set.
			walkDisengageAutoDrive();
			w.keys.add(e.key.toLowerCase());
			e.preventDefault();
			return true;
		case 'Escape':
			// During a take, Escape ends the take and keeps you on the surface.
			if (glo.walkCinema.active) stopWalkCinema(); else stopWalk();
			return true;
		case 'm': case 'M':
			walkToggleMap();
			return true;
		case 'g': case 'G':
			gameToggle();
			return true;
		case 'p': case 'P':
			// P for parcours: the geodesic golf round.
			golfToggle();
			walkShowHud();
			return true;
		case 't': case 'T':
			// The walker's own thread: on a folded surface, knowing where you came from
			// is information no first-person view otherwise gives you.
			if (traceHas(w)) traceDetach(w);
			else traceAttach(w, { kind: 'player', lifetime: Infinity });
			walkShowHud();
			return true;
		case 'r': case 'R':
			walkToggleRail();
			return true;
		case 'x': case 'X':
			// Swap sides of the surface — useful when the normal points inward. The
			// smoothed normal carries the side, so flip it directly; the continuity
			// rule in walkUpdate then locks onto the new side instead of undoing this.
			w.flip = -w.flip;
			w.smoothNormal.scaleInPlace(-1);
			return true;
		case 'PageUp':
		case 'PageDown': {
			const up = e.key === 'PageUp';
			// Shift turns the same pair into the size control. Not a third pair of keys: the
			// two settings answer the same question — how big is this surface to me — and
			// pairing them keeps that visible. Discrete steps, unlike the height ramp, since
			// halving or doubling is the unit one actually thinks in.
			if (e.shiftKey) walkScaleBody(up ? WALK.BODY_STEP : 1 / WALK.BODY_STEP);
			else if (up) w.speedScale = Math.min(w.speedScale * 1.4, 40);
			else w.speedScale = Math.max(w.speedScale / 1.4, 0.05);
			walkShowHud();
			e.preventDefault();
			return true;
		}
		default:
			return false;
	}
}

/**
 * Releases held keys when they come up.
 * @param {KeyboardEvent} e - The keyup event.
 */
function walkHandleKeyUp(e) {
	glo.walk.shiftHeld = e.shiftKey;
	glo.walk.keys.delete(e.key);
	// A key held down while Shift is pressed or released arrives as a different `key` on
	// the way up than on the way down, which would leave it stuck in the set forever.
	if (e.key.length === 1) glo.walk.keys.delete(e.key.toLowerCase());
}

/**
 * Mouse look. Horizontal motion turns the body (so the character always walks where it
 * looks), vertical motion pitches the head only.
 * @param {MouseEvent} e - The mousemove event.
 */
function walkHandleMouseMove(e) {
	if (glo.cameraMode !== 'walk' || document.pointerLockElement !== glo.canvas) return;
	const w = glo.walk;

	// Horizontal motion feeds the head's yaw rather than turning the body directly.
	// Walking freely, walkUpdate folds it straight into the heading, so this stays the
	// familiar "go where you look". On a rail it remains an offset, which is how you can
	// look around while the take keeps rolling.
	if (e.movementX) w.viewYaw += e.movementX * WALK.MOUSE_SENS;

	if (e.movementY) {
		w.pitch = Math.min(Math.max(w.pitch + e.movementY * WALK.MOUSE_SENS, -WALK.PITCH_LIMIT), WALK.PITCH_LIMIT);
	}
}

/** Requests pointer lock so the mouse can look around without leaving the canvas. */
function walkRequestPointer() {
	if (glo.cameraMode === 'walk' && glo.canvas && glo.canvas.requestPointerLock) {
		glo.canvas.requestPointerLock();
	}
}

/** Releases pointer lock, if held. */
function walkReleasePointer() {
	if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
}

// ==================== MINI-MAP ====================

/**
 * Builds the mini-map: an off-screen render target fed by its own camera, shown on a
 * small quad in front of the walking camera, plus the avatar that marks the character.
 *
 * A second camera in `scene.activeCameras` was the obvious route and turned out to cost
 * a full extra pass over the mesh — measured at +98% frame time, because the vertex
 * shader is the expensive part here and it ran twice for all 33k vertices. A render
 * target refreshed every few frames pays that only a fraction as often, and at a fixed
 * modest resolution rather than the screen's. A map does not need 60 Hz.
 *
 * Drawing it on a quad inside the scene, rather than as a DOM overlay, is what puts it
 * in recordings too.
 *
 * @param {BABYLON.Scene} scene - The BabylonJS scene.
 */
function initWalkMap(scene) {
	const cam = new BABYLON.ArcRotateCamera('WalkMapCamera', Math.PI / 4, Math.PI / 3, 10,
		BABYLON.Vector3.Zero(), scene);
	// Sees the surface (default mask) and the avatar (map-only bit).
	cam.layerMask = WALK_LAYER.BOTH;
	cam.minZ = 0.01;
	glo.walkMapCamera = cam;

	const rtt = new BABYLON.RenderTargetTexture('walkMapRTT', WALK.MAP_TEXTURE, scene, false);
	rtt.activeCamera = cam;
	rtt.refreshRate = WALK.MAP_REFRESH;
	rtt.renderList = [];
	glo.walkMapRTT = rtt;

	// A cone: it shows where the character is *and* which way it faces, which a dot
	// cannot. Babylon builds cylinders along +Y, so it is tipped over to point along the
	// rig's forward axis. Parenting it to the rig means it inherits the exact surface
	// pose and can never drift from where the character really is.
	const avatar = BABYLON.MeshBuilder.CreateCylinder('walkAvatar',
		{ diameterTop: 0, diameterBottom: 0.55, height: 1, tessellation: 12 }, scene);
	avatar.rotation.x = Math.PI / 2;
	avatar.parent = glo.walkRig;
	avatar.layerMask = WALK_LAYER.MAP;   // never drawn by the first-person camera
	avatar.isPickable = false;
	const avatarMat = new BABYLON.StandardMaterial('walkAvatarMat', scene);
	avatarMat.emissiveColor = new BABYLON.Color3(1, 0.42, 0.2);
	avatarMat.disableLighting = true;
	avatar.material = avatarMat;
	avatar.setEnabled(false);
	glo.walkAvatar = avatar;

	// The panel: a frame quad and, just in front of it, the map itself. Both hang off the
	// walking camera and live in their own rendering groups, whose depth buffer Babylon
	// clears between groups, so they always sit on top of the scene.
	const frame = BABYLON.MeshBuilder.CreatePlane('walkMapFrame', { size: 1 }, scene);
	const frameMat = new BABYLON.StandardMaterial('walkMapFrameMat', scene);
	frameMat.emissiveColor = new BABYLON.Color3(0.55, 0.62, 0.72);
	frameMat.disableLighting = true;
	frame.material = frameMat;
	frame.renderingGroupId = 1;
	frame.isPickable = false;
	frame.parent = glo.walkCamera;
	frame.setEnabled(false);
	glo.walkMapFrame = frame;

	const panel = BABYLON.MeshBuilder.CreatePlane('walkMapPanel', { size: 1 }, scene);
	// A two-line shader rather than a StandardMaterial: all the panel has to do is show a
	// texture, and StandardMaterial's emissive path multiplies by emissiveColor, drops the
	// sampler when the texture is not deemed ready, and generally has opinions. This has
	// none, and matches how the rest of the project draws things anyway.
	const panelMat = new BABYLON.ShaderMaterial('walkMapPanelMat', scene, {
		vertexSource: `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 worldViewProjection;
varying vec2 vUV;
void main() { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`,
		fragmentSource: `
precision highp float;
varying vec2 vUV;
uniform sampler2D mapTex;
void main() { gl_FragColor = vec4(texture2D(mapTex, vUV).rgb, 1.0); }`
	}, {
		attributes: ['position', 'uv'],
		uniforms: ['worldViewProjection'],
		samplers: ['mapTex']
	});
	panelMat.setTexture('mapTex', rtt);
	panel.material = panelMat;
	panel.renderingGroupId = 2;
	panel.isPickable = false;
	panel.parent = glo.walkCamera;
	panel.setEnabled(false);
	glo.walkMapPanel = panel;
}

/**
 * Turns the mini-map on or off. Off by default and off on exit: even refreshed sparingly
 * it is not free, and the point of a switch is not to pay for it while nobody looks.
 */
function walkToggleMap() {
	if (glo.cameraMode !== 'walk' || !glo.walkMapCamera) return;
	if (glo.walkMapOn) walkDisableMap(); else walkEnableMap();
	walkShowHud();
}

/** Brings up the mini-map: frames the form, shows the avatar, starts the render target. */
function walkEnableMap() {
	const cam = glo.walkMapCamera;
	const w = glo.walk;

	// Copying the orbit camera's angles opens the map from the vantage the user was last
	// looking from, rather than some arbitrary direction.
	if (glo.orbitCamera) { cam.alpha = glo.orbitCamera.alpha; cam.beta = glo.orbitCamera.beta; }
	cam.radius = Math.max(w.scale * WALK.MAP_DISTANCE, 1e-3);
	cam.minZ = Math.max(w.scale * 1e-3, 1e-5);
	cam.maxZ = w.scale * 20;
	walkAimMapCamera();

	const size = w.scale * WALK.MAP_AVATAR_RATIO;
	glo.walkAvatar.scaling.set(size, size, size);
	glo.walkAvatar.setEnabled(true);

	const bg = glo.backgroundColor;
	glo.walkMapRTT.clearColor = new BABYLON.Color4(bg.r, bg.g, bg.b, 1);
	walkRefreshMapRenderList();
	if (glo.scene.customRenderTargets.indexOf(glo.walkMapRTT) < 0) {
		glo.scene.customRenderTargets.push(glo.walkMapRTT);
	}

	glo.walkMapFrame.setEnabled(true);
	glo.walkMapPanel.setEnabled(true);
	glo.walkMapOn = true;
	walkLayoutMapPanel();
}

/** Puts the mini-map away and stops paying for it. */
function walkDisableMap() {
	if (glo.walkAvatar) glo.walkAvatar.setEnabled(false);
	if (glo.walkMapFrame) glo.walkMapFrame.setEnabled(false);
	if (glo.walkMapPanel) glo.walkMapPanel.setEnabled(false);
	const i = glo.scene.customRenderTargets.indexOf(glo.walkMapRTT);
	if (i >= 0) glo.scene.customRenderTargets.splice(i, 1);
	glo.walkMapOn = false;
}

/**
 * Points the render target at the current mesh and the avatar. The mesh is thrown away
 * and rebuilt on every parameter change, so the list cannot simply be filled once.
 */
function walkRefreshMapRenderList() {
	const list = glo.walkMapRTT.renderList;
	list.length = 0;
	if (glo.ribbon) list.push(glo.ribbon);
	list.push(glo.walkAvatar);
}

/** Points the mini-map camera at the centre of the form, in world space. */
function walkAimMapCamera() {
	if (!glo.ribbon) return;
	BABYLON.Vector3.TransformCoordinatesToRef(glo.walk.center, glo.ribbon.getWorldMatrix(), _wTmpA);
	glo.walkMapCamera.setTarget(_wTmpA);
}

/**
 * Places the map panel in the top-right corner of the view.
 *
 * Recomputed rather than set once: it has to survive a window resize, a change of field
 * of view, and a change of scale, since the quad hangs in front of the camera in world
 * units and its distance has to stay between the near and far planes.
 */
function walkLayoutMapPanel() {
	const cam = glo.walkCamera;
	const engine = glo.engine;
	const aspect = engine.getRenderWidth() / Math.max(engine.getRenderHeight(), 1);

	// Far enough not to be clipped by the near plane, close enough to clear the far one.
	const d = Math.min(Math.max(glo.walk.scale * 0.1, cam.minZ * 5), cam.maxZ * 0.5);
	const halfH = d * Math.tan(cam.fov / 2);
	const halfW = halfH * aspect;

	const side = 2 * halfH * WALK.MAP_SIZE;
	const margin = 2 * halfH * WALK.MAP_MARGIN;
	const border = 2 * halfH * WALK.MAP_BORDER;
	const cx = halfW - margin - side / 2;
	const cy = halfH - margin - side / 2;

	glo.walkMapPanel.scaling.set(side, side, 1);
	glo.walkMapPanel.position.set(cx, cy, d);
	glo.walkMapFrame.scaling.set(side + 2 * border, side + 2 * border, 1);
	glo.walkMapFrame.position.set(cx, cy, d);
}

/** Per-frame upkeep for the mini-map, called from {@link walkUpdate}. */
function walkUpdateMap() {
	if (!glo.walkMapOn) return;
	if (glo.walkMapRTT.renderList[0] !== glo.ribbon) walkRefreshMapRenderList();
	// Sit the avatar back on the surface, one eye height below the rig.
	glo.walkAvatar.position.y = -glo.walk.eyeHeight;
	walkAimMapCamera();
	walkLayoutMapPanel();
}

// ==================== FULLSCREEN VIDEO ====================

/**
 * Measures the world length of one full period along a parameter line through the
 * character's current position. Used to turn a wanted take duration into a walking
 * speed, so a lap lasts about as long as asked whatever the size of the form.
 *
 * @param {object} info - Result of {@link walkMeshInfo}.
 * @param {'u'|'v'} rail - Which parameter line to measure.
 * @returns {number} Length in world units, or 0 if it could not be measured.
 */
function walkMeasureRailLength(info, rail) {
	const { inst, gridU, gridV } = info;
	const w = glo.walk;
	const N = 64;

	const fi = Math.round(inst.step_u !== 0 ? (w.u - inst.min_u) / inst.step_u : 0);
	const fj = Math.round(inst.step_v !== 0 ? (w.v - inst.min_v) / inst.step_v : 0);
	for (let k = 0; k <= N; k++) {
		// Integer indices only — a fractional probe would not sit on the mesh.
		_walkSurveyIdx[k * 2]     = rail === 'u' ? Math.round(k * gridU / N) : fi;
		_walkSurveyIdx[k * 2 + 1] = rail === 'u' ? fj : Math.round(k * gridV / N);
	}

	const probe = inst.probePoints(_walkSurveyIdx, N + 1);
	if (!probe) return 0;

	const world = glo.ribbon.getWorldMatrix();
	let total = 0;
	for (let k = 0; k <= N; k++) {
		_wTmpA.set(probe.positions[k * 3], probe.positions[k * 3 + 1], probe.positions[k * 3 + 2]);
		BABYLON.Vector3.TransformCoordinatesToRef(_wTmpA, world, _wTmpB);
		if (k > 0) total += BABYLON.Vector3.Distance(_wTmpC, _wTmpB);
		_wTmpC.copyFrom(_wTmpB);
	}
	return isFinite(total) ? total : 0;
}

/**
 * Reports whether the surface actually changes over time.
 *
 * It decides what a "perfect loop" can promise: the rail closes the *path* exactly, but
 * if the shape itself has moved on by the end of the lap, the last frame no longer
 * matches the first. Saying so beats quietly producing a clip that jumps on repeat.
 *
 * Measured, not parsed. Scanning the equations for a `t` cannot work here: implicit
 * multiplication means `2t` is a time reference with no separator in front of it, `cut`
 * expands to `cos(u)*t`, and `atan`/`step`/`sqrt` are full of innocent t's — while the
 * geometry editor can bring in arbitrary GLSL. So instead the clock is nudged and the
 * surface re-probed: if the points move, it depends on time. Two probe calls, once per
 * take, and no notation can fool it.
 *
 * @returns {boolean} `true` if the geometry depends on time.
 */
function walkSurfaceUsesTime() {
	const info = walkMeshInfo();
	if (!info) return false;
	const { inst, gridU, gridV } = info;

	// A handful of scattered vertices — enough for any time term to show up somewhere.
	const N = 9;
	for (let k = 0; k < N; k++) {
		_walkSurveyIdx[k * 2]     = Math.round((k % 3) * gridU / 2);
		_walkSurveyIdx[k * 2 + 1] = Math.round(Math.floor(k / 3) * gridV / 2);
	}

	const before = inst.probePoints(_walkSurveyIdx, N);
	if (!before) return false;
	const snapshot = Float32Array.from(before.positions.subarray(0, N * 3));

	const t0 = glo.clock.time;
	glo.clock.setTime(t0 + 1.0);
	const after = inst.probePoints(_walkSurveyIdx, N);
	glo.clock.setTime(t0);
	if (!after) return false;

	// Scale-relative threshold: absolute distances mean nothing across forms.
	const tol = Math.max(glo.walk.scale, 1e-6) * 1e-5;
	for (let k = 0; k < N * 3; k++) {
		if (Math.abs(after.positions[k] - snapshot[k]) > tol) return true;
	}
	return false;
}

/**
 * Enters fullscreen video mode: the first-person view fills the screen with every
 * overlay out of the way, and the whole frame is recorded rather than the centred
 * square crop the orbit takes use.
 *
 * When the surface closes on itself, the character is put on a rail along that
 * direction and the take stops on its own after exactly one period — the last frame
 * matches the first, so the clip loops seamlessly. On an open patch there is no such
 * period, so it falls back to the wandering autopilot and records until stopped.
 *
 * Must be called straight from a user gesture: `requestFullscreen` is issued before any
 * await, or the browser rejects it.
 *
 * @returns {boolean} `true` if the take started.
 */
function startWalkCinema() {
	const cinema = glo.walkCinema;
	if (cinema.active) return false;

	if (glo.cameraMode !== 'walk' && !startWalk(false)) {
		console.warn('[Walk] Nothing walkable to film.');
		return false;
	}

	// First thing, while the user gesture is still live.
	const fsRequest = cinemaRequestFullscreen();

	const info = walkMeshInfo();
	const w = glo.walk;

	cinema.saved = {
		autopilot: w.autopilot,
		rail: w.rail,
		railSpeed: w.railSpeed,
		u: w.u, v: w.v,
	};

	// Mark the take live before touching anything, so a failure below can be undone by
	// the normal teardown rather than leaving the UI half dismantled.
	cinema.active = true;

	try {
		Object.assign(cinema.saved, cinemaHideOverlays());

		// The take opens on a still frame, under manual control. Starting mid-glide
		// leaves no room for an establishing beat and fights whoever wants to drive;
		// `R` engages the automatic looping lap whenever they are ready for it.
		w.rail = null;
		w.railTravelled = 0;
		w.railTarget = 0;
		w.railSpeed = 0;
		w.railDone = false;
		w.autopilot = false;
		w.keys.clear();
	} catch (err) {
		console.error('[Walk] Could not set up the take:', err);
		stopWalkCinema();
		return false;
	}

	// The rail closes the path exactly, but a surface that keeps deforming has moved on
	// by the end of the lap, so the clip would jump on repeat. Freezing the clock trades
	// the animation for a truly seamless loop; off by default, as in the orbit take.
	const animated = walkSurfaceUsesTime();
	cinema.saved.clockPaused = glo.clock.paused;
	if (cinema.freezeTime && animated && !glo.clock.paused) glo.clock.pause();

	cinema.animated = animated && !glo.clock.paused;
	cinema.loop = false;
	walkShowRecIndicator(null, cinema.animated);

	cinemaWhenResized(fsRequest, () => {
		if (!cinema.active) return;
		cinema.recorder = createMeshRecorder(glo.ribbon, glo.scene, 60,
			cinemaFullFrameOptions('surface-walk'));
		cinema.recorder.start(() => {
			// Reset the lap and the clock at the true first recorded frame, so the loop
			// is measured from what the viewer actually sees.
			glo.walk.railTravelled = 0;
			glo.walk.railDone = false;
			glo.clock.reset();
		});
	});

	return true;
}

/**
 * Engages the automatic rail from wherever the character stands: it glides along the
 * parameter line that closes on itself, and during a take it arms the auto-stop so the
 * clip ends after exactly one period and loops seamlessly.
 *
 * Deliberately a separate gesture rather than something a take does on its own. A
 * recording that opens mid-glide gives no establishing beat and takes the controls away
 * from whoever wanted to drive.
 *
 * @returns {boolean} `true` if a rail was engaged.
 */
function walkEngageRail() {
	const w = glo.walk;
	const info = walkMeshInfo();
	if (!info) return false;

	const rail = (w.closedU || w.twistedU) ? 'u' : ((w.closedV || w.twistedV) ? 'v' : null);
	if (!rail) {
		console.warn('[Walk] No direction closes on itself here — nothing to loop along.');
		return false;
	}

	const inst = info.inst;
	w.rail = rail;
	w.autopilot = false;
	w.railTravelled = 0;
	w.railDone = false;
	// A twisted seam sends the character back at the mirrored position, so one lap does
	// not close the loop — it takes two to come home. Which is also the whole point of a
	// Möbius strip, and worth seeing in one continuous shot.
	const laps = (rail === 'u' ? w.twistedU : w.twistedV) ? 2 : 1;
	w.railTarget = laps * (rail === 'u' ? (inst.max_u - inst.min_u) : (inst.max_v - inst.min_v));
	// One period's worth of path, walked at a steady pace: a twisted surface simply
	// takes twice as long, rather than being rushed to fit the same clock.
	const length = walkMeasureRailLength(info, rail);
	w.railSpeed = length > 0 ? length / WALK.CINEMA_LAP_SECONDS : 0;
	w.railSeconds = laps * WALK.CINEMA_LAP_SECONDS;

	if (glo.walkCinema.active) {
		glo.walkCinema.loop = true;
		walkShowRecIndicator(rail, glo.walkCinema.animated);
	} else {
		walkShowHud();
	}
	return true;
}

/** Engages the rail, or drops it if it is already running. */
function walkToggleRail() {
	if (glo.cameraMode !== 'walk') return;
	if (glo.walk.rail) walkDisengageAutoDrive(); else walkEngageRail();
}

/**
 * Ends a cinema take: stops and downloads the recording, restores the overlays, the
 * grid, the previous locomotion, and leaves fullscreen.
 */
function stopWalkCinema() {
	const cinema = glo.walkCinema;
	if (!cinema.active) return;
	cinema.active = false;

	if (cinema.recorder) { cinema.recorder.stop(); cinema.recorder = null; }

	const w = glo.walk;
	const saved = cinema.saved || {};
	w.rail = saved.rail ?? null;
	w.railSpeed = saved.railSpeed ?? 0;
	w.railTravelled = 0;
	w.railTarget = 0;
	w.railDone = false;
	w.autopilot = saved.autopilot ?? false;

	if (saved.clockPaused === false && glo.clock.paused) glo.clock.resume();
	cinemaRestoreOverlays(saved);

	if (glo.cameraMode === 'walk') walkShowHud();
}

/** Toggles fullscreen video mode. */
function toggleWalkCinema() {
	if (glo.walkCinema.active) stopWalkCinema(); else startWalkCinema();
}

/**
 * Called when the rail completes a full period. Ends the take so the clip closes on
 * itself; the pose that would come next is the take's first frame, and recording it
 * again would show as a stutter on replay.
 */
function finishWalkCinemaLoop() {
	if (!glo.walkCinema.active || !glo.walkCinema.loop) return;
	stopWalkCinema();
}

/**
 * Returns the element the walk overlays must hang from.
 *
 * They have to live inside the element that goes fullscreen: a fullscreen page renders
 * only that element and its descendants, so anything parented to `document.body` simply
 * disappears for the whole take. Being a sibling of the canvas rather than part of it,
 * an overlay is still invisible to the recorder, which copies pixels out of the canvas.
 *
 * @returns {HTMLElement} The overlay host.
 */
function walkOverlayHost() {
	return getById('univers_div') || document.body;
}

/**
 * Writes the walk take's status into the shared recording badge.
 * @param {'u'|'v'|null} rail - Rail in use, or `null` when free-roaming.
 * @param {boolean} [animated=false] - The surface deforms over time, so the clip will
 *   not close perfectly even though the path does. Worth saying out loud.
 */
function walkShowRecIndicator(rail, animated = false) {
	cinemaShowBadge((rail
		? `● REC — loop on ${rail}, ~${Math.round(glo.walk.railSeconds || WALK.CINEMA_LAP_SECONDS)}s`
		  + `${glo.walk.twistedU || glo.walk.twistedV ? ' (two laps: twisted seam)' : ''} · arrows to take over`
		: '● REC — you drive · arrows to move, R for an automatic looping lap')
		+ (rail && animated ? ' · surface animated: path loops, shape will not' : '')
		+ ' · Shift+F to stop');
}

// ==================== HUD ====================

/**
 * Formats a multiplier for the HUD. Two decimals near 1, plain integers once large, and
 * significant digits rather than a row of zeros once small — these knobs span five orders
 * of magnitude, and `0.00` is not a reading.
 * @param {number} x - The multiplier.
 * @returns {string} Short human-readable form.
 */
function walkFormatScale(x) {
	if (!isFinite(x) || x <= 0) return '1';
	if (x >= 100) return String(Math.round(x));
	if (x >= 10) return String(Math.round(x * 10) / 10);
	if (x >= 0.01) return x.toFixed(2);
	return String(Number(x.toPrecision(2)));
}

/** Creates (once) and refreshes the small overlay listing the walk controls. */
function walkShowHud() {
	if (glo.walkCinema.active) return;   // nothing on screen during a take
	let hud = getById('walkHud');
	if (!hud) {
		hud = document.createElement('div');
		hud.id = 'walkHud';
		hud.style.cssText = [
			// Top-centred: the bottom strip already carries the undo/redo controls.
			'position:absolute', 'left:50%', 'top:10px', 'transform:translateX(-50%)',
			'z-index:40', 'pointer-events:none', 'padding:7px 14px',
			'font:12px/1.5 monospace', 'color:#e6ebf6', 'text-align:center',
			'background:rgba(12,16,26,.66)', 'border:1px solid rgba(230,235,246,.18)',
			'border-radius:7px', 'white-space:nowrap'
		].join(';');
		walkOverlayHost().appendChild(hud);
	}

	const w = glo.walk;
	const mode = w.rail ? 'RAIL' : (w.autopilot ? 'AUTOPILOT' : 'WALK');
	const loop = [w.closedU ? 'u' : null, w.closedV ? 'v' : null].filter(Boolean).join('+');
	// The body multiplier is shown together with the world it implies: nobody wants a
	// character 1/64 of a size they never chose, they want a surface 64 times bigger.
	const size = `&times;${walkFormatScale(w.bodyScale)} &rarr; world &times;${walkFormatScale(1 / w.bodyScale)}`;
	hud.innerHTML =
		`<b>${mode}</b> &nbsp; &uarr;&darr; walk &middot; &larr;&rarr; sidestep &middot; A/E turn &middot; ` +
		`shift+&uarr;&darr; height (&times;${walkFormatScale(w.heightScale)}) &middot; ` +
		`space jump &middot; M map${glo.walkMapOn ? ' (on)' : ''} &middot; R rail &middot; ` +
		`click for mouse look &middot; click to fire &middot; G game${_game.active ? ' (on)' : ''} &middot; ` +
		`P golf${_golf.active ? ' (on)' : ''} &middot; ` +
		`T trail${traceHas(w) ? ' (on)' : ''} &middot; X flip side &middot; ` +
		`PgUp/PgDn speed (&times;${w.speedScale.toFixed(2)}) &middot; ` +
		`shift+PgUp/PgDn size (${size}) &middot; Esc exit` +
		(loop ? ` &nbsp;|&nbsp; looping on ${loop}` : '');
	hud.style.display = 'block';
}

/** Hides the walk overlay. */
function walkHideHud() {
	const hud = getById('walkHud');
	if (hud) hud.style.display = 'none';
}

// ==================== WIRING ====================

document.addEventListener('keyup', walkHandleKeyUp);
document.addEventListener('mousemove', walkHandleMouseMove);
// Losing focus mid-stride would otherwise leave a key latched and the character walking
// on its own, since the keyup lands on whatever took the focus.
window.addEventListener('blur', () => { glo.walk.keys.clear(); glo.walk.shiftHeld = false; });
// Leaving fullscreen by any route (Escape, the browser's own chrome) ends the take,
// so the overlays always come back and the file is always written.
document.addEventListener('fullscreenchange', () => {
	if (!document.fullscreenElement && glo.walkCinema.active) stopWalkCinema();
});
document.addEventListener('DOMContentLoaded', () => {
	const canvas = getById('renderCanvas');
	if (canvas) canvas.addEventListener('click', walkRequestPointer);
});