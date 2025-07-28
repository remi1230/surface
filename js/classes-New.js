/**
 * Classe mère qui gère la génération commune des courbes.
 * La méthode computePoint est décomposée en sous‑fonctions redéfinissables.
 */
class CurveBase {
	constructor(parametres = { 
		u: {min: -glo.params.u, max: glo.params.u, nb_steps: glo.params.steps_u, },
		v: {min: -glo.params.v, max: glo.params.v, nb_steps: glo.params.steps_v, },
	}, fractalize = false, onePoint = false) {
	  this.fractalize = fractalize;
	  this.onePoint   = onePoint;
	  this.initUVParameters(parametres);
	  this.paths = [];
	  this.lines = [];

	  //this.generatePaths();
	}
  
	// Initialisation commune des paramètres UV
	initUVParameters(parametres) {
	  this.min_u      = !glo.slidersUVOnOneSign.u ? parametres.u.min : 0;
	  this.max_u      = parametres.u.max;
	  this.nb_steps_u = paramsOrFractNbPaths('u', parametres.u.nb_steps, this.fractalize);
	  this.step_u     = (this.max_u - this.min_u) / this.nb_steps_u;
  
	  this.min_v      = !glo.slidersUVOnOneSign.v ? parametres.v.min : 0;
	  this.max_v      = parametres.v.max;
	  this.nb_steps_v = paramsOrFractNbPaths('v', parametres.v.nb_steps, this.fractalize);
	  this.step_v     = (this.max_v - this.min_v) / this.nb_steps_v;
	}
  
	// Construit la chaîne d'affectation pour les variables d'interface
	buildVarUI() {
	  const varNames = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
	  return varNames.map(v => `${v} = glo.params.${v};`).join(" ");
	}
  
	// Crée une fonction d'évaluation à partir d'une chaîne de code
	createEvalFunction(code, includeVarUI = true) {
	  const fullCode = (includeVarUI ? this.buildVarUI() + " " : "") + "return " + code;
	  const paramNames = [
		"u", "v", "x", "y", "z", "d", "k", "p", "t", "n", "i", "j",
		"O", "T", "xN", "yN", "zN", "$N", "xT", "yT", "zT", "$T"
	  ];
	  return new Function(...paramNames, fullCode);
	}
  
	/* 
	 * Sous‑fonction 1 : calcul des coordonnées initiales.
	 * Par défaut, retourne {x, y, z} à 0 et d'autres valeurs simples.
	 * Dans les classes filles, cette méthode sera redéfinie pour utiliser
	 * (par exemple) des fonctions d'évaluation dynamiques.
	 */
	computeInitialCoordinates(u, v, i, j) {
	  const d = (j % 2 === 0) ? -1 : 1;
	  const k = (i % 2 === 0) ? -1 : 1;
	  const p = (i % 2 === 0) ? -u : u;
	  const t = (j % 2 === 0) ? -v : v;
	  const n = 0;
	  return { x: 0, y: 0, z: 0, d, k, p, t, n };
	}
  
	// Sous‑fonction 2 : calcul des normales et d'autres angles
	computeNormalAndAngles(coords) {
	  let { O, T, xN, yN, zN, $N, xT, yT, zT, $T } = makeCommonCurveVariables();
	  coords.O = O;
	  coords.T = T;
	  coords.xN = xN;
	  coords.yN = yN;
	  coords.zN = zN;
	  coords.$N = $N;
	  coords.xT = xT;
	  coords.yT = yT;
	  coords.zT = zT;
	  coords.$T = $T;
	  return coords;
	}
  
	// Sous‑fonction 3 : application d'une rotation par quaternion si nécessaire
	applyQuaternionRotation(coords) {
	  if (this.evalAlpha2 && this.evalBeta2) {
		const alpha = this.evalAlpha2(coords.u, coords.v, coords.x, coords.y, coords.z, coords.O, coords.T, coords.xN, coords.yN, coords.zN, coords.$N, coords.xT, coords.yT, coords.zT, coords.$T);
		const beta  = this.evalBeta2(coords.u, coords.v, coords.x, coords.y, coords.z, coords.O, coords.T, coords.xN, coords.yN, coords.zN, coords.$N, coords.xT, coords.yT, coords.zT, coords.$T);
		const posRot = rotateByQuaternion(coords.x, coords.y, coords.z, alpha, beta);
		coords.x = posRot.x;
		coords.y = posRot.y;
		coords.z = posRot.z;
	  }
	  return coords;
	}

	// Sous‑fonction 4 : application d'une rotation par quaternion si nécessaire
	applyRotation(coords) {
	  if (this.evalAlpha || this.evalBeta || this.evalTheta) {
		let alpha = 0, beta = 0, theta = 0;

		if(this.evalAlpha){
			alpha = this.evalAlpha(coords.u, coords.v, coords.x, coords.y, coords.z, coords.O, coords.T, coords.xN, coords.yN, coords.zN, coords.$N, coords.xT, coords.yT, coords.zT, coords.$T);
		}
		if(this.evalBeta){
			beta = this.evalBeta(coords.u, coords.v, coords.x, coords.y, coords.z, coords.O, coords.T, coords.xN, coords.yN, coords.zN, coords.$N, coords.xT, coords.yT, coords.zT, coords.$T);
		}
		if(this.evalTheta){
			theta = this.evalBeta(coords.u, coords.v, coords.x, coords.y, coords.z, coords.O, coords.T, coords.xN, coords.yN, coords.zN, coords.$N, coords.xT, coords.yT, coords.zT, coords.$T);
		}

		const posRot = rotateOnCenterByBabylonMatrix(coords, alpha, beta, theta);

		coords.x = posRot.x;
		coords.y = posRot.y;
		coords.z = posRot.z;
	  }
	  return coords;
	}
  
	// Sous‑fonction 5 : appliquer des transformations supplémentaires (ex. f2)
	applyAdditionalTransformations(coords, u, v) {
	  const isX = (glo.params.text_input_suit_x !== "");
	  const isY = (glo.params.text_input_suit_y !== "");
	  const isZ = (glo.params.text_input_suit_z !== "");
	  if (isX && this.f2 && this.f2.x) {
		const x2 = eval(this.f2.x);
		!glo.secondCurveOperation ? coords.x += x2 : coords.x = x2;
	  }
	  if (isY && this.f2 && this.f2.y) {
		const y2 = eval(this.f2.y);
		!glo.secondCurveOperation ? coords.y += y2 : coords.y = y2;
	  }
	  if (isZ && this.f2 && this.f2.z) {
		const z2 = eval(this.f2.z);
		!glo.secondCurveOperation ? coords.z += z2 : coords.z = z2;
	  }
	  return coords;
	}
  
	// Sous‑fonction 6: opérations finales (blending, inversion, permutation, etc.)
	finalizePointCalculation(coords, u, v) {
	  let posBlended = blendPosAll(coords.x, coords.y, coords.z, u, v, coords.O, Math.cos(u), Math.cos(v));
	  posBlended = functionIt(posBlended.x, posBlended.y, posBlended.z);
	  posBlended = invPos(posBlended.x, posBlended.y, posBlended.z);
	  posBlended = invPosIf(posBlended.x, posBlended.y, posBlended.z);
	  posBlended = permutSign(posBlended.x, posBlended.y, posBlended.z);
	  if (glo.additiveSurface) {
		posBlended.x += glo.savePos.x;
		posBlended.y += glo.savePos.y;
		posBlended.z += glo.savePos.z;
		glo.savePos.x = posBlended.x;
		glo.savePos.y = posBlended.y;
		glo.savePos.z = posBlended.z;
	  }
	  return posBlended;
	}
  
	// Méthode globale qui enchaîne les étapes précédentes
	computePoint(u, v, i, j) {
	  let coords = this.computeInitialCoordinates(u, v, i, j);
	  // On stocke u et v dans l'objet pour que les sous‑fonctions puissent y accéder
	  coords.u = u;
	  coords.v = v;
	  coords = this.computeNormalAndAngles(coords);
	  coords = this.applyQuaternionRotation(coords);
	  coords = this.applyRotation(coords);
	  coords = this.applyAdditionalTransformations(coords, u, v);
	  const finalCoords = this.finalizePointCalculation(coords, u, v);
	  // Màj d'informations éventuelles dans glo
	  glo.currentCurveInfos.vect = new BABYLON.Vector3(finalCoords.x, finalCoords.y, finalCoords.z);
	  return new BABYLON.Vector3(finalCoords.x, finalCoords.y, finalCoords.z);
	}
  
	// Génère la liste des chemins en itérant sur u et v
	generatePaths() {
	  const uvInfos = isUV();
	  let u = this.min_u - this.step_u;
	  const stepsU = uvInfos.isU ? this.nb_steps_u : 0;
	  for (let i = 0; i <= stepsU; i++) {
		u += this.step_u;
		let path = [];
		let v = this.min_v - this.step_v;
		const stepsV = uvInfos.isV ? this.nb_steps_v : 0;
		for (let j = 0; j <= stepsV; j++) {
		  v += this.step_v;
		  const point = this.computePoint(u, v, i, j);
		  path.push(point);
		}
		this.paths.push(path);
	  }
	  // Si v n'est pas utilisé, aplatir le tableau
	  if (!uvInfos.isV && this.paths.length > 0) {
		this.paths[0] = this.paths.flat();
	  }
	  if (!this.onePoint) {
		if (glo.closeFirstWithLastPath) { 
		  this.paths.push(this.paths[0]);
		}
		glo.lines = this.paths;
		this.pathsSave = this.paths.slice();
		this.paths = uvInfos.isV ? closedPaths(this.paths) : this.paths;
	  }
	  return this.paths;
	}
  }
  
  /* =========================================================================
	 Classe Curves (pour coordonnées cartésiennes)
	 On redéfinit notamment computeInitialCoordinates pour utiliser les fonctions
	 d'évaluation dynamiques (evalX, evalY, evalZ).
  ======================================================================== */
  class Curves extends CurveBase {
	constructor(parametres, f = {
		x: glo.params.text_input_x,
		y: glo.params.text_input_y,
		z: glo.params.text_input_z,
		alpha: glo.params.text_input_alpha,
		beta: glo.params.text_input_beta,
	}, f2 = {
		x: glo.params.text_input_suit_x,
		y: glo.params.text_input_suit_y,
		z: glo.params.text_input_suit_z,
		alpha: glo.params.text_input_suit_alpha,
		beta: glo.params.text_input_suit_beta,
		theta: glo.params.text_input_suit_theta,
	}, dim_one, fractalize = false, onePoint = false) {
	  super(parametres, fractalize, onePoint);
  
	  // Enregistrement des formules et des évaluations
	  reg(f);
	  reg(f2);
	  let f3 = { evalX: glo.input_eval_x.text, evalY: glo.input_eval_y.text };
	  reg(f3);
  
	  this.evalX      = this.createEvalFunction(f.x, true);
	  this.evalY      = this.createEvalFunction(f.y);
	  this.evalZ      = this.createEvalFunction(f.z);

	  if(f2.alpha){ this.evalAlpha = this.createEvalFunction(f2.alpha); }
	  if(f2.beta) { this.evalBeta  = this.createEvalFunction(f2.beta);  }
	  if(f2.theta){ this.evalTheta = this.createEvalFunction(f2.theta); }

	  if(f.alpha){ this.evalAlpha2 = this.createEvalFunction(f.alpha); }
	  if(f.beta) { this.evalBeta2  = this.createEvalFunction(f.beta); }
  
	  this.f2 = f2;
	  this.f3 = f3;
	}
  
	// Utilisation des fonctions dynamiques pour calculer le point initial
	computeInitialCoordinates(u, v, i, j) {
	  const d = (j % 2 === 0) ? -1 : 1;
	  const k = (i % 2 === 0) ? -1 : 1;
	  const p = (i % 2 === 0) ? -u : u;
	  const t = (j % 2 === 0) ? -v : v;
	  const n = 0;
	  // On prépare les arguments pour les fonctions d'évaluation
	  let { O, T, xN, yN, zN, $N, xT, yT, zT, $T } = makeCommonCurveVariables();
	  const args = [u, v, 0, 0, 0, d, k, p, t, n, i, j, O, T, xN, yN, zN, $N, xT, yT, zT, $T];
	  const x = this.evalX(...args);
	  const y = this.evalY(...args);
	  const z = this.evalZ(...args);
	  return { x, y, z, d, k, p, t, n };
	}
  }
  
  /* =========================================================================
	 Classe CurvesByRot (pour coordonnées sphériques ou cylindriques)
	 On adapte le calcul initial en fonction de la transformation par rotation.
  ======================================================================== */
  class CurvesByRot extends CurveBase {
	constructor(parametres, f = {
		r: glo.params.text_input_x,
		alpha: glo.params.text_input_y,
		beta: glo.params.text_input_z,
		alpha2: glo.params.text_input_alpha,
		beta2: glo.params.text_input_beta,
	}, f2 = {
		x: glo.params.text_input_suit_x,
		y: glo.params.text_input_suit_y,
		z: glo.params.text_input_suit_z,
		alpha: glo.params.text_input_suit_alpha,
		beta: glo.params.text_input_suit_beta,
		theta: glo.params.text_input_suit_theta,
	}, dim_one, fractalize = false, onePoint = false) {
	  super(parametres, fractalize, onePoint);
	  this.cyl = (glo.coordsType === 'cylindrical');
	  reg(f);
	  reg(f2);
	  let f3 = { evalX: glo.input_eval_x.text, evalY: glo.input_eval_y.text };
	  reg(f3);
  
	  this.p1_first = BABYLON.Vector3.Zero();
	  this.p2_first = glo.firstPoint;
  
	  this.evalR      = new Function("u", "v", "x", "y", "z", "O", "T", "xN", "yN", "zN", "$N", "xT", "yT", "zT", "$T", "return " + f.r);
	  this.evalAlpha  = new Function("u", "v", "x", "y", "z", "O", "T", "xN", "yN", "zN", "$N", "xT", "yT", "zT", "$T", "return " + f.alpha);
	  this.evalBeta   = new Function("u", "v", "x", "y", "z", "O", "T", "xN", "yN", "zN", "$N", "xT", "yT", "zT", "$T", "return " + f.beta);
	  if(f.alpha2 && f.beta2){
		this.evalAlpha2 = new Function("u", "v", "x", "y", "z", "O", "T", "xN", "yN", "zN", "$N", "xT", "yT", "zT", "$T", "return " + f.alpha2);
	  	this.evalBeta2  = new Function("u", "v", "x", "y", "z", "O", "T", "xN", "yN", "zN", "$N", "xT", "yT", "zT", "$T", "return " + f.beta2);
	  }
	  this.f2 = f2;
	  this.f3 = f3;
	}
  
	// Calcul initial spécifique pour la rotation
	computeInitialCoordinates(u, v, i, j) {
	  const d = (j % 2 === 0) ? -1 : 1;
	  const k = (i % 2 === 0) ? -1 : 1;
	  const p = (i % 2 === 0) ? -u : u;
	  const t = (j % 2 === 0) ? -v : v;
	  const n = 0;
	  // Eventuellement récupérer des évaluations complémentaires
	  let x = 0, y = 0, z = 0;
	  if (this.f3.evalX) { x = eval(this.f3.evalX); }
	  if (this.f3.evalY) { y = eval(this.f3.evalY); }
	  let { O, T, xN, yN, zN, $N, xT, yT, zT, $T } = makeCommonCurveVariables();
	  const args = [u, v, 0, 0, 0, d, k, p, t, n, i, j, O, T, xN, yN, zN, $N, xT, yT, zT, $T];
	  let r = this.evalR(...args);
	  if (r === Infinity || isNaN(r)) { r = 0; }
	  const alpha = this.evalAlpha(...args);
	  const beta  = this.evalBeta(...args);

	  let pos = {x,y,z};
	  if (!this.cyl) {
		pos = rotateOnCenterByBabylonMatrix({ x: this.p2_first.x * r, y: this.p2_first.y * r, z: this.p2_first.z * r }, 0, beta, alpha);
		/*pos.x = r * Math.sin(alpha) * Math.cos(beta);
		pos.y = r * Math.sin(alpha) * Math.sin(beta);
		pos.z = r * Math.cos(alpha);*/
	  }
	  else {
		pos = rotateOnCenterByBabylonMatrix({ x: this.p2_first.x * r, y: this.p2_first.y * r, z: this.p2_first.z * r }, 0, 0, alpha);
		pos.z = beta;
	  }
	  return { x: pos.x, y: pos.y, z: pos.z, d, k, p, t, n };
	}
  }
  
  /* =========================================================================
	 Classe CurvesByCurvature (pour le cas où la courbure détermine la trajectoire)
  ======================================================================== */
  class CurvesByCurvature extends CurveBase {
	constructor(parametres, f = {
		r: glo.params.text_input_x,
		alpha: glo.params.text_input_y,
		beta: glo.params.text_input_z,
		alpha2: glo.params.text_input_alpha,
		beta2: glo.params.text_input_beta,
	}, f2 = {
		x: glo.params.text_input_suit_x,
		y: glo.params.text_input_suit_y,
		z: glo.params.text_input_suit_z,
		alpha: glo.params.text_input_suit_alpha,
		beta: glo.params.text_input_suit_beta,
		theta: glo.params.text_input_suit_theta,
	}, dim_one, fractalize = false, onePoint = false) {
	  super(parametres, fractalize, onePoint);
	  reg(f);
	  reg(f2);
	  let f3 = { evalX: glo.input_eval_x.text, evalY: glo.input_eval_y.text };
	  reg(f3);
  
	  this.p1_first = BABYLON.Vector3.Zero();
	  this.p2_first = glo.firstPoint;
  
	  this.evalR      = new Function("u", "v", "x", "y", "z", "O", "T", "xN", "yN", "zN", "$N", "xT", "yT", "zT", "$T", "return " + f.r);
	  this.evalAlpha  = new Function("u", "v", "x", "y", "z", "O", "T", "xN", "yN", "zN", "$N", "xT", "yT", "zT", "$T", "return " + f.alpha);
	  this.evalBeta   = new Function("u", "v", "x", "y", "z", "O", "T", "xN", "yN", "zN", "$N", "xT", "yT", "zT", "$T", "return " + f.beta);
	  if(f.alpha2 && f.beta2){
		this.evalAlpha2 = new Function("u", "v", "x", "y", "z", "O", "T", "xN", "yN", "zN", "$N", "xT", "yT", "zT", "$T", "return " + f.alpha2);
		this.evalBeta2  = new Function("u", "v", "x", "y", "z", "O", "T", "xN", "yN", "zN", "$N", "xT", "yT", "zT", "$T", "return " + f.beta2);
	  }
	  this.f2 = f2;
	  this.f2 = f2;
	  this.f3 = f3;
	}
  
	// Pour la courbure, on part d'un point (0,0,0) auquel on ajoute une direction obtenue via directionXY
	computeInitialCoordinates(u, v, i, j) {
	  const d = (j % 2 === 0) ? -1 : 1;
	  const k = (i % 2 === 0) ? -1 : 1;
	  const t = (j % 2 === 0) ? -v : v;
	  const n = 0;
	  let pos = { x: 0, y: 0, z: 0 };
	  let { O, T, xN, yN, zN, $N, xT, yT, zT, $T } = makeCommonCurveVariables();
	  const args = [u, v, pos.x, pos.y, pos.z, d, k, u, v, n, i, j, O, T, xN, yN, zN, $N, xT, yT, zT, $T];
	  let r = this.evalR(...args);
	  if (r === Infinity || isNaN(r)) { r = 0; }
	  const alpha = this.evalAlpha(...args);
	  const beta  = this.evalBeta(...args);
	  // On obtient une direction à partir de la fonction directionXY appliquée à (alpha, beta)
	  const dirXY = directionXY({ x: alpha, y: beta }, r);
	  pos.x += dirXY.x;
	  pos.y += dirXY.y;
	  pos.z += dirXY.z;
	  return { x: pos.x, y: pos.y, z: pos.z, d, k, p: u, t, n };
	}
  }

function makeCommonCurveFunctions(){
	return {
		q: function(nu, nv = nu){
			return h(nu * glo.currentCurveInfos.u, nv * glo.currentCurveInfos.v);
		},
		m: function(ncx, ncy, ncz, cnx, cny, cnz, p = glo.currentCurveInfos.vect){
			const x = p.x, y = p.y, z = p.z;
	
			if(ncx === undefined || (ncx === 1 && ncy === undefined)){ ncx = 1; ncy = ncx; ncz = ncx; }
			else if(ncy === undefined){ ncy = ncx; ncz = ncx; }
	
			if(cnx > 1 && cny === undefined){ cny = cnx; cnz = cnx; }
	
			ncz = ncz === undefined ? 1 : ncz;
			ncy = ncy === undefined ? 1 : ncy;
			ncx = ncx === undefined ? 1 : ncx;
	
			cnx = cnx === undefined ? 1 : cnx;
			cny = cny === undefined ? 1 : cny;
			cnz = cnz === undefined ? 1 : cnz;
	
			return cnx*cos(ncx*x)*cny*cos(ncy*y)*cnz*cos(ncz*z);
		},
		mx: function(index = 1, val_to_return = 0, p = glo.currentCurveInfos.currentPath){
			index = parseInt(index);
			if(index <= 0){ index = 1; }
			if(p.length == 0){ return val_to_return; }
			if(p.length < index){ return val_to_return; }

			return p[p.length - index].x;
		},
		my: function(index = 1, val_to_return = 0, p = glo.currentCurveInfos.currentPath){
			index = parseInt(index);
			if(index <= 0){ index = 1; }
			if(p.length == 0){ return val_to_return; }
			if(p.length < index){ return val_to_return; }

			return p[p.length - index].y;
		},
		mz: function(index = 1, val_to_return = 0, p = glo.currentCurveInfos.currentPath){
			index = parseInt(index);
			if(index <= 0){ index = 1; }
			if(p.length == 0){ return val_to_return; }
			if(p.length < index){ return val_to_return; }

			return p[p.length - index].z;
		},
		P: function(modulo = 2, val_to_return = 0, varToUse, ind){
			if(ind%modulo == 0){ return varToUse; }
	
			return val_to_return;
		},
		v_mod: function(modulo = 2, val_to_return = 0, variable = glo.currentCurveInfos.v, index = glo.currentCurveInfos.index_v){
			if(index%modulo == 0){ return variable; }
	
			return val_to_return;
		},
		N: function(index, ...args){ 
			return args[index%args.length]; 
		}
	}
}

function makeCommonCurveVariables(){
	return {
		 x : 0.5,  y : 0.5,  z : 0.5,
		 alpha: 0, beta: 0, theta: 0, alpha2: 0, beta2: 0, alpha3: 0, beta3: 0,
		 xN : 1,  yN : 1,  zN : 1,
		 µN : 1,
		 $N : 1,  µ$N : 1,  $µN : 1,  µµN : 1,  O : 1,  T : 1,
		 xT : 1,  yT : 1,  zT : 1,
		 µT : 1,
		 $T: 1,  µ$T : 1,  $µT : 1,  µµT : 1,
		 rCol : 1,  gCol : 1,  bCol : 1,  mCol : 1,
		 A : glo.params.A,  B : glo.params.B,  C : glo.params.C,  D : glo.params.D,  E : glo.params.E,  F : glo.params.F,  G : glo.params.G,  H : glo.params.H,
		 I : glo.params.I,  J : glo.params.J,  K : glo.params.K,  L : glo.params.L,  M : glo.params.M,
	}
}

function initVarsInObj(obj, cond, val){
	for(let prop in obj){
		if(obj[prop] === cond){ obj[prop] = val; } 
	}
}