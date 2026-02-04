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