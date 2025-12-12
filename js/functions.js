function addCommonTools(obj){
	obj.pi = Math.PI;
	obj.ep = 0.0000001;
	obj.mu = glo.params.u + 1;

	obj.cos    = Math.cos; obj.sin = Math.sin; obj.tan = Math.tan;  obj.atan = Math.atan; obj.atantwo = Math.atan2;
	obj.cosh   = Math.cosh; obj.sinh = Math.sinh; obj.tanh = Math.tanh;  obj.atanh = Math.atanh;
	obj.c 	   = obj.cos; obj.s = obj.sin;
	obj.abs    = Math.abs;
	obj.a 	   = Math.abs;
	obj.ceil   = Math.ceil;
	obj.exp    = Math.exp;
	//obj.e 	   = Math.exp;
	obj.hypot  = Math.hypot;
	obj.log    = Math.log;
	obj.l      = Math.log;
	obj.logten = Math.log10;
	obj.pow    = Math.pow;
	obj.rnd    = Math.random;
	obj.sign   = Math.sign;
	obj.si     = Math.sign;
	obj.sq     = Math.sqrt;

	obj.cp = function(val, coeff = 1){ return cos(coeff*PI*val); };
	obj.sp = function(val, coeff = 1){ return sin(coeff*PI*val); };
	obj.ch = function(val1, val2, val3 = 0, coeff = 1){ return cos(h(coeff*PI*val1, coeff*PI*val2, coeff*PI*val3)); };
	obj.sh = function(val1, val2, val3 = 0, coeff = 1){ return sin(h(coeff*PI*val1, coeff*PI*val2, coeff*PI*val3)); };

	obj.fact = function fact(n){
		n = parseInt(Math.abs(n));
		if(n == 0){ return 0; }
	  	return Array.from(Array(n), (x, index) => index + 1).reduce((accumulateur, valeurCourante) => accumulateur * valeurCourante );
	};

	obj.gg = obj.fact;

	obj.h = function(...args){
		return args.length > 1 ? Math.hypot(...args) : Math.hypot(args[0], args[0]);
	};

	obj.q = function(nu, nv = nu){
		return h(nu * glo.currentCurveInfos.u, nv * glo.currentCurveInfos.v);
	};
	obj.m = function(ncx, ncy, ncz, p = glo.currentCurveInfos.vect){
		const x = p.x, y = p.y, z = p.z;

		if(ncx === undefined || (ncx === 1 && ncy === undefined)){ ncx = 1; ncy = ncx; ncz = ncx; }
		else if(ncy === undefined){ ncy = ncx; ncz = ncx; }


		ncz = ncz === undefined ? 1 : ncz;
		ncy = ncy === undefined ? 1 : ncy;
		ncx = ncx === undefined ? 1 : ncx;

		return cos(ncx*x)*cos(ncy*y)*cos(ncz*z);
	};
	obj.o = function(ncx, ncy, ncz, cnx, cny, cnz, p = glo.currentCurveInfos.vect){
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

		return cnx*cos(ncx*x)+cny*cos(ncy*y)+cnz*cos(ncz*z);
	};
	obj.ç = function(ncx, ncy, ncz, cnx, cny, cnz, p = glo.currentCurveInfos.vect){
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

		return Math.hypot(cnx*cos(ncx*x), cny*cos(ncy*y), cnz*cos(ncz*z));
	};
	obj.aa = function(ncx, ncy, ncz, cnx, cny, cnz, p = glo.currentCurveInfos.vect){
		return h(this.o(ncx, ncy, ncz, cnx, cny, cnz), this.m(ncx, ncy, ncz, cnx, cny, cnz));
	};
	obj.bb = function(ncx, ncy, ncz, cnx, cny, cnz, p = glo.currentCurveInfos.vect){
		return h(this.o(ncx, ncy, ncz, cnx, cny, cnz), this.m(ncx, ncy, ncz, cnx, cny, cnz), this.ç(ncx, ncy, ncz, cnx, cny, cnz));
	};
	obj.mx = function(index = 1, val_to_return = 0, p = glo.currentCurveInfos.currentPath){
		index = parseInt(index);
		if(index <= 0){ index = 1; }
		if(p.length == 0){ return val_to_return; }
		if(p.length < index){ return val_to_return; }

		return p[p.length - index].x;
	};
	obj.my = function(index = 1, val_to_return = 0, p = glo.currentCurveInfos.currentPath){
		index = parseInt(index);
		if(index <= 0){ index = 1; }
		if(p.length == 0){ return val_to_return; }
		if(p.length < index){ return val_to_return; }

		return p[p.length - index].y;
	};
	obj.mz = function(index = 1, val_to_return = 0, p = glo.currentCurveInfos.currentPath){
		index = parseInt(index);
		if(index <= 0){ index = 1; }
		if(p.length == 0){ return val_to_return; }
		if(p.length < index){ return val_to_return; }

		return p[p.length - index].z;
	};
	obj.P = function(modulo = 2, val_to_return = 0, varToUse, ind){
		if(ind%modulo == 0){ return varToUse; }

		return val_to_return;
	};
	obj.v_mod = function(modulo = 2, val_to_return = 0, variable = glo.currentCurveInfos.v, index = glo.currentCurveInfos.index_v){
		if(index%modulo == 0){ return variable; }

		return val_to_return;
	};

	obj.cpow = function(val, exp){
		return sign(val) * Math.abs(val)**exp;
	};
	
	obj.cpowi = function(val, exp){
		return pow(Math.abs(val), exp);
	};
	
	obj.cpowh = function(...dists){
		let res = 0;
		dists.forEach(dist => {
			res += cpow(dist, 2);
		});
		return cpow(res, 0.5);
	};
	
	obj.S = function(val, sqr = 1, cp = true){
		return cp ? cpow(val, cpow(val, Math.abs(sqr))) : val**val;
	};
	
	obj.f = function(x, y = x){
		return cos(x) * sin(y);
	};

	obj.µ = function(res, varForSign){
		return Math.sign(valSign) * Math.abs(val);
	};

	obj.sc = function(val, valSign){
		return Math.cos(Math.exp(val));
	};

	obj.ww = function(val){
		return Math.cos(this.ec(val));
	};

	obj.w = function(val, isCos = 1){
		let res = isCos ? Math.acos(val) : Math.asin(val);
		return isNaN(res) ? val : res;
	};

	obj.b = function(val){
		if(val > 0){ return val < 1 ? val + 1 : val; }
		else{ return val > -1 ? val - 1 : val; }
	};

	obj.pc = function(val, p){
		if(p%2==0 || p<1){ return val < 0 ? (abs(val)**p) * -1 : val**p; }
		return val**p;
	};

	obj.lc = function(val){
		return val < 0 ? (l(abs(val))) * -1 : l(val);
	};

	obj.ec = function(val){
		return val < 0 ? (Math.exp(abs(val))) * -1 : Math.exp(val);
	};

	obj.hc = function(...args){
		args = args.map(arg => {
			return arg < 0 ? (arg**2) * -1 : arg**2;
		});

		let sum_sqr;
		var sum = args.reduce(function(a,b) { return a+b; });
		if(sum >= 0){ return sum**0.5; }
		else{ sum_sqr = abs(sum)**0.5; }

		return -sum_sqr;
	};

	obj.U = function(...arr){
		return arr.reduce(function(a,b) { return Math.max(a, b); });
	};
	obj.V = function(...arr){
		return arr.reduce(function(a,b) { return Math.min(a, b); });
	};

	//Fibbonacci in continue
	obj.W = function(x) {
		const phi = (1 + Math.sqrt(5)) / 2;
		return (Math.pow(phi, x) - Math.cos(Math.PI * x) * Math.pow(phi, -x)) / Math.sqrt(5);
	};

	//factorial in continue
	obj.èé = function(n) {
		function gamma(z) {
			const g = 7;
			const p = [
				0.99999999999980993,
				676.5203681218851,
				-1259.1392167224028,
				771.32342877765313,
				-176.61502916214059,
				12.507343278686905,
				-0.13857109526572012,
				9.9843695780195716e-6,
				1.5056327351493116e-7
			];
			if (z < 0.5) {
				return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
			} else {
				z -= 1;
				let x = p[0];
				for (let i = 1; i < p.length; i++) {
					x += p[i] / (z + i);
				}
				const t = z + g + 0.5;
				return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
			}
		}
		return gamma(n + 1);
	};

	obj.é = function(val, pre = 1) {
		let precision = 1 / Math.pow(2, pre - 1);
		return Math.ceil(val / precision) * precision;
	};

	// Fonction factory pour créer les fonctions avec ou sans inclusion de varUI
	function createEvalFunction(code, includeVarUI = true) {
		const paramNames = [
			"u", "v", "x", "y", "z", "d", "k", "p", "t", "n", "i", "j", 'X', 'Y',
			"O", "T", "xN", "yN", "zN", "$N", "xT", "yT", "zT", "$T"
		];

		const varNames = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
		const varUI = varNames.map(v => `${v} = glo.params.${v};`).join(" ");

		const fullCode = (includeVarUI ? varUI + " " : "") + "return " + code;
		return new Function(...paramNames, fullCode);
	}

	obj.èSave = function(fExp, n = 2){
		n = Math.abs(n);
		
		// Cas de base : n=0 => identité
		if (n === 0) {
			return x => x;
		}
		
		// 1) On convertit la string en vraie fonction si besoin
		const f = (typeof fExp === 'string')
			? parseExpression(fExp)
			: fExp;
		
		// 2) On retourne la fonction composée
		return function(...args) {
			// On initialise result :
			//  - si plusieurs args, on conserve un tableau
			//  - si un seul, on prend la première valeur
			let result = args.length > 1 ? args : args[0];
		
			for (let i = 0; i < n; i++) {
			// on "déploie" result si c'est un tableau
			result = Array.isArray(result)
				? f(...result)
				: f(result);
			}
			return result;
		};
	};

	obj.splitStrFunction = function(strFn) {
		const regex = /^([\p{L}_$][\p{L}\p{N}_$]*)\(\s*([^)]*)\s*\)$/u;
		const match = strFn.match(regex);
		if (!match) return false;
		const [, nom, argsString] = match;
		const trimmed = argsString.trim();
		if (trimmed === "") {
		  return { nom, arguments: false };
		}
		return { nom, arguments: trimmed.split(/\s*,\s*/ ) };
	  };
	  
	  obj.è = function(strFn, count) {
		// 1) on parse
		const parsed = this.splitStrFunction(strFn);
		if (!parsed) return false;
	  
		const { nom, arguments: argsArray } = parsed;
		const fn = this[nom];
		if (typeof fn !== 'function') {
		  throw new Error(`La méthode this.${nom}() n'existe pas.`);
		}
	  
		// 2) 1er appel : on transmet tous les args
		let result = (argsArray === false)
		  ? fn.call(this)
		  : fn.apply(this, argsArray);
	  
		// 3) appels suivants : on ne passe que le résultat précédent
		count = Math.abs(parseInt(count));
		for (let i = 1; i < count; i++) {
		  result = fn.call(this, result);
		}
	  
		return result;
	};	  

	obj.èè = function(val){
		val = val ? val : 1;
		return Math.sign(val) * Math.log(Math.abs(val));
	};

	obj.éé = function(nbU = 8, nbV = nbU){
		return Math.hypot(cos(nbU * glo.currentCurveInfos.u), cos(nbV * glo.currentCurveInfos.v));
	};

	obj.ff = function(x, y = x, z = y, ...args){
		return Math.hypot(Math.cos(x), Math.cos(y), Math.cos(z), ...args);
	};

	obj.ù = function(a = glo.currentCurveInfos.u, b = glo.currentCurveInfos.v, t = 0.5){
		return a + (b-a)*t;
	};
	obj.se = function(n, div = 1){
		const m = Math.abs(n);
		return Math.sign(n) * ((m*(m+1)) / (2*div));
	};
	obj.à = function(nbU = 8, nbV = nbU){
		return cos(nbU * glo.currentCurveInfos.u) * sin(nbV * glo.currentCurveInfos.v);
	};
}
addCommonTools(this);