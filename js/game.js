//*****************************************************************************************************//
//******************************************** SURFACE GAME *******************************************//
//*****************************************************************************************************//
//
// Game entities on top of the surface-agent substrate: the projectiles for now, the
// enemies and the rules later.
//
// A bullet is a walker that is fast, dies on contact and carries no camera. Everything
// that makes it fly — the metric step, the seams, the gravity along the normal — is the
// integrator in agents.js, unchanged. So a shot fired straight ahead follows a geodesic
// exactly as walking straight ahead does: on a sphere it circumnavigates and comes back
// at the shooter from behind, and that falls out of the geometry rather than out of any
// code written for it.
//
// Three things a projectile genuinely does not inherit from the walker, and all three
// are set at spawn:
//   - the per-frame cell ceiling, which at the walker's 0.5 would throttle a bullet to
//     a crawl (docs/jeu-de-tir-sur-surface.md §5.1);
//   - the ground policy, since reaching the surface is an impact and not a landing;
//   - the muzzle pitch, because the body is flat in the tangent plane and the pitch
//     lives on the camera, so a bullet inheriting the bare heading would always fly
//     level however the player was aiming.
//

/** Tunables for the game entities. Distances are in eye heights unless stated. */
const GAME = {
	/** Muzzle speed, in body heights per second. */
	BULLET_SPEED: 22,
	/** Seconds a bullet lives before expiring on its own. */
	BULLET_TTL: 8,
	/** Seconds a bullet's drawn path survives, counted from each point being laid down. */
	BULLET_TRACE_SECONDS: 4,
	/**
	 * Outside a match, firing launches a geodesic probe instead of a bullet: no gravity,
	 * a long life and a line that does not fade.
	 *
	 * In a match a bullet is ballistic and lands in about half a second, so its trace is a
	 * short arc — right for a projectile, and useless for seeing what the surface does to a
	 * straight line. The same machinery with gravity switched off draws the geodesic
	 * itself, which on a sphere visibly wraps round and returns. That is the instrument
	 * this application is, so it is what firing does when nothing is shooting back.
	 */
	TRACER_TTL: 40,
	/**
	 * Per-frame displacement ceiling for a bullet, in grid cells.
	 *
	 * The walker's 0.5 exists so the step never leaves the sampled patch. A bullet does
	 * leave it, and that is a speed error rather than a divergence: the position is
	 * re-derived from (u, v) next frame, only the metric used to convert world distance
	 * to parameter distance is a cell stale. The chord that costs is measured, not
	 * assumed — see the note's §14.
	 */
	BULLET_MAX_CELLS: 8,
	/** Collision radius of a bullet, in body heights. */
	BULLET_RADIUS: 0.12,
	/** Seconds between two shots. */
	FIRE_INTERVAL: 0.15,
	/** Collision radius of a character, in body heights. */
	BODY_RADIUS: 0.55,
	/**
	 * Whether a bullet can hit something standing on another sheet of the surface.
	 *
	 * These forms pass through themselves constantly, so two agents at unrelated (u, v)
	 * can share a world point. On a Klein bottle that is the sensation worth selling —
	 * you shoot through yourself. On a terrain-like form it is a nuisance. There is no
	 * universal answer, so it is a switch; when off, a hit additionally has to be close
	 * along the surface and not merely close in space.
	 */
	hitAcrossSheets: false,
	/** How many hit radii apart two agents may be *along the surface* and still connect. */
	SHEET_TOLERANCE: 3,
	/** Enemy walking speed, in body heights per second. */
	ENEMY_SPEED: 1.1,
	/** Enemy turn rate, rad/s. Slower than the player's: it must be outmanoeuvrable. */
	ENEMY_TURN: 1.0,
	/** Enemy firing range and cadence. */
	ENEMY_RANGE: 26,
	ENEMY_FIRE_INTERVAL: 1.4,
	/** Cosine of the half-angle within which an enemy will take the shot. */
	ENEMY_AIM_COS: 0.985,
	/** How close an enemy tries to get, in body heights. */
	ENEMY_STANDOFF: 6,
	/** Hits an enemy takes before dying. */
	ENEMY_HEALTH: 3,
	/** Hits the player takes before respawning. */
	PLAYER_HEALTH: 8,
	/** Enemies in the first wave, and how many more each wave adds. */
	WAVE_SIZE: 3,
	WAVE_GROWTH: 2,
	/** Seconds between a wave being cleared and the next one arriving. */
	WAVE_PAUSE: 2.5,
	/**
	 * How far from the player a wave spawns, in body heights — a real distance, converted
	 * to a parametric one through the local metric.
	 *
	 * It used to be a fraction of the parametric domain, which is meaningless: the same
	 * fraction is a few strides on one form and well past the horizon on another, so waves
	 * arrived out of sight and the first minute of a match was spent walking. Chosen to sit
	 * inside ENEMY_RANGE, so a wave can see the player the moment it lands.
	 */
	SPAWN_DISTANCE: 14,
	/** Seconds of immunity after respawning, so a wave cannot camp the spawn. */
	RESPAWN_GRACE: 2,
	/** Drawn height of a character marker and of a bullet marker, in body heights. */
	MARKER_SIZE: 1.2,
	BULLET_MARKER_SIZE: 0.35,
	/**
	 * How far a marker's base is lifted off the surface, in its own size.
	 *
	 * Not decoration: a marker whose base sits exactly on the surface is coplanar with it,
	 * and coplanar is precisely where a depth buffer has nothing to say. Lifting the
	 * marker puts it unambiguously in front of the ground it stands on, so the occluded
	 * test answers a question about the entity rather than about rounding.
	 */
	MARKER_HOVER: 0.2,

	/** Marker colours when the entity is in plain sight, as [r, g, b, a]. */
	COLORS: {
		bullet: [1.0, 0.85, 0.25, 1.0],
		enemy:  [0.95, 0.3, 0.35, 1.0],
	},
	/**
	 * Marker colours for the part of an entity that the surface is hiding.
	 *
	 * Knowing something is behind a sheet is different information from knowing where it
	 * is, and on a form that folds through itself the two are constantly mixed up. A
	 * second colour keeps them apart: red is a target you can actually hit, green is one
	 * you would be shooting a sheet of surface at. A partly occluded enemy comes out
	 * partly each, which reads exactly right.
	 */
	HIDDEN_COLORS: {
		bullet: [0.55, 0.8, 0.35, 1.0],
		enemy:  [0.25, 0.95, 0.45, 1.0],
	},
	/**
	 * Opacity of the see-through pass — the silhouette an entity leaves where the surface
	 * hides it.
	 *
	 * On a form that folds through itself an entity spends most of its time behind some
	 * other sheet, and you cannot aim at what you cannot see, so this is playability
	 * rather than decoration. Translucent on purpose: it says "there, but not reachable".
	 */
	GHOST_ALPHA: 0.55,
	/** Entity capacity the vertex buffers start at; they grow on demand. */
	INITIAL_MARKERS: 64,
};

/** Live game state — the shooting clock and the marker buffers. */
const _game = {
	/** @type {BABYLON.Mesh|null} Solid entity triangles, rebuilt every frame. */
	markers: null,
	/** @type {BABYLON.Mesh|null} The same triangles again, ignoring depth. */
	ghosts: null,
	/** @type {Float32Array|null} World-space vertex positions, three per entity. */
	positions: null,
	/** @type {Float32Array|null} Vertex colours, four floats per vertex. */
	colors: null,
	/** @type {Float32Array|null} The same vertices in the occluded palette. */
	ghostColors: null,
	/** @type {number} Capacity of the buffers above, in entities. */
	capacity: 0,
	/** @type {number} Seconds until the player may fire again. */
	cooldown: 0,
	/** @type {number} Bullets that connected, and hits the player has taken. */
	hits: 0,
	playerHits: 0,
	/** @type {boolean} Whether the rules are running. Off, this is plain walk mode. */
	active: false,
	/** @type {number} Enemies killed. */
	score: 0,
	/** @type {number} Wave number, 0 before the first. */
	wave: 0,
	/** @type {number} Seconds until the next wave arrives; 0 when one is in play. */
	waveTimer: 0,
	/** @type {number} Seconds of spawn immunity left. */
	grace: 0,
	/** @type {number} Times the player has died. */
	deaths: 0,
	/** @type {boolean} A rebuild stranded the wave; put it back once the player has a frame. */
	replaceWave: false,
};

// Scratch for the per-frame marker, think and collision passes.
const _gRight = new BABYLON.Vector3();
const _gUp    = new BABYLON.Vector3();
const _gFwd   = new BABYLON.Vector3();
const _gPos   = new BABYLON.Vector3();
const _gAim   = new BABYLON.Vector3();
const _gSep   = new BABYLON.Vector3();
const _gSeg   = new BABYLON.Vector3();
const _gRel   = new BABYLON.Vector3();
const _gStep  = { du: 0, dv: 0 };

/**
 * Builds the two entity layers: the solid markers, and the see-through silhouettes that
 * show where an entity is even when the surface hides it.
 *
 * Each entity is three vertices written straight into a shared, updatable vertex buffer
 * every frame — no instancing. Thin instances were the first implementation and they were
 * the wrong tool here: at a few hundred entities the saving is unmeasurable next to the
 * probe, while the material had to hand-declare `world0`..`world3` and rebuild the
 * instance matrix itself, bypassing Babylon's own instancing includes. That path renders
 * on some drivers and silently produces nothing on others. Six hundred vertices a frame
 * is nothing, and plain position + colour buffers are the most portable thing WebGL has.
 *
 * The triangles are built in world space, so neither mesh needs a transform of its own.
 *
 * @param {BABYLON.Scene} scene - The BabylonJS scene.
 */
function initGameMarkers(scene) {
	_game.markers = gameMakeMarkerLayer(scene, 'gameMarkers', false);
	_game.ghosts  = gameMakeMarkerLayer(scene, 'gameMarkerGhosts', true);
	_gameGrowMarkers(GAME.INITIAL_MARKERS);
}

/**
 * One entity layer: a mesh whose vertices are rewritten each frame, and a two-line shader.
 *
 * A raw ShaderMaterial rather than a StandardMaterial, for the same reason the mini-map
 * panel ended up as one (docs/vue-premiere-personne.md §14): there is no lighting
 * semantics to fight, and it matches the rest of the project. Two-sided, because on a
 * surface that folds through itself an entity is seen from either face.
 *
 * @param {BABYLON.Scene} scene - The BabylonJS scene.
 * @param {string} name - Mesh name; must match the `ribbonDispose` whitelist.
 * @param {boolean} ghost - Ignore depth and draw translucent, for the see-through pass.
 * @returns {BABYLON.Mesh} The layer.
 */
function gameMakeMarkerLayer(scene, name, ghost) {
	const mesh = new BABYLON.Mesh(name, scene);

	const mat = new BABYLON.ShaderMaterial(name + 'Mat', scene, {
		vertexSource: `
			precision highp float;
			attribute vec3 position;
			attribute vec4 color;
			uniform mat4 worldViewProjection;
			varying vec4 vColor;
			void main(void) {
				gl_Position = worldViewProjection * vec4(position, 1.0);
				vColor = color;
			}`,
		fragmentSource: `
			precision highp float;
			uniform float uAlpha;
			varying vec4 vColor;
			void main(void) { gl_FragColor = vec4(vColor.rgb, vColor.a * uAlpha); }`
	}, {
		attributes: ['position', 'color'],
		uniforms: ['worldViewProjection', 'uAlpha'],
		needAlphaBlending: ghost
	});
	mat.backFaceCulling = false;
	mat.setFloat('uAlpha', ghost ? GAME.GHOST_ALPHA : 1.0);
	// Neither pass writes depth. What is being asked is "does the *surface* hide this
	// entity", so entities must not occlude each other: an enemy standing behind another
	// enemy is in the open, and colouring it as hidden would be a lie. Leaving the depth
	// buffer to the surface alone makes the two passes exact complements of one another.
	mat.disableDepthWrite = true;
	if (ghost) {
		mat.alpha = GAME.GHOST_ALPHA;   // switches blending on
		// GREATER, not ALWAYS: the pass draws only where the fragment lies *behind* what
		// is already in the depth buffer — that is, exactly the parts the surface hides.
		// A visible entity has already written its own depth in the solid pass, so the
		// silhouette fails the test against itself and never washes over it; an occluded
		// one fails the solid pass and passes here. The two colours then partition the
		// entity into what you can shoot and what you cannot, with no extra bookkeeping.
		mat.depthFunction = (BABYLON.Engine && BABYLON.Engine.GREATER) || 516;
	}

	mesh.material = mat;
	mesh.isPickable = false;
	// The vertices are world-space and rewritten constantly: the bounds mean nothing.
	mesh.alwaysSelectAsActiveMesh = true;
	// The same rendering group as the surface, deliberately.
	//
	// Babylon clears the depth buffer between rendering groups by default, so a mesh in
	// group 1 is drawn as if nothing else existed — which is why the entities were
	// visible through the whole form no matter what the depth function said, and why the
	// silhouette pass had nothing to do. Sharing group 0 with the surface is what gives
	// the depth test something to test against. Within the group Babylon draws every
	// opaque mesh first and the transparent ones after, so the solid pass competes with
	// the surface on depth and the silhouette pass runs once the buffer is complete —
	// exactly the order this needs, without touching anyone else's clear settings.
	mesh.renderingGroupId = 0;
	// The walking camera sees it; the mini-map does not, which keeps the map reading as a
	// map rather than as a second battlefield.
	mesh.layerMask = WALK_LAYER.MAIN;
	mesh.setEnabled(false);

	if (!ghost) glo.gameMarkers = mesh;
	return mesh;
}

/**
 * (Re)allocates the shared vertex buffers and hands them to both layers.
 *
 * Capacity is fixed between growths and unused entities are left as degenerate triangles
 * — three coincident vertices rasterize nothing — so the index buffer is written once and
 * the per-frame work is an in-place update with no allocation.
 *
 * @private
 * @param {number} capacity - Entities to make room for.
 */
function _gameGrowMarkers(capacity) {
	_game.capacity = capacity;
	_game.positions = new Float32Array(capacity * 9);
	_game.colors = new Float32Array(capacity * 12);
	_game.ghostColors = new Float32Array(capacity * 12);

	const indices = new Uint32Array(capacity * 3);
	for (let i = 0; i < capacity * 3; i++) indices[i] = i;

	// Same geometry, two palettes: the layers share positions and differ only in colour.
	const layers = [[_game.markers, _game.colors], [_game.ghosts, _game.ghostColors]];
	for (const [layer, colors] of layers) {
		if (!layer) continue;
		layer.setVerticesData(BABYLON.VertexBuffer.PositionKind, _game.positions, true);
		layer.setVerticesData(BABYLON.VertexBuffer.ColorKind, colors, true);
		layer.setIndices(indices);
	}
}

/**
 * Spawns a projectile from an agent.
 *
 * The bullet inherits the shooter's surface frame outright — same (u, v), same side,
 * same smoothed normal, already marked as having a valid frame — so it starts on the
 * surface rather than snapping to it on its first step. And it inherits the shooter's
 * gravity unchanged: one gravity rule for the character and for everything it throws is
 * the whole point of the design.
 *
 * @param {object} shooter - The agent firing, already stepped this frame.
 * @param {number} [pitch=0] - Aim angle in radians. Positive looks *down*, matching
 *   Babylon's `rotation.x`, so the vertical speed comes out negated.
 * @param {number} [yaw=0] - Aim offset around the normal, for a shooter whose head is
 *   turned relative to its body.
 * @returns {object|null} The bullet agent, or `null` if the shooter has no frame yet.
 */
function gameFire(shooter, pitch = 0, yaw = 0) {
	if (!shooter || !shooter.frameReady) return null;

	const body = shooter.baseEye || 1;
	const speed = body * GAME.BULLET_SPEED;

	const b = createSurfaceAgent({
		patch: 'bilinear',        // no camera rides it: C1 continuity buys nothing here
		ground: 'despawn',
		smoothTau: 0,             // follow the raw geometry, not a comfort filter
		maxCells: GAME.BULLET_MAX_CELLS,
		kind: 'bullet',
		team: shooter.team,
		owner: shooter,
		ttl: GAME.BULLET_TTL,
		gravity: shooter.gravity,
		radius: body * GAME.BULLET_RADIUS,
		moveSpeed: speed * Math.cos(pitch)
	});
	b.baseEye = body;
	b.markerSize = body * GAME.BULLET_MARKER_SIZE;

	b.u = shooter.u;
	b.v = shooter.v;
	b.flip = shooter.flip;
	b.smoothNormal.copyFrom(shooter.smoothNormal);
	b.up.copyFrom(shooter.up);
	// The bullet starts exactly where the shooter stands, so the shooter's world frame is
	// its world frame. Copying it matters beyond tidiness: `frameReady` is set below, and
	// the marker pass draws anything ready — without this the bullet would be drawn at
	// the world origin for the one frame between spawning and its first step.
	b.worldPos.copyFrom(shooter.worldPos);
	b.prevWorldPos.copyFrom(shooter.worldPos);
	b.worldTu.copyFrom(shooter.worldTu);
	b.worldTv.copyFrom(shooter.worldTv);
	b.frameReady = true;

	// Fired from the eye, not from the feet.
	b.height = (shooter.eyeHeight || 0) + shooter.height;
	// Babylon pitches down for a positive rotation.x, so aiming down must give a
	// downward vertical speed.
	b.vSpeed = -speed * Math.sin(pitch);

	b.heading.copyFrom(shooter.heading);
	if (yaw !== 0) {
		const q = BABYLON.Quaternion.RotationAxis(shooter.up, yaw);
		b.heading.rotateByQuaternionToRef(q, b.heading);
	}
	walkTangentialize(b.heading, shooter.up, shooter.worldTu);

	b.input.forward = 1;
	agentsRegister(b);

	// The path is the point: a shot fired straight ahead follows a geodesic, and on a
	// sphere that means it wraps round the form and comes back. Nothing said so until the
	// line was drawn. It lingers a moment past the impact so the shape stays readable.
	b.trace = traceAttach(b, { kind: 'bullet', lifetime: GAME.BULLET_TRACE_SECONDS, linger: GAME.BULLET_TRACE_SECONDS });
	return b;
}

/**
 * Fires for the player, honouring the cooldown and whatever the camera is looking at.
 *
 * The pending mouse yaw is passed through rather than ignored: off a rail the step folds
 * it into the heading every frame, but between two steps it holds the difference between
 * where the body points and where the player is actually aiming.
 *
 * @returns {object|null} The bullet, or `null` if still cooling down.
 */
function gameFirePlayer() {
	const w = glo.walk;
	if (glo.cameraMode !== 'walk' || _game.cooldown > 0) return null;
	_game.cooldown = GAME.FIRE_INTERVAL;

	const b = gameFire(w, w.pitch, w.viewYaw);
	if (b && !_game.active) {
		// No match running: this is a geodesic probe, not a shot. Gravity off so the path
		// is the surface's answer to "straight ahead" and nothing else, and a line that
		// stays put long enough to walk over and look at.
		b.gravity = 0;
		b.vSpeed = 0;
		b.height = 0;
		b.ttl = GAME.TRACER_TTL;
		if (b.trace) { b.trace.lifetime = Infinity; b.trace.linger = Infinity; }
	}
	return b;
}

/**
 * Spawns an enemy at a parametric position.
 *
 * An enemy is the same agent as the player, with the arrows replaced by
 * {@link gameEnemyThink}. It borrows the player's body size so speed, gravity and jump
 * all scale to the mesh the same way — the measurement lives on the player because it is
 * the one that surveys the surface on entry.
 *
 * @param {number} u - Parametric u.
 * @param {number} v - Parametric v.
 * @param {object} [ref=glo.walk] - Agent to take the body scale and surface side from.
 * @returns {object} The enemy agent.
 */
function gameSpawnEnemy(u, v, ref = glo.walk) {
	const body = ref.baseEye || 1;
	const e = createSurfaceAgent({
		patch: 'bilinear',
		ground: 'stick',
		kind: 'enemy',
		team: 1,
		turnSpeed: GAME.ENEMY_TURN,
		moveSpeed: body * GAME.ENEMY_SPEED,
		gravity: ref.gravity,
		jumpSpeed: ref.jumpSpeed,
		radius: body * GAME.BODY_RADIUS
	});
	e.u = u;
	e.v = v;
	e.flip = ref.flip;
	e.baseEye = body;
	e.eyeHeight = body;
	e.markerSize = body * GAME.MARKER_SIZE;
	e.health = GAME.ENEMY_HEALTH;
	e.fireCooldown = GAME.ENEMY_FIRE_INTERVAL * Math.random();
	// No frame yet: the first step snaps it onto the surface from scratch, which is what
	// `flip` is for.
	return agentsRegister(e);
}

/**
 * One enemy's decision for the coming step.
 *
 * "Towards the player" is not the difference of two positions: that vector points through
 * the ambient space, not along the surface. Projecting it into the tangent plane is the
 * cheap honest answer — greedy rather than a true shortest path, so it will get stuck
 * where the geodesic has to curve around, which for a shooter is acceptable and for
 * anything else would need real pathfinding.
 *
 * @param {object} e - The enemy.
 * @param {object} target - Who it is after.
 * @param {number} dt - Timestep in seconds.
 */
function gameEnemyThink(e, target, dt) {
	e.fireCooldown = Math.max(0, e.fireCooldown - dt);

	if (!e.frameReady || !target || !target.frameReady) { e.input.forward = 0; e.input.turn = 0; return; }

	_gAim.copyFrom(target.worldPos).subtractInPlace(e.worldPos);
	const dist = _gAim.length();
	walkTangentialize(_gAim, e.up, e.worldTu);

	// Signed angle from the heading to the aim, measured around the surface normal.
	const cross = BABYLON.Vector3.Cross(e.heading, _gAim);
	const angle = Math.atan2(BABYLON.Vector3.Dot(cross, e.up),
	                         BABYLON.Vector3.Dot(e.heading, _gAim));

	// Ask for exactly the turn that closes the angle this frame, capped at full lock.
	const want = angle / Math.max(e.turnSpeed * dt, 1e-6);
	e.input.turn = Math.min(Math.max(want, -1), 1);

	const standoff = e.baseEye * GAME.ENEMY_STANDOFF;
	e.input.forward = dist > standoff ? 1 : (dist < standoff * 0.6 ? -1 : 0);

	// Take the shot only when actually facing the target, so an enemy cannot snipe
	// sideways while circling.
	const aimed = Math.cos(angle) >= GAME.ENEMY_AIM_COS;
	if (aimed && e.fireCooldown === 0 && dist < e.baseEye * GAME.ENEMY_RANGE) {
		e.fireCooldown = GAME.ENEMY_FIRE_INTERVAL;
		gameFire(e, 0, 0);
	}
}

/**
 * Runs every entity's decision for the coming step. Must be called **before**
 * `agentsStep`, which consumes `agent.input`.
 * @param {number} dt - Timestep in seconds.
 */
function gameThink(dt) {
	const all = agentsAll();
	const player = glo.walk;
	for (let i = 0; i < all.length; i++) {
		const a = all[i];
		if (!a.alive) continue;
		if (a.kind === 'enemy') gameEnemyThink(a, player, dt);
	}
}

/**
 * Distance between two agents *along the surface*, approximated from one of their tangent
 * frames.
 *
 * This is what separates a genuine hit from two agents that merely share a point in space
 * because the surface folds through itself. Comparing (u, v) directly would be
 * meaningless — parametric distance is not distance, which is the whole reason the step
 * is metric — so the parametric separation is pushed back through the first fundamental
 * form. Seams are unwrapped first, or an agent either side of one would read as being a
 * whole domain away.
 *
 * @param {object} a - First agent, whose tangent frame is used.
 * @param {object} b - Second agent.
 * @param {object} inst - The shader mesh instance, for the domain bounds.
 * @param {object} domain - Closure flags.
 * @returns {number} Approximate distance along the surface, in world units.
 */
function gameSurfaceSeparation(a, b, inst, domain) {
	const rangeU = inst.max_u - inst.min_u;
	const rangeV = inst.max_v - inst.min_v;

	// Bring b into the copy of the domain nearest a. Across a *twisted* seam that costs
	// more than a shift: the two edges are identified with the other parameter reversed,
	// so an odd number of laps has to mirror it too — the same identification
	// `agentMapIndex` applies when it builds a patch straddling the seam. Without this,
	// two agents standing next to each other either side of a Moebius seam measure as a
	// whole domain apart, and a shot across the seam would never connect.
	let bu = b.u, bv = b.v;
	if ((domain.closedU || domain.twistedU) && rangeU > 0) {
		const laps = Math.round((bu - a.u) / rangeU);
		bu -= laps * rangeU;
		if (domain.twistedU && (laps % 2 !== 0)) bv = inst.min_v + inst.max_v - bv;
	}
	if ((domain.closedV || domain.twistedV) && rangeV > 0) {
		const laps = Math.round((bv - a.v) / rangeV);
		bv -= laps * rangeV;
		if (domain.twistedV && (laps % 2 !== 0)) bu = inst.min_u + inst.max_u - bu;
	}

	_gSep.copyFrom(a.worldTu).scaleInPlace(bu - a.u)
	     .addInPlace(_gAim.copyFrom(a.worldTv).scaleInPlace(bv - a.v));
	return _gSep.length();
}

/**
 * Squared distance from a point to the segment a bullet covered this frame.
 *
 * A bullet is not where it is, it is everywhere it has been since the last frame. Testing
 * only its current position makes hits a lottery the moment its step exceeds its own hit
 * radius — and the step is proportional to the frame time, so the same shot that connects
 * at 60 Hz passes straight through at 15. Measured on a sphere before this: 50 shots at a
 * stationary enemy five body heights away landed 49, 50 and 50 hits at 60, 30 and 20 fps,
 * and **zero** at 15 and 10, where the step reaches 1.44 body heights against a reach of
 * 0.67. The target's own motion is ignored: it moves at walking pace against a projectile,
 * so the bullet's sweep carries the whole error.
 *
 * @param {object} bullet - Agent whose previous and current positions bound the segment.
 * @param {BABYLON.Vector3} point - Centre of the target.
 * @returns {number} Squared distance from `point` to the segment.
 */
function gameSweptDistanceSq(bullet, point) {
	_gSeg.copyFrom(bullet.worldPos).subtractInPlace(bullet.prevWorldPos);
	const len2 = _gSeg.lengthSquared();
	_gRel.copyFrom(point).subtractInPlace(bullet.prevWorldPos);

	if (!(len2 > 1e-16)) return _gRel.lengthSquared();

	let t = BABYLON.Vector3.Dot(_gRel, _gSeg) / len2;
	t = t < 0 ? 0 : (t > 1 ? 1 : t);
	_gRel.subtractInPlace(_gSeg.scaleInPlace(t));
	return _gRel.lengthSquared();
}

/**
 * Resolves bullet hits.
 *
 * A flat O(n²) sweep in **world space**: every agent's world position is already exact
 * for this frame, and at a few hundred entities the sweep is a rounding error next to the
 * probe. Nothing smarter is justified until it is.
 *
 * @param {object} info - Result of `walkMeshInfo()`.
 * @param {object} domain - Closure flags.
 */
function gameCollide(info, domain) {
	const all = agentsAll();

	for (let i = 0; i < all.length; i++) {
		const b = all[i];
		if (!b.alive || b.kind !== 'bullet' || !b.frameReady) continue;

		for (let j = 0; j < all.length; j++) {
			const t = all[j];
			if (t === b || !t.alive || !t.frameReady) continue;
			if (t.kind === 'bullet') continue;          // bullets pass through each other
			if (t === b.owner || t.team === b.team) continue;

			const reach = b.radius + t.radius;
			if (gameSweptDistanceSq(b, t.worldPos) > reach * reach) continue;

			// Close in space — but on a self-intersecting form that is not enough.
			if (!GAME.hitAcrossSheets && info) {
				const along = gameSurfaceSeparation(t, b, info.inst, domain);
				// The separation is read at where the bullet ended the frame, which is up
				// to a whole step past the target it just went through: at 15 fps that
				// overshoot was 1.44 body heights against a 2.01 tolerance, and the gate
				// vetoed hits the swept test had correctly found. Widening the tolerance by
				// the step keeps the veto honest — a genuine other sheet measures tens of
				// body heights away (37.7 on a Klein bottle), so a stride of slack costs it
				// nothing.
				const stride = BABYLON.Vector3.Distance(b.worldPos, b.prevWorldPos);
				if (along > reach * GAME.SHEET_TOLERANCE + stride) continue;
			}

			b.alive = false;
			_game.hits++;
			if (t === glo.walk) {
				_game.playerHits++;
				if (_game.grace > 0) break;      // just respawned: the hit does not count
			}
			if (t.health !== undefined) {
				t.health -= 1;
				// The player must never be dropped from the population — the camera hangs
				// off it — so death is a callback rather than a flag for anyone who has one.
				if (t.health <= 0) {
					if (t.onDeath) t.onDeath(t);
					else t.alive = false;
				}
			}
			if (t.onHit) t.onHit(t, b);
			break;
		}
	}
}

/**
 * Per-frame game update: runs the cooldown and rewrites the marker instances.
 *
 * Called from `walkUpdate` after the population has stepped, so every agent's world pose
 * is already exact for this frame and the markers cannot lag behind the physics.
 *
 * @param {number} dt - Timestep in seconds.
 */
function gameUpdate(dt, info, domain) {
	if (_game.cooldown > 0) _game.cooldown = Math.max(0, _game.cooldown - dt);

	// The player's hit radius is a game property, so it is set here rather than in the
	// walk mode, and re-derived each frame because the body scale follows the mesh.
	glo.walk.radius = (glo.walk.baseEye || 1) * GAME.BODY_RADIUS;

	gameCollide(info, domain);
	gameRules(dt);
	gameShowHud();

	const solid = _game.markers, ghost = _game.ghosts;
	if (!solid) return;

	// Where the markers must face. Read once per frame, not per entity.
	const eye = cameraWorldPosition();

	const all = agentsAll();
	let n = 0;
	for (let i = 0; i < all.length; i++) {
		const a = all[i];
		if (a.alive && a.frameReady && a.kind !== 'player') n++;
	}
	if (n > _game.capacity) _gameGrowMarkers(Math.max(n, _game.capacity * 2));

	const P = _game.positions, C = _game.colors, G = _game.ghostColors;
	let k = 0;
	for (let i = 0; i < all.length; i++) {
		const a = all[i];
		if (!a.alive || !a.frameReady || a.kind === 'player') continue;

		const size = a.markerSize || (a.baseEye || 1) * GAME.MARKER_SIZE;

		// Basis: the triangle's plane is built perpendicular to the line of sight, with its
		// local up as close to the surface normal as that allows. It therefore always
		// presents its full face, while still reading as standing on the ground.
		//
		// Two weaker constructions were tried and measured first, and both have a blind
		// angle. Lying the marker flat in the tangent plane fails on low curvature: the eye
		// is about one body height up, so a flat marker at distance d is seen at atan(h/d)
		// and its projected area falls off as h/d^3 rather than 1/d^2 — on a plane,
		// |face . view| measured 0.67 at 1.5 body heights, 0.36 at 2.7 and 0 at 22.
		// Standing it upright and turning it about the normal fixes that, but then it goes
		// edge-on wherever the surface itself faces the viewer, which on a torus is most of
		// the far side. Only decoupling the marker's plane from the surface removes both.
		_gFwd.copyFrom(eye).subtractInPlace(a.worldPos);
		if (_gFwd.lengthSquared() < 1e-16) continue;
		_gFwd.normalize();

		BABYLON.Vector3.CrossToRef(a.up, _gFwd, _gRight);
		if (_gRight.lengthSquared() < 1e-12) {
			// Looking straight down the surface normal: any axis across the view will do.
			BABYLON.Vector3.CrossToRef(a.heading, _gFwd, _gRight);
			if (_gRight.lengthSquared() < 1e-12) {
				BABYLON.Vector3.CrossToRef(a.worldTu, _gFwd, _gRight);
				if (_gRight.lengthSquared() < 1e-12) continue;
			}
		}
		_gRight.normalize();
		BABYLON.Vector3.CrossToRef(_gFwd, _gRight, _gUp);
		_gUp.normalize();

		// Lifted along the *surface* normal, not the marker's own up: how high an agent is
		// off the ground is a fact about the surface, not about where the camera happens
		// to be. Everything hovers, walkers included — see MARKER_HOVER for why feet
		// planted exactly on the ground make occlusion undecidable.
		const lift = a.height + size * GAME.MARKER_HOVER;
		_gPos.copyFrom(a.worldPos);
		if (lift !== 0) _gPos.addInPlace(_gAim.copyFrom(a.up).scaleInPlace(lift));

		// Three world-space vertices: base corners across the view, apex up.
		const o = k * 9, hw = 0.45 * size;
		P[o    ] = _gPos.x - _gRight.x * hw; P[o + 1] = _gPos.y - _gRight.y * hw; P[o + 2] = _gPos.z - _gRight.z * hw;
		P[o + 3] = _gPos.x + _gRight.x * hw; P[o + 4] = _gPos.y + _gRight.y * hw; P[o + 5] = _gPos.z + _gRight.z * hw;
		P[o + 6] = _gPos.x + _gUp.x * size;  P[o + 7] = _gPos.y + _gUp.y * size;  P[o + 8] = _gPos.z + _gUp.z * size;

		const col = GAME.COLORS[a.kind] || GAME.COLORS.bullet;
		const hid = GAME.HIDDEN_COLORS[a.kind] || GAME.HIDDEN_COLORS.bullet || col;
		for (let v = 0; v < 3; v++) {
			const c = k * 12 + v * 4;
			C[c] = col[0]; C[c + 1] = col[1]; C[c + 2] = col[2]; C[c + 3] = col[3];
			G[c] = hid[0]; G[c + 1] = hid[1]; G[c + 2] = hid[2]; G[c + 3] = hid[3];
		}
		k++;
	}

	// Everything past the live count collapses to a point and rasterizes nothing, which is
	// what keeps the index buffer static and this update allocation-free.
	if (k < _game.capacity) P.fill(0, k * 9);

	for (const [layer, colors] of [[solid, C], [ghost, G]]) {
		if (!layer) continue;
		layer.updateVerticesData(BABYLON.VertexBuffer.PositionKind, P);
		layer.updateVerticesData(BABYLON.VertexBuffer.ColorKind, colors);
		layer.setEnabled(k > 0);
	}
}

// ==================== RULES ====================

/**
 * Starts a match.
 *
 * The rules are a mode *inside* walk mode rather than a mode of their own: with them off
 * the walk is exactly the walk, which is what keeps the surface explorer an explorer and
 * makes the game additive. Only the population and this flag change.
 *
 * @returns {boolean} `true` if a match started.
 */
function gameStart() {
	if (glo.cameraMode !== 'walk') return false;
	gameClear();
	_game.active = true;
	_game.score = 0;
	_game.wave = 0;
	_game.deaths = 0;
	_game.waveTimer = 0.5;
	_game.grace = GAME.RESPAWN_GRACE;

	const w = glo.walk;
	w.health = GAME.PLAYER_HEALTH;
	w.onDeath = gamePlayerDied;
	walkShowHud();
	return true;
}

/** Ends the match and clears the field, leaving the player walking. */
function gameStop() {
	_game.active = false;
	gameHideHud();
	gameClear();
	const w = glo.walk;
	delete w.health;
	w.onDeath = null;
	walkShowHud();
}

/** Toggles the match. @returns {boolean} Whether a match is now running. */
function gameToggle() {
	if (_game.active) gameStop(); else gameStart();
	return _game.active;
}

/**
 * The player ran out of health: reset it, move it somewhere else on the surface and give
 * it a moment of immunity. It is never removed from the population — the camera hangs off
 * it, and an agent that stops stepping takes the view with it.
 * @param {object} p - The player agent.
 */
function gamePlayerDied(p) {
	const info = walkMeshInfo();
	_game.deaths++;
	p.health = GAME.PLAYER_HEALTH;
	p.height = 0;
	p.vSpeed = 0;
	_game.grace = GAME.RESPAWN_GRACE;

	if (info) {
		const inst = info.inst;
		p.u = inst.min_u + (inst.max_u - inst.min_u) * Math.random();
		p.v = inst.min_v + (inst.max_v - inst.min_v) * Math.random();
		// A new place means a new tangent plane: let the next step re-establish the frame
		// rather than carrying the old one across a teleport.
		p.frameReady = false;
	}
}

/**
 * Runs the match clock: waves in, waves cleared, score.
 * @param {number} dt - Timestep in seconds.
 */
function gameRules(dt) {
	if (!_game.active) return;
	if (_game.grace > 0) _game.grace = Math.max(0, _game.grace - dt);

	const info = walkMeshInfo();
	if (!info) return;
	const w = glo.walk;

	// A rebuild left the wave stranded on a metric that no longer applies. Wait for the
	// player's frame to come back, then put the survivors back on a proper ring.
	if (_game.replaceWave && w.frameReady) {
		_game.replaceWave = false;
		const foes = agentsAll().filter(a => a.kind === 'enemy' && a.alive);
		foes.forEach((e, k) => {
			gameRingPlace(w, k, foes.length, _gStep);
			e.u = w.u + _gStep.du;
			e.v = w.v + _gStep.dv;
			e.height = 0;
			e.vSpeed = 0;
			e.baseEye = w.baseEye;
			e.eyeHeight = w.baseEye;
			e.markerSize = w.baseEye * GAME.MARKER_SIZE;
			e.moveSpeed = w.baseEye * GAME.ENEMY_SPEED;
			e.gravity = w.gravity;
			e.jumpSpeed = w.jumpSpeed;
			e.radius = w.baseEye * GAME.BODY_RADIUS;
			e.flip = w.flip;
			e.frameReady = false;   // new geometry: re-establish the frame from scratch
		});
	}

	// Anything registered as an enemy and no longer alive was killed this frame — the
	// population reaps it, so counting survivors is enough to notice.
	let alive = 0;
	const all = agentsAll();
	for (let i = 0; i < all.length; i++) if (all[i].kind === 'enemy' && all[i].alive) alive++;

	if (alive < _game.enemiesInWave) {
		_game.score += _game.enemiesInWave - alive;
		_game.enemiesInWave = alive;
		walkShowHud();
	}

	if (alive > 0) return;
	if (_game.waveTimer === 0) { _game.waveTimer = GAME.WAVE_PAUSE; return; }

	_game.waveTimer -= dt;
	if (_game.waveTimer > 0) return;

	_game.wave++;
	_game.waveTimer = 0;
	const n = GAME.WAVE_SIZE + (_game.wave - 1) * GAME.WAVE_GROWTH;
	for (let k = 0; k < n; k++) {
		gameRingPlace(w, k, n, _gStep);
		gameSpawnEnemy(w.u + _gStep.du, w.v + _gStep.dv, w);
	}
	_game.enemiesInWave = n;
	walkShowHud();
}

/**
 * Parametric offset from `ref` to slot `k` of `n` on a ring of real radius around it.
 *
 * The ring is laid out in the tangent plane and pushed back through the local metric, so
 * the slots land a fixed *distance* away whatever the parameterization is doing. A
 * parametric radius would be meaningless: the same offset spans two body heights on one
 * form and two hundred on another.
 *
 * Slot 0 sits dead ahead. A wave that announces itself somewhere in front reads as an
 * arrival; scattered blindly around, most of it starts behind you.
 *
 * @param {object} ref - Agent at the centre of the ring, already stepped this frame.
 * @param {number} k - Slot index.
 * @param {number} n - Slots on the ring.
 * @param {{du: number, dv: number}} out - Receives the parametric offset.
 */
function gameRingPlace(ref, k, n, out) {
	out.du = 0;
	out.dv = 0;

	const radius = (ref.baseEye || 1) * GAME.SPAWN_DISTANCE;

	// Forward, and the tangent axis across it: an orthonormal pair on the surface.
	const e1 = _gAim.copyFrom(ref.heading);
	walkTangentialize(e1, ref.up, ref.worldTu);
	const e2 = BABYLON.Vector3.Cross(ref.up, e1);

	// Spread the slots about straight ahead rather than starting at it, so an odd count
	// still puts one squarely in view.
	const ang = n > 1 ? ((k / n) - 0.5 + 0.5 / n) * 2 * Math.PI : 0;
	_gSep.copyFrom(e1).scaleInPlace(Math.cos(ang) * radius)
	     .addInPlace(e2.scale(Math.sin(ang) * radius));

	// A degenerate metric under the player leaves the offset at zero, which drops the slot
	// on top of it — still better than not placing it at all.
	agentWorldToParam(ref, _gSep, out);
}

/**
 * Re-places the live entities after the mesh has been rebuilt.
 *
 * Entities keep their (u, v) across a rebuild, and on a new form that is meaningless: the
 * metric changes wholesale, so the ring a wave was spawned on collapses or explodes.
 * Measured switching a running match from a torus to a plane, the u domain goes from 6.28
 * to 37.7 and the enemies fall from 9-13 body heights away to 2-3 — on top of the player,
 * mostly out of frame, while the HUD still counts them. That reads exactly like the
 * entities having vanished.
 *
 * Bullets are dropped rather than re-placed: a projectile's whole state is a trajectory
 * across geometry that no longer exists.
 */
function gameOnSurfaceRebuilt() {
	const all = agentsAll();
	for (let i = all.length - 1; i >= 0; i--) {
		if (all[i].kind === 'bullet') all[i].alive = false;
	}
	// Every trace point is a (u, v), and on new geometry those coordinates no longer
	// describe the same places. Keeping the lines would draw a path nobody walked.
	traceClear();
	// The player's frame is invalidated by the rebuild, so the ring cannot be laid out
	// until it has stepped again. Defer to the next gameRules.
	if (_game.active) _game.replaceWave = true;
}

/**
 * Renders the match state. A separate overlay from the walk HUD because it changes every
 * frame while the walk HUD only changes on a keypress.
 */
function gameShowHud() {
	if (!_game.active || glo.walkCinema.active) { gameHideHud(); return; }
	let hud = getById('gameHud');
	if (!hud) {
		hud = document.createElement('div');
		hud.id = 'gameHud';
		hud.style.cssText = [
			'position:absolute', 'left:50%', 'bottom:64px', 'transform:translateX(-50%)',
			'z-index:41', 'pointer-events:none', 'padding:6px 16px',
			'font:14px/1.5 monospace', 'color:#e6ebf6', 'text-align:center',
			'background:rgba(12,16,26,.72)', 'border:1px solid rgba(230,235,246,.2)',
			'border-radius:7px', 'white-space:nowrap'
		].join(';');
		walkOverlayHost().appendChild(hud);
	}

	const w = glo.walk;
	const hp = Math.max(0, w.health || 0);
	const bar = '█'.repeat(hp) + '░'.repeat(Math.max(0, GAME.PLAYER_HEALTH - hp));
	const enemies = agentsAll().filter(a => a.kind === 'enemy' && a.alive).length;
	hud.innerHTML =
		`HP <span style="color:${hp > 3 ? '#7fd8a0' : '#f2777a'}">${bar}</span>` +
		` &nbsp;·&nbsp; wave <b>${_game.wave}</b> &nbsp;·&nbsp; enemies <b>${enemies}</b>` +
		` &nbsp;·&nbsp; score <b>${_game.score}</b>` +
		(_game.deaths ? ` &nbsp;·&nbsp; deaths ${_game.deaths}` : '') +
		(_game.grace > 0 ? ` &nbsp;·&nbsp; <i>immune ${_game.grace.toFixed(1)}s</i>` : '');
	hud.style.display = 'block';
}

/** Hides the match overlay. */
function gameHideHud() {
	const hud = getById('gameHud');
	if (hud) hud.style.display = 'none';
}

/**
 * Drops every game entity, leaving the player alone. Used when leaving walk mode, and
 * whenever the surface is rebuilt under everyone's feet.
 */
function gameClear() {
	const all = agentsAll();
	for (let i = all.length - 1; i >= 0; i--) {
		if (all[i].kind === 'player') continue;
		// Drop the line with the entity. Unregistering alone would leave a trace following
		// an agent that is no longer stepped: frozen in place and never expiring, since a
		// point is only retired by age and a stationary agent lays down no new ones.
		traceDetach(all[i]);
		agentsUnregister(all[i]);
	}
	_game.cooldown = 0;
	_game.hits = 0;
	_game.playerHits = 0;
	_game.enemiesInWave = 0;
	_game.waveTimer = 0;
	_game.replaceWave = false;
	if (_game.markers) _game.markers.setEnabled(false);
	if (_game.ghosts) _game.ghosts.setEnabled(false);
}

// ==================== WIRING ====================

// Firing is a click while the pointer is locked, which is what a shooter's hand expects.
// The first click on the canvas is what *acquires* the lock, so it must not also fire —
// hence the lock test rather than a plain mousedown.
document.addEventListener('mousedown', (e) => {
	if (glo.cameraMode !== 'walk' || e.button !== 0) return;
	if (document.pointerLockElement !== glo.canvas) return;
	gameFirePlayer();
	e.preventDefault();
});