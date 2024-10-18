// Fonction pour obtenir un vecteur normal (perpendiculaire) à un vecteur donné
function getNormalVector(originalVector) {
	if(originalVector.x === 0 && originalVector.y === 0 && originalVector.z === 0){ return  originalVector; }
    // Choisissez un vecteur arbitraire
    var arbitraryVector = new BABYLON.Vector3(1, 0, 0);

    // Calcul du produit croisé entre les deux vecteurs
    var normalVector = BABYLON.Vector3.Cross(originalVector, arbitraryVector);

    // Vérification de la colinéarité
    while (normalVector.length() === 0) {
        // Si les vecteurs sont colinéaires, ajustez arbitraryVector
        arbitraryVector = new BABYLON.Vector3(Math.random(), Math.random(), Math.random());
        normalVector = BABYLON.Vector3.Cross(originalVector, arbitraryVector);
    }

    // Normalisation du vecteur résultant
    normalVector.normalize();

    return normalVector;
}

function drawNormalEquations(symmetrize = false){
	if(typeof(glo.verticesNormals) == "undefined"){
		glo.verticesNormals   = glo.ribbon.getVerticesData(BABYLON.VertexBuffer.NormalKind);
		glo.verticesPositions = glo.ribbon.getVerticesData(BABYLON.VertexBuffer.PositionKind);
		glo.verticesUVs       = glo.ribbon.getVerticesData(BABYLON.VertexBuffer.UVKind);
	}
	if(typeof(glo.verticesColors) == "undefined" || glo.verticesColors == null){ glo.verticesColors = glo.ribbon.getVerticesData(BABYLON.VertexBuffer.ColorKind); }
	var isVerticesColors = glo.verticesColors != null ? true : false;
	var verticesColors = [];
	if(isVerticesColors){
		glo.verticesColors.map(vc => {
			verticesColors.push(!isNaN(vc) ? vc : 0);
		});
	}
	var verticesNormals       = glo.verticesNormals;
	var verticesNormalsLength = verticesNormals.length;

	var vertices = glo.vertexsType === 'normal' ? verticesNormals : (glo.vertexsType === 'uv' ? glo.verticesUVs : glo.verticesPositions);
	var verticesLength = glo.vertexsType === 'normal' ? verticesNormalsLength : (glo.vertexsType === 'uv' ? glo.verticesUVs.length : glo.verticesPositions.length);

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

		if(!glo.normalOnNormalMode || !glo.curves.pathsSecond){ var paths = glo.curves.paths; }
		else{ var paths = Object.assign([], glo.curves.pathsSecond) }

		glo.curves.pathsSecond = [];
		var pathsLength = paths.length;
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
					if(n*3 + 2 > verticesLength){ n = 0; }
					var xN = vertices[n*3]; var yN = vertices[n*3 + 1]; var zN = vertices[n*3 + 2];
					var µN = xN*yN*zN;
					var $N = (xN+yN+zN)/3;
					var µ$N = µN*$N; var $µN = µN+$N;
					var µµN = µ$N*$µN;
					var rCol = isVerticesColors ? verticesColors[n*4] : 1; var gCol = isVerticesColors ? verticesColors[n*4 + 1] : 1; var bCol = isVerticesColors ? verticesColors[n*4 + 2] : 1;
					var xP = p.x; var yP = p.y; var zP = p.z;
					var $P = (xP+yP+zP)/3; var µP = xP*yP*zP;

					var mCol = (rCol + gCol + bCol) / 3;

					var O = Math.acos(y/(h(xP,yP,zP)));
					var T = Math.atan2(zP,xP);

					var vectT = getNormalVector(new BABYLON.Vector3(xN, yN, zN));
					vectT = BABYLON.Vector3.Normalize(vectT);
					xT = vectT.x; yT = vectT.y; zT = vectT.z;
					var µT = xT*yT*zT;
					var $T = (xT+yT+zT)/3;
					var µ$T = µT*$T; var $µT = µT+$T;
					var µµT = µ$T*$µT;

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

					x = xP + ((x*scale) * xN);
					y = yP + ((y*scale) * yN);
					z = zP + ((z*scale) * zN);

					pathNow.push(new BABYLON.Vector3(x, y, z));

					n++; index_v++;
				}
				glo.curves.pathsSecond.push(pathNow);
			}

			if(glo.closeFirstWithLastPath){ glo.curves.pathsSecond.push(glo.curves.pathsSecond[0]); }

			glo.lines = glo.curves.pathsSecond;
		}
		make_ribbon(symmetrize);
	}

	return false;
}

async function drawSliderNormalEquations(paths = glo.curves.paths.slice(), norm = glo.params.functionIt.norm){
	if(!norm.x && !norm.y && !norm.z){ return paths; }

	if(typeof(glo.verticesNormals) == "undefined"){
		glo.verticesNormals   = glo.ribbon.getVerticesData(BABYLON.VertexBuffer.NormalKind);
		glo.verticesPositions = glo.ribbon.getVerticesData(BABYLON.VertexBuffer.PositionKind);
		glo.verticesUVs       = glo.ribbon.getVerticesData(BABYLON.VertexBuffer.UVKind);
	}
	if(typeof(glo.verticesColors) == "undefined" || glo.verticesColors == null){ glo.verticesColors = glo.ribbon.getVerticesData(BABYLON.VertexBuffer.ColorKind); }
	var isVerticesColors = glo.verticesColors != null ? true : false;
	var verticesColors = [];
	if(isVerticesColors){
		glo.verticesColors.map(vc => {
			verticesColors.push(!isNaN(vc) ? vc : 0);
		});
	}
	var verticesNormals       = glo.verticesNormals;
	var verticesNormalsLength = verticesNormals.length;

	var vertices       = glo.vertexsType === 'normal' ? verticesNormals : (glo.vertexsType === 'uv' ? glo.verticesUVs : glo.verticesPositions);
	var verticesLength = glo.vertexsType === 'normal' ? verticesNormalsLength : (glo.vertexsType === 'uv' ? glo.verticesUVs.length : glo.verticesPositions.length);

	if(!glo.params.wOnXYZ){
		n = 0;
		glo.curves.paths = paths.map(line => line.map(
			path => {
				const xN = vertices[n*3]; const yN = vertices[n*3 + 1]; const zN = vertices[n*3 + 2];

				const x = norm.x ? path.x + ((cos(norm.x*xN)*norm.nx) * xN) : path.x;
				const y = norm.y ? path.y + ((cos(norm.y*yN)*norm.ny) * yN) : path.y;
				const z = norm.z ? path.z + ((cos(norm.z*zN)*norm.nz) * zN) : path.z;

				n++;
				return new BABYLON.Vector3(x, y, z);
			}
		));
	}
	else{
		n = 0;
		glo.curves.paths = paths.map(line => line.map(
			path => {
				const xN = vertices[n*3]; const yN = vertices[n*3 + 1]; const zN = vertices[n*3 + 2];

				let x = path.x, y = path.y, z = path.z;
				if(norm.x){
					const cosToAdd = cos(norm.x*xN)*norm.nx;
					x += cosToAdd * xN;
					y += cosToAdd * yN;
					z += cosToAdd * zN;
				}
				if(norm.y){
					const cosToAdd = cos(norm.y*yN)*norm.ny;
					x += cosToAdd * xN;
					y += cosToAdd * yN;
					z += cosToAdd * zN;
				}
				if(norm.z){
					const cosToAdd = cos(norm.z*zN)*norm.nz;
					x += cosToAdd * xN;
					y += cosToAdd * yN;
					z += cosToAdd * zN;
				}

				n++;
				return new BABYLON.Vector3(x, y, z);
			}
		));
	}

	ribbonDispose(false);
	glo.ribbon = await BABYLON.MeshBuilder.CreateRibbon("NormRibbonBySlider", {pathArray: glo.curves.paths, sideOrientation:1, updatable: true, }, glo.scene);
	makeLineSystem();
}