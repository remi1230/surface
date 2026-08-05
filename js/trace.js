//*****************************************************************************************************//
//********************************************* SURFACE TRACE *****************************************//
//*****************************************************************************************************//
//
// The line an agent leaves behind it on the surface.
//
// This is the feature that makes the geometry legible. A bullet already flies along a
// geodesic — the heading is a world direction re-projected onto the tangent plane every
// frame, which is discrete parallel transport — but nothing on screen says so. Draw the
// path and a shot fired straight ahead on a sphere visibly wraps round the form and comes
// back at the shooter. The same line behind the walker is a thread back to where you came
// from, which is the one thing a first-person view on a folded surface never gives you.
//
// Points are stored in parametric (u, v) and re-evaluated every frame, not baked into
// world positions. On a form that deforms in time that is the difference between a trace
// glued to the surface and one hanging in the air where the surface used to be. It costs
// nothing extra: the probe's price is the call, not the points, so the samples ride the
// step's single call through the sampler hook in agents.js.
//
// Points are recorded by *distance travelled*, never per frame. A trace laid down per
// frame would be dense at 60 fps and sparse at 15 — the same mistake that made bullets
// pass through their targets — so spacing is metric and the drawn line is identical at
// any frame rate.
//

/** Tunables for the trace. Distances are in body heights unless stated. */
const TRACE = {
	/**
	 * Points kept per trace. Beyond this the oldest are dropped.
	 *
	 * Sized so a trace can hold more than one lap of a typical closed form: at the default
	 * spacing this is about 190 body heights of path, against roughly 90 for a sphere's
	 * great circle. A shorter window cuts the line off before it comes back, which is
	 * exactly the moment worth seeing.
	 */
	MAX_POINTS: 26000,
	/** Distance an agent must cover before another point is recorded. */
	SPACING: 0.45,
	/** Half-width of the drawn ribbon. */
	WIDTH: 0.075,
	/** Seconds a point survives; the ribbon fades out over its last moments. */
	LIFETIME: 5.0,
	/** Fraction of the lifetime spent at full opacity before fading begins. */
	SOLID_FRACTION: 0.55,
	/** Opacity of the part of the trace the surface hides, as for the entity markers. */
	GHOST_ALPHA: 0.4,
	/** How far the ribbon floats above the surface, to stay clear of it in depth. */
	HOVER: 0.12,
	/** Trace colours, as [r, g, b]. */
	COLORS: {
		bullet: [1.0, 0.78, 0.30],
		player: [0.45, 0.85, 1.0],
		enemy:  [0.95, 0.45, 0.45],
	},
	/** Segment capacity the vertex buffers start at; they grow on demand. */
	INITIAL_SEGMENTS: 512,
};

/** Live traces and the geometry they share. */
const _trace = {
	/** @type {object[]} One entry per agent being followed. */
	list: [],
	/** @type {BABYLON.Mesh|null} Solid ribbon. */
	mesh: null,
	/** @type {BABYLON.Mesh|null} The same ribbon where the surface hides it. */
	ghost: null,
	/** @type {Float32Array|null} World-space quad corners, four per segment. */
	positions: null,
	/** @type {Float32Array|null} Vertex colours. */
	colors: null,
	/** @type {Float32Array|null} The same in the occluded palette. */
	ghostColors: null,
	/** @type {number} Capacity in segments. */
	capacity: 0,
	/** @type {number} Samples the last gather asked for, so resolve reads the right slice. */
	sampleCount: 0,
	/**
	 * @type {boolean} Whether the surface moves under the trace.
	 *
	 * A point's world position only changes if the geometry does. On a static form,
	 * resolving a point once when it is laid down is the whole job and re-resolving it
	 * every frame is pure waste — measured at 8 889 samples and 5.1 ms a frame for ten
	 * long geodesics, against 16 samples for the walk alone. Measured rather than parsed:
	 * `walkSurfaceUsesTime` nudges the clock and re-probes, because no amount of reading
	 * the equations can tell (see docs/vue-premiere-personne.md §14).
	 */
	restless: false,
};

// Scratch, allocated once.
const _trFrac = { fu: 0, fv: 0 };
const _trObj  = new BABYLON.Vector3();
const _trDir  = new BABYLON.Vector3();
const _trSide = new BABYLON.Vector3();
const _trToEye = new BABYLON.Vector3();
const _trMid  = new BABYLON.Vector3();

/**
 * Starts following an agent.
 *
 * @param {object} agent - The agent to follow.
 * @param {object} [opts={}] - `kind` picks the colour; `lifetime` overrides the default;
 *   `linger` keeps the trace alive for that many seconds after the agent dies.
 * @returns {object} The trace record.
 */
function traceAttach(agent, opts = {}) {
	const t = {
		agent: agent,
		kind: opts.kind || agent.kind || 'bullet',
		lifetime: opts.lifetime !== undefined ? opts.lifetime : TRACE.LIFETIME,
		linger: opts.linger !== undefined ? opts.linger : 0,
		/**
		 * Ring buffer of points. Each is a parametric position, the age it has reached,
		 * and the world position the last probe resolved it to.
		 */
		u: new Float64Array(TRACE.MAX_POINTS),
		v: new Float64Array(TRACE.MAX_POINTS),
		age: new Float32Array(TRACE.MAX_POINTS),
		world: Array.from({ length: TRACE.MAX_POINTS }, () => new BABYLON.Vector3()),
		/** Where each point sits inside its grid cell, kept from gather to resolve. */
		fu: new Float32Array(TRACE.MAX_POINTS),
		fv: new Float32Array(TRACE.MAX_POINTS),
		/** 0 until a probe has turned the point into a world position. */
		done: new Uint8Array(TRACE.MAX_POINTS),
		count: 0,
		head: 0,
		/** World position of the last recorded point, for metric spacing. */
		lastPos: new BABYLON.Vector3(),
		hasLast: false,
		/** Seconds left once the agent is gone. */
		orphan: -1,
		/** Where this trace's samples begin in the shared probe buffer. */
		at: 0
	};
	_trace.list.push(t);
	return t;
}

/**
 * Stops following an agent and drops its line immediately.
 * @param {object} agent - The agent to stop following.
 */
function traceDetach(agent) {
	for (let i = _trace.list.length - 1; i >= 0; i--) {
		if (_trace.list[i].agent === agent) _trace.list.splice(i, 1);
	}
}

/**
 * Re-measures whether the surface moves, which decides how much of the trace has to be
 * re-probed each frame. Called on entering walk mode and after every mesh rebuild.
 */
function traceSurveySurface() {
	_trace.restless = typeof walkSurfaceUsesTime === 'function' ? !!walkSurfaceUsesTime() : true;
	// A settled point is only settled for the geometry it was resolved against.
	for (const t of _trace.list) t.done.fill(0);
}

/** Drops every trace. */
function traceClear() {
	_trace.list.length = 0;
	if (_trace.mesh) _trace.mesh.setEnabled(false);
	if (_trace.ghost) _trace.ghost.setEnabled(false);
}

/** @param {object} agent @returns {boolean} Whether the agent is being followed. */
function traceHas(agent) {
	return _trace.list.some(t => t.agent === agent);
}

/**
 * Records new points and ages the existing ones. Called before the step, so a point is
 * laid down at the position the agent actually occupied.
 *
 * Spacing is by distance covered, never by frame: a metre of path is a metre of ribbon
 * whatever the frame rate.
 *
 * @param {number} dt - Timestep in seconds.
 */
function traceRecord(dt) {
	const body = (glo.walk && glo.walk.baseEye) || 1;
	const spacing = body * TRACE.SPACING;

	for (let i = _trace.list.length - 1; i >= 0; i--) {
		const t = _trace.list[i];
		const a = t.agent;

		for (let k = 0; k < t.count; k++) {
			const idx = (t.head - 1 - k + TRACE.MAX_POINTS * 2) % TRACE.MAX_POINTS;
			t.age[idx] += dt;
		}
		while (t.count > 0) {
			const oldest = (t.head - t.count + TRACE.MAX_POINTS * 2) % TRACE.MAX_POINTS;
			if (t.age[oldest] <= t.lifetime) break;
			t.count--;
		}

		const gone = !a || !a.alive;
		if (gone) {
			// The agent is dead: let the line finish fading rather than blinking out.
			if (t.orphan < 0) t.orphan = t.linger;
			t.orphan -= dt;
			if (t.orphan <= 0 && t.count === 0) { _trace.list.splice(i, 1); continue; }
			if (t.count === 0) { _trace.list.splice(i, 1); continue; }
			continue;
		}

		if (!a.frameReady) continue;
		if (t.hasLast && BABYLON.Vector3.Distance(a.worldPos, t.lastPos) < spacing) continue;

		t.u[t.head] = a.u;
		t.v[t.head] = a.v;
		t.age[t.head] = 0;
		t.done[t.head] = 0;
		t.world[t.head].copyFrom(a.worldPos);
		t.head = (t.head + 1) % TRACE.MAX_POINTS;
		if (t.count < TRACE.MAX_POINTS) t.count++;
		t.lastPos.copyFrom(a.worldPos);
		t.hasLast = true;
	}
}

/**
 * The sampler that puts every trace point into the step's one probe call.
 * @type {{count: Function, gather: Function, resolve: Function}}
 */
const traceSampler = {
	/** @returns {number} Samples this frame's gather will ask for. */
	count: function () {
		let n = 0;
		for (const t of _trace.list) {
			if (_trace.restless) { n += t.count; continue; }
			for (let k = 0; k < t.count; k++) {
				const idx = (t.head - t.count + k + TRACE.MAX_POINTS * 2) % TRACE.MAX_POINTS;
				if (!t.done[idx]) n++;
			}
		}
		_trace.sampleCount = n * 4;
		return _trace.sampleCount;
	},

	/**
	 * @param {object} ctx - The step context.
	 * @param {Float32Array} out - Shared index buffer.
	 * @param {number} offset - Sample index to start at.
	 * @returns {number} Samples written.
	 */
	gather: function (ctx, out, offset) {
		let at = offset;
		for (const t of _trace.list) {
			t.at = at;
			for (let k = 0; k < t.count; k++) {
				const idx = (t.head - t.count + k + TRACE.MAX_POINTS * 2) % TRACE.MAX_POINTS;
				if (!_trace.restless && t.done[idx]) continue;
				at += agentGatherCell(ctx, t.u[idx], t.v[idx], out, at, _trFrac);
				// Resolve needs the same fractions; keeping them beats recomputing the cell.
				t.fu[idx] = _trFrac.fu;
				t.fv[idx] = _trFrac.fv;
			}
		}
		return at - offset;
	},

	/**
	 * Turns every point back into a world position on the surface as it is *now*, which is
	 * what keeps the line glued to a form that deforms in time.
	 *
	 * @param {object} ctx - The step context.
	 * @param {number} offset - Sample index this sampler's slice starts at.
	 */
	resolve: function (ctx, offset) {
		const world = ctx.world;
		for (const t of _trace.list) {
			let at = t.at;
			for (let k = 0; k < t.count; k++) {
				const idx = (t.head - t.count + k + TRACE.MAX_POINTS * 2) % TRACE.MAX_POINTS;
				if (!_trace.restless && t.done[idx]) continue;
				agentResolveCell(ctx, at, t.fu[idx], t.fv[idx], _trObj);
				BABYLON.Vector3.TransformCoordinatesToRef(_trObj, world, t.world[idx]);
				t.done[idx] = 1;
				at += 4;
			}
		}
	}
};

/**
 * Builds the two ribbon layers, solid and see-through.
 *
 * Same construction as the entity markers, and for the same reasons: world-space vertices
 * rewritten every frame into a plain position + colour buffer, no instancing, and both
 * layers sharing the surface's rendering group so the depth test has the surface to test
 * against. The see-through pass uses GREATER, so the two are exact complements — the part
 * of the line in front of the form is drawn solid, the part behind it faintly, and a
 * geodesic disappearing round the far side stays readable all the way round.
 *
 * @param {BABYLON.Scene} scene - The BabylonJS scene.
 */
function initTrace(scene) {
	_trace.mesh  = traceMakeLayer(scene, 'traceRibbon', false);
	_trace.ghost = traceMakeLayer(scene, 'traceRibbonGhost', true);
	_traceGrow(TRACE.INITIAL_SEGMENTS);
	agentsAddSampler(traceSampler);
}

/**
 * One ribbon layer.
 * @param {BABYLON.Scene} scene - The BabylonJS scene.
 * @param {string} name - Mesh name; must match the `ribbonDispose` whitelist.
 * @param {boolean} ghost - Draw only where the surface hides the line.
 * @returns {BABYLON.Mesh} The layer.
 */
function traceMakeLayer(scene, name, ghost) {
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
		needAlphaBlending: true
	});
	mat.backFaceCulling = false;
	mat.setFloat('uAlpha', ghost ? TRACE.GHOST_ALPHA : 1.0);
	mat.alpha = 0.999;              // the ribbon fades by vertex alpha, so blending is on
	mat.disableDepthWrite = true;   // a line drawn over the world must not occlude it
	if (ghost) mat.depthFunction = (BABYLON.Engine && BABYLON.Engine.GREATER) || 516;

	mesh.material = mat;
	mesh.isPickable = false;
	mesh.alwaysSelectAsActiveMesh = true;
	mesh.renderingGroupId = 0;      // share the surface's depth buffer, see initGameMarkers
	mesh.layerMask = WALK_LAYER.MAIN;
	mesh.setEnabled(false);
	return mesh;
}

/**
 * (Re)allocates the ribbon buffers.
 * @private
 * @param {number} segments - Segments to make room for.
 */
function _traceGrow(segments) {
	_trace.capacity = segments;
	_trace.positions = new Float32Array(segments * 12);
	_trace.colors = new Float32Array(segments * 16);
	_trace.ghostColors = new Float32Array(segments * 16);

	const indices = new Uint32Array(segments * 6);
	for (let s = 0; s < segments; s++) {
		const v = s * 4, i = s * 6;
		indices[i] = v; indices[i + 1] = v + 1; indices[i + 2] = v + 2;
		indices[i + 3] = v; indices[i + 4] = v + 2; indices[i + 5] = v + 3;
	}

	for (const [layer, colors] of [[_trace.mesh, _trace.colors], [_trace.ghost, _trace.ghostColors]]) {
		if (!layer) continue;
		layer.setVerticesData(BABYLON.VertexBuffer.PositionKind, _trace.positions, true);
		layer.setVerticesData(BABYLON.VertexBuffer.ColorKind, colors, true);
		layer.setIndices(indices);
	}
}

/**
 * Rebuilds the ribbon from the resolved points. Called after the step, when every point
 * has a fresh world position.
 */
function traceUpdate() {
	const mesh = _trace.mesh;
	if (!mesh) return;

	let segments = 0;
	for (const t of _trace.list) if (t.count > 1) segments += t.count - 1;
	if (segments === 0) {
		mesh.setEnabled(false);
		if (_trace.ghost) _trace.ghost.setEnabled(false);
		return;
	}
	if (segments > _trace.capacity) _traceGrow(Math.max(segments, _trace.capacity * 2));

	const eye = cameraWorldPosition();
	const body = (glo.walk && glo.walk.baseEye) || 1;
	const half = body * TRACE.WIDTH;
	const hover = body * TRACE.HOVER;
	const P = _trace.positions, C = _trace.colors, G = _trace.ghostColors;

	let s = 0;
	for (const t of _trace.list) {
		if (t.count < 2) continue;
		const col = TRACE.COLORS[t.kind] || TRACE.COLORS.bullet;

		for (let k = 0; k < t.count - 1; k++) {
			const i0 = (t.head - t.count + k + TRACE.MAX_POINTS * 2) % TRACE.MAX_POINTS;
			const i1 = (t.head - t.count + k + 1 + TRACE.MAX_POINTS * 2) % TRACE.MAX_POINTS;
			const p0 = t.world[i0], p1 = t.world[i1];

			_trDir.copyFrom(p1).subtractInPlace(p0);
			if (_trDir.lengthSquared() < 1e-16) continue;

			// A ribbon turned to face the eye: a flat strip lying on the surface would go
			// edge-on at a distance for the same reason the entity markers did.
			_trMid.copyFrom(p0).addInPlace(p1).scaleInPlace(0.5);
			_trToEye.copyFrom(eye).subtractInPlace(_trMid);
			BABYLON.Vector3.CrossToRef(_trDir, _trToEye, _trSide);
			if (_trSide.lengthSquared() < 1e-16) continue;
			_trSide.normalize().scaleInPlace(half);

			// Lift both ends clear of the surface they were sampled on.
			_trToEye.normalize().scaleInPlace(hover);

			const o = s * 12;
			P[o     ] = p0.x - _trSide.x + _trToEye.x; P[o + 1 ] = p0.y - _trSide.y + _trToEye.y; P[o + 2 ] = p0.z - _trSide.z + _trToEye.z;
			P[o + 3 ] = p0.x + _trSide.x + _trToEye.x; P[o + 4 ] = p0.y + _trSide.y + _trToEye.y; P[o + 5 ] = p0.z + _trSide.z + _trToEye.z;
			P[o + 6 ] = p1.x + _trSide.x + _trToEye.x; P[o + 7 ] = p1.y + _trSide.y + _trToEye.y; P[o + 8 ] = p1.z + _trSide.z + _trToEye.z;
			P[o + 9 ] = p1.x - _trSide.x + _trToEye.x; P[o + 10] = p1.y - _trSide.y + _trToEye.y; P[o + 11] = p1.z - _trSide.z + _trToEye.z;

			const a0 = traceFade(t.age[i0], t.lifetime);
			const a1 = traceFade(t.age[i1], t.lifetime);
			const c = s * 16;
			for (let corner = 0; corner < 4; corner++) {
				const alpha = (corner === 0 || corner === 1) ? a0 : a1;
				const q = c + corner * 4;
				C[q] = col[0]; C[q + 1] = col[1]; C[q + 2] = col[2]; C[q + 3] = alpha;
				G[q] = col[0]; G[q + 1] = col[1]; G[q + 2] = col[2]; G[q + 3] = alpha;
			}
			s++;
		}
	}

	// Everything past the live count collapses to a point and rasterizes nothing.
	if (s < _trace.capacity) P.fill(0, s * 12);

	for (const [layer, colors] of [[mesh, C], [_trace.ghost, G]]) {
		if (!layer) continue;
		layer.updateVerticesData(BABYLON.VertexBuffer.PositionKind, P);
		layer.updateVerticesData(BABYLON.VertexBuffer.ColorKind, colors);
		layer.setEnabled(s > 0);
	}
}

/**
 * Opacity of a point at a given age: full for most of its life, then a ramp to nothing.
 * @param {number} age - Seconds since the point was laid down.
 * @param {number} lifetime - Seconds the point lives.
 * @returns {number} Alpha in [0, 1].
 */
function traceFade(age, lifetime) {
	const solid = lifetime * TRACE.SOLID_FRACTION;
	if (age <= solid) return 1;
	const k = (age - solid) / Math.max(lifetime - solid, 1e-6);
	return Math.max(0, 1 - k);
}