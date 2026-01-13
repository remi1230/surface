/**
 * Classes GPU pour le calcul des paths du ribbon selon différents systèmes de coordonnées
 * Utilise gpu.js 2.16.0 pour effectuer les calculs sur le GPU
 *
 * PRINCIPE : L'expression mathématique est injectée directement dans le code du kernel GPU
 * (comme pour les shaders GLSL). Le kernel est compilé une seule fois, puis le GPU
 * calcule TOUS les points en parallèle. Pas de boucle CPU, pas d'eval par point.
 */

// ==================== INSTANCE GPU GLOBALE ====================

let gpuInstance = null;

function getGPUInstance() {
	if (!gpuInstance) {
		gpuInstance = new GPU({ mode: 'gpu' });
	}
	return gpuInstance;
}

// ==================== TRANSFORMATION D'EXPRESSION ====================

/**
 * Transforme une expression mathématique utilisateur en code compatible gpu.js
 * Les expressions sont transformées pour utiliser les fonctions JavaScript standard
 * qui seront compilées en GLSL par gpu.js
 */
function transformExpressionForGPU(expr) {
	if (!expr || expr.trim() === '') return '0.0';

	let result = expr;

	// Constantes mathématiques - remplacer par les valeurs numériques
	result = result.replace(/\bPI\b/g, '3.14159265358979');
	result = result.replace(/\bpi\b/g, '3.14159265358979');
	result = result.replace(/\bep\b/g, '2.71828182845905');
	result = result.replace(/\be\b(?![xp])/g, '2.71828182845905');
	result = result.replace(/\bQ\b/g, '1.41421356237310'); // sqrt(2)
	result = result.replace(/\bZ\b/g, '1.61803398874989'); // nombre d'or

	// Les fonctions Math.* sont supportées nativement par gpu.js
	// On s'assure que les noms de fonctions sont corrects
	result = result.replace(/\bcos\b/g, 'Math.cos');
	result = result.replace(/\bsin\b/g, 'Math.sin');
	result = result.replace(/\btan\b/g, 'Math.tan');
	result = result.replace(/\bacos\b/g, 'Math.acos');
	result = result.replace(/\basin\b/g, 'Math.asin');
	result = result.replace(/\batan\b/g, 'Math.atan');
	result = result.replace(/\batan2\b/g, 'Math.atan2');
	result = result.replace(/\bsqrt\b/g, 'Math.sqrt');
	result = result.replace(/\bpow\b/g, 'Math.pow');
	result = result.replace(/\bexp\b/g, 'Math.exp');
	result = result.replace(/\blog\b/g, 'Math.log');
	result = result.replace(/\babs\b/g, 'Math.abs');
	result = result.replace(/\bsign\b/g, 'Math.sign');
	result = result.replace(/\bfloor\b/g, 'Math.floor');
	result = result.replace(/\bceil\b/g, 'Math.ceil');
	result = result.replace(/\bmin\b/g, 'Math.min');
	result = result.replace(/\bmax\b/g, 'Math.max');
	result = result.replace(/\bsinh\b/g, 'Math.sinh');
	result = result.replace(/\bcosh\b/g, 'Math.cosh');
	result = result.replace(/\btanh\b/g, 'Math.tanh');

	// Fonction hypot (distance)
	result = result.replace(/\bh\s*\(/g, 'Math.hypot(');
	result = result.replace(/\bhypot\b/g, 'Math.hypot');

	// Opérateur puissance **
	// gpu.js supporte ** nativement

	// Corriger les doubles Math.Math
	result = result.replace(/Math\.Math\./g, 'Math.');

	return result;
}

/**
 * Applique les transformations regex de glo.regs à une expression
 * pour la convertir de la syntaxe raccourcie vers la syntaxe standard
 */
function applyGloRegs(expr) {
	if (!expr || expr.trim() === '') return '0';

	let result = expr;

	// Appliquer les regex de transformation de glo.regs
	for (const reg of glo.regs) {
		result = result.replace(reg.exp, reg.upd);
	}

	return result;
}

// ==================== CLASSE GPU BASE ====================

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

		// Appliquer les transformations regex aux équations
		this.processEquations(equa);
		this.processEquations(equa2);

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
		this.uvInfos = isUV();

		this.equa = equa;
		this.equa2 = equa2;

		// GPU instance
		this.gpu = getGPUInstance();

		// Paramètres UI constants
		this.A = glo.params.A; this.B = glo.params.B;
		this.C = glo.params.C; this.D = glo.params.D;
		this.E = glo.params.E; this.F = glo.params.F;
		this.G = glo.params.G; this.H = glo.params.H;
		this.I = glo.params.I; this.J = glo.params.J;
		this.K = glo.params.K; this.L = glo.params.L;

		// Exécution
		if (onePoint) {
			return this.computeOnePoint();
		} else {
			this.compute();
			this.finalize();
		}
	}

	processEquations(equa) {
		if (!equa) return;
		for (let prop in equa) {
			if (typeof equa[prop] === 'string') {
				equa[prop] = applyGloRegs(equa[prop]);
			}
		}
	}

	/**
	 * Crée et exécute le kernel GPU avec les expressions injectées
	 * À surcharger par les classes filles
	 */
	compute() {
		// À implémenter dans les classes filles
	}

	computeOnePoint() {
		this.compute();
		return this.paths[0] && this.paths[0][1] ? this.paths[0][1] : BABYLON.Vector3.Zero();
	}

	finalize() {
		if (glo.closeFirstWithLastPath && this.paths.length > 0) {
			this.paths.push(this.paths[0]);
		}
		glo.lines = this.paths;
		this.pathsSave = this.paths.slice();
		this.onFinalize();
	}

	onFinalize() {}

	/**
	 * Convertit le résultat GPU (Float32Array 2D) en paths de BABYLON.Vector3
	 */
	convertResultToPaths(gpuResult, stepsU, stepsV) {
		this.paths = [];

		for (let i = 0; i <= stepsU; i++) {
			const path = [];
			for (let j = 0; j <= stepsV; j++) {
				const point = gpuResult[i][j];
				let x = point[0];
				let y = point[1];
				let z = point[2];

				// Gestion des valeurs invalides
				if (!isFinite(x) || isNaN(x)) x = 0;
				if (!isFinite(y) || isNaN(y)) y = 0;
				if (!isFinite(z) || isNaN(z)) z = 0;

				path.push(new BABYLON.Vector3(x, y, z));
			}
			this.paths.push(path);
		}

		if (!this.uvInfos.isV) {
			this.paths[0] = this.paths.flat();
		}
	}

	destroy() {
		if (this.kernel) {
			this.kernel.destroy();
			this.kernel = null;
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

	compute() {
		const stepsU = this.uvInfos.isU ? this.nb_steps_u : 0;
		const stepsV = this.uvInfos.isV ? this.nb_steps_v : 0;

		// Transformer les expressions pour GPU
		const exprX = transformExpressionForGPU(this.equa.x || 'u');
		const exprY = transformExpressionForGPU(this.equa.y || 'v');
		const exprZ = transformExpressionForGPU(this.equa.z || '0');
		const exprAlpha = transformExpressionForGPU(this.equa.alpha || '0');
		const exprBeta = transformExpressionForGPU(this.equa.beta || '0');

		// Construire le code du kernel avec les expressions injectées
		const kernelCode = `function(minU, stepU, minV, stepV, A, B, C, D, E, F, G, H, I, J, K, L) {
			const i = this.thread.y;
			const j = this.thread.x;

			const u = minU + i * stepU;
			const v = minV + j * stepV;

			// Variables auxiliaires
			const d = (j % 2 === 0) ? -1.0 : 1.0;
			const k = (i % 2 === 0) ? -1.0 : 1.0;
			const p = (i % 2 === 0) ? -u : u;
			const t = (j % 2 === 0) ? -v : v;
			const n = i * ${stepsV + 1} + j;

			// Calcul des coordonnées avec les expressions injectées
			let x = ${exprX};
			let y = ${exprY};
			let z = ${exprZ};

			// Rotation si alpha et beta sont définis
			const alpha = ${exprAlpha};
			const beta = ${exprBeta};

			if (alpha !== 0.0 && beta !== 0.0) {
				// Rotation par quaternion simplifiée
				const cosA = Math.cos(alpha);
				const sinA = Math.sin(alpha);
				const cosB = Math.cos(beta);
				const sinB = Math.sin(beta);

				// Rotation autour de Y puis Z
				const x1 = x * cosB - z * sinB;
				const z1 = x * sinB + z * cosB;
				const x2 = x1 * cosA - y * sinA;
				const y2 = x1 * sinA + y * cosA;

				x = x2;
				y = y2;
				z = z1;
			}

			return [x, y, z];
		}`;

		// Créer le kernel à partir du code
		this.kernel = this.gpu.createKernel(eval('(' + kernelCode + ')'))
			.setOutput([stepsV + 1, stepsU + 1])
			.setPipeline(false)
			.setImmutable(true);

		// Exécuter le kernel - UN SEUL APPEL, le GPU calcule tout en parallèle
		const result = this.kernel(
			this.min_u, this.step_u,
			this.min_v, this.step_v,
			this.A, this.B, this.C, this.D,
			this.E, this.F, this.G, this.H,
			this.I, this.J, this.K, this.L
		);

		// Convertir le résultat en paths BABYLON
		this.convertResultToPaths(result, stepsU, stepsV);
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

	compute() {
		const stepsU = this.uvInfos.isU ? this.nb_steps_u : 0;
		const stepsV = this.uvInfos.isV ? this.nb_steps_v : 0;

		// Point de référence
		const p2x = glo.firstPoint.x;
		const p2y = glo.firstPoint.y;
		const p2z = glo.firstPoint.z;

		// Transformer les expressions pour GPU
		const exprR = transformExpressionForGPU(this.equa.r || '1');
		const exprAlpha = transformExpressionForGPU(this.equa.alpha || 'u');
		const exprBeta = transformExpressionForGPU(this.equa.beta || 'v');
		const exprAlpha2 = transformExpressionForGPU(this.equa.alpha2 || '0');
		const exprBeta2 = transformExpressionForGPU(this.equa.beta2 || '0');

		// Construire le code du kernel
		const kernelCode = `function(minU, stepU, minV, stepV, A, B, C, D, E, F, G, H, I, J, K, L, p2x, p2y, p2z) {
			const i = this.thread.y;
			const j = this.thread.x;

			const u = minU + i * stepU;
			const v = minV + j * stepV;

			const d = (j % 2 === 0) ? -1.0 : 1.0;
			const k = (i % 2 === 0) ? -1.0 : 1.0;
			const p = (i % 2 === 0) ? -u : u;
			const t = (j % 2 === 0) ? -v : v;
			const n = i * ${stepsV + 1} + j;

			// Calcul des paramètres sphériques
			let r = ${exprR};
			const alpha = ${exprAlpha};
			const beta = ${exprBeta};

			if (!isFinite(r)) r = 0.0;

			// Point initial mis à l'échelle
			let px = p2x * r;
			let py = p2y * r;
			let pz = p2z * r;

			// Rotation sphérique (autour de Y pour beta, autour de Z pour alpha)
			const cosAlpha = Math.cos(alpha);
			const sinAlpha = Math.sin(alpha);
			const cosBeta = Math.cos(beta);
			const sinBeta = Math.sin(beta);

			// Rotation autour de Y (beta)
			let x1 = px * cosBeta + pz * sinBeta;
			let y1 = py;
			let z1 = -px * sinBeta + pz * cosBeta;

			// Rotation autour de Z (alpha)
			let x = x1 * cosAlpha - y1 * sinAlpha;
			let y = x1 * sinAlpha + y1 * cosAlpha;
			let z = z1;

			// Rotation secondaire si définie
			const alpha2 = ${exprAlpha2};
			const beta2 = ${exprBeta2};

			if (alpha2 !== 0.0 && beta2 !== 0.0) {
				const cosA2 = Math.cos(alpha2);
				const sinA2 = Math.sin(alpha2);
				const cosB2 = Math.cos(beta2);
				const sinB2 = Math.sin(beta2);

				const x2 = x * cosB2 - z * sinB2;
				const z2 = x * sinB2 + z * cosB2;
				const x3 = x2 * cosA2 - y * sinA2;
				const y3 = x2 * sinA2 + y * cosA2;

				x = x3;
				y = y3;
				z = z2;
			}

			return [x, y, z];
		}`;

		this.kernel = this.gpu.createKernel(eval('(' + kernelCode + ')'))
			.setOutput([stepsV + 1, stepsU + 1])
			.setPipeline(false)
			.setImmutable(true);

		const result = this.kernel(
			this.min_u, this.step_u,
			this.min_v, this.step_v,
			this.A, this.B, this.C, this.D,
			this.E, this.F, this.G, this.H,
			this.I, this.J, this.K, this.L,
			p2x, p2y, p2z
		);

		this.convertResultToPaths(result, stepsU, stepsV);
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

	compute() {
		const stepsU = this.uvInfos.isU ? this.nb_steps_u : 0;
		const stepsV = this.uvInfos.isV ? this.nb_steps_v : 0;

		const p2x = glo.firstPoint.x;
		const p2y = glo.firstPoint.y;

		const exprR = transformExpressionForGPU(this.equa.r || '1');
		const exprAlpha = transformExpressionForGPU(this.equa.alpha || 'u');
		const exprBeta = transformExpressionForGPU(this.equa.beta || 'v');
		const exprAlpha2 = transformExpressionForGPU(this.equa.alpha2 || '0');
		const exprBeta2 = transformExpressionForGPU(this.equa.beta2 || '0');

		const kernelCode = `function(minU, stepU, minV, stepV, A, B, C, D, E, F, G, H, I, J, K, L, p2x, p2y) {
			const i = this.thread.y;
			const j = this.thread.x;

			const u = minU + i * stepU;
			const v = minV + j * stepV;

			const d = (j % 2 === 0) ? -1.0 : 1.0;
			const k = (i % 2 === 0) ? -1.0 : 1.0;
			const p = (i % 2 === 0) ? -u : u;
			const t = (j % 2 === 0) ? -v : v;
			const n = i * ${stepsV + 1} + j;

			let r = ${exprR};
			const alpha = ${exprAlpha};
			const beta = ${exprBeta};

			if (!isFinite(r)) r = 0.0;

			// Point initial mis à l'échelle
			let px = p2x * r;
			let py = p2y * r;

			// Rotation autour de Z (coordonnées cylindriques)
			const cosAlpha = Math.cos(alpha);
			const sinAlpha = Math.sin(alpha);

			let x = px * cosAlpha - py * sinAlpha;
			let y = px * sinAlpha + py * cosAlpha;
			let z = beta; // Hauteur

			// Rotation secondaire
			const alpha2 = ${exprAlpha2};
			const beta2 = ${exprBeta2};

			if (alpha2 !== 0.0 && beta2 !== 0.0) {
				const cosA2 = Math.cos(alpha2);
				const sinA2 = Math.sin(alpha2);
				const cosB2 = Math.cos(beta2);
				const sinB2 = Math.sin(beta2);

				const x2 = x * cosB2 - z * sinB2;
				const z2 = x * sinB2 + z * cosB2;
				const x3 = x2 * cosA2 - y * sinA2;
				const y3 = x2 * sinA2 + y * cosA2;

				x = x3;
				y = y3;
				z = z2;
			}

			return [x, y, z];
		}`;

		this.kernel = this.gpu.createKernel(eval('(' + kernelCode + ')'))
			.setOutput([stepsV + 1, stepsU + 1])
			.setPipeline(false)
			.setImmutable(true);

		const result = this.kernel(
			this.min_u, this.step_u,
			this.min_v, this.step_v,
			this.A, this.B, this.C, this.D,
			this.E, this.F, this.G, this.H,
			this.I, this.J, this.K, this.L,
			p2x, p2y
		);

		this.convertResultToPaths(result, stepsU, stepsV);
	}

	onFinalize() {
		this.paths = this.uvInfos.isV ? closedPaths(this.paths) : this.paths;
	}
}

// ==================== SYSTÈME PAR COURBURE GPU ====================

/**
 * Note: Le système par courbure est intrinsèquement séquentiel car chaque point
 * dépend du précédent. On utilise quand même le GPU pour les calculs trigonométriques
 * mais avec une approche différente utilisant un scan parallèle (prefix sum).
 */
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

	compute() {
		const stepsU = this.uvInfos.isU ? this.nb_steps_u : 0;
		const stepsV = this.uvInfos.isV ? this.nb_steps_v : 0;

		const exprR = transformExpressionForGPU(this.equa.r || '1');
		const exprAlpha = transformExpressionForGPU(this.equa.alpha || 'u');
		const exprBeta = transformExpressionForGPU(this.equa.beta || 'v');

		// Étape 1: Calculer les déplacements locaux (dx, dy, dz) pour chaque point
		const kernelDeltas = `function(minU, stepU, minV, stepV, A, B, C, D, E, F, G, H, I, J, K, L) {
			const i = this.thread.y;
			const j = this.thread.x;

			const u = minU + i * stepU;
			const v = minV + j * stepV;

			const d = (j % 2 === 0) ? -1.0 : 1.0;
			const k = (i % 2 === 0) ? -1.0 : 1.0;
			const p = (i % 2 === 0) ? -u : u;
			const t = (j % 2 === 0) ? -v : v;
			const n = i * ${stepsV + 1} + j;

			let r = ${exprR};
			const alpha = ${exprAlpha};
			const beta = ${exprBeta};

			if (!isFinite(r)) r = 0.0;

			// Direction selon alpha et beta
			const cosAlpha = Math.cos(alpha);
			const sinAlpha = Math.sin(alpha);
			const cosBeta = Math.cos(beta);
			const sinBeta = Math.sin(beta);

			// Déplacement local
			const dx = r * cosAlpha * cosBeta;
			const dy = r * sinAlpha * cosBeta;
			const dz = r * sinBeta;

			return [dx, dy, dz];
		}`;

		const deltaKernel = this.gpu.createKernel(eval('(' + kernelDeltas + ')'))
			.setOutput([stepsV + 1, stepsU + 1])
			.setPipeline(false);

		const deltas = deltaKernel(
			this.min_u, this.step_u,
			this.min_v, this.step_v,
			this.A, this.B, this.C, this.D,
			this.E, this.F, this.G, this.H,
			this.I, this.J, this.K, this.L
		);

		// Étape 2: Prefix sum (scan) pour accumuler les positions
		// Pour le système par courbure, chaque ligne (u fixe) est indépendante
		// donc on peut paralléliser sur u et faire le scan séquentiellement sur v
		this.paths = [];
		this.moyPos = { x: 0, y: 0, z: 0 };
		let pointCount = 0;

		for (let i = 0; i <= stepsU; i++) {
			const path = [];
			let x = 0, y = 0, z = 0;

			if (glo.params.curvaturetoZero) {
				path.push(BABYLON.Vector3.Zero());
			}

			for (let j = 0; j <= stepsV; j++) {
				const delta = deltas[i][j];
				x += delta[0];
				y += delta[1];
				z += delta[2];

				// Gestion des valeurs invalides
				if (!isFinite(x)) x = 0;
				if (!isFinite(y)) y = 0;
				if (!isFinite(z)) z = 0;

				path.push(new BABYLON.Vector3(x, y, z));

				this.moyPos.x += x;
				this.moyPos.y += y;
				this.moyPos.z += z;
				pointCount++;
			}
			this.paths.push(path);
		}

		// Centrer
		if (pointCount > 1) {
			this.moyPos.x /= pointCount;
			this.moyPos.y /= pointCount;
			this.moyPos.z /= pointCount;
			offsetPathsByMoyPos(this.paths, this.moyPos);
		}

		deltaKernel.destroy();

		if (!this.uvInfos.isV) {
			this.paths[0] = this.paths.flat();
		}
	}

	onFinalize() {
		this.paths = this.uvInfos.isV ? closedPaths(this.paths) : this.paths;
	}
}

// ==================== FACTORY ET UTILITAIRES ====================

/**
 * Factory pour créer la classe appropriée selon le mode GPU/CPU
 */
function getCurveClassGPU(coordsType) {
	const classes = {
		'cartesian': CurvesCartesianGPU,
		'spheric': CurvesSphericalGPU,
		'cylindrical': CurvesCylindricalGPU,
		'curvature': CurvesByCurvatureGPU,
	};
	return classes[coordsType] || CurvesCartesianGPU;
}

/**
 * Crée une instance de courbe GPU
 */
function createCurvesGPU(coordsType, parametres, equa, equa2, dim_one, fractalize, onePoint) {
	const CurveClass = getCurveClassGPU(coordsType);
	return new CurveClass(parametres, equa, equa2, dim_one, fractalize, onePoint);
}

/**
 * Récupère les positions calculées sous forme de Float32Array
 */
function getPositionsFromCurvesGPU(curves) {
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
 * Crée un VertexData Babylon.js à partir des courbes GPU calculées
 */
function createVertexDataFromCurvesGPU(curves) {
	const vertexData = new BABYLON.VertexData();
	const paths = curves.paths;
	const positions = [];
	const indices = [];
	const normals = [];

	// Aplatir les paths en positions
	for (const path of paths) {
		for (const point of path) {
			positions.push(point.x, point.y, point.z);
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

	BABYLON.VertexData.ComputeNormals(positions, indices, normals);
	vertexData.normals = normals;

	return vertexData;
}

// ==================== CLASSE KERNEL DYNAMIQUE PURE ====================

/**
 * Classe utilitaire pour créer des kernels GPU avec des expressions arbitraires
 * sans avoir à recréer tout le système de classes
 */
class GPUMeshComputer {
	constructor(options = {}) {
		this.gpu = getGPUInstance();
		this.options = Object.assign({
			minU: -Math.PI,
			maxU: Math.PI,
			minV: -Math.PI,
			maxV: Math.PI,
			stepsU: 64,
			stepsV: 64,
		}, options);

		this.kernel = null;
	}

	/**
	 * Compile et exécute un kernel avec les expressions données
	 * @param {string} exprX - Expression pour X
	 * @param {string} exprY - Expression pour Y
	 * @param {string} exprZ - Expression pour Z
	 * @param {object} params - Paramètres additionnels (A, B, C, etc.)
	 * @returns {Float32Array} Positions [x,y,z,x,y,z,...]
	 */
	compute(exprX, exprY, exprZ, params = {}) {
		const { minU, maxU, minV, maxV, stepsU, stepsV } = this.options;
		const stepU = (maxU - minU) / stepsU;
		const stepV = (maxV - minV) / stepsV;

		// Transformer les expressions
		const tExprX = transformExpressionForGPU(exprX || 'u');
		const tExprY = transformExpressionForGPU(exprY || 'v');
		const tExprZ = transformExpressionForGPU(exprZ || '0');

		// Paramètres avec valeurs par défaut
		const A = params.A || 0, B = params.B || 0, C = params.C || 0, D = params.D || 0;
		const E = params.E || 0, F = params.F || 0, G = params.G || 1, H = params.H || 1;
		const I = params.I || 1, J = params.J || 1, K = params.K || 1, L = params.L || 1;

		const kernelCode = `function(minU, stepU, minV, stepV, A, B, C, D, E, F, G, H, I, J, K, L) {
			const i = this.thread.y;
			const j = this.thread.x;

			const u = minU + i * stepU;
			const v = minV + j * stepV;

			const d = (j % 2 === 0) ? -1.0 : 1.0;
			const k = (i % 2 === 0) ? -1.0 : 1.0;
			const p = (i % 2 === 0) ? -u : u;
			const t = (j % 2 === 0) ? -v : v;
			const n = i * ${stepsV + 1} + j;

			const x = ${tExprX};
			const y = ${tExprY};
			const z = ${tExprZ};

			return [x, y, z];
		}`;

		// Détruire l'ancien kernel si existant
		if (this.kernel) {
			this.kernel.destroy();
		}

		this.kernel = this.gpu.createKernel(eval('(' + kernelCode + ')'))
			.setOutput([stepsV + 1, stepsU + 1])
			.setPipeline(false);

		const result = this.kernel(minU, stepU, minV, stepV, A, B, C, D, E, F, G, H, I, J, K, L);

		// Convertir en Float32Array
		const totalPoints = (stepsU + 1) * (stepsV + 1);
		const positions = new Float32Array(totalPoints * 3);
		let idx = 0;

		for (let i = 0; i <= stepsU; i++) {
			for (let j = 0; j <= stepsV; j++) {
				const point = result[i][j];
				positions[idx++] = isFinite(point[0]) ? point[0] : 0;
				positions[idx++] = isFinite(point[1]) ? point[1] : 0;
				positions[idx++] = isFinite(point[2]) ? point[2] : 0;
			}
		}

		return positions;
	}

	/**
	 * Version qui retourne des paths de BABYLON.Vector3
	 */
	computePaths(exprX, exprY, exprZ, params = {}) {
		const positions = this.compute(exprX, exprY, exprZ, params);
		const { stepsU, stepsV } = this.options;
		const paths = [];

		let idx = 0;
		for (let i = 0; i <= stepsU; i++) {
			const path = [];
			for (let j = 0; j <= stepsV; j++) {
				path.push(new BABYLON.Vector3(
					positions[idx],
					positions[idx + 1],
					positions[idx + 2]
				));
				idx += 3;
			}
			paths.push(path);
		}

		return paths;
	}

	destroy() {
		if (this.kernel) {
			this.kernel.destroy();
			this.kernel = null;
		}
	}
}
