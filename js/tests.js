function test_equations(equations, dim_one = false, forCol = false){
	glo.formule = [];
	
	var d = 1, k = 1, p = 1, t = 1, i = 1, j = 1;

	var A = glo.params.A; var B = glo.params.B; var C = glo.params.C; var D = glo.params.D; var E = glo.params.E; var F = glo.params.F; var G = glo.params.G; var H = glo.params.H;
	var I = glo.params.I; var J = glo.params.J; var K = glo.params.K; var L = glo.params.L; var M = glo.params.M;

	var X = 1;
	var Y = 1;

	var eq = equations;

	for (let prop in equations){
		if(!eq[prop] || eq[prop] == ""){ eq[prop] = 0; }
	}

	reg(eq, dim_one);

	var path = [];

	glo.toHisto = true;

	var u = 1; var v = 1; var n = 1; var w = 1;
	var uMax = 1; var vMax = 1; var nMax = 1;
	var uMin = 1; var vMin = 1; var nMin = 1;
	var stepU = 1; var stepV = 1;
	var x = 1; var y = 1; var z = 1;
	var r = 1; var alpha = 1; var beta = 0;
	var xN = 1; var yN = 1; var zN = 1;
	var xT = 1; var yT = 1; var zT = 1;
	var xP = 1; var yP = 1; var zP = 1; var µN = 1; var µP = 1; var µT = 1; var $P = 1;
	var $N = 1; var µ$N = 1; var $µN = 1; var µµN = 1;
	var $T = 1; var µ$T = 1; var $µT = 1; var µµT = 1;
	var rCol = 1; var gCol  = 1; var bCol  = 1; var mCol  = 1;
	var O = 1; var T = 1;
	try{
		const results = {};
		for (const key in eq) {
			if (eq.hasOwnProperty(key)) {
			results[key] = eval(eq[key]);
			}
		}

		for (const key in results) {
			if (results.hasOwnProperty(key)) {
				if (isNaN(results[key])) {
				// Traitement en cas de NaN (ici, on affecte la variable x via eval)
				x = eval("undefine");
				break;
				}
			}
		}

	}
	catch(error){
		glo.toHisto = false;
		return false;
	}

	return true;
}

function test_equationsSave(equations, dim_one = false, forCol = false){
	glo.formule = [];

	var {q, m, mx, my, mz, P, v_mod, N} = makeCommonCurveFunctions();
	
	var d = 1, k = 1, p = 1, t = 1;

	var A = glo.params.A; var B = glo.params.B; var C = glo.params.C; var D = glo.params.D; var E = glo.params.E; var F = glo.params.F; var G = glo.params.G; var H = glo.params.H;
	var I = glo.params.I; var J = glo.params.J; var K = glo.params.K; var L = glo.params.L; var M = glo.params.M;

	var Y = 1;

	var f = equations;
	if(!f.fx || f.fx == ""){ f.fx = 0; }
	if(!f.fy || f.fy == ""){ f.fy = 0; }
	if(!f.fz || f.fz == ""){ f.fz = 0; }
	if(!f.falpha || f.falpha == ""){ f.falpha = 0; }
	if(!f.fbeta || f.fbeta == ""){ f.fbeta = 0; }
	if(!f.fSuitAlpha){ f.fSuitAlpha = 0; }
	if(!f.fSuitBeta){ f.fSuitBeta = 0; }
	if(!f.fSuitTheta){ f.fSuitTheta = 0; }
	if(!f.fSuitX){ f.fSuitX = 0; }
	if(!f.fSuitY){ f.fSuitY = 0; }
	if(!f.fSuitZ){ f.fSuitZ = 0; }

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
	var xT = 1; var yT = 1; var zT = 1;
	var xP = 1; var yP = 1; var zP = 1; var µN = 1; var µP = 1; var µT = 1; var $P = 1;
	var $N = 1; var µ$N = 1; var $µN = 1; var µµN = 1;
	var $T = 1; var µ$T = 1; var $µT = 1; var µµT = 1;
	var rCol = 1; var gCol  = 1; var bCol  = 1; var mCol  = 1;
	var O = 1; var T = 1;
	try{
		x = eval(f.fx);
		y = eval(f.fy);
		z = eval(f.fz);
		alpha = eval(f.falpha);
		beta  = eval(f.fbeta);
		suitAlpha = eval(f.fSuitAlpha);
		suitBeta  = eval(f.fSuitBeta);
		suitTheta = eval(f.fSuitTheta);
		suitX = eval(f.fSuitX);
		suitY = eval(f.fSuitY);
		suitZ = eval(f.fSuitZ);
		if(isNaN(x) || isNaN(y) || isNaN(z) || isNaN(alpha) || isNaN(beta) || isNaN(suitAlpha) ||
		   isNaN(suitAlpha) || isNaN(suitTheta) || isNaN(suitX) || isNaN(suitY) || isNaN(suitZ)){ x = eval(undefine); }
	}
	catch(error){
		glo.toHisto = false;
		return false;
	}

	return true;
}

function testUpdateRibbonPaths(funcX = (x, y, z) => x, funcY = (x, y, z) => y, funcZ = (x, y, z) => z) {
    glo.curves.paths = glo.curves.paths.map(line => line.map(
        path => {
            const x = funcX ? funcX(path.x, path.y, path.z) : path.x;
            const y = funcY ? funcY(path.x, path.y, path.z) : path.y;
            const z = funcZ ? funcZ(path.x, path.y, path.z) : path.z;
            return new BABYLON.Vector3(x, y, z);
        }
    ));
    make_ribbon();
}

function testMat(axis, angle, method = 'direct'){
	switch(method){
		case 'direct': testDirRot(axis, angle);    break;
		case 'simple': testSimpleMat(axis, angle); break;
		case 'center': testCenterMat(axis, angle); break;
	}
}

function testSimpleMat(axis, angle){
	let alpha = 0, beta = 0, theta = 0;

	switch(axis){
		case 'x': alpha = angle; break;
		case 'y': beta  = angle; break;
		case 'z': theta = angle; break;
	}

	glo.curves.paths = glo.curves.paths.map(line => line.map(
        path => {
			const pos = rotateByBabylonMatrix({x:path.x, y:path.y, z:path.z}, alpha, beta, theta);
            return new BABYLON.Vector3(pos.x, pos.y, pos.z);
        }
    ));
    make_ribbon();
}

function testCenterMat(axis, angle){
	let alpha = 0, beta = 0, theta = 0;

	switch(axis){
		case 'x': alpha = angle; break;
		case 'y': beta  = angle; break;
		case 'z': theta = angle; break;
	}

	glo.curves.paths = glo.curves.paths.map(line => line.map(
        path => {
			const pos = rotateOnCenterByBabylonMatrix({x:path.x, y:path.y, z:path.z}, alpha, beta, theta);
            return new BABYLON.Vector3(pos.x, pos.y, pos.z);
        }
    ));
    make_ribbon();
}

function testDirRot(axis, angle){
	glo.ribbon.rotation[axis] = angle;
}

function testReg(){
	const f = {
		x: glo.params.text_input_x,
		y: glo.params.text_input_y,
		z: glo.params.text_input_z,
		R: glo.params.text_input_alpha,
		W: glo.params.text_input_beta,
		S: glo.params.text_input_sym_r,
	};
	return reg(f, false);
}