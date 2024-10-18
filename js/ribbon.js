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
}, dim_one = glo.dim_one, fractalize = false, histo = true){

	var good = test_equations(equations, dim_one);
	if(good){
		if(typeof(glo.curves) != "undefined"){
			if(glo.curves.linesSystems){ glo.curves.linesSystems.forEach(lineSystem => { lineSystem.dispose(true); lineSystem = null; }); }
			if(glo.curves.lineSystem){ glo.curves.lineSystem.dispose(true); delete glo.curves.lineSystem; }
			glo.curves = {}; delete glo.curves;
		}

		makeOnlyCurves(undefined, undefined, undefined, undefined, false, fractalize);

		await expendPathsByEachCenter();
		await rotatePathsByEachCenter();

		await make_ribbon(true, histo);
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

async function make_ribbon(symmetrize = true, histo = true){
	glo.emissiveColorSave = {...glo.emissiveColor};
	glo.diffuseColorSave  = {...glo.diffuseColor};

	var nameRibbon = "Ribbon";
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

	glo.ribbon.resetCurveByStep();

	if(histo){ glo.histo.save(); }
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

async function remakeRibbon(fractalize = !glo.params.fractalize.actived ? false : 'fractalize', histo = true){
	if(!glo.normalMode){  await make_curves(undefined, undefined, undefined, undefined, fractalize, histo); }
	else{
		glo.fromSlider = true; await make_curves(undefined, undefined, undefined, undefined, fractalize, histo); glo.fromSlider = false; drawNormalEquations();
	}
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

function makeLineStep(vect, newLine){
	if(newLine){
		let newLine = BABYLON.MeshBuilder.CreateLines("lineStep", {points: [vect], updatable: false}, glo.scene);
		newLine.color = 'red';
		newLine.alpha = 1;
		newLine.visibility = 1;
		glo.linesStep.push(newLine);  
	}
	else{
		addPointToLine(vect);
	}
}

function addPointToLine(newPoint){
    var points = getlinePoints(glo.linesStep[glo.linesStep.length-1]);

    points.push(newPoint);

	glo.linesStep[glo.linesStep.length-1] = BABYLON.MeshBuilder.CreateLines("lineStep", {points: points, updatable: false}, glo.scene);
	glo.linesStep[glo.linesStep.length-1].color = 'red';
	glo.linesStep[glo.linesStep.length-1].alpha = 1;
	glo.linesStep[glo.linesStep.length-1].visibility = 1;
}

function getlinePoints(lineMesh){
    var positions = lineMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    var points = [];
    
    for (var i = 0; i < positions.length; i += 3) {
        points.push(new BABYLON.Vector3(positions[i], positions[i + 1], positions[i + 2]));
    }

    return points;
}

function getPathsInfos(){
	const coeffSym = countSyms();
	glo.pathsInfos = {u: (glo.params.steps_u + 1) * coeffSym, v: glo.params.steps_v + 1};
}

function raz_meshes(){
	glo.ribbon.dispose();
	glo.ribbon = null;
	glo.is_ribbon = false;
}

var switch_lines = function(visibility = glo.lines_visible){
	glo.curves.lineSystem.visibility = visibility;
	if(glo.curves.lineSystemDouble){ glo.curves.lineSystemDouble.visibility = visibility; }
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

function isUV(){
	let inputs = [glo.params.text_input_x, glo.params.text_input_y, glo.params.text_input_z,
		          glo.params.text_input_alpha, glo.params.text_input_beta, glo.params.text_input_suit_x, glo.params.text_input_suit_y,
				  glo.params.text_input_suit_z, glo.params.text_input_suit_alpha, glo.params.text_input_suit_beta];
	
	return {isU: inputs.some(input => input.includes('u') ), isV: inputs.some(input => input.includes('v') )};
}

function showVertex(x, y, z){
	if(!glo.sphereToShowVertex){ glo.sphereToShowVertex = BABYLON.MeshBuilder.CreateSphere("sphere", { segments: 32, diameter: Z }, glo.scene); }

	glo.sphereToShowVertex.position.x = x;
	glo.sphereToShowVertex.position.y = y;
	glo.sphereToShowVertex.position.z = z;
}

function closedPaths(paths){
	glo.params.lastPathEqualFirstPath = false;
	if(isClosedPaths(paths) && !glo.params.fractalize.actived){
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