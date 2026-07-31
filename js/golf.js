//*****************************************************************************************************//
//******************************************* GEODESIC GOLF *******************************************//
//*****************************************************************************************************//
//
// A target somewhere on the form, and one question: which way do you have to face for a
// straight line to arrive there?
//
// On a plane that question is trivial and the answer is "at it". On anything else it is
// not, and on a sphere it is actively misleading — the target is over the horizon, so
// there is nothing to aim at, and the direction that reaches it is one you have to deduce
// from the shape rather than see. That is the whole game: the surface is the puzzle, and
// the shot is how you interrogate it.
//
// Nothing here is new machinery. A stroke is the geodesic probe that firing outside a
// match already produced — gravity off, so the path is the surface's own answer to
// "straight ahead" and nothing else. The target is a surface agent like any other, so the
// swept collision, the billboarded marker and the see-through silhouette all apply to it
// unchanged. What this file adds is a reason to care where the line goes: a target, a
// stroke count, and the traces left standing so that the shot you just missed with is
// still on screen while you aim the next one.
//

/** Tunables for the course. Distances are in body heights unless stated. */
const GOLF = {
	/** Holes in a round. */
	HOLES: 9,
	/** Strokes a hole is expected to take. */
	PAR: 3,
	/** How close a shot must pass to count. Generous: a lap of a sphere is a long lever. */
	TARGET_RADIUS: 1.6,
	/** Drawn size of the target marker, in body heights. Bigger than a character. */
	TARGET_SIZE: 2.4,
	/**
	 * Where a target may be placed, as a fraction of the mesh's own size.
	 *
	 * The far side is not automatically the hard side. On a sphere *every* geodesic
	 * leaving a point reconverges at its antipode, so a target placed as far away as
	 * possible is the one hole you cannot miss — any direction at all holes out. The
	 * interesting distance is short of that, where the heading has to be right.
	 */
	MIN_REACH: 0.32,
	MAX_REACH: 0.70,
	/** Candidate positions drawn before giving up and taking the best so far. */
	PLACEMENT_TRIES: 240,
	/**
	 * How far a stroke carries, in body heights.
	 *
	 * A stroke has to run out, and this is the number that makes the mode a game rather
	 * than a formality. Left to fly for its full tracer life a shot covers 264 body
	 * heights, and a geodesic that long wanders densely enough over a bounded form to pass
	 * near anything: measured that way, 100 % of headings holed out on a Moebius and 64 %
	 * on a sphere. The hole was being won by waiting, not by aiming.
	 *
	 * It scales with the hole rather than being absolute, because the straight-line
	 * distance a hole is placed at is a poor guide to how far a shot must actually travel:
	 * the geodesic that gets there bends round the form and is longer, sometimes much
	 * longer. A fixed 25 body heights against holes placed 20 to 30 away left two forms out
	 * of three at 0 out of 72 headings — not hard, unplayable. The multiplier is the slack
	 * that buys a wrapping path, and the bounds stop a near hole from being trivial or a
	 * far one from turning back into a sweep of the whole surface.
	 */
	STROKE_RANGE_FACTOR: 2.5,
	STROKE_RANGE_MIN: 40,
	STROKE_RANGE_MAX: 90,
	/** Seconds the "holed out" banner stays up before the next target appears. */
	CELEBRATION: 1.6,
};

/** Live state of the round. */
const _golf = {
	/** @type {boolean} Whether a round is running. */
	active: false,
	/** @type {object|null} The target agent, or null between holes. */
	target: null,
	/** @type {number} Hole currently being played, 1-based. */
	hole: 0,
	/** @type {number} Strokes on this hole. */
	strokes: 0,
	/** @type {number} Strokes over the whole round. */
	total: 0,
	/** @type {number} Par accumulated for the holes already finished. */
	parSoFar: 0,
	/** @type {number} Seconds left on the "holed out" banner; the next hole waits for it. */
	pause: 0,
	/** @type {boolean} Set by the target's death, consumed by golfUpdate. */
	holedOut: false,
	/** @type {number} Straight-line distance to the target when it was placed, in bodies. */
	reach: 0,
};

/**
 * Starts or stops a round.
 * @returns {boolean} Whether a round is now running.
 */
function golfToggle() {
	if (_golf.active) golfStop(); else golfStart();
	return _golf.active;
}

/**
 * Starts a round: resets the card and places the first target.
 *
 * A match and a round are mutually exclusive. Golf leans on firing behaving as a geodesic
 * probe, which is what it does only when no match is running, and being shot at while
 * reading a surface is nobody's idea of either game.
 */
function golfStart() {
	if (glo.cameraMode !== 'walk') return;
	if (typeof _game !== 'undefined' && _game.active) gameStop();

	_golf.active = true;
	_golf.hole = 0;
	_golf.total = 0;
	_golf.parSoFar = 0;
	_golf.pause = 0;
	_golf.holedOut = false;
	traceClear();
	golfNextHole();
	golfShowHud();
}

/** Ends the round and clears the course. */
function golfStop() {
	_golf.active = false;
	golfDropTarget();
	traceClear();
	golfHideHud();
}

/** Removes the current target, if any. */
function golfDropTarget() {
	if (_golf.target) {
		traceDetach(_golf.target);
		agentsUnregister(_golf.target);
		_golf.target = null;
	}
}

/**
 * Moves on to the next hole, or ends the round after the last one.
 */
function golfNextHole() {
	golfDropTarget();
	if (_golf.hole >= GOLF.HOLES) { _golf.active = false; golfShowHud(); return; }
	_golf.hole++;
	_golf.strokes = 0;
	traceClear();
	golfPlaceTarget();
}

/**
 * Puts a target somewhere on the surface, at a distance worth walking a line to.
 *
 * Candidates are drawn at random across the parametric domain and scored on their
 * straight-line distance from the player, because that is the one measure available
 * without integrating anything: the *geodesic* distance is exactly the quantity the player
 * is being asked to work out, so computing it here to place the target would be solving
 * the puzzle in order to set it.
 *
 * Straight-line distance is a poor proxy — on a folded form two points can be neighbours
 * through space and a long walk apart on the surface — but that failure is in the game's
 * favour: a target that is close through the fold and far along the surface is precisely
 * the interesting hole.
 */
function golfPlaceTarget() {
	const w = glo.walk, info = walkMeshInfo();
	if (!info || !w.frameReady) return;
	const inst = info.inst;
	const domain = { closedU: w.closedU, closedV: w.closedV,
	                 twistedU: w.twistedU, twistedV: w.twistedV };
	const body = w.baseEye || 1;
	const lo = GOLF.MIN_REACH * w.scale, hi = GOLF.MAX_REACH * w.scale;

	let bestU = inst.min_u, bestV = inst.min_v, bestD = -1, found = false;
	for (let i = 0; i < GOLF.PLACEMENT_TRIES && !found; i++) {
		const u = inst.min_u + (inst.max_u - inst.min_u) * Math.random();
		const v = inst.min_v + (inst.max_v - inst.min_v) * Math.random();
		const frame = agentEvalAt(info, domain, u, v);
		if (!frame.valid) continue;
		const d = BABYLON.Vector3.Distance(
			BABYLON.Vector3.TransformCoordinates(frame.position, glo.ribbon.getWorldMatrix()),
			w.worldPos);
		if (d >= lo && d <= hi) { bestU = u; bestV = v; bestD = d; found = true; }
		else if (d > bestD) { bestU = u; bestV = v; bestD = d; }
	}

	const t = createSurfaceAgent({
		patch: 'bilinear',
		ground: 'stick',
		smoothTau: 0,
		kind: 'target',
		team: 2,                       // its own side, so the player's shots test against it
		radius: body * GOLF.TARGET_RADIUS,
		moveSpeed: 0,
		gravity: 0,
	});
	t.u = bestU;
	t.v = bestV;
	t.flip = w.flip;
	t.baseEye = body;
	t.markerSize = body * GOLF.TARGET_SIZE;
	t.health = 1;
	// gameCollide calls onDeath *instead of* clearing `alive`, not as well, so a handler
	// that only raises a flag leaves the target standing on the surface for ever.
	t.onDeath = (a) => { a.alive = false; _golf.holedOut = true; };
	agentsRegister(t);
	_golf.target = t;
	_golf.reach = bestD / body;
}

/**
 * How far a stroke carries on the current hole, in body heights.
 * @returns {number} The range.
 */
function golfStrokeRange() {
	return Math.min(GOLF.STROKE_RANGE_MAX,
	                Math.max(GOLF.STROKE_RANGE_MIN, _golf.reach * GOLF.STROKE_RANGE_FACTOR));
}

/**
 * Counts a stroke and makes the shot behave as a probe rather than a bullet.
 *
 * Called from the fire path. The shot is already gravity-free outside a match; what a
 * round adds is that its line stays on screen until the hole is over, because the shot you
 * just missed with is the only evidence you have about which way to aim the next one.
 *
 * @param {object|null} b - The bullet just fired, or null if the shot did not happen.
 */
function golfOnShot(b) {
	if (!_golf.active || !b) return;
	if (_golf.pause > 0) return;         // between holes: not a stroke
	_golf.strokes++;
	_golf.total++;
	// The stroke runs out after a set distance; the tracer's own life is far longer.
	b.ttl = (golfStrokeRange() * (b.baseEye || 1)) / (b.moveSpeed || 1);
	if (b.trace) { b.trace.lifetime = Infinity; b.trace.linger = Infinity; }
}

/**
 * Per-frame upkeep: runs the banner clock and moves on when a hole is finished.
 * @param {number} dt - Timestep in seconds.
 */
function golfUpdate(dt) {
	// Nothing to do, and nothing to touch: golfStop already hid the card, so reaching into
	// the DOM every frame of every walk would be pure waste.
	if (!_golf.active && _golf.pause <= 0) return;

	if (_golf.holedOut) {
		_golf.holedOut = false;
		_golf.target = null;             // the agent reaped itself by dying
		_golf.parSoFar += GOLF.PAR;
		_golf.pause = GOLF.CELEBRATION;
	}
	if (_golf.pause > 0) {
		_golf.pause = Math.max(0, _golf.pause - dt);
		if (_golf.pause === 0) golfNextHole();
	}
	golfShowHud();
}

/** Re-places the target after a rebuild: its (u, v) no longer means the same place. */
function golfOnSurfaceRebuilt() {
	if (!_golf.active) return;
	golfDropTarget();
	traceClear();
	// The player's frame is invalid until it steps again, and placement measures from it.
	_golf.pause = Math.max(_golf.pause, 0.05);
}

/**
 * Draws the score card.
 */
function golfShowHud() {
	if ((!_golf.active && _golf.pause <= 0) || glo.walkCinema.active) { golfHideHud(); return; }
	let hud = getById('golfHud');
	if (!hud) {
		hud = document.createElement('div');
		hud.id = 'golfHud';
		hud.style.cssText = [
			'position:absolute', 'left:50%', 'bottom:64px', 'transform:translateX(-50%)',
			'z-index:41', 'pointer-events:none', 'padding:6px 16px',
			'font:14px/1.5 monospace', 'color:#e6ebf6', 'text-align:center',
			'background:rgba(12,16,26,.72)', 'border:1px solid rgba(230,235,246,.2)',
			'border-radius:7px', 'white-space:nowrap'
		].join(';');
		walkOverlayHost().appendChild(hud);
	}

	if (!_golf.active && _golf.pause <= 0) {
		const diff = _golf.total - _golf.parSoFar;
		hud.innerHTML = `<b>round over</b> &nbsp;·&nbsp; ${_golf.total} strokes ` +
		                `&nbsp;·&nbsp; ${golfVsPar(diff)}`;
		hud.style.display = 'block';
		return;
	}

	const diff = _golf.total - _golf.parSoFar - _golf.strokes;
	if (_golf.pause > 0) {
		const s = _golf.strokes;
		const name = s === 1 ? 'hole in one' : (s < GOLF.PAR ? 'under par' :
		             s === GOLF.PAR ? 'par' : 'over par');
		hud.innerHTML = `<b style="color:#8fe3ff">${name}</b> &nbsp;·&nbsp; ` +
		                `hole ${_golf.hole} in ${s} &nbsp;·&nbsp; ${golfVsPar(_golf.total - _golf.parSoFar)}`;
	} else {
		hud.innerHTML =
			`<b>hole ${_golf.hole}</b>/${GOLF.HOLES} &nbsp;·&nbsp; par ${GOLF.PAR}` +
			` &nbsp;·&nbsp; strokes <b>${_golf.strokes}</b>` +
			` &nbsp;·&nbsp; ${_golf.reach.toFixed(0)} bodies away` +
			` &nbsp;·&nbsp; ${golfVsPar(diff)}`;
	}
	hud.style.display = 'block';
}

/**
 * Formats a score relative to par.
 * @param {number} diff - Strokes over par; negative is under.
 * @returns {string} Something like `E`, `+2` or `-1`, coloured.
 */
function golfVsPar(diff) {
	if (diff === 0) return '<span style="color:#7fd8a0">E</span>';
	const c = diff < 0 ? '#7fd8a0' : '#f2a56b';
	return `<span style="color:${c}">${diff > 0 ? '+' : ''}${diff}</span>`;
}

/** Hides the score card. */
function golfHideHud() {
	const hud = getById('golfHud');
	if (hud) hud.style.display = 'none';
}