//*****************************************************************************************************//
//********************************************MAIN FUNCTIONS*******************************************//
//*****************************************************************************************************//
function addCommonTools(obj){
	obj.pi = Math.PI;
	obj.ep = 0.0000001;
	obj.mu = glo.params.u + 1;

	obj.cos = Math.cos; obj.sin = Math.sin; obj.tan = Math.tan;  obj.atan = Math.atan; obj.atantwo = Math.atan2;
	obj.cosh = Math.cosh; obj.sinh = Math.sinh; obj.tanh = Math.tanh;  obj.atanh = Math.atanh;
	obj.c = obj.cos; obj.s = obj.sin;
	obj.abs = Math.abs;
	obj.a = Math.abs;
	obj.ceil = Math.ceil;
	obj.exp = Math.exp;
	obj.e = Math.exp;
	obj.hypot = Math.hypot;
	obj.h = Math.hypot;
	obj.log = Math.log;
	obj.l = Math.log;
	obj.logten = Math.log10;
	obj.pow = Math.pow;
	obj.rnd = Math.random;
	obj.sign = Math.sign;
	obj.si = Math.sign;
	obj.sq = Math.sqrt;

	obj.cp = function(val, coeff = 1){ return cos(coeff*PI*val); };
	obj.sp = function(val, coeff = 1){ return sin(coeff*PI*val); };
	obj.ch = function(val1, val2, coeff = 1){ return cos(h(coeff*PI*val1, coeff*PI*val2)); };
	obj.sh = function(val1, val2, coeff = 1){ return sin(h(coeff*PI*val1, coeff*PI*val2)); };

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
		return val < 0 ? (e(abs(val))) * -1 : e(val);
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

	obj.max = function(arr){
		return arr.reduce(function(a,b) { return Math.max(a, b); });
	};
	obj.min = function(arr){
		return arr.reduce(function(a,b) { return Math.min(a, b); });
	};
	obj.fact = function fact(n){
		n = parseInt(Math.abs(n));
		if(n == 0){ return 0; }
	  return Array.from(Array(n), (x, index) => index + 1).reduce((accumulateur, valeurCourante) => accumulateur * valeurCourante );
	};

	obj.fact_dec = function (n, div = 1, t = 1){
		if(n <= 1){ return 1; }
		n/=div;
		return n * fact(n-t);
	};

	obj.fib = function (n, div = 1, t1 = 1, t2 = 2){
		if(n > 20 && div < 1.1){ n = 20; }
		if(n <= 1){ return 0; }
		if(n <= 2){ return 1; }
		n/=div;
		return fib(n-t1) + fib(n-t2);
	};

	obj.se = function(n, div = 1){
		return (n*(n+1)) / (2*div);
	};
}
addCommonTools(this);
function Curves(parametres = {
	u: {min: -glo.params.u, max: glo.params.u, nb_steps: glo.params.steps_u, },
	v: {min: -glo.params.v, max: glo.params.v, nb_steps: glo.params.steps_v, },
},
f = {
	x: glo.params.text_input_x,
	y: glo.params.text_input_y,
	z: glo.params.text_input_z,
	alpha: glo.params.text_input_alpha,
	beta: glo.params.text_input_beta,
}, dim_one = glo.dim_one)
{
	reg(f, dim_one);

	var A = glo.params.A; var B = glo.params.B; var C = glo.params.C; var D = glo.params.D; var E = glo.params.E; var F = glo.params.F; var G = glo.params.G; var H = glo.params.H;
	var I = glo.params.I; var J = glo.params.J; var K = glo.params.K; var L = glo.params.L; var M = glo.params.M;

	this.min_u = parametres.u.min;
	this.max_u = parametres.u.max;
	this.nb_steps_u = parametres.u.nb_steps;
	this.step_u = (this.max_u - this.min_u) / this.nb_steps_u;

	this.min_v = parametres.v.min;
	this.max_v = parametres.v.max;
	this.nb_steps_v = parametres.v.nb_steps;
	this.step_v = (this.max_v - this.min_v) / this.nb_steps_v;

	this.paths = [];
	this.lines = [];

	function mx(index = 1, val_to_return = 0, p = path){
		index = parseInt(index);
		if(index <= 0){ index = 1; }
    if(p.length == 0){ return val_to_return; }
    if(p.length < index){ return val_to_return; }

    return p[p.length - index].x;
  }
  function my(index = 1, val_to_return = 0, p = path){
		index = parseInt(index);
		if(index <= 0){ index = 1; }
    if(p.length == 0){ return val_to_return; }
    if(p.length < index){ return val_to_return; }

    return p[p.length - index].y;
  }
  function mz(index = 1, val_to_return = 0, p = path){
		index = parseInt(index);
		if(index <= 0){ index = 1; }
    if(p.length == 0){ return val_to_return; }
    if(p.length < index){ return val_to_return; }

    return p[p.length - index].z;
  }

  function u_mod(modulo = 2, val_to_return = 0, variable = u, index = index_u){
    if(index%modulo == 0){ return variable; }

    return val_to_return;
  }
  function v_mod(modulo = 2, val_to_return = 0, variable = v, index = index_v){
    if(index%modulo == 0){ return variable; }

    return val_to_return;
  }
	function mod(index, ...args){ return args[index%args.length]; }

	function q(func, it = 1, op = "+", u = ind_u, v = ind_v){
		var funcR = func;
		var f = {toInv:func};
		for(var i = 0; i < it; i++){
			var index = funcR.length - (i+1);
			var fInvUV = reg_inv(f, 'u', 'v').toInv;
			f.toInv = fInvUV;
			funcR = funcR.substring(0, index) + op + fInvUV + ")" + funcR.substring(index + 1);
		}
		func = funcR;
		return eval(func);
	}

  var is_v = false;
  if(f.x.lastIndexOf('v') != -1 || f.x.lastIndexOf('V') != -1 ||
     f.y.lastIndexOf('v') != -1 || f.y.lastIndexOf('V') != -1 ||
     f.z.lastIndexOf('v') != -1 || f.z.lastIndexOf('V') != -1 ||
     f.alpha.lastIndexOf('v') != -1 || f.alpha.lastIndexOf('V') != -1 ||
     f.beta.lastIndexOf('v') != -1 || f.beta.lastIndexOf('V') != -1)
     { is_v = true; }

  var x = 0.5; var y = 0.5; var z = 0.5;
	var xN = 1; var yN = 1; var zN = 1;
	var µN = 1;
	var $N = 1; var µ$N = 1; var $µN = 1; var µµN = 1;

	if(f.x == ""){ f.x = 0; }
	if(f.y == ""){ f.y = 0; }
	if(f.z == ""){ f.z = 0; }
	if(f.alpha == ""){ f.alpha = 0; }
	if(f.beta == ""){ f.beta = 0; }

	var isAlpha = false;
	var alpha = 0;
	if(glo.params.text_input_alpha != ""){
		isAlpha = true;
	}
	var isBeta = false;
	var beta = 0;
	if(glo.params.text_input_beta != ""){
		isBeta = true;
	}

	var minU = this.min_u; var maxU = this.max_u; var stepU = this.step_u;
	var minV = this.min_v; var maxU = this.max_v; var stepU = this.step_v;

	var n = 0;
	var line_visible = glo.lines_visible;
  var index_u = 0;
  if(!is_v){
		var path = [];
		for (var u = this.min_u; u <= this.max_u; u+=this.step_u) {
			ind_u = u;

			x = eval(f.x);
			y = eval(f.y);
			z = eval(f.z);

			var vect3 = new BABYLON.Vector3(x,y,z);
			vect3 = BABYLON.Vector3.Normalize(vect3);
			xN = vect3.x; yN = vect3.y; zN = vect3.z;
			var µN = xN*yN*zN;
			var $N = (xN+yN+zN)/3;
			var µ$N = µN*$N; var $µN = µN+$N;
			var µµN = µ$N*$µN;

			if(x == Infinity || x == -Infinity || isNaN(x)){ x = 0; }
			if(y == Infinity || y == -Infinity || isNaN(y)){ y = 0; }
			if(z == Infinity || z == -Infinity || isNaN(z)){ z = 0; }
			if(isBeta){
				alpha = eval(f.alpha);
				beta = eval(f.beta);
				if(alpha == Infinity || alpha == -Infinity || isNaN(alpha)){ alpha = 0; }
				if(beta == Infinity || beta == -Infinity || isNaN(beta)){ beta = 0; }
				var pos = {x: x, y: y, z: z};
				pos = rotateByMatrix(pos, 0, alpha, beta);
				x = pos.x; y = pos.y; z = pos.z;
			}
			else if(isAlpha){
				alpha = eval(f.alpha);
				if(alpha == Infinity || alpha == -Infinity || isNaN(alpha)){ alpha = 0; }
				var pos = {x: x, y: y, z: z};
				pos = rotateByMatrix(pos, 0, alpha, 0);
				x = pos.x; y = pos.y; z = pos.z;
			}

			path.push(new BABYLON.Vector3(x, y, z));
			this.paths.push(path);
      index_u++; n++;
		}
		this.lineSystem = BABYLON.MeshBuilder.CreateLineSystem("lineSystem", { lines: this.paths, }, glo.scene);
		this.lineSystem.color = glo.lineColor;
		this.lineSystem.alpha = glo.ribbon_alpha;
		this.lineSystem.alphaIndex = 999;
		this.lineSystem.visibility = line_visible;
  }
  else {
		for (var u = this.min_u; u <= this.max_u; u+=this.step_u) {
			var path = [];
      var index_v = 0; ind_u = u;
			for (var v = this.min_v; v <= this.max_v; v+=this.step_v) {
				ind_v = v;

				x = eval(f.x);
				y = eval(f.y);
				z = eval(f.z);

				var vect3 = new BABYLON.Vector3(x,y,z);
				vect3 = BABYLON.Vector3.Normalize(vect3);
				xN = vect3.x; yN = vect3.y; zN = vect3.z;
				var µN = xN*yN*zN;
				var $N = (xN+yN+zN)/3;
				var µ$N = µN*$N; var $µN = µN+$N;
				var µµN = µ$N*$µN;

				if(x == Infinity || x == -Infinity || isNaN(x)){ x = 0; }
				if(y == Infinity || y == -Infinity || isNaN(y)){ y = 0; }
				if(z == Infinity || z == -Infinity || isNaN(z)){ z = 0; }
				if(isBeta){
					alpha = eval(f.alpha);
					beta = eval(f.beta);
					if(alpha == Infinity || alpha == -Infinity || isNaN(alpha)){ alpha = 0; }
					if(beta == Infinity || beta == -Infinity || isNaN(beta)){ beta = 0; }
					var pos = {x: x, y: y, z: z};
					pos = rotateByMatrix(pos, 0, alpha, beta);
					x = pos.x; y = pos.y; z = pos.z;
				}
				else if(isAlpha){
					alpha = eval(f.alpha);
					if(alpha == Infinity || alpha == -Infinity || isNaN(alpha)){ alpha = 0; }
					var pos = {x: x, y: y, z: z};
					pos = rotateByMatrix(pos, 0, alpha, 0);
					x = pos.x; y = pos.y; z = pos.z;
				}

				path.push(new BABYLON.Vector3(x, y, z));
        index_v++; n++;
			}
			this.paths.push(path);
      index_u++;
		}
		this.lineSystem = BABYLON.MeshBuilder.CreateLineSystem("lineSystem", { lines: this.paths, }, glo.scene);
		this.lineSystem.color = glo.lineColor;
		this.lineSystem.alpha = glo.ribbon_alpha;
		this.lineSystem.alphaIndex = 999;
		this.lineSystem.visibility = line_visible;
  }
}

function drawNormalEquations(){
	if(typeof(glo.verticesNormals) == "undefined"){ glo.verticesNormals = glo.ribbon.getVerticesData(BABYLON.VertexBuffer.NormalKind); }
	if(typeof(glo.verticesColors) == "undefined" || glo.verticesColors == null){ glo.verticesColors = glo.ribbon.getVerticesData(BABYLON.VertexBuffer.ColorKind); }
	var isVerticesColors = glo.verticesColors != null ? true : false;
	var verticesColors = [];
	if(isVerticesColors){
		glo.verticesColors.map(vc => {
			if(!isNaN(vc)){ verticesColors.push(vc); }
		});
	}
	var verticesNormals = glo.verticesNormals;
	var verticesNormalsLength = verticesNormals.length;

	var dim_one = false;

	var equations = {
		fx: glo.params.normale.text_input_x,
		fy: glo.params.normale.text_input_y,
		fz: glo.params.normale.text_input_z,
		falpha: glo.params.normale.text_input_alpha,
		fbeta: glo.params.normale.text_input_beta,
	};

	var A = glo.params.A; var B = glo.params.B; var C = glo.params.C; var D = glo.params.D; var E = glo.params.E; var F = glo.params.F; var G = glo.params.G; var H = glo.params.H;
	var I = glo.params.I; var J = glo.params.J; var K = glo.params.K; var L = glo.params.L; var M = glo.params.M;

	function mx(index = 1, val_to_return = 0, p = pathsNow){
		index = parseInt(index);
		if(index <= 0){ index = 1; }
    if(p.length == 0){ return val_to_return; }
    if(p.length < index){ return val_to_return; }

    return p[p.length - index].x;
  };
  function my(index = 1, val_to_return = 0, p = pathsNow){
		index = parseInt(index);
		if(index <= 0){ index = 1; }
    if(p.length == 0){ return val_to_return; }
    if(p.length < index){ return val_to_return; }

    return p[p.length - index].y;
  };
  function mz(index = 1, val_to_return = 0, p = pathsNow){
		index = parseInt(index);
		if(index <= 0){ index = 1; }
    if(p.length == 0){ return val_to_return; }
    if(p.length < index){ return val_to_return; }

    return p[p.length - index].z;
  };

	function u_mod(modulo = 2, val_to_return = 0, variable = index_u, index = index_u){
    if(index%modulo == 0){ return variable; }

    return val_to_return;
  }
  function v_mod(modulo = 2, val_to_return = 0, variable = index_v, index = index_v){
    if(index%modulo == 0){ return variable; }

    return val_to_return;
  }
	function mod(index, ...args){ return args[index%args.length]; }

	function q(func, it = 1, op = "+", u = ind_u, v = ind_v){
		var funcR = func;
		var f = {toInv:func};
		for(var i = 0; i < it; i++){
			var index = funcR.length - (i+1);
			var fInvUV = reg_inv(f, 'u', 'v').toInv;
			f.toInv = fInvUV;
			funcR = funcR.substring(0, index) + op + fInvUV + ")" + funcR.substring(index + 1);
		}
		func = funcR;
		return eval(func);
	}

	var good = test_equations(equations, dim_one);
	if(good){
		var f = {
			x: equations.fx,
			y: equations.fy,
			z: equations.fz,
			alpha: equations.falpha,
			beta: equations.fbeta,
		};

		reg(f, dim_one);

	  var x = 0; var y = 0; var z = 0; var alpha = 0; var beta = 0;

		if(f.x == ""){ f.x = 0; }
		if(f.y == ""){ f.y = 0; }
		if(f.z == ""){ f.z = 0; }
		if(f.alpha == ""){ f.alpha = 0; }
		if(f.beta == ""){ f.beta = 0; }

		var isAlpha = false;
		var alpha = 0;
		if(glo.params.normale.text_input_alpha != ""){
			isAlpha = true;
		}
		var isBeta = false;
		var beta = 0;
		if(glo.params.normale.text_input_beta != ""){
			isBeta = true;
		}

		if(!glo.normalOnNormalMode){ var paths = glo.curves.paths; }
		else{ var paths = Object.assign([], glo.curves.pathsSecond) }

		glo.curves.pathsSecond = [];
		var pathsLength = paths.length;
		glo.curves.lineSystem.dispose(true); delete glo.curves.lineSystem;
		var line_visible = glo.lines_visible;

		var ind_u = u; var ind_v = v; var index_u = 0;
		var n = 0; var itLength = 1; var itColors = 1;
		for(var it = 0; it < itLength; it++){
			for(var u = 0; u < pathsLength; u++){
				ind_u = u;
				var index_v = 0;
				var path = paths[u];
				var pathNow = [];
				var pathLength = path.length/itColors;
				index_u++;
				for(var v = 0; v < pathLength; v++){
					ind_v = v;
					var p = path[v];
					if(n*3 + 2 > verticesNormalsLength){ n = 0; }
					var xN = verticesNormals[n*3]; var yN = verticesNormals[n*3 + 1]; var zN = verticesNormals[n*3 + 2];
					var µN = xN*yN*zN;
					var $N = (xN+yN+zN)/3;
					var µ$N = µN*$N; var $µN = µN+$N;
					var µµN = µ$N*$µN;
					var rCol = isVerticesColors ? verticesColors[n*3] : 1; var gCol = isVerticesColors ? verticesColors[n*3 + 1] : 1; var bCol = isVerticesColors ? verticesColors[n*3 + 2] : 1;
					var xP = p.x; var yP = p.y; var zP = p.z;
					var $P = (xP+yP+zP)/3; var µP = xP*yP*zP;

					var mCol = (rCol + gCol + bCol) / 3;

					x = eval(f.x);
					y = eval(f.y);
					z = eval(f.z);

					if(glo.coordsNomrType != 'cartesian'){
						var cyl = false;
						if(glo.coordsNomrType == 'cylindrical'){ cyl = true; }
						var pos = {x: x, y: 0, z: 0};
						if(!cyl){ pos = rotateByMatrix(pos, 0, y, z); }
						else{
							pos = rotateByMatrix(pos, 0, 0, z);
							pos.z = z;
						}
						x = pos.x; y = pos.y; z = pos.z;
					}

					if(x == Infinity || x == -Infinity || isNaN(x)){ x = 0; }
					if(y == Infinity || y == -Infinity || isNaN(y)){ y = 0; }
					if(z == Infinity || z == -Infinity || isNaN(z)){ z = 0; }
					if(isBeta){
						alpha = eval(f.alpha);
						beta = eval(f.beta);
						if(alpha == Infinity || alpha == -Infinity || isNaN(alpha)){ alpha = 0; }
						if(beta == Infinity || beta == -Infinity || isNaN(beta)){ beta = 0; }
						if(glo.params.rotAlpha != 0){ alpha*=glo.params.rotAlpha; } if(glo.params.rotBeta != 0){ beta*=glo.params.rotBeta; }
						var pos = {x: x, y: y, z: z};
						pos = rotateByMatrix(pos, 0, alpha, beta);
						x = pos.x; y = pos.y; z = pos.z;
					}
					else if(isAlpha){
						alpha = eval(f.alpha);
						if(alpha == Infinity || alpha == -Infinity || isNaN(alpha)){ alpha = 0; }
						if(glo.params.rotAlpha != 0){ alpha*=glo.params.rotAlpha; }
						var pos = {x: x, y: y, z: z};
						pos = rotateByMatrix(pos, 0, alpha, 0);
						x = pos.x; y = pos.y; z = pos.z;
					}

					var scale = glo.scaleNorm;

					x = xP + ((x/scale) * xN);
					y = yP + ((y/scale) * yN);
					z = zP + ((z/scale) * zN);

					pathNow.push(new BABYLON.Vector3(x, y, z));

					n++; index_v++;
				}
				glo.curves.pathsSecond.push(pathNow);
			}
			glo.curves.lineSystem = BABYLON.MeshBuilder.CreateLineSystem("lineSystem", { lines: glo.curves.pathsSecond, }, glo.scene);
			glo.curves.lineSystem.color = glo.lineColor;
			glo.curves.lineSystem.alpha = glo.ribbon_alpha;
			glo.curves.lineSystem.alphaIndex = 999;
			glo.curves.lineSystem.visibility = line_visible;
		}
		make_ribbon();
	}

	return false;
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
}, dim_one = glo.dim_one)
{
	var cyl = false;
	if(glo.coordsType == 'cylindrical'){ cyl = true; }

	function mx(index = 1, val_to_return = 0, p = path){
		index = parseInt(index);
		if(index <= 0){ index = 1; }
    if(p.length == 0){ return val_to_return; }
    if(p.length < index){ return val_to_return; }

    return p[p.length - index].x;
  };
  function my(index = 1, val_to_return = 0, p = path){
		index = parseInt(index);
		if(index <= 0){ index = 1; }
    if(p.length == 0){ return val_to_return; }
    if(p.length < index){ return val_to_return; }

    return p[p.length - index].y;
  };
  function mz(index = 1, val_to_return = 0, p = path){
		index = parseInt(index);
		if(index <= 0){ index = 1; }
    if(p.length == 0){ return val_to_return; }
    if(p.length < index){ return val_to_return; }

    return p[p.length - index].z;
  };

  function u_mod(modulo = 2, val_to_return = 0, variable = u, index = index_u){
    if(index%modulo == 0){ return variable; }

    return val_to_return;
  }
  function v_mod(modulo = 2, val_to_return = 0, variable = v, index = index_v){
    if(index%modulo == 0){ return variable; }

    return val_to_return;
  }
	function mod(index, ...args){ return args[index%args.length]; }

	function q(func, it = 1, op = "+", u = ind_u, v = ind_v){
		var funcR = func;
		var f = {toInv:func};
		for(var i = 0; i < it; i++){
			var index = funcR.length - (i+1);
			var fInvUV = reg_inv(f, 'u', 'v').toInv;
			f.toInv = fInvUV;
			funcR = funcR.substring(0, index) + op + fInvUV + ")" + funcR.substring(index + 1);
		}
		func = funcR;
		return eval(func);
	}

	reg(f, dim_one);

	var A = glo.params.A; var B = glo.params.B; var C = glo.params.C; var D = glo.params.D; var E = glo.params.E; var F = glo.params.F; var G = glo.params.G; var H = glo.params.H;
	var I = glo.params.I; var J = glo.params.J; var K = glo.params.K; var L = glo.params.L; var M = glo.params.M;

	this.p1_first = new BABYLON.Vector3.Zero;
	this.p2_first = new BABYLON.Vector3(1,0,0);

	this.min_u = parametres.u.min;
	this.max_u = parametres.u.max;
	this.nb_steps_u = parametres.u.nb_steps;
	this.step_u = (this.max_u - this.min_u) / this.nb_steps_u;

	this.min_v = parametres.v.min;
	this.max_v = parametres.v.max;
	this.nb_steps_v = parametres.v.nb_steps;
	this.step_v = (this.max_v - this.min_v) / this.nb_steps_v;

	this.paths = [];
	this.lines = [];

  var is_v = false;
  if(f.r.lastIndexOf('v') != -1 || f.r.lastIndexOf('V') != -1 ||
     f.alpha.lastIndexOf('v') != -1 || f.alpha.lastIndexOf('V') != -1 ||
     f.beta.lastIndexOf('v') != -1 || f.beta.lastIndexOf('V') != -1 ||
     f.alpha2.lastIndexOf('v') != -1 || f.alpha2.lastIndexOf('V') != -1 ||
     f.beta2.lastIndexOf('v') != -1 || f.beta2.lastIndexOf('V') != -1)
     { is_v = true; }

  var x = 0; var y = 0; var z = 0; var ind_u = 0; var ind_v = 0;
	var r = 0; var alpha = 0; var beta = 0; var alpha2 = 0; var beta2 = 0;
	var x = 0.5; var y = 0.5; var z = 0.5;
	var xN = 1; var yN = 1; var zN = 1;
	var µN = 1;
	var $N = 1; var µ$N = 1; var $µN = 1; var µµN = 1;

	var isAlpha2 = false;
	if(glo.params.text_input_alpha != ""){
		isAlpha2 = true;
	}
	var isBeta2 = false;
	if(glo.params.text_input_beta != ""){
		isBeta2 = true;
	}

	if(f.r == ""){ f.r = 0; }
	if(f.alpha == ""){ f.alpha = 0; }
	if(f.beta == ""){ f.beta = 0; }
	if(f.alpha2 == ""){ f.alpha2 = 0; }
	if(f.beta2 == ""){ f.beta2 = 0; }

	var n = 0;
	var path = [];
	var line_visible = glo.lines_visible;
  var index_u = 0;
  if(!is_v){
		path = [];
		for (var u = this.min_u; u <= this.max_u; u+=this.step_u) {
			ind_u = u;

			r = eval(f.r);
			alpha = eval(f.alpha);
			beta = eval(f.beta);

			if(r == Infinity || r == -Infinity){ r = 0; }
			if(alpha == Infinity || alpha == -Infinity){ alpha = 0; }
			if(beta == Infinity || beta == -Infinity){ beta = 0; }

			var pos = {x: this.p2_first.x * r, y: 0, z: 0};
			if(!cyl){ pos = rotateByMatrix(pos, 0, alpha, beta); }
			else{
				pos = rotateByMatrix(pos, 0, 0, alpha);
				pos.z = beta;
			}

			var x = pos.x; var y = pos.y; var z = pos.z;
			var vect3 = new BABYLON.Vector3(x,y,z);
			vect3 = BABYLON.Vector3.Normalize(vect3);
			xN = vect3.x; yN = vect3.y; zN = vect3.z;
			var µN = xN*yN*zN;
			var $N = (xN+yN+zN)/3;
			var µ$N = µN*$N; var $µN = µN+$N;
			var µµN = µ$N*$µN;

			if(isBeta2){
				alpha2 = eval(f.alpha2);
				beta2 = eval(f.beta2);
				if(alpha2 == Infinity || alpha2 == -Infinity){ alpha2 = 0; }
				if(beta2 == Infinity || beta2 == -Infinity){ beta2 = 0; }
				pos = rotateByMatrix(pos, 0, alpha2, beta2);
			}
			else if(isAlpha2){
				alpha2 = eval(f.alpha2);
				if(alpha2 == Infinity || alpha2 == -Infinity){ alpha2 = 0; }
				pos = rotateByMatrix(pos, 0, alpha2, 0);
			}

			this.new_p2 = new BABYLON.Vector3(pos.x, pos.y, pos.z);
			path.push(this.p1_first);
			path.push(this.new_p2);
			this.paths.push(path);
			path = [];
      index_u++; n++;
		}
		this.lineSystem = BABYLON.MeshBuilder.CreateLineSystem("lineSystem", { lines: this.paths, }, glo.scene);
		this.lineSystem.color = glo.lineColor;
		this.lineSystem.alpha = glo.ribbon_alpha;
		this.lineSystem.alphaIndex = 999;
		this.lineSystem.visibility = line_visible;
  }
  else {
		for (var u = this.min_u; u <= this.max_u; u+=this.step_u) {
      var index_v = 0; ind_u = u;
			for (var v = this.min_v; v <= this.max_v; v+=this.step_v) {
				ind_v = v;

				r = eval(f.r);
				alpha = eval(f.alpha);
				beta = eval(f.beta);
				alpha2 = eval(f.alpha);
				beta2 = eval(f.beta);

				if(r == Infinity || r == -Infinity){ r = 0; }
				if(alpha == Infinity || alpha == -Infinity){ alpha = 0; }
				if(beta == Infinity || beta == -Infinity){ beta = 0; }

				var pos = {x: this.p2_first.x * r, y: 0, z: 0};
				if(!cyl){ pos = rotateByMatrix(pos, 0, alpha, beta); }
				else{
					pos = rotateByMatrix(pos, 0, 0, alpha);
					pos.z = beta;
				}

				var x = pos.x; var y = pos.y; var z = pos.z;
				var vect3 = new BABYLON.Vector3(x,y,z);
				vect3 = BABYLON.Vector3.Normalize(vect3);
				xN = vect3.x; yN = vect3.y; zN = vect3.z;
				var µN = xN*yN*zN;
				var $N = (xN+yN+zN)/3;
				var µ$N = µN*$N; var $µN = µN+$N;
				var µµN = µ$N*$µN;

				if(isBeta2){
					alpha2 = eval(f.alpha2);
					beta2 = eval(f.beta2);
					if(alpha2 == Infinity || alpha2 == -Infinity){ alpha2 = 0; }
					if(beta2 == Infinity || beta2 == -Infinity){ beta2 = 0; }
					pos = rotateByMatrix(pos, 0, alpha2, beta2);
				}
				else if(isAlpha2){
					alpha2 = eval(f.alpha2);
					if(alpha2 == Infinity || alpha2 == -Infinity){ alpha2 = 0; }
					pos = rotateByMatrix(pos, 0, alpha2, 0);
				}

				this.new_p2 = new BABYLON.Vector3(pos.x, pos.y, pos.z);

				path.push(this.new_p2);
        index_v++; n++;
			}
			this.paths.push(path);
			path = [];
      index_u++;
		}
		this.lineSystem = BABYLON.MeshBuilder.CreateLineSystem("lineSystem", { lines: this.paths, }, glo.scene);
		this.lineSystem.color = glo.lineColor;
		this.lineSystem.alpha = glo.ribbon_alpha;
		this.lineSystem.alphaIndex = 999;
		this.lineSystem.visibility = line_visible;
  }
}
var curve_step_by_step = function* (parametres = {
	u: {min: -glo.params.u, max: glo.params.u, nb_steps: glo.params.steps_u, },
	v: {min: -glo.params.v, max: glo.params.v, nb_steps: glo.params.steps_v, },
},
f = {
	x: glo.params.text_input_x,
	y: glo.params.text_input_y,
	z: glo.params.text_input_z,
	alpha: glo.params.text_input_alpha.text,
	beta: glo.params.text_input_beta.text,
}, dim_one = glo.dim_one){

	if(typeof(glo.input_x) != "undefined"){
		f = {
			x: glo.input_x.text,
			y: glo.input_y.text,
			z: glo.input_z.text,
			alpha: glo.input_alpha.text,
			beta: glo.input_beta.text,
		};
	}

	function mx(index = 1, val_to_return = 0, p = path){
		index = parseInt(index);
		if(index <= 0){ index = 1; }
    if(p.length == 0){ return val_to_return; }
    if(p.length < index){ return val_to_return; }

    return p[p.length - index].x;
  };
  function my(index = 1, val_to_return = 0, p = path){
		index = parseInt(index);
		if(index <= 0){ index = 1; }
    if(p.length == 0){ return val_to_return; }
    if(p.length < index){ return val_to_return; }

    return p[p.length - index].y;
  };
  function mz(index = 1, val_to_return = 0, p = path){
		index = parseInt(index);
		if(index <= 0){ index = 1; }
    if(p.length == 0){ return val_to_return; }
    if(p.length < index){ return val_to_return; }

    return p[p.length - index].z;
  };

  function u_mod(modulo = 2, val_to_return = 0, variable = u, index = index_u){
    if(index%modulo == 0){ return variable; }

    return val_to_return;
  }
  function v_mod(modulo = 2, val_to_return = 0, variable = v, index = index_v){
    if(index%modulo == 0){ return variable; }

    return val_to_return;
  }
	function mod(index, ...args){ return args[index%args.length]; }

	function q(func, it = 1, op = "+", u = ind_u, v = ind_v){
		var funcR = func;
		var f = {toInv:func};
		for(var i = 0; i < it; i++){
			var index = funcR.length - (i+1);
			var fInvUV = reg_inv(f, 'u', 'v').toInv;
			f.toInv = fInvUV;
			funcR = funcR.substring(0, index) + op + fInvUV + ")" + funcR.substring(index + 1);
		}
		func = funcR;
		return eval(func);
	}

	var max_u = parametres.u.max;
	var min_u = parametres.u.min;
	var min_v = parametres.v.min;
	var max_v = parametres.v.max;

	var nb_steps_u = parametres.u.nb_steps;
	var step_u = (max_u - min_u) / nb_steps_u;
	var nb_steps_v = parametres.v.nb_steps;
	var step_v = (max_v - min_v) / nb_steps_v;

	function setParams(){
		parametres = {
			u: {min: -glo.params.u, max: glo.params.u, nb_steps: glo.params.steps_u, },
			v: {min: -glo.params.v, max: glo.params.v, nb_steps: glo.params.steps_v, },
		};
		f = {
			x: glo.input_x.text,
			y: glo.input_y.text,
			z: glo.input_z.text,
			alpha: glo.input_alpha.text,
			beta: glo.input_beta.text,
		};
		dim_one = glo.dim_one;

		if(f.x == ""){ f.x = 0; }
		if(f.y == ""){ f.y = 0; }
		if(f.z == ""){ f.z = 0; }
		if(f.alpha == ""){ f.alpha = 0; }
		if(f.beta == ""){ f.beta = 0; }

		max_u = parametres.u.max;
		min_u = parametres.u.min;
		min_v = parametres.v.min;
		max_v = parametres.v.max;

		nb_steps_u = parametres.u.nb_steps;
		step_u = (max_u - min_u) / nb_steps_u;
		nb_steps_v = parametres.v.nb_steps;
		step_v = (max_v - min_v) / nb_steps_v;

		color_line = new BABYLON.Color3(1 - glo.lineColor.r, 1 - glo.lineColor.g, 1 - glo.lineColor.b);
	}

	var color_line = new BABYLON.Color3(1 - glo.lineColor.r, 1 - glo.lineColor.g, 1 - glo.lineColor.b);

	var p1_first = new BABYLON.Vector3.Zero;
	var p2_first = new BABYLON.Vector3(1,0,0);

	reg(f, dim_one);

	var A = glo.params.A; var B = glo.params.B; var C = glo.params.C; var D = glo.params.D; var E = glo.params.E; var F = glo.params.F; var G = glo.params.G; var H = glo.params.H;
	var I = glo.params.I; var J = glo.params.J; var K = glo.params.K; var L = glo.params.L; var M = glo.params.M;

	var x = 0; var y = 0; var z = 0; var alpha = 0; var beta = 0; var ind_u = 0; var ind_v = 0;

	var isAlpha = false;
	if(glo.params.text_input_alpha != ""){
		isAlpha = true;
	}
	var isBeta = false;
	if(glo.params.text_input_beta != ""){
		isBeta = true;
	}

	path = [];
	paths = [];

	glo.lines_u = [];
	glo.lines_v = [];

	var n = 0;
	var index_u = 0;
	var n_dim = 1;

	setParams();
	var u = min_u;
	ind_u = u;
  while(true){
		setParams();
		var is_v = false;
		if(f.x.lastIndexOf('v') != -1 || f.x.lastIndexOf('V') != -1 ||
	     f.y.lastIndexOf('v') != -1 || f.y.lastIndexOf('V') != -1 ||
	     f.z.lastIndexOf('v') != -1 || f.z.lastIndexOf('V') != -1 ||
	     f.alpha.lastIndexOf('v') != -1 || f.alpha.lastIndexOf('V') != -1 ||
	     f.beta.lastIndexOf('v') != -1 || f.beta.lastIndexOf('V') != -1)
	     { is_v = true; }
		if(is_v){ paths = []; }
		var nMod = 1;
		var index_v = 0;
		try{
			if(!is_v){
				reg(f, dim_one);
				x = eval(f.x);
				y = eval(f.y);
				z = eval(f.z);

				if(x == Infinity || x == -Infinity || isNaN(x)){ x = 0; }
				if(y == Infinity || y == -Infinity || isNaN(y)){ y = 0; }
				if(z == Infinity || z == -Infinity || isNaN(z)){ z = 0; }

				if(glo.coordsType == 'cartesian'){
					if(isBeta){
						alpha = eval(f.alpha);
						beta = eval(f.beta);
						if(alpha == Infinity || alpha == -Infinity || isNaN(alpha)){ alpha = 0; }
						if(beta == Infinity || beta == -Infinity || isNaN(beta)){ beta = 0; }
						var pos = {x: x, y: y, z: z};
						pos = rotateByMatrix(pos, 0, alpha, beta);
						x = pos.x; y = pos.y; z = pos.z;
					}
					else if(isAlpha){
						alpha = eval(f.alpha);
						if(alpha == Infinity || alpha == -Infinity || isNaN(alpha)){ alpha = 0; }
						var pos = {x: x, y: y, z: z};
						pos = rotateByMatrix(pos, 0, alpha, 0);
						x = pos.x; y = pos.y; z = pos.z;
					}
					path.push(new BABYLON.Vector3(x, y, z));
					paths.push(new BABYLON.Vector3(x, y, z));
					if(n_dim%2==0){
						line = BABYLON.MeshBuilder.CreateLines("par", {points: path, updatable: false}, glo.scene);
						line.color = color_line;
						glo.lines_v.push(line);
						yield u;
					}
				}
				else{
					var pos = {x: p2_first.x * x, y: 0, z: 0};
					if(glo.coordsType == 'spheric'){ pos = rotateByMatrix(pos, 0, y, z); }
					else{
						pos = rotateByMatrix(pos, 0, 0, y);
						pos.z = z;
					}
					if(isBeta){
						alpha = eval(f.alpha);
						beta = eval(f.beta);
						if(alpha == Infinity || alpha == -Infinity){ alpha = 0; }
						if(beta == Infinity || beta == -Infinity){ beta = 0; }
						pos = rotateByMatrix(pos, 0, alpha, beta);
					}
					else if(isAlpha){
						alpha = eval(f.alpha);
						if(alpha == Infinity || alpha == -Infinity){ alpha = 0; }
						pos = rotateByMatrix(pos, 0, alpha, 0);
					}

					var new_p2 = new BABYLON.Vector3(pos.x, pos.y, pos.z);
					var line = BABYLON.MeshBuilder.CreateLines("line_rot" + index_u, {points: [p1_first, new_p2], updatable: false}, glo.scene);
					line.color = color_line;
					glo.lines_v.push(line);
					yield u;
				}
				n_dim++; n++;
	    }
			else{
				for(var v = min_v; v < max_v; v+=step_v){
					ind_v = v;
					setParams();
					reg(f, dim_one);
					x = eval(f.x);
					y = eval(f.y);
					z = eval(f.z);

					if(x == Infinity || x == -Infinity || isNaN(x)){ x = 0; }
					if(y == Infinity || y == -Infinity || isNaN(y)){ y = 0; }
					if(z == Infinity || z == -Infinity || isNaN(z)){ z = 0; }

					if(glo.coordsType == 'cartesian'){
						if(isBeta){
							alpha = eval(f.alpha);
							beta = eval(f.beta);
							if(alpha == Infinity || alpha == -Infinity || isNaN(alpha)){ alpha = 0; }
							if(beta == Infinity || beta == -Infinity || isNaN(beta)){ beta = 0; }
							var pos = {x: x, y: y, z: z};
							pos = rotateByMatrix(pos, 0, alpha, beta);
							x = pos.x; y = pos.y; z = pos.z;
						}
						else if(isAlpha){
							alpha = eval(f.alpha);
							if(alpha == Infinity || alpha == -Infinity || isNaN(alpha)){ alpha = 0; }
							var pos = {x: x, y: y, z: z};
							pos = rotateByMatrix(pos, 0, alpha, 0);
							x = pos.x; y = pos.y; z = pos.z;
						}
						path.push(new BABYLON.Vector3(x, y, z));
						paths.push(new BABYLON.Vector3(x, y, z));
						if(n%2==0){
							line = BABYLON.MeshBuilder.CreateLines("par", {points: path, updatable: false}, glo.scene);
							line.color = color_line;
							glo.lines_v.push(line);
							path = [];
							yield u;
						}
					}
					else{
						var pos = {x: p2_first.x * x, y: 0, z: 0};
						if(glo.coordsType == 'spheric'){ pos = rotateByMatrix(pos, 0, y, z); }
						else{
							pos = rotateByMatrix(pos, 0, 0, y);
							pos.z = z;
						}
						if(isBeta){
							alpha = eval(f.alpha);
							beta = eval(f.beta);
							if(alpha == Infinity || alpha == -Infinity){ alpha = 0; }
							if(beta == Infinity || beta == -Infinity){ beta = 0; }
							pos = rotateByMatrix(pos, 0, alpha, beta);
						}
						else if(isAlpha){
							alpha = eval(f.alpha);
							if(alpha == Infinity || alpha == -Infinity){ alpha = 0; }
							pos = rotateByMatrix(pos, 0, alpha, 0);
						}

						this.new_p2 = new BABYLON.Vector3(pos.x, pos.y, pos.z);
	  				path.push(this.new_p2);
	  				paths.push(this.new_p2);
						if(nMod%2==0){
							line = BABYLON.MeshBuilder.CreateLines("par", {points: path, updatable: false}, glo.scene);
							line.color = color_line;
							glo.lines_v.push(line);
							path = [];
							yield u;
						}
					}
					n++; nMod++;
					index_v++;
				}
			}
		}
		catch(error){
			yield u;
		}

		if(is_v){
			path = [];
			glo.lines_v.map(line => { line.dispose(); line = {}; } );
			glo.lines_v = [];
		}

		var lines = BABYLON.MeshBuilder.CreateLines("par", {points: paths, updatable: false}, glo.scene);
		lines.color = color_line;
		lines.alpha = 1;
		lines.visibility = 1;
		glo.lines_u.push(lines);

		u+=step_u;
		index_u++;
		if(is_v){ yield u; }
  }
}
glo.curve_step = curve_step_by_step();

function test_equations(equations, dim_one = false, forCol = false){
	function mx(index = 1, val_to_return = 0, p = path){
		index = parseInt(index);
		if(index <= 0){ index = 1; }
    if(p.length == 0){ return val_to_return; }
    if(p.length < index){ return val_to_return; }

    return p[p.length - index].x;
  };
  function my(index = 1, val_to_return = 0, p = path){
		index = parseInt(index);
		if(index <= 0){ index = 1; }
    if(p.length == 0){ return val_to_return; }
    if(p.length < index){ return val_to_return; }

    return p[p.length - index].y;
  };
  function mz(index = 1, val_to_return = 0, p = path){
		index = parseInt(index);
		if(index <= 0){ index = 1; }
    if(p.length == 0){ return val_to_return; }
    if(p.length < index){ return val_to_return; }

    return p[p.length - index].z;
  };

	var index_u = 1; var index_v = 1;
  function u_mod(modulo = 2, val_to_return = 0, variable = u, index = index_u){
    if(index%modulo == 0){ return variable; }

    return val_to_return;
  }

  function v_mod(modulo = 2, val_to_return = 0, variable = v, index = index_v){
    if(index%modulo == 0){ return variable; }

    return val_to_return;
  }
	function mod(index, ...args){ return args[index%args.length]; }

	function q(func, it = 1, op = "+", u = ind_u, v = ind_v){
		var funcR = func;
		var f = {toInv:func};
		for(var i = 0; i < it; i++){
			var index = funcR.length - (i+1);
			var fInvUV = reg_inv(f, 'u', 'v').toInv;
			f.toInv = fInvUV;
			funcR = funcR.substring(0, index) + op + fInvUV + ")" + funcR.substring(index + 1);
		}
		func = funcR;
		return eval(func);
	}

	var A = glo.params.A; var B = glo.params.B; var C = glo.params.C; var D = glo.params.D; var E = glo.params.E; var F = glo.params.F; var G = glo.params.G; var H = glo.params.H;
	var I = glo.params.I; var J = glo.params.J; var K = glo.params.K; var L = glo.params.L; var M = glo.params.M;

	var f = equations;
	if(f.fx == ""){ f.fx = 0; }
	if(f.fy == ""){ f.fy = 0; }
	if(f.fz == ""){ f.fz = 0; }
	if(f.falpha == ""){ f.falpha = 0; }
	if(f.fbeta == ""){ f.fbeta = 0; }

	reg(f, dim_one);

	var path = [];

	glo.toHisto = true;

	var u = 1; var v = 1; var n = 1;
	var uMax = 1; var vMax = 1; var nMax = 1;
	var uMin = 1; var vMin = 1; var nMin = 1;
	var stepU = 1; var stepV = 1;
	var x = 1; var y = 1; var z = 1;
	var r = 1; var alpha = 1; var beta = 0;
	var xN = 1; var yN = 1; var zN = 1;
	var xP = 1; var yP = 1; var zP = 1; var µN = 1; var µP = 1; var $P = 1;
	var $N = 1; var µ$N = 1; var $µN = 1; var µµN = 1;
	var rCol = 1; var gCol  = 1; var bCol  = 1;  var mCol  = 1;
	try{
		x = eval(f.fx);
		y = eval(f.fy);
		z = eval(f.fz);
		alpha = eval(f.falpha);
		beta = eval(f.fbeta);
		if(isNaN(x) || isNaN(y) || isNaN(z) || isNaN(alpha) || isNaN(beta)){ x = eval(undefine); }
	}
	catch(error){
		glo.toHisto = false;
		return false;
	}

	return true;
}

function reg(f, dim_one){
	for(var prop in f){
		if(f[prop][0] == "'"){ f[prop] = "0"; }
		else{
			f[prop] = f[prop].toString();
			f[prop] = f[prop].replace(/\s/g,"");
			f[prop] = f[prop].replace(/cudv|cvdu/g,"cos(u/v)");
			f[prop] = f[prop].replace(/cufv|cvfu/g,"cos(uv)");
			f[prop] = f[prop].replace(/sudv|svdu/g,"sin(u/v)");
			f[prop] = f[prop].replace(/sufv|svfu/g,"sin(u*v)");
			f[prop] = f[prop].replace(/cupv|cvpu/g,"cos(u+v)");
			f[prop] = f[prop].replace(/cumv/g,"cos(u-v)");
			f[prop] = f[prop].replace(/cvmu/g,"cos(v-u)");
			f[prop] = f[prop].replace(/supv|svpu/g,"sin(u+v)");
			f[prop] = f[prop].replace(/sumv/g,"sin(u-v)");
			f[prop] = f[prop].replace(/svmu/g,"sin(v-u)");
			f[prop] = f[prop].replace(/cu/g,"cos(u)");
			f[prop] = f[prop].replace(/cv/g,"cos(v)");
			f[prop] = f[prop].replace(/su/g,"sin(u)");
			f[prop] = f[prop].replace(/sv/g,"sin(v)");
			f[prop] = f[prop].replace(/²/g,"**2");
			f[prop] = f[prop].replace(/uu([^,%*+-/)])/g, 'uu*$1');
			f[prop] = f[prop].replace(/vv([^,%*+-/)])/g, 'vv*$1');
			f[prop] = f[prop].replace(/u([^,%*+-/)])/g, 'u*$1');
			f[prop] = f[prop].replace(/v([^,%*+-/)])/g, 'v*$1');
			f[prop] = f[prop].replace(/µP([^,%*+-/)])/g, 'µP*$1');
			f[prop] = f[prop].replace(/µN([^,%*+-/)])/g, 'µN*$1');
			f[prop] = f[prop].replace(/\$N([^,%*+-/)])/g, '$N*$1');
			f[prop] = f[prop].replace(/\$P([^,%*+-/)])/g, '$P*$1');
			f[prop] = f[prop].replace(/x([^,%*+-/NP)])/g, 'x*$1');
			f[prop] = f[prop].replace(/y([^,%*+-/NP)])/g, 'y*$1');
			f[prop] = f[prop].replace(/z([^,%*+-/NP)])/g, 'z*$1');
			f[prop] = f[prop].replace(/n([^,%*+-/d)])/g, 'n*$1');
			f[prop] = f[prop].replace(/r([^,%*+-/nmC)])/g, 'r*$1');
			f[prop] = f[prop].replace(/alpha([^,%*+-/nt)])/g, 'alpha*$1');
			f[prop] = f[prop].replace(/beta([^,%*+-/nt)])/g, 'beta*$1');
			f[prop] = f[prop].replace(/xN([^,%*+-/)])/g, 'xN*$1');
			f[prop] = f[prop].replace(/yN([^,%*+-/)])/g, 'yN*$1');
			f[prop] = f[prop].replace(/zN([^,%*+-/)])/g, 'zN*$1');
			f[prop] = f[prop].replace(/xP([^,%*+-/)])/g, 'xP*$1');
			f[prop] = f[prop].replace(/yP([^,%*+-/)])/g, 'yP*$1');
			f[prop] = f[prop].replace(/zP([^,%*+-/)])/g, 'zP*$1');
			f[prop] = f[prop].replace(/pi([^,%*+-/)])/g, 'pi*$1');
			f[prop] = f[prop].replace(/ep([^,%*+-/)])/g, 'ep*$1');
			f[prop] = f[prop].replace(/A([^,%*+-/)])/g, 'A*$1');
			f[prop] = f[prop].replace(/B([^,%*+-/)])/g, 'B*$1');
			f[prop] = f[prop].replace(/C([^,%*+-/o)])/g, 'C*$1');
			f[prop] = f[prop].replace(/D([^,%*+-/)])/g, 'D*$1');
			f[prop] = f[prop].replace(/E([^,%*+-/)])/g, 'E*$1');
			f[prop] = f[prop].replace(/F([^,%*+-/)])/g, 'F*$1');
			f[prop] = f[prop].replace(/G([^,%*+-/)])/g, 'G*$1');
			f[prop] = f[prop].replace(/H([^,%*+-/)])/g, 'H*$1');
			f[prop] = f[prop].replace(/I([^,%*+-/)])/g, 'I*$1');
			f[prop] = f[prop].replace(/J([^,%*+-/)])/g, 'J*$1');
			f[prop] = f[prop].replace(/K([^,%*+-/)])/g, 'K*$1');
			f[prop] = f[prop].replace(/L([^,%*+-/)])/g, 'L*$1');
			f[prop] = f[prop].replace(/M([^,%*+-/)])/g, 'M*$1');
			f[prop] = f[prop].replace(/rCol([^,%*+-/)])/g, 'rCol*$1');
			f[prop] = f[prop].replace(/gCol([^,%*+-/)])/g, 'gCol*$1');
			f[prop] = f[prop].replace(/bCol([^,%*+-/)])/g, 'bCol*$1');
			f[prop] = f[prop].replace(/mCol([^,%*+-/)])/g, 'mCol*$1');

			f[prop] = f[prop].replace(/\)([^,%*+-/)'])/g, ')*$1');
			f[prop] = f[prop].replace(/(\d+)([^,%*+-/.\d)])/g, '$1*$2');
			if(dim_one){
				f[prop] = f[prop].replace(/v/g,"u");
			}
			f[prop] = f[prop].replace(/u\*_mod/g,"u_mod");
			f[prop] = f[prop].replace(/v\*_mod/g,"v_mod");
			f[prop] = f[prop].replace(/sin\*/g,"sin");
			f[prop] = f[prop].replace(/tan\*/g,"tan");
			f[prop] = f[prop].replace(/sign\*/g,"sign");
			f[prop] = f[prop].replace(/logten\*/g,"logten");
			f[prop] = f[prop].replace(/hy\*pot/g,"hypot");
			f[prop] = f[prop].replace(/mx\*/g,"mx");
			f[prop] = f[prop].replace(/my\*/g,"my");
			f[prop] = f[prop].replace(/mz\*/g,"mz");
			f[prop] = f[prop].replace(/ex\*/g,"ex");
		}
	}
}

function make_curves(u_params = {
	min: -glo.params.u, max: glo.params.u, nb_steps: glo.params.steps_u,
}, v_params = {
	min: -glo.params.v, max: glo.params.v, nb_steps: glo.params.steps_v,
},
 equations = {
	fx: glo.params.text_input_x,
	fy: glo.params.text_input_y,
	fz: glo.params.text_input_z,
	falpha: glo.params.text_input_alpha,
	fbeta: glo.params.text_input_beta,
}, dim_one = glo.dim_one){

	var good = test_equations(equations, dim_one);
	if(good){
		if(glo.resetClones){ resetClones(); }

		if(typeof(glo.curves) != "undefined"){
			glo.curves.lineSystem.dispose(true); delete glo.curves.lineSystem;
			glo.curves = {}; delete glo.curves
		}

		if(glo.coordsType == 'cartesian'){ glo.curves = new Curves(); }
		else{ glo.curves = new CurvesByRot(); }

		make_ribbon();

		if(!glo.first_rot){ glo.scene.meshes.map(mesh => { mesh.rotation.z = glo.rot_z; }); }
	}
}

function make_ribbon(){
	var nameRibbon = "Ribbon_" + glo.numRibbon;
	glo.numRibbon++;

	var material = new BABYLON.StandardMaterial("myMaterial", glo.scene);
	material.backFaceCulling = false;

	var paths = glo.curves.paths;
	if(glo.normalMode && !glo.fromSlider){ paths = glo.curves.pathsSecond; }
	else if(typeof(glo.verticesNormals) != "undefined") { delete glo.verticesNormals; }

	if(glo.fromSlider){ delete glo.verticesColors; }

	ribbonDispose();
	if(!glo.params.playWithColors && glo.colorsType == 'none'){
		if(!glo.voronoiMode){ glo.ribbon = BABYLON.MeshBuilder.CreateRibbon(nameRibbon, {pathArray: paths, sideOrientation:1, updatable: true, }, glo.scene, ); }
		else{
			var colorsRibbon = voronoi();
			var white = BABYLON.Color3.White();
			glo.emissiveColor = white; glo.diffuseColor = white;
			glo.ribbon = BABYLON.MeshBuilder.CreateRibbon(nameRibbon, {pathArray: paths, colors: colorsRibbon, sideOrientation:1, updatable: true, }, glo.scene, );
		}
	}
	else{
		ribbonDispose();
		if(1 == 1){
			glo.ribbon = BABYLON.MeshBuilder.CreateRibbon(nameRibbon, {pathArray: paths, sideOrientation:1, updatable: true, }, glo.scene, );
			glo.colorsRibbonSave = {};
			objCols = {colsArr: colorsRibbon};
			Object.assign(glo.colorsRibbonSave, objCols);
			var white = BABYLON.Color3.White();
			glo.emissiveColor = white; glo.diffuseColor = white;
			makeOtherColors(true);
		}
		else{
			if(typeof(glo.colorsRibbonSave) != "undefined"){
				glo.ribbon = BABYLON.MeshBuilder.CreateRibbon(nameRibbon, {pathArray: paths, colors: glo.colorsRibbonSave.colsArr, sideOrientation:1, updatable: true, }, glo.scene, );
			}
			else{
				glo.ribbon = BABYLON.MeshBuilder.CreateRibbon(nameRibbon, {pathArray: paths, sideOrientation:1, updatable: true, }, glo.scene, );
			}
		}
	}

	glo.ribbon.material = material;
	glo.ribbon.material.emissiveColor = glo.emissiveColor;
	glo.ribbon.material.diffuseColor = glo.diffuseColor;
	glo.ribbon.material.alphaMode = BABYLON.Engine.ALPHA_COMBINE;
	glo.ribbon.material.alpha = glo.ribbon_alpha;
	glo.ribbon.alphaIndex = 998;
	glo.ribbon.material.wireframe = glo.wireframe;

	glo.is_ribbon = true;
  if(!glo.ribbon_visible){ glo.ribbon.visibility = 0; }
}

function ribbonDispose(){
	if(typeof(glo.ribbon) != "undefined" && glo.ribbon != null){ glo.ribbon.dispose(); glo.ribbon = null; }
}

function makeOtherColors(){
	if(glo.colorsType != 'none' && !glo.params.playWithColors){ return makeRandomColors(); }
	else{ return makeColors(); }
}

function makeRandomColors(){
	var colors = []; var n = 0;
	var pathsLenght = glo.curves.paths.length * glo.curves.paths[0].length;
	glo.curves.paths.map(path => {
		var color = BABYLON.Color3.Random();
		path.map(p => {
			if(glo.colorsType == 'face'){ color = BABYLON.Color3.Random(); }
			colors.push(color);
			n++;
		});
	});
	return colors;
}

function makeColors(){
	var colors = [];
	var verticesNormals = glo.ribbon.getVerticesData(BABYLON.VertexBuffer.NormalKind);

	var verticesNormalsLength = verticesNormals.length;

	var dim_one = false;

	var equations = {
		fx: glo.params.text_input_color_x,
		fy: glo.params.text_input_color_y,
		fz: glo.params.text_input_color_z,
		falpha: glo.params.text_input_color_alpha,
		fbeta: glo.params.text_input_color_beta,
	};

	var A = glo.params.A; var B = glo.params.B; var C = glo.params.C; var D = glo.params.D; var E = glo.params.E; var F = glo.params.F; var G = glo.params.G; var H = glo.params.H;
	var I = glo.params.I; var J = glo.params.J; var K = glo.params.K; var L = glo.params.L; var M = glo.params.M;

	function mx(index = 1, val_to_return = 0, p = pathsNow){
		index = parseInt(index);
		if(index <= 0){ index = 1; }
    if(p.length == 0){ return val_to_return; }
    if(p.length < index){ return val_to_return; }

    return p[p.length - index].x;
  };
  function my(index = 1, val_to_return = 0, p = pathsNow){
		index = parseInt(index);
		if(index <= 0){ index = 1; }
    if(p.length == 0){ return val_to_return; }
    if(p.length < index){ return val_to_return; }

    return p[p.length - index].y;
  };
  function mz(index = 1, val_to_return = 0, p = pathsNow){
		index = parseInt(index);
		if(index <= 0){ index = 1; }
    if(p.length == 0){ return val_to_return; }
    if(p.length < index){ return val_to_return; }

    return p[p.length - index].z;
  };

  function u_mod(modulo = 2, val_to_return = 0, variable = u, index = u){
    if(index%modulo == 0){ return variable; }

    return val_to_return;
  }
  function v_mod(modulo = 2, val_to_return = 0, variable = u, index = v){
    if(index%modulo == 0){ return variable; }

    return val_to_return;
  }
	function mod(index, ...args){ return args[index%args.length]; }

	function q(func, it = 1, op = "+", u = ind_u, v = ind_v){
		var funcR = func;
		var f = {toInv:func};
		for(var i = 0; i < it; i++){
			var index = funcR.length - (i+1);
			var fInvUV = reg_inv(f, 'u', 'v').toInv;
			f.toInv = fInvUV;
			funcR = funcR.substring(0, index) + op + fInvUV + ")" + funcR.substring(index + 1);
		}
		func = funcR;
		return eval(func);
	}

	xEmpty = equations.fx == '' ? true : false; yEmpty = equations.fy == '' ? true : false; zEmpty = equations.fz == '' ? true : false;

	var good = test_equations(equations, dim_one);
	if(good){
		ribbonToWhite();

		var f = {
			x: equations.fx,
			y: equations.fy,
			z: equations.fz,
			alpha: equations.falpha,
			beta: equations.fbeta,
		};

		reg(f, dim_one);

	  var x = 0; var y = 0; var z = 0; var alpha = 0; var beta = 0;

		if(f.x == ""){ f.x = 0; }
		if(f.y == ""){ f.y = 0; }
		if(f.z == ""){ f.z = 0; }
		if(f.alpha == ""){ f.alpha = 0; }
		if(f.beta == ""){ f.beta = 0; }

		var isAlpha = false;
		var alpha = 0;
		if(glo.params.text_input_color_alpha != ""){
			isAlpha = true;
		}
		var isBeta = false;
		var beta = 0;
		if(glo.params.text_input_color_beta != ""){
			isBeta = true;
		}

		var colorsNumbersX = []; var colorsNumbersY = []; var colorsNumbersZ = [];
		var colorsAllNumbers = [];
		var paths = glo.curves.paths; var pathsLength = paths.length;
		var allPathsNb = pathsLength*paths[0].length;
		var pathsNow = [];
		var itColors = glo.params.itColors; var itLength = itColors**2; pathsLength/=itColors;
		var n = 0;
		for(var it = 0; it < itLength; it++){
			for(var u = 0; u < pathsLength; u++){
				ind_u = u;
				var path = paths[u];
				var pathNow = [];
				var pathLength = path.length/itColors;
				for(var v = 0; v < pathLength; v++){
					var p = path[v];
					if(n*3 + 2 > verticesNormalsLength){ n = 0; }
					var xN = verticesNormals[n*3]; var yN = verticesNormals[n*3 + 1]; var zN = verticesNormals[n*3 + 2];
					var xP = p.x; var yP = p.y; var zP = p.z;
					var µN = xN*yN*zN; var µP = xP*yP*zP;
					var $N = (xN+yN+zN)/3; var $P = (xP+yP+zP)/3; var µP = xP*yP*zP;
					var µ$N = µN*$N; var $µN = µN+$N;
					var µµN = µ$N*$µN;

					ind_v = v;

					x = eval(f.x);
					y = eval(f.y);
					z = eval(f.z);

					if(glo.params.modCos){ x = !xEmpty ? c(x) : x; y = !yEmpty ? c(y) : y; z = !zEmpty ? c(z) : z; }

					if(glo.params.colorsByRotate){
						//var pos = {x: x+y+z, y: 0, z: 0};
						var pos = {x: x, y: 0, z: 0};
						pos = rotateByMatrix(pos, 0, y, z);
						x = pos.x; y = pos.y; z = pos.z;
					}

					if(x == Infinity || x == -Infinity || isNaN(x)){ x = 0; }
					if(y == Infinity || y == -Infinity || isNaN(y)){ y = 0; }
					if(z == Infinity || z == -Infinity || isNaN(z)){ z = 0; }
					if(isBeta){
						alpha = eval(f.alpha);
						beta = eval(f.beta);
						if(alpha == Infinity || alpha == -Infinity || isNaN(alpha)){ alpha = 0; }
						if(beta == Infinity || beta == -Infinity || isNaN(beta)){ beta = 0; }
						if(glo.params.rotAlpha != 0){ alpha*=glo.params.rotAlpha; } if(glo.params.rotBeta != 0){ beta*=glo.params.rotBeta; }
						var pos = {x: x, y: y, z: z};
						pos = rotateByMatrix(pos, 0, alpha, beta);
						x = pos.x; y = pos.y; z = pos.z;
					}
					else if(isAlpha){
						alpha = eval(f.alpha);
						if(alpha == Infinity || alpha == -Infinity || isNaN(alpha)){ alpha = 0; }
						if(glo.params.rotAlpha != 0){ alpha*=glo.params.rotAlpha; }
						var pos = {x: x, y: y, z: z};
						pos = rotateByMatrix(pos, 0, alpha, 0);
						x = pos.x; y = pos.y; z = pos.z;
					}

					colorsNumbersX.push(x); colorsNumbersY.push(y); colorsNumbersZ.push(z);
					colorsAllNumbers.push(x, y, z);
					pathNow.push({x: x, y: y, z: z});
					pathsNow.push({x: x, y: y, z: z});
					colors.push({r: x, g: y, b: z});

					n++;
				}
			}
		}

		var maxX = max(colorsNumbersX); var maxY = max(colorsNumbersY); var maxZ = max(colorsNumbersZ);
		var minX = min(colorsNumbersX); var minY = min(colorsNumbersY); var minZ = min(colorsNumbersZ);
		var maximumX = abs(maxX - minX); var maximumY = abs(maxY - minY); var maximumZ = abs(maxZ - minZ);
		var maxAll = max(colorsAllNumbers);
		var minAll = min(colorsAllNumbers);
		var maximumAll = abs(maxAll - minAll);
		var newColors = [];

		if(glo.params.playWithColorMode == 'xyz'){ colors.map(color => {
			if(!glo.transCol){ var r = color.r / maxX; r = r == Infinity ? 0 : r; var g = color.g / maxY; g = g == Infinity ? 0 : g; var b = color.b / maxZ; b = b == Infinity ? 0 : b; }
			else{ var r = (color.r - minX) / maximumX; r = r == Infinity ? 0 : r; var g = (color.g - minY) / maximumY; g = g == Infinity ? 0 : g; var b = (color.b - minZ) / maximumZ; b = b == Infinity ? 0 : b; }
			r = isNaN(r) ? 0 : r; g = isNaN(g) ? 0 : g; b = isNaN(b) ? 0 : b;
			newColors.push(new BABYLON.Color4(r, g, b, 1)); });
		}
		else if(glo.params.playWithColorMode == 'all'){
			colors.map(color => {
				if(!glo.transCol){ var r = color.r / maxAll; r = r == Infinity ? 0 : r; var g = color.g / maxAll; g = g == Infinity ? 0 : g; var b = color.b / maxAll; b = b == Infinity ? 0 : b; }
				else{ var r = (color.r - minAll) / maximumAll; r = r == Infinity ? 0 : r; var g = (color.g - minAll) / maximumAll; g = g == Infinity ? 0 : g; var b = (color.b - minAll) / maximumAll; b = b == Infinity ? 0 : b; }
					r = isNaN(r) ? 0 : r; g = isNaN(g) ? 0 : g; b = isNaN(b) ? 0 : b;
				newColors.push(new BABYLON.Color4(r, g, b, 1));
			});
		}
		else{
			colors.map(color => {
				var r = color.r; r = r == Infinity ? 0 : r; var g = color.g; g = g == Infinity ? 0 : g; var b = color.b; b = b == Infinity ? 0 : b;
					r = isNaN(r) ? 0 : r; g = isNaN(g) ? 0 : g; b = isNaN(b) ? 0 : b;
				newColors.push(new BABYLON.Color4(r, g, b, 1));
			});
		}

		glo.colors = newColors;

		if(glo.params.saturation != 0){ newColors = saturation(false, true); }
		if(glo.params.tint != 0){ newColors = tint(false, true); }

		if(glo.params.rColor != 0){ var rColor = glo.params.rColor; newColors.map(newColor => { newColor.r*=rColor; }); }
		if(glo.params.gColor != 0){ newColors = mColorShell(false, true); }
		if(glo.params.bColor != 0){ var bColor = glo.params.bColor; newColors.map(newColor => { newColor.b*=bColor; }); }

		if(glo.params.colorsAbs){ newColors.map(newColor => { newColor.r = abs(newColor.r); newColor.b = abs(newColor.b); newColor.g = abs(newColor.g); }); }

		if(glo.params.colors2){
			var k = 0;
			colors.map(color => {
				var r = ((abs(color.r)) / maxX);
				var g = ((abs(color.g)) / maxY);
				if(r == 0){ r = 1; } if(g == 0){ g = 1; }
				var ind = parseInt(r*g*allPathsNb);
				if(ind > newColors.length - 1){ ind = newColors.length - 1 }

				newColors[ind] = new BABYLON.Color4(newColors[k].r, newColors[k].g, newColors[k].b, 1);
				k++;
			});
		}

		if(glo.params.invCol){
			newColors.map(newColor => { newColor.r = 1 - newColor.r; newColor.b = 1 - newColor.b; newColor.g = 1 - newColor.g; });
		}
		glo.colors = newColors;

		var colorsArray = []; newColors.map(newColor => { colorsArray.push(newColor.r, newColor.g, newColor.b, newColor.a); });
		glo.ribbon.setVerticesData(BABYLON.VertexBuffer.ColorKind, colorsArray);

		return true;
	}

	return false;
}

function allColorsSlide(noSlide){
	remake = {tintSlider: true, saturationSlider: true, rotAlphaSlider: true, rotBetaSlider: true, toColRSlider: true, gColorSlider: true};
	remake[noSlide] = false;
	if(glo.params.tint != 0 && remake.tintSlider){ tint(); }
	if(glo.params.saturation != 0 && remake.saturationSlider){ saturation(); }
	if(glo.params.rotAlpha != 0 && remake.rotAlphaSlider){ alphaColor(); }
	if(glo.params.rotBeta != 0 && remake.rotBetaSlider){ betaColor(); }
	if(glo.params.toColR != 0 && remake.toColRSlider){ colByMidSLid(); }
	if(glo.params.gColor != 0 && remake.gColorSlider){ mColorShell(); }
}

function saturation(update = true, fromMakeColors = false){
	return updateColors({ mode: true, updateGloColors: false, update: update, }, function(c){ fCol(c, x => x*=glo.params.saturation); });
}
function tint(update = true, fromMakeColors = false){
	var tint = glo.sliderGain;
	if(fromMakeColors){ tint = glo.params.tint; }
	return updateColors({ mode: true, updateGloColors: true, update: update, }, function(c){ fCol(c, x => x+=tint); });
}
function mColorShell(update = true, fromMakeColors = false){
	var gain = abs(glo.params.gColor);
	var pos = true;
	var coeff = 1 + glo.params.G;
	gain*=coeff;
	var n = 0; var k = 0; var m = glo.params.M
	return updateColors({ mode: glo.params.playWithColors, updateGloColors: true, update: update, }, function(col){
		if(n%2==0){
			var co = abs(cos(gain+k)); var si = abs(sin(gain+k));
			var cps = si+co;
			pos ? fCol(col, x => x/=cps) : fCol(col, x => x*=cps);
		}
		else{
			var co = abs(cos(gain+k)); var si = abs(sin(gain+k));
			var cms = co-si;
			pos ? fCol(col, x => x/=cms) : fCol(col, x => x*=cms);
		}

		n++; k+=PI/m;
	});
}
function modColor(color){
	var col = glo.params[color];
	colorsArr = [];
	switch (color) {
		case 'rColor':
			glo.colors.map(c => { colorsArr.push(c.r * col, c.g, c.b, c.a); });
			break;
		case 'gColor':
			glo.colors.map(c => { colorsArr.push(c.r, c.g * col, c.b, c.a); });
			break;
		case 'bColor':
			glo.colors.map(c => { colorsArr.push(c.r, c.g, c.b * col, c.a); });
			break;
	}
	glo.ribbon.setVerticesData(BABYLON.VertexBuffer.ColorKind, colorsArr);
}

function modColorR(){ modColor('rColor'); }
function modColorG(){ modColor('gColor'); }
function modColorB(){ modColor('bColor'); }

function ribbonToWhite(){
	if((glo.emissiveColor != white || glo.diffuseColor != white) && glo.ribbon.material != null){
		var white = BABYLON.Color3.White();
		glo.ribbon.material.emissiveColor = white; glo.ribbon.material.diffuseColor = BABYLON.Color3.White();
	}
}

function simpleColorsArr_ToArrColors4(arr){
	var arrToReturn = [];
	var arrLength = arr.length;
	for (var i = 0; i < arrLength; i++) {
		arrToReturn.push({
			r: arr[i*4], g: arr[(i*4)+1], b: arr[(i*4)+2], a: arr[(i*4)+3]
		});
	}
	return arrToReturn;
}

function updateColors(options = {}, fUpdate){
	options.updateGloColors = typeof(options.updateGloColors) == 'undefined' ? true : options.updateGloColors;
	options.update = typeof(options.update) == 'undefined' ? true : options.update;
	options.mode = typeof(options.mode) == 'undefined' ? true : options.mode;
	options.toGloColors = typeof(options.toGloColors) == 'undefined' ? true : options.toGloColors;

	if(options.toGloColors){ var colorsToUpdate = glo.colors; }
	else{ var colorsToUpdate = simpleColorsArr_ToArrColors4(glo.ribbon.getVerticesData(BABYLON.VertexBuffer.ColorKind)); }

	var colorsArr = [];
	if(options.mode){
		if(options.updateGloColors){
			colorsToUpdate.map(c => {
				fUpdate(c);
				if(options.update){ colorsArr.push(c.r, c.g, c.b, c.a); }
				else{ colorsArr.push({r: c.r, g: c.g, b: c.b, a: c.a}); }
			});
		}
		else{
			colorsToUpdate.map(c => {
				var col = { r: c.r, g: c.g, b: c.b, a: c.a };
				fUpdate(col);
				if(options.update){ colorsArr.push(col.r, col.g, col.b, col.a); }
				else{ colorsArr.push({r: col.r, g: col.g, b: col.b, a: col.a}); }
			});
		}
		if(options.update){ glo.ribbon.setVerticesData(BABYLON.VertexBuffer.ColorKind, colorsArr); }
		else{ return colorsArr; }
	}

	return false;
}
function fCol(colorToUpdate, f){
	colorToUpdate.r = f(colorToUpdate.r); colorToUpdate.g = f(colorToUpdate.g); colorToUpdate.b = f(colorToUpdate.b);
}

function invCol(){
	updateColors({mode: glo.params.playWithColors, updateGloColors: true }, function(c){ fCol(c, x => x = 1-x) });
}

function mColorB(){
	var pos = glo.is_sliderGainPos;
	var gain = abs(glo.sliderGain);
	var coeff = 1 + glo.params.G;
	gain*=coeff;
	var n = 0; var k = 0; var e = glo.params.E
	updateColors({ mode: glo.params.playWithColors, updateGloColors: true, }, function(col){
		if(n%2==0){
			var co = abs(cos(gain+k)); var si = abs(sin(gain+k));
			var cs = co*si; var cds = co/si; var cms = co-si; var smc = si-co; var cps = si+co;
			if(pos){ col.r/=cs; col.g/=cs; col.b/=cs; }
			else{ col.r*=cs; col.g*= cs; col.b*=cs; }
		}
		else{
			var co = abs(cos(gain+k)); var si = abs(sin(gain+k));
			var cs = co*si; var cds = co/si; var cms = co-si; var smc = si-co; var cps = si+co;
			if(pos){ col.r/=cds; col.g/=cds; col.b/=cds; }
			else{ col.r*=cds; col.g*=cds; col.b*=cds; }
		}

		n++; k+=PI/(1+e);
	});
}

function alphaColor(){
	rotationColors(glo.params.rotAlpha, 0, 0);
}
function betaColor(){
	rotationColors(0, glo.params.rotBeta, 0);
}
function rotationColors(alpha, beta, teta, updateCol = true){
	updateColors({ mode: glo.params.playWithColors, updateGloColors: updateCol, }, function(c){
		var pos = {x: c.r, y: c.g, z: c.b};
		pos = rotateByMatrix(pos, alpha, beta, teta);
		c.r = pos.x; c.g = pos.y; c.b = pos.z;
	});
}

function accuade(){
	if(glo.params.playWithColors ){
		var colorsArr = [];
		var acc = 2;
		glo.colors.map(c => {
			if(c.r != c.g || c.r != c.b || c.g != c.b){
				var colorMaxName = c.r > c.g ? "r" : "g";
				if(colorMaxName == 'r'){ colorMaxName = c.r > c.b ? "r" : "b"; }
				else{ colorMaxName = c.g > c.b ? "g" : "b"; }
				if(c[colorMaxName] <= 1 && c[colorMaxName] >= 0.33){ c[colorMaxName] = 1 - ((1 - c[colorMaxName]) / acc); }
				else{ c[colorMaxName]*=acc; }
			}
			colorsArr.push(c.r, c.g, c.b, c.a);
		});
		glo.ribbon.setVerticesData(BABYLON.VertexBuffer.ColorKind, colorsArr);
	}
}
function colByMid(mod = 0.5){
	if(glo.params.playWithColors ){
		var colorsArr = [];
		if(mod > 1){ mod = -mod; }
		glo.colors.map(c => {
			if(c.r != c.g || c.r != c.b || c.g != c.b){
				var colorMidName = 'r';
				if((c.g < c.r && c.g > c.b) || (c.g > c.r && c.g < c.b)){ colorMidName = 'g'; }
				else if((c.b < c.r && c.b > c.g) || (c.b > c.r && c.b < c.g)){ colorMidName = 'b'; }
				if(colorMidName == 'r'){
					c.b = c.b < c.g ? c.b + ((c.r - c.b) * mod) : c.b - ((c.b - c.r) * mod);
					c.g = c.b < c.g ? c.g - ((c.g - c.r) * mod) : c.g + ((c.r - c.g) * mod);
				}
				else if(colorMidName == 'g'){
					c.r = c.r < c.b ? c.r + ((c.g - c.r) * mod) : c.r - ((c.r - c.g) * mod);
					c.b = c.r < c.b ? c.b - ((c.b - c.g) * mod) : c.b + ((c.g - c.b) * mod);
				}
				else if(colorMidName == 'b'){
					c.r = c.r < c.g ? c.r + ((c.b - c.r) * mod) : c.r - ((c.r - c.b) * mod);
					c.g = c.r < c.g ? c.g - ((c.g - c.b) * mod) : c.g + ((c.b - c.g) * mod);
				}
			}
			c.r < 0 ? 0 : c.r; c.g < 0 ? 0 : c.g; c.b < 0 ? 0 : c.b;
			c.r > 1 ? 1 : c.r; c.g > 1 ? 1 : c.g; c.b > 1 ? 1 : c.b;
			colorsArr.push(c.r, c.g, c.b, c.a);
		});
		glo.ribbon.setVerticesData(BABYLON.VertexBuffer.ColorKind, colorsArr);
	}
}
function colByMidSLid(mod = glo.sliderGain){
	glo.params.playWithColors = true;
	var colorsArr = [];
	mod=-mod;
	updateColors({ mode: glo.params.playWithColors, updateGloColors: true, }, function(c){
		var colorMidName = 'r';
		if((c.g < c.r && c.g > c.b) || (c.g > c.r && c.g < c.b)){ colorMidName == 'g'; }
		else if((c.b < c.r && c.b > c.g) || (c.b > c.r && c.b < c.g)){ colorMidName == 'b'; }
		if(colorMidName == 'r'){ c.b = goToNumber(c.b, c.r, mod); c.g = goToNumber(c.g, c.r, mod); }
		else if(colorMidName == 'g'){ c.b = goToNumber(c.b, c.g, mod); c.r = goToNumber(c.r, c.g, mod); }
		else{ c.r = goToNumber(c.r, c.b, mod); c.g = goToNumber(c.g, c.b, mod); }
		c.r < 0 ? 0 : c.r; c.g < 0 ? 0 : c.g; c.b < 0 ? 0 : c.b;
		c.r > 1 ? 1 : c.r; c.g > 1 ? 1 : c.g; c.b > 1 ? 1 : c.b;
	});
}
function goToNumber(numGo, numToGo, k){
	return numGo < numToGo ? numGo + ((numToGo - numGo) * k) : numGo - ((numGo - numToGo) * k);
}
function testCol(){
	if(glo.params.playWithColors ){
		var colorsArr = [];
		var acc = 2;
		glo.colors.map(c => {
			if(c.r != c.g || c.r != c.b || c.g != c.b){
				var colorMaxName = c.r > c.g ? "r" : "g";
				if(colorMaxName == 'r'){ colorMaxName = c.r > c.b ? "r" : "b"; }
				else{ colorMaxName = c.g > c.b ? "g" : "b"; }
				if(c[colorMaxName] < 0.1){ c[colorMaxName] = 1 - ((1 - c[colorMaxName]) / acc); }
			}
			colorsArr.push(c.r, c.g, c.b, c.a);
		});
		glo.ribbon.setVerticesData(BABYLON.VertexBuffer.ColorKind, colorsArr);
	}
}

function voronoi(func = min){
	var paths = glo.curves.paths;
	var pathsLength = paths.length;
	var nbPoints = glo.voronoi.nbPoints;
	var points = []; var colors = [];
	for(var i = 0; i < nbPoints; i++){
		points.push({pt: glo.curves.paths[parseInt(rnd() * (pathsLength - 1))][parseInt(rnd() * (pathsLength - 1))], color: BABYLON.Color3.Random(), });
	}
	paths.map(path => {
		path.map(p => {
			var distances = [];
			var distancesCalc = [];
			for(var i = 0; i < nbPoints; i++){
				var dist = BABYLON.Vector3.Distance(p, points[i].pt);
				distances.push( { point: points[i], distance: dist, } );
				distancesCalc.push(dist);
			}

			var condition = func(distancesCalc);
			for(var i = 0; i < nbPoints; i++){
				if(distances[i].distance == condition){
					var colorRef = distances[i].point.color;
					break;
				}
			}

			colors.push(new BABYLON.Color3(colorRef.r, colorRef.g, colorRef.b));
		});
	});
	return colors;
}

function* playWithColNextMode(){
  var index = 0;
  var tab = ['xyz', 'all', 'none'];
  while(true){
		index++;
		if(index == tab.length){ index = 0; }
		glo.params.playWithColorMode = tab[index];
    yield tab[index];
  }
}

function whellSwitchForm(){
	var formSelect = glo.formes.getFormSelect();
	if(formSelect){
	  var numFormSelect = formSelect.num;
	  var numFormSelectInCoordType = formSelect.numFormInCoorType;
		var formsLength = glo.formes.select.length;
		var formsLengthInCoordType = glo.formes.getNbFormsInThisCoordtype();
		var numFirstFormInCoorType = glo.formes.getNumFirstFormInCoordType();
		var numLastFormInCoorType = glo.formes.getNumLastFormInCoordType();
		if(glo.whellSwitchFormDown){
			var numFormToSelect = numFirstFormInCoorType;
			if(numFormSelectInCoordType < formsLengthInCoordType - 1){ numFormToSelect = numFormSelect + 1; }
		}
		else{
			var numFormToSelect = numLastFormInCoorType;
			if(numFormSelectInCoordType > 0){ numFormToSelect = numFormSelect - 1; }
		}
		glo.formes.setFormSelectByNum(numFormToSelect);

		var formSelected = glo.formes.getFormSelect();
		var nameRadioFormToSelect = "Radio " + formSelected.form.text;
		glo.radios_formes.setCheckByName(nameRadioFormToSelect);
	}
	else{
		glo.formes.setFormSelectByNum(glo.formes.getNumFirstFormInCoordType());

		var formSelected = glo.formes.getFormSelect();
		var nameRadioFormToSelect = "Radio " + formSelected.form.text;
		glo.radios_formes.setCheckByName(nameRadioFormToSelect);
	}
}

function switchEqSphericToCylindrical(){
	var r = glo.input_x.text;
	var alpha = glo.input_y.text;
	var beta = glo.input_z.text;

	glo.input_x.text = r + "sin(" + alpha + ")";
	glo.input_y.text = beta;
	glo.input_z.text = r + "cos(" + alpha + ")";

	glo.params.text_input_x = glo.input_x.text;
	glo.params.text_input_y = glo.input_y.text;
	glo.params.text_input_z = glo.input_z.text;

	switchCoords();
}

function switchCoords(){
	glo.coordinatesType.next();
	switchDrawCoordsType();
	add_radios();
}

function make_planes(){
	function make_plan(x,y,z){
		var sourcePlane = new BABYLON.Plane(x, y, z, 0);
		sourcePlane.normalize();
		var plane = BABYLON.MeshBuilder.CreatePlane("plane", {height: glo.planSize, width: glo.planSize, sourcePlane: sourcePlane, sideOrientation: BABYLON.Mesh.DOUBLESIDE}, glo.scene);
		var material = new BABYLON.StandardMaterial("myMaterial", glo.scene);
		material.backFaceCulling = false;
		material.alpha = 0.25;
		plane.material = material;
		plane.isPickable = false;

		return plane;
	}

	if(typeof(glo.planes) != "undefined"){
		glo.planes.map(plane => { plane.dispose(); plane = {}; } );
	}

	if(glo.planes_visible){
		glo.planes = [];
		glo.planes.push(make_plan(0, 0, 1));
		glo.planes.push(make_plan(0, 1, 0));
		glo.planes.push(make_plan(1, 0, 0));
	}
}

function showPlane(visible, plan){
	if(visible){
		var material = new BABYLON.StandardMaterial("myMaterial", glo.scene);
		material.backFaceCulling = false;
		material.alpha = 0.25;
		switch (plan) {
			case 'xy':
				var sourcePlane = new BABYLON.Plane(0, 0, 1, 0);
				sourcePlane.normalize();
				glo.planeXY = BABYLON.MeshBuilder.CreatePlane("plane", {height: glo.planSize, width: glo.planSize, sourcePlane: sourcePlane, sideOrientation: BABYLON.Mesh.DOUBLESIDE}, glo.scene);
				glo.planeXY.material = material;
				glo.planeXY.isPickable = false;
				break;
			case 'yz':
				var sourcePlane = new BABYLON.Plane(1, 0, 0, 0);
				sourcePlane.normalize();
				glo.planeYZ = BABYLON.MeshBuilder.CreatePlane("plane", {height: glo.planSize, width: glo.planSize, sourcePlane: sourcePlane, sideOrientation: BABYLON.Mesh.DOUBLESIDE}, glo.scene);
				glo.planeYZ.material = material;
				glo.planeYZ.isPickable = false;
				break;
			case 'xz':
				var sourcePlane = new BABYLON.Plane(0, 1, 0, 0);
				sourcePlane.normalize();
				glo.planeXZ = BABYLON.MeshBuilder.CreatePlane("plane", {height: glo.planSize, width: glo.planSize, sourcePlane: sourcePlane, sideOrientation: BABYLON.Mesh.DOUBLESIDE}, glo.scene);
				glo.planeXZ.material = material;
				glo.planeXZ.isPickable = false;
				break;
		}
	}
	else{
		switch (plan) {
			case 'xy':
				glo.planeXY.dispose(); glo.planeXY = {};
				break;
			case 'yz':
				glo.planeYZ.dispose(); glo.planeYZ = {};
				break;
			case 'xz':
				glo.planeXZ.dispose(); glo.planeXZ = {};
				break;
		}
	}
}

var showAxis = function(size, visibility = 0) {
	glo.labels_axis = [];
	glo.planes_axis = [];
	var makeTextPlane = function(text, color, size_plane) {
	  var plane = new BABYLON.Mesh.CreatePlane("TextPlane", size_plane, glo.scene, true);
		plane.visibility = 0;
		var label = new BABYLON.GUI.TextBlock();
    label.text = text;
    label.color = glo.labelGridColor;
    label.fontSize = size_plane * 10 + "px";
    label.fontWeight = "bold";
		label.height = "25px";
		label.width = "20px";
		label.name = "plane_label";
    label.isVisible = visibility;

		var panel = new BABYLON.GUI.StackPanel();
		panel.isVertical = false;
	  panel.zIndex = -1;

		panel.addControl(label);
    glo.advancedTexture.addControl(panel);

		panel.linkWithMesh(plane);

		glo.labels_axis.push(label);
		glo.planes_axis.push(plane);
		return plane;
   };

	 var pivot = new BABYLON.Vector3(0, 0, 0);

  glo.axisX = BABYLON.Mesh.CreateLines("axisX", [
    new BABYLON.Vector3.Zero(), new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, 0.05 * size, 0),
    new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, -0.05 * size, 0)
    ], glo.scene);
  glo.axisX.color = new BABYLON.Color3(1, 0, 0);
  glo.axisX.isPickable = false;
  var xChar = makeTextPlane("X", "red", size / 10);
  xChar.position = new BABYLON.Vector3(0.9 * size, -0.05 * size, 0);
  xChar.isPickable = false;

  var pivot_translation_xChar = xChar.position.subtract(pivot);
	xChar.setPivotMatrix(BABYLON.Matrix.Translation(pivot_translation_xChar.x, pivot_translation_xChar.y, pivot_translation_xChar.z));
	glo.xChar = xChar;

  glo.axisY = BABYLON.Mesh.CreateLines("axisY", [
      new BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3( -0.05 * size, size * 0.95, 0),
      new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3( 0.05 * size, size * 0.95, 0)
      ], glo.scene);
  glo.axisY.color = new BABYLON.Color3(0, 1, 0);
  glo.axisY.isPickable = false;
  var yChar = makeTextPlane("Y", "green", size / 10);
  yChar.position = new BABYLON.Vector3(0, 0.9 * size, -0.05 * size);
  yChar.isPickable = false;

	var pivot_translation_yChar = yChar.position.subtract(pivot);
	yChar.setPivotMatrix(BABYLON.Matrix.Translation(pivot_translation_yChar.x, pivot_translation_yChar.y, pivot_translation_yChar.z));
	glo.yChar = yChar;

  glo.axisZ = BABYLON.Mesh.CreateLines("axisZ", [
      new BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0 , -0.05 * size, size * 0.95),
      new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0, 0.05 * size, size * 0.95)
      ], glo.scene);
  glo.axisZ.color = new BABYLON.Color3(0, 0, 1);
  glo.axisZ.isPickable = false;
  var zChar = makeTextPlane("Z", "blue", size / 10);
  zChar.position = new BABYLON.Vector3(0, 0.05 * size, 0.9 * size);
  zChar.isPickable = false;

	var pivot_translation_zChar = zChar.position.subtract(pivot);
	zChar.setPivotMatrix(BABYLON.Matrix.Translation(pivot_translation_zChar.x, pivot_translation_zChar.y, pivot_translation_zChar.z));
	glo.zChar = zChar;

	glo.axisX.visibility = visibility;
	glo.axisY.visibility = visibility;
	glo.axisZ.visibility = visibility;
	xChar.visibility = 0;
	yChar.visibility = 0;
	zChar.visibility = 0;
};
function showGrid(size, number, axis_size = glo.axis_size, visibility = 0) {
	glo.axis_size = axis_size;
	if(typeof(glo.labels_grid) != "undefined"){
		glo.labels_grid.map(label_grid => { label_grid.dispose(); label_grid = {}; } );
		glo.planes_grid.map(plane_grid => { plane_grid.dispose(); plane_grid = {}; } );
		glo.gridX.map(gridX => { gridX.dispose(); gridX = {}; } );
		glo.gridY.map(gridY => { gridY.dispose(); gridY = {}; } );
		glo.gridZ.map(gridZ => { gridZ.dispose(); gridZ = {}; } );
	}
	glo.labels_grid = [];
	glo.planes_grid = [];
	function makeTextPlane(text, color, size_plane) {
	  var plane = new BABYLON.Mesh.CreatePlane("TextPlane", size_plane, glo.scene, true);
		var label_size = 10;
		if(size_plane < 1){ label_size = 10; }

		text = text.toFixed(1).toString();
		if(text[text.length-1] == "0"){ text = text .substring(0, text.length - 2) }

		plane.visibility = 0;
		plane.isPickable = 0;
		var label = new BABYLON.GUI.TextBlock();
    label.text = text;
    label.color = glo.labelGridColor;
    label.fontSize = label_size + "px";
    label.fontWeight = "bold";
		label.height = "20px";
		label.width = "30px";
		label.name = "grid_label";
    label.isVisible = visibility;

		var panel = new BABYLON.GUI.StackPanel();
		panel.isVertical = false;
	  panel.zIndex = -1;

		panel.addControl(label);
    glo.advancedTexture.addControl(panel);

		panel.linkWithMesh(plane);

		glo.labels_grid.push(label);
		glo.planes_grid.push(plane);
		return plane;
   };

	var pivot = new BABYLON.Vector3(0, 0, 0);

	var step = axis_size/number;
	glo.step = step;
	glo.gridX = []; glo.gridY = []; glo.gridZ = [];
	var start = step;
	if(glo.negatif){ start = -axis_size; }
	for(var i = start; i <= axis_size; i+=step){
		var points = [
	    new BABYLON.Vector3(i, -size, 0),
			new BABYLON.Vector3(i, size, 0),
		];
	  var lineX = BABYLON.Mesh.CreateLines("gridX", points, glo.scene);
		lineX.points = points;
		lineX.color = glo.color_line_grid;
		lineX.alpha = 0.5;
		lineX.visibility = visibility;
		lineX.isPickable = false;
	  var pivot_translation_lineX = lineX.position.subtract(pivot);
		lineX.setPivotMatrix(BABYLON.Matrix.Translation(pivot_translation_lineX.x, pivot_translation_lineX.y, pivot_translation_lineX.z));
		glo.gridX.push(lineX);
		var xChar = makeTextPlane(i, "black", size / 20);
	  xChar.position = new BABYLON.Vector3(i, size * 1.025, 0);
	  var pivot_translation_xChar = xChar.position.subtract(pivot);
		xChar.setPivotMatrix(BABYLON.Matrix.Translation(pivot_translation_xChar.x, pivot_translation_xChar.y, pivot_translation_xChar.z));

		var points = [
	    new BABYLON.Vector3(0, i, -size),
			new BABYLON.Vector3(0, i, size),
		];
	  var lineY = BABYLON.Mesh.CreateLines("gridX", points, glo.scene);
		lineY.points = points;
		lineY.color = glo.color_line_grid;
		lineY.alpha = 0.5;
		lineY.visibility = visibility;
		lineY.isPickable = false;
	  var pivot_translation_lineY = lineY.position.subtract(pivot);
		lineY.setPivotMatrix(BABYLON.Matrix.Translation(pivot_translation_lineY.x, pivot_translation_lineY.y, pivot_translation_lineY.z));
		glo.gridY.push(lineY);
		var yChar = makeTextPlane(i, "black", size / 20);
	  yChar.position = new BABYLON.Vector3(0, i, size * 1.025);
	  var pivot_translation_yChar = yChar.position.subtract(pivot);
		yChar.setPivotMatrix(BABYLON.Matrix.Translation(pivot_translation_yChar.x, pivot_translation_yChar.y, pivot_translation_yChar.z));

		var points = [
	    new BABYLON.Vector3(-size, 0, i),
			new BABYLON.Vector3(size, 0, i),
		];
	  var lineZ = BABYLON.Mesh.CreateLines("gridX", points, glo.scene);
		lineZ.points = points;
		lineZ.color = glo.color_line_grid;
		lineZ.alpha = 0.5;
		lineZ.visibility = visibility;
		lineZ.isPickable = false;
	  var pivot_translation_lineZ = lineZ.position.subtract(pivot);
		lineZ.setPivotMatrix(BABYLON.Matrix.Translation(pivot_translation_lineZ.x, pivot_translation_lineZ.y, pivot_translation_lineZ.z));
		glo.gridZ.push(lineZ);
		var zChar = makeTextPlane(i, "black", size / 20);
	  zChar.position = new BABYLON.Vector3(size, 0, i * 1.025);
	  var pivot_translation_zChar = zChar.position.subtract(pivot);
		zChar.setPivotMatrix(BABYLON.Matrix.Translation(pivot_translation_zChar.x, pivot_translation_zChar.y, pivot_translation_zChar.z));
	}
};

function viewOnX(orient = 1){
	glo.camera.alpha = 0;
	glo.camera.beta = PI/2;
	if(orient == 1){
		glo.camera.upVector = new BABYLON.Vector3(0,1,0);
	}
	else{
		glo.camera.upVector = new BABYLON.Vector3(0,0,1);
	}
}
function viewOnY(orient = 1){
	if(orient == 1){
		glo.camera.alpha = -PI/2;
		glo.camera.beta = PI/2;
		glo.camera.upVector = new BABYLON.Vector3(0,0,1);
	}
	else{
		glo.camera.alpha = -PI;
		glo.camera.beta = PI/2;
		glo.camera.upVector = new BABYLON.Vector3(1,0,0);
	}
}
function viewOnZ(orient = 1){
	glo.camera.alpha = PI/2;
	glo.camera.beta = PI/2;
	if(orient == 1){
		glo.camera.upVector = new BABYLON.Vector3(1,0,0);
	}
	else{
		glo.camera.upVector = new BABYLON.Vector3(0,1,0);
	}
}

function EdgeOrVertexColor(){
	glo.params.playWithColors = false;
	glo.colorType.next().value;
	if(glo.colorsType == 'edge'){
		saveRandomColors();

		var white = BABYLON.Color3.White();
		glo.allControls.getByName('pickerColorDiffuse').value = white;
		glo.allControls.getByName('pickerColorEmissive').value = white;
	}
	else if(glo.colorsType == 'none'){
		restoreRandomColors();
	}
	make_curves();
}
function playWithColors(){
	glo.params.playWithColors = !glo.params.playWithColors;
	if(glo.params.playWithColors){
		saveFunColors();
		var white = BABYLON.Color3.White();
		glo.allControls.getByName('pickerColorDiffuse').value = white;
		glo.allControls.getByName('pickerColorEmissive').value = white;
	}
	else{
		restoreFunColors();
	}
	make_curves();
}
function saveColors(pickers, saveName){
	pickers.map(picker => {
		glo[picker.name + saveName] = {};
		Object.assign(glo[picker.name + saveName], picker.value);
	});
}
function restoreColors(pickers, saveName){
	pickers.map(picker => { picker.value = glo[picker.name + saveName]; });
}
function saveRandomColors(){
	saveColors(glo.allControls.haveThisClass('picker'), 'saveRandomColors');
}
function restoreRandomColors(){
	restoreColors(glo.allControls.haveThisClass('picker'), 'saveRandomColors');
}

function rotate_meshes(){
	if(glo.is_ribbon){
		if(glo.rotate_z){
			glo.scene.meshes.map(mesh => {
				mesh.rotation.z += glo.rotate_speed;
			});
			glo.rot_z += glo.rotate_speed;
		}
	}
	glo.pivot += glo.rotate_speed;
}

function rotateMeshesOnX(direction = 1){
	glo.scene.meshes.map(mesh => {
		mesh.addRotation(6 * glo.rotate_speed * direction, 0, 0);
	});
}
function rotateMeshesOnY(direction = 1){
	glo.scene.meshes.map(mesh => {
		mesh.addRotation(0, 6 * glo.rotate_speed * direction, 0);
	});
}
function rotateMeshesOnZ(direction = 1){
	glo.scene.meshes.map(mesh => {
		mesh.addRotation(0, 0, 6 * glo.rotate_speed * direction);
	});
}

function rotate_camera(){
	if(glo.is_ribbon){
		if(glo.rotateType == "alpha"){
			glo.camera.alpha += glo.rotate_speed;
		}
		else if(glo.rotateType == "beta"){
			glo.camera.beta += glo.rotate_speed;
		}
	}
}

function raz_meshes(){
	glo.ribbon.dispose();
	glo.ribbon = null;
	glo.is_ribbon = false;
}

function changeLineColor(r, g, b){
	var colorLineSystem = new BABYLON.Color3(r, g, b);
	glo.lineColor = colorLineSystem;
	glo.curves.lineSystem.color = colorLineSystem;
}

function dimension(dim_one){
	if(dim_one){
		make_curves({
			min: -glo.params.u, max: glo.params.u, nb_steps: glo.params.steps_u,
		},
		{
			min: -glo.params.v, max: glo.params.v, nb_steps: glo.params.steps_v,
		},
		 {
		 	fx: glo.params.text_input_x,
		 	fy: glo.params.text_input_y,
		 	fz: glo.params.text_input_z,
		}, true);
		glo.input_x.text = glo.input_x.text.replace(/v/g,"u");
		glo.input_x.text = glo.input_x.text.replace(/w/g,"u");
		glo.input_y.text = glo.input_y.text.replace(/v/g,"u");
		glo.input_y.text = glo.input_y.text.replace(/w/g,"u");
		glo.input_z.text = glo.input_z.text.replace(/v/g,"u");
		glo.input_z.text = glo.input_z.text.replace(/w/g,"u");
	}
	else{
		make_curves({
			min: -glo.params.u, max: glo.params.u, nb_steps: glo.params.steps_u,
		},
		{
			min: -glo.params.v, max: glo.params.v, nb_steps: glo.params.steps_v,
		},
		{
	 	fx: glo.params.text_input_x,
	 	fy: glo.params.text_input_y,
	 	fz: glo.params.text_input_z,
	 });
	 glo.input_x.text = glo.params.text_input_x;
	 glo.input_y.text = glo.params.text_input_y;
	 glo.input_z.text = glo.params.text_input_z;
	}
}

function switch_grid(grid_visible = glo.grid_visible){
	if(grid_visible){
		glo.gridX.map(line => { line.visibility = 1; } );
		glo.gridY.map(line => { line.visibility = 1; } );
		glo.gridZ.map(line => { line.visibility = 1; } );
		glo.labels_grid.map(label_grid => { label_grid.isVisible = 1; } );
		if(!glo.axis_visible){
			switch_axis(true);
			glo.axis_visible = true;
		}
	}
	else{
		glo.labels_grid.map(label_grid => { label_grid.isVisible = 0; } );
		glo.gridX.map(line => { line.visibility = 0; } );
		glo.gridY.map(line => { line.visibility = 0; } );
		glo.gridZ.map(line => { line.visibility = 0; } );
		switch_axis(false);
		glo.axis_visible = false;
	}
}

function switch_axis(axis_visible = glo.axis_visible){
	if(axis_visible){
		glo.axisX.visibility = 1;
		glo.axisY.visibility = 1;
		glo.axisZ.visibility = 1;
		glo.xChar.visibility = 0;
		glo.yChar.visibility = 0;
		glo.zChar.visibility = 0;
		glo.labels_axis.map(label_axis => { label_axis.isVisible = 1; } );
		glo.planes_axis.map(plane_axis => { plane_axis.visibility = 0; } );
	}
	else{
		glo.axisX.visibility = 0;
		glo.axisY.visibility = 0;
		glo.axisZ.visibility = 0;
		glo.xChar.visibility = 0;
		glo.yChar.visibility = 0;
		glo.zChar.visibility = 0;
		glo.labels_axis.map(label_axis => { label_axis.isVisible = 0; } );
		glo.planes_axis.map(plane_axis => { plane_axis.isVisible = 0; } );
	}
}

var switch_lines = function(visibility = glo.lines_visible){
	glo.curves.lineSystem.visibility = visibility;
}

function gui_resize(){
	var w = window.screen.width;
	var h = window.screen.height;
	var coeff = glo.coeff_gui_resize.width_1920;
	if(w < 1367){ coeff = glo.coeff_gui_resize.width_1366; }
	else if(w < 1601){ coeff = glo.coeff_gui_resize.width_1600; }

	coeff/=Math.pow(window.devicePixelRatio, 0.75);

	glo.advancedTexture.idealWidth = w / coeff;
	glo.advancedTexture.idealHeight = h / coeff;
}

function code_car(car){
	return parseInt(car.charCodeAt());
}

function animConstructMesh(){
	return glo.curve_step.next().value;
}

function reset_curve_step_by_step(){
	glo.curve_step.return();
	glo.curve_step = {};
	glo.curve_step = curve_step_by_step();
	glo.lines_u.map(line_u => { line_u.dispose(); line_u = {}; });
	glo.lines_u = [];
	glo.lines_v.map(line_v => { line_v.dispose(); line_v = {}; });
	glo.lines_v = [];
	glo.end_loop = false;
}

function stop_curve_step_by_step(){
	glo.curve_step.return();
	glo.curve_step = curve_step_by_step();
}

function reg_inv(f, toInv_1, toInv_2){
	var reg_toInv_1 = new RegExp(toInv_1, "g");
	var reg_toInv_tmp = new RegExp(toInv_1 + "_tmp", "g");
	var reg_toInv_2 = new RegExp(toInv_2, "g");
	for(var prop in f){
		f[prop] = f[prop].replace(reg_toInv_1, toInv_2 + "_tmp");
		f[prop] = f[prop].replace(reg_toInv_2, toInv_1);
		f[prop] = f[prop].replace(reg_toInv_tmp, toInv_2);
	}

	return f;
}

function reg_deg(f){

}

function scaleSlidersUV(coeff){
	if(typeof(glo.scaleSlidersUV) == "undefined"){ glo.scaleSlidersUV = 1; }
	glo.scaleSlidersUV *= coeff;

	glo.slider_u.maximum *= coeff;
	glo.slider_v.maximum *= coeff;
}

function switchWritingType(long){
	var f = {
		x: glo.input_x.text,
		y: glo.input_y.text,
		z: glo.input_z.text,
		alpha: glo.input_alpha.text,
		beta: glo.input_beta.text,
	};

	if(!long){
		for(var prop in f){
			f[prop] = f[prop].replace(/cos\(u\+v\)/g, "cupv");
			f[prop] = f[prop].replace(/cos\(u-v\)/g, "cumv");
			f[prop] = f[prop].replace(/cos\(v-u\)/g, "cvmu");
			f[prop] = f[prop].replace(/cos\(u\/v\)/g, "cudv");
			f[prop] = f[prop].replace(/cos\(u\*v\)/g, "cufv");
			f[prop] = f[prop].replace(/sin\(u\+v\)/g, "supv");
			f[prop] = f[prop].replace(/sin\(u-v\)/g, "sumv");
			f[prop] = f[prop].replace(/sin\(v-u\)/g, "svmu");
			f[prop] = f[prop].replace(/sin\(u\/v\)/g, "sudv");
			f[prop] = f[prop].replace(/sin\(u\*v\)/g, "sufv");
			f[prop] = f[prop].replace(/cos\(u\)/g, "cu");
			f[prop] = f[prop].replace(/sin\(u\)/g, "su");
			f[prop] = f[prop].replace(/cos\(v\)/g, "cv");
			f[prop] = f[prop].replace(/sin\(v\)/g, "sv");
		}
	}
	else{
		for(var prop in f){
			f[prop] = f[prop].replace(/cupv|cvpu/g, "cos(u+v)");
			f[prop] = f[prop].replace(/cumv/g, "cos(u-v)");
			f[prop] = f[prop].replace(/cvmu/g, "cos(v-u)");
			f[prop] = f[prop].replace(/cudv|cvdu/g, "cos(u/v)");
			f[prop] = f[prop].replace(/cufv|cvfu/g, "cos(u*v)");
			f[prop] = f[prop].replace(/supv|svpu/g, "sin(u+v)");
			f[prop] = f[prop].replace(/sumv/g, "sin(u-v)");
			f[prop] = f[prop].replace(/svmu/g, "sin(v-u)");
			f[prop] = f[prop].replace(/sudv|svdu/g, "sin(u/v)");
			f[prop] = f[prop].replace(/sufv|svfu/g, "sin(u*v)");
			f[prop] = f[prop].replace(/cu/g, "cos(u)");
			f[prop] = f[prop].replace(/cu/g, "cos(u)");
			f[prop] = f[prop].replace(/cu/g, "cos(u)");
			f[prop] = f[prop].replace(/su/g, "sin(u)");
			f[prop] = f[prop].replace(/cv/g, "cos(v)");
			f[prop] = f[prop].replace(/sv/g, "sin(v)");
		}
	}

	glo.input_x.text = f.x;
	glo.input_y.text = f.y;
	glo.input_z.text = f.z;
	glo.input_alpha.text = f.alpha;
	glo.input_beta.text = f.beta;

	glo.params.text_input_x = f.x;
	glo.params.text_input_y = f.y;
	glo.params.text_input_z = f.z;
	glo.params.text_input_alpha = f.alpha;
	glo.params.text_input_beta = f.beta;
}

function invElemInInput(toInv_1, toInv_2){
	var f = {
		x: glo.input_x.text,
		y: glo.input_y.text,
		z: glo.input_z.text,
		alpha: glo.input_alpha.text,
		beta: glo.input_beta.text,
	};
	f = reg_inv(f, toInv_1, toInv_2);
	glo.input_x.text = f.x;
	glo.input_y.text = f.y;
	glo.input_z.text = f.z;
	glo.input_alpha.text = f.alpha;
	glo.input_beta.text = f.beta;

	glo.params.text_input_x = f.x;
	glo.params.text_input_y = f.y;
	glo.params.text_input_z = f.z;
	glo.params.text_input_alpha = f.alpha;
	glo.params.text_input_beta = f.beta;

	make_curves();
}

function slidersAnim(name, speed = 1, dir = 1){
	var slider = glo.allControls.getByName(name);
	valToAdd = ((slider.maximum - slider.minimum) / 720) * speed;
	if(speed == 0){ valToAdd = 1; }
	slider.value += valToAdd * dir;
}

function sliders_animations(){
	if(glo.guiAnims.sliderU){ slidersAnim('u'); }
	if(glo.guiAnims.sliderV){ slidersAnim('v'); }
	if(glo.guiAnims.stepU){ slidersAnim('stepU', 0); }
	if(glo.guiAnims.stepV){ slidersAnim('stepV', 0); }
}

function randomize_colors_app(){
	glo.allControls.haveThisClass('picker').map(picker_color => {
		picker_color.value = BABYLON.Color3.Random();
	});
}
function special_randomize_colors_app(){
	var backColor = getRndDarkColor(5);
	var emissiveColor = getComplementaryColor(backColor, 8);
	var diffuseColor = getComplementaryColor(emissiveColor, 0.7);
	var lineColor = getComplementaryColor(backColor);

	diffuseColor = darkingColor(diffuseColor, 2);
	lineColor = darkingColor(lineColor, 1.12);

	glo.allControls.getByName('pickerColorBackground').value = backColor;
	glo.allControls.getByName('pickerColorEmissive').value = new BABYLON.Color3(emissiveColor.r, emissiveColor.g, emissiveColor.b);
	glo.allControls.getByName('pickerColorDiffuse').value = new BABYLON.Color3(diffuseColor.r, diffuseColor.g, diffuseColor.b);
	glo.allControls.getByName('pickerColorLine').value = lineColor;
}

function getComplementaryColor(color3, darkForce = 1){
	function calcul_color(col){
		return 1 - col*darkForce;
	}

	var r = calcul_color(color3.r); var g = calcul_color(color3.g); var b = calcul_color(color3.b);
	r = r > 0 ? r : 0; g = g > 0 ? g : 0; b = b > 0 ? b : 0;
	r = r < 1 ? r : 1; g = g < 1 ? g : 1; b = b < 1 ? b : 1;
	return new BABYLON.Color3(r, g, b);
}
function darkingColor(color3, force){
	var r = color3.r / force; var g = color3.g / force; var b = color3.b / force;
	return new BABYLON.Color3(r, g, b);
}
function lightingColor(color3, force){
	var r = color3.r * force; var g = color3.g * force; var b = color3.b * force;
	r = r < 1 ? r : 1; g = g < 1 ? g : 1; b = b < 1 ? b : 1;
	return new BABYLON.Color3(r, g, b);
}

function getRndDarkColor(force = 0){
	if(force >= 5){ force = 4; }
	else if(force < 0){ force = 0; }
	force = 0.5 - (force / 10);

	var rndObjectDarkColor = getRndObjectDarkColor(force);
	while(rndObjectDarkColor.reg){
		rndObjectDarkColor = getRndObjectDarkColor(force);
	}
	return rndObjectDarkColor.color;
}

function getRndObjectDarkColor(force){
	var keepSup = 0.05;
	var color = BABYLON.Color3.Random();
	var verifColor1 = color.r * color.g * color.b > Math.pow(force, 3);
	var verifColor2 = color.r < keepSup || color.g < keepSup || color.b < keepSup;
	var regRed = color.r > (color.g + color.b) * 1.25;
	var regGreen = color.g > (color.r + color.b) * 1.25;
	var regBlue = color.b > (color.r + color.g) * 1.25;
	var noPurpleInComplementaryColor = color.r > 0.07 * 0.5 && color.r < 0.07 * 2 && color.g > 0.18 * 0.5 && color.g < 0.18 * 2 && color.b > 0.07 * 0.5 && color.b < 0.07 * 2;

	var reg = verifColor1 || verifColor2 || regRed || regGreen || regBlue || noPurpleInComplementaryColor;

	return {color: color, reg: reg };
}

function getRndLightColor(force = 0){
	var color = BABYLON.Color3.Random();
	var verifColor = color.r * color.g * color.b;

	if(force >= 5){ force = 4.9; }
	else if(force < 0){ force = 0; }
	force = 0.5 + (force / 10);
	while(verifColor < Math.pow(force, 3)){
		color = BABYLON.Color3.Random();
		verifColor = color.r * color.g * color.b;
	}
	return color;
}

function startAnim(duration, nb_turns){
	var rot_animation = new BABYLON.Animation("startAnimation", "alpha", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_RELATIVE);

  var keys_rot = [];
  keys_rot.push({
      frame: 0,
      value: 0
  });
  keys_rot.push({
      frame: duration,
      value: nb_turns*Math.PI,
  });
  rot_animation.setKeys(keys_rot);

	glo.scene.beginDirectAnimation(glo.camera, [rot_animation], 0, duration, true, 1, afterAnimation);
}

var afterAnimation = function() {

};

function exportModal(){
	event.stopPropagation();
	event.preventDefault();
	if(glo.fullScreen){ glo.engine.switchFullscreen(); }
	$('#exportModal').modal('open', {
		onCloseEnd: function() {
			if(glo.fullScreen){ glo.engine.switchFullscreen(); }
		},
	});
}
function importModal(){
	event.stopPropagation();
	event.preventDefault();
	if(glo.fullScreen){ glo.engine.switchFullscreen(); }
	$('#importModal').modal('open', {
		onCloseEnd: function() {
			if(glo.fullScreen){ glo.engine.switchFullscreen(); }
		},
	});
}

function download_JSON_mesh(){
	$('#importModal').modal('close');
	var file_to_read = document.getElementById("jsonFileUpload").files[0];
	$("#jsonFileUpload").val("");
	 var fileread = new FileReader();
	 fileread.onload = function(e) {
		var content = e.target.result;
		var contentJsonFile = JSON.parse(content);
		for(var prop in contentJsonFile){ glo.params[prop] = contentJsonFile[prop]; }

		if(typeof(glo.playWithColMode) == "undefined"){ glo.playWithColMode = playWithColNextMode(); }
		var playWithColorMode = glo.params.playWithColorMode;
		while(playWithColorMode != glo.playWithColMode.next().value){}

		paramsToControls();
		var sameAsRadioCheck = isInputsEquationsSameAsRadioCheck();
		var formName = glo.params.formName;
		if(glo.coordsType != glo.params.coordsType){
		 glo.coordsType = glo.params.coordsType;
		 glo.histo.setGoodCoords(glo.coordsType);
		}
		glo.fromHisto = !sameAsRadioCheck;
		glo.radios_formes.setCheckByName("Radio " + formName);
		glo.formes.setFormeSelect(formName, glo.coordsType, sameAsRadioCheck);
		glo.fromHisto = false;
		if(!sameAsRadioCheck){
			make_curves();
			glo.histo.save();
			glo.histoColo.save();
		}
	 };
	 fileread.readAsText(file_to_read);
}

var objectUrl;
function exportMesh(exportFormat){
	if(objectUrl) {
    window.URL.revokeObjectURL(objectUrl);
  }

	if(exportFormat != "json"){
	  var serializedMesh = BABYLON.SceneSerializer.SerializeMesh(glo.ribbon);

	  if(exportFormat == "babylon"){ var strMesh = JSON.stringify(serializedMesh); }
	  else if(exportFormat == "obj"){ var strMesh = BABYLON.OBJExport.OBJ([glo.ribbon]); }

		var filename = $("#filename").val();
	  if (filename.toLowerCase().lastIndexOf("." + exportFormat) !== filename.length - exportFormat.length || filename.length < exportFormat.length + 1){
	      filename += "." + exportFormat;
	  }
	}
	else{
		var filename = $("#filename").val();
		var exportFormat = 'json';
	  if (filename.toLowerCase().lastIndexOf("." + exportFormat) !== filename.length - exportFormat.length || filename.length < exportFormat.length + 1){
	      filename += "." + exportFormat;
	  }

		glo.params.coordsType = glo.coordsType;
		var objForm = glo.formes.getFormSelect();
		var form = !objForm ? "" : objForm.form.text;
		glo.params.formName = form;
		var strMesh = JSON.stringify(glo.params);
	}

	var blob = new Blob ( [ strMesh ], { type : "octet/stream" } );
	objectUrl = (window.webkitURL || window.URL).createObjectURL(blob);

	$("#exportButton").attr("href", objectUrl);
	$("#exportButton").attr("download", filename);
	$('#exportModal').modal('close');

	return false;
}

function paramsToControls(){
	glo.fromHisto = true;

	glo.allControls.getByName('u').value = glo.params.u;
	glo.allControls.getByName('v').value = glo.params.v;
	glo.allControls.getByName('stepU').value = glo.params.steps_u;
	glo.allControls.getByName('stepV').value = glo.params.steps_v;
	glo.allControls.getByName('A').value = glo.params.A;
	glo.allControls.getByName('B').value = glo.params.B;
	glo.allControls.getByName('C').value = glo.params.C;
	glo.allControls.getByName('D').value = glo.params.D;
	glo.allControls.getByName('E').value = glo.params.E;
	glo.allControls.getByName('F').value = glo.params.F;
	glo.allControls.getByName('G').value = glo.params.G;
	glo.allControls.getByName('H').value = glo.params.H;
	glo.allControls.getByName('I').value = glo.params.I;
	glo.allControls.getByName('J').value = glo.params.J;
	glo.allControls.getByName('K').value = glo.params.K;
	glo.allControls.getByName('L').value = glo.params.L;
	glo.allControls.getByName('M').value = glo.params.M;
	glo.allControls.getByName('saturationSlider').value = glo.params.saturation;
	glo.allControls.getByName('tintSlider').value = glo.params.tint;
	glo.allControls.getByName('rotAlphaSlider').value = glo.params.rotAlpha;
	glo.allControls.getByName('rotBetaSlider').value = glo.params.rotBeta;
	glo.allControls.getByName('rColorSlider').value = glo.params.rColor;
	glo.allControls.getByName('gColorSlider').value = glo.params.gColor;
	glo.allControls.getByName('bColorSlider').value = glo.params.bColor;
	glo.allControls.getByName('itColorsSlider').value = glo.params.itColors;

	glo.allControls.getByName('inputX').text = glo.params.text_input_x;
	glo.allControls.getByName('inputY').text = glo.params.text_input_y;
	glo.allControls.getByName('inputZ').text = glo.params.text_input_z;
	glo.allControls.getByName('inputAlpha').text = glo.params.text_input_alpha;
	glo.allControls.getByName('inputBeta').text = glo.params.text_input_beta;
	glo.allControls.getByName('inputColorX').text = glo.params.text_input_color_x;
	glo.allControls.getByName('inputColorY').text = glo.params.text_input_color_y;
	glo.allControls.getByName('inputColorZ').text = glo.params.text_input_color_z;
	glo.allControls.getByName('inputColorAlpha').text = glo.params.text_input_color_alpha;
	glo.allControls.getByName('inputColorBeta').text = glo.params.text_input_color_beta;

	glo.fromHisto = false;
}

function isInputsEquationsSameAsRadioCheck(){
	var p = glo.params;
	var form = glo.formes.getFormByName(p.formName, p.coordsType);
	var formAlpha = ""; var formBeta = "";
	if(typeof(form.alpha) != "undefined"){ formAlpha = form.alpha; }
	if(typeof(form.beta) != "undefined"){ formBeta = form.beta; }
	if(p.text_input_x == form.fx && p.text_input_y == form.fy && p.text_input_z == form.fz && p.text_input_alpha == formAlpha && p.text_input_beta == formBeta){
		return true;
	}

	return false;
}

function deleteSomeClones(){
	if(typeof(glo.ribbon_clone) != "undefined"){
		var n = 0;
		for (var i = 0; i < glo.ribbon_clone["_clones"].length; i++) {
			if(n%2 == 0){
				glo.ribbon_clone["_clones"][i].dispose();
				glo.ribbon_clone["_clones"][i] = {};
				glo.ribbon_clone["_clones"].splice(i, 1);
				n--;
			}
			n++;
		}
	}
}

function switchDrawCoordsType(update_slider_uv = true){
	if(update_slider_uv){ change_slider_uv(); }
	switch (glo.coordsType) {
		case 'spheric':
			changeHeaderText('header_inputX', 'R');
			changeHeaderText('header_inputY', 'Alpha');
			changeHeaderText('header_inputZ', 'Bêta');
			changeHeaderText('header_inputAlpha', 'Alpha 2');
			changeHeaderText('header_inputBeta', 'Bêta 2');
			break;
		case 'cylindrical':
			changeHeaderText('header_inputX', 'R');
			changeHeaderText('header_inputY', 'Alpha');
			changeHeaderText('header_inputZ', 'Z');
			changeHeaderText('header_inputAlpha', 'Alpha 2');
			changeHeaderText('header_inputBeta', 'Bêta 2');
			break;
		case 'cartesian':
			changeHeaderText('header_inputX', 'X');
			changeHeaderText('header_inputY', 'Y');
			changeHeaderText('header_inputZ', 'Z');
			changeHeaderText('header_inputAlpha', 'Alpha');
			changeHeaderText('header_inputBeta', 'Bêta');
			break;
	}
}

function changeHeaderText(headerName, newText){
	glo.allControls.haveThisClass("header").getByName(headerName).text = newText;
}

function resetEquationsParamSliders(){
	glo.switchedSliderNoChange = true;
	glo.equationsParamSliders.map(equationsParamSlider => {
		equationsParamSlider.value = equationsParamSlider.startValue;
	});
	make_curves();
	glo.switchedSliderNoChange = false;
}

function change_slider_uv(){
	if(glo.coordsType == 'spheric'){ glo.slider_u.value += 0.0000002; }
	else if(glo.coordsType == 'cylindrical'){ glo.slider_u.value -= 0.0000001; }
	else{ glo.slider_u.value -= 0.0000001; }
}

function darkTheme(){
	glo.userTheme = !glo.userTheme;
	if(glo.userTheme){
		glo.bSave = {}; glo.dSave = {}; glo.eSave = {};
		Object.assign(glo.bSave, glo.backgroundColor); Object.assign(glo.dSave, glo.diffuseColor); Object.assign(glo.eSave, glo.emissiveColor);
		glo.allControls.getByName('pickerColorBackground').value = new BABYLON.Color3(0, 0.05415, 0.01882);
		glo.allControls.getByName('pickerColorDiffuse').value = new BABYLON.Color3(0.93942, 1, 0);
		glo.allControls.getByName('pickerColorEmissive').value = new BABYLON.Color3(0.36702, 0, 0);
	}
	else{
		glo.allControls.getByName('pickerColorBackground').value = glo.bSave;
		glo.allControls.getByName('pickerColorDiffuse').value = glo.dSave;
		glo.allControls.getByName('pickerColorEmissive').value = glo.eSave;
	}
}

function saveRibbonToClone(){
	glo.ribbonSaveToClone = glo.ribbon.clone("saveToClone_" + glo.ribbon.name);
	glo.ribbonSaveToClone.visibility = 0;
	glo.indexSaveToClone = glo.histo.content.length - 1 - glo.histo.index_go;
}

function cloneSystem(scale = glo.cloneScaleToTemplate, reset = true, deleteClones = true, testRemake = true){
	if(reset){ resetClones(); }

	glo.cloneSystem = true;
	if(testRemake && glo.params.steps_u * glo.params.steps_v > 2500){
		glo.reMakeClones = false;
		glo.slider_nb_steps_u.value = 22; glo.slider_nb_steps_v.value = 22; make_curves();
		glo.reMakeClones = true;
	}

	if(typeof(glo.ribbonSaveToClone) == "undefined"){ glo.ribbonToClone = glo.ribbon; }
	else{ glo.ribbonToClone = glo.ribbonSaveToClone; glo.indexCloneToHisto = glo.indexSaveToClone; }

	glo.ribbonToClone.visibility = 1;
	glo.ribbon_clone_1 = glo.ribbonToClone.clone("ribbonClone1");
	glo.ribbon_clone_2 = glo.ribbonToClone.clone("ribbonClone2");
	glo.ribbon_clone_1.scaling = new BABYLON.Vector3(scale, scale, scale);
	glo.ribbon_clone_2.scaling = new BABYLON.Vector3(scale, scale, scale);

	glo.ribbon_clone = new BABYLONX.ObjectCloner([glo.ribbon_clone_1, glo.ribbon_clone_2], glo.ribbon, glo.scene);
	orientClone(glo.cloneAxis);
	if(deleteClones){ deleteSomeClones(); }
	glo.ribbonToClone.visibility = 0;
	if(typeof(glo.ribbonSaveToClone) != "undefined"){ glo.ribbonSaveToClone.dispose(); glo.ribbonSaveToClone = {}; delete glo.ribbonSaveToClone; }
}

function resetClones(resetVar = true){
	if(typeof(glo.ribbon_clone) != "undefined"){
		glo.ribbon_clone["_clones"].map(ribClone => {
			ribClone.dispose(); ribClone = {};
		});
		glo.ribbon_clone = {}; delete glo.ribbon_clone;
		glo.ribbon_clone_1.dispose(); delete glo.ribbon_clone_1;
		glo.ribbon_clone_2.dispose(); delete glo.ribbon_clone_2;

		if(resetVar){ glo.cloneSystem = false; }
		glo.resetClones = false;
	}
}

function reMakeClones(){
	if(glo.cloneSystem && glo.reMakeClones){ cloneSystem(); }
}

function orientClone(axis){
	if(typeof(glo.ribbon_clone) != "undefined"){
		var facetNormals = glo.ribbon.getFacetDataParameters().facetNormals;
		var tabClones = glo.ribbon_clone["_clones"];
		var tabClonesLength = tabClones.length;

		var none = false;
		switch (axis) {
			case 'none':
				var startRot = glo.ribbon.rotationQuaternion;
				glo.ribbon_clone["_clones"].map(rib_clone => { rib_clone.rotationQuaternion = startRot; });
				none = true;
				break;
			case 'x':
				var start = new BABYLON.Vector3(1,0,0);
				break;
			case 'y':
				var start = new BABYLON.Vector3(0,1,0);
				break;
			case 'z':
				var start = new BABYLON.Vector3(0,0,1);
				break;
			case 'test':
				var start = new BABYLON.Vector3(Math.PI / 2, Math.PI / 2, 0);
				break;
		}

		if(!none){
			for (var i = 0; i < tabClonesLength; i++) {
				var axis1 = new BABYLON.Vector3(facetNormals[i].x, facetNormals[i].y, facetNormals[i].z);
		    var axis2 = BABYLON.Vector3.Up();
				var axis3 = BABYLON.Vector3.Up();

		    BABYLON.Vector3.CrossToRef(start, axis1, axis2);
				BABYLON.Vector3.CrossToRef(axis2, axis1, axis3);
				var tmpVec = BABYLON.Vector3.RotationFromAxis(axis3.negate(), axis1, axis2);
				var quat = BABYLON.Quaternion.RotationYawPitchRoll(tmpVec.y, tmpVec.x, tmpVec.z);
				tabClones[i].rotationQuaternion = quat;
			}
		}
	}
}

function* orientationClone(){
  var index = -1;
  var tab = ['x', 'y', 'z', 'test','none'];
  while(true){
		index++;
		if(index == tab.length){ index = 0; }
		glo.cloneAxis = tab[index];
    yield tab[index];
  }
}

function cloneScale(scale){
	glo.cloneScale += scale;
	var sc = glo.cloneScale;
	if(typeof(glo.ribbon_clone["_clones"]) != "undefined"){
		glo.ribbon_clone["_clones"].map(ribbon_clone => { ribbon_clone.scaling = new BABYLON.Vector3(sc,sc,sc) });
	}
}

function rotateByMatrix(pos, roll, pitch, yaw, rad = true) {
	var pitch_rad = pitch * Math.PI / 180;
	var roll_rad = roll * Math.PI / 180;
	var yaw_rad = yaw * Math.PI / 180;

	if(rad){
		pitch_rad = pitch;
		roll_rad = roll;
		yaw_rad = yaw;
	}

	var cos = Math.cos;
	var sin = Math.sin;

	var cosa = cos(yaw_rad);
	var sina = sin(yaw_rad);

	var cosb = cos(pitch_rad);
	var sinb = sin(pitch_rad);

	var cosc = cos(roll_rad);
	var sinc = sin(roll_rad);

	var Axx = cosa*cosb;
	var Axy = cosa*sinb*sinc - sina*cosc;
	var Axz = cosa*sinb*cosc + sina*sinc;

	var Ayx = sina*cosb;
	var Ayy = sina*sinb*sinc + cosa*cosc;
	var Ayz = sina*sinb*cosc - cosa*sinc;

	var Azx = -sinb;
	var Azy = cosb*sinc;
	var Azz = cosb*cosc;

	var cx = 0; var cy = 0; var cz = 0;

	var px = pos.x;
	var py = pos.y;
	var pz = pos.z;

	var pos_to_return = {};

	pos_to_return.x = Axx*px + Axy*py + Axz*pz;
	pos_to_return.y = Ayx*px + Ayy*py + Ayz*pz;
	pos_to_return.z = Azx*px + Azy*py + Azz*pz;

	return pos_to_return;
}

function rndSurface(end){
	var rnd = {
		functions:[
			["u", "v",],
			["cu", "cv", "su", "sv"],
			["cu", "cv", "su", "sv", "u", "v", "cufv", "sufv", "cupv", "cumv", "supv", "sumv"],
		],
		operator:[
			["+", "-"],
			["+", "-", ""],
		],
		get_a_function: function(num){
			return this.functions[num][parseInt(Math.random() * this.functions[num].length)];
		},
		get_an_operator: function(num){
			return this.operator[num][parseInt(Math.random() * this.operator[num].length)];
		},
	};

	var num_lim = 4;
	var rndEquation = "";
	var n = 0;
	while(n < end){
		if(n == end - 1){ rndEquation += rnd.get_a_function(1); }
		else if(n%2 == 0){ rndEquation += rnd.get_a_function(1) + rnd.get_an_operator(0) + parseInt(Math.random() * num_lim + 2); }
		else if(n%2 != 0){ rndEquation += rnd.get_a_function(1) + rnd.get_an_operator(1) + rnd.get_a_function(2); }
		n++;
	}

	return rndEquation;
}

function makeRndSurface(){
	glo.params.text_input_x = "u" + rndSurface(1); glo.input_x.text = glo.params.text_input_x;
	glo.params.text_input_y = "v" + rndSurface(1); glo.input_y.text = glo.params.text_input_y;
	glo.params.text_input_z = rndSurface(3); glo.input_z.text = glo.params.text_input_z;

	make_curves();
	glo.histo.save();
}

function resetInputsRibbonEquations(){
	var prsNorm = glo.params.normale;
	glo.input_x.text = prsNorm.text_input_x; glo.input_y.text = prsNorm.text_input_y; glo.input_z.text = prsNorm.text_input_z;
	glo.input_alpha.text = prsNorm.text_input_alpha; glo.input_beta.text = prsNorm.text_input_beta;
}
function restoreInputsRibbonEquations(){
	var prs = glo.params;
	glo.input_x.text = prs.text_input_x; glo.input_y.text = prs.text_input_y; glo.input_z.text = prs.text_input_z;
	glo.input_alpha.text = prs.text_input_alpha; glo.input_beta.text = prs.text_input_beta;
}

function reset_camera(){
	var radius = glo.camera.radius;
	glo.camera.setTarget(new BABYLON.Vector3(glo.ribbon.position.x, glo.ribbon.position.y, glo.ribbon.position.z));
	glo.camera.setPosition(new BABYLON.Vector3(glo.ribbon.position.x, glo.ribbon.position.y, glo.ribbon.position.z - 12));
	glo.camera.radius = radius;
}

function replaceLast(x, y, z){
    var a = x.split("");
    a[x.lastIndexOf(y)] = z;
    return a.join("");
}

function cpow(val, exp){
	if(parseInt(exp) == exp){ return val < 0 && exp%2 == 0 ? -pow(val, exp) : pow(val, exp); }
	else{ return val < 0 ? -pow(-val, exp) : pow(val, exp); }
}

function cpowh(...dists){
	let res = 0;
	dists.forEach(dist => {
		res += cpow(dist, 2);
	});
	return cpow(res, 0.5);
}

function ifNeg(res, varForSign){
	const theSign = sign(varForSign);

	return sign(varForSign) === sign(res) ? res : -res;
}
