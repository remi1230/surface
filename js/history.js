//*****************************************************************************************************//
//************************************************HISTORY**********************************************//
//*****************************************************************************************************//

/**
 * Undo/redo history for the user-editable application state.
 *
 * Design notes:
 *  - Snapshots are captured ONLY on user-driven state changes (debounced) — never per render frame.
 *  - The continuous GPU render loop (engine.runRenderLoop in bab.js) is not touched by this module.
 *  - State stored = JSON-serializable subset of `glo.params` + active shaders + form/coords.
 *    Camera, clock, video, themes, lights are intentionally excluded.
 *  - Storage stays bounded (maxSize entries, coalescing of consecutive same-label changes).
 *  - Persisted to localStorage so an undo stack survives a reload (best-effort, errors swallowed).
 *
 * Public API:
 *   History.commit(label?)            — push a snapshot (no-op if state unchanged).
 *   History.commitDebounced(label?)   — push after a quiet period (used by sliders / equation typing).
 *   History.flush()                   — force any pending debounced commit immediately.
 *   History.undo() / History.redo()   — restore previous / next snapshot. Returns boolean.
 *   History.canUndo() / canRedo()     — for UI.
 *   History.reset()                   — empty the stack.
 *   History.onChange(fn)              — subscribe to stack changes (UI refresh).
 */
const History = {
	/** @type {Array<{label:string,state:Object,time:number}>} Stack of past snapshots (last = current). */
	past: [],
	/** @type {Array<{label:string,state:Object,time:number}>} Snapshots available for redo. */
	future: [],

	/** @type {number} Hard cap on stack length to bound memory. */
	maxSize: 100,
	/** @type {number} How long to wait after the last change before snapshotting (ms). */
	debounceMs: 400,
	/** @type {number} Adjacent same-label changes within this window are merged into one entry (ms). */
	coalesceMs: 1500,
	/** @type {string} localStorage key. */
	storageKey: 'surface_history_v1',

	/** @type {boolean} When false, commits are ignored (used during restore). */
	enabled: true,
	/** @type {boolean} While true, commit() is a no-op (set during _applyState). */
	suspended: false,
	/** @type {number|null} Timer id for the pending debounced commit. */
	_pendingTimer: null,
	/** @type {string|null} Label associated with the pending debounced commit. */
	_pendingLabel: null,
	/** @type {Array<Function>} Listeners notified after every stack mutation. */
	_listeners: [],
	/** @type {Object|null} The previous snapshot kept around for diffing change labels. */
	_lastSnapshotForDiff: null,

	/**
	 * Build a JSON-serializable snapshot of the current user state.
	 * @returns {Object}
	 */
	snapshot: function () {
		var formName = (glo.formes && glo.formes.selected && glo.formes.selected[0]) || '';
		var coordsType = glo.coordsType || (glo.formes && glo.formes.selected && glo.formes.selected[1]) || 'cartesian';
		var shaderIndex = glo.numShaderSelect || 0;
		var normalShaderIndex = glo.numNormalShaderSelect || 0;

		var shaderCode = (typeof fragmentShaders !== 'undefined' && fragmentShaders[shaderIndex] != null) ? fragmentShaders[shaderIndex] : '';
		var normalShaderCode = (typeof normalShaders !== 'undefined' && normalShaders[normalShaderIndex] != null) ? normalShaders[normalShaderIndex] : '';

		return {
			params: JSON.parse(JSON.stringify(glo.params)),
			formName: formName,
			coordsType: coordsType,
			shaderIndex: shaderIndex,
			normalShaderIndex: normalShaderIndex,
			shaderCode: shaderCode,
			normalShaderCode: normalShaderCode,
		};
	},

	/**
	 * Compare two snapshots and produce a short human label describing what changed.
	 * Used to auto-label commits when the caller did not provide one.
	 * @param {Object} prev
	 * @param {Object} next
	 * @returns {string}
	 */
	_diffLabel: function (prev, next) {
		if (!prev) { return 'initial'; }
		if (prev.formName !== next.formName) { return 'Form: ' + next.formName; }
		if (prev.coordsType !== next.coordsType) { return 'Coords: ' + next.coordsType; }
		if (prev.shaderIndex !== next.shaderIndex) { return 'Shader #' + next.shaderIndex; }
		if (prev.normalShaderIndex !== next.normalShaderIndex) { return 'NormShader #' + next.normalShaderIndex; }
		if (prev.shaderCode !== next.shaderCode) { return 'Edit shader'; }
		if (prev.normalShaderCode !== next.normalShaderCode) { return 'Edit normal shader'; }

		var p = prev.params || {};
		var n = next.params || {};

		var equationKeys = ['textInputX', 'textInputY', 'textInputZ', 'textInputAlpha', 'textInputBeta', 'textInputTheta', 'textInputSymR'];
		for (var i = 0; i < equationKeys.length; i++) {
			var k = equationKeys[i];
			if (p[k] !== n[k]) {
				return 'Equation ' + k.replace('textInput', '');
			}
		}

		if (p.u !== n.u) { return 'Slider U'; }
		if (p.v !== n.v) { return 'Slider V'; }
		if (p.stepsU !== n.stepsU) { return 'Resolution U'; }
		if (p.stepsV !== n.stepsV) { return 'Resolution V'; }

		var meshLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
		for (var j = 0; j < meshLetters.length; j++) {
			if (p[meshLetters[j]] !== n[meshLetters[j]]) { return 'Var ' + meshLetters[j]; }
		}

		if (p.symmetrizeX !== n.symmetrizeX || p.symmetrizeY !== n.symmetrizeY || p.symmetrizeZ !== n.symmetrizeZ) {
			return 'Symmetry';
		}
		if (JSON.stringify(p.meshTransformations) !== JSON.stringify(n.meshTransformations)) {
			return 'Transform';
		}
		if (JSON.stringify(p.blender) !== JSON.stringify(n.blender)) { return 'Blender'; }
		if (JSON.stringify(p.functionIt) !== JSON.stringify(n.functionIt)) { return 'Waves'; }

		return 'change';
	},

	/**
	 * Push a snapshot onto the history stack.
	 * Skipped silently if state is identical to the current top, or if disabled / suspended.
	 * Coalesces with the previous entry when the same label is committed within `coalesceMs`.
	 * @param {string} [label]
	 */
	commit: function (label) {
		if (!this.enabled || this.suspended) { return; }
		if (this._pendingTimer) { clearTimeout(this._pendingTimer); this._pendingTimer = null; }

		var snap = this.snapshot();
		var top = this.past[this.past.length - 1];
		var topJSON = top ? JSON.stringify(top.state) : null;
		var snapJSON = JSON.stringify(snap);

		if (topJSON === snapJSON) { return; }

		var resolvedLabel = label || this._diffLabel(top ? top.state : null, snap);
		var now = Date.now();

		// Coalesce with the previous entry when same label arrived very recently.
		if (top && top.label === resolvedLabel && (now - top.time) < this.coalesceMs) {
			top.state = snap;
			top.time = now;
		} else {
			this.past.push({ label: resolvedLabel, state: snap, time: now });
			if (this.past.length > this.maxSize) { this.past.shift(); }
		}

		// Any new commit invalidates the redo stack.
		if (this.future.length) { this.future.length = 0; }

		this._lastSnapshotForDiff = snap;
		this._save();
		this._notify();
	},

	/**
	 * Schedule a commit after a quiet period. Repeated calls reset the timer.
	 * Use this for high-frequency events (slider drags, keystrokes).
	 * @param {string} [label]
	 * @param {number} [ms]
	 */
	commitDebounced: function (label, ms) {
		if (!this.enabled || this.suspended) { return; }
		if (this._pendingTimer) { clearTimeout(this._pendingTimer); }
		this._pendingLabel = label || null;
		var self = this;
		this._pendingTimer = setTimeout(function () {
			self._pendingTimer = null;
			self.commit(self._pendingLabel);
			self._pendingLabel = null;
		}, typeof ms === 'number' ? ms : this.debounceMs);
	},

	/** Force any pending debounced commit to fire immediately. */
	flush: function () {
		if (this._pendingTimer) {
			clearTimeout(this._pendingTimer);
			this._pendingTimer = null;
			this.commit(this._pendingLabel);
			this._pendingLabel = null;
		}
	},

	/** @returns {boolean} */
	canUndo: function () { return this.past.length > 1; },
	/** @returns {boolean} */
	canRedo: function () { return this.future.length > 0; },

	/**
	 * Restore the previous snapshot.
	 * Keeps the popped state on the redo stack. Async because mesh rebuild is async.
	 * @returns {Promise<boolean>} True if an undo was performed.
	 */
	undo: async function () {
		this.flush();
		if (this.past.length < 2) { return false; }
		var current = this.past.pop();
		this.future.push(current);
		var target = this.past[this.past.length - 1];
		await this._applyState(target.state);
		this._save();
		this._notify();
		return true;
	},

	/**
	 * Re-apply a snapshot that was previously undone.
	 * @returns {Promise<boolean>} True if a redo was performed.
	 */
	redo: async function () {
		this.flush();
		if (this.future.length === 0) { return false; }
		var entry = this.future.pop();
		this.past.push(entry);
		await this._applyState(entry.state);
		this._save();
		this._notify();
		return true;
	},

	/** Drop all snapshots. */
	reset: function () {
		this.past.length = 0;
		this.future.length = 0;
		this._lastSnapshotForDiff = null;
		this._save();
		this._notify();
	},

	/**
	 * Subscribe to stack changes (post-commit / post-undo / post-redo / post-reset).
	 * @param {Function} fn
	 */
	onChange: function (fn) { this._listeners.push(fn); },

	/**
	 * Apply a snapshot to the live application state.
	 * Mirrors the import/export logic in `applyImportedJSON` (modals.js) but bypasses
	 * the JSON file pipeline. Suspends commits while running so wrappers around
	 * `makeCurves` / `updateFragmentShader` do not push new entries during restore.
	 * @param {Object} state
	 */
	_applyState: async function (state) {
		this.suspended = true;
		try {
			// 1) Restore params (preserve nested meshTransformations methods).
			for (var prop in state.params) {
				if (prop === 'meshTransformations') {
					Object.assign(glo.params.meshTransformations, state.params.meshTransformations);
				} else {
					glo.params[prop] = state.params[prop];
				}
			}

			// 2) Sync controls and inputs.
			if (typeof paramsToControls === 'function') { paramsToControls(); }
			if (glo.inputSymR && !glo.params.textInputSymR) { glo.inputSymR.text = ''; }

			// 3) Restore coordinate system (must match before form selection).
			if (glo.coordsType !== state.coordsType && glo.coordinatesType && typeof glo.coordinatesType.next === 'function') {
				var safety = 8;
				while (glo.coordsType !== state.coordsType && safety-- > 0) {
					glo.coordinatesType.next();
				}
				if (typeof addRadios === 'function') { addRadios(); }
			}

			// 4) Restore form selection (without redrawing — we trigger one rebuild at the end).
			if (state.formName && glo.formes && typeof glo.formes.setFormeSelect === 'function') {
				await glo.formes.setFormeSelect(state.formName, state.coordsType, false);
				if (glo.radiosFormes && typeof glo.radiosFormes.setCheckByName === 'function') {
					glo.radiosFormes.setCheckByName('Radio-' + state.formName);
				}
			}

			// 5) Restore symmetry slider visuals.
			['X', 'Y', 'Z'].forEach(function (axe) {
				if (glo.allControls) {
					var ctrl = glo.allControls.getByName('symmetrize' + axe);
					if (ctrl && glo.params['symmetrize' + axe] !== undefined) {
						ctrl.value = glo.params['symmetrize' + axe];
					}
				}
			});

			// 6) Restore active shader index + edited shader code.
			if (typeof fragmentShaders !== 'undefined' && state.shaderIndex !== undefined && state.shaderIndex < fragmentShaders.length) {
				glo.numShaderSelect = state.shaderIndex;
				if (typeof ShaderCRUD !== 'undefined') {
					ShaderCRUD.currentShaderIndex = state.shaderIndex;
					if (typeof ShaderCRUD.updateSelectValue === 'function') { ShaderCRUD.updateSelectValue(); }
				}
				if (state.shaderCode) { fragmentShaders[state.shaderIndex] = state.shaderCode; }
				if (typeof fragmentShaderHeader !== 'undefined' && typeof fragmentShaderFooter !== 'undefined') {
					fragmentShader = fragmentShaderHeader + fragmentShaders[glo.numShaderSelect] + fragmentShaderFooter;
				}
				if (glo.editor) { glo.editor.setValue(fragmentShader); }
			}

			// 7) Restore active normal shader index + edited code.
			if (typeof normalShaders !== 'undefined' && state.normalShaderIndex !== undefined && state.normalShaderIndex < normalShaders.length) {
				glo.numNormalShaderSelect = state.normalShaderIndex;
				if (typeof ShaderCRUDNormal !== 'undefined') {
					ShaderCRUDNormal.currentShaderIndex = state.normalShaderIndex;
					if (typeof ShaderCRUDNormal.updateSelectValue === 'function') { ShaderCRUDNormal.updateSelectValue(); }
				}
				if (state.normalShaderCode) { normalShaders[state.normalShaderIndex] = state.normalShaderCode; }
				if (glo.editorNormal) {
					if (typeof normalShaderHeader !== 'undefined' && typeof normalShaderFooter !== 'undefined') {
						glo.editorNormal.setValue(normalShaderHeader + normalShaders[glo.numNormalShaderSelect] + normalShaderFooter);
					}
				}
			}

			// 8) Single mesh rebuild and shader push (one GPU recompilation max).
			// Awaited so `suspended` stays true for the whole rebuild — otherwise the
			// wrapped makeCurves would push a redundant commit.
			if (typeof makeCurves === 'function') { await makeCurves(); }

			if (glo.ribbon && glo.ribbon.shaderMeshInstance) {
				if (state.shaderCode && typeof glo.ribbon.shaderMeshInstance.updateFragmentShader === 'function') {
					glo.ribbon.shaderMeshInstance.updateFragmentShader(fragmentShaders[glo.numShaderSelect]);
				}
				if (state.normalShaderCode && typeof glo.ribbon.shaderMeshInstance.updateNormDeformGLSL === 'function') {
					glo.ribbon.shaderMeshInstance.updateNormDeformGLSL(state.normalShaderCode);
				}
			}

			this._lastSnapshotForDiff = state;
		} finally {
			this.suspended = false;
		}
	},

	/** Persist a trimmed copy of the stack to localStorage. Best-effort. */
	_save: function () {
		try {
			var trim = function (arr) { return arr.slice(-30); };
			var data = { past: trim(this.past), future: trim(this.future) };
			localStorage.setItem(this.storageKey, JSON.stringify(data));
		} catch (e) { /* quota or disabled storage — ignore */ }
	},

	/** Hydrate the stack from localStorage, if anything is there. Best-effort. */
	_load: function () {
		try {
			var raw = localStorage.getItem(this.storageKey);
			if (!raw) { return; }
			var data = JSON.parse(raw);
			if (data && Array.isArray(data.past)) { this.past = data.past; }
			if (data && Array.isArray(data.future)) { this.future = data.future; }
		} catch (e) { /* ignore */ }
	},

	/** Run change listeners with the current History instance. */
	_notify: function () {
		for (var i = 0; i < this._listeners.length; i++) {
			try { this._listeners[i](this); } catch (e) { /* ignore listener errors */ }
		}
	},

	/**
	 * Initialize: load any persisted stack. Does not commit anything by itself —
	 * the bootstrap code in events.js is responsible for the initial baseline snapshot.
	 */
	init: function () {
		this._load();
	},
};

// Expose on glo for convenience (UI buttons, debugging).
glo.history = History;
