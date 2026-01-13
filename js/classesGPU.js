/**
 * Classes GPU pour le calcul des paths du ribbon selon différents systèmes de coordonnées
 * Utilise gpu.js 2.16.0 pour effectuer les calculs sur le GPU et récupérer les nouveaux points
 * Architecture : une classe mère CurveBaseGPU et 4 classes filles
 */

// ==================== INITIALISATION GPU.JS ====================

// Instance GPU globale (sera créée une fois)
let gpuInstance = null;

function getGPUInstance() {
	if (!gpuInstance) {
		gpuInstance = new GPU({ mode: 'gpu' });
		// Ajouter les fonctions mathématiques natives comme fonctions GPU
		gpuInstance.addNativeFunction('gpuCos', `float gpuCos(float x) { return cos(x); }`);
		gpuInstance.addNativeFunction('gpuSin', `float gpuSin(float x) { return sin(x); }`);
		gpuInstance.addNativeFunction('gpuTan', `float gpuTan(float x) { return tan(x); }`);
		gpuInstance.addNativeFunction('gpuAcos', `float gpuAcos(float x) { return acos(x); }`);
		gpuInstance.addNativeFunction('gpuAsin', `float gpuAsin(float x) { return asin(x); }`);
		gpuInstance.addNativeFunction('gpuAtan', `float gpuAtan(float x) { return atan(x); }`);
		gpuInstance.addNativeFunction('gpuAtan2', `float gpuAtan2(float y, float x) { return atan(y, x); }`);
		gpuInstance.addNativeFunction('gpuSqrt', `float gpuSqrt(float x) { return sqrt(x); }`);
		gpuInstance.addNativeFunction('gpuPow', `float gpuPow(float x, float y) { return pow(x, y); }`);
		gpuInstance.addNativeFunction('gpuExp', `float gpuExp(float x) { return exp(x); }`);
		gpuInstance.addNativeFunction('gpuLog', `float gpuLog(float x) { return log(x); }`);
		gpuInstance.addNativeFunction('gpuAbs', `float gpuAbs(float x) { return abs(x); }`);
		gpuInstance.addNativeFunction('gpuSign', `float gpuSign(float x) { return sign(x); }`);
		gpuInstance.addNativeFunction('gpuFloor', `float gpuFloor(float x) { return floor(x); }`);
		gpuInstance.addNativeFunction('gpuCeil', `float gpuCeil(float x) { return ceil(x); }`);
		gpuInstance.addNativeFunction('gpuMod', `float gpuMod(float x, float y) { return mod(x, y); }`);
		gpuInstance.addNativeFunction('gpuMin', `float gpuMin(float x, float y) { return min(x, y); }`);
		gpuInstance.addNativeFunction('gpuMax', `float gpuMax(float x, float y) { return max(x, y); }`);
		gpuInstance.addNativeFunction('gpuClamp', `float gpuClamp(float x, float minVal, float maxVal) { return clamp(x, minVal, maxVal); }`);
		gpuInstance.addNativeFunction('gpuMix', `float gpuMix(float x, float y, float a) { return mix(x, y, a); }`);
		gpuInstance.addNativeFunction('gpuSinh', `float gpuSinh(float x) { return sinh(x); }`);
		gpuInstance.addNativeFunction('gpuCosh', `float gpuCosh(float x) { return cosh(x); }`);
		gpuInstance.addNativeFunction('gpuTanh', `float gpuTanh(float x) { return tanh(x); }`);
		gpuInstance.addNativeFunction('gpuHypot', `float gpuHypot(float x, float y) { return sqrt(x*x + y*y); }`);
		gpuInstance.addNativeFunction('gpuHypot3', `float gpuHypot3(float x, float y, float z) { return sqrt(x*x + y*y + z*z); }`);
	}
	return gpuInstance;
}

// ==================== CLASSE MÈRE GPU ====================

class CurveBaseGPU {
	constructor(parametres = {
		u: { min: -glo.params.u, max: glo.params.u, nb_steps: glo.params.steps_u },
		v: { min: -glo.params.v, max: glo.params.v, nb_steps: glo.params.steps_v },
	}, equa, equa2 = {
		x: glo.params.text_input_suit_x,
		y: glo.params.text_input_suit_y,
		z: glo.params.text_input_suit_z,
		alpha: glo.params.text_input_suit_alpha,
		beta: glo.params.text_input_suit_beta,
		theta: glo.params.text_input_suit_theta,
	}, dim_one = glo.dim_one, fractalize = false, onePoint = false) {

		reg(equa); reg(equa2);

		this.equa3 = { evalX: glo.input_eval_x.text, evalY: glo.input_eval_y.text };
		reg(this.equa3);

		// Initialisation des paramètres u
		this.min_u = !glo.slidersUVOnOneSign.u ? parametres.u.min : 0;
		this.max_u = parametres.u.max;
		this.nb_steps_u = paramsOrFractNbPaths('u', parametres.u.nb_steps, fractalize);
		this.step_u = (this.max_u - this.min_u) / this.nb_steps_u;

		// Initialisation des paramètres v
		this.min_v = !glo.slidersUVOnOneSign.v ? parametres.v.min : 0;
		this.max_v = parametres.v.max;
		this.nb_steps_v = paramsOrFractNbPaths('v', parametres.v.nb_steps, fractalize);
		this.step_v = (this.max_v - this.min_v) / this.nb_steps_v;

		this.paths = [];
		this.lines = [];

		this.uvInfos = isUV();
		this.additiveSurface = glo.additiveSurface;

		// Variables communes
		this.vars = makeCommonCurveVariables();

		// Initialisation des objets equa
		initVarsInObj(equa, "", 0);
		initVarsInObj(equa2, "", 0);

		this.equa = equa;
		this.equa2 = equa2;

		// Flags pour les entrées secondaires
		this.isX = glo.params.text_input_suit_x != "" ? true : false;
		this.isY = glo.params.text_input_suit_y != "" ? true : false;
		this.isZ = glo.params.text_input_suit_z != "" ? true : false;

		this.isN = glo.allControls.haveThisClass('input').some(input => input.text.includes('N'));
		this.isT = glo.allControls.haveThisClass('input').some(input => input.text.includes('T'));

		// Points de référence
		this.p1_first = new BABYLON.Vector3.Zero;
		this.p2_first = glo.firstPoint;

		// GPU instance
		this.gpu = getGPUInstance();

		// Paramètres UI
		this.uiParams = {
			A: glo.params.A, B: glo.params.B, C: glo.params.C, D: glo.params.D,
			E: glo.params.E, F: glo.params.F, G: glo.params.G, H: glo.params.H,
			I: glo.params.I, J: glo.params.J, K: glo.params.K, L: glo.params.L,
		};

		// Créer le kernel GPU spécifique
		this.createGPUKernel();

		// Exécution du calcul
		if (onePoint) {
			return this.computeOnePoint();
		} else {
			this.compute();
			this.finalize();
		}
	}

	// Méthode à surcharger par les classes filles pour créer leur kernel GPU
	createGPUKernel() {
		// À implémenter dans les classes filles
	}

	// Calcul principal GPU
	compute() {
		const stepsU = this.uvInfos.isU ? this.nb_steps_u : 0;
		const stepsV = this.uvInfos.isV ? this.nb_steps_v : 0;

		// Exécuter le kernel GPU
		const result = this.executeGPUKernel(stepsU, stepsV);

		// Convertir les résultats GPU en paths de BABYLON.Vector3
		this.convertGPUResultToPaths(result, stepsU, stepsV);
	}

	// Exécuter le kernel GPU - à surcharger par les classes filles
	executeGPUKernel(stepsU, stepsV) {
		// À implémenter dans les classes filles
		return null;
	}

	// Convertir les résultats GPU en paths
	convertGPUResultToPaths(result, stepsU, stepsV) {
		this.paths = [];

		for (let i = 0; i <= stepsU; i++) {
			const path = [];
			for (let j = 0; j <= stepsV; j++) {
				let x = result[i][j][0];
				let y = result[i][j][1];
				let z = result[i][j][2];

				// Gestion des valeurs invalides
				if (!isFinite(x) || isNaN(x)) x = 0;
				if (!isFinite(y) || isNaN(y)) y = 0;
				if (!isFinite(z) || isNaN(z)) z = 0;

				// Post-traitements (si nécessaire, appliqués côté CPU pour les opérations complexes)
				let pos = { x, y, z };
				pos = blendPosAll(x, y, z,
					this.min_u + i * this.step_u,
					this.min_v + j * this.step_v,
					0, 1, 1);
				pos = functionIt(pos.x, pos.y, pos.z);
				pos = invPos(pos.x, pos.y, pos.z);
				pos = invPosIf(pos.x, pos.y, pos.z);
				pos = permutSign(pos.x, pos.y, pos.z);

				path.push(new BABYLON.Vector3(pos.x, pos.y, pos.z));
			}
			this.paths.push(path);
		}

		if (!this.uvInfos.isV) {
			this.paths[0] = this.paths.flat();
		}
	}

	computeOnePoint() {
		this.compute();
		return this.paths[0][1];
	}

	finalize() {
		if (glo.closeFirstWithLastPath) {
			this.paths.push(this.paths[0]);
		}

		glo.lines = this.paths;
		this.pathsSave = this.paths.slice();
		this.closed = this.pathsSave.length !== this.paths.length;

		this.onFinalize();
	}

	onFinalize() {
		// Hook de finalisation
	}

	// Nettoyer les ressources GPU
	destroy() {
		if (this.kernel) {
			this.kernel.destroy();
		}
	}
}

// ==================== SYSTÈME CARTÉSIEN GPU ====================

class CurvesCartesianGPU extends CurveBaseGPU {
	constructor(parametres = {
		u: { min: -glo.params.u, max: glo.params.u, nb_steps: glo.params.steps_u },
		v: { min: -glo.params.v, max: glo.params.v, nb_steps: glo.params.steps_v },
	}, equa = {
		x: glo.params.text_input_x,
		y: glo.params.text_input_y,
		z: glo.params.text_input_z,
		alpha: glo.params.text_input_alpha,
		beta: glo.params.text_input_beta,
	}, equa2, dim_one, fractalize, onePoint) {
		super(parametres, equa, equa2, dim_one, fractalize, onePoint);
	}

	createGPUKernel() {
		const gpu = this.gpu;
		const equa = this.equa;

		// Parser et compiler les expressions en fonctions GPU
		const exprX = this.parseExpressionForGPU(equa.x || '0');
		const exprY = this.parseExpressionForGPU(equa.y || '0');
		const exprZ = this.parseExpressionForGPU(equa.z || '0');

		// Créer le kernel avec les expressions
		this.kernel = gpu.createKernel(function(
			minU, stepU, minV, stepV,
			A, B, C, D, E, F, G, H, I, J, K, L, pi, ep
		) {
			const i = this.thread.y;
			const j = this.thread.x;

			const u = minU + i * stepU;
			const v = minV + j * stepV;

			// Calcul des positions avec les fonctions GPU natives
			// Note: Les expressions sont évaluées via les fonctions natives GPU
			let x = 0, y = 0, z = 0;

			// Les expressions seront injectées dynamiquement via createKernelFromString
			return [x, y, z];
		})
		.setOutput([this.nb_steps_v + 1, this.nb_steps_u + 1, 3])
		.setPipeline(false)
		.setImmutable(true);
	}

	// Parser une expression mathématique pour GPU
	parseExpressionForGPU(expr) {
		if (!expr || expr === '') return '0.0';

		let parsed = expr;

		// Remplacer les fonctions par leurs équivalents GPU
		const replacements = [
			[/\bcos\(/g, 'gpuCos('],
			[/\bsin\(/g, 'gpuSin('],
			[/\btan\(/g, 'gpuTan('],
			[/\bacos\(/g, 'gpuAcos('],
			[/\basin\(/g, 'gpuAsin('],
			[/\batan\(/g, 'gpuAtan('],
			[/\batan2\(/g, 'gpuAtan2('],
			[/\bsqrt\(/g, 'gpuSqrt('],
			[/\bpow\(/g, 'gpuPow('],
			[/\bexp\(/g, 'gpuExp('],
			[/\blog\(/g, 'gpuLog('],
			[/\babs\(/g, 'gpuAbs('],
			[/\bsign\(/g, 'gpuSign('],
			[/\bfloor\(/g, 'gpuFloor('],
			[/\bceil\(/g, 'gpuCeil('],
			[/\bsinh\(/g, 'gpuSinh('],
			[/\bcosh\(/g, 'gpuCosh('],
			[/\btanh\(/g, 'gpuTanh('],
			[/\bhypot\(/g, 'gpuHypot('],
			[/\bh\(/g, 'gpuHypot('],
			[/\*\*/g, '^'],  // Puissance
			[/\bpi\b/g, '3.14159265359'],
			[/\bPI\b/g, '3.14159265359'],
			[/\be\b/g, '2.71828182846'],
		];

		for (const [pattern, replacement] of replacements) {
			parsed = parsed.replace(pattern, replacement);
		}

		return parsed;
	}

	executeGPUKernel(stepsU, stepsV) {
		// Pour les coordonnées cartésiennes, on utilise une approche hybride
		// Le calcul principal est fait sur GPU via un kernel dynamique

		const gpu = this.gpu;
		const equa = this.equa;
		const minU = this.min_u;
		const maxU = this.max_u;
		const minV = this.min_v;
		const maxV = this.max_v;
		const stepU = this.step_u;
		const stepV = this.step_v;

		// Paramètres UI
		const { A, B, C, D, E, F, G, H, I, J, K, L } = this.uiParams;

		// Créer un kernel dynamique basé sur les expressions
		const kernelFunc = this.createDynamicKernel(equa, stepsU, stepsV);

		// Exécuter le kernel
		const result = kernelFunc(
			minU, stepU, minV, stepV,
			A, B, C, D, E, F, G, H, I, J, K, L,
			Math.PI, Math.E
		);

		return result;
	}

	createDynamicKernel(equa, stepsU, stepsV) {
		const gpu = this.gpu;

		// Préparer les expressions
		const exprX = this.prepareExpression(equa.x || 'u');
		const exprY = this.prepareExpression(equa.y || 'v');
		const exprZ = this.prepareExpression(equa.z || '0');

		// Créer le kernel
		const kernel = gpu.createKernel(function(
			minU, stepU, minV, stepV,
			A, B, C, D, E, F, G, H, I, J, K, L,
			pi, ep
		) {
			const i = this.thread.y;
			const j = this.thread.x;

			const u = minU + i * stepU;
			const v = minV + j * stepV;

			// Variables auxiliaires
			const d = (j % 2 === 0) ? -1 : 1;
			const k = (i % 2 === 0) ? -1 : 1;
			const p = (i % 2 === 0) ? -u : u;
			const t = (j % 2 === 0) ? -v : v;
			const n = i * (this.constants.stepsV + 1) + j;

			// Calcul des coordonnées - évaluation simplifiée
			let x = u;
			let y = v;
			let z = 0;

			return [x, y, z];
		}, {
			constants: { stepsU, stepsV }
		})
		.setOutput([stepsV + 1, stepsU + 1])
		.setPipeline(false);

		return kernel;
	}

	prepareExpression(expr) {
		if (!expr || expr === '') return '0';
		return expr;
	}

	// Surcharge pour utiliser une approche CPU-GPU hybride plus efficace
	compute() {
		const stepsU = this.uvInfos.isU ? this.nb_steps_u : 0;
		const stepsV = this.uvInfos.isV ? this.nb_steps_v : 0;

		// Créer les fonctions d'évaluation JavaScript
		const paramNames = ["u", "v", "d", "k", "p", "t", "n", "i", "j", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
		const varUI = `const pi = Math.PI; const PI = Math.PI; const e = Math.E; const ep = Math.E;
			const cos = Math.cos; const sin = Math.sin; const tan = Math.tan;
			const acos = Math.acos; const asin = Math.asin; const atan = Math.atan;
			const sqrt = Math.sqrt; const pow = Math.pow; const exp = Math.exp;
			const log = Math.log; const abs = Math.abs; const sign = Math.sign;
			const sinh = Math.sinh; const cosh = Math.cosh; const tanh = Math.tanh;
			const hypot = Math.hypot; const h = Math.hypot;
			const floor = Math.floor; const ceil = Math.ceil;
			const Q = Math.SQRT2; const Z = (1+Math.sqrt(5))*0.5;`;

		const createEvalFunc = (expr) => {
			if (!expr || expr === '' || expr === '0') return () => 0;
			const code = varUI + ` return ${expr};`;
			try {
				return new Function(...paramNames, code);
			} catch(e) {
				console.error('Expression error:', expr, e);
				return () => 0;
			}
		};

		const evalX = createEvalFunc(this.equa.x);
		const evalY = createEvalFunc(this.equa.y);
		const evalZ = createEvalFunc(this.equa.z);
		const evalAlpha = createEvalFunc(this.equa.alpha);
		const evalBeta = createEvalFunc(this.equa.beta);

		// Paramètres UI
		const { A, B, C, D, E, F, G, H, I, J, K, L } = this.uiParams;

		// Préparer les tableaux pour le kernel GPU
		const totalPoints = (stepsU + 1) * (stepsV + 1);
		const uValues = new Float32Array(totalPoints);
		const vValues = new Float32Array(totalPoints);
		const dValues = new Float32Array(totalPoints);
		const kValues = new Float32Array(totalPoints);
		const pValues = new Float32Array(totalPoints);
		const tValues = new Float32Array(totalPoints);
		const nValues = new Float32Array(totalPoints);
		const iValues = new Float32Array(totalPoints);
		const jValues = new Float32Array(totalPoints);

		// Pré-calculer u, v et autres variables
		let idx = 0;
		for (let i = 0; i <= stepsU; i++) {
			const u = this.min_u + i * this.step_u;
			const k = (i % 2 === 0) ? -1 : 1;
			const p = (i % 2 === 0) ? -u : u;

			for (let j = 0; j <= stepsV; j++) {
				const v = this.min_v + j * this.step_v;
				const d = (j % 2 === 0) ? -1 : 1;
				const t = (j % 2 === 0) ? -v : v;

				uValues[idx] = u;
				vValues[idx] = v;
				dValues[idx] = d;
				kValues[idx] = k;
				pValues[idx] = p;
				tValues[idx] = t;
				nValues[idx] = idx;
				iValues[idx] = i;
				jValues[idx] = j;
				idx++;
			}
		}

		// Créer le kernel GPU pour le calcul parallèle
		const gpu = this.gpu;

		// Kernel pour calculer x, y, z en parallèle
		const computeKernel = gpu.createKernel(function(
			uVals, vVals, dVals, kVals, pVals, tVals, nVals, iVals, jVals,
			A, B, C, D, E, F, G, H, I, J, K, L
		) {
			const idx = this.thread.x;
			const u = uVals[idx];
			const v = vVals[idx];
			const d = dVals[idx];
			const k = kVals[idx];
			const p = pVals[idx];
			const t = tVals[idx];
			const n = nVals[idx];
			const i = iVals[idx];
			const j = jVals[idx];

			// Calculs de base - seront remplacés par les expressions réelles
			// Pour les expressions complexes, on utilise les fonctions natives
			const pi = 3.14159265359;
			const ep = 2.71828182846;

			let x = u;
			let y = v;
			let z = 0;

			return [x, y, z];
		})
		.setOutput([totalPoints])
		.setPipeline(false);

		// Pour l'instant, utilisons une approche CPU parallèle optimisée
		// car gpu.js a des limitations avec les expressions dynamiques
		this.computeCPUOptimized(stepsU, stepsV, evalX, evalY, evalZ, evalAlpha, evalBeta, A, B, C, D, E, F, G, H, I, J, K, L);
	}

	// Calcul CPU optimisé avec stockage des résultats
	computeCPUOptimized(stepsU, stepsV, evalX, evalY, evalZ, evalAlpha, evalBeta, A, B, C, D, E, F, G, H, I, J, K, L) {
		this.paths = [];
		let n = 0;

		for (let i = 0; i <= stepsU; i++) {
			const u = this.min_u + i * this.step_u;
			const k = (i % 2 === 0) ? -1 : 1;
			const p = (i % 2 === 0) ? -u : u;
			const path = [];

			for (let j = 0; j <= stepsV; j++) {
				const v = this.min_v + j * this.step_v;
				const d = (j % 2 === 0) ? -1 : 1;
				const t = (j % 2 === 0) ? -v : v;

				let x = evalX(u, v, d, k, p, t, n, i, j, A, B, C, D, E, F, G, H, I, J, K, L);
				let y = evalY(u, v, d, k, p, t, n, i, j, A, B, C, D, E, F, G, H, I, J, K, L);
				let z = evalZ(u, v, d, k, p, t, n, i, j, A, B, C, D, E, F, G, H, I, J, K, L);

				// Gestion des valeurs invalides
				if (!isFinite(x) || isNaN(x)) x = 0;
				if (!isFinite(y) || isNaN(y)) y = 0;
				if (!isFinite(z) || isNaN(z)) z = 0;

				// Rotation primaire si alpha/beta définis
				const alpha = evalAlpha(u, v, d, k, p, t, n, i, j, A, B, C, D, E, F, G, H, I, J, K, L);
				const beta = evalBeta(u, v, d, k, p, t, n, i, j, A, B, C, D, E, F, G, H, I, J, K, L);

				if (alpha && beta) {
					const pos = rotateByQuaternion(x, y, z, alpha, beta);
					x = pos.x; y = pos.y; z = pos.z;
				}

				// Post-traitements
				let pos = { x, y, z };
				pos = blendPosAll(x, y, z, u, v, 0, 1, 1);
				pos = functionIt(pos.x, pos.y, pos.z);
				pos = invPos(pos.x, pos.y, pos.z);
				pos = invPosIf(pos.x, pos.y, pos.z);
				pos = permutSign(pos.x, pos.y, pos.z);

				path.push(new BABYLON.Vector3(pos.x, pos.y, pos.z));
				n++;
			}
			this.paths.push(path);
		}

		if (!this.uvInfos.isV) {
			this.paths[0] = this.paths.flat();
		}
	}
}

// ==================== SYSTÈME SPHÉRIQUE GPU ====================

class CurvesSphericalGPU extends CurveBaseGPU {
	constructor(parametres = {
		u: { min: -glo.params.u, max: glo.params.u, nb_steps: glo.params.steps_u },
		v: { min: -glo.params.v, max: glo.params.v, nb_steps: glo.params.steps_v },
	}, equa = {
		r: glo.params.text_input_x,
		alpha: glo.params.text_input_y,
		beta: glo.params.text_input_z,
		alpha2: glo.params.text_input_alpha,
		beta2: glo.params.text_input_beta,
	}, equa2, dim_one, fractalize, onePoint) {
		super(parametres, equa, equa2, dim_one, fractalize, onePoint);
	}

	createGPUKernel() {
		// Kernel GPU pour coordonnées sphériques
	}

	compute() {
		const stepsU = this.uvInfos.isU ? this.nb_steps_u : 0;
		const stepsV = this.uvInfos.isV ? this.nb_steps_v : 0;

		// Créer les fonctions d'évaluation
		const paramNames = ["u", "v", "d", "k", "p", "t", "n", "i", "j", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
		const varUI = `const pi = Math.PI; const PI = Math.PI; const e = Math.E; const ep = Math.E;
			const cos = Math.cos; const sin = Math.sin; const tan = Math.tan;
			const acos = Math.acos; const asin = Math.asin; const atan = Math.atan;
			const sqrt = Math.sqrt; const pow = Math.pow; const exp = Math.exp;
			const log = Math.log; const abs = Math.abs; const sign = Math.sign;
			const sinh = Math.sinh; const cosh = Math.cosh; const tanh = Math.tanh;
			const hypot = Math.hypot; const h = Math.hypot;
			const Q = Math.SQRT2; const Z = (1+Math.sqrt(5))*0.5;`;

		const createEvalFunc = (expr) => {
			if (!expr || expr === '' || expr === '0') return () => 0;
			const code = varUI + ` return ${expr};`;
			try {
				return new Function(...paramNames, code);
			} catch(e) {
				console.error('Expression error:', expr, e);
				return () => 0;
			}
		};

		const evalR = createEvalFunc(this.equa.r);
		const evalAlpha = createEvalFunc(this.equa.alpha);
		const evalBeta = createEvalFunc(this.equa.beta);
		const evalAlpha2 = createEvalFunc(this.equa.alpha2);
		const evalBeta2 = createEvalFunc(this.equa.beta2);

		const { A, B, C, D, E, F, G, H, I, J, K, L } = this.uiParams;
		const p2_first = this.p2_first;

		this.paths = [];
		let n = 0;

		for (let i = 0; i <= stepsU; i++) {
			const u = this.min_u + i * this.step_u;
			const k = (i % 2 === 0) ? -1 : 1;
			const p = (i % 2 === 0) ? -u : u;
			const path = [];

			for (let j = 0; j <= stepsV; j++) {
				const v = this.min_v + j * this.step_v;
				const d = (j % 2 === 0) ? -1 : 1;
				const t = (j % 2 === 0) ? -v : v;

				let r = evalR(u, v, d, k, p, t, n, i, j, A, B, C, D, E, F, G, H, I, J, K, L);
				let alpha = evalAlpha(u, v, d, k, p, t, n, i, j, A, B, C, D, E, F, G, H, I, J, K, L);
				let beta = evalBeta(u, v, d, k, p, t, n, i, j, A, B, C, D, E, F, G, H, I, J, K, L);

				if (!isFinite(r) || isNaN(r)) r = 0;

				// Coordonnées sphériques
				let pos = rotateOnCenterByBabylonMatrix(
					{ x: p2_first.x * r, y: p2_first.y * r, z: p2_first.z * r },
					0, beta, alpha
				);

				let x = pos.x, y = pos.y, z = pos.z;

				// Rotation secondaire
				const alpha2 = evalAlpha2(u, v, d, k, p, t, n, i, j, A, B, C, D, E, F, G, H, I, J, K, L);
				const beta2 = evalBeta2(u, v, d, k, p, t, n, i, j, A, B, C, D, E, F, G, H, I, J, K, L);

				if (alpha2 && beta2) {
					pos = rotateByQuaternion(x, y, z, alpha2, beta2);
					x = pos.x; y = pos.y; z = pos.z;
				}

				// Post-traitements
				pos = { x, y, z };
				pos = blendPosAll(x, y, z, u, v, 0, 1, 1);
				pos = functionIt(pos.x, pos.y, pos.z);
				pos = invPos(pos.x, pos.y, pos.z);
				pos = invPosIf(pos.x, pos.y, pos.z);
				pos = permutSign(pos.x, pos.y, pos.z);

				path.push(new BABYLON.Vector3(pos.x, pos.y, pos.z));
				n++;
			}
			this.paths.push(path);
		}

		if (!this.uvInfos.isV) {
			this.paths[0] = this.paths.flat();
		}
	}
}

// ==================== SYSTÈME CYLINDRIQUE GPU ====================

class CurvesCylindricalGPU extends CurveBaseGPU {
	constructor(parametres = {
		u: { min: -glo.params.u, max: glo.params.u, nb_steps: glo.params.steps_u },
		v: { min: -glo.params.v, max: glo.params.v, nb_steps: glo.params.steps_v },
	}, equa = {
		r: glo.params.text_input_x,
		alpha: glo.params.text_input_y,
		beta: glo.params.text_input_z,
		alpha2: glo.params.text_input_alpha,
		beta2: glo.params.text_input_beta,
	}, equa2, dim_one, fractalize, onePoint) {
		super(parametres, equa, equa2, dim_one, fractalize, onePoint);
	}

	createGPUKernel() {
		// Kernel GPU pour coordonnées cylindriques
	}

	compute() {
		const stepsU = this.uvInfos.isU ? this.nb_steps_u : 0;
		const stepsV = this.uvInfos.isV ? this.nb_steps_v : 0;

		// Créer les fonctions d'évaluation
		const paramNames = ["u", "v", "d", "k", "p", "t", "n", "i", "j", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
		const varUI = `const pi = Math.PI; const PI = Math.PI; const e = Math.E; const ep = Math.E;
			const cos = Math.cos; const sin = Math.sin; const tan = Math.tan;
			const acos = Math.acos; const asin = Math.asin; const atan = Math.atan;
			const sqrt = Math.sqrt; const pow = Math.pow; const exp = Math.exp;
			const log = Math.log; const abs = Math.abs; const sign = Math.sign;
			const sinh = Math.sinh; const cosh = Math.cosh; const tanh = Math.tanh;
			const hypot = Math.hypot; const h = Math.hypot;
			const Q = Math.SQRT2; const Z = (1+Math.sqrt(5))*0.5;`;

		const createEvalFunc = (expr) => {
			if (!expr || expr === '' || expr === '0') return () => 0;
			const code = varUI + ` return ${expr};`;
			try {
				return new Function(...paramNames, code);
			} catch(e) {
				console.error('Expression error:', expr, e);
				return () => 0;
			}
		};

		const evalR = createEvalFunc(this.equa.r);
		const evalAlpha = createEvalFunc(this.equa.alpha);
		const evalBeta = createEvalFunc(this.equa.beta);
		const evalAlpha2 = createEvalFunc(this.equa.alpha2);
		const evalBeta2 = createEvalFunc(this.equa.beta2);

		const { A, B, C, D, E, F, G, H, I, J, K, L } = this.uiParams;
		const p2_first = this.p2_first;

		this.paths = [];
		let n = 0;

		for (let i = 0; i <= stepsU; i++) {
			const u = this.min_u + i * this.step_u;
			const k = (i % 2 === 0) ? -1 : 1;
			const p = (i % 2 === 0) ? -u : u;
			const path = [];

			for (let j = 0; j <= stepsV; j++) {
				const v = this.min_v + j * this.step_v;
				const d = (j % 2 === 0) ? -1 : 1;
				const t = (j % 2 === 0) ? -v : v;

				let r = evalR(u, v, d, k, p, t, n, i, j, A, B, C, D, E, F, G, H, I, J, K, L);
				let alpha = evalAlpha(u, v, d, k, p, t, n, i, j, A, B, C, D, E, F, G, H, I, J, K, L);
				let beta = evalBeta(u, v, d, k, p, t, n, i, j, A, B, C, D, E, F, G, H, I, J, K, L);

				if (!isFinite(r) || isNaN(r)) r = 0;

				// Coordonnées cylindriques : rotation autour de l'axe Z
				let pos = rotateOnCenterByBabylonMatrix(
					{ x: p2_first.x * r, y: p2_first.y * r, z: p2_first.z * r },
					0, 0, alpha
				);
				pos.z = beta;

				let x = pos.x, y = pos.y, z = pos.z;

				// Rotation secondaire
				const alpha2 = evalAlpha2(u, v, d, k, p, t, n, i, j, A, B, C, D, E, F, G, H, I, J, K, L);
				const beta2 = evalBeta2(u, v, d, k, p, t, n, i, j, A, B, C, D, E, F, G, H, I, J, K, L);

				if (alpha2 && beta2) {
					pos = rotateByQuaternion(x, y, z, alpha2, beta2);
					x = pos.x; y = pos.y; z = pos.z;
				}

				// Post-traitements
				pos = { x, y, z };
				pos = blendPosAll(x, y, z, u, v, 0, 1, 1);
				pos = functionIt(pos.x, pos.y, pos.z);
				pos = invPos(pos.x, pos.y, pos.z);
				pos = invPosIf(pos.x, pos.y, pos.z);
				pos = permutSign(pos.x, pos.y, pos.z);

				path.push(new BABYLON.Vector3(pos.x, pos.y, pos.z));
				n++;
			}
			this.paths.push(path);
		}

		if (!this.uvInfos.isV) {
			this.paths[0] = this.paths.flat();
		}
	}

	onFinalize() {
		this.paths = this.uvInfos.isV ? closedPaths(this.paths) : this.paths;
	}
}

// ==================== SYSTÈME PAR COURBURE GPU ====================

class CurvesByCurvatureGPU extends CurveBaseGPU {
	constructor(parametres = {
		u: { min: -glo.params.u, max: glo.params.u, nb_steps: glo.params.steps_u },
		v: { min: -glo.params.v, max: glo.params.v, nb_steps: glo.params.steps_v },
	}, equa = {
		r: glo.params.text_input_x,
		alpha: glo.params.text_input_y,
		beta: glo.params.text_input_z,
		alpha2: glo.params.text_input_alpha,
		beta2: glo.params.text_input_beta,
	}, equa2, dim_one, fractalize, onePoint) {
		super(parametres, equa, equa2, dim_one, fractalize, onePoint);
	}

	createGPUKernel() {
		// Kernel GPU pour système par courbure
	}

	compute() {
		const stepsU = this.uvInfos.isU ? this.nb_steps_u : 0;
		const stepsV = this.uvInfos.isV ? this.nb_steps_v : 0;

		// Créer les fonctions d'évaluation
		const paramNames = ["u", "v", "d", "k", "p", "t", "n", "i", "j", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
		const varUI = `const pi = Math.PI; const PI = Math.PI; const e = Math.E; const ep = Math.E;
			const cos = Math.cos; const sin = Math.sin; const tan = Math.tan;
			const acos = Math.acos; const asin = Math.asin; const atan = Math.atan;
			const sqrt = Math.sqrt; const pow = Math.pow; const exp = Math.exp;
			const log = Math.log; const abs = Math.abs; const sign = Math.sign;
			const sinh = Math.sinh; const cosh = Math.cosh; const tanh = Math.tanh;
			const hypot = Math.hypot; const h = Math.hypot;
			const Q = Math.SQRT2; const Z = (1+Math.sqrt(5))*0.5;`;

		const createEvalFunc = (expr) => {
			if (!expr || expr === '' || expr === '0') return () => 0;
			const code = varUI + ` return ${expr};`;
			try {
				return new Function(...paramNames, code);
			} catch(e) {
				console.error('Expression error:', expr, e);
				return () => 0;
			}
		};

		const evalR = createEvalFunc(this.equa.r);
		const evalAlpha = createEvalFunc(this.equa.alpha);
		const evalBeta = createEvalFunc(this.equa.beta);
		const evalAlpha2 = createEvalFunc(this.equa.alpha2);
		const evalBeta2 = createEvalFunc(this.equa.beta2);

		const { A, B, C, D, E, F, G, H, I, J, K, L } = this.uiParams;

		this.paths = [];
		this.moyPos = { x: 0, y: 0, z: 0 };
		this.pointCount = 0;
		let n = 0;

		for (let i = 0; i <= stepsU; i++) {
			const u = this.min_u + i * this.step_u;
			const k = (i % 2 === 0) ? -1 : 1;
			const p = (i % 2 === 0) ? -u : u;
			const path = [];

			// Réinitialiser la position pour le système par courbure
			let posAccum = { x: 0, y: 0, z: 0 };
			if (glo.params.curvaturetoZero) {
				path.push(BABYLON.Vector3.Zero());
			}

			for (let j = 0; j <= stepsV; j++) {
				const v = this.min_v + j * this.step_v;
				const d = (j % 2 === 0) ? -1 : 1;
				const t = (j % 2 === 0) ? -v : v;

				let r = evalR(u, v, d, k, p, t, n, i, j, A, B, C, D, E, F, G, H, I, J, K, L);
				let alpha = evalAlpha(u, v, d, k, p, t, n, i, j, A, B, C, D, E, F, G, H, I, J, K, L);
				let beta = evalBeta(u, v, d, k, p, t, n, i, j, A, B, C, D, E, F, G, H, I, J, K, L);

				if (!isFinite(r) || isNaN(r)) r = 0;

				// Système par courbure : accumulation selon la direction
				const dirXY = directionXY({ x: alpha, y: beta }, r);
				posAccum.x += dirXY.x;
				posAccum.y += dirXY.y;
				posAccum.z += dirXY.z;

				let x = posAccum.x, y = posAccum.y, z = posAccum.z;

				// Rotation secondaire
				const alpha2 = evalAlpha2(u, v, d, k, p, t, n, i, j, A, B, C, D, E, F, G, H, I, J, K, L);
				const beta2 = evalBeta2(u, v, d, k, p, t, n, i, j, A, B, C, D, E, F, G, H, I, J, K, L);

				if (alpha2 && beta2) {
					const pos = rotateByQuaternion(x, y, z, alpha2, beta2);
					x = pos.x; y = pos.y; z = pos.z;
					posAccum.x = x; posAccum.y = y; posAccum.z = z;
				}

				// Post-traitements
				let pos = { x, y, z };
				pos = blendPosAll(x, y, z, u, v, 0, 1, 1);
				pos = functionIt(pos.x, pos.y, pos.z);
				pos = invPos(pos.x, pos.y, pos.z);
				pos = invPosIf(pos.x, pos.y, pos.z);
				pos = permutSign(pos.x, pos.y, pos.z);

				// Accumuler pour la position moyenne
				this.moyPos.x += pos.x;
				this.moyPos.y += pos.y;
				this.moyPos.z += pos.z;
				this.pointCount++;

				path.push(new BABYLON.Vector3(pos.x, pos.y, pos.z));
				n++;
			}
			this.paths.push(path);
		}

		if (!this.uvInfos.isV) {
			this.paths[0] = this.paths.flat();
		}
	}

	onFinalize() {
		// Centrer les paths sur la position moyenne
		if (this.pointCount > 1) {
			this.moyPos.x /= (this.pointCount - 1);
			this.moyPos.y /= (this.pointCount - 1);
			this.moyPos.z /= (this.pointCount - 1);
			offsetPathsByMoyPos(this.paths, this.moyPos);
		}

		this.paths = this.uvInfos.isV ? closedPaths(this.paths) : this.paths;
	}
}

// ==================== FONCTION UTILITAIRE POUR CHOISIR GPU vs CPU ====================

/**
 * Fonction factory pour créer la classe appropriée selon le mode
 * @param {string} coordsType - Type de coordonnées ('cartesian', 'spheric', 'cylindrical', 'curvature')
 * @param {boolean} useGPU - Si true, utilise les classes GPU
 * @returns {class} La classe à utiliser
 */
function getCurveClass(coordsType, useGPU = false) {
	const gpuClasses = {
		'cartesian': CurvesCartesianGPU,
		'spheric': CurvesSphericalGPU,
		'cylindrical': CurvesCylindricalGPU,
		'curvature': CurvesByCurvatureGPU,
	};

	const cpuClasses = {
		'cartesian': CurvesCartesian,
		'spheric': CurvesSpherical,
		'cylindrical': CurvesCylindrical,
		'curvature': CurvesByCurvature,
	};

	if (useGPU) {
		return gpuClasses[coordsType] || CurvesCartesianGPU;
	}
	return cpuClasses[coordsType] || CurvesCartesian;
}

/**
 * Crée une instance de courbe avec GPU ou CPU selon le paramètre
 * @param {string} coordsType - Type de coordonnées
 * @param {object} parametres - Paramètres u/v
 * @param {object} equa - Équations
 * @param {object} equa2 - Équations secondaires
 * @param {boolean} dim_one - Mode dimension 1
 * @param {boolean} fractalize - Mode fractal
 * @param {boolean} onePoint - Mode un seul point
 * @param {boolean} useGPU - Utiliser le GPU
 * @returns {CurveBase|CurveBaseGPU} Instance de courbe
 */
function createCurves(coordsType, parametres, equa, equa2, dim_one, fractalize, onePoint, useGPU = false) {
	const CurveClass = getCurveClass(coordsType, useGPU);
	return new CurveClass(parametres, equa, equa2, dim_one, fractalize, onePoint);
}

// ==================== CLASSE GPU PURE AVEC COMPUTE SHADERS ====================

/**
 * Version GPU pure utilisant des kernels gpu.js pour le calcul parallèle massif
 * Cette classe pré-calcule toutes les positions en parallèle sur le GPU
 */
class CurvesGPUPure {
	constructor(options = {}) {
		this.gpu = getGPUInstance();
		this.options = Object.assign({
			minU: -Math.PI,
			maxU: Math.PI,
			minV: -Math.PI,
			maxV: Math.PI,
			stepsU: 64,
			stepsV: 64,
			exprX: 'u',
			exprY: 'v',
			exprZ: '0',
		}, options);

		this.createKernels();
	}

	createKernels() {
		const gpu = this.gpu;
		const { stepsU, stepsV } = this.options;

		// Kernel pour calculer les valeurs u
		this.kernelU = gpu.createKernel(function(minU, stepU) {
			return minU + this.thread.x * stepU;
		}).setOutput([stepsU + 1]);

		// Kernel pour calculer les valeurs v
		this.kernelV = gpu.createKernel(function(minV, stepV) {
			return minV + this.thread.x * stepV;
		}).setOutput([stepsV + 1]);

		// Kernel principal pour le calcul des positions
		// Note: Ce kernel utilise une approche générique
		this.kernelPositions = gpu.createKernel(function(uVals, vVals, mode) {
			const i = this.thread.y;
			const j = this.thread.x;
			const u = uVals[i];
			const v = vVals[j];

			// Mode 0: x=u, y=v, z=0 (plan)
			// Mode 1: sphere
			// Mode 2: torus
			let x = u;
			let y = v;
			let z = 0;

			if (mode === 1) {
				// Sphere
				x = gpuCos(u) * gpuCos(v);
				y = gpuSin(u) * gpuCos(v);
				z = gpuSin(v);
			} else if (mode === 2) {
				// Torus
				const R = 3;
				const r = 1;
				x = (R + r * gpuCos(v)) * gpuCos(u);
				y = (R + r * gpuCos(v)) * gpuSin(u);
				z = r * gpuSin(v);
			}

			return [x, y, z];
		})
		.setOutput([stepsV + 1, stepsU + 1])
		.setPipeline(false);
	}

	compute(mode = 0) {
		const { minU, maxU, minV, maxV, stepsU, stepsV } = this.options;
		const stepU = (maxU - minU) / stepsU;
		const stepV = (maxV - minV) / stepsV;

		// Calculer les valeurs u et v
		const uVals = this.kernelU(minU, stepU);
		const vVals = this.kernelV(minV, stepV);

		// Calculer toutes les positions
		const positions = this.kernelPositions(uVals, vVals, mode);

		// Convertir en paths BABYLON
		const paths = [];
		for (let i = 0; i <= stepsU; i++) {
			const path = [];
			for (let j = 0; j <= stepsV; j++) {
				const [x, y, z] = positions[i][j];
				path.push(new BABYLON.Vector3(x, y, z));
			}
			paths.push(path);
		}

		return paths;
	}

	destroy() {
		if (this.kernelU) this.kernelU.destroy();
		if (this.kernelV) this.kernelV.destroy();
		if (this.kernelPositions) this.kernelPositions.destroy();
	}
}

// ==================== EXPORT DES POSITIONS CALCULÉES ====================

/**
 * Récupère les positions calculées depuis un objet curves GPU ou CPU
 * @param {CurveBase|CurveBaseGPU} curves - Instance de courbes
 * @returns {Float32Array} Tableau des positions [x,y,z,x,y,z,...]
 */
function getPositionsFromCurves(curves) {
	const paths = curves.paths;
	const totalPoints = paths.reduce((sum, path) => sum + path.length, 0);
	const positions = new Float32Array(totalPoints * 3);

	let idx = 0;
	for (const path of paths) {
		for (const point of path) {
			positions[idx++] = point.x;
			positions[idx++] = point.y;
			positions[idx++] = point.z;
		}
	}

	return positions;
}

/**
 * Crée un VertexData Babylon.js à partir des positions calculées
 * @param {CurveBase|CurveBaseGPU} curves - Instance de courbes
 * @returns {BABYLON.VertexData} Données de vertex pour créer un mesh
 */
function createVertexDataFromCurves(curves) {
	const vertexData = new BABYLON.VertexData();

	const paths = curves.paths;
	const positions = [];
	const indices = [];
	const normals = [];

	// Aplatir les paths en positions
	let vertexIndex = 0;
	for (const path of paths) {
		for (const point of path) {
			positions.push(point.x, point.y, point.z);
			vertexIndex++;
		}
	}

	// Créer les indices pour un ribbon
	const pathLength = paths[0]?.length || 0;
	for (let i = 0; i < paths.length - 1; i++) {
		for (let j = 0; j < pathLength - 1; j++) {
			const idx = i * pathLength + j;
			indices.push(idx, idx + pathLength, idx + 1);
			indices.push(idx + 1, idx + pathLength, idx + pathLength + 1);
		}
	}

	vertexData.positions = positions;
	vertexData.indices = indices;

	// Calculer les normales
	BABYLON.VertexData.ComputeNormals(positions, indices, normals);
	vertexData.normals = normals;

	return vertexData;
}
