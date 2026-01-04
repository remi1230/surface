/**
 * Classes pour le calcul des paths du ribbon selon différents systèmes de coordonnées
 * Architecture : une classe mère CurveBase et 4 classes filles
 */

// ==================== CLASSE MÈRE ====================

class CurveBase {
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

		// Paramètres pour les fonctions dynamiques
		this.paramNames = [
			"u", "v", "w", "x", "y", "z", "d", "k", "p", "t", "n", "i", "j", 'X', 'Y',
			"O", "T", "xN", "yN", "zN", "$N", "xT", "yT", "zT", "$T"
		];

		// Construction de la chaîne d'affectations pour les variables UI
		const varNames = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
		this.varUI = varNames.map(v => `${v} = glo.params.${v};`).join(" ");

		// Création des fonctions d'évaluation communes
		this.evalXExp = this.createEvalFunction(this.equa3.evalX);
		this.evalYExp = this.createEvalFunction(this.equa3.evalY);
		this.evalX2 = this.createEvalFunction(equa2.x);
		this.evalY2 = this.createEvalFunction(equa2.y);
		this.evalZ2 = this.createEvalFunction(equa2.z);
		this.eval2Alpha = this.createEvalFunction(equa2.alpha);
		this.eval2Beta = this.createEvalFunction(equa2.beta);
		this.eval2Theta = this.createEvalFunction(equa2.theta);

		// Création des fonctions d'évaluation spécifiques (à surcharger)
		this.createSpecificEvalFunctions();

		// Points de référence (utilisés par certaines classes filles)
		this.p1_first = new BABYLON.Vector3.Zero;
		this.p2_first = glo.firstPoint;

		// Exécution du calcul
		if (onePoint) {
			return this.computeOnePoint();
		} else {
			this.compute();
			this.finalize();
		}
	}

	createEvalFunction(code, includeVarUI = true) {
		const fullCode = (includeVarUI ? this.varUI + " " : "") + "return " + code;
		return new Function(...this.paramNames, fullCode);
	}

	// Méthode à surcharger par les classes filles
	createSpecificEvalFunctions() {
		// À implémenter dans les classes filles
	}

	// Calcul principal - boucle sur u et v
	compute() {
		let { x, y, z, xN, yN, zN, µN, $N, µ$N, $µN, µµN, O, T, xT, yT, zT, µT, $T, µ$T,
			$µT, µµT, alpha, beta, theta, alpha2, beta2, alpha3, beta3 } = this.vars;

		let d, k, p, t;
		let X, Y;
		let n = 0;
		let path = [];
		let index_u = 0, ind_u = 0, ind_v = 0;

		const stepsU = this.uvInfos.isU ? this.nb_steps_u : 0;
		const stepsV = this.uvInfos.isV ? this.nb_steps_v : 0;

		let u = this.min_u - this.step_u;
		let v = this.min_v - this.step_v;

		const vect3 = new BABYLON.Vector3();

		// État spécifique à la classe (pour CurvesByCurvature)
		this.initComputeState();

		for (let i = 0; i <= stepsU; i++) {
			if (this.additiveSurface) {
				glo.savePos.x = 0; glo.savePos.y = 0; glo.savePos.z = 0;
			}

			// Hook pour début de boucle U (pour CurvesByCurvature)
			this.onStartLoopU(path);

			k = !(i % 2) ? -1 : 1;
			u += this.step_u;
			glo.currentCurveInfos.u = u;
			p = !(i % 2) ? -u : u;
			let index_v = 0;
			ind_u = u;
			v = this.min_v - this.step_v;
			path = [];

			for (let j = 0; j <= stepsV; j++) {
				v += this.step_v;
				ind_v = v;
				glo.currentCurveInfos.v = v;

				d = !(j % 2) ? -1 : 1;
				t = !(j % 2) ? -v : v;

				// Évaluation des expressions X et Y
				if (this.equa3.evalX) {
					X = this.evalXExp(u, v, w, x, y, z, d, k, p, t, n, i, j, X, Y, O, T, xN, yN, zN, $N, xT, yT, zT, $T);
				}
				if (this.equa3.evalY) {
					Y = this.evalYExp(u, v, w, x, y, z, d, k, p, t, n, i, j, X, Y, O, T, xN, yN, zN, $N, xT, yT, zT, $T);
				}

				const args = [u, v, w, x, y, z, d, k, p, t, n, i, j, X, Y, O, T, xN, yN, zN, $N, xT, yT, zT, $T];

				// Calcul spécifique de la position selon le système de coordonnées
				let pos = this.computePosition(args, { x, y, z, alpha, beta, theta, alpha2, beta2, vect3 });
				x = pos.x; y = pos.y; z = pos.z;

				// Calcul de O et T
				O = Math.asin(y / Math.hypot(x, y, z));
				T = Math.atan2(z, x);

				// Calcul du vecteur normal
				vect3.set(x, y, z);
				const vectN = getNormalVector(vect3);
				xN = vectN.x; yN = vectN.y; zN = vectN.z;
				µN = xN * yN * zN;
				$N = (xN + yN + zN) / 3;
				µ$N = µN * $N; $µN = µN + $N;
				µµN = µ$N * $µN;

				// Calcul du vecteur tangent
				const hyp = Math.hypot(x, y, z);
				xT = x / hyp; yT = y / hyp; zT = z / hyp;
				µT = xT * yT * zT;
				$T = (xT + yT + zT) / 3;
				µ$T = µT * $T; $µT = µT + $T;
				µµT = µ$T * $µT;

				// Gestion des valeurs infinies ou NaN
				if (x == Infinity || x == -Infinity || isNaN(x)) { x = 0; }
				if (y == Infinity || y == -Infinity || isNaN(y)) { y = 0; }
				if (z == Infinity || z == -Infinity || isNaN(z)) { z = 0; }

				// Mise à jour des arguments avec les nouvelles valeurs
				const updatedArgs = [u, v, w, x, y, z, d, k, p, t, n, i, j, X, Y, O, T, xN, yN, zN, $N, xT, yT, zT, $T];

				// Rotation primaire (si applicable)
				pos = this.applyPrimaryRotation(updatedArgs, { x, y, z, alpha, beta });
				x = pos.x; y = pos.y; z = pos.z;

				// Application des expressions secondaires
				if (this.isX) {
					const x2 = this.evalX2(...updatedArgs);
					!glo.secondCurveOperation ? x += x2 : x = x2;
				}
				if (this.isY) {
					const y2 = this.evalY2(...updatedArgs);
					!glo.secondCurveOperation ? y += y2 : y = y2;
				}
				if (this.isZ) {
					const z2 = this.evalZ2(...updatedArgs);
					!glo.secondCurveOperation ? z += z2 : z = z2;
				}

				// Rotation secondaire
				alpha2 = this.eval2Alpha(...updatedArgs);
				beta2 = this.eval2Beta(...updatedArgs);
				theta = this.eval2Theta(...updatedArgs);

				if (alpha2 || beta2 || theta) {
					pos = rotateOnCenterByBabylonMatrix({ x, y, z }, alpha2, beta2, theta);
					x = pos.x; y = pos.y; z = pos.z;
				}

				// Post-traitements communs
				pos = blendPosAll(x, y, z, u, v, O, cos(u), cos(v));
				pos = functionIt(pos.x, pos.y, pos.z);
				pos = invPos(pos.x, pos.y, pos.z);
				pos = invPosIf(pos.x, pos.y, pos.z);
				pos = permutSign(pos.x, pos.y, pos.z);

				// Traitement R
				let posByR = { x: pos.x, y: pos.y, z: pos.z };
				if (glo.params.functionIt.r.$T.cos.val || glo.params.functionIt.r.u.sin.val) {
					const rInfos = glo.params.functionIt.r;
					for (let variable in rInfos) {
						for (let prop in rInfos[variable]) {
							const val = rInfos[variable][prop].val;
							if (val) {
								const nb = rInfos[variable][prop].nb;
								posByR = updateRibbonByR(posByR, nb * (prop === 'cos' ? Math.cos(val * $T) : Math.sin(val * u)));
							}
						}
					}
				}
				pos = posByR;

				// Surface additive
				if (glo.additiveSurface) {
					pos.x += glo.savePos.x; pos.y += glo.savePos.y; pos.z += glo.savePos.z;
					glo.savePos.x = pos.x; glo.savePos.y = pos.y; glo.savePos.z = pos.z;
				}

				// Mise à jour de l'état pour la prochaine itération
				x = pos.x; y = pos.y; z = pos.z;

				// Hook post-traitement (pour CurvesByCurvature)
				this.onPointComputed(pos);

				const newVect = new BABYLON.Vector3(pos.x, pos.y, pos.z);
				glo.currentCurveInfos.vect = newVect;

				path.push(newVect);
				glo.currentCurveInfos.currentPath = path;
				index_v++; n++;
				glo.currentCurveInfos.index_v = index_v;
				glo.currentCurveInfos.n = n;
			}

			this.paths.push(path);
			glo.currentCurveInfos.path = path;
			index_u++;
			glo.currentCurveInfos.index_u = index_u;
		}

		if (!this.uvInfos.isV) {
			this.paths[0] = this.paths.flat();
		}
	}

	// Méthodes à surcharger par les classes filles
	initComputeState() {
		// État initial spécifique à la classe
	}

	onStartLoopU(path) {
		// Hook appelé au début de chaque boucle U
	}

	computePosition(args, state) {
		// À implémenter dans les classes filles
		return { x: state.x, y: state.y, z: state.z };
	}

	applyPrimaryRotation(args, state) {
		// Par défaut, pas de rotation primaire
		return { x: state.x, y: state.y, z: state.z };
	}

	onPointComputed(pos) {
		// Hook appelé après le calcul de chaque point
	}

	computeOnePoint() {
		// Calcul d'un seul point
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

		// Hook de finalisation (pour les classes qui ont besoin de traitement supplémentaire)
		this.onFinalize();
	}

	onFinalize() {
		// Hook de finalisation
	}
}

// ==================== SYSTÈME CARTÉSIEN ====================

class CurvesCartesian extends CurveBase {
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

	createSpecificEvalFunctions() {
		this.evalX = this.createEvalFunction(this.equa.x);
		this.evalY = this.createEvalFunction(this.equa.y);
		this.evalZ = this.createEvalFunction(this.equa.z);
		this.evalAlpha = this.createEvalFunction(this.equa.alpha);
		this.evalBeta = this.createEvalFunction(this.equa.beta);

		// Vérifier si N ou T sont utilisés dans les expressions
		this.isN = glo.allControls.haveThisClass('input').some(input => input.text.includes('N'));
		this.isT = glo.allControls.haveThisClass('input').some(input => input.text.includes('T'));
	}

	computePosition(args, state) {
		let x = this.evalX(...args);
		let y = this.evalY(...args);
		let z = this.evalZ(...args);

		return { x, y, z };
	}

	applyPrimaryRotation(args, state) {
		let { x, y, z } = state;
		let alpha, beta;

		if (this.equa.alpha) alpha = this.evalAlpha(...args);
		if (this.equa.beta) beta = this.evalBeta(...args);

		if (alpha && beta) {
			let pos = rotateByQuaternion(x, y, z, alpha, beta);
			return { x: pos.x, y: pos.y, z: pos.z };
		}

		return { x, y, z };
	}
}

// ==================== SYSTÈME SPHÉRIQUE ====================

class CurvesSpherical extends CurveBase {
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

	createSpecificEvalFunctions() {
		this.evalR = this.createEvalFunction(this.equa.r);
		this.evalAlpha = this.createEvalFunction(this.equa.alpha);
		this.evalBeta = this.createEvalFunction(this.equa.beta);
		this.evalAlpha2 = this.createEvalFunction(this.equa.alpha2);
		this.evalBeta2 = this.createEvalFunction(this.equa.beta2);
	}

	computePosition(args, state) {
		let r = this.evalR(...args);
		let alpha = this.evalAlpha(...args);
		let beta = this.evalBeta(...args);

		if (r == Infinity || r == -Infinity || isNaN(r)) { r = 0; }

		// Coordonnées sphériques : rotation autour du point de référence
		let pos = rotateOnCenterByBabylonMatrix(
			{ x: this.p2_first.x * r, y: this.p2_first.y * r, z: this.p2_first.z * r },
			0, beta, alpha
		);

		return { x: pos.x, y: pos.y, z: pos.z };
	}

	applyPrimaryRotation(args, state) {
		let { x, y, z } = state;

		let alpha2 = this.evalAlpha2(...args);
		let beta2 = this.evalBeta2(...args);

		if (alpha2 && beta2) {
			let pos = rotateByQuaternion(x, y, z, alpha2, beta2);
			return { x: pos.x, y: pos.y, z: pos.z };
		}

		return { x, y, z };
	}

	onFinalize() {
		this.paths = this.uvInfos.isV ? closedPaths(this.paths) : this.paths;
	}
}

// ==================== SYSTÈME CYLINDRIQUE ====================

class CurvesCylindrical extends CurveBase {
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

	createSpecificEvalFunctions() {
		this.evalR = this.createEvalFunction(this.equa.r);
		this.evalAlpha = this.createEvalFunction(this.equa.alpha);
		this.evalBeta = this.createEvalFunction(this.equa.beta);
		this.evalAlpha2 = this.createEvalFunction(this.equa.alpha2);
		this.evalBeta2 = this.createEvalFunction(this.equa.beta2);
	}

	computePosition(args, state) {
		let r = this.evalR(...args);
		let alpha = this.evalAlpha(...args);
		let beta = this.evalBeta(...args);

		if (r == Infinity || r == -Infinity || isNaN(r)) { r = 0; }

		// Coordonnées cylindriques : rotation autour de l'axe Z, hauteur = beta
		let pos = rotateOnCenterByBabylonMatrix(
			{ x: this.p2_first.x * r, y: this.p2_first.y * r, z: this.p2_first.z * r },
			0, 0, alpha
		);
		pos.z = beta;

		return { x: pos.x, y: pos.y, z: pos.z };
	}

	applyPrimaryRotation(args, state) {
		let { x, y, z } = state;

		let alpha2 = this.evalAlpha2(...args);
		let beta2 = this.evalBeta2(...args);

		if (alpha2 && beta2) {
			let pos = rotateByQuaternion(x, y, z, alpha2, beta2);
			return { x: pos.x, y: pos.y, z: pos.z };
		}

		return { x, y, z };
	}

	onFinalize() {
		this.paths = this.uvInfos.isV ? closedPaths(this.paths) : this.paths;
	}
}

// ==================== SYSTÈME PAR COURBURE ====================

class CurvesByCurvature extends CurveBase {
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

	createSpecificEvalFunctions() {
		this.evalR = this.createEvalFunction(this.equa.r);
		this.evalAlpha = this.createEvalFunction(this.equa.alpha);
		this.evalBeta = this.createEvalFunction(this.equa.beta);
		this.evalAlpha2 = this.createEvalFunction(this.equa.alpha2);
		this.evalBeta2 = this.createEvalFunction(this.equa.beta2);
	}

	initComputeState() {
		// Position accumulée pour le système par courbure
		this.pos = { x: 0, y: 0, z: 0 };
		this.moyPos = { x: 0, y: 0, z: 0 };
		this.pointCount = 0;
	}

	onStartLoopU(path) {
		// Réinitialiser la position si curvaturetoZero est activé
		if (glo.params.curvaturetoZero) {
			this.pos = { x: 0, y: 0, z: 0 };
			path.push(BABYLON.Vector3.Zero());
		}
	}

	computePosition(args, state) {
		let r = this.evalR(...args);
		let alpha = this.evalAlpha(...args);
		let beta = this.evalBeta(...args);

		if (r == Infinity || r == -Infinity || isNaN(r)) { r = 0; }

		// Système par courbure : accumulation de la position selon la direction
		const dirXY = directionXY({ x: alpha, y: beta }, r);
		this.pos.x += dirXY.x;
		this.pos.y += dirXY.y;
		this.pos.z += dirXY.z;

		return { x: this.pos.x, y: this.pos.y, z: this.pos.z };
	}

	applyPrimaryRotation(args, state) {
		let { x, y, z } = state;

		let alpha2 = this.evalAlpha2(...args);
		let beta2 = this.evalBeta2(...args);

		if (alpha2 && beta2) {
			let pos = rotateByQuaternion(x, y, z, alpha2, beta2);
			// Mettre à jour la position accumulée
			this.pos.x = pos.x;
			this.pos.y = pos.y;
			this.pos.z = pos.z;
			return { x: pos.x, y: pos.y, z: pos.z };
		}

		return { x, y, z };
	}

	onPointComputed(pos) {
		// Accumuler pour le calcul de la position moyenne
		this.moyPos.x += pos.x;
		this.moyPos.y += pos.y;
		this.moyPos.z += pos.z;
		this.pointCount++;
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

// ==================== FONCTIONS UTILITAIRES (conservées de l'original) ====================

function makeCommonCurveVariables() {
	return {
		x: 0.5, y: 0.5, z: 0.5,
		alpha: 0, beta: 0, theta: 0, alpha2: 0, beta2: 0, alpha3: 0, beta3: 0,
		xN: 1, yN: 1, zN: 1,
		µN: 1,
		$N: 1, µ$N: 1, $µN: 1, µµN: 1, O: 1, T: 1,
		xT: 1, yT: 1, zT: 1,
		µT: 1,
		$T: 1, µ$T: 1, $µT: 1, µµT: 1,
		rCol: 1, gCol: 1, bCol: 1, mCol: 1,
		A: glo.params.A, B: glo.params.B, C: glo.params.C, D: glo.params.D, E: glo.params.E, F: glo.params.F, G: glo.params.G, H: glo.params.H,
		I: glo.params.I, J: glo.params.J, K: glo.params.K, L: glo.params.L, M: glo.params.M,
	}
}

function initVarsInObj(obj, cond, val) {
	for (let prop in obj) {
		if (obj[prop] === cond) { obj[prop] = val; }
	}
}