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
	/** Eye height above the surface, as a fraction of the mesh bounding-box diagonal. */
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
	/** Max pitch away from the tangent plane (rad). */
	PITCH_LIMIT: 1.48,
	/** Resolution of the one-shot survey used to measure scale, centroid and closure. */
	SURVEY: 12,
	/** Relative distance below which two domain edges are considered to be the same seam. */
	CLOSURE_EPS: 0.002,
	/** Per-frame displacement ceiling, in grid cells (bilinear interpolation stays valid). */
	MAX_CELLS_PER_FRAME: 0.5,
};

// Scratch buffers — allocated once, the walk loop must not churn the GC.
const _walkCellIdx = new Float32Array(4 * 2);
const _walkSurveyIdx = new Float32Array(WALK.SURVEY * WALK.SURVEY * 2);
const _walkCorners = [
	new BABYLON.Vector3(), new BABYLON.Vector3(),
	new BABYLON.Vector3(), new BABYLON.Vector3()
];
const _walkFrame = {
	position: new BABYLON.Vector3(),
	tangentU: new BABYLON.Vector3(),
	tangentV: new BABYLON.Vector3(),
	normal:   new BABYLON.Vector3(),
	valid:    false
};
const _wTmpA = new BABYLON.Vector3();
const _wTmpB = new BABYLON.Vector3();
const _wTmpC = new BABYLON.Vector3();

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
 * Maps a grid index onto the mesh: wrapped when the surface closes in that direction
 * (index `n` coincides with index 0, so the period is `n`), clamped otherwise.
 * @param {number} x - Raw index, possibly out of range.
 * @param {number} n - Number of steps along that axis.
 * @param {boolean} closed - Whether the surface closes along that axis.
 * @returns {number} A valid index in `[0, n]`.
 */
function walkWrapIndex(x, n, closed) {
	if (closed) return ((x % n) + n) % n;
	return Math.min(Math.max(x, 0), n);
}

/**
 * Evaluates the surface at a continuous parametric position, in **object space**.
 *
 * Probes the four integer corners of the containing grid cell and interpolates
 * bilinearly. Only integer indices are ever probed: `computePosition` derives
 * `d`/`k`/`p`/`w` from `mod(i, 2.0)`, which has no meaning between vertices, so a
 * fractional probe would drift off the rendered geometry for any equation using those
 * variables. Interpolating between real vertices instead keeps the character on the
 * quad that is actually drawn, whatever the equation does — geometry-editor GLSL
 * included.
 *
 * The tangents are the exact analytic derivatives of that bilinear patch, so the frame
 * matches the facet under the character rather than the shader's `eps`-scale finite
 * difference (which is noisier on high-frequency deformation).
 *
 * @param {object} info - Result of {@link walkMeshInfo}.
 * @param {number} u - Parametric u.
 * @param {number} v - Parametric v.
 * @returns {object} {@link _walkFrame}, reused between calls; check `.valid`.
 */
function walkEvalSurface(info, u, v) {
	const { inst, gridU, gridV } = info;
	const w = glo.walk;
	_walkFrame.valid = false;

	const fi = inst.step_u !== 0 ? (u - inst.min_u) / inst.step_u : 0;
	const fj = inst.step_v !== 0 ? (v - inst.min_v) / inst.step_v : 0;

	// Cell origin, kept inside the grid so the +1 corners always exist.
	let i0 = Math.floor(fi);
	let j0 = Math.floor(fj);
	if (!w.closedU) i0 = Math.min(Math.max(i0, 0), gridU - 1);
	if (!w.closedV) j0 = Math.min(Math.max(j0, 0), gridV - 1);
	const fu = fi - i0;
	const fv = fj - j0;

	const corners = [[0, 0], [1, 0], [0, 1], [1, 1]];
	for (let c = 0; c < 4; c++) {
		_walkCellIdx[c * 2]     = walkWrapIndex(i0 + corners[c][0], gridU, w.closedU);
		_walkCellIdx[c * 2 + 1] = walkWrapIndex(j0 + corners[c][1], gridV, w.closedV);
	}

	const probe = inst.probePoints(_walkCellIdx, 4);
	if (!probe) return _walkFrame;

	for (let c = 0; c < 4; c++) {
		_walkCorners[c].set(
			probe.positions[c * 3],
			probe.positions[c * 3 + 1],
			probe.positions[c * 3 + 2]
		);
	}
	const [p00, p10, p01, p11] = _walkCorners;

	// Bilinear position.
	_walkFrame.position.set(
		(1 - fu) * (1 - fv) * p00.x + fu * (1 - fv) * p10.x + (1 - fu) * fv * p01.x + fu * fv * p11.x,
		(1 - fu) * (1 - fv) * p00.y + fu * (1 - fv) * p10.y + (1 - fu) * fv * p01.y + fu * fv * p11.y,
		(1 - fu) * (1 - fv) * p00.z + fu * (1 - fv) * p10.z + (1 - fu) * fv * p01.z + fu * fv * p11.z
	);

	// Exact derivatives of the bilinear patch, converted from index steps to u/v steps.
	const du = inst.step_u || 1;
	const dv = inst.step_v || 1;
	_walkFrame.tangentU.set(
		((1 - fv) * (p10.x - p00.x) + fv * (p11.x - p01.x)) / du,
		((1 - fv) * (p10.y - p00.y) + fv * (p11.y - p01.y)) / du,
		((1 - fv) * (p10.z - p00.z) + fv * (p11.z - p01.z)) / du
	);
	_walkFrame.tangentV.set(
		((1 - fu) * (p01.x - p00.x) + fu * (p11.x - p10.x)) / dv,
		((1 - fu) * (p01.y - p00.y) + fu * (p11.y - p10.y)) / dv,
		((1 - fu) * (p01.z - p00.z) + fu * (p11.z - p10.z)) / dv
	);

	// Same handedness as the shader: normal = cross(tangentU, tangentV).
	BABYLON.Vector3.CrossToRef(_walkFrame.tangentU, _walkFrame.tangentV, _walkFrame.normal);
	const nLen = _walkFrame.normal.length();
	if (!isFinite(nLen) || nLen < 1e-12) {
		// Degenerate cell (a pole, or a collapsed patch): fall back to the radial
		// direction, exactly as the vertex shader does when its cross product dies.
		const pLen = _walkFrame.position.length();
		if (pLen > 1e-6) _walkFrame.normal.copyFrom(_walkFrame.position).scaleInPlace(1 / pLen);
		else _walkFrame.normal.set(0, 1, 0);
	} else {
		_walkFrame.normal.scaleInPlace(1 / nLen);
	}

	_walkFrame.valid = true;
	return _walkFrame;
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

	// Closure: compare the two extreme rows (and columns) of the survey grid.
	const at = (a, b) => _wTmpA.set(
		probe.positions[(a * n + b) * 3],
		probe.positions[(a * n + b) * 3 + 1],
		probe.positions[(a * n + b) * 3 + 2]
	);
	let maxU = 0, maxV = 0;
	for (let b = 0; b < n; b++) {
		_wTmpB.copyFrom(at(0, b));
		maxU = Math.max(maxU, BABYLON.Vector3.Distance(_wTmpB, at(n - 1, b)));
	}
	for (let a = 0; a < n; a++) {
		_wTmpB.copyFrom(at(a, 0));
		maxV = Math.max(maxV, BABYLON.Vector3.Distance(_wTmpB, at(a, n - 1)));
	}

	return {
		scale,
		center,
		closedU: maxU < WALK.CLOSURE_EPS * scale,
		closedV: maxV < WALK.CLOSURE_EPS * scale
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
	rig.rotationQuaternion = null; // Euler angles, fed by Vector3.RotationFromAxis

	const cam = new BABYLON.UniversalCamera("WalkCamera", BABYLON.Vector3.Zero(), scene);
	cam.inputs.clear();          // locomotion is ours, not Babylon's
	cam.parent = rig;
	cam.minZ = 0.01;
	cam.fov = 1.2;

	glo.walkRig = rig;
	glo.walkCamera = cam;
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
	w.autopilot = autopilot;
	w.scale = survey.scale;
	w.center.copyFrom(survey.center);
	w.closedU = survey.closedU;
	w.closedV = survey.closedV;
	w.eyeHeight = survey.scale * WALK.EYE_RATIO;

	// Drop the character in the middle of the domain, at rest.
	const inst = info.inst;
	w.u = (inst.min_u + inst.max_u) / 2;
	w.v = (inst.min_v + inst.max_v) / 2;
	w.height = 0;
	w.vSpeed = 0;
	// Babylon pitches down for a positive rotation.x — the autopilot tilts slightly
	// downwards so the surface, not the void above it, fills the frame.
	w.pitch = autopilot ? 0.22 : 0;
	w.turnPhase = 0;
	w.keys.clear();
	w.frameReady = false;

	const frame = walkEvalSurface(info, w.u, w.v);
	if (!frame.valid) return false;

	// Pick the side of the surface that faces away from the centroid, so the character
	// starts on the outside of the form rather than buried inside it. Reversible with X.
	_wTmpA.copyFrom(frame.position).subtractInPlace(w.center);
	w.flip = BABYLON.Vector3.Dot(frame.normal, _wTmpA) < 0 ? -1 : 1;

	// Initial heading: along the u parameter line, projected into the tangent plane.
	w.heading.copyFrom(frame.tangentU);
	walkTangentialize(w.heading, frame.normal, frame.tangentV);

	w.smoothNormal.copyFrom(frame.normal).scaleInPlace(w.flip);

	const cam = glo.walkCamera;
	cam.minZ = Math.max(w.eyeHeight * 0.01, 1e-4);
	cam.maxZ = w.scale * 20;

	if (glo.cameraMode === 'travelling') stopTravelling();
	if (glo.orbitCamera) glo.orbitCamera.detachControl(glo.canvas);

	glo.scene.activeCamera = cam;
	glo.camera = cam;
	glo.cameraMode = 'walk';

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

	walkReleasePointer();
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
 * Per-frame update of the character and the rig. Called from the render loop in
 * `bab.js` while {@link glo.cameraMode} is `'walk'`.
 *
 * Order of business:
 *  1. sample the surface under the character (one probe, four vertices);
 *  2. keep the heading tangent to the surface — because the heading is stored in world
 *     space and re-projected each frame, walking forward follows a geodesic rather than
 *     a parameter line: re-projecting a direction onto a moving tangent plane *is*
 *     discrete parallel transport, so it comes for free;
 *  3. turn the requested world displacement into a (du, dv) step through the first
 *     fundamental form, so the speed is constant on the surface and not in parameter
 *     space — without this, speed varies by orders of magnitude across a form;
 *  4. integrate the jump along the (smoothed) normal;
 *  5. write the rig pose.
 *
 * @param {boolean} [snap=false] - Skip the temporal smoothing (used on entry).
 */
function walkUpdate(snap = false) {
	const info = walkMeshInfo();
	const w = glo.walk;
	if (!info || !glo.walkRig) { stopWalk(); return; }

	const dt = Math.min(Math.max(glo.engine.getDeltaTime() / 1000, 0), 0.1);

	const frame = walkEvalSurface(info, w.u, w.v);
	if (!frame.valid) return;

	// --- Normal, oriented to the chosen side and low-pass filtered ---------------
	_wTmpA.copyFrom(frame.normal).scaleInPlace(w.flip);
	if (snap || !w.frameReady) {
		w.smoothNormal.copyFrom(_wTmpA);
		w.frameReady = true;
	} else {
		// The surface deforms under the character: recomputing the frame from scratch
		// every frame makes the camera vibrate. Position stays exact, orientation lags.
		const k = 1 - Math.exp(-dt / WALK.SMOOTH_TAU);
		w.smoothNormal.addInPlace(_wTmpA.subtractInPlace(w.smoothNormal).scaleInPlace(k));
		const l = w.smoothNormal.length();
		if (l > 1e-9) w.smoothNormal.scaleInPlace(1 / l);
		else w.smoothNormal.copyFrom(frame.normal).scaleInPlace(w.flip);
	}
	const up = w.smoothNormal;

	// --- Input -------------------------------------------------------------------
	let forward = 0, turn = 0, jump = false;
	if (w.autopilot) {
		w.turnPhase += dt;
		forward = 1;
		turn = 0.35 * Math.sin(w.turnPhase * 0.31) + 0.12 * Math.sin(w.turnPhase * 0.13);
	} else {
		if (w.keys.has('ArrowUp')) forward += 1;
		if (w.keys.has('ArrowDown')) forward -= 1;
		if (w.keys.has('ArrowLeft')) turn -= 1;
		if (w.keys.has('ArrowRight')) turn += 1;
		jump = w.keys.has(' ');
	}

	// --- Heading: turn around the normal, then re-project into the tangent plane --
	if (turn !== 0) {
		const q = BABYLON.Quaternion.RotationAxis(up, turn * WALK.TURN_SPEED * dt);
		w.heading.rotateByQuaternionToRef(q, w.heading);
	}
	walkTangentialize(w.heading, up, frame.tangentU);

	// --- Metric step: world displacement -> (du, dv) -----------------------------
	if (forward !== 0) {
		const speed = w.eyeHeight * WALK.SPEED_EYES * w.speedScale;
		let dist = forward * speed * dt;

		const Pu = frame.tangentU, Pv = frame.tangentV;
		const E = BABYLON.Vector3.Dot(Pu, Pu);
		const F = BABYLON.Vector3.Dot(Pu, Pv);
		const G = BABYLON.Vector3.Dot(Pv, Pv);
		const det = E * G - F * F;

		if (isFinite(det) && Math.abs(det) > 1e-12) {
			_wTmpA.copyFrom(w.heading).scaleInPlace(dist);
			const bu = BABYLON.Vector3.Dot(_wTmpA, Pu);
			const bv = BABYLON.Vector3.Dot(_wTmpA, Pv);
			let du = (bu * G - bv * F) / det;
			let dv = (bv * E - bu * F) / det;

			// Bilinear interpolation is only valid inside one cell: never cross more
			// than half a cell per frame. At sane speeds this never triggers.
			const maxDu = WALK.MAX_CELLS_PER_FRAME * (info.inst.step_u || 1);
			const maxDv = WALK.MAX_CELLS_PER_FRAME * (info.inst.step_v || 1);
			const over = Math.max(Math.abs(du) / maxDu, Math.abs(dv) / maxDv, 1);
			du /= over; dv /= over;

			if (isFinite(du) && isFinite(dv)) { w.u += du; w.v += dv; }
		}
	}

	// --- Domain edges: loop where the surface closes, bounce where it does not ----
	// Closure was measured on the real geometry at entry, so a torus keeps going
	// forever while an open patch has a real border. Walking into that border turns
	// the character around instead of leaving it pressed against the void.
	const inst = info.inst;
	const rangeU = inst.max_u - inst.min_u;
	const rangeV = inst.max_v - inst.min_v;
	let bounceU = false, bounceV = false;

	if (w.closedU && rangeU > 0) {
		w.u = inst.min_u + (((w.u - inst.min_u) % rangeU) + rangeU) % rangeU;
	} else {
		const cu = Math.min(Math.max(w.u, inst.min_u), inst.max_u);
		bounceU = cu !== w.u;
		w.u = cu;
	}
	if (w.closedV && rangeV > 0) {
		w.v = inst.min_v + (((w.v - inst.min_v) % rangeV) + rangeV) % rangeV;
	} else {
		const cv = Math.min(Math.max(w.v, inst.min_v), inst.max_v);
		bounceV = cv !== w.v;
		w.v = cv;
	}

	if (bounceU || bounceV) {
		// Mirror the heading about the blocked parameter direction, billiard-style.
		const axis = _wTmpB.copyFrom(bounceU ? frame.tangentU : frame.tangentV);
		const aLen = axis.length();
		if (aLen > 1e-9) {
			axis.scaleInPlace(1 / aLen);
			const proj = BABYLON.Vector3.Dot(w.heading, axis);
			w.heading.subtractInPlace(_wTmpC.copyFrom(axis).scaleInPlace(2 * proj));
			walkTangentialize(w.heading, up, frame.tangentV);
		}
	}

	// --- Jump: purely along the normal ------------------------------------------
	// Gravity points into the surface rather than down the world Y axis. On a closed or
	// self-intersecting form "down" has no global meaning, and this way the character
	// keeps its footing upside down, on overhangs, and inside the shape.
	const gravity = w.eyeHeight * WALK.GRAVITY_EYES;
	if (jump && w.height <= 0 && w.vSpeed <= 0) {
		w.vSpeed = Math.sqrt(2 * gravity * w.eyeHeight * WALK.JUMP_EYES);
	}
	if (w.height > 0 || w.vSpeed > 0) {
		w.vSpeed -= gravity * dt;
		w.height += w.vSpeed * dt;
		if (w.height <= 0) { w.height = 0; w.vSpeed = 0; }
	}

	// --- Rig pose ----------------------------------------------------------------
	// The probe returns object space; meshTransformations (scaling / rotation /
	// position) live on the Babylon node, so the world matrix has to be applied. The
	// normal is obtained by transforming the two tangents and re-crossing them, which
	// stays correct under non-uniform scaling without needing an inverse transpose.
	const world = glo.ribbon.getWorldMatrix();
	BABYLON.Vector3.TransformCoordinatesToRef(frame.position, world, _wTmpA);
	BABYLON.Vector3.TransformNormalToRef(frame.tangentU, world, _wTmpB);
	BABYLON.Vector3.TransformNormalToRef(frame.tangentV, world, _wTmpC);

	const upW = BABYLON.Vector3.Cross(_wTmpB, _wTmpC);
	const upLen = upW.length();
	if (upLen > 1e-12) upW.scaleInPlace(w.flip / upLen); else upW.copyFrom(up);

	const fwdW = BABYLON.Vector3.TransformNormal(w.heading, world);
	walkTangentialize(fwdW, upW, _wTmpB);

	const rig = glo.walkRig;
	rig.position.copyFrom(_wTmpA).addInPlace(
		_wTmpB.copyFrom(upW).scaleInPlace(w.eyeHeight + w.height)
	);

	const right = BABYLON.Vector3.Cross(upW, fwdW);
	if (right.lengthSquared() > 1e-16) {
		right.normalize();
		rig.rotation = BABYLON.Vector3.RotationFromAxis(right, upW, fwdW);
	}

	glo.walkCamera.rotation.x = w.pitch;
	glo.walkCamera.rotation.y = 0;
	glo.walkCamera.rotation.z = 0;
}

// ==================== INPUT ====================

/**
 * Keyboard handler for walk mode, consulted before the global shortcut registry so the
 * arrows and space bar mean "move" and "jump" here instead of their usual bindings.
 * @param {KeyboardEvent} e - The keydown event.
 * @returns {boolean} `true` if the key was consumed by walk mode.
 */
function walkHandleKeyDown(e) {
	if (glo.cameraMode !== 'walk') return false;
	const w = glo.walk;

	switch (e.key) {
		case 'ArrowUp': case 'ArrowDown': case 'ArrowLeft': case 'ArrowRight': case ' ':
			w.keys.add(e.key);
			e.preventDefault();
			return true;
		case 'Escape':
			stopWalk();
			return true;
		case 'x': case 'X':
			// Swap sides of the surface — useful when the normal points inward.
			w.flip = -w.flip;
			w.frameReady = false;
			return true;
		case 'PageUp':
			w.speedScale = Math.min(w.speedScale * 1.4, 40);
			walkShowHud();
			return true;
		case 'PageDown':
			w.speedScale = Math.max(w.speedScale / 1.4, 0.05);
			walkShowHud();
			return true;
		default:
			return false;
	}
}

/**
 * Releases held keys when they come up.
 * @param {KeyboardEvent} e - The keyup event.
 */
function walkHandleKeyUp(e) {
	glo.walk.keys.delete(e.key);
}

/**
 * Mouse look. Horizontal motion turns the body (so the character always walks where it
 * looks), vertical motion pitches the head only.
 * @param {MouseEvent} e - The mousemove event.
 */
function walkHandleMouseMove(e) {
	if (glo.cameraMode !== 'walk' || document.pointerLockElement !== glo.canvas) return;
	const w = glo.walk;

	if (e.movementX) {
		const q = BABYLON.Quaternion.RotationAxis(w.smoothNormal, e.movementX * WALK.MOUSE_SENS);
		w.heading.rotateByQuaternionToRef(q, w.heading);
	}
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

// ==================== HUD ====================

/** Creates (once) and refreshes the small overlay listing the walk controls. */
function walkShowHud() {
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
		document.body.appendChild(hud);
	}

	const w = glo.walk;
	const mode = w.autopilot ? 'AUTOPILOT' : 'WALK';
	const loop = [w.closedU ? 'u' : null, w.closedV ? 'v' : null].filter(Boolean).join('+');
	hud.innerHTML =
		`<b>${mode}</b> &nbsp; arrows move &middot; space jump &middot; click for mouse look &middot; ` +
		`X flip side &middot; PgUp/PgDn speed (&times;${w.speedScale.toFixed(2)}) &middot; Esc exit` +
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
document.addEventListener('DOMContentLoaded', () => {
	const canvas = getById('renderCanvas');
	if (canvas) canvas.addEventListener('click', walkRequestPointer);
});
