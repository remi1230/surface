//*****************************************************************************************************//
//***********************************************FONTS*************************************************//
//*****************************************************************************************************//

/**
 * Font readiness for the BabylonJS interface.
 *
 * The whole GUI (panels, sliders, labels, form list) is painted by BabylonJS into a canvas.
 * A canvas never triggers a `@font-face` download by itself: it paints with whatever the
 * document has already loaded, and BabylonJS caches the text metrics it measured. So a
 * Poppins file that arrives late — or not at all — leaves every panel laid out and drawn
 * with the fallback font for the rest of the session, which is what the "degraded interface"
 * looks like.
 *
 * This module makes that state impossible to get stuck in:
 *  - {@link AppFonts.load} asks for the faces the GUI uses, never rejects, never waits forever;
 *  - {@link AppFonts.whenAvailable} keeps trying afterwards, so a font that failed the first
 *    time still ends up applied instead of requiring a reload.
 *
 * @namespace AppFonts
 */
const AppFonts = {
	/** @type {string} Family the BabylonJS controls are styled with (see `styleUI`). */
	family: 'Poppins',

	/**
	 * Weight -> file basename, mirroring the active `@font-face` rules of css/surface.css.
	 * Only the weights actually used by the GUI are listed; asking for a weight that has no
	 * rule would silently resolve against the nearest one and prove nothing.
	 * @type {Object.<number, string>}
	 */
	faces: { 400: 'Poppins-Regular', 600: 'Poppins-SemiBold' },

	/** @type {string} Directory of the font files, relative to index.html. */
	dir: 'fonts/poppins/',

	/** @type {number} How long the boot is allowed to wait for the fonts (ms). */
	timeoutMs: 4000,
	/** @type {number} Delay between two recovery attempts once the boot went on without them (ms). */
	retryMs: 2000,
	/** @type {number} How many recovery attempts before giving up. */
	maxRetries: 15,

	/** @type {boolean} True once every declared weight is usable. */
	ready: false,

	/** @type {HTMLCanvasElement|null} Scratch canvas reused by {@link AppFonts.paintsWith}. */
	_probe: null,

	/**
	 * Tells whether every weight the GUI needs can be painted right now.
	 * @returns {boolean}
	 */
	isAvailable: function () {
		if (document.fonts && typeof document.fonts.check === 'function') {
			try {
				const declared = Object.keys(this.faces).every(function (weight) {
					return document.fonts.check(weight + ' 14px ' + AppFonts.family);
				});
				if (declared) { return true; }
			} catch (err) {
				// check() throws on a malformed font shorthand — fall through to the probe.
			}
		}

		// `check()` answers "are all the *matching* faces loaded", so a `@font-face` whose fetch
		// failed keeps it at false for the life of the document — even after `reinject()` added a
		// working face for the same family. Measuring is the only way to know what a canvas will
		// actually paint with, which is the only thing that matters here.
		return this.paintsWith(this.family);
	},

	/**
	 * Measures whether a canvas really renders with `family` rather than falling back.
	 * @param {string} family - Font family to probe.
	 * @returns {boolean} `true` if the family changes the measured width.
	 */
	paintsWith: function (family) {
		this._probe = this._probe || document.createElement('canvas');

		const ctx = this._probe.getContext('2d');
		if (!ctx) { return false; }

		const sample = 'Symmetrize Catenoïd 0123456789';

		ctx.font = '400 48px monospace';
		const fallbackWidth = ctx.measureText(sample).width;

		ctx.font = "400 48px '" + family + "', monospace";
		return ctx.measureText(sample).width !== fallbackWidth;
	},

	/**
	 * Requests the fonts and waits for them, but never longer than {@link AppFonts.timeoutMs}
	 * and never with a rejection: a missing or stalled font file must not stop the interface
	 * from being built.
	 * @returns {Promise<boolean>} `true` if the fonts are usable, `false` if the GUI is about
	 *                             to be drawn with the fallback.
	 */
	load: async function () {
		if (!document.fonts || typeof document.fonts.load !== 'function') {
			this.ready = false;
			return false;
		}

		const requests = Object.keys(this.faces).map(function (weight) {
			return document.fonts.load(weight + ' 1em ' + AppFonts.family).catch(function () { return null; });
		});

		const timeout = new Promise(function (resolve) { setTimeout(resolve, AppFonts.timeoutMs); });

		await Promise.race([Promise.all(requests), timeout]);

		this.ready = this.isAvailable();
		return this.ready;
	},

	/**
	 * Re-declares the faces from scratch.
	 *
	 * A `@font-face` whose first fetch failed stays in the `error` state for the life of the
	 * document: `document.fonts.load()` then keeps handing back the same rejection without
	 * ever touching the network again. Building fresh `FontFace` objects is the only way to
	 * give the files another chance.
	 * @returns {Promise<void>} Resolves once every retried face has settled.
	 */
	reinject: async function () {
		if (typeof FontFace !== 'function' || !document.fonts) { return; }

		const attempts = Object.keys(this.faces).map(async function (weight) {
			const base = AppFonts.dir + AppFonts.faces[weight];
			const src  = "url('" + base + ".woff2') format('woff2'), " +
			             "url('" + base + ".ttf') format('truetype')";
			try {
				const face = await new FontFace(AppFonts.family, src, { weight: String(weight) }).load();
				document.fonts.add(face);
			} catch (err) {
				// Still unreachable — the next attempt will build another FontFace.
			}
		});

		await Promise.all(attempts);
	},

	/**
	 * Calls `callback` as soon as the fonts become usable — immediately if they already are,
	 * otherwise after a retry that actually re-fetches the files. Gives up silently, apart
	 * from a console warning, after {@link AppFonts.maxRetries} attempts.
	 * @param {Function} callback - Run once, when the fonts are ready.
	 */
	whenAvailable: function (callback) {
		if (this.isAvailable()) {
			this.ready = true;
			callback();
			return;
		}

		let tries = 0;

		const attempt = async function () {
			tries++;
			await AppFonts.reinject();

			if (AppFonts.isAvailable()) {
				AppFonts.ready = true;
				callback();
				return;
			}

			if (tries >= AppFonts.maxRetries) {
				console.warn('[SURFACE] ' + AppFonts.family + ' reste introuvable après ' + tries +
				             ' tentatives : l\'interface garde la police de repli.');
				return;
			}

			setTimeout(attempt, AppFonts.retryMs);
		};

		setTimeout(attempt, this.retryMs);
	},
};
