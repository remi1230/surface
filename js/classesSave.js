function Curves(parametres = { 
	u: {min: -glo.params.u, max: glo.params.u, nb_steps: glo.params.steps_u, },
	v: {min: -glo.params.v, max: glo.params.v, nb_steps: glo.params.steps_v, },
},
equa = {
	x: glo.params.text_input_x,
	y: glo.params.text_input_y,
	z: glo.params.text_input_z,
	alpha: glo.params.text_input_alpha,
	beta: glo.params.text_input_beta,
}, equa2 = {
	x: glo.params.text_input_suit_x,
	y: glo.params.text_input_suit_y,
	z: glo.params.text_input_suit_z,
	alpha: glo.params.text_input_suit_alpha,
	beta: glo.params.text_input_suit_beta,
	theta: glo.params.text_input_suit_theta,
}, dim_one = glo.dim_one, fractalize = false, onePoint = false)
{
	reg(equa); reg(equa2);

	let equa3 = {evalX: glo.input_eval_x.text, evalY: glo.input_eval_y.text};
	reg(equa3);

	this.min_u      = !glo.slidersUVOnOneSign.u ? parametres.u.min : 0;
	this.max_u      = parametres.u.max;
	this.nb_steps_u = paramsOrFractNbPaths('u', parametres.u.nb_steps, fractalize);
	this.step_u     = (this.max_u - this.min_u) / this.nb_steps_u;

	this.min_v      = !glo.slidersUVOnOneSign.v ? parametres.v.min : 0;
	this.max_v      = parametres.v.max;
	this.nb_steps_v = paramsOrFractNbPaths('v', parametres.v.nb_steps, fractalize);
	this.step_v     = (this.max_v - this.min_v) / this.nb_steps_v;

	this.paths = []; let path = []; this.lines = [];

	var {
			x, y, z, xN, yN, zN, µN, $N, µ$N, $µN, µµN, O, T, xT, yT, zT, µT, $T, µ$T,
			$µT, µµT, rCol, gCol, bCol, mCol, A, B, C, D, E, F, G, H, I, K, L, M, alpha,
			beta, theta, alpha2, beta2, alpha3, beta3

	} = makeCommonCurveVariables();

    const uvInfos = isUV();

	initVarsInObj(equa, "", 0); initVarsInObj(equa2, "", 0);

	const isX = glo.params.text_input_suit_x != "" ? true : false;
	const isY = glo.params.text_input_suit_y != "" ? true : false;
	const isZ = glo.params.text_input_suit_z != "" ? true : false;

	let d,k,p,t;

	let X, Y;

	let n = 0;
	let index_u = 0, ind_u = 0;

	const additiveSurface = glo.additiveSurface;

	// Liste commune de paramètres pour les fonctions créées dynamiquement
	const paramNames = [
		"u", "v", "x", "y", "z", "d", "k", "p", "t", "n", "i", "j", 'X', 'Y',
		"O", "T", "xN", "yN", "zN", "$N", "xT", "yT", "zT", "$T"
	];
	
	// Construction de la chaîne d'affectations pour les variables issues de glo.params
	const varNames = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
	const varUI = varNames.map(v => `${v} = glo.params.${v};`).join(" ");
	
	// Fonction factory pour créer les fonctions avec ou sans inclusion de varUI
	function createEvalFunction(code, includeVarUI = true) {
		const fullCode = (includeVarUI ? varUI + " " : "") + "return " + code;
		return new Function(...paramNames, fullCode);
	}
	
	// Création des fonctions dynamiques
	const evalX     = createEvalFunction(equa.x);
	const evalY     = createEvalFunction(equa.y);
	const evalZ     = createEvalFunction(equa.z);
	const evalAlpha = createEvalFunction(equa.alpha);
	const evalBeta  = createEvalFunction(equa.beta);
	const evalTheta = createEvalFunction(equa2.theta);

	const stepsU = uvInfos.isU ? this.nb_steps_u : 0;
	const stepsV = uvInfos.isV ? this.nb_steps_v : 0;
	let u = this.min_u - this.step_u, v = this.min_v - this.step_v, ind_v = 0;
	for (let i = 0; i <= stepsU; i++) {
		if(additiveSurface){ glo.savePos.x = 0; glo.savePos.y = 0; glo.savePos.z = 0; }
		k = !(i%2) ? -1 : 1;
		u += this.step_u;
		p = !(i%2) ? -u : u;
		glo.currentCurveInfos.u = u;
		path = [];
		let index_v = 0; ind_u = u; v = this.min_v - this.step_v;
		for (let j = 0; j <= stepsV; j++) {
			v += this.step_v;
			ind_v = v;
			glo.currentCurveInfos.v = v;

			d = !(j%2) ? -1 : 1;
			t = !(j%2) ? -v : v;

			if(equa3.evalX){ X = eval(equa3.evalX); }
			if(equa3.evalY){ Y = eval(equa3.evalY); }

			const args = [u, v, x, y, z, d, k, p, t, n, i, j, X, Y, O, T, xN, yN, zN, $N, xT, yT, zT, $T];
			x = evalX(...args);
			y = evalY(...args);
			z = evalZ(...args);

			const vect3 = new BABYLON.Vector3(x,y,z);
			const vectN = getNormalVector(vect3);
			xN  = vectN.x; yN = vectN.y; zN = vectN.z;
			µN  = xN*yN*zN;
			$N  = (xN+yN+zN)/3;
			µ$N = µN*$N; var $µN = µN+$N;
			µµN = µ$N*$µN;

			O = Math.asin(y / h(x,y,z));
			T = Math.atan2(z, x) ;

			const vectT = BABYLON.Vector3.Normalize(new BABYLON.Vector3(x,y,z));
			xT  = vectT.x; yT = vectT.y; zT = vectT.z;
			µT  = xT*yT*zT;
			$T  = (xT+yT+zT)/3;
			µ$T = µT*$T; var $µT = µT+$T;
			µµT = µ$T*$µT;

			if(x == Infinity || x == -Infinity || isNaN(x)){ x = 0; }
			if(y == Infinity || y == -Infinity || isNaN(y)){ y = 0; }
			if(z == Infinity || z == -Infinity || isNaN(z)){ z = 0; }

			alpha = evalAlpha(u, v, x, y, z, O, T, xN, yN, zN, $N, xT, yT, zT, $T);
			beta  = evalBeta(u, v, x, y, z, O, T, xN, yN, zN, $N, xT, yT, zT, $T);
			theta = evalTheta(u, v, x, y, z, O, T, xN, yN, zN, $N, xT, yT, zT, $T);
			
			if(alpha && beta){
				let pos = rotateByQuaternion(x, y, z, alpha, beta);
				x = pos.x; y = pos.y; z = pos.z;
			}

			if(isX){ const x2 = eval(equa2.x); !glo.secondCurveOperation ? x += x2 : x = x2; }
			if(isY){ const y2 = eval(equa2.y); !glo.secondCurveOperation ? y += y2 : y = y2; }
			if(isZ){ const z2 = eval(equa2.z); !glo.secondCurveOperation ? z += z2 : z = z2; }

			alpha2 = eval(equa2.alpha);
			beta2  = eval(equa2.beta);
			let pos = rotateOnCenterByBabylonMatrix({x, y, z}, alpha2, beta2, theta);
			x = pos.x; y = pos.y; z = pos.z;

			var {x, y, z} = blendPosAll(x, y, z, u, v, O, cos(u), cos(v));
			var {x, y, z} = functionIt(x, y, z);
			var {x, y, z} = invPos(x, y, z);
			var {x, y, z} = invPosIf(x, y, z);
			var {x, y, z} = permutSign(x, y, z);

			let posByR = {x, y, z};
			const rInfos = glo.params.functionIt.r;
			for(let variable in rInfos){
				for(let prop in rInfos[variable]){
					const val = rInfos[variable][prop].val;
					if(val){
						const nb = rInfos[variable][prop].nb;
						const eq = prop + `(${nb}*${variable})`;
						posByR = updateRibbonByR(posByR, val * eval(eq));
					}
				}
			}
			var {x, y, z} = posByR;

			if(glo.additiveSurface){
				x += glo.savePos.x; y += glo.savePos.y; z += glo.savePos.z;
				glo.savePos.x = x; glo.savePos.y = y; glo.savePos.z = z;
			}

			const newVect = new BABYLON.Vector3(x, y, z);
			glo.currentCurveInfos.vect = newVect;

			path.push(newVect);
			glo.currentCurveInfos.currentPath = path;
			index_v++; n++;
			glo.currentCurveInfos.index_v = index_v;
			glo.currentCurveInfos.n = n;
		}
		this.paths.push(path);
		index_u++;
		glo.currentCurveInfos.index_u = index_u;
	}

	if(!uvInfos.isV){ this.paths[0] = this.paths.flat(); }

  if(!onePoint){
	if(glo.closeFirstWithLastPath){ this.paths.push(this.paths[0]); }
	glo.lines = this.paths;

	this.pathsSave = this.paths.slice();
	this.paths     = uvInfos.isV ? closedPaths(this.paths) : this.paths;

	this.closed = this.pathsSave.length !== this.paths.length;
  }
  else{
	return this.paths[0][1];
  }
}

function CurvesByRot(parametres = {
	u: {min: -glo.params.u, max: glo.params.u, nb_steps: glo.params.steps_u, },
	v: {min: -glo.params.v, max: glo.params.v, nb_steps: glo.params.steps_v, },
},
f = {
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
}, dim_one = glo.dim_one, fractalize = false, onePoint = false)
{
	var cyl = false;
	if(glo.coordsType == 'cylindrical'){ cyl = true; }

	var {
			x, y, z, xN, yN, zN, µN, $N, µ$N, $µN, µµN, O, T, xT, yT, zT, µT, $T, µ$T,
			$µT, µµT, rCol, gCol, bCol, mCol, A, B, C, D, E, F, G, H, I, K, L, M, alpha,
			beta, theta, alpha2, beta2, alpha3, beta3

	} = makeCommonCurveVariables();

	reg(f);
	reg(f2);

	let f3 = {evalX: glo.input_eval_x.text, evalY: glo.input_eval_y.text};
	reg(f3);

	this.p1_first = new BABYLON.Vector3.Zero;
	this.p2_first = glo.firstPoint;

	this.min_u 		= !glo.slidersUVOnOneSign.u ? parametres.u.min : 0;
	this.max_u 		= parametres.u.max;
	this.nb_steps_u = paramsOrFractNbPaths('u', parametres.u.nb_steps, fractalize);
	this.step_u 	= (this.max_u - this.min_u) / this.nb_steps_u;

	this.min_v 		= !glo.slidersUVOnOneSign.v ? parametres.v.min : 0;
	this.max_v 		= parametres.v.max;
	this.nb_steps_v = paramsOrFractNbPaths('v', parametres.v.nb_steps, fractalize);
	this.step_v 	= (this.max_v - this.min_v) / this.nb_steps_v;

	this.paths = [];
	this.lines = [];

    const uvInfos = isUV();

	initVarsInObj(f, "", 0); initVarsInObj(f2, "", 0);

	const isX = glo.params.text_input_suit_x != "" ? true : false;
	const isY = glo.params.text_input_suit_y != "" ? true : false;
	const isZ = glo.params.text_input_suit_z != "" ? true : false;

	let d, k, p, t;
	let X, Y;

	const additiveSurface = glo.additiveSurface;

	const evalR = new Function("u", "v", "x", "y", "z", "O", "T", "xN", "yN", "zN", "$N", "xT", "yT", "zT", "$T", "return " + f.x);
	const evalY = new Function("u", "v", "x", "y", "z", "O", "T", "xN", "yN", "zN", "$N", "xT", "yT", "zT", "$T", "return " + f.y);
	const evalZ = new Function("u", "v", "x", "y", "z", "O", "T", "xN", "yN", "zN", "$N", "xT", "yT", "zT", "$T", "return " + f.z);

	let n = 0;
	let path = [];
	let index_u = 0, ind_u = 0, ind_v = 0;
	const stepsU = uvInfos.isU ? this.nb_steps_u : 0;
	const stepsV = uvInfos.isV ? this.nb_steps_v : 0;
	let u = this.min_u - this.step_u, v = this.min_v - this.step_v;
	for (let i = 0; i <= stepsU; i++) {
		if(additiveSurface){ glo.savePos.x = 0; glo.savePos.y = 0; glo.savePos.z = 0; }
		k = !(i%2) ? -1 : 1;
		u += this.step_u;
		glo.currentCurveInfos.u = u;
		p = !(i%2) ? -u : u;
		let index_v = 0; ind_u = u;
		v = this.min_v - this.step_v;
		for (let j = 0; j <= stepsV; j++) {
			v += this.step_v;
			ind_v = v;
			glo.currentCurveInfos.v = v;

			d = !(j%2) ? -1 : 1;
			t = !(j%2) ? -v : v;

			if(f3.evalX){ X = eval(f3.evalX); }
			if(f3.evalY){ Y = eval(f3.evalY); }

			r     = eval(f.r);
			alpha = eval(f.alpha);
			beta  = eval(f.beta);

			if(r == Infinity || r == -Infinity || isNaN(r)){ r = 0; }

			let pos;
			if(!cyl){
				pos = rotateOnCenterByBabylonMatrix({x: this.p2_first.x * r, y: this.p2_first.y * r, z: this.p2_first.z * r}, 0, beta, alpha);
			}
			else{
				pos = rotateOnCenterByBabylonMatrix({x: this.p2_first.x * r, y: this.p2_first.y * r, z: this.p2_first.z * r}, 0, 0, alpha);
				pos.z = beta;
			}

			x = pos.x; y = pos.y; z = pos.z;
			const vect3 = new BABYLON.Vector3(x,y,z);
			const vectN = getNormalVector(vect3);
			xN  = vectN.x; yN = vectN.y; zN = vectN.z;
			µN  = xN*yN*zN;
			$N  = (xN+yN+zN)/3;
			µ$N = µN*$N; $µN = µN+$N;
			µµN = µ$N*$µN;

			O = Math.asin(y / h(x,y,z));
			T = Math.atan2(z, x) ;

			const vectT = BABYLON.Vector3.Normalize(new BABYLON.Vector3(x,y,z));
			xT  = vectT.x; yT = vectT.y; zT = vectT.z;
			µT  = xT*yT*zT;
			$T  = (xT+yT+zT)/3;
			µ$T = µT*$T; var $µT = µT+$T;
			µµT = µ$T*$µT;

			alpha2 = eval(f.alpha2);
			beta2  = eval(f.beta2);
			theta  = eval(f2.theta);

			alpha3 = eval(f2.alpha);
			beta3  = eval(f2.beta);

			if(alpha2 && beta2){
				pos = rotateByQuaternion(x, y, z, alpha2, beta2);
			}

			if(isX){ const x2 = eval(f2.x); !glo.secondCurveOperation ? pos.x += x2 : pos.x = x2; }
			if(isY){ const y2 = eval(f2.y); !glo.secondCurveOperation ? pos.y += y2 : pos.y = y2; }
			if(isZ){ const z2 = eval(f2.z); !glo.secondCurveOperation ? pos.z += z2 : pos.z = z2; }

			pos = rotateOnCenterByBabylonMatrix({x: pos.x, y: pos.y, z: pos.z}, alpha3, beta3, theta);

			pos = blendPosAll(pos.x, pos.y, pos.z, u, v, O, cos(u), cos(v));
			pos = functionIt(pos.x, pos.y, pos.z);
			pos = invPos(pos.x, pos.y, pos.z);
			pos = invPosIf(pos.x, pos.y, pos.z);
			pos = permutSign(pos.x, pos.y, pos.z);

			let posByR = {x: pos.x, y: pos.y, z: pos.z};
			const rInfos = glo.params.functionIt.r;
			for(let variable in rInfos){
				for(let prop in rInfos[variable]){
					const val = rInfos[variable][prop].val;
					if(val){
						const nb = rInfos[variable][prop].nb;
						const eq = prop + `(${nb}*${variable})`;
						posByR = updateRibbonByR(posByR, val * eval(eq));
					}
				}
			}
			pos = posByR;

			if(glo.additiveSurface){
				pos.x += glo.savePos.x; pos.y += glo.savePos.y; pos.z += glo.savePos.z;
				glo.savePos.x = pos.x; glo.savePos.y = pos.y; glo.savePos.z = pos.z;
			}	

			const newVect = new BABYLON.Vector3(pos.x, pos.y, pos.z);
			glo.currentCurveInfos.vect = newVect;

			this.new_p2 = newVect;

			path.push(this.new_p2);
			index_v++; n++;
			glo.currentCurveInfos.index_v = index_v;
		}
		this.paths.push(path);
		glo.currentCurveInfos.path = path;
		path = [];
		index_u++;
		glo.currentCurveInfos.index_u = index_u;
	}

	if(!uvInfos.isV){ this.paths[0] = this.paths.flat(); }
  
  if(!onePoint){
	if(glo.closeFirstWithLastPath){ this.paths.push(this.paths[0]); }

	glo.lines = this.paths;

	this.pathsSave = this.paths.slice();
	this.paths     = uvInfos.isV ? closedPaths(this.paths) : this.paths;
  }
  else{
	return this.paths[0][1];
  }
}

function CurvesByCurvature(parametres = {
	u: {min: -glo.params.u, max: glo.params.u, nb_steps: glo.params.steps_u, },
	v: {min: -glo.params.v, max: glo.params.v, nb_steps: glo.params.steps_v, },
},
f = {
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
}, dim_one = glo.dim_one, fractalize = false, onePoint = false)
{

	var {
			x, y, z, xN, yN, zN, µN, $N, µ$N, $µN, µµN, O, T, xT, yT, zT, µT, $T, µ$T,
			$µT, µµT, rCol, gCol, bCol, mCol, A, B, C, D, E, F, G, H, I, K, L, M, alpha,
			beta, theta, alpha2, beta2, alpha3, beta3
	} = makeCommonCurveVariables();

	reg(f);
	reg(f2);

	let f3 = {evalX: glo.input_eval_x.text, evalY: glo.input_eval_y.text};
	reg(f3);

	this.p1_first = new BABYLON.Vector3.Zero;
	this.p2_first = glo.firstPoint;

	this.min_u = !glo.slidersUVOnOneSign.u ? parametres.u.min : 0;
	this.max_u = parametres.u.max;
	this.nb_steps_u = paramsOrFractNbPaths('u', parametres.u.nb_steps, fractalize);
	this.step_u = (this.max_u - this.min_u) / this.nb_steps_u;

	this.min_v = !glo.slidersUVOnOneSign.v ? parametres.v.min : 0;
	this.max_v = parametres.v.max;
	this.nb_steps_v = paramsOrFractNbPaths('v', parametres.v.nb_steps, fractalize);
	this.step_v = (this.max_v - this.min_v) / this.nb_steps_v;

	this.paths = [];
	this.lines = [];

    const uvInfos = isUV();

	let d, k, p, t;
	let X, Y;

	initVarsInObj(f, "", 0); initVarsInObj(f2, "", 0);

	const isX = glo.params.text_input_suit_x != "" ? true : false;
	const isY = glo.params.text_input_suit_y != "" ? true : false;
	const isZ = glo.params.text_input_suit_z != "" ? true : false;

	let moyPos = {x: 0, y: 0, z: 0};
	let pos    = {x: 0, y: 0, z: 0};

	const additiveSurface = glo.additiveSurface;

	let n = 0;
	let path = [];
	let index_u = 0, ind_u = 0, ind_v = 0;
	const stepsU = uvInfos.isU ? this.nb_steps_u : 0;
	const stepsV = uvInfos.isV ? this.nb_steps_v : 0;
	let u = this.min_u - this.step_u, v = this.min_v - this.step_v;
	for (let i = 0; i <= stepsU; i++) {
		if(additiveSurface){ glo.savePos.x = 0; glo.savePos.y = 0; glo.savePos.z = 0; }
		if(glo.params.curvaturetoZero){ pos = {x: 0, y: 0, z: 0}; path.push(BABYLON.Vector3.Zero()); }
		k = !(i%2) ? -1 : 1;
		u += this.step_u;
		glo.currentCurveInfos.u = u;
		p = !(i%2) ? -u : u;
		let index_v = 0; ind_u = u;
		v = this.min_v - this.step_v;
		for (let j = 0; j <= stepsV; j++) {
			v += this.step_v;
			ind_v = v;
			glo.currentCurveInfos.v = v;

			d = !(j%2) ? -1 : 1;
			t = !(j%2) ? -v : v;

			if(f3.evalX){ X = eval(f3.evalX); }
			if(f3.evalY){ Y = eval(f3.evalY); }

			r     = eval(f.r);
			alpha = eval(f.alpha);
			beta  = eval(f.beta);

			if(r == Infinity || r == -Infinity || isNaN(r)){ r = 0; }

			const dirXY = directionXY({x: alpha, y: beta}, r);
			pos.x += dirXY.x; pos.y += dirXY.y; pos.z += dirXY.z;

			x = pos.x; y = pos.y; z = pos.z;
			const vect3 = new BABYLON.Vector3(x,y,z);
			const vectN = getNormalVector(vect3);
			xN = vectN.x; yN = vectN.y; zN = vectN.z;
			µN  = xN*yN*zN;
			$N  = (xN+yN+zN)/3;
			µ$N = µN*$N; var $µN = µN+$N;
			µµN = µ$N*$µN;

			O = Math.asin(y / h(x,y,z));
			T = Math.atan2(z, x) ;

			const vectT = BABYLON.Vector3.Normalize(new BABYLON.Vector3(x,y,z));
			xT  = vectT.x; yT = vectT.y; zT = vectT.z;
			µT  = xT*yT*zT;
			$T  = (xT+yT+zT)/3;
			µ$T = µT*$T; var $µT = µT+$T;
			µµT = µ$T*$µT;

			alpha2 = eval(f.alpha2);
			beta2  = eval(f.beta2);
			theta  = eval(f2.theta);

			alpha3 = eval(f2.alpha);
			beta3  = eval(f2.beta);

			if(alpha2 && beta2){
				pos = rotateByQuaternion(x, y, z, alpha2, beta2);
			}

			if(isX){ const x2 = eval(f2.x); !glo.secondCurveOperation ? pos.x += x2 : pos.x = x2; }
			if(isY){ const y2 = eval(f2.y); !glo.secondCurveOperation ? pos.y += y2 : pos.y = y2; }
			if(isZ){ const z2 = eval(f2.z); !glo.secondCurveOperation ? pos.z += z2 : pos.z = z2; }
			
			pos = rotateOnCenterByBabylonMatrix({x: pos.x, y: pos.y, z: pos.z}, alpha3, beta3, theta);

			pos = blendPosAll(pos.x, pos.y, pos.z, u, v, O, cos(u), cos(v));
			pos = functionIt(pos.x, pos.y, pos.z);
			pos = invPos(pos.x, pos.y, pos.z);
			pos = invPosIf(pos.x, pos.y, pos.z);
			pos = permutSign(pos.x, pos.y, pos.z);

			let posByR = {x: pos.x, y: pos.y, z: pos.z};
			const rInfos = glo.params.functionIt.r;
			for(let variable in rInfos){
				for(let prop in rInfos[variable]){
					const val = rInfos[variable][prop].val;
					if(val){
						const nb = rInfos[variable][prop].nb;
						const eq = prop + `(${nb}*${variable})`;
						posByR = updateRibbonByR(posByR, val * eval(eq));
					}
				}
			}
			pos = posByR;

			if(glo.additiveSurface){
				pos.x += glo.savePos.x; pos.y += glo.savePos.y; pos.z += glo.savePos.z;
				glo.savePos.x = pos.x; glo.savePos.y = pos.y; glo.savePos.z = pos.z;
			}
			
			const newVect = new BABYLON.Vector3(pos.x, pos.y, pos.z);
			glo.currentCurveInfos.vect = newVect;

			this.new_p2 = newVect;

			moyPos.x += pos.x; moyPos.y += pos.y; moyPos.z += pos.z;

			path.push(this.new_p2);
			glo.currentCurveInfos.path = path;
			index_v++; n++;
			glo.currentCurveInfos.index_v = index_v;
		}
		this.paths.push(path);
		path = [];
		index_u++;
		glo.currentCurveInfos.index_u = index_u;
	}

	if(!uvInfos.isV){ this.paths[0] = this.paths.flat(); }

	if(!onePoint){
		if(glo.closeFirstWithLastPath){ this.paths.push(this.paths[0]); }

		moyPos.x/=(n-1); moyPos.y/=(n-1); moyPos.z/=(n-1); 
		offsetPathsByMoyPos(this.paths, moyPos);

		glo.lines      = this.paths;
		this.pathsSave = this.paths.slice();
		this.paths     = uvInfos.isV ? closedPaths(this.paths) : this.paths;
	}
	else{
		return this.paths[0][1];
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