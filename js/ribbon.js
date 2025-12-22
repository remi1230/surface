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
	fevalX: glo.params.text_input_eval_x,
	fevalY: glo.params.text_input_eval_y,
}, dim_one = glo.dim_one, fractalize = false, histo = true){

	var good = test_equations(equations, dim_one);
	if(good){
		if(typeof(glo.curves) != "undefined"){
			if(glo.curves.linesSystems){ glo.curves.linesSystems.forEach(lineSystem => { lineSystem.dispose(true); lineSystem = null; }); }
			if(glo.curves.lineSystem){ glo.curves.lineSystem.dispose(true); delete glo.curves.lineSystem; }
			glo.curves = {}; delete glo.curves;
		}

		makeOnlyCurves(undefined, undefined, undefined, undefined, false, fractalize);

		//if(glo.ribbon && glo.ribbon.savedPaths) glo.ribbon.savedPaths = undefined;

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
	glo.formule = [];
	
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

	//glo[objToSet].generatePaths();
}

function makeOnePoint(u, v){
	makeOnlyCurves({ 
		u: {min: u, max: u, nb_steps: 1, },
		v: {min: v, max: v, nb_steps: 1, },
	}, undefined, undefined, undefined, false, false, true);

	return glo.onePoint;
}

async function make_ribbon(symmetrize = true, histo = true, transByR = true){
    if (glo.params.NaNToZero) { NaNToZero(); }

	let isClosedArray = isClosedPaths(glo.curves.paths);

	if(transByR && glo.input_sym_r.text){ await applyDeformation(); }
    
    let paths = glo.curves.paths;

    if (paths.length) {
        // Si fermé, retirer le dernier path (doublon du premier)
        if (isClosedArray) {
            paths = paths.slice(0, -1);
        }

        glo.emissiveColorSave = {...glo.emissiveColor};
        glo.diffuseColorSave  = {...glo.diffuseColor};

        var nameRibbon = "Ribbon";
        glo.numRibbon++;

        if (glo.normalMode && !glo.fromSlider) { 
            paths = glo.curves.pathsSecond; 
        } else {
            delete glo.verticesNormals;
            delete glo.verticesPositions;
            delete glo.verticesUVs;
        }

        if (glo.fromSlider) { delete glo.verticesColors; }

        if (glo.params.expansion) { await expanseRibbon(); }

        scaleVertexsDist(glo.scaleVertex);

        // Ajouter le premier path à la fin pour fermer proprement
        if (isClosedArray) { 
            paths = [...paths, paths[0].map(pt => pt.clone())];
        }

        let colorsVoronoi = false;
        let colorsRibbon;

        if (!glo.params.playWithColors && glo.colorsType == 'none') {
            if (!glo.voronoiMode) {
                if (!glo.ribbon) {
                    glo.ribbon = await BABYLON.MeshBuilder.CreateRibbon(nameRibbon, {
                        pathArray: paths,
                        sideOrientation: 1,
                        updatable: true,
                        closeArray: false
                    }, glo.scene);
                    glo.ribbon._pathCount = paths.length;
                    glo.ribbon._pointsPerPath = paths[0].length;
                } else {
                    if (paths.length !== glo.ribbon._pathCount || paths[0].length !== glo.ribbon._pointsPerPath) {
                        ribbonDispose();
                        glo.ribbon = await BABYLON.MeshBuilder.CreateRibbon(nameRibbon, {
                            pathArray: paths,
                            sideOrientation: 1,
                            updatable: true,
                            closeArray: false
                        }, glo.scene);
                        glo.ribbon._pathCount = paths.length;
                        glo.ribbon._pointsPerPath = paths[0].length;
                    } else {
                        await BABYLON.MeshBuilder.CreateRibbon(nameRibbon, {
                            pathArray: paths,
                            instance: glo.ribbon
                        });
                    }
                }
            } else {
                var white = BABYLON.Color3.White();
                glo.emissiveColor = white;
                glo.diffuseColor = white;
                glo.ribbon = await BABYLON.MeshBuilder.CreateRibbon(nameRibbon, {
                    pathArray: paths,
                    sideOrientation: 1,
                    updatable: true,
                    closeArray: false
                }, glo.scene);
                colorsVoronoi = voronoi();
            }
        } else {
            ribbonDispose();
            glo.ribbon = await BABYLON.MeshBuilder.CreateRibbon(nameRibbon, {
                pathArray: paths,
                sideOrientation: 1,
                updatable: true,
                closeArray: false
            }, glo.scene);
            glo.colorsRibbonSave = {};
            objCols = {colsArr: colorsRibbon};
            Object.assign(glo.colorsRibbonSave, objCols);
            var white = BABYLON.Color3.White();
            glo.emissiveColor = white;
            glo.diffuseColor = white;

            if (glo.params.meshEquationToColor) { meshEquationToColor(); }

            makeOtherColors(true);
        }

        if (colorsVoronoi) {
            glo.ribbon.setVerticesData(BABYLON.VertexBuffer.ColorKind, colorsVoronoi);
        }

		glo.ribbon.createNormals(true);

        glo.originRibbonNbIndices = glo.ribbon.getIndices().length;

        const norm = glo.params.functionIt.norm;

        if (isDel()) { await delInRibbon(); }

        if (glo.params.fractalize.actived) {
            await glo.ribbon.fractalize();
            if (glo.params.fractalize.refractalize) { await glo.ribbon.fractalize(); }
        }
        if (norm.x || norm.y || norm.z) { await drawSliderNormalEquations(); }

        if (glo.params.invPtsPowCoeff) { await invPointsByDistToOrigin(); }

        glo.is_ribbon = true;
        if (!glo.ribbon_visible) { glo.ribbon.visibility = 0; }

        glo.emissiveColor = {...glo.emissiveColorSave};
        glo.diffuseColor = {...glo.diffuseColorSave};

        await cutsRibbon();

        glo.ribbon.paths = paths;

		if (isClosedArray) {
			const normals = Array.from(glo.ribbon.getVerticesData(BABYLON.VertexBuffer.NormalKind));
			const pathCount = glo.ribbon._pathCount;
			const pointsPerPath = glo.ribbon._pointsPerPath;
			const lastPathStart = (pathCount - 1) * pointsPerPath;
			
			for (let j = 0; j < pointsPerPath; j++) {
				const firstIdx = j * 3;
				const lastIdx = (lastPathStart + j) * 3;
				
				// Moyenne des normales
				const avgX = (normals[firstIdx] + normals[lastIdx]) / 2;
				const avgY = (normals[firstIdx + 1] + normals[lastIdx + 1]) / 2;
				const avgZ = (normals[firstIdx + 2] + normals[lastIdx + 2]) / 2;
				
				// Normaliser
				const len = Math.sqrt(avgX * avgX + avgY * avgY + avgZ * avgZ);
				
				normals[firstIdx] = avgX / len;
				normals[firstIdx + 1] = avgY / len;
				normals[firstIdx + 2] = avgZ / len;
				
				normals[lastIdx] = avgX / len;
				normals[lastIdx + 1] = avgY / len;
				normals[lastIdx + 2] = avgZ / len;
			}
			
			glo.ribbon.setVerticesData(BABYLON.VertexBuffer.NormalKind, normals, true);
		}

		if (symmetrize && isSym()) {
            await makeSymmetrizeRibbon();
        }

		giveMaterialToMesh();

        makeLineSystem();

        if (glo.params.checkerboard) { glo.ribbon.checkerboard(); }

        glo.ribbon.savePos = glo.ribbon.getPositionData().slice();
        flatRibbon();

        if (glo.meshWithTubes) { await meshWithTubes(); }

        make_planes();

        applyTransformations();
        glo.ribbon.moyPosToOrigin();

        if (glo.flatMesh) { glo.ribbon.convertToFlatShadedMesh(); }

        glo.ribbon.showBoundingBox = glo.params.showBoundingBox;
        glo.params.lastPathEqualFirstPath = false;

        glo.ribbon.curveByStep = glo.ribbon.curveByStepGen();

        glo.ribbon.resetCurveByStep();

        if (histo) { glo.histo.save(); }
    }
}

function fixClosedRibbonNormals(ribbon, pointsPerPath) {
    const normals = ribbon.getVerticesData(BABYLON.VertexBuffer.NormalKind);
    
    if (!normals) {
        return;
    }
    
    const totalVertices = normals.length / 3;
    const pathCount = totalVertices / pointsPerPath;
    const lastPathStart = (pathCount - 1) * pointsPerPath;
    
    // Moyenner les normales du premier et dernier path pour une transition douce
    for (let j = 0; j < pointsPerPath; j++) {
        const firstIdx = j * 3;
        const lastIdx = (lastPathStart + j) * 3;
        
        // Moyenne des normales
        const avgX = (normals[firstIdx] + normals[lastIdx]) / 2;
        const avgY = (normals[firstIdx + 1] + normals[lastIdx + 1]) / 2;
        const avgZ = (normals[firstIdx + 2] + normals[lastIdx + 2]) / 2;
        
        // Normaliser
        const len = Math.sqrt(avgX * avgX + avgY * avgY + avgZ * avgZ);
        const nx = avgX / len;
        const ny = avgY / len;
        const nz = avgZ / len;
        
        // Appliquer aux deux paths
        normals[firstIdx] = nx;
        normals[firstIdx + 1] = ny;
        normals[firstIdx + 2] = nz;
        
        normals[lastIdx] = nx;
        normals[lastIdx + 1] = ny;
        normals[lastIdx + 2] = nz;
    }
    
    ribbon.updateVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
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
	let paths = !glo.normalMode ? glo.ribbon.getPaths() : glo.curves.pathsSecond;

	if(!paths){ paths = glo.curves.paths; }

	if(glo.curves.lineSystem){ glo.curves.lineSystem.dispose(true); delete glo.curves.lineSystem; }
	if(glo.curves.lineSystemDouble){ glo.curves.lineSystemDouble.dispose(true); delete glo.curves.lineSystemDouble; }

	glo.curves.lineSystem = BABYLON.MeshBuilder.CreateLineSystem("lineSystem", { lines: paths, }, glo.scene);
	glo.curves.lineSystem.color = glo.lineColor;
	glo.curves.lineSystem.alpha = glo.ribbon_alpha;
	glo.curves.lineSystem.alphaIndex = 999;
	glo.curves.lineSystem.visibility = glo.lines_visible;

	if(glo.params.doubleLineSystem){
		let paths    = !glo.normalMode ? reformatPaths(glo.ribbon.getPaths(glo.ribbon.savePos)) : reformatPaths(glo.curves.pathsSecond);
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

function posPointsWithFibonacci(n, rayon, pos) {
	let points = [];
    let phi    = Math.PI * (3 - Math.sqrt(5));  // angle d'or en radians

    for (var i = 0; i < n; i++) {
        let y = 1 - (i / (n - 1)) * 2;  // y va de 1 à -1
        let rayonHorizontal = Math.sqrt(1 - y * y);  // rayon à cette hauteur

        let angle = phi * i;  // angle selon la répartition de Fibonacci

        let x = Math.cos(angle) * rayonHorizontal * rayon;
        let z = Math.sin(angle) * rayonHorizontal * rayon;

		let p = {x: x + pos.x, y: (y*rayon) + pos.y, z: z + pos.z};

		//Code que j'ai rajouté pour fusionner chacune des paires de points situés aux pôles
		if(i === 1){
			points[i-1] = {x: (points[i-1].x + p.x) / 2, y: (points[i-1].y + p.y) / 2, z: (points[i-1].z + p.z) / 2};
		}
		else if(i === n-1){
			points[i-2] = {x: (points[i-2].x + p.x) / 2, y: (points[i-2].y + p.y) / 2, z: (points[i-2].z + p.z) / 2};
		}
		else{ points.push(p); }
    }

    return points;
}

function createDisplacedFibonacciSphere(n, rayon, pos, amplitude, frequency) {
	const points = [];
	const phi = Math.PI * (3 - Math.sqrt(5)); // angle d'or
  
	for (let i = 0; i < n; i++) {
	  // Calcul de la position de base sur la sphère
	  let y = 1 - (i / (n - 1)) * 2; // y de 1 à -1
	  let rHorizontal = Math.sqrt(1 - y * y);
	  let angle = phi * i;
	  let x = Math.cos(angle) * rHorizontal * rayon;
	  let z = Math.sin(angle) * rHorizontal * rayon;
	  
	  // Position de base
	  let basePoint = { x: x + pos.x, y: y * rayon + pos.y, z: z + pos.z };
	  
	  // Calcul de la normale (position normalisée par rapport au centre)
	  let len = Math.sqrt(basePoint.x * basePoint.x + basePoint.y * basePoint.y + basePoint.z * basePoint.z);
	  let normal = { x: basePoint.x / len, y: basePoint.y / len, z: basePoint.z / len };
  
	  // Définir les coordonnées u et v issues de la méthode de Fibonacci
	  let v = i / (n - 1);
	  // u est calculé à partir de l'angle, normalisé sur [0, 1]
	  let u = ((angle % (2 * Math.PI)) / (2 * Math.PI));
  
	  // Calcul du décalage en fonction d'une fonction cosinus (vous pouvez ajuster la formule)
	  let displacement = amplitude * Math.cos(2 * Math.PI * frequency * u) * Math.cos(2 * Math.PI * frequency * v);
  
	  // Appliquer le décalage le long de la normale
	  let displacedPoint = {
		x: basePoint.x + normal.x * displacement,
		y: basePoint.y + normal.y * displacement,
		z: basePoint.z + normal.z * displacement
	  };
  
	  points.push(displacedPoint);
	}
	return points;
  }

function cubeRibbonSave(){
	ribbonDispose();

	let pts = posPointsWithFibonacci(1000, 10, {x: 0, y: 0, z: 0});

	// Création du système de points dans la scène Babylon.js
	let pcs = new BABYLON.PointsCloudSystem("pcs", 1, glo.scene);

	// Ajout de chaque point au système
	pcs.addPoints(pts.length, (particle, i) => {
		particle.position = new BABYLON.Vector3(pts[i].x, pts[i].y, pts[i].z);
	});

	// Construction du mesh (nuage de points)
	pcs.buildMeshAsync().then(mesh => {
		// Vous pouvez ici manipuler le mesh, par exemple le positionner, l'ajouter à la scène, etc.
	});

	/*glo.curves.paths = glo.ribbon.getPaths();

	makeLineSystem();*/
}
  
  // Génère un seul tableau contenant tous les paths de toutes les faces
  function generateCubeRibbonPaths(subdivisions) {
	function generateFaceXY(subdivisions, zFixed) {
		const step = 2 / subdivisions;
		const paths = [];
		for (let i = 0; i <= subdivisions; i++) {
		  const y = -1 + step * i;
		  const path = [];
		  for (let j = 0; j <= subdivisions; j++) {
			const x = -1 + step * j;
			path.push({ x, y, z: zFixed });
		  }
		  paths.push(path);
		}
		return paths;
	  }
	  
	  function generateFaceXZ(subdivisions, yFixed) {
		const step = 2 / subdivisions;
		const paths = [];
		for (let i = 0; i <= subdivisions; i++) {
		  const z = -1 + step * i;
		  const path = [];
		  for (let j = 0; j <= subdivisions; j++) {
			const x = -1 + step * j;
			path.push({ x, y: yFixed, z });
		  }
		  paths.push(path);
		}
		return paths;
	  }
	  
	  function generateFaceYZ(subdivisions, xFixed) {
		const step = 2 / subdivisions;
		const paths = [];
		for (let i = 0; i <= subdivisions; i++) {
		  const z = -1 + step * i;
		  const path = [];
		  for (let j = 0; j <= subdivisions; j++) {
			const y = -1 + step * j;
			path.push({ x: xFixed, y, z });
		  }
		  paths.push(path);
		}
		return paths;
	  }
	  
	const front   = generateFaceXY(subdivisions,  1);
	const back    = generateFaceXY(subdivisions, -1);
	const top     = generateFaceXZ(subdivisions,  1);
	const bottom  = generateFaceXZ(subdivisions, -1);
	const right   = generateFaceYZ(subdivisions,  1);
	const left    = generateFaceYZ(subdivisions, -1);
  
	// Optionnel : cloner les points pour éviter des effets de partage de vertices
	const clonePaths = paths => paths.map(path => path.map(p => ({...p})));
  
	return [
	  ...clonePaths(front),
	  ...clonePaths(back),
	  ...clonePaths(top),
	  ...clonePaths(bottom),
	  ...clonePaths(right),
	  ...clonePaths(left)
	];
}
  

function cubeRibbon(){
	ribbonDispose();

	let paths = generateCubeRibbonPaths(100);

	paths = paths.map(line => 
		line.map(pt =>
			new BABYLON.Vector3(pt.x, pt.y, pt.z)
		)
	);

	glo.ribbon = BABYLON.MeshBuilder.CreateRibbon("cubeRibbo,", {
	pathArray: paths,
	sideOrientation: BABYLON.Mesh.DOUBLESIDE,
	updatable: true,
	closeArray: false,
	closePath: false
	}, glo.scene);

	gridScale();

	glo.curves.paths = glo.ribbon.getPaths();
	glo.lines        = glo.curves.paths;

	makeLineSystem();
}

function fibonacciSphereRibbonSave(){
	ribbonDispose();

	//let pts = posPointsWithFibonacci(4096, 10, {x: 0, y: 0, z: 0});
	//let pts = createDisplacedFibonacciSphere(4096, 10, { x: 0, y: 0, z: 0 }, 1, 3);
	let pts = posPointsWithFibonacci(4096, 10, {x: 0, y: 0, z: 0});

	// Conversion des points en tableau plat de positions
	let positions = [];
	pts.forEach((p,i) => {
		const angleXY = getAzimuthElevationAngles({x: p.x, y: p.y, z: p.z}, {x: 0, y: 0, z: 0});
		const dirXY   = directionXY(angleXY, cos(p.x*p.y*p.z));
		positions.push(p.x + dirXY.x, p.y + dirXY.y, p.z + dirXY.z);
	});

	// Calcul du convex hull (tableau d'indices)
	let indices = convexHull(pts);

	// Création d'un mesh personnalisé dans Babylon.js
	glo.ribbon = new BABYLON.Mesh("fibonacci", glo.scene);
	let vertexData = new BABYLON.VertexData();
	vertexData.positions = positions;
	vertexData.indices = indices;

	// Calcul des normales pour un bon éclairage
	vertexData.normals = [];
	BABYLON.VertexData.ComputeNormals(positions, indices, vertexData.normals);

	// Application des données au mesh
	vertexData.applyToMesh(glo.ribbon, true);

	glo.curves.paths = glo.ribbon.getPaths();
}

function fibonacciSphereRibbon(){
	ribbonDispose();

	//let pts = posPointsWithFibonacci(4096, 10, {x: 0, y: 0, z: 0});
	//let pts = createDisplacedFibonacciSphere(4096, 10, { x: 0, y: 0, z: 0 }, 1, 3);
	let pts = posPointsWithFibonacci(4098, 10, {x: 0, y: 0, z: 0});

	// Conversion des points en tableau plat de positions
	let path      = [];
	let paths     = [];
	let positions = [];
	pts.forEach((p,i) => {
		const angleXY = getAzimuthElevationAngles({x: p.x, y: p.y, z: p.z}, {x: 0, y: 0, z: 0});
		const dirXY   = directionXY(angleXY, cos(p.x*p.y*p.z));
		const vect    = new BABYLON.Vector3(p.x + dirXY.x, p.y + dirXY.y, p.z + dirXY.z);

		positions.push(p.x + dirXY.x, p.y + dirXY.y, p.z + dirXY.z);
		path.push(vect);
		if ((i + 1) % 64 === 0) {
			paths.push(path);
			path = [];
		}
	});

	let indices = [];
	const nbLignes = 64;
	const nbColonnes = 64;
	for (let r = 0; r < nbLignes - 1; r++) {
		for (let c = 0; c < nbColonnes - 1; c++) {
			const topLeft     = r * nbColonnes + c;
			const topRight    = topLeft + 1;
			const bottomLeft  = (r + 1) * nbColonnes + c;
			const bottomRight = bottomLeft + 1;

			// Premier triangle de la cellule
			indices.push(topLeft, bottomLeft, bottomRight);
			// Deuxième triangle de la cellule
			indices.push(topLeft, bottomRight, topRight);
		}
	}

	// Création d'un mesh personnalisé dans Babylon.js
	glo.ribbon = new BABYLON.Mesh("fibonacci", glo.scene);
	let vertexData = new BABYLON.VertexData();
	vertexData.positions = positions;
	vertexData.indices = indices;

	// Calcul des normales pour un bon éclairage
	vertexData.normals = [];
	BABYLON.VertexData.ComputeNormals(positions, indices, vertexData.normals);

	// Application des données au mesh
	vertexData.applyToMesh(glo.ribbon, true);

	glo.curves.paths = paths;
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
				  glo.params.text_input_suit_z, glo.params.text_input_suit_alpha,
				  glo.params.text_input_suit_beta, glo.input_eval_x.text, glo.input_eval_y.text].map(input => regOne(input));
	
	return {isU: inputs.some(input => input.includes('u') || input.includes('à') || input.includes('m')),
		    isV: inputs.some(input => input.includes('v') || input.includes('à') || input.includes('m') )};
}

function isDel(){
	return glo.input_delX.text || glo.input_delY.text || glo.input_delZ.text;
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

function isClosedPaths(paths) {
    if (paths.length < 2) return false;
    
    const firstPath = paths[0];
    const lastPath = paths[paths.length - 1];
    
    if (firstPath.length !== lastPath.length) return false;
    
    return firstPath.every((point, index) => 
        BABYLON.Vector3.Distance(point, lastPath[index]) < ep
    );
}