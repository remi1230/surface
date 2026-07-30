//*****************************************************************************************************//
//****************************************** SURFACE AGENTS *******************************************//
//*****************************************************************************************************//
//
// The shared substrate for everything that moves on the mesh: the walking character, and
// later the bullets, the enemies and anything else with a position on the surface.
//
// An agent is a point living in parametric space (u, v) with a world-space heading kept
// tangent to the surface, a height above it and a vertical speed. One integrator moves
// them all, so a bullet is a walker that happens to be fast and to disappear on contact —
// and, because the heading is a world direction re-projected onto the tangent plane every
// frame (discrete parallel transport), "straight ahead" means a geodesic for all of them.
//
// The one thing that shapes this file is a measurement from the walk mode: the GPU probe
// costs the same for 4 points as for 144 (see docs/vue-premiere-personne.md §12) — the
// whole cost is the getBufferSubData round trip, not the vertices. Evaluating the surface
// per agent would therefore cost one probe call per agent, which at seventy agents is
// ~48 ms a frame. So the step is split in three: every agent writes its sample indices
// into one shared buffer, a single probe call runs for all of them, and each agent then
// reads its own slice back. One call per frame, whatever the population.
//

/** Tunables shared by every surface agent. */
const AGENT = {
	/** Samples per agent: 4×4 for a C1 patch, 2×2 for a cheap one. */
	PATCH_BICUBIC: 16,
	PATCH_BILINEAR: 4,
	/**
	 * Samples the shared index buffer starts out able to hold. It grows on demand; the
	 * probe's own buffers grow with it (`_allocProbeBuffers`), so nothing needs sizing
	 * up front.
	 */
	INITIAL_CAPACITY: 256,

	// Defaults for a new agent. Deliberately spelled out here rather than read from
	// `WALK`: this file is the substrate and must not depend on the walk mode, which is
	// only one of its clients. The player passes its own `WALK` values explicitly.
	/** Time constant (s) of the normal's low-pass filter. */
	SMOOTH_TAU: 0.09,
	/** Per-frame displacement ceiling, in grid cells. */
	MAX_CELLS: 0.5,
	/** Turn rate (rad/s) applied to `input.turn`. */
	TURN_SPEED: 1.5,
};

/** Live agents, in step order. Agent 0 is the player when walk mode is running. */
const _agents = [];

/**
 * Extra samplers riding the same probe call.
 *
 * The probe costs the same for four points as for a hundred and forty-four, so anything
 * that needs to know where a parametric position lands in the world should travel in the
 * one call the step already makes rather than open its own. A sampler is a pair of hooks:
 * `gather(ctx, out, offset)` writes integer grid indices and returns how many it wrote,
 * `resolve(ctx, offset)` reads its own slice back once the probe has run.
 *
 * @type {Array<{gather: Function, resolve: Function}>}
 */
const _agSamplers = [];

/** Flat (i, j) pairs for the whole population — the single probe call's input. */
let _agentIdx = new Float32Array(AGENT.INITIAL_CAPACITY * 2);

// Scratch, allocated once: the step must not churn the GC. Agents are resolved one after
// another, so a single set of patch buffers is enough for the whole population.
const _agPatch = Array.from({ length: 16 }, () => new BABYLON.Vector3());
const _agRow   = Array.from({ length: 4 },  () => new BABYLON.Vector3());
const _agRowD  = Array.from({ length: 4 },  () => new BABYLON.Vector3());
const _agFrame = {
	position: new BABYLON.Vector3(),
	tangentU: new BABYLON.Vector3(),
	tangentV: new BABYLON.Vector3(),
	normal:   new BABYLON.Vector3(),
	valid:    false
};
const _agIdxPair = [0, 0];
const _agA = new BABYLON.Vector3();
const _agB = new BABYLON.Vector3();
const _agC = new BABYLON.Vector3();
const _agRaw = new BABYLON.Vector3();

/** Per-step context, rebuilt once per frame and shared by every agent. */
const _agCtx = {
	/** @type {object|null} Result of `walkMeshInfo()`. */
	info: null,
	/** @type {BABYLON.Matrix|null} The mesh's world matrix. */
	world: null,
	/**
	 * @type {object|null} Domain closure flags, measured once on the real geometry by
	 * `walkSurveySurface()`. A property of the surface rather than of any agent; it lives
	 * on `glo.walk` for historical reasons and is passed explicitly from there so this
	 * file never has to reach for the player.
	 */
	domain: null,
	/** @type {object|null} The frame's probe result, shared by every agent. */
	probe: null
};

/**
 * Gives an object the fields a surface agent needs, leaving anything already set alone.
 *
 * Augments rather than constructs so `glo.walk` — which predates this file and is
 * referenced by name throughout the walk, cinema and mini-map code — can become agent 0
 * without being replaced by a new object.
 *
 * @param {object} a - Object to turn into an agent (a fresh `{}` for a new entity).
 * @param {object} [opts={}] - Overrides for any of the fields below.
 * @returns {object} The same object, now a valid agent.
 */
function agentInit(a, opts = {}) {
	/** Parametric position. Never grid indices: changing the resolution must not teleport. */
	if (a.u === undefined) a.u = 0;
	if (a.v === undefined) a.v = 0;
	/** World-space heading, re-projected onto the tangent plane every frame. */
	if (!a.heading) a.heading = new BABYLON.Vector3(1, 0, 0);
	/** Low-pass filtered world normal — the axis the agent stands on. */
	if (!a.smoothNormal) a.smoothNormal = new BABYLON.Vector3(0, 1, 0);
	/** `+1` on the outside of the surface, `-1` on the inside. */
	if (a.flip === undefined) a.flip = 1;
	/** Height above the surface along the normal, and its rate of change. */
	if (a.height === undefined) a.height = 0;
	if (a.vSpeed === undefined) a.vSpeed = 0;
	/** Pending yaw to fold into the heading (mouse look, an AI's turn request). */
	if (a.viewYaw === undefined) a.viewYaw = 0;
	/** False until a valid surface frame has been sampled at least once. */
	if (a.frameReady === undefined) a.frameReady = false;

	/**
	 * Samples per frame. 'bicubic' buys C1 continuity of the tangent frame, which only
	 * matters for an agent carrying a camera: the jolt it removes is a camera artefact
	 * (docs/vue-premiere-personne.md §13). Anything else can take 'bilinear' and cost a
	 * quarter as many samples.
	 */
	a.patch = opts.patch || a.patch || 'bicubic';
	/**
	 * What happens when the agent reaches the surface. 'stick' lands and stays (a
	 * walker), 'bounce' rebounds, 'despawn' reports an impact and dies (a bullet).
	 */
	a.ground = opts.ground || a.ground || 'stick';
	/** Fraction of the vertical speed kept by a bounce. */
	a.restitution = opts.restitution !== undefined ? opts.restitution : (a.restitution ?? 0.4);
	/**
	 * Time constant (s) of the normal's low-pass filter; 0 follows the raw geometry. The
	 * filter exists for camera comfort, so anything without a camera should skip it —
	 * cheaper, and closer to the surface it is actually on.
	 */
	a.smoothTau = opts.smoothTau !== undefined ? opts.smoothTau : (a.smoothTau ?? AGENT.SMOOTH_TAU);
	/**
	 * Per-frame displacement ceiling in grid cells. The patch is only sampled around the
	 * agent's own cell, so a step larger than this leaves the sampled neighbourhood. Half
	 * a cell never binds at walking speed; a projectile needs more, and a bilinear agent
	 * can take a whole cell since its patch spans one either side.
	 */
	a.maxCells = opts.maxCells !== undefined ? opts.maxCells : (a.maxCells ?? AGENT.MAX_CELLS);

	/** World units per second along the surface. Set per frame by the owner. */
	a.moveSpeed = opts.moveSpeed !== undefined ? opts.moveSpeed : (a.moveSpeed ?? 1);
	/** Turn rate (rad/s) applied to `input.turn`. */
	a.turnSpeed = opts.turnSpeed !== undefined ? opts.turnSpeed : (a.turnSpeed ?? AGENT.TURN_SPEED);
	/** Downward acceleration along the normal, in world units per second squared. */
	a.gravity = opts.gravity !== undefined ? opts.gravity : (a.gravity ?? 0);
	/** Vertical speed given by a jump request. */
	a.jumpSpeed = opts.jumpSpeed !== undefined ? opts.jumpSpeed : (a.jumpSpeed ?? 0);

	/** Collision radius in world units, and the tags collision will sort on. */
	a.radius = opts.radius !== undefined ? opts.radius : (a.radius ?? 0);
	a.kind = opts.kind || a.kind || 'agent';
	a.team = opts.team !== undefined ? opts.team : (a.team ?? 0);
	a.owner = opts.owner !== undefined ? opts.owner : (a.owner ?? null);
	/** Seconds left to live; `Infinity` never expires. */
	a.ttl = opts.ttl !== undefined ? opts.ttl : (a.ttl ?? Infinity);
	a.alive = a.alive !== undefined ? a.alive : true;
	/** `false` keeps the agent registered even once dead — the player is never reaped. */
	a.reap = opts.reap !== undefined ? opts.reap : (a.reap ?? true);

	/** Locomotion request for the coming step, filled by keys, by an AI, or by nothing. */
	if (!a.input) a.input = { forward: 0, turn: 0, strafe: 0, jump: false };
	// `glo.walk` is augmented in place and may predate the field.
	if (a.input.strafe === undefined) a.input.strafe = 0;

	/** Filled by every step: the agent's world pose and the local tangent basis. */
	if (!a.worldPos) a.worldPos = new BABYLON.Vector3();
	/**
	 * Where the agent was at the end of the previous step.
	 *
	 * A fast agent does not occupy the points between two frames, it jumps them, so
	 * anything testing proximity has to test the *segment* rather than the endpoint. At a
	 * low frame rate a bullet's step is several times its own hit radius and a
	 * point-to-point test misses every time.
	 */
	if (!a.prevWorldPos) a.prevWorldPos = new BABYLON.Vector3();
	/**
	 * Where the agent actually is: its ground point lifted along the normal by `height`.
	 *
	 * `worldPos` is the point on the surface underneath the agent, which is not where the
	 * agent is whenever it jumps or flies. Anything measuring a real distance between two
	 * agents wants this one — a bullet passing overhead is only overhead in `hitPos`.
	 */
	if (!a.hitPos) a.hitPos = new BABYLON.Vector3();
	/** The previous step's `hitPos`, bounding the segment the agent swept. */
	if (!a.prevHitPos) a.prevHitPos = new BABYLON.Vector3();
	if (!a.worldTu) a.worldTu = new BABYLON.Vector3();
	if (!a.worldTv) a.worldTv = new BABYLON.Vector3();
	if (!a.up) a.up = new BABYLON.Vector3(0, 1, 0);
	/** Set by the step when the agent met the surface, for the owner to react to. */
	if (a.hitGround === undefined) a.hitGround = false;
	/** Set by the step when the agent was turned back at an open edge of the domain. */
	if (a.hitEdge === undefined) a.hitEdge = false;
	/**
	 * Set by the step when `maxCells` throttled the requested displacement. Where the
	 * parameterization degenerates — the poles of a sphere — a world-speed step asks for
	 * a huge parametric one, and the ceiling turns it down.
	 */
	if (a.clamped === undefined) a.clamped = false;
	/**
	 * Set by the step when the first fundamental form was too degenerate to invert and
	 * the agent could not be moved at all. Right at a pole the tangent plane collapses
	 * and there is no parametric step that means "one world unit forward". Distinct from
	 * `clamped`: that one moved less than asked, this one did not move.
	 */
	if (a.stalled === undefined) a.stalled = false;
	/** `true` once the agent has been resolved and integrated this frame. */
	if (a._stepped === undefined) a._stepped = false;

	/** Callback invoked on ground contact, after the policy has been applied. */
	a.onGround = opts.onGround || a.onGround || null;

	// Where this agent's samples sit in the shared probe buffer, and where it sits inside
	// its own cell. Written by the gather phase, read by the resolve phase.
	a._offset = 0;
	a._count = 0;
	a._fu = 0;
	a._fv = 0;

	return a;
}

/**
 * Creates a new agent.
 * @param {object} [opts={}] - Field overrides, see {@link agentInit}.
 * @returns {object} The agent, not yet registered.
 */
function createSurfaceAgent(opts = {}) {
	return agentInit({}, opts);
}

/**
 * Adds an agent to the stepped population, if it is not already in it.
 * @param {object} agent - The agent to register.
 * @returns {object} The same agent.
 */
function agentsRegister(agent) {
	if (_agents.indexOf(agent) === -1) _agents.push(agent);
	return agent;
}

/**
 * Removes an agent from the stepped population.
 * @param {object} agent - The agent to drop.
 */
function agentsUnregister(agent) {
	const i = _agents.indexOf(agent);
	if (i !== -1) _agents.splice(i, 1);
}

/**
 * Empties the population.
 * @param {object} [keep=null] - An agent to leave registered (the player, typically).
 */
function agentsClear(keep = null) {
	for (let i = _agents.length - 1; i >= 0; i--) {
		if (_agents[i] !== keep) _agents.splice(i, 1);
	}
}

/** @returns {object[]} The live population. Do not mutate; use the register helpers. */
function agentsAll() { return _agents; }

/**
 * Registers a sampler to ride the step's probe call.
 * @param {{gather: Function, resolve: Function}} sampler - See {@link _agSamplers}.
 * @returns {object} The same sampler.
 */
function agentsAddSampler(sampler) {
	if (_agSamplers.indexOf(sampler) === -1) _agSamplers.push(sampler);
	return sampler;
}

/**
 * Interpolates a parametric position from a 2x2 block of probed corners.
 *
 * The block layout matches what {@link agentGatherCell} wrote: (i0,j0), (i0,j0+1),
 * (i0+1,j0), (i0+1,j0+1). Position only — a sampler that wants a frame should be an agent.
 *
 * @param {object} ctx - The step context.
 * @param {number} offset - Sample index the block starts at.
 * @param {number} fu - Fractional position across the cell along u.
 * @param {number} fv - Same along v.
 * @param {BABYLON.Vector3} out - Receives the object-space position.
 */
function agentResolveCell(ctx, offset, fu, fv, out) {
	const pos = ctx.probe.positions;
	for (let p = 0; p < 4; p++) {
		const s = (offset + p) * 3;
		_agPatch[p].set(pos[s], pos[s + 1], pos[s + 2]);
	}
	BABYLON.Vector3.LerpToRef(_agPatch[0], _agPatch[1], fv, _agRow[0]);
	BABYLON.Vector3.LerpToRef(_agPatch[2], _agPatch[3], fv, _agRow[1]);
	BABYLON.Vector3.LerpToRef(_agRow[0], _agRow[1], fu, out);
}

/**
 * Writes the four integer corners of the cell containing `(u, v)`.
 *
 * The companion to {@link agentResolveCell} for anything that needs a position without
 * being an agent. Seams are identified the same way the patch gather does them, so a
 * sample either side of a twisted seam still lands on the right vertices.
 *
 * @param {object} ctx - The step context.
 * @param {number} u - Parametric u.
 * @param {number} v - Parametric v.
 * @param {Float32Array} out - Shared index buffer.
 * @param {number} offset - Sample index to start writing at.
 * @param {{fu: number, fv: number}} frac - Receives the position within the cell.
 * @returns {number} Samples written, always 4.
 */
function agentGatherCell(ctx, u, v, out, offset, frac) {
	const inst = ctx.info.inst;
	const d = ctx.domain;

	const fi = inst.step_u !== 0 ? (u - inst.min_u) / inst.step_u : 0;
	const fj = inst.step_v !== 0 ? (v - inst.min_v) / inst.step_v : 0;

	let i0 = Math.floor(fi);
	let j0 = Math.floor(fj);
	if (!d.closedU) i0 = Math.min(Math.max(i0, 0), ctx.info.gridU - 1);
	if (!d.closedV) j0 = Math.min(Math.max(j0, 0), ctx.info.gridV - 1);
	frac.fu = fi - i0;
	frac.fv = fj - j0;

	let k = offset * 2;
	for (let a = 0; a < 2; a++) {
		for (let b = 0; b < 2; b++) {
			agentMapIndex(i0 + a, j0 + b, ctx, _agIdxPair);
			out[k++] = _agIdxPair[0];
			out[k++] = _agIdxPair[1];
		}
	}
	return 4;
}

/**
 * Samples an agent takes per step.
 * @param {object} agent - The agent.
 * @returns {number} 16 for a bicubic patch, 4 for a bilinear one.
 */
function agentPatchSize(agent) {
	return agent.patch === 'bilinear' ? AGENT.PATCH_BILINEAR : AGENT.PATCH_BICUBIC;
}

/**
 * Maps a raw, possibly out-of-range grid index pair onto a real vertex of the mesh.
 *
 * Off the edge of an open domain the index is clamped, which is the standard Catmull-Rom
 * end condition (a duplicated control point). Where the surface closes it wraps instead —
 * and across a *twisted* seam it wraps and comes back mirrored in the other parameter,
 * because that is how the two edges of a Möbius strip or a figure-8 Klein bottle are
 * actually identified. Getting this wrong tears the patch exactly where it has to be
 * smoothest.
 *
 * @param {number} rawI - Index along u, before wrapping.
 * @param {number} rawJ - Index along v, before wrapping.
 * @param {object} ctx - The step context.
 * @param {number[]} out - Receives `[i, j]`.
 */
function agentMapIndex(rawI, rawJ, ctx, out) {
	const gridU = ctx.info.gridU, gridV = ctx.info.gridV;
	const d = ctx.domain;
	let ii, jj, mirrorJ = false, mirrorI = false;

	if (d.closedU || d.twistedU) {
		const laps = Math.floor(rawI / gridU);
		ii = rawI - laps * gridU;
		if (d.twistedU && (((laps % 2) + 2) % 2) === 1) mirrorJ = true;
	} else {
		ii = Math.min(Math.max(rawI, 0), gridU);
	}

	if (d.closedV || d.twistedV) {
		const laps = Math.floor(rawJ / gridV);
		jj = rawJ - laps * gridV;
		if (d.twistedV && (((laps % 2) + 2) % 2) === 1) mirrorI = true;
	} else {
		jj = Math.min(Math.max(rawJ, 0), gridV);
	}

	if (mirrorJ) jj = gridV - jj;
	if (mirrorI) ii = gridU - ii;

	out[0] = ii;
	out[1] = jj;
}

/**
 * Writes an agent's sample indices into the shared buffer and records where it landed.
 *
 * Only integer indices are ever emitted. `computePosition` derives `d`/`k`/`p`/`w` from
 * `mod(i, 2.0)`, which is meaningless between vertices, so a fractional probe would drift
 * off the rendered geometry for any equation using those variables. Interpolating between
 * real vertices instead is correct for every equation, geometry-editor GLSL included.
 *
 * @param {object} agent - The agent to gather for.
 * @param {object} ctx - The step context.
 * @param {Float32Array} out - Shared index buffer.
 * @param {number} offset - Sample index to start writing at.
 * @returns {number} Samples written.
 */
function agentGather(agent, ctx, out, offset) {
	const inst = ctx.info.inst;
	const gridU = ctx.info.gridU, gridV = ctx.info.gridV;
	const d = ctx.domain;
	const bicubic = agent.patch !== 'bilinear';

	const fi = inst.step_u !== 0 ? (agent.u - inst.min_u) / inst.step_u : 0;
	const fj = inst.step_v !== 0 ? (agent.v - inst.min_v) / inst.step_v : 0;

	// Cell origin, kept inside the grid so the far corners always exist.
	let i0 = Math.floor(fi);
	let j0 = Math.floor(fj);
	if (!d.closedU) i0 = Math.min(Math.max(i0, 0), gridU - 1);
	if (!d.closedV) j0 = Math.min(Math.max(j0, 0), gridV - 1);
	agent._fu = fi - i0;
	agent._fv = fj - j0;
	agent._offset = offset;

	// Bicubic takes the 4×4 block starting one cell back; bilinear takes the 2×2 corners.
	const n = bicubic ? 4 : 2;
	const base = bicubic ? -1 : 0;
	let k = offset * 2;
	for (let a = 0; a < n; a++) {
		for (let b = 0; b < n; b++) {
			agentMapIndex(i0 + base + a, j0 + base + b, ctx, _agIdxPair);
			out[k++] = _agIdxPair[0];
			out[k++] = _agIdxPair[1];
		}
	}

	agent._count = n * n;
	return agent._count;
}

/**
 * Rebuilds an agent's local surface frame from its slice of the probe result, in **object
 * space**.
 *
 * A bicubic Catmull-Rom patch passes exactly through the sampled vertices while keeping
 * its derivative continuous across cell boundaries, so the tangent frame — and any camera
 * riding it — stays smooth all the way across the surface. Bilinear is C0: its derivative
 * jumps at every boundary, which is invisible on a projectile and unacceptable on a
 * viewpoint.
 *
 * @param {object} agent - The agent to resolve.
 * @param {object} ctx - The step context.
 * @returns {object} `_agFrame`, reused between calls; check `.valid`.
 */
function agentResolveFrame(agent, ctx) {
	const inst = ctx.info.inst;
	const pos = ctx.probe.positions;
	const bicubic = agent.patch !== 'bilinear';
	const n = bicubic ? 4 : 2;
	const fu = agent._fu, fv = agent._fv;

	_agFrame.valid = false;

	for (let p = 0; p < n * n; p++) {
		const s = (agent._offset + p) * 3;
		_agPatch[p].set(pos[s], pos[s + 1], pos[s + 2]);
	}

	if (bicubic) {
		// Interpolate each row along j keeping the derivative, then the four row results
		// along i. Position, ∂/∂i and ∂/∂j all fall out of the same tensor pass.
		for (let a = 0; a < 4; a++) {
			walkCatmullRom(_agPatch[a * 4], _agPatch[a * 4 + 1], _agPatch[a * 4 + 2],
				_agPatch[a * 4 + 3], fv, _agRow[a], _agRowD[a]);
		}
		walkCatmullRom(_agRow[0], _agRow[1], _agRow[2], _agRow[3], fu,
			_agFrame.position, _agFrame.tangentU);
		walkCatmullRom(_agRowD[0], _agRowD[1], _agRowD[2], _agRowD[3], fu,
			_agFrame.tangentV, null);
	} else {
		// P00 P01 / P10 P11, row-major in i. Bilinear position, and the exact derivatives
		// of that same bilinear patch so the frame stays consistent with the position.
		const p00 = _agPatch[0], p01 = _agPatch[1], p10 = _agPatch[2], p11 = _agPatch[3];
		BABYLON.Vector3.LerpToRef(p00, p01, fv, _agRow[0]);   // i = 0 edge
		BABYLON.Vector3.LerpToRef(p10, p11, fv, _agRow[1]);   // i = 1 edge
		BABYLON.Vector3.LerpToRef(_agRow[0], _agRow[1], fu, _agFrame.position);

		_agFrame.tangentU.copyFrom(_agRow[1]).subtractInPlace(_agRow[0]);

		BABYLON.Vector3.LerpToRef(p00, p10, fu, _agRow[2]);   // j = 0 edge
		BABYLON.Vector3.LerpToRef(p01, p11, fu, _agRow[3]);   // j = 1 edge
		_agFrame.tangentV.copyFrom(_agRow[3]).subtractInPlace(_agRow[2]);
	}

	// From per-index steps to per-parameter derivatives.
	_agFrame.tangentU.scaleInPlace(1 / (inst.step_u || 1));
	_agFrame.tangentV.scaleInPlace(1 / (inst.step_v || 1));

	// Same handedness as the shader: normal = cross(tangentU, tangentV).
	BABYLON.Vector3.CrossToRef(_agFrame.tangentU, _agFrame.tangentV, _agFrame.normal);
	const nLen = _agFrame.normal.length();
	if (!isFinite(nLen) || nLen < 1e-12) {
		// Degenerate cell (a pole, or a collapsed patch): fall back to the radial
		// direction, exactly as the vertex shader does when its cross product dies.
		const pLen = _agFrame.position.length();
		if (pLen > 1e-6) _agFrame.normal.copyFrom(_agFrame.position).scaleInPlace(1 / pLen);
		else _agFrame.normal.set(0, 1, 0);
	} else {
		_agFrame.normal.scaleInPlace(1 / nLen);
	}

	_agFrame.valid = true;
	return _agFrame;
}

/**
 * Advances one agent by `dt`, given its freshly resolved frame.
 *
 * Everything here is **world space**: the heading and the up axis are world vectors, so
 * `meshTransformations` — non-uniform scaling included — is accounted for exactly and
 * speeds are constant in the units the user actually sees.
 *
 * Order of business:
 *  1. build the world tangent frame and keep its orientation continuous;
 *  2. let the owner drive, if it wants to (a rail, a scripted path);
 *  3. otherwise fold in the pending yaw, turn, and keep the heading tangent — because the
 *     heading is a stored direction re-projected each frame, going forward follows a
 *     geodesic rather than a parameter line, and that is discrete parallel transport for
 *     free;
 *  4. turn the requested world displacement into a (du, dv) step through the first
 *     fundamental form, so speed is metric and not parametric;
 *  5. wrap or bounce at the edges of the domain;
 *  6. integrate the vertical motion along the normal and apply the ground policy.
 *
 * @param {object} agent - The agent to advance.
 * @param {object} ctx - The step context.
 * @param {number} dt - Timestep in seconds.
 * @param {object} frame - Object-space frame from {@link agentResolveFrame}.
 * @param {boolean} snap - Skip the temporal smoothing (used on entry).
 * @param {function|null} drive - Optional `(agent, ctx, dt, up)` hook that may take over
 *   locomotion; returning `true` suppresses steering and the metric step for this frame.
 */
function agentIntegrate(agent, ctx, dt, frame, snap, drive) {
	// --- World frame -------------------------------------------------------------
	// Tangents are direction vectors, so the upper 3×3 transforms them exactly; crossing
	// the transformed tangents then yields the correct world normal under any affine
	// transform, with no inverse transpose needed.
	const world = ctx.world;
	// Read before the step sets it: false means nothing has ever posed this agent, so the
	// swept segment it is about to lay down has no previous end to run from.
	const hadFrame = agent.frameReady;
	agent.prevWorldPos.copyFrom(agent.worldPos);
	if (hadFrame) agent.prevHitPos.copyFrom(agent.hitPos);
	BABYLON.Vector3.TransformCoordinatesToRef(frame.position, world, agent.worldPos);
	BABYLON.Vector3.TransformNormalToRef(frame.tangentU, world, agent.worldTu);
	BABYLON.Vector3.TransformNormalToRef(frame.tangentV, world, agent.worldTv);

	BABYLON.Vector3.CrossToRef(agent.worldTu, agent.worldTv, _agRaw);
	const nLen = _agRaw.length();
	if (isFinite(nLen) && nLen > 1e-12) _agRaw.scaleInPlace(1 / nLen);
	else _agRaw.copyFrom(agent.smoothNormal);

	// Keep the side of the surface continuous. cross(Tu, Tv) reverses wherever the
	// parameterization does — at a seam, at a degenerate cell, and once per lap on a
	// Möbius strip — which would snap the view upside down mid-stride. Following the
	// previous frame's side instead rolls the agent over smoothly, which is also the
	// honest answer on a one-sided surface: after a full lap you really are underneath.
	if (agent.frameReady && !snap && BABYLON.Vector3.Dot(_agRaw, agent.smoothNormal) < 0) {
		_agRaw.scaleInPlace(-1);
	}

	if (snap || !agent.frameReady) {
		// A snap has no previous frame to stay continuous with, so the continuity rule
		// above has nothing to go on and `flip` is the only statement of which side the
		// agent is on. Applying it here is what makes entering the surface from below
		// actually land below: without it the raw cross product wins and the caller's
		// choice of side — measured from where the user was looking — is silently lost.
		agent.smoothNormal.copyFrom(_agRaw).scaleInPlace(agent.flip);
		agent.frameReady = true;
	} else if (agent.smoothTau > 0) {
		// The surface deforms under the agent, and the patch frame still shifts as cells
		// are crossed: position stays exact, orientation lags a little.
		const k = 1 - Math.exp(-dt / agent.smoothTau);
		agent.smoothNormal.addInPlace(_agRaw.subtractInPlace(agent.smoothNormal).scaleInPlace(k));
		const l = agent.smoothNormal.length();
		if (l > 1e-9) agent.smoothNormal.scaleInPlace(1 / l);
	} else {
		agent.smoothNormal.copyFrom(_agRaw);
	}
	const up = agent.up.copyFrom(agent.smoothNormal);

	// --- Driven locomotion --------------------------------------------------------
	const driven = drive ? !!drive(agent, ctx, dt, up) : false;

	// --- Heading: turn around the normal, then re-project into the tangent plane ---
	if (!driven) {
		// Off a rail the head and the body are one: absorb the pending yaw into the
		// heading so the agent goes where it looks.
		if (agent.viewYaw !== 0) {
			const q = BABYLON.Quaternion.RotationAxis(up, agent.viewYaw);
			agent.heading.rotateByQuaternionToRef(q, agent.heading);
			agent.viewYaw = 0;
		}
		const turn = agent.input.turn;
		if (turn !== 0) {
			const q = BABYLON.Quaternion.RotationAxis(up, turn * agent.turnSpeed * dt);
			agent.heading.rotateByQuaternionToRef(q, agent.heading);
		}
		walkTangentialize(agent.heading, up, agent.worldTu);
	}

	// --- Metric step: world displacement -> (du, dv) ------------------------------
	let forward = agent.input.forward;
	let strafe = agent.input.strafe || 0;
	agent.clamped = false;
	agent.stalled = false;
	if ((forward !== 0 || strafe !== 0) && !driven) {
		// Walking a diagonal must not be faster than walking straight.
		const mag = Math.hypot(forward, strafe);
		if (mag > 1) { forward /= mag; strafe /= mag; }
		const dist = agent.moveSpeed * dt;

		const Pu = agent.worldTu, Pv = agent.worldTv;
		const E = BABYLON.Vector3.Dot(Pu, Pu);
		const F = BABYLON.Vector3.Dot(Pu, Pv);
		const G = BABYLON.Vector3.Dot(Pv, Pv);
		const det = E * G - F * F;

		// Travel direction in the tangent plane. Sideways is the heading turned a quarter
		// turn about the normal — `cross(up, heading)` is exactly that rotation, so
		// "strafe right" and "turn right" agree on which way right is, whatever the
		// surface is doing. Both operands are unit and orthogonal, so the result already
		// lies in the tangent plane at unit length: nothing to re-project.
		//
		// The heading is deliberately untouched. Sidestepping while still facing your
		// target is the whole point, and it costs nothing here: the step is a world
		// displacement fed through the first fundamental form, so a sideways one is as
		// metric-correct as a forward one, and it parallel-transports the same way.
		_agA.copyFrom(agent.heading).scaleInPlace(forward * dist);
		if (strafe !== 0) {
			BABYLON.Vector3.CrossToRef(up, agent.heading, _agC);
			_agA.addInPlace(_agC.scaleInPlace(strafe * dist));
		}
		const bu = BABYLON.Vector3.Dot(_agA, Pu);
		const bv = BABYLON.Vector3.Dot(_agA, Pv);
		let du = 0, dv = 0, solved = false;

		if (isFinite(det) && Math.abs(det) > 1e-12) {
			du = (bu * G - bv * F) / det;
			dv = (bv * E - bu * F) / det;
			solved = true;
		} else if (E >= G && E > 1e-12) {
			// Singular, but the surface has not gone away: at a pole one tangent collapses
			// while the other survives, and motion along the survivor is still perfectly
			// well defined. Refusing to move there is what left an agent standing on a
			// sphere's pole forever — stalled every frame, path length zero, unable to
			// reach anyone and unreachable itself. Solving in the least-squares sense on
			// the better-conditioned tangent gives the closest displacement to the one
			// asked for that the surface can actually offer, and one step is enough to
			// leave the singular point and get the full metric back.
			du = bu / E;
			solved = true;
		} else if (G > 1e-12) {
			dv = bv / G;
			solved = true;
		}

		if (!solved) {
			// Both tangents gone: the patch has collapsed to a point and there is no
			// direction left to pick.
			agent.stalled = true;
		} else {
			// The patch is only sampled around one cell: never leave the sampled
			// neighbourhood in a single frame. When this bites, the agent is moving
			// slower than it asked to — which the owner needs to know, because for a
			// projectile it is the difference between flying and crawling.
			const maxDu = agent.maxCells * (ctx.info.inst.step_u || 1);
			const maxDv = agent.maxCells * (ctx.info.inst.step_v || 1);
			const over = Math.max(Math.abs(du) / maxDu, Math.abs(dv) / maxDv, 1);
			agent.clamped = over > 1;
			du /= over; dv /= over;

			if (isFinite(du) && isFinite(dv)) { agent.u += du; agent.v += dv; }
			else agent.stalled = true;
		}
	}

	agentApplyDomain(agent, ctx);
	agentApplyGravity(agent, dt);

	// Last, because gravity is what settles `height` for this frame.
	agent.hitPos.copyFrom(agent.worldPos)
	     .addInPlace(_agB.copyFrom(agent.up).scaleInPlace(agent.height));
	if (!hadFrame) agent.prevHitPos.copyFrom(agent.hitPos);
}

/**
 * Converts a world-space displacement in the tangent plane into a parametric one.
 *
 * The first fundamental form, inverted — the same arithmetic the metric step runs, exposed
 * because anything that wants to place something *a real distance away* needs it. A
 * parametric offset is not a distance: the same `du` spans a hundredfold different world
 * distances across one form, so "spawn a fraction of the domain away" means nothing.
 *
 * @param {object} agent - Agent whose tangent frame defines the local metric.
 * @param {BABYLON.Vector3} worldVec - Displacement in world units, taken tangent to the
 *   surface (any normal component is ignored).
 * @param {{du: number, dv: number}} out - Receives the parametric step.
 * @returns {boolean} `false` if the metric is too degenerate to invert, leaving `out` zeroed.
 */
function agentWorldToParam(agent, worldVec, out) {
	out.du = 0;
	out.dv = 0;

	const Pu = agent.worldTu, Pv = agent.worldTv;
	const E = BABYLON.Vector3.Dot(Pu, Pu);
	const F = BABYLON.Vector3.Dot(Pu, Pv);
	const G = BABYLON.Vector3.Dot(Pv, Pv);
	const det = E * G - F * F;
	if (!isFinite(det) || Math.abs(det) <= 1e-12) return false;

	const bu = BABYLON.Vector3.Dot(worldVec, Pu);
	const bv = BABYLON.Vector3.Dot(worldVec, Pv);
	const du = (bu * G - bv * F) / det;
	const dv = (bv * E - bu * F) / det;
	if (!isFinite(du) || !isFinite(dv)) return false;

	out.du = du;
	out.dv = dv;
	return true;
}

/**
 * Wraps the agent's parameters where the surface closes, and turns it around where it
 * does not.
 *
 * Closure was measured on the real geometry at entry, so a torus keeps going forever while
 * an open patch has a real border. Walking into that border turns the agent around rather
 * than leaving it pressed against the void — an invisible wall reads as being stuck.
 *
 * @param {object} agent - The agent.
 * @param {object} ctx - The step context.
 */
function agentApplyDomain(agent, ctx) {
	const inst = ctx.info.inst;
	const d = ctx.domain;
	const rangeU = inst.max_u - inst.min_u;
	const rangeV = inst.max_v - inst.min_v;
	let bounceU = false, bounceV = false;

	// Crossing a twisted seam wraps the parameter *and* mirrors the other one. Nothing has
	// to be done to the heading: it is a world-space direction and the seam is the same set
	// of points seen from the other side, so the physical direction of travel is unchanged.
	// The normal does reverse there, and the continuity rule in agentIntegrate already
	// rolls the agent over smoothly rather than snapping it.
	if ((d.closedU || d.twistedU) && rangeU > 0) {
		const laps = Math.floor((agent.u - inst.min_u) / rangeU);
		agent.u -= laps * rangeU;
		if (d.twistedU && (((laps % 2) + 2) % 2) === 1) agent.v = inst.min_v + inst.max_v - agent.v;
	} else {
		const cu = Math.min(Math.max(agent.u, inst.min_u), inst.max_u);
		bounceU = cu !== agent.u;
		agent.u = cu;
	}
	if ((d.closedV || d.twistedV) && rangeV > 0) {
		const laps = Math.floor((agent.v - inst.min_v) / rangeV);
		agent.v -= laps * rangeV;
		if (d.twistedV && (((laps % 2) + 2) % 2) === 1) agent.u = inst.min_u + inst.max_u - agent.u;
	} else {
		const cv = Math.min(Math.max(agent.v, inst.min_v), inst.max_v);
		bounceV = cv !== agent.v;
		agent.v = cv;
	}

	agent.hitEdge = bounceU || bounceV;
	if (agent.hitEdge) {
		// Mirror the heading about the blocked parameter direction, billiard-style.
		const axis = _agB.copyFrom(bounceU ? agent.worldTu : agent.worldTv);
		const aLen = axis.length();
		if (aLen > 1e-9) {
			axis.scaleInPlace(1 / aLen);
			const proj = BABYLON.Vector3.Dot(agent.heading, axis);
			agent.heading.subtractInPlace(_agC.copyFrom(axis).scaleInPlace(2 * proj));
			walkTangentialize(agent.heading, agent.up, agent.worldTv);
		}
	}
}

/**
 * Integrates the motion along the normal and applies the ground policy.
 *
 * Gravity points into the surface rather than down the world Y axis. On a closed or
 * self-intersecting form "down" has no global meaning, and this way an agent keeps its
 * footing upside down, on overhangs, and inside the shape — which is also what makes one
 * gravity rule serve the walker and the projectile alike.
 *
 * The height can go negative because the *surface rose*, not because the agent fell: on an
 * animated form a passing wave swallows a bullet. That is physically right, and the ground
 * policy deliberately does not try to tell the two causes apart.
 *
 * @param {object} agent - The agent.
 * @param {number} dt - Timestep in seconds.
 */
function agentApplyGravity(agent, dt) {
	agent.hitGround = false;

	if (agent.input.jump && agent.height <= 0 && agent.vSpeed <= 0 && agent.jumpSpeed > 0) {
		agent.vSpeed = agent.jumpSpeed;
	}

	if (agent.height > 0 || agent.vSpeed > 0 || agent.gravity > 0) {
		agent.vSpeed -= agent.gravity * dt;
		agent.height += agent.vSpeed * dt;

		if (agent.height <= 0) {
			agent.hitGround = true;
			switch (agent.ground) {
				case 'despawn':
					agent.height = 0;
					agent.vSpeed = 0;
					agent.alive = false;
					break;
				case 'bounce':
					agent.height = -agent.height * agent.restitution;
					agent.vSpeed = -agent.vSpeed * agent.restitution;
					// Below a threshold a bounce is just jitter: settle.
					if (Math.abs(agent.vSpeed) < 1e-4) { agent.height = 0; agent.vSpeed = 0; }
					break;
				default:
					agent.height = 0;
					agent.vSpeed = 0;
					break;
			}
			if (agent.onGround) agent.onGround(agent);
		}
	}
}

/** Scratch agent for one-off evaluations outside the batched step. */
const _agProbeAgent = agentInit({});

/**
 * Evaluates the surface at one parametric position, outside the batched step.
 *
 * Spends a probe call of its own, so it is for the handful of one-shot needs — dropping
 * the character on entry, measuring a rail — and never for anything per-frame and
 * per-agent. That is what {@link agentsStep} is for.
 *
 * @param {object} info - Result of `walkMeshInfo()`.
 * @param {object} domain - Closure flags from `walkSurveySurface()`.
 * @param {number} u - Parametric u.
 * @param {number} v - Parametric v.
 * @returns {object} A frame, reused between calls; check `.valid`.
 */
function agentEvalAt(info, domain, u, v) {
	_agFrame.valid = false;
	if (!info) return _agFrame;

	_agCtx.info = info;
	_agCtx.world = glo.ribbon ? glo.ribbon.getWorldMatrix() : BABYLON.Matrix.Identity();
	_agCtx.domain = domain;

	_agProbeAgent.u = u;
	_agProbeAgent.v = v;
	_agProbeAgent.patch = 'bicubic';

	const n = agentGather(_agProbeAgent, _agCtx, _agentIdx, 0);
	const probe = info.inst.probePoints(_agentIdx, n);
	if (!probe) return _agFrame;
	_agCtx.probe = probe;

	return agentResolveFrame(_agProbeAgent, _agCtx);
}

/**
 * Advances the whole population by one frame, in three phases and **one probe call**.
 *
 * Splitting gather from resolve is the entire point of this file: the probe costs the same
 * for four samples as for a hundred and forty-four, so the only thing that must never
 * happen is a second call in the same frame. Every agent contributes its samples to one
 * buffer, one call runs, and each agent then reads back its own slice.
 *
 * @param {object} info - Result of `walkMeshInfo()`.
 * @param {object} domain - Closure flags from `walkSurveySurface()`.
 * @param {number} dt - Timestep in seconds.
 * @param {boolean} [snap=false] - Skip temporal smoothing (used on entry).
 * @param {function|null} [drive=null] - Per-agent locomotion override, see
 *   {@link agentIntegrate}.
 * @returns {boolean} `true` if the step ran.
 */
function agentsStep(info, domain, dt, snap = false, drive = null) {
	if (!info || !glo.ribbon || _agents.length === 0) return false;

	_agCtx.info = info;
	_agCtx.world = glo.ribbon.getWorldMatrix();
	_agCtx.domain = domain;

	// --- Phase A: gather ---------------------------------------------------------
	let total = 0;
	for (let i = 0; i < _agents.length; i++) {
		if (_agents[i].alive) total += agentPatchSize(_agents[i]);
	}
	for (let i = 0; i < _agSamplers.length; i++) {
		total += _agSamplers[i].count ? _agSamplers[i].count(_agCtx) : 0;
	}
	if (total === 0) return false;
	if (_agentIdx.length < total * 2) _agentIdx = new Float32Array(total * 2);

	let offset = 0;
	for (let i = 0; i < _agents.length; i++) {
		const a = _agents[i];
		if (!a.alive) continue;
		offset += agentGather(a, _agCtx, _agentIdx, offset);
	}
	// Samplers ride along: their indices go in the same buffer, so the population and
	// everything watching it still cost exactly one probe call between them.
	const samplerAt = [];
	for (let i = 0; i < _agSamplers.length; i++) {
		samplerAt.push(offset);
		offset += _agSamplers[i].gather(_agCtx, _agentIdx, offset);
	}
	total = offset;

	// --- Phase B: one probe for everyone -----------------------------------------
	const probe = info.inst.probePoints(_agentIdx, total);
	if (!probe) return false;
	_agCtx.probe = probe;

	// --- Phase C: resolve and integrate ------------------------------------------
	for (let i = 0; i < _agents.length; i++) {
		const a = _agents[i];
		a._stepped = false;
		if (!a.alive) continue;

		if (a.ttl !== Infinity) {
			a.ttl -= dt;
			if (a.ttl <= 0) { a.alive = false; continue; }
		}

		const frame = agentResolveFrame(a, _agCtx);
		if (!frame.valid) continue;
		agentIntegrate(a, _agCtx, dt, frame, snap, drive);
		a._stepped = true;
	}

	for (let i = 0; i < _agSamplers.length; i++) {
		_agSamplers[i].resolve(_agCtx, samplerAt[i]);
	}

	// Reap what died this step, from the back so the indices stay valid.
	for (let i = _agents.length - 1; i >= 0; i--) {
		if (!_agents[i].alive && _agents[i].reap !== false) _agents.splice(i, 1);
	}

	return true;
}