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
}, f2 = {
	x: glo.params.text_input_suit_x,
	y: glo.params.text_input_suit_y,
	z: glo.params.text_input_suit_z,
	alpha: glo.params.text_input_suit_alpha,
	beta: glo.params.text_input_suit_beta,
	theta: glo.params.text_input_suit_theta,
}, dim_one = glo.dim_one, fractalize = false)
{
	reg(f, dim_one);
	reg(f2, dim_one);

	glo.savePos.x = 0; glo.savePos.y = 0; glo.savePos.z = 0;

	var A = glo.params.A; var B = glo.params.B; var C = glo.params.C; var D = glo.params.D; var E = glo.params.E; var F = glo.params.F; var G = glo.params.G; var H = glo.params.H;
	var I = glo.params.I; var J = glo.params.J; var K = glo.params.K; var L = glo.params.L; var M = glo.params.M;

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

    const uvInfos = isUV();

    var x = 0.5; var y = 0.5; var z = 0.5;
	var xN = 1; var yN = 1; var zN = 1;
	var µN = 1;
	var $N = 1; var µ$N = 1; var $µN = 1; var µµN = 1; var O = 1; var T = 1;
	var xT = 1; var yT = 1; var zT = 1;
	var µT = 1;
	var $T= 1; var µ$T = 1; var $µT = 1; var µµT = 1;
	var rCol = 1; var gCol = 1; var bCol = 1; var mCol = 1;

	if(f.x == ""){ f.x = 0; }
	if(f.y == ""){ f.y = 0; }
	if(f.z == ""){ f.z = 0; }
	if(f.alpha == ""){ f.alpha = 0; }
	if(f.beta == ""){ f.beta = 0; }
	if(f2.alpha == ""){ f2.alpha = 0; }
	if(f2.beta == ""){ f2.beta = 0; }
	if(f2.theta == ""){ f2.theta = 0; }
	if(f2.x == ""){ f2.x = 0; }
	if(f2.y == ""){ f2.y = 0; }
	if(f2.z == ""){ f2.z = 0; }

	var isX = glo.params.text_input_suit_x != "" ? true : false;
	var isY = glo.params.text_input_suit_y != "" ? true : false;
	var isZ = glo.params.text_input_suit_z != "" ? true : false;

	var v = 0;

	var n = 0;
	var line_visible = glo.lines_visible;
  var index_u = 0;
  if(!uvInfos.isV){
		this.paths[0] = [];
		var path      = [];
		let u = this.min_u - this.step_u;
		for (let i = 0; i <= this.nb_steps_u; i++) {
			u += this.step_u;
			ind_u = u;

			x = eval(f.x);
			y = eval(f.y);
			z = eval(f.z);

			var vect3 = new BABYLON.Vector3(x,y,z);
			vect3 = getNormalVector(vect3);
			xN = vect3.x; yN = vect3.y; zN = vect3.z;
			var µN = xN*yN*zN;
			var $N = (xN+yN+zN)/3;
			var µ$N = µN*$N; var $µN = µN+$N;
			var µµN = µ$N*$µN;

			var vectT = new BABYLON.Vector3(x,y,z);
			vectT = BABYLON.Vector3.Normalize(vectT);
			xT = vectT.x; yT = vectT.y; zT = vectT.z;
			var µT = xT*yT*zT;
			var $T = (xT+yT+zT)/3;
			var µ$T = µT*$T; var $µT = µT+$T;
			var µµT = µ$T*$µT;

			var O = Math.acos(y/(h(x,y,z)));
			var T = Math.atan2(z, x);

			if(x == Infinity || x == -Infinity || isNaN(x)){ x = 0; }
			if(y == Infinity || y == -Infinity || isNaN(y)){ y = 0; }
			if(z == Infinity || z == -Infinity || isNaN(z)){ z = 0; }

			if(isX){ const x2 = eval(f2.x); !glo.secondCurveOperation ? x += x2 : x = x2; }
			if(isY){ const y2 = eval(f2.y); !glo.secondCurveOperation ? y += y2 : y = y2; }
			if(isZ){ const z2 = eval(f2.z); !glo.secondCurveOperation ? z += z2 : z = z2; }

			alpha = eval(f.alpha);
			beta  = eval(f.beta);
			theta = eval(f2.theta);

			if(alpha && beta){
				let pos = rotateByQuaternion(x, y, z, alpha, beta);
				x = pos.x; y = pos.y; z = pos.z;
			}

			alpha2 = eval(f2.alpha);
			beta2  = eval(f2.beta);
			let pos = rotateByBabylonMatrix({x, y, z}, alpha2, beta2, theta);
			x = pos.x; y = pos.y; z = pos.z;

			var {x, y, z} = blendPosAll(x, y, z, u, v, O, cos(u), cos(v));
			var {x, y, z} = functionIt(x, y, z);
			var {x, y, z} = invPos(x, y, z);
			var {x, y, z} = invPosIf(x, y, z);
			var {x, y, z} = permutSign(x, y, z);
			
			var posByR = {x, y, z};
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

			path.push(new BABYLON.Vector3(x, y, z));
			this.paths[0].push(new BABYLON.Vector3(x, y, z));
      		index_u++; n++;
		}

		glo.lines = this.paths;
  }
  else {
	const stepsU = uvInfos.isU ? this.nb_steps_u : 0;
	let u = this.min_u - this.step_u, v = this.min_v - this.step_v;
	for (let i = 0; i <= stepsU; i++) {
		u += this.step_u;
		var path = [];
		var index_v = 0; ind_u = u; v = this.min_v - this.step_v;
		for (let j = 0; j <= this.nb_steps_v; j++) {
			v += this.step_v;
			ind_v = v;

			x = eval(f.x);
			y = eval(f.y);
			z = eval(f.z);

			var vect3 = new BABYLON.Vector3(x,y,z);
			vect3 = getNormalVector(vect3);
			xN = vect3.x; yN = vect3.y; zN = vect3.z;
			var µN = xN*yN*zN;
			var $N = (xN+yN+zN)/3;
			var µ$N = µN*$N; var $µN = µN+$N;
			var µµN = µ$N*$µN;

			var O = Math.acos(y/(h(x,y,z)));
			var T = Math.atan2(z, x) ;

			var vectT = new BABYLON.Vector3(x,y,z);
			vectT = BABYLON.Vector3.Normalize(vectT);
			xT = vectT.x; yT = vectT.y; zT = vectT.z;
			var µT = xT*yT*zT;
			var $T = (xT+yT+zT)/3;
			var µ$T = µT*$T; var $µT = µT+$T;
			var µµT = µ$T*$µT;

			if(x == Infinity || x == -Infinity || isNaN(x)){ x = 0; }
			if(y == Infinity || y == -Infinity || isNaN(y)){ y = 0; }
			if(z == Infinity || z == -Infinity || isNaN(z)){ z = 0; }

			if(isX){ const x2 = eval(f2.x); !glo.secondCurveOperation ? x += x2 : x = x2; }
			if(isY){ const y2 = eval(f2.y); !glo.secondCurveOperation ? y += y2 : y = y2; }
			if(isZ){ const z2 = eval(f2.z); !glo.secondCurveOperation ? z += z2 : z = z2; }

			alpha = eval(f.alpha);
			beta  = eval(f.beta);
			theta = eval(f2.theta);
			
			if(alpha && beta){
				let pos = rotateByQuaternion(x, y, z, alpha, beta);
				x = pos.x; y = pos.y; z = pos.z;
			}

			alpha2 = eval(f2.alpha);
			beta2  = eval(f2.beta);
			let pos = rotateByBabylonMatrix({x, y, z}, alpha2, beta2, theta);
			x = pos.x; y = pos.y; z = pos.z;

			var {x, y, z} = blendPosAll(x, y, z, u, v, O, cos(u), cos(v));
			var {x, y, z} = functionIt(x, y, z);
			var {x, y, z} = invPos(x, y, z);
			var {x, y, z} = invPosIf(x, y, z);
			var {x, y, z} = permutSign(x, y, z);

			var posByR = {x, y, z};
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

			path.push(new BABYLON.Vector3(x, y, z));
			index_v++; n++;
		}
		this.paths.push(path);
		index_u++;
	}

	if(glo.closeFirstWithLastPath){ this.paths.push(this.paths[0]); }

	glo.lines = this.paths;
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
}, dim_one = glo.dim_one, fractalize = false)
{
	var cyl = false;
	if(glo.coordsType == 'cylindrical'){ cyl = true; }

	glo.savePos.x = 0; glo.savePos.y = 0; glo.savePos.z = 0;

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

	reg(f,  dim_one);
	reg(f2, dim_one);

	var A = glo.params.A; var B = glo.params.B; var C = glo.params.C; var D = glo.params.D; var E = glo.params.E; var F = glo.params.F; var G = glo.params.G; var H = glo.params.H;
	var I = glo.params.I; var J = glo.params.J; var K = glo.params.K; var L = glo.params.L; var M = glo.params.M;

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

    var x = 0; var y = 0; var z = 0; var ind_u = 0; var ind_v = 0;
	var r = 0; var alpha = 0; var beta = 0; var alpha2 = 0; var beta2 = 0; var alpha3 = 0; var beta3 = 0;
	var x = 0.5; var y = 0.5; var z = 0.5;
	var xN = 1; var yN = 1; var zN = 1;
	var µN = 1;
	var $N = 1; var µ$N = 1; var $µN = 1; var µµN = 1; var O = 1; var T = 1;
	var xT = 1; var yT= 1; var zT = 1;
	var T = 1;
	var $T = 1; var µ$T = 1; var $µT = 1; var µµT = 1;
	var rCol = 1; var gCol = 1; var bCol = 1; var mCol = 1;

	var isX = glo.params.text_input_suit_x != "" ? true : false;
	var isY = glo.params.text_input_suit_y != "" ? true : false;
	var isZ = glo.params.text_input_suit_z != "" ? true : false;

  var n = 0;
  var path = [];
  var line_visible = glo.lines_visible;
  var index_u = 0;
  if(!uvInfos.isV){
	    this.paths[0] = [];
		path          = [];
		let u = this.min_u - this.step_u;
		for (let i = 0; i <= this.nb_steps_u; i++) {
			u += this.step_u;
			ind_u = u;

			r     = eval(f.r);
			alpha = eval(f.alpha);
			beta  = eval(f.beta);

			if(r == Infinity || r == -Infinity || isNaN(r)){ r = 0; }

			let pos;
			if(!cyl){
				pos = rotateByBabylonMatrix({x: this.p2_first.x * r, y: this.p2_first.y * r, z: this.p2_first.z * r}, 0, beta, alpha);
			}
			else{
				pos = rotateByBabylonMatrix({x: this.p2_first.x * r, y: this.p2_first.y * r, z: this.p2_first.z * r}, 0, 0, alpha);
				pos.z = beta;
			}

			var x = pos.x; var y = pos.y; var z = pos.z;
			var vect3 = new BABYLON.Vector3(x,y,z);
			vect3 = getNormalVector(vect3);
			xN = vect3.x; yN = vect3.y; zN = vect3.z;
			var µN = xN*yN*zN;
			var $N = (xN+yN+zN)/3;
			var µ$N = µN*$N; var $µN = µN+$N;
			var µµN = µ$N*$µN;

			var O = Math.acos(y/(h(x,y,z)));
			var T = Math.atan2(z, x) ;

			var vectT = new BABYLON.Vector3(x,y,z);
			vectT = BABYLON.Vector3.Normalize(vectT);
			xT = vectT.x; yT = vectT.y; zT = vectT.z;
			var µT = xT*yT*zT;
			var $T = (xT+yT+zT)/3;
			var µ$T = µT*$T; var $µT = µT+$T;
			var µµT = µ$T*$µT;

			if(isX){ const x2 = eval(f2.x); !glo.secondCurveOperation ? pos.x += x2 : pos.x = x2; }
			if(isY){ const y2 = eval(f2.y); !glo.secondCurveOperation ? pos.y += y2 : pos.y = y2; }
			if(isZ){ const z2 = eval(f2.z); !glo.secondCurveOperation ? pos.z += z2 : pos.z = z2; }

			alpha2 = eval(f.alpha2);
			beta2  = eval(f.beta2);
			theta  = eval(f2.theta);

			alpha3 = eval(f2.alpha);
			beta3  = eval(f2.beta);

			if(alpha2 && beta2){
				pos = rotateByQuaternion(x, y, z, alpha2, beta2);
			}
			pos = rotateByBabylonMatrix({x: pos.x, y: pos.y, z: pos.z}, alpha3, beta3, theta);

			pos = blendPosAll(pos.x, pos.y, pos.z, u, v, O, cos(u), cos(v));
			pos = functionIt(pos.x, pos.y, pos.z);
			pos = invPos(pos.x, pos.y, pos.z);
			pos = invPosIf(pos.x, pos.y, pos.z);
			pos = permutSign(pos.x, pos.y, pos.z);

			var posByR = {x: pos.x, y: pos.y, z: pos.z};
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

			if(!glo.noLinkToZero){
				path.push(this.p1_first);
				path.push(new BABYLON.Vector3(pos.x, pos.y, pos.z));
				this.paths.push(path);
			}
			else{
				this.paths[0].push(new BABYLON.Vector3(pos.x, pos.y, pos.z));
			}
			
			path = [];
      		index_u++; n++;
		}

		glo.lines = this.paths;
  }
  else {
		const stepsU = uvInfos.isU ? this.nb_steps_u : 0;
		let u = this.min_u - this.step_u, v = this.min_v - this.step_v;
		for (let i = 0; i <= stepsU; i++) {
			u += this.step_u;
      		var index_v = 0; ind_u = u;
			v = this.min_v - this.step_v
			for (let j = 0; j <= this.nb_steps_v; j++) {
				v += this.step_v;
				ind_v = v;

				r     = eval(f.r);
				alpha = eval(f.alpha);
				beta  = eval(f.beta);

				if(r == Infinity || r == -Infinity || isNaN(r)){ r = 0; }

				let pos;
				if(!cyl){
					pos = rotateByBabylonMatrix({x: this.p2_first.x * r, y: this.p2_first.y * r, z: this.p2_first.z * r}, 0, beta, alpha);
				}
				else{
					pos = rotateByBabylonMatrix({x: this.p2_first.x * r, y: this.p2_first.y * r, z: this.p2_first.z * r}, 0, 0, alpha);
					pos.z = beta;
				}

				var x = pos.x; var y = pos.y; var z = pos.z;
				var vect3 = new BABYLON.Vector3(x,y,z);
				vect3 = getNormalVector(vect3);
				xN = vect3.x; yN = vect3.y; zN = vect3.z;
				var µN = xN*yN*zN;
				var $N = (xN+yN+zN)/3;
				var µ$N = µN*$N; var $µN = µN+$N;
				var µµN = µ$N*$µN;

				var O = Math.acos(y/(h(x,y,z)));
				var T = Math.atan2(z, x) ;

				var vectT = new BABYLON.Vector3(x,y,z);
				vectT = BABYLON.Vector3.Normalize(vectT);
				xT = vectT.x; yT = vectT.y; zT = vectT.z;
				var µT = xT*yT*zT;
				var $T = (xT+yT+zT)/3;
				var µ$T = µT*$T; var $µT = µT+$T;
				var µµT = µ$T*$µT;

				if(isX){ const x2 = eval(f2.x); !glo.secondCurveOperation ? pos.x += x2 : pos.x = x2; }
				if(isY){ const y2 = eval(f2.y); !glo.secondCurveOperation ? pos.y += y2 : pos.y = y2; }
				if(isZ){ const z2 = eval(f2.z); !glo.secondCurveOperation ? pos.z += z2 : pos.z = z2; }

				alpha2 = eval(f.alpha2);
				beta2  = eval(f.beta2);
				theta  = eval(f2.theta);

				alpha3 = eval(f2.alpha);
				beta3  = eval(f2.beta);

				if(alpha2 && beta2){
					pos = rotateByQuaternion(x, y, z, alpha2, beta2);
				}
				pos = rotateByBabylonMatrix({x: pos.x, y: pos.y, z: pos.z}, alpha3, beta3, theta);

				pos = blendPosAll(pos.x, pos.y, pos.z, u, v, O, cos(u), cos(v));
				pos = functionIt(pos.x, pos.y, pos.z);
				pos = invPos(pos.x, pos.y, pos.z);
				pos = invPosIf(pos.x, pos.y, pos.z);
				pos = permutSign(pos.x, pos.y, pos.z);

				var posByR = {x: pos.x, y: pos.y, z: pos.z};
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

				this.new_p2 = new BABYLON.Vector3(pos.x, pos.y, pos.z);

				path.push(this.new_p2);
        		index_v++; n++;
			}
			this.paths.push(path);
			path = [];
      		index_u++;
		}

		if(glo.closeFirstWithLastPath){ this.paths.push(this.paths[0]); }

		glo.lines = this.paths;
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
}, dim_one = glo.dim_one, fractalize = false)
{
	var cyl = false;
	if(glo.coordsType == 'cylindrical'){ cyl = true; }

	glo.savePos.x = 0; glo.savePos.y = 0; glo.savePos.z = 0;

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

	reg(f,  dim_one);
	reg(f2, dim_one);

	var A = glo.params.A; var B = glo.params.B; var C = glo.params.C; var D = glo.params.D; var E = glo.params.E; var F = glo.params.F; var G = glo.params.G; var H = glo.params.H;
	var I = glo.params.I; var J = glo.params.J; var K = glo.params.K; var L = glo.params.L; var M = glo.params.M;

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

    var x = 0; var y = 0; var z = 0; var ind_u = 0; var ind_v = 0;
	var r = 0; var alpha = 0; var beta = 0; var alpha2 = 0; var beta2 = 0; var alpha3 = 0; var beta3 = 0;
	var x = 0.5; var y = 0.5; var z = 0.5;
	var xN = 1; var yN = 1; var zN = 1;
	var µN = 1;
	var $N = 1; var µ$N = 1; var $µN = 1; var µµN = 1; var O = 1; var T = 1;
	var xT = 1; var yT= 1; var zT = 1;
	var T = 1;
	var $T = 1; var µ$T = 1; var $µT = 1; var µµT = 1;
	var rCol = 1; var gCol = 1; var bCol = 1; var mCol = 1;

	var isX = glo.params.text_input_suit_x != "" ? true : false;
	var isY = glo.params.text_input_suit_y != "" ? true : false;
	var isZ = glo.params.text_input_suit_z != "" ? true : false;

	let moyPos = {x: 0, y: 0, z: 0};
	let pos    = {x: 0, y: 0, z: 0};

  var n = 0;
  var path = [];
  var line_visible = glo.lines_visible;
  var index_u = 0;
  if(!uvInfos.isV){
	    this.paths[0] = [];
		path          = [];
		let u = this.min_u - this.step_u;
		for (let i = 0; i <= this.nb_steps_u; i++){
			u += this.step_u;
			ind_u = u;

			r     = eval(f.r);
			alpha = eval(f.alpha);
			beta  = eval(f.beta);

			if(r == Infinity || r == -Infinity || isNaN(r)){ r = 0; }

			const dirXY = directionXY({x: alpha, y: beta}, r);
			pos.x += dirXY.x; pos.y += dirXY.y; pos.z += dirXY.z;

			var x = pos.x; var y = pos.y; var z = pos.z;
			var vect3 = new BABYLON.Vector3(x,y,z);
			vect3 = getNormalVector(vect3);
			xN = vect3.x; yN = vect3.y; zN = vect3.z;
			var µN = xN*yN*zN;
			var $N = (xN+yN+zN)/3;
			var µ$N = µN*$N; var $µN = µN+$N;
			var µµN = µ$N*$µN;

			var O = Math.acos(y/(h(x,y,z)));
			var T = Math.atan2(z, x) ;

			var vectT = new BABYLON.Vector3(x,y,z);
			vectT = BABYLON.Vector3.Normalize(vectT);
			xT = vectT.x; yT = vectT.y; zT = vectT.z;
			var µT = xT*yT*zT;
			var $T = (xT+yT+zT)/3;
			var µ$T = µT*$T; var $µT = µT+$T;
			var µµT = µ$T*$µT;

			if(isX){ const x2 = eval(f2.x); !glo.secondCurveOperation ? pos.x += x2 : pos.x = x2; }
			if(isY){ const y2 = eval(f2.y); !glo.secondCurveOperation ? pos.y += y2 : pos.y = y2; }
			if(isZ){ const z2 = eval(f2.z); !glo.secondCurveOperation ? pos.z += z2 : pos.z = z2; }

			alpha2 = eval(f.alpha2);
			beta2  = eval(f.beta2);
			theta  = eval(f2.theta);

			alpha3 = eval(f2.alpha);
			beta3  = eval(f2.beta);

			if(alpha2 && beta2){
				pos = rotateByQuaternion(x, y, z, alpha2, beta2);
			}
			pos = rotateByBabylonMatrix({x: pos.x, y: pos.y, z: pos.z}, alpha3, beta3, theta);

			pos = blendPosAll(pos.x, pos.y, pos.z, u, 0, O, cos(u), 0);
			pos = functionIt(pos.x, pos.y, pos.z);
			pos = invPos(pos.x, pos.y, pos.z);
			pos = invPosIf(pos.x, pos.y, pos.z);
			pos = permutSign(pos.x, pos.y, pos.z);

			var posByR = {x: pos.x, y: pos.y, z: pos.z};
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

			if(!glo.noLinkToZero){
				path.push(this.p1_first);
				path.push(new BABYLON.Vector3(pos.x, pos.y, pos.z));
				this.paths.push(path);
			}
			else{
				this.paths[0].push(new BABYLON.Vector3(pos.x, pos.y, pos.z));
			}

			moyPos.x += pos.x; moyPos.y += pos.y; moyPos.z += pos.z;
			
			path = [];
      		index_u++; n++;
		}

		glo.lines = this.paths;
  }
  else {
		const stepsU = uvInfos.isU ? this.nb_steps_u : 0;
		let u = this.min_u - this.step_u, v = this.min_v - this.step_v;
		for (let i = 0; i <= stepsU; i++) {
			if(glo.params.curvaturetoZero){ pos = {x: 0, y: 0, z: 0}; path.push(BABYLON.Vector3.Zero()); }
			u += this.step_u;
      		var index_v = 0; ind_u = u;
			v = this.min_v - this.step_v
			for (let j = 0; j <= this.nb_steps_v; j++) {
				
				v += this.step_v;
				ind_v = v;

				r     = eval(f.r);
				alpha = eval(f.alpha);
				beta  = eval(f.beta);

				if(r == Infinity || r == -Infinity || isNaN(r)){ r = 0; }

				const dirXY = directionXY({x: alpha, y: beta}, r);
			    pos.x += dirXY.x; pos.y += dirXY.y; pos.z += dirXY.z;

				var x = pos.x; var y = pos.y; var z = pos.z;
				var vect3 = new BABYLON.Vector3(x,y,z);
				vect3 = getNormalVector(vect3);
				xN = vect3.x; yN = vect3.y; zN = vect3.z;
				var µN = xN*yN*zN;
				var $N = (xN+yN+zN)/3;
				var µ$N = µN*$N; var $µN = µN+$N;
				var µµN = µ$N*$µN;

				var O = Math.acos(y/(h(x,y,z)));
				var T = Math.atan2(z, x) ;

				var vectT = new BABYLON.Vector3(x,y,z);
				vectT = BABYLON.Vector3.Normalize(vectT);
				xT = vectT.x; yT = vectT.y; zT = vectT.z;
				var µT = xT*yT*zT;
				var $T = (xT+yT+zT)/3;
				var µ$T = µT*$T; var $µT = µT+$T;
				var µµT = µ$T*$µT;

				if(isX){ const x2 = eval(f2.x); !glo.secondCurveOperation ? pos.x += x2 : pos.x = x2; }
				if(isY){ const y2 = eval(f2.y); !glo.secondCurveOperation ? pos.y += y2 : pos.y = y2; }
				if(isZ){ const z2 = eval(f2.z); !glo.secondCurveOperation ? pos.z += z2 : pos.z = z2; }

				alpha2 = eval(f.alpha2);
				beta2  = eval(f.beta2);
				theta  = eval(f2.theta);

				alpha3 = eval(f2.alpha);
				beta3  = eval(f2.beta);

				if(alpha2 && beta2){
					pos = rotateByQuaternion(x, y, z, alpha2, beta2);
				}
				pos = rotateByBabylonMatrix({x: pos.x, y: pos.y, z: pos.z}, alpha3, beta3, theta);

				pos = blendPosAll(pos.x, pos.y, pos.z, u, v, O, cos(u), cos(v));
				pos = functionIt(pos.x, pos.y, pos.z);
				pos = invPos(pos.x, pos.y, pos.z);
				pos = invPosIf(pos.x, pos.y, pos.z);
				pos = permutSign(pos.x, pos.y, pos.z);

				var posByR = {x: pos.x, y: pos.y, z: pos.z};
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

				this.new_p2 = new BABYLON.Vector3(pos.x, pos.y, pos.z);

				moyPos.x += pos.x; moyPos.y += pos.y; moyPos.z += pos.z;

				path.push(this.new_p2);
        		index_v++; n++;
			}
			this.paths.push(path);
			path = [];
      		index_u++;
		}
	}

		if(glo.closeFirstWithLastPath){ this.paths.push(this.paths[0]); }

		moyPos.x/=(n-1); moyPos.y/=(n-1); moyPos.z/=(n-1); 
		offsetPathsByMoyPos(this.paths, moyPos);

		glo.lines = this.paths;
}