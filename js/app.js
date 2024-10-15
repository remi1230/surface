//*****************************************************************************************************//
//********************************************MAIN FUNCTIONS*******************************************//
//*****************************************************************************************************//
async function make_curves(u_params = {
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
	fSuitAlpha: glo.params.text_input_suit_alpha,
	fSuitBeta: glo.params.text_input_suit_beta,
	fSuitTheta: glo.params.text_input_suit_theta,
	fSuitX: glo.params.text_input_suit_x,
	fSuitY: glo.params.text_input_suit_y,
	fSuitZ: glo.params.text_input_suit_z,
}, dim_one = glo.dim_one, fractalize = false){

	var good = test_equations(equations, dim_one);
	if(good){
		if(glo.resetClones){ resetClones(); }

		if(typeof(glo.curves) != "undefined"){
			if(glo.curves.linesSystems){ glo.curves.linesSystems.forEach(lineSystem => { lineSystem.dispose(true); lineSystem = null; }); }
			if(glo.curves.lineSystem){ glo.curves.lineSystem.dispose(true); delete glo.curves.lineSystem; }
			glo.curves = {}; delete glo.curves;
		}

		makeOnlyCurves(undefined, undefined, undefined, undefined, false, fractalize);

		await expendPathsByEachCenter();
		await rotatePathsByEachCenter();

		await make_ribbon();
		glo.ribbon.refreshBoundingInfo();
		setTimeout(() => {
			glo.camera.focusOn([glo.ribbon], true);
		}, 0);

		if(!glo.first_rot){ glo.scene.meshes.map(mesh => { mesh.rotation.z = glo.rot_z; }); }
	}
}

function makeOnlyCurves(parameters, f, f2, d, coordTypes = false, fractalize = false, onePoint = false) {
    if (glo.coordsType !== 'cartesian') {
        if (f) {
            f.alpha2 = f.alpha;
            f.beta2  = f.beta;
            f.r      = f.x;
            f.alpha  = f.y;
            f.beta   = f.z;

            delete f.x; delete f.y; delete f.z;
        }
    }

    let objToSet = !onePoint ? 'curves' : 'onePoint';
    switch (coordTypes || glo.coordsType) {
        case 'cartesian':
            glo[objToSet] = new Curves(parameters, f, f2, d, fractalize, onePoint);
            break;
        case 'spheric':
        case 'cylindrical':
            glo[objToSet] = new CurvesByRot(parameters, f, f2, d, fractalize, onePoint);
            break;
        case 'curvature':
            glo[objToSet] = new CurvesByCurvature(parameters, f, f2, d, fractalize, onePoint);
            break;
    }
}

function makeOnePoint(u, v){
	makeOnlyCurves({ 
		u: {min: u, max: u, nb_steps: 1, },
		v: {min: v, max: v, nb_steps: 1, },
	}, undefined, undefined, undefined, false, false, true);

	return glo.onePoint;
}

async function make_ribbon(symmetrize = true){
	glo.emissiveColorSave = {...glo.emissiveColor};
	glo.diffuseColorSave  = {...glo.diffuseColor};

	var nameRibbon = "Ribbon_" + glo.numRibbon;
	glo.numRibbon++;

	var material = new BABYLON.StandardMaterial("myMaterial", glo.scene);
	material.backFaceCulling = false;

	var paths = glo.curves.paths;
	if(glo.normalMode && !glo.fromSlider){ paths = glo.curves.pathsSecond; }
	else{
		delete glo.verticesNormals;
		delete glo.verticesPositions;
		delete glo.verticesUVs;
	}

	if(glo.fromSlider){ delete glo.verticesColors; }

	if(glo.params.expansion){ expanseRibbon(); }

	scaleVertexsDist(glo.scaleVertex);

	const isClosedArray = glo.params.lastPathEqualFirstPath;

	ribbonDispose();
	if(!glo.params.playWithColors && glo.colorsType == 'none'){
		if(!glo.voronoiMode){
			glo.ribbon = await BABYLON.MeshBuilder.CreateRibbon(nameRibbon, {pathArray: paths, sideOrientation:1, updatable: true, closeArray: isClosedArray}, glo.scene, );
		}
		else{
			var colorsRibbon = voronoi();
			var white = BABYLON.Color3.White();
			glo.emissiveColor = white;
			glo.diffuseColor  = white;
			glo.ribbon = await BABYLON.MeshBuilder.CreateRibbon(nameRibbon, {pathArray: paths, colors: colorsRibbon, sideOrientation:1, updatable: true, closeArray: isClosedArray }, glo.scene, );
		}
	}
	else{
		ribbonDispose();
		if(1 == 1){
			glo.ribbon = await BABYLON.MeshBuilder.CreateRibbon(nameRibbon, {pathArray: paths, sideOrientation:1, updatable: true, closeArray: isClosedArray }, glo.scene, );
			glo.colorsRibbonSave = {};
			objCols = {colsArr: colorsRibbon};
			Object.assign(glo.colorsRibbonSave, objCols);
			var white = BABYLON.Color3.White();
			glo.emissiveColor = white;
			glo.diffuseColor  = white;
			makeOtherColors(true);
		}
		else{
			if(typeof(glo.colorsRibbonSave) != "undefined"){
				glo.ribbon = await BABYLON.MeshBuilder.CreateRibbon(nameRibbon, {pathArray: paths, colors: glo.colorsRibbonSave.colsArr, sideOrientation:1, updatable: true, closeArray: isClosedArray }, glo.scene, );
			}
			else{
				glo.ribbon = await BABYLON.MeshBuilder.CreateRibbon(nameRibbon, {pathArray: paths, sideOrientation:1, updatable: true, closeArray: isClosedArray }, glo.scene, );
			}
		}
	}

	glo.originRibbonNbIndices = glo.ribbon.getIndices().length;

	const norm = glo.params.functionIt.norm;

	if(symmetrize){ await makeSymmetrize(); }
	if(glo.params.fractalize.actived){
		await glo.ribbon.fractalize();
		if(glo.params.fractalize.refractalize){ await glo.ribbon.fractalize(); }
	}
	if(norm.x || norm.y || norm.z){ await drawSliderNormalEquations(); }
	
	giveMaterialToMesh();

	glo.is_ribbon = true;
    if(!glo.ribbon_visible){ glo.ribbon.visibility = 0; }

  	glo.emissiveColor = {...glo.emissiveColorSave};
	glo.diffuseColor  = {...glo.diffuseColorSave};

	await cutsRibbon();

	makeLineSystem();

	if(glo.params.checkerboard){ glo.ribbon.checkerboard(); }

	glo.ribbon.savePos = glo.ribbon.getPositionData().slice();
	flatRibbon();

	if(glo.meshWithTubes){ await meshWithTubes(); }

	make_planes();

	applyTransformations();
	glo.ribbon.moyPosToOrigin();

	glo.ribbon.showBoundingBox = glo.params.showBoundingBox;
	glo.params.lastPathEqualFirstPath = false;

	glo.ribbon.curveByStep = glo.ribbon.curveByStepGen();
}

function ribbonDispose(all = true){
	if(typeof(glo.ribbon)    != "undefined" && glo.ribbon != null){ glo.ribbon.dispose(); glo.ribbon = null; }
	if(typeof(glo.meshTubes) != "undefined" && glo.meshTubes != null){ glo.meshTubes.dispose(); glo.meshTubes = null; }

	if(all){
		const notToDispose = ['axisX', 'axisY', 'axisZ', 'gridX', 'gridY', 'gridZ', 'lineSystem', 'plane', 'TextPlane'];
		glo.scene.meshes.forEach(mesh => {
			if(!notToDispose.includes(mesh.name)){ mesh.dispose(); }
		});
	}
}

async function remakeRibbon(fractalize = !glo.params.fractalize.actived ? false : 'fractalize'){
	if(!glo.normalMode){  await make_curves(undefined, undefined, undefined, undefined, fractalize); }
	else{
		glo.fromSlider = true; await make_curves(undefined, undefined, undefined, undefined, fractalize); glo.fromSlider = false; drawNormalEquations();
	}
}

async function makeSymmetrize(){
	const isFirstX    = glo.params.symmetrizeX ? false : true;
	const isFirstXorY = (glo.params.symmetrizeX || glo.params.symmetrizeY) ? false : true;

	switch(glo.symmetrizeOrder){
		case 'xyz':
			if(glo.params.symmetrizeX){ await symmetrizeRibbon("symmetrizeX", glo.params.symmetrizeX); }
			if(glo.params.symmetrizeY){ await symmetrizeRibbon("symmetrizeY", (glo.params.symmetrizeX ? glo.params.symmetrizeX : 1) * glo.params.symmetrizeY, isFirstX); }
			if(glo.params.symmetrizeZ){ await symmetrizeRibbon("symmetrizeZ", (glo.params.symmetrizeX ? glo.params.symmetrizeX : 1) *
	                                                                  (glo.params.symmetrizeY ? glo.params.symmetrizeY : 1) * glo.params.symmetrizeZ, isFirstXorY); }
		break;
		case 'xzy':
			if(glo.params.symmetrizeX){ await symmetrizeRibbon("symmetrizeX", glo.params.symmetrizeX); }
			if(glo.params.symmetrizeZ){ await symmetrizeRibbon("symmetrizeZ", (glo.params.symmetrizeX ? glo.params.symmetrizeX : 1) * glo.params.symmetrizeZ, isFirstX); }
			if(glo.params.symmetrizeY){ await symmetrizeRibbon("symmetrizeY", (glo.params.symmetrizeX ? glo.params.symmetrizeX : 1) *
	                                                                  (glo.params.symmetrizeZ ? glo.params.symmetrizeZ : 1) * glo.params.symmetrizeY, isFirstXorY); }
		break;
		case 'yxz':
			if(glo.params.symmetrizeY){ await symmetrizeRibbon("symmetrizeY", glo.params.symmetrizeY); }
			if(glo.params.symmetrizeX){ await symmetrizeRibbon("symmetrizeX", (glo.params.symmetrizeY ? glo.params.symmetrizeY : 1) * glo.params.symmetrizeX, isFirstX); }
			if(glo.params.symmetrizeZ){ await symmetrizeRibbon("symmetrizeZ", (glo.params.symmetrizeY ? glo.params.symmetrizeY : 1) *
	                                                                  (glo.params.symmetrizeX ? glo.params.symmetrizeX : 1) * glo.params.symmetrizeZ, isFirstXorY); }
		break;
		case 'yzx':
			if(glo.params.symmetrizeY){ await symmetrizeRibbon("symmetrizeY", glo.params.symmetrizeY); }
			if(glo.params.symmetrizeZ){ await symmetrizeRibbon("symmetrizeZ", (glo.params.symmetrizeY ? glo.params.symmetrizeY : 1) * glo.params.symmetrizeZ, isFirstX); }
			if(glo.params.symmetrizeX){ await symmetrizeRibbon("symmetrizeX", (glo.params.symmetrizeY ? glo.params.symmetrizeY : 1) *
	                                                                  (glo.params.symmetrizeZ ? glo.params.symmetrizeZ : 1) * glo.params.symmetrizeX, isFirstXorY); }
		break;
		case 'zxy':
			if(glo.params.symmetrizeZ){ await symmetrizeRibbon("symmetrizeZ", glo.params.symmetrizeZ); }
			if(glo.params.symmetrizeX){ await symmetrizeRibbon("symmetrizeX", (glo.params.symmetrizeZ ? glo.params.symmetrizeZ : 1) * glo.params.symmetrizeX, isFirstX); }
			if(glo.params.symmetrizeY){ await symmetrizeRibbon("symmetrizeY", (glo.params.symmetrizeZ ? glo.params.symmetrizeZ : 1) *
	                                                                  (glo.params.symmetrizeX ? glo.params.symmetrizeX : 1) * glo.params.symmetrizeY, isFirstXorY); }
		break;
		case 'zyx':
			if(glo.params.symmetrizeZ){ await symmetrizeRibbon("symmetrizeZ", glo.params.symmetrizeZ); }
			if(glo.params.symmetrizeY){ await symmetrizeRibbon("symmetrizeY", (glo.params.symmetrizeZ ? glo.params.symmetrizeZ : 1) * glo.params.symmetrizeY, isFirstX); }
			if(glo.params.symmetrizeX){ await symmetrizeRibbon("symmetrizeX", (glo.params.symmetrizeZ ? glo.params.symmetrizeZ : 1) *
	                                                                  (glo.params.symmetrizeY ? glo.params.symmetrizeY : 1) * glo.params.symmetrizeX, isFirstXorY); }
		break;
	}
}

async function symmetrizeRibbon(axisVarName, coeff = 1, first = true){
	let curvesPathsSave = [...glo.curves.pathsSave];

	const nbSyms    = glo.params[axisVarName];
	const axis      = axisVarName.slice(-1);
	const stepAngle = glo.params.symmetrizeAngle/nbSyms;

	var A = glo.params.A; var B = glo.params.B; var C = glo.params.C; var D = glo.params.D; var E = glo.params.E; var F = glo.params.F; var G = glo.params.G; var H = glo.params.H;
	var I = glo.params.I; var J = glo.params.J; var K = glo.params.K; var L = glo.params.L; var M = glo.params.M;

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

	if(glo.curves.linesSystems){ glo.curves.linesSystems.forEach(lineSystem => { lineSystem.dispose(true); lineSystem = null; }); }

	const stepU = 2*glo.params.u / glo.params.steps_u;
	const stepV = 2*glo.params.v / glo.params.steps_v;

	let inputSymREq = {fx: glo.input_sym_r.text};

	let u,v,d,k,n,p,t;

	if(glo.input_sym_r.text){
		reg(inputSymREq, glo.dim_one);
	}
	const goodR = glo.input_sym_r.text ? test_equations(inputSymREq, glo.dim_one) : false;

	const savedIndices = glo.ribbon.getIndices().slice();

	const isCenterOffset = (glo.centerSymmetry.x || glo.centerSymmetry.y || glo.centerSymmetry.z) ? true : false;

	glo.ribbon.computeWorldMatrix(true);
	glo.ribbon.refreshBoundingInfo();
	glo.ribbon.boundingInfos = glo.ribbon.getBoundingInfo();
	const centerLocal        = glo.params.centerIsLocal ? glo.ribbon.boundingInfos.boundingBox.center : {x:0,y:0,z:0};

	let index_u = 0, index_v = 0;
	let newRibbons          = [];
	let newCurves           = [];
	glo.curves.linesSystems = [];
	for(let indk = 1; indk <= nbSyms; indk++){
		n = 0;
		const angle = indk * stepAngle;
		index_u = 0;
		newCurves[indk] = [];

		if((goodR || isCenterOffset) && first){
			let verticesNormals;
			if(goodR){ verticesNormals = glo.ribbon.getVerticesData(BABYLON.VertexBuffer.NormalKind); }
			//glo.ribbon.dispose();
			const rotate = isCenterOffset? rotateOnCenterByBabylonMatrix : rotateByMatrix;
			const center = new BABYLON.Vector3(glo.centerSymmetry.x + centerLocal.x, glo.centerSymmetry.y + centerLocal.y, glo.centerSymmetry.z + centerLocal.z);
			
			curvesPathsSave.forEach((line, i) => {
				k = !(i%2) ? -1 : 1;
				index_v = 0;
				u = i * stepU;
				p = !(i%2) ? -u : u;
				newCurves[indk][i] = [];
				line.forEach((vect, j) => {
					d = !(j%2) ? -1 : 1;
					v = j * stepV;
					t = !(j%2) ? -v : v;

					let newPt = vect;

					if(goodR){
						let r = 0;
						
						var x = newPt.x; var y = newPt.y; var z = newPt.z;
						const vect3 = new BABYLON.Vector3(x,y,z);

						const xN = verticesNormals[n*3]; const yN = verticesNormals[n*3 + 1]; const zN = verticesNormals[n*3 + 2];

						let normalVector = new BABYLON.Vector3(xN, yN, zN);
						
						if(nbSyms > 1){ 
							switch(axis){
								case 'X':
									normalVector = rotate(normalVector, angle, 0, 0, center);
								break;
								case 'Y':
									normalVector = rotate(normalVector, 0, angle, 0, center);
								break;
								case 'Z':
									normalVector = rotate(normalVector, 0, 0, angle, center);
								break;
							}
						}

						/*const vectN = getNormalVector(vect3);
						xN = vectN.x; yN = vectN.y; zN = vectN.z;*/
						const µN = xN*yN*zN;
						const $N = (xN+yN+zN)/3;
						const µ$N = µN*$N; var $µN = µN+$N;
						const µµN = µ$N*$µN;

						const O = Math.acos(y/(h(x,y,z)));
						const T = Math.atan2(z, x) ;

						const vectT = BABYLON.Vector3.Normalize(vect3);
						const xT = vectT.x; const yT = vectT.y; const zT = vectT.z;
						const µT = xT*yT*zT;
						const $T = (xT+yT+zT)/3;
						const µ$T = µT*$T; var $µT = µT+$T;
						const µµT = µ$T*$µT;

						r = eval(inputSymREq.fx);
						const angleXY = getAzimuthElevationAngles(glo.params.normByFace ? normalVector : vectT);
						const dirXY   = directionXY(angleXY, r);
						
						newPt = !glo.addSymmetry ? dirXY : {x: newPt.x + dirXY.x, y: newPt.y + dirXY.y, z: newPt.z + dirXY.z };
					}


					newPt = isCenterOffset ? new BABYLON.Vector3(newPt.x, newPt.y, newPt.z) : newPt;
					
					if(nbSyms > 1){ 
						switch(axis){
							case 'X':
								newPt = rotate(newPt, angle, 0, 0, center);
							break;
							case 'Y':
								newPt = rotate(newPt, 0, angle, 0, center);
							break;
							case 'Z':
								newPt = rotate(newPt, 0, 0, angle, center);
							break;
						}
					}

					newCurves[indk][i].push(new BABYLON.Vector3(newPt.x, newPt.y, newPt.z));
					index_v++;
					n++;
				});
				index_u++;
			});

			const closedThenOpened = glo.params.lastPathEqualFirstPath && !isClosedPaths(newCurves[indk]);

			newCurves[indk].pop();
			/*if(glo.params.lastPathEqualFirstPath && !isClosedPaths(newCurves[indk])){
				newCurves[indk].pop();
			}*/
			let newRibbon = await BABYLON.MeshBuilder.CreateRibbon(
				"newRibbon_" + indk, {pathArray: newCurves[indk], sideOrientation:1, updatable: true, closeArray: !closedThenOpened}, glo.scene
			);
			/*newRibbon.updateIndices(newRibbon.getIndices());
			newRibbon.computeWorldMatrix(true);
			newRibbon.refreshBoundingInfo();*/
			newRibbons.push(newRibbon);
			//newRibbon.dispose();
		}
		else{
			let newRibbon = await glo.ribbon.clone();
			if(nbSyms > 1){
				newRibbon.setPivotPoint(centerLocal);
				newRibbon.rotation[axis.toLowerCase()] = angle;
			}
			newRibbons.push(newRibbon);
		}
	}

	newRibbons.forEach(async newRibbon => { await newRibbon.updateIndices(newRibbon.getIndices()); await newRibbon.computeWorldMatrix(true); });

	ribbonDispose(false);
	if(!glo.mergeMeshesByIntersect){ glo.ribbon = newRibbons.length > 1 ? await BABYLON.Mesh.MergeMeshes(newRibbons, true, true, undefined, false, false) : newRibbons[0]; }
	else{
		glo.ribbon = await mergeManyMeshesByIntersects(newRibbons);
	}

	const positions = glo.ribbon.getPositionData();
	glo.ribbon.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions, true);
	glo.ribbon.updateIndices(glo.ribbon.getIndices());
	glo.ribbon.computeWorldMatrix(true);
	glo.ribbon.refreshBoundingInfo();

	glo.curves.paths   = glo.ribbon.getPaths(positions, coeff);
	glo.lines          = glo.curves.paths;
	glo.ribbon.savePos = positions.slice();
}

function functionIt(x, y, z){
	const cpowX  = glo.params.functionIt.cpow.x;
	const cpowY  = glo.params.functionIt.cpow.y;
	const cpowZ  = glo.params.functionIt.cpow.z;
	const sinX   = glo.params.functionIt.sin.x;
	const sinnX  = glo.params.functionIt.sin.nx;
	const sinY   = glo.params.functionIt.sin.y;
	const sinnY  = glo.params.functionIt.sin.ny;
	const sinZ   = glo.params.functionIt.sin.z;
	const sinnZ  = glo.params.functionIt.sin.nz;            

	x = cpowX != 1 ? cpow(x, cpowX) : x;
	y = cpowY != 1 ? cpow(y, cpowY) : y;
	z = cpowZ != 1 ? cpow(z, cpowZ) : z;

	x = sinX > ep || sinX < -ep ? x + sin(sinnX * x) * sinX : x;
	y = sinY > ep || sinY < -ep ? y + sin(sinnY * y) * sinY : y;
	z = sinZ > ep || sinZ < -ep ? z + sin(sinnZ * z) * sinZ : z;
	
	return {x, y, z};
}

function flatRibbon(){
	function flatPos(axis, extremePos, newPositions = false){
		let positions = newPositions;

		if(glo.params.functionIt.flat[axis].bottom < 100){
			const axisBottom = glo.params.functionIt.flat[axis].bottom;
			const axisNum    = axis.charCodeAt() - 120;
			positions        = !newPositions ? extremePos.positions : newPositions;

			const minPos     = extremePos[axis].min;
			const dist       = extremePos[axis].dist;
			const distReduce = dist*(1 - 0.01*axisBottom);
			const maxHeight  = minPos + distReduce;

			for (var i = 0; i < positions.length; i += 3) {
				const newPosOnAxis = positions[i+axisNum];

				if(newPosOnAxis < maxHeight){
					positions[i+axisNum] = maxHeight;
				}
			}
		}
		return positions;
	}
	
	if(glo.params.functionIt.flat['x'].bottom < 100 || glo.params.functionIt.flat['y'].bottom < 100 || glo.params.functionIt.flat['z'].bottom < 100){
		let mesh         = glo.ribbon;
		const extremePos = mesh.extremePos();
		let positions    = extremePos.positions;

		['x', 'y', 'z'].forEach(axis => { positions = flatPos(axis, extremePos, positions); });

		//mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
		mesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions, true);
		
		// Optionnel : Recalculer les normales si nécessaire
		//mesh.updateIndices(mesh.getIndices());
		mesh.setIndices(mesh.getIndices());
		mesh.computeWorldMatrix(true);
		mesh.refreshBoundingInfo();
		var normals = [];
		BABYLON.VertexData.ComputeNormals(positions, mesh.getIndices(), normals);
		//mesh.updateVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
		mesh.setVerticesData(BABYLON.VertexBuffer.NormalKind, normals, true);

		mesh.markAsDirtyAll();

		glo.curves.paths = glo.ribbon.getPaths();
		glo.lines = glo.curves.paths;
		makeLineSystem();
	}
}

function blendPos(x, y, z, variable, val, coeff = 0.01){
	val*=coeff*glo.params.blender.force;
	if(glo.params.blender[variable].x || glo.params.blender[variable].y || glo.params.blender[variable].z){
		var {x, y, z} = rotateByBabylonMatrix({x, y, z}, val * glo.params.blender[variable].x, val * glo.params.blender[variable].y, val * glo.params.blender[variable].z);
	}

	return {x, y, z};
}

function blendPosAll(x, y, z, u, v, O, cosu, cosv){
	var {x, y, z} = blendPos(x, y, z, 'u', u);
	var {x, y, z} = blendPos(x, y, z, 'v', v);
	var {x, y, z} = blendPos(x, y, z, 'O', O, 0.1);
	var {x, y, z} = blendPos(x, y, z, 'cu', cosu, 0.1);
	var {x, y, z} = blendPos(x, y, z, 'cv', cosv, 0.1);

	return {x, y, z};
}

function invPos(x, y, z){
	const invpos = glo.params.invPos;

	if(invpos.x || invpos.y || invpos.z){
		x = !invpos.x ? x : -x;
		y = !invpos.y ? y : -y;
		z = !invpos.z ? z : -z;
	}

	return {x, y, z};
}

function invPosIf(x, y, z){
	if(!glo.invPosIf){ return {x, y, z}; }

	const invposif = glo.invPosIf;
	switch(invposif){
		case 'xy': x = y < 0 ? -x : x; break;
		case 'yx': y = x < 0 ? -y : y; break;
		case 'xz': x = z < 0 ? -x : x; break;
		case 'zx': z = x < 0 ? -z : z; break;
		case 'yz': y = z < 0 ? -y : y; break;
		case 'zy': z = y < 0 ? -z : z; break;
	}

	return {x, y, z};
}

function permutSign(x, y, z){
	if(!glo.permutSign){ return {x, y, z}; }

	const permutsign = glo.permutSign;

	let xTmp = x, yTmp = y, zTmp = z;
	if(permutsign == 'xy'){
		xTmp = y;
	}
	else if(permutsign == 'xz'){
		xTmp = z;
	}
	else if(permutsign == 'yz'){
		yTmp = z;
	}

	return {x: xTmp, y: yTmp, z: zTmp};
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

function rotateByBabylonMatrix(pos, alpha, beta, theta){
	if(alpha || beta || theta){
		if(alpha == Infinity || alpha == -Infinity || isNaN(alpha)){ alpha = 0; }
		if(beta == Infinity  || beta == -Infinity  || isNaN(beta)){  beta  = 0; }
		if(theta == Infinity || theta == -Infinity || isNaN(theta)){ theta = 0; }
		let rotationMatrix  = BABYLON.Matrix.RotationYawPitchRoll(beta, alpha, theta);
		pos                 = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(pos.x, pos.y, pos.z), rotationMatrix);
	}
	return pos;
}

function rotateOnCenterByBabylonMatrix(pos, alpha, beta, theta, center) {
    if (alpha || beta || theta) {
        if (alpha == Infinity || alpha == -Infinity || isNaN(alpha)) { alpha = 0; }
        if (beta == Infinity || beta == -Infinity || isNaN(beta)) { beta = 0; }
        if (theta == Infinity || theta == -Infinity || isNaN(theta)) { theta = 0; }

		pos = pos.length !== undefined ? pos : new BABYLON.Vector3(pos.x, pos.y, pos.z);
        
        // Définir le centre de rotation
        center = center || new BABYLON.Vector3(0, 0, 0);

        // Convertir la position en relation avec le centre de rotation
        let relativePos = pos.subtract(center);

        // Créer la matrice de rotation
        let rotationMatrix = BABYLON.Matrix.RotationYawPitchRoll(beta, alpha, theta);

        // Appliquer la rotation à la position relative
        let rotatedRelativePos = BABYLON.Vector3.TransformCoordinates(relativePos, rotationMatrix);

        // Revenir aux coordonnées absolues
        pos = rotatedRelativePos.add(center);
    }
    return pos;
}

function rotateByQuaternion(x, y, z, w, r, firstPoint = glo.firstPoint){
	if(!glo.params.quaternionByRotR){ return rotateByQuaternionWithNoRotR(x, y, z, w, r, firstPoint); }
	else{ return rotateByQuaternionWithRotR(x, y, z, w, r, firstPoint); }
}

function rotateByQuaternionWithNoRotR(x, y, z, w, r, firstPoint = glo.firstPoint){
	let axis = new BABYLON.Vector3(x, y, z);

	return BABYLON.Quaternion.RotationAxis(axis.normalize(), w)
							 .multiply(new BABYLON.Quaternion(firstPoint.x * r, firstPoint.y * r, firstPoint.z * r, 0))
							 .multiply(BABYLON.Quaternion.RotationAxis(axis.normalize(), w).conjugate());
}

function rotateByQuaternionWithRotR(x, y, z, w, r, firstPoint = glo.firstPoint) {
    // Calculer l'axe de rotation
    let axis = new BABYLON.Vector3(x, y, z).normalize();

    // Calculer l'azimut (angle dans le plan XY par rapport à l'axe X)
    let azimuth = Math.atan2(axis.y, axis.x);

    // Calculer l'élévation (angle par rapport au plan XY)
    let elevation = Math.asin(axis.z);

    // Calculer le quaternion pour l'azimut (rotation autour de l'axe Y)
    let azimuthQuat = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, azimuth);

    // Calculer le quaternion pour l'élévation (rotation autour de l'axe X)
    let elevationQuat = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.X, elevation);

    // Convertir les quaternions en matrices de transformation
    let azimuthMatrix = new BABYLON.Matrix();
    azimuthQuat.toRotationMatrix(azimuthMatrix);

    let elevationMatrix = new BABYLON.Matrix();
    elevationQuat.toRotationMatrix(elevationMatrix);

    // Appliquer la rotation d'azimut et d'élévation à firstPoint via matrices
    let rotatedPoint = BABYLON.Vector3.TransformCoordinates(firstPoint, azimuthMatrix);
    rotatedPoint = BABYLON.Vector3.TransformCoordinates(rotatedPoint, elevationMatrix);

    // Appliquer la rotation finale avec l'axe donné et l'angle w
    let rotationQuat = BABYLON.Quaternion.RotationAxis(axis, w);
    let finalRotation = rotationQuat
                        .multiply(new BABYLON.Quaternion(rotatedPoint.x * r, rotatedPoint.y * r, rotatedPoint.z * r, 0))
                        .multiply(rotationQuat.conjugate());

    return finalRotation;
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
		const speed = glo.rotate_speed;
		switch(glo.rotateType.current){
			case 'alpha':
				glo.camera.alpha += speed;
			break;
			case 'beta':
				glo.camera.beta += speed;
			break;
			case 'teta':
				glo.camera.alpha += speed;
				glo.camera.beta += speed;
			break;
		}
	}
}

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
	obj.e 	   = Math.exp;
	obj.hypot  = Math.hypot;
	obj.h 	   = Math.hypot;
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

	obj.b = function(val){
		if(val > 0){ return val < 1 ? val + 1 : val; }
		else{ return val > -1 ? val - 1 : val; }
	};

	obj.pc = function(val, p){
		if(p%2==0 || p<1){ return val < 0 ? (abs(val)**p) * -1 : val**p; }
		return val**p;
	};

	obj.sc = function(val, valSign){
		return Math.sign(valSign) * Math.abs(val);
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

	obj.sp = function(n, div = 1){
		const m = Math.abs(n);
		return Math.sign(n) * ((m*(m+1)) / (2*div));
	};
}
addCommonTools(this);

function morphMesh(pathsToMorph = glo.ribbon.getPaths(), coeff = 0.5, f = {
	x: "cucv",
	y: "sucv",
	z: "sv",
	alpha: "",
	beta: "",
}, f2 = {
	x: "",
	y: "",
	z: "",
	alpha: "",
	beta: "",
	theta: "",
})
{	
	const curvesForMorph = new Curves({
		u: {min: -glo.params.u, max: glo.params.u, nb_steps: glo.params.steps_u, },
		v: {min: -glo.params.v, max: glo.params.v, nb_steps: glo.params.steps_v, },
	}, f, f2, false);
	const pathsForMorph  = curvesForMorph.paths;

	glo.curves.paths = [];
	pathsToMorph.forEach((pathToMorph, i) => {
		glo.curves.paths[i] = [];
		pathToMorph.forEach((vectToMorph, j) => {
			const vectForMorph = pathsForMorph[i][j];

			const vectMorphed = new BABYLON.Vector3(vectForMorph.x + ((vectForMorph.x - vectToMorph.x) * coeff), 
			                                        vectForMorph.y + ((vectForMorph.y - vectToMorph.y) * coeff),
													vectForMorph.z + ((vectForMorph.z - vectToMorph.z) * coeff));

			glo.curves.paths[i].push(vectMorphed);

		});
	});

	make_ribbon();
}

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

function makeLineStep(vects){
	let line = BABYLON.MeshBuilder.CreateLines("par", {points: vects, updatable: false}, glo.scene);
	line.color = 'red';
	line.alpha = 1;
	line.visibility = 1;
	glo.linesStep.push(line);
}

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

	var d = 1, k = 1, p = 1, t = 1;

	var A = glo.params.A; var B = glo.params.B; var C = glo.params.C; var D = glo.params.D; var E = glo.params.E; var F = glo.params.F; var G = glo.params.G; var H = glo.params.H;
	var I = glo.params.I; var J = glo.params.J; var K = glo.params.K; var L = glo.params.L; var M = glo.params.M;

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

function reg(f, dim_one) {
    for (var prop in f) {
        if (f && f[prop] && f[prop][0] && f[prop][0] == "'") {
            f[prop] = "0";
        } else if(f && f[prop]) {
            f[prop] = f[prop].toString();
            f[prop] = f[prop].replace(/\s/g, "");
            for (let i = 0; i < glo.regs.length; i++) {
                if (glo.regs[i].condition && dim_one) {
                    f[prop] = f[prop].replace(glo.regs[i].exp, glo.regs[i].upd);
                } else if (!glo.regs[i].condition) {
                    f[prop] = f[prop].replace(glo.regs[i].exp, glo.regs[i].upd);
                }
            }
            if (dim_one) {
                f[prop] = f[prop].replace(/v/g, "u");
            }
        }
    }
    return f;
}

function getPathsInfos(){
	const coeffSym = countSyms();
	glo.pathsInfos = {u: (glo.params.steps_u + 1) * coeffSym, v: glo.params.steps_v + 1};
}

function countSyms(){
	return (glo.params.symmetrizeX ? glo.params.symmetrizeX : 1) *
	(glo.params.symmetrizeY ? glo.params.symmetrizeY : 1) *
	(glo.params.symmetrizeZ ? glo.params.symmetrizeZ : 1);
}
 
async function whellSwitchForm(){
	var formSelect = glo.formes.getFormSelect();
	if(formSelect){
	  var numFormSelect = formSelect.num;
	  var numFormSelectInCoordType = formSelect.numFormInCoorType;
		var formsLengthInCoordType = glo.formes.getNbFormsInThisCoordtype();
		var numFirstFormInCoorType = glo.formes.getNumFirstFormInCoordType();
		var numLastFormInCoorType  = glo.formes.getNumLastFormInCoordType();
		if(glo.whellSwitchFormDown){
			var numFormToSelect = numFirstFormInCoorType;
			if(numFormSelectInCoordType < formsLengthInCoordType - 1){ numFormToSelect = numFormSelect + 1; }
		}
		else{
			var numFormToSelect = numLastFormInCoorType;
			if(numFormSelectInCoordType > 0){ numFormToSelect = numFormSelect - 1; }
		}
		await glo.formes.setFormSelectByNum(numFormToSelect);

		var formSelected = glo.formes.getFormSelect();
		var nameRadioFormToSelect = "Radio-" + formSelected.form.text;
		glo.radios_formes.setCheckByName(nameRadioFormToSelect);
	}
	else{
		await glo.formes.setFormSelectByNum(glo.formes.getNumFirstFormInCoordType());

		var formSelected = glo.formes.getFormSelect();
		var nameRadioFormToSelect = "Radio-" + formSelected.form.text;
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

async function genInTwoWays(gen, varToStoreValGen, normalSens = true){
	let newOrient = '';

	if(normalSens){ newOrient = gen.next().value; }
	else{
		const currentOrient = glo[varToStoreValGen];
		
		while(gen.next().value !== currentOrient){
			newOrient = glo[varToStoreValGen];
		}
		glo[varToStoreValGen] = newOrient;

		while(gen.next().value !== newOrient){}
	}
}

function switchCoords(normalSens = true){
	genInTwoWays(glo.coordinatesType, 'coordsType', normalSens);

	switchDrawCoordsType();
	add_radios();

	glo.formesSuit = false;
}

async function switchFractalOrient(normalSens = true){
	genInTwoWays(glo.fractalizeOrients, 'fractalizeOrient', normalSens);

	const newOrient = glo.fractalizeOrient;

	const orient = newOrient ? `Rot ${newOrient.x ? 'X' : ''}${newOrient.y ? 'Y' : ''}${newOrient.z ? 'Z' : ''}` : 'No Rot';

	glo.allControls.getByName("fractalizeRotActive").textBlock.text = orient;
    await remakeRibbon('fractalize');
}

function switchSymmetrizeOrder(normalSens = true){
	genInTwoWays(glo.symmetrizeOrders, 'symmetrizeOrder', normalSens);

	glo.allControls.getByName('symmetrizeOrder').textBlock.text = "Symmetrize order : " + glo.symmetrizeOrder.toUpperCase();

	remakeRibbon();
}

function switchRightPanel(normalSens = true){
	genInTwoWays(glo.switchGuiSelect, 'guiSelect', normalSens);

	toggleRightPanels(glo.guiSelect);
}

function toggleRightPanels(rightPanelToShowClass, toShow = true){
	glo.rightPanelsClasses
		.filter(rightPanelClass => toShow ? (rightPanelClass !== rightPanelToShowClass) : (1 === 1))
		.forEach(rightPanelClass => toggleGuiControlsByClass(false, rightPanelClass));
	if(toShow){ toggleGuiControlsByClass(true, rightPanelToShowClass); }
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

   function makeTextPlane(text, color, size_plane, axis, isOrtho) {
		var plane = new BABYLON.Mesh.CreatePlane("TextPlane", size_plane, glo.scene, true);
		var label_size = 10;
		if (size_plane < 1) { label_size = 10; }

		text = text.toFixed(1).toString();
		if (text[text.length - 1] == "0") { text = text.substring(0, text.length - 2); }

		plane.visibility = 0;
		plane.isPickable = true; // Rend le texte cliquable
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

		// Stockons `ind` et `axis` comme propriétés du plane directement
		plane.metadata = { ind: parseInt(text), axis: axis, isOrtho: isOrtho, type: 'plane' };

		// Ajoutons l'événement de clic
		plane.actionManager = new BABYLON.ActionManager(glo.scene);
		plane.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
			BABYLON.ActionManager.OnPickTrigger, function(evt) {
				// Récupérons les valeurs directement depuis le plane cliqué
				var clickedPlane = evt.meshUnderPointer;
				var clickedInd   = clickedPlane.metadata.ind;
				var clickedAxis  = clickedPlane.metadata.axis;

				// Vérifions que les valeurs sont correctes
				console.log("Clicked:", clickedInd, clickedAxis);

				// Appelons la fonction pour changer la couleur de la ligne
				changeLineColor(clickedInd, clickedAxis, isOrtho);
			}
		));

		glo.labels_grid.push(label);
		glo.planes_grid.push(plane);
		glo.controls_grid.push(label, plane);
		return plane;
	}

	function changeLineColor(ind, axis, isOrtho) {
		console.log("Changing line color for:", ind, axis, isOrtho);
		if(isOrtho){
			switch(axis){
				case 'Z': axis = 'Y'; break;
				case 'Y': axis = 'Z'; break;
			}
		}

		console.log("Changing line color for:", ind, axis, isOrtho);
		const name = `grid${axis}`;
		const lines = glo[name].filter(line => {
			return line.points[0][axis.toLowerCase()] === ind;
		});

		const lineInd = !isOrtho ? 0 : 1;

		lines[lineInd].metadata = lines[lineInd].metadata ? lines[lineInd].metadata : {isSelected: false};
		lines[lineInd].metadata.isSelected = !lines[lineInd].metadata.isSelected;
		lines[lineInd].color = lines[lineInd].metadata.isSelected ? BABYLON.Color3.Purple() : BABYLON.Color3.White();
	}

   function makeLine(size, axis, ind){
		const name = `grid${axis}`;
		let startPoint      = {x: 0, y: 0, z: 0}, endPoint      = {x: 0, y: 0, z: 0};
		let startPointOrtho = {x: 0, y: 0, z: 0}, endPointOrtho = {x: 0, y: 0, z: 0};
		let posChar         = {x: 0, y: 0, z: 0}, posCharOrtho  = {x: 0, y: 0, z: 0};

		switch(axis){
			case 'X': 
				startPoint      = {x: ind, y: -size, z: 0};
				endPoint        = {x: ind, y: size, z: 0};
				startPointOrtho = {x: -size, y: ind, z: 0};
				endPointOrtho   = {x: size, y: ind, z: 0};
				posChar         = {x: ind, y: size * 1.025, z: 0};
				posCharOrtho    = {x: size * 1.025, y: ind, z: 0};
			break;
			case 'Y': 
				startPoint      = {x: 0, y: ind, z: -size};
				endPoint   	    = {x: 0, y: ind, z: size};
				startPointOrtho = {x: 0, y: -size, z: ind};
				endPointOrtho   = {x: 0, y: size, z: ind};
				posChar    		= {x: 0, y: ind, z: size * 1.025};
				posCharOrtho    = {x: ind, y: 0, z: size * 1.025};
			break;
			case 'Z': 
				startPoint 		= {x: -size, y: 0, z: ind};
				endPoint   		= {x: size, y: 0, z: ind};
				startPointOrtho = {x: ind, y: 0, z: -size};
				endPointOrtho   = {x: ind, y: 0, z: size};
				posChar    		= {x: size, y: 0, z: ind * 1.025};
				posCharOrtho    = {x: 0, y: size, z: ind * 1.025};
			break;
		}

		var points = [
				new BABYLON.Vector3(startPoint.x, startPoint.y, startPoint.z),
				new BABYLON.Vector3(endPoint.x, endPoint.y, endPoint.z),
		];
		var pointsOrtho = [
				new BABYLON.Vector3(startPointOrtho.x, startPointOrtho.y, startPointOrtho.z),
				new BABYLON.Vector3(endPointOrtho.x, endPointOrtho.y, endPointOrtho.z),
		];

		function designLine(line){
			line.points = points;
			line.color = glo.color_line_grid;
			line.alpha = 0.5;
			line.visibility = visibility;
			line.isPickable = false;
		}

		let line = BABYLON.Mesh.CreateLines(name, points, glo.scene);
		designLine(line);

		var pivot_translation_line = line.position.subtract(BABYLON.Vector3.Zero());
		line.setPivotMatrix(BABYLON.Matrix.Translation(pivot_translation_line.x, pivot_translation_line.y, pivot_translation_line.z));

		function makeAxisChar(posChar, isOrtho){
			var axisChar = makeTextPlane(ind, "black", size / 20, axis, isOrtho);
			axisChar.position = new BABYLON.Vector3(posChar.x, posChar.y, posChar.z);
			var pivot_translation_axisChar = axisChar.position.subtract(BABYLON.Vector3.Zero());
			axisChar.setPivotMatrix(BABYLON.Matrix.Translation(pivot_translation_axisChar.x, pivot_translation_axisChar.y, pivot_translation_axisChar.z));
		}

		makeAxisChar(posChar, false);
		makeAxisChar(posCharOrtho, true);

		glo[name].push(line);
		let lineOrtho = BABYLON.Mesh.CreateLines(name, pointsOrtho, glo.scene);
		designLine(lineOrtho);
		glo[name].push(lineOrtho);
		glo.controls_grid.push(line, lineOrtho);
   }

	var step = axis_size/number;
	glo.step = step;
	glo.gridX = []; glo.gridY = []; glo.gridZ = [];
	var start = step;
	if(glo.negatif){ start = -axis_size; }
	for(var i = start; i <= axis_size; i+=step){
		makeLine(size, "X", i);
		makeLine(size, "Y", i);
		makeLine(size, "Z", i);
	}
};

function viewOnX(orient = 1, alpha = 0, beta = PI/2){
	glo.camera.alpha = alpha;
	glo.camera.beta  = beta;

	if(orient == 1){
		glo.camera.upVector = new BABYLON.Vector3(0,1,0);
	}
	else{
		glo.camera.upVector = new BABYLON.Vector3(0,0,1);
	}
}
function viewOnY(orient = 1, alpha = -PI, beta = PI/2){
	glo.camera.beta = beta;

	if(orient == 1){
		glo.camera.alpha = alpha/2;
		glo.camera.upVector = new BABYLON.Vector3(0,0,1);
	}
	else{
		glo.camera.alpha = alpha;
		glo.camera.upVector = new BABYLON.Vector3(1,0,0);
	}
}
function viewOnZ(orient = 1, alpha = PI/2, beta = PI/2){
	glo.camera.alpha = alpha;
	glo.camera.beta  = beta;
	if(orient == 1){
		glo.camera.upVector = new BABYLON.Vector3(1,0,0);
	}
	else{
		glo.camera.upVector = new BABYLON.Vector3(0,1,0);
	}
}

function viewOnAxis(options = {axis: "X", direction: -1, alpha: PI/4, beta: -PI/4, distance: 60}){
	if(!options.axis){ options.axis = "X"; }
	if(!options.direction){ options.direction = -1; }
	if(!options.alpha && options.alpha !== 0){ options.alpha = PI/4; }
	if(!options.beta && options.beta !== 0){ options.beta = -PI/4; }
	if(!options.distance && options.distance !== 0){ options.distance = 60; }

	const extendSize = glo.ribbon.getBoundingInfo().boundingBox.extendSize;
	const coeff      = h(extendSize.x, extendSize.y, extendSize.z);

	options.distance = 3 * coeff * glo.ribbon.gridScaleValue;

	switch(options.axis){
		case "X":{
			viewOnX(options.direction, options.alpha, PI/2 + options.beta);
			break;
		}
		case "Y":{
			viewOnY(options.direction, -PI + options.alpha, PI/2 + options.beta);
			break;
		}
		case "Z":{
			viewOnZ(options.direction, PI/2 + options.alpha, PI/2 + options.beta);
			break;
		}
	}
	glo.camera.radius = options.distance;
}

function raz_meshes(){
	glo.ribbon.dispose();
	glo.ribbon = null;
	glo.is_ribbon = false;
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
		glo.controls_grid.forEach(ctrl => {
			if(!ctrl.metadata || !ctrl.metadata.type || ctrl.metadata.type !== 'plane'){
				ctrl[ctrl.name === 'grid_label' ? 'isVisible': 'visibility'] = 1; 
			}
		});
		if(!glo.axis_visible){
			switch_axis(true);
			glo.axis_visible = true;
		}
	}
	else{
		glo.controls_grid.forEach(ctrl => { ctrl[ctrl.name === 'grid_label' ? 'isVisible': 'visibility'] = 0; } );
		
		switch_axis(false);
		glo.axis_visible = false;
	}
}

function gridToCenterMesh(mesh = glo.ribbon){
	const centerWorld = glo.ribbon.getBoundingInfo().boundingBox.centerWorld;
	glo.controls_grid.forEach(ctrl => {
		if(ctrl.position){
			ctrl.position.x += centerWorld.x;
			ctrl.position.y += centerWorld.y;
			ctrl.position.z += centerWorld.z;
		}
	});

	glo.planes_axis.forEach(plane => {
		plane.position.x += centerWorld.x; plane.position.y += centerWorld.y; plane.position.z += centerWorld.z;
	});

	glo.axisX.position.x += centerWorld.x;
	glo.axisX.position.y += centerWorld.y;
	glo.axisX.position.z += centerWorld.z;
	glo.axisY.position.x += centerWorld.x;
	glo.axisY.position.y += centerWorld.y;
	glo.axisY.position.z += centerWorld.z;
	glo.axisZ.position.x += centerWorld.x;
	glo.axisZ.position.y += centerWorld.y;
	glo.axisZ.position.z += centerWorld.z;
}

function gridToOrigin(){
	glo.controls_grid.forEach(ctrl => {
		if(ctrl.position){
			ctrl.position.x = 0;
			ctrl.position.y = 0;
			ctrl.position.z = 0;
		}
	});

	glo.planes_axis.forEach(plane => {
		plane.position.x = 0; plane.position.y = 0; plane.position.z = 0;
	});

	glo.axisX.position.x = 0;
	glo.axisX.position.y = 0;
	glo.axisX.position.z = 0;
	glo.axisY.position.x = 0;
	glo.axisY.position.y = 0;
	glo.axisY.position.z = 0;
	glo.axisZ.position.x = 0;
	glo.axisZ.position.y = 0;
	glo.axisZ.position.z = 0;
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
	if(glo.curves.lineSystemDouble){ glo.curves.lineSystemDouble.visibility = visibility; }
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

async function invElemInInput(toInv_1, toInv_2, makeCurve = true){
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

	if(toInv_1 === 'u' && toInv_2 === 'v'){
		let remakeCurve = true;
		if(glo.allControls.getByName('stepU').value !== glo.allControls.getByName('stepV').value){
			const stepU = glo.allControls.getByName('stepU').value; 
			glo.allControls.getByName('stepU').value = glo.allControls.getByName('stepV').value;
			glo.allControls.getByName('stepV').value = stepU;
			remakeCurve = false;
		}
		if(glo.allControls.getByName('u').value !== glo.allControls.getByName('v').value){
			const U = glo.allControls.getByName('u').value; 
			glo.allControls.getByName('u').value = glo.allControls.getByName('v').value;
			glo.allControls.getByName('v').value = U;
			remakeCurve = false;
		}
		if(remakeCurve){
			await remakeRibbon();
		}
	}
	else if(makeCurve){
		await remakeRibbon();
	}
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

function initExportModal(){
	var elems = document.querySelectorAll('#exportModal');
    M.Modal.init(elems, {
        onOpenEnd: function() {
            glo.modalOpen = true;
            document.querySelector('#weightToDownload').textContent = glo.ribbon.weightToDownload();
			$('#filename').focus();
        },
        onCloseEnd: function() {
			glo.modalOpen = false;
            if (glo.fullScreen) {
                glo.engine.switchFullscreen();
            }
        },
    });
}

function stopPropagationEvent(event) {
    event.stopPropagation();
}

function exportModal(){
	glo.modalOpen = true;
	if(glo.fullScreen){ glo.engine.switchFullscreen(); }
	var instance = M.Modal.getInstance(document.querySelector('#exportModal'));
    instance.open();
}
function importModal(){
	glo.modalOpen = true;
	event.stopPropagation();
	event.preventDefault();
	if(glo.fullScreen){ glo.engine.switchFullscreen(); }
	$('#importModal').modal('open', {
		onCloseEnd: function() {
			if(glo.fullScreen){ glo.engine.switchFullscreen(); }
			glo.modalOpen = false;
		},
	});
}

function download_JSON_mesh(event){
	$('#importModal').modal('close');
	var file_to_read = document.getElementById("jsonFileUpload").files[0];

	const fileName      = file_to_read.name;
	const fileExtension = fileName.slice(fileName.lastIndexOf('.') + 1); 

	var fileread = new FileReader();
	fileread.onload = function(e) {
		var fileContent = e.target.result;
		$("#jsonFileUpload").val("");

		switch(fileExtension){
			case 'json':
				var contentJsonFile = JSON.parse(fileContent);
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
			break;
			case 'obj':
				ribbonDispose();
				glo.curves.lineSystem.dispose();

				var blob = new Blob([fileContent], { type: "text/plain" });
				var url  = URL.createObjectURL(blob);
				var dataUrl = e.target.result;
				var base64String = dataUrl.split(',')[1];
            	var dataString = base64String;
				BABYLON.SceneLoader.ImportMesh("", "data:;base64,", dataString, glo.scene, function (meshes) {
					// Les meshs sont chargés
					meshes.forEach((mesh, i) => {
						if(!i){
							console.log(mesh.name);
						}
					});

					let meshImport = meshes[1];

					glo.ribbon = meshImport;
					giveMaterialToMesh();

					glo.curves.path = turnVerticesDatasToPaths();
					glo.curves.lineSystem.dispose();

				}, null, function (scene, message, exception) {
					console.error(message, exception);
				}, ".obj");

			break;
		}
	};

	switch(fileExtension){
		case 'json':
			fileread.readAsText(file_to_read);
		break;
		case 'obj':
			fileread.readAsDataURL(file_to_read);
		break;
	}
}

var objectUrl;
async function exportMesh(exportFormat) {
    if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
    }

    await glo.ribbon.bakeCurrentTransformIntoVertices();

    let strMesh;
    if (exportFormat !== "json") {
        if (exportFormat === "babylon") {
            strMesh = JSON.stringify(BABYLON.SceneSerializer.SerializeMesh(glo.ribbon));
        } else if (exportFormat === "obj") {
            if (!glo.lineSystem) {
                strMesh = BABYLON.OBJExport.OBJ([glo.ribbon]);
            } else {
                let meshesToExport = [];
                glo.lines.forEach(line => {
                    if (Array.isArray(line) && line.length > 0 && line.every(point => point instanceof BABYLON.Vector3)) {
                        let tube = BABYLON.MeshBuilder.CreateTube("tube", { path: line, radius: 0.1 }, glo.scene);
                        if (tube) {
                            meshesToExport.push(tube);
                        } else {
                            console.log("Tube creation failed for line:", line);
                        }
                    }
                });

                if (meshesToExport.length > 0) {
                    let meshToExport = await BABYLON.Mesh.MergeMeshes(meshesToExport, true, true);
                    if (meshToExport) {
                        strMesh = BABYLON.OBJExport.OBJ([meshToExport]);
                        glo.ribbon = await BABYLON.Mesh.MergeMeshes([glo.ribbon, meshToExport], true, true);
                    } else {
                        console.log("Mesh fusion failed");
                    }
                } else {
                    console.log("No meshes to export");
                }
            }
        }

        var filename = $("#filename").val();
        if (filename.toLowerCase().lastIndexOf("." + exportFormat) !== filename.length - exportFormat.length || filename.length < exportFormat.length + 1) {
            filename += "." + exportFormat;
        }
    } else {
        var filename = $("#filename").val();
        var exportFormat = 'json';
        if (filename.toLowerCase().lastIndexOf("." + exportFormat) !== filename.length - exportFormat.length || filename.length < exportFormat.length + 1) {
            filename += "." + exportFormat;
        }

        glo.params.coordsType = glo.coordsType;
        var objForm = glo.formes.getFormSelect();
        var form = !objForm ? "" : objForm.form.text;
        glo.params.formName = form;
        strMesh = JSON.stringify(glo.params);
    }

    // Créer un blob et générer l'URL de téléchargement
    var blob = new Blob([strMesh], { type: "octet/stream" });
    objectUrl = (window.webkitURL || window.URL).createObjectURL(blob);

    // Mettre à jour le lien de téléchargement caché
    $("#downloadLink").attr("href", objectUrl);
    $("#downloadLink").attr("download", filename);

    // Déclencher le téléchargement en cliquant sur le lien caché
    $("#downloadLink")[0].click();

    // Fermer le modal
    $('#exportModal').modal('close');

    return false;
}


async function exportMeshToSTL(mesh){
	let stlString = BABYLON.STLExport.CreateSTL([mesh], true, true);

	let blob = new Blob([stlString], { type: 'text/plain' });
	let link = document.createElement('a');
	link.href = URL.createObjectURL(blob);
	link.download = 'export.stl';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

async function meshWithTubes(){
	if(glo.meshWithTubes || glo.onlyTubes){
		if(glo.onlyTubes){ ribbonDispose(); }
		let meshesTubes = [];
		glo.lines.forEach(line => {
			if (Array.isArray(line) && line.length > 0 && line.every(point => point instanceof BABYLON.Vector3)) {
				let tube = BABYLON.MeshBuilder.CreateTube("tube", {path: line, radius: glo.tubes.radius}, glo.scene);
				if (tube) {
					meshesTubes.push(tube);
				} else {
					console.log("Tube creation failed for line:", line);
				}
			}
		});
		glo.dblLines.forEach(line => {
			if (Array.isArray(line) && line.length > 0 && line.every(point => point instanceof BABYLON.Vector3)) {
				let tube = BABYLON.MeshBuilder.CreateTube("tube", {path: line, radius: glo.tubes.radius}, glo.scene);
				if (tube) {
					meshesTubes.push(tube);
				} else {
					console.log("Tube creation failed for line:", line);
				}
			}
		});

		if (meshesTubes.length > 0) {
			glo.meshTubes = await BABYLON.Mesh.MergeMeshes(meshesTubes, true, true);
			if (glo.meshTubes) {
				glo.ribbon = !glo.onlyTubes ? await BABYLON.Mesh.MergeMeshes([glo.ribbon, glo.meshTubes], true, true) : glo.meshTubes;
				//glo.curves.paths = glo.ribbon.getPaths();
				if(glo.onlyTubes){ 
					var material = new BABYLON.StandardMaterial("myMaterial", glo.scene);
	    			material.backFaceCulling = false;
					glo.ribbon.material = material;
					glo.ribbon.material.emissiveColor = glo.emissiveColor;
					glo.ribbon.material.diffuseColor = glo.diffuseColor;
					glo.ribbon.material.alphaMode = BABYLON.Engine.ALPHA_COMBINE;
					glo.ribbon.material.alpha = glo.ribbon_alpha;
					glo.ribbon.alphaIndex = 998;
					glo.ribbon.material.wireframe = glo.wireframe;
				 }
			} else {
				console.log("Mesh fusion failed");
			}
		} else {
			console.log("No meshes to export");
		}
	}
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

function switchDrawCoordsType(update_slider_uv = true){
	if(update_slider_uv){ change_slider_uv(); }
	switch (glo.coordsType) {
		case 'spheric':
			changeHeaderText('header_inputX', 'R');
			changeHeaderText('header_inputY', 'Rot Z');
			changeHeaderText('header_inputZ', 'Rot Y');
			changeHeaderText('header_inputAlpha', 'R (Q)');
			changeHeaderText('header_inputBeta', 'W');

			glo.allControls.getByName("but_coord").textBlock.text = "SPHE"; 
			break;
		case 'quaternion':
			changeHeaderText('header_inputX', 'R');
			changeHeaderText('header_inputY', 'Axis X');
			changeHeaderText('header_inputZ', 'Axis Y');
			changeHeaderText('header_inputAlpha', 'Axis Z');
			changeHeaderText('header_inputBeta', 'W');

			glo.allControls.getByName("but_coord").textBlock.text = "QUAC"; 
			break;
		case 'quaternionRotAxis':
			changeHeaderText('header_inputX', 'R');
			changeHeaderText('header_inputY', 'Axis Rot Y');
			changeHeaderText('header_inputZ', 'Axis Rot Z');
			changeHeaderText('header_inputAlpha', 'W');
			changeHeaderText('header_inputBeta', 'ROT Y');

			glo.allControls.getByName("but_coord").textBlock.text = "QUAR"; 
			break;
		case 'cylindrical':
			changeHeaderText('header_inputX', 'R');
			changeHeaderText('header_inputY', 'Rot Z');
			changeHeaderText('header_inputZ', 'Z');
			changeHeaderText('header_inputAlpha', 'R (Q)');
			changeHeaderText('header_inputBeta', 'W');

			glo.allControls.getByName("but_coord").textBlock.text = "CYL"; 
			break;
		case 'curvature':
			changeHeaderText('header_inputX', 'R');
			changeHeaderText('header_inputY', 'Alpha');
			changeHeaderText('header_inputZ', 'Beta');
			changeHeaderText('header_inputAlpha', 'R (Q)');
			changeHeaderText('header_inputBeta', 'W');

			glo.allControls.getByName("but_coord").textBlock.text = "CURV"; 
			break;
		case 'cartesian':
			changeHeaderText('header_inputX', 'X');
			changeHeaderText('header_inputY', 'Y');
			changeHeaderText('header_inputZ', 'Z');
			changeHeaderText('header_inputAlpha', 'R');
			changeHeaderText('header_inputBeta', 'W');

			glo.allControls.getByName("but_coord").textBlock.text = "CART"; 
			break;
	}
}

function changeHeaderText(headerName, newText){
	glo.allControls.haveThisClass("header").getByName(headerName).text = newText;
}

function resetEquationsParamSliders(){
	glo.allControls.haveThisClass('input').forEach(input => {
		input.text = '';
	});
	for(let prop in glo.params){
		if(prop.includes('text_input')){ glo.params[prop] = ''; }
		else if(prop.includes('symmetrize') && !prop.includes('symmetrizeAngle')){ glo.params[prop] = 0; }
	}
	glo.allControls.getByName('u').value = PI;
	glo.allControls.getByName('v').value = PI;
}

function change_slider_uv(){
	if(glo.coordsType == 'spheric'){ glo.slider_u.value += 0.0000002; }
	else if(glo.coordsType == 'cylindrical'){ glo.slider_u.value -= 0.0000001; }
	else{ glo.slider_u.value -= 0.0000001; }
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
	return sign(val) * Math.abs(val)**exp;
}

function cpowi(val, exp){
	return pow(Math.abs(val), exp);
}

function cpowh(...dists){
	let res = 0;
	dists.forEach(dist => {
		res += cpow(dist, 2);
	});
	return cpow(res, 0.5);
}

function µ(res, varForSign){
	return sign(varForSign) === sign(res) ? res : -res;
}

function firstInputToOthers(){
	const val = glo.input_x.text;

	glo.input_beta.text  = val;
	glo.input_alpha.text = val;
	glo.input_z.text 	 = val;
	glo.input_y.text 	 = val;

	glo.params.text_input_beta 	= val;
	glo.params.text_input_alpha = val;
	glo.params.text_input_z 	= val;
	glo.params.text_input_y 	= val;

	make_curves();
}

function cameraOnPos(pos){
	glo.camera.setTarget(new BABYLON.Vector3(pos.x, pos.y, pos.z));
	glo.camera.setPosition(new BABYLON.Vector3(pos.x, pos.y, pos.z));
}

function toggleDataTable(){
	dataTableBody.innerHTML = '';

	const coeff = (glo.params.symmetrizeX ? glo.params.symmetrizeX : 1) *
	              (glo.params.symmetrizeY ? glo.params.symmetrizeY : 1) * (glo.params.symmetrizeZ ? glo.params.symmetrizeZ : 1);


	let vertices = glo.ribbon.getVerticesData(BABYLON.VertexBuffer.PositionKind);

	const uStep   = (glo.params.u*2) / glo.params.steps_u;
	const vStep   = (glo.params.v*2) / glo.params.steps_v;

	const uFirst = -round(0.5 * uStep * glo.params.steps_u, 2);
	const vFirst = -round(0.5 * vStep * glo.params.steps_v, 2);

	const maxStepU = (glo.params.steps_u + 1 ) * coeff;

	const UV = isUV();

	const datas = [];
	let n       = 0;
	if(UV.isU && UV.isV){
		for(let stepU = 0; stepU < maxStepU; stepU++){
			const u = round(uFirst + (stepU*uStep), 2);
			for(let stepV = 0; stepV <= glo.params.steps_v; stepV++){
				const v = round(vFirst + (stepV*vStep), 2);
				const x = round(vertices[n*3], 2);
				const y = round(vertices[n*3 + 1], 2);
				const z = round(vertices[n*3 + 2], 2);

				datas.push([stepU, stepV, n, u, v, x, y, z]);
				n++;
			}
		}
	}
	else if(UV.isU){
		for(let stepU = 0; stepU < maxStepU; stepU++){
			const u = round(uFirst + (stepU*uStep), 2);
			const v = 'none';
			const x = round(vertices[n*3], 2);
			const y = round(vertices[n*3 + 1], 2);
			const z = round(vertices[n*3 + 2], 2);

			datas.push([stepU, n, 'none', u, v, x, y, z]);
			n++;
		}
	}
	else if(UV.isV){
		for(let stepV = 0; stepV <= glo.params.steps_v * coeff; stepV++){
			const u = 'none';
			const v = round(vFirst + (stepV*vStep), 2);
			const x = round(vertices[n*3], 2);
			const y = round(vertices[n*3 + 1], 2);
			const z = round(vertices[n*3 + 2], 2);

			datas.push(['none', n, stepV, u, v, x, y, z]);
			n++;
		}
	}
	else{
		datas.push([stepU, stepV, n, 'none', 'none', 'none', 'none', 'none']);
	}

	datas.forEach(datasTr => {
		let tr = document.createElement('tr');
		datasTr.forEach(dataTd => {
			let td 		= document.createElement('td');
			const tdTxt = document.createTextNode(dataTd);

			td.appendChild(tdTxt);
			tr.appendChild(td);
		});
		dataTableBody.appendChild(tr);
	});
	$('#dataModal').modal('open');
}

function initDataModal(){
	$('#dataModal').modal({
		onCloseEnd: function() {
			if(glo.sphereToShowVertex){ 
				glo.sphereToShowVertex.dispose(); 
				glo.sphereToShowVertex = null; 
			} 
		},
		onOpenEnd: function() {
			$('#dataModal').css('opacity', $('#dataModalOpacity').val());
		}
	 });
}

function round(val, pre){
	prePow = 10**pre;
	return Math.round(val * prePow, pre) / prePow;
}

function isUV(){
	let inputs = [glo.params.text_input_x, glo.params.text_input_y, glo.params.text_input_z,
		          glo.params.text_input_alpha, glo.params.text_input_beta, glo.params.text_input_suit_x, glo.params.text_input_suit_y,
				  glo.params.text_input_suit_z, glo.params.text_input_suit_alpha, glo.params.text_input_suit_beta];
	
	return {isU: inputs.some(input => input.includes('u') ), isV: inputs.some(input => input.includes('v') )};
}

function expanseRibbon(){
	const expansion = glo.params.expansion;

	glo.curves.paths.forEach((line, i) => {
		line.forEach((path, j) => {
			if(h(path.x, path.y, path.z) > ep/10000){
				let angleXY = getAzimuthElevationAngles(glo.curves.paths[i][j]);
				let dist    = 1 + 0.001*BABYLON.Vector3.Distance(path, BABYLON.Vector3.Zero())**-1;

				angleXY.x += glo.angleToUpdateRibbon.x;
				angleXY.y += glo.angleToUpdateRibbon.y;

				const dirXY = directionXY(angleXY, dist, expansion);

				glo.curves.paths[i][j].x += dirXY.x;
				glo.curves.paths[i][j].y += dirXY.y;
				glo.curves.paths[i][j].z += dirXY.z;
			}
		});
	});
}

function directionXY(angleXY, dist, positive = 1){
	return {
		x: Math.cos(angleXY.y) * Math.cos(angleXY.x) * positive * dist,
		y: Math.sin(angleXY.y) * positive * dist,
		z: Math.cos(angleXY.y) * Math.sin(angleXY.x) * positive * dist
	};
}

function updateRibbonByR(newPt, val){
	r = val;
	const angleXY = getAzimuthElevationAngles(newPt);
	const dirXY   = directionXY(angleXY, r);
	
	newPt = !glo.addSymmetry ? dirXY : {x: newPt.x + dirXY.x, y: newPt.y + dirXY.y, z: newPt.z + dirXY.z };

	return newPt;
}

function symmetrizeByR(pos, r){
	let inputSymREq = {fx: glo.input_sym_r.text};
	const goodR     = glo.input_sym_r.text ? test_equations(inputSymREq, glo.dim_one) : false;

	if(goodR){
		reg(inputSymREq, glo.dim_one);
		const angleXY = getAzimuthElevationAngles(pos);
		const dirXY   = directionXY(angleXY, r);
		
		pos = !glo.addSymmetry ? dirXY : {x: pos.x + dirXY.x, y: pos.y + dirXY.y, z: pos.z + dirXY.z };
	}

	return pos;
}

function concatFloat32Arrays(firstArray, secondArray) {
    let combined = new Float32Array(firstArray.length + secondArray.length);
    combined.set(firstArray);
    combined.set(secondArray, firstArray.length);
    return combined;
}

function distMaxBetween2ConsecutiveVertexs(){
	let indices   = glo.ribbon.getIndices();
	let positions = glo.curves.paths.flat();

	let distMax = 0;
	for(let i = 2; i < indices.length; i+=2){
		const distCurrBetweenVertexs = BABYLON.Vector3.Distance(positions[indices[i-1]], positions[indices[i-2]]);
		if(distMax < distCurrBetweenVertexs){ distMax = distCurrBetweenVertexs; }
	}

	return distMax;
}

function delIndices(indicesToDelete){
	let indices    = glo.ribbon.getIndices();
	let newIndices = [];
	indices.forEach((indice, i) => {
		if(!indicesToDelete.includes(i)){ newIndices.push(indice); }
	});
	glo.ribbon.reBuildVertexData(newIndices);
}

function createArrayOnRange(startRange, endRange){
	return Array.from({ length: endRange - startRange + 1 }, (_, i) => startRange + i);
}

function addVectors(...vectors){
	let vectorToReturn = {x: 0, y: 0, z: 0};

	vectors.forEach(vector => {
		vectorToReturn.x += vector.x;
		vectorToReturn.y += vector.y;
		vectorToReturn.z += vector.z;
	});

	return new BABYLON.Vector3(vectorToReturn.x, vectorToReturn.y, vectorToReturn.z);
}
function subVectors(...vectors){
	let vectorToReturn = {x: vectors[0].x, y: vectors[0].y, z: vectors[0].z};

	vectors.shift();

	vectors.forEach(vector => {
		vectorToReturn.x -= vector.x;
		vectorToReturn.y -= vector.y;
		vectorToReturn.z -= vector.z;
	});

	return new BABYLON.Vector3(vectorToReturn.x, vectorToReturn.y, vectorToReturn.z);
}

async function cutsRibbon(){
	glo.scene.clipPlane  = await new BABYLON.Plane(-glo.cutRibbon.x, 0, 0, 0);
	glo.scene.clipPlane2 = await new BABYLON.Plane(0, -glo.cutRibbon.y, 0, 0);
	glo.scene.clipPlane3 = await new BABYLON.Plane(0, 0, -glo.cutRibbon.z, 0);
}

function cutRibbonWithCSG(){
	var plane         = BABYLON.MeshBuilder.CreateBox("plane", {width: 50, height: 100, depth: 50}, glo.scene);
	var planeCSG      = BABYLON.CSG.FromMesh(plane);
	var ribbonCSG     = BABYLON.CSG.FromMesh(glo.ribbon);
	var subtractedCSG = ribbonCSG.subtract(planeCSG);

	// Convertir le résultat en maillage BabylonJS
	glo.ribbon = subtractedCSG.toMesh("cutRibbon", glo.ribbon.material, glo.scene);

	plane.dispose();
}

async function cutRibbon(axis, altitude = 0){
	let curvesPathsSave = [...glo.curves.paths];

	if(glo.curves.linesSystems){ glo.curves.linesSystems.forEach(lineSystem => { lineSystem.dispose(true); lineSystem = null; }); }

	let newCurves           = [];
	glo.curves.linesSystems = [];
	curvesPathsSave.forEach((line, i) => {
		line.forEach(path => {
			switch(axis){
				case 'X':
					if(path.x > altitude){ if(!newCurves[i]){newCurves[i] = [];} newCurves[i].push(path); }
				break;
				case 'Y':
					if(path.y > altitude){ if(!newCurves[i]){newCurves[i] = [];} newCurves[i].push(path); }
				break;
				case 'Z':
					if(path.z > altitude){ if(!newCurves[i]){newCurves[i] = [];} newCurves[i].push(path); }
				break;
			}
		});
	});

	let newCurvesGoodIndexes = [];
	newCurves.forEach(newCurve => {
		newCurvesGoodIndexes.push(newCurve);
	});

	ribbonDispose(false);
	const nameRibbon = "cutRibbon_" + glo.numRibbon;
	glo.numRibbon++;
	glo.ribbon = BABYLON.MeshBuilder.CreateRibbon(nameRibbon, {pathArray: newCurvesGoodIndexes, sideOrientation:1, updatable: true, }, glo.scene);
	giveMaterialToMesh();
	
	glo.curves.paths = newCurvesGoodIndexes;
	glo.lines        = glo.curves.paths;
}

function isVertexAtPos(positionToCheck, ribbon = glo.ribbon, tolerance = 0.001){
	let positions;
	if(!Array.isArray(ribbon)){ positions = ribbon.getVerticesData(BABYLON.VertexBuffer.PositionKind); }
	else if(ribbon.length){
		let ps = [];
		ribbon.forEach(rib => {
			ps.push(rib.getVerticesData(BABYLON.VertexBuffer.PositionKind));
		}); 
		positions = ps.flat();
	}

    // Vérifier si les positions existent
    if (!positions) return false;

    // Parcourir les positions des vertex par pas de 3 (x, y, z)
    for (var i = 0; i < positions.length; i += 3) {
        // Créer un vecteur pour la position actuelle du vertex
        var vertexPosition = new BABYLON.Vector3(positions[i], positions[i + 1], positions[i + 2]);

        // Vérifier si la position actuelle est proche de la position recherchée
        if (BABYLON.Vector3.Distance(vertexPosition, positionToCheck) <= tolerance) {
            return true; // Un vertex existe à cette position
        }
    }

    // Aucun vertex trouvé à la position donnée
    return false;
}

function distsBetweenVertexs(){
	const paths = turnVerticesDatasToPaths().flat();

	let distMax = 0, distMin = 31000, distMoy = 0, nbVertexs = 0;
	paths.forEach(path1 => {
		paths.forEach(path2 => {
			if(path1 !== path2){
				const dist = BABYLON.Vector3.Distance(path1, path2);
				if(dist > distMax){ distMax = dist; }
				else if(dist < distMin){ distMin = dist; }
				distMoy += dist;
				nbVertexs++;
			}
		});
	});

	distMoy /= nbVertexs;

	return {distMax, distMin, distMoy};
}

function makeLineSystem(){
	let paths = !glo.normalMode ? glo.curves.paths : glo.curves.pathsSecond;

	if(!paths){ paths = glo.curves.paths; }

	if(glo.curves.lineSystem){ glo.curves.lineSystem.dispose(true); delete glo.curves.lineSystem; }
	if(glo.curves.lineSystemDouble){ glo.curves.lineSystemDouble.dispose(true); delete glo.curves.lineSystemDouble; }

	glo.curves.lineSystem = BABYLON.MeshBuilder.CreateLineSystem("lineSystem", { lines: paths, }, glo.scene);
	glo.curves.lineSystem.color = glo.lineColor;
	glo.curves.lineSystem.alpha = glo.ribbon_alpha;
	glo.curves.lineSystem.alphaIndex = 999;
	glo.curves.lineSystem.visibility = glo.lines_visible;

	if(glo.params.doubleLineSystem){
		let paths    = !glo.normalMode ? reformatPaths() : reformatPaths(glo.curves.pathsSecond);
		glo.dblLines = paths;
		
		glo.curves.lineSystemDouble = BABYLON.MeshBuilder.CreateLineSystem("lineSystemDouble", { lines: paths, }, glo.scene);
		glo.curves.lineSystemDouble.color = glo.lineColor;
		glo.curves.lineSystemDouble.alpha = glo.ribbon_alpha;
		glo.curves.lineSystemDouble.alphaIndex = 999;
		glo.curves.lineSystemDouble.visibility = glo.lines_visible;
	}
}

function makeSimpleLineSystem(lines){
	let lineSystem        = BABYLON.MeshBuilder.CreateLineSystem("lineSystem", { lines: lines, }, glo.scene);
	lineSystem.color      = glo.lineColor;
	lineSystem.alpha      = glo.ribbon_alpha;
	lineSystem.alphaIndex = 999;
	lineSystem.visibility = glo.lines_visible;

	return lineSystem;
}

function getMaxDistanceVerticeToOrigin(){
	let maxDist = 0;
	glo.curves.paths.forEach((line, i) => {
		line.forEach((path, j) => {
			const dist = BABYLON.Vector3.Distance(path, BABYLON.Vector3.Zero());
			if(maxDist < dist){ maxDist = dist; }
		});
	});
	return maxDist;
}

function getAzimuthElevationAngles(vector) {
    // Calcul de l'angle d'azimut (angleX)
    var azimuth = Math.atan2(vector.z, vector.x);

    // Calcul de l'angle d'élévation (angleY)
    var elevation = Math.atan2(vector.y, Math.sqrt(vector.x * vector.x + vector.z * vector.z));

    return { x: azimuth, y: elevation };
}

function showVertex(x, y, z){
	if(!glo.sphereToShowVertex){ glo.sphereToShowVertex = BABYLON.MeshBuilder.CreateSphere("sphere", { segments: 32, diameter: Z }, glo.scene); }

	glo.sphereToShowVertex.position.x = x;
	glo.sphereToShowVertex.position.y = y;
	glo.sphereToShowVertex.position.z = z;
}

function keepLinesCrossOtherLine(){
	let edges = turnVerticesDatasToPaths();

	let newPaths = [];
	edges.forEach(edge1 => {
		for(let k = 0; k < edges.length; k++){
			let good = false;
			const edge2 = edges[k];
			if(edge1 !== edge2){
				for(let i = 0; i < edge1.length; i++){
					const vertex1 = edge1[i];
					good = false;
					for(let j = 0; j < edge2.length; j++){
						const vertex2 = edge2[j];
						
						if(BABYLON.Vector3.Distance(vertex1, vertex2) < 0.51){
							newPaths.push(edge1);
							good = true;
							break;
						}
					}
					if(good){ break; }
				}
			}
			if(good){ break; }
		}
	});
	if(newPaths.length){
		glo.curves.paths = newPaths;
		if(!glo.normalMode){  make_ribbon(); }
		else{ drawNormalEquations(); }
	}
}

async function mergeManyMeshesByIntersects(meshes) {
    let finalMesh = meshes[0];

    for (let i = 1; i < meshes.length; i++) {
       finalMesh = await mergeMeshesByIntersects(finalMesh, meshes[i]);
    }

    return finalMesh;
}
async function mergeMeshesByIntersects(mesh1, mesh2) {
    mesh1.computeWorldMatrix(true);
    mesh2.computeWorldMatrix(true);
    var csg1 = BABYLON.CSG.FromMesh(mesh1);
    var csg2 = BABYLON.CSG.FromMesh(mesh2);
    var csg3 = csg2.intersect(csg1); 
    
    let finalMesh = csg3.toMesh('section');
    finalMesh.computeWorldMatrix(true);

	mesh1.dispose();
	mesh2.dispose();

    return finalMesh;
}

async function inverseMeshGeometry(){
	let curvesPathsSave = [...glo.curves.paths];

	if(glo.curves.linesSystems){ glo.curves.linesSystems.forEach(lineSystem => { lineSystem.dispose(true); lineSystem = null; }); }

	let newCurves           = [];
	glo.curves.linesSystems = [];
	newCurves = [];
	curvesPathsSave.forEach((line, i) => {
		newCurves[i] = [];
		line.forEach(path => {
			newCurves[i].push(new BABYLON.Vector3(-path.x, -path.y, -path.z));
		});
	});
	
	glo.curves.paths = newCurves;
	glo.lines = glo.curves.paths;

	if(!glo.normalMode){ make_ribbon(); }
    else{ drawNormalEquations(); }
	makeLineSystem();
}

async function negativeMeshGeometry(axis){
	let curvesPathsSave = [...glo.curves.paths];

	if(glo.curves.linesSystems){ glo.curves.linesSystems.forEach(lineSystem => { lineSystem.dispose(true); lineSystem = null; }); }

	let newCurves           = [];
	glo.curves.linesSystems = [];
	newCurves = [];
	curvesPathsSave.forEach((line, i) => {
		newCurves[i] = [];
		line.forEach(path => {
			switch(axis){
				case "x":
					newCurves[i].push(new BABYLON.Vector3(-path.x, -path.y, path.z));
				break;
				case "y":
					newCurves[i].push(new BABYLON.Vector3(path.x, -path.y, -path.z));
				break;
				case "z":
					newCurves[i].push(new BABYLON.Vector3(-path.x, path.y, -path.z));
				break;
			}
		});
	});
	
	glo.curves.paths = newCurves;
	glo.lines = glo.curves.paths;

	if(!glo.normalMode){ make_ribbon(); }
    else{ drawNormalEquations(); }
	makeLineSystem();
}

async function rotatePathsByEachCenter(alpha = glo.params.functionIt.rotLine.alpha, beta = glo.params.functionIt.rotLine.beta, theta = glo.params.functionIt.rotLine.theta){
	if(alpha || beta || theta){
		let curvesPathsSave = [...glo.curves.paths];

		if(glo.curves.linesSystems){ glo.curves.linesSystems.forEach(lineSystem => { lineSystem.dispose(true); lineSystem = null; }); }

		let newCurves           = [];
		glo.curves.linesSystems = [];
		newCurves = [];
		curvesPathsSave.forEach((line, i) => {
			const center = getCenterOfPaths(line);
			line.forEach((path, i) => {
				path    = rotateOnCenterByBabylonMatrix(path, alpha, beta, theta, center);
				line[i] = path;
			});
			newCurves[i] = line;
		});
		
		glo.curves.paths = newCurves;
		glo.lines        = glo.curves.paths;
	}
}

async function expendPathsByEachCenter(expend = glo.params.functionIt.expend){
	if(expend){
		let curvesPathsSave = [...glo.curves.paths];

		if(glo.curves.linesSystems){ glo.curves.linesSystems.forEach(lineSystem => { lineSystem.dispose(true); lineSystem = null; }); }

		let newCurves           = [];
		glo.curves.linesSystems = [];
		newCurves = [];
		curvesPathsSave.forEach((line, i) => {
			const center = getCenterOfPaths(line);
			line.forEach((path, i) => {
				if(h(path.x, path.y, path.z) > ep/10000){
					let angleXY = getAzimuthElevationAngles(center.subtract(path));
					let dist    = BABYLON.Vector3.Distance(path, center);
	
					const dirXY = directionXY(angleXY, dist, expend);
	
					path.x -= dirXY.x;
					path.y -= dirXY.y;
					path.z -= dirXY.z;
				}

				line[i] = path;
			});
			newCurves[i] = line;
		});
		
		glo.curves.paths = newCurves;
		glo.lines        = glo.curves.paths;
	}
}

function getCenterOfPaths(paths){
	const pathsLength  = paths.length;
	const centerOffset = glo.params.functionIt.rotatePaths.centerOffset;

	let center = {x: 0, y: 0, z: 0};
	paths.forEach(path => {
		center.x += path.x;
		center.y += path.y;
		center.z += path.z;
	});

	center.x/=pathsLength;
	center.y/=pathsLength;
	center.z/=pathsLength;

	return new BABYLON.Vector3(center.x * centerOffset.x, center.y * centerOffset.y, center.z * centerOffset.z);
}

function giveMaterialToMesh(mesh = glo.ribbon, emissiveColor = glo.emissiveColor, diffuseColor = glo.diffuseColor){
	disposeAllMaterials();

	let material = new BABYLON.StandardMaterial("myMaterial", glo.scene);

	material.backFaceCulling = false;
	mesh.material = material;
	mesh.material.emissiveColor = emissiveColor;
	mesh.material.diffuseColor = diffuseColor;
	mesh.material.alphaMode = BABYLON.Engine.ALPHA_COMBINE;
	mesh.material.alpha = glo.ribbon_alpha;
	mesh.alphaIndex = 998;
	mesh.material.wireframe = glo.wireframe;
}

function disposeAllMaterials(){
	for(let i = 0; i < glo.scene.materials.length; i++){
		glo.scene.materials[i].dispose();
		i--;
	} 
}

function scaleVertexsDist(scale = 0.5) {
	if(scale !== 1){
		let curvesPathsTmp = [];
		const cTmp         = glo.curves.paths.slice();

		cTmp.forEach((paths, i) => {
			curvesPathsTmp[i] = [];
			paths.forEach((path, j) => {
				curvesPathsTmp[i][j] = path.clone();
			});
		});

		curvesPathsTmp.forEach((paths, n) => {
			for (let i = 1; i < paths.length; i++) {
				const v1 = paths[i - 1], v2 = paths[i];

				// Calculer le vecteur directionnel de v1 à v2
				const direction = v2.subtract(v1);
				// Normaliser le vecteur directionnel
				direction.normalize();
				// Calculer la nouvelle distance souhaitée (par exemple, réduire de 50%)
				const newDist = BABYLON.Vector3.Distance(v1, v2) * scale;
				// Ajuster v2 vers v1 en utilisant le vecteur directionnel et la nouvelle distance
				glo.curves.paths[n][i] = v1.add(direction.scale(newDist));
				if(scale < 1){ curvesPathsTmp[n][i] = v1.add(direction.scale(newDist)); }
			}
		});
	}
}

function calculateAzimuthElevation(x1, y1, z1, x2, y2, z2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    
    // Calcul de l'azimut en degrés
    const azimuth = Math.atan2(dy, dx);
    
    // Calcul de la distance dans le plan xy
    const dxy = Math.sqrt(dx * dx + dy * dy);
    
    // Calcul de l'élévation en degrés
    const elevation = Math.atan2(dz, dxy);
    
    return { x: azimuth, y: elevation };
}

function calculateAngleBetweenVectors(v1, v2) {
	const dotProduct = BABYLON.Vector3.Dot(v1, v2); // Produit scalaire
	const magnitudeV1 = v1.length(); // Longueur de v1
	const magnitudeV2 = v2.length(); // Longueur de v2

	// Calcul du cosinus de l'angle
	let cosTheta = dotProduct / (magnitudeV1 * magnitudeV2);

	// Clamper la valeur de cosTheta pour être sûr qu'elle est dans [-1, 1]
    cosTheta = Math.min(Math.max(cosTheta, -1), 1);

	// Retourne l'angle en radians
	return Math.acos(cosTheta);
}

function invertDirectionRadians(angleXY) {
    // Inverser l'azimut: ajouter π radians et normaliser
    let invertedAzimuth = angleXY.x + Math.PI;
    if (invertedAzimuth >= 2 * Math.PI) invertedAzimuth -= 2 * Math.PI; // Normaliser entre 0 et 2π radians
    
    // Inverser l'élévation: prendre l'opposé
    let invertedElevation = -angleXY.y;
    
    return { x: invertedAzimuth, y: invertedElevation };
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        // Choisissez un élément aléatoire avant l'élément courant
        const j = Math.floor(Math.random() * (i + 1));
        // Echangez-le avec l'élément courant
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function offsetPathsByFirstPointToZero(paths){
	const firstVect = paths[0][0];

	return paths.map(path => 
		path.map(vect => vect.subtract(firstVect))
	);
}

function offsetPathsByMoyPos(paths, moyPos){
	const moyPosVect = new BABYLON.Vector3(moyPos);

	return paths.map(path => 
		path.map(vect => vect.subtract(moyPosVect))
	);
}

// Fonction pour calculer l'angle d'azimut
function calculateAzimuth(vector) {
    return Math.atan2(vector.y, vector.x);
}

// Fonction pour calculer l'angle d'élévation
function calculateElevation(vector) {
    return Math.atan2(vector.z, Math.sqrt(vector.x * vector.x + vector.y * vector.y));
}

function turnVerticesDatasToPaths(verticesDatas = glo.ribbon.getVerticesData(BABYLON.VertexBuffer.PositionKind), coeff){
	let paths = [];
	let n = 0;

	const stepsU = coeff ? ((glo.params.steps_u + 1) * coeff) : glo.pathsInfos.u;
	for(let i = 0; i <= stepsU - 1; i++){
		paths[i] = [];
		for(let j = 0; j <= glo.params.steps_v; j++){
			const v = { x: verticesDatas[n*3], y: verticesDatas[n*3 + 1], z: verticesDatas[n*3 + 2] };
			paths[i].push(new BABYLON.Vector3(v.x, v.y, v.z));

			n++;
		}
	}
	return paths;
}

function transformMesh(transformKind = 'scaling', axis = 'x', value = 2, mesh = glo.ribbon, lines = glo.curves.lineSystem, dblLines = glo.curves.lineSystemDouble){
	mesh[transformKind][axis] = value;
	if(lines){ lines[transformKind][axis] = value; }
	if(dblLines){ dblLines[transformKind][axis] = value; }
}

function scaleNoSignToSign(value){
	if(value > 0){ return ++value; }
	else{ return 1/(-value+1); }
}

function isTransformation(){
	const transformations = ['scalingX', 'scalingY', 'scalingZ', 'rotationX', 'rotationY', 'rotationZ', 'positionX', 'positionY', 'positionZ'];

	for(let i = 0; i < transformations.length; i++){
		if(glo.params[transformations[i]]){ return true; }
	}

	return false;
}

function applyTransformations(mesh = glo.ribbon) {
    const transformations = [
        'scalingX', 'scalingY', 'scalingZ',
        'rotationX', 'rotationY', 'rotationZ',
        'positionX', 'positionY', 'positionZ'
    ];

    // Extraire les transformations et les axes
    const transformationsAxis = transformations.map(trans => { 
        return { 
            name: trans, 
            trans: trans.slice(0, trans.length - 1), 
            axis: trans.slice(-1).toLowerCase() 
        }; 
    });

    // Appliquer les transformations (scaling, rotation, position)
	const scale = glo.params.gridScale ? mesh.gridScale() : 1;
	mesh.gridScaleValue = scale;
    transformationsAxis.forEach(transformationsAxis => {
        if (glo.params[transformationsAxis.name]) {
			if(transformationsAxis.trans === 'scaling'){
				transformMesh(transformationsAxis.trans, transformationsAxis.axis, glo.params[transformationsAxis.name] * scale);
			}
			else{ transformMesh(transformationsAxis.trans, transformationsAxis.axis, glo.params[transformationsAxis.name]); } 
        }
    });

	mesh.computeWorldMatrix(true);
	mesh.refreshBoundingInfo();
}

function gridScale(mesh = glo.ribbon) {
	const scale = mesh.gridScale();

	const moyPos    = mesh.moyPos();
	const newMoyPos = new BABYLON.Vector3(moyPos.x * scale, moyPos.y * scale, moyPos.z * scale);
	const moveVect  = new BABYLON.Vector3(newMoyPos.x - moyPos.x, newMoyPos.y - moyPos.y, newMoyPos.z - moyPos.z);

	transformMesh('scaling', 'x', scale, mesh, glo.curves.lineSystem, false);
	transformMesh('scaling', 'y', scale, mesh, glo.curves.lineSystem, false);
	transformMesh('scaling', 'z', scale, mesh, glo.curves.lineSystem, false);

	if (glo.params.doubleLineSystem) {
		transformMesh('scaling', 'x', scale, mesh, glo.curves.lineSystemDouble, false);
		transformMesh('scaling', 'y', scale, mesh, glo.curves.lineSystemDouble, false);
		transformMesh('scaling', 'z', scale, mesh, glo.curves.lineSystemDouble, false);
	}

	mesh.position.x -= moveVect.x;
	mesh.position.y -= moveVect.y;
	mesh.position.z -= moveVect.z;

	glo.curves.lineSystem.position.x -= moveVect.x;
	glo.curves.lineSystem.position.y -= moveVect.y;
	glo.curves.lineSystem.position.z -= moveVect.z;

	if (glo.params.doubleLineSystem) {
		glo.curves.lineSystemDouble.position.x -= moveVect.x;
		glo.curves.lineSystemDouble.position.y -= moveVect.y;
		glo.curves.lineSystemDouble.position.z -= moveVect.z;
	}
}

function swapControlBackground(controlName, background = glo.controlConfig.background, backgroundActived = glo.controlConfig.backgroundActived){
	let control = glo.allControls.getByName(controlName);

	control.background = control.background === background ? backgroundActived : background;
}

function otherDesigns(){
	glo.bgActivedButtons.forEach(buttonName => {
		glo.allControls.getByName(buttonName).background = glo.controlConfig.backgroundActived;
	});

	param_special_controls();
}

function param_special_controls(){
	glo.allControls.getByName('inputsColorsEquations').top = '27%';
	glo.allControls.getByName('centerLocal').paddingTop    = '17px';
	glo.allControls.getByName('centerLocal').width         = '150px';
	glo.allControls.getByName('centerLocal').height        = '50px';
  
	glo.allControls.haveThisClass('slider').map(slider => {
		for(const prop in glo.theme.slider){ slider[prop] = glo.theme.slider[prop]; }
	});
	glo.allControls.haveThisClass('input').map(input => {
		for(const prop in glo.theme.input.onBlur){ input[prop] = glo.theme.input.onBlur[prop]; }
	});

	glo.allControls.haveTheseClasses('header', 'right', 'seventh', 'noAutoParam').map(header => {header.height = '25px'; });
	glo.allControls.haveTheseClasses('header', 'right', 'eighth', 'noAutoParam').map(header => {header.height = '23px'; });
	glo.allControls.haveTheseClasses('header', 'right', 'nineth', 'noAutoParam').map(header => {header.height = '23px'; });
	glo.allControls.haveTheseClasses('header', 'right', 'fifth', 'noAutoParam').map(header => {header.height = '24.5px'; });
	glo.allControls.haveTheseClasses('header', 'right', 'fourth', 'noAutoParam').map(header => {header.height = '24px'; });
	glo.allControls.haveTheseClasses('header', 'right', 'sixth', 'noAutoParam').map(header => {header.height = '24px'; });
	glo.allControls.haveTheseClasses('header', 'right', 'third', 'noAutoParam').map(header => {header.height = '30px'; });
	glo.allControls.haveTheseClasses('header', 'right', 'second', 'noAutoParam').map(header => {header.height = '30px'; });
}

function paramRadios(){
	glo.allControls.haveTheseClasses('header', 'radio', 'left', 'first', 'noAutoParam').map(header => {
		for(const prop in glo.theme.radio.text){ header[prop] = glo.theme.radio.text[prop]; }
	});
	glo.allControls.haveTheseClasses('radio', 'left', 'first').haveNotThisClass('header').map(radio => {
		for(const prop in glo.theme.radio.button){ radio[prop] = glo.theme.radio.button[prop]; }
	});
}

function camToOrigin(){
	glo.camera.alpha = glo.camera.start.alpha;
	glo.camera.beta  = glo.camera.start.beta;
	glo.camera.setPosition(glo.camera.start.pos.clone());
	glo.camera.setTarget(glo.camera.start.target.clone());
}

function reformatPaths(originalPaths = glo.curves.paths) {
    // Déterminer le nombre de chemins et la longueur du chemin le plus long
    const numPaths = originalPaths.length;
    let maxPathLength = 0;
    originalPaths.forEach(path => {
        if (path.length > maxPathLength) {
            maxPathLength = path.length;
        }
    });

    // Initialiser le nouveau tableau de chemins
    const newPaths = [];

    // Construire chaque nouveau chemin en prenant le nième point de chaque chemin original
    for (let i = 0; i < maxPathLength; i++) {
        const newPath = [];
        for (let j = 0; j < numPaths; j++) {
            if (i < originalPaths[j].length) { // Vérifie si le point existe
                newPath.push(originalPaths[j][i]);
            }
        }
        newPaths.push(newPath);
    }

	glo.curves.doublePaths = newPaths;

    return newPaths;
}

function paramsOrFractNbPaths(uOrV, paramsNBPaths, fractalizeKind){
	return glo.params.fractalize.actived && fractalizeKind ?
	       (fractalizeKind === 'fractalize' ? glo.params.fractalize.steps[uOrV] : glo.params.fractalize.fractalized.steps[uOrV]) :
		   paramsNBPaths;
}

function calculCurvature(pathBeforePoint, pathOnPoint, pathAfterPoint){
	const vectorBeforePoint = new BABYLON.Vector3(pathOnPoint.x - pathBeforePoint.x, pathOnPoint.y - pathBeforePoint.y, pathOnPoint.z - pathBeforePoint.z);
	const vectorAfterPoint  = new BABYLON.Vector3(pathAfterPoint.x - pathOnPoint.x, pathAfterPoint.y - pathOnPoint.y, pathAfterPoint.z - pathOnPoint.z);

	const resultVector = vectorBeforePoint.add(vectorAfterPoint);

	return {azimuth: calculateAzimuth(resultVector), elevation: calculateElevation(resultVector)};
}
function calculCurvatureByOrigin(vect){
	return {azimuth: calculateAzimuth(vect), elevation: calculateElevation(vect)};
}

function w(val, isCos = 1){
	let res = isCos ? Math.acos(val) : Math.asin(val);
	return isNaN(res) ? val : res;
}

function customDecrease(x, m, k) {
    return x * Math.pow(x / m, k);
}

function closedPaths(paths){
	glo.params.lastPathEqualFirstPath = false;
	if(isClosedPaths(paths)){
		paths.pop();
		glo.params.lastPathEqualFirstPath = true;
	}

	return paths;
}

function isClosedPaths(paths){
	const firstVects = paths[0];
	const lastVects  = paths[paths.length - 1];

	return firstVects.every((vect, i) => BABYLON.Vector3.Distance(vect, lastVects[i]) < ep);
}

function Uint32ArrayDelete(array, indexsToRemove){
	indexsToRemove.forEach(indexToRemove => array = Uint32ArrayDeleteOne(array, indexToRemove));

	return array;
}

function Uint32ArrayDeleteOne(array, indexToRemove){
	let newArray = new Uint32Array(array.length - 1);

	// Copie les éléments avant et après l'index à supprimer
	newArray.set(array.slice(0, indexToRemove), 0);
	newArray.set(array.slice(indexToRemove + 1), indexToRemove);

	return newArray;
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