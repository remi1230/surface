BABYLON.Mesh.prototype.moyPos = function() {
	const paths = glo.curves.paths;

	let nbPaths = 0, x = 0, y = 0, z = 0;
	paths.forEach(line => {
		line.forEach(vect => {
			x += vect.x; y += vect.y; z += vect.z;
			nbPaths++;
		});
	});

	return new BABYLON.Vector3(x/nbPaths, y/nbPaths, z/nbPaths);
};

BABYLON.Mesh.prototype.extremePos = function() {
	const positions = glo.ribbon.savePos ? glo.ribbon.savePos.slice() : glo.ribbon.getPositionData();
	const posLength = positions.length;

	let x = 0, y = 0, xUp = positions[0], xBottom = positions[0], yUp = positions[1], yBottom = positions[1], zUp = positions[2], zBottom = positions[2];
	for(let i = 2; i < posLength; i+=3){
		if(positions[i-2] > xUp)    { xUp     = positions[i-2]; }
		if(positions[i-2] < xBottom){ xBottom = positions[i-2]; }
		if(positions[i-1] > yUp)    { yUp     = positions[i-1]; }
		if(positions[i-1] < yBottom){ yBottom = positions[i-1]; }
		if(positions[i] > zUp)    { zUp     = positions[i]; }
		if(positions[i] < zBottom){ zBottom = positions[i]; }
	}

	const a = Math.abs;
	const width  = a(xUp - xBottom);
	const depht  = a(yUp - yBottom);
	const height = a(zUp - zBottom);

	return {x: {min: xBottom, max: xUp, dist: width}, y: {min: yBottom, max: yUp, dist: depht}, z: {min: zBottom, max: zUp, dist: height}, positions: positions};
};

BABYLON.Mesh.prototype.pathsInfos = function() {
	const paths = this.getPaths();

	let distsPaths = [], distMax = 0, nbPaths = 0;
	paths.forEach(line => {
		line.forEach((vect, i) => {
			const dist = i ? BABYLON.Vector3.Distance(line[i-1], vect) : BABYLON.Vector3.Distance(vect, line[i+1]);
			if(dist > distMax){ distMax = dist; }
			distsPaths.push(dist);
			nbPaths++;
		});
	});

	const distMoy = distsPaths.reduce((acc, val) => acc + val, 0) / nbPaths;

	return {distMoy, distMax};
};

BABYLON.Mesh.prototype.gridScale = function() {
	const gridSize = 30;
	const extremePos = this.extremePos();

	const dist    = {x: extremePos.x.dist, y: extremePos.y.dist, z: extremePos.z.dist};
	const distMax = dist.x > dist.y ? (dist.x > dist.z ? dist.x : dist.z) : (dist.y > dist.z ? dist.y : dist.z);

	return gridSize/distMax;
};

BABYLON.Mesh.prototype.moyPosToOrigin = function(noSpecialCurvature = false) {
	const gridScale   = glo.params.gridScale ? this.gridScale() : 1;
	const boundingBox = glo.ribbon.getBoundingInfo().boundingBox;
	const centerMesh  = boundingBox.center;

	if(glo.coordsType == 'curvature' && !noSpecialCurvature){
		transformMesh('position', 'x', 0);
		transformMesh('position', 'y', 0);
		transformMesh('position', 'z', 0);

		return false;
	}

	transformMesh('position', 'x', -centerMesh.x * gridScale);
	transformMesh('position', 'y', -centerMesh.y * gridScale);
	transformMesh('position', 'z', -centerMesh.z * gridScale);
};

BABYLON.Mesh.prototype.axisToOrigin = function(axis) {
	const boundingBox     = glo.ribbon.getBoundingInfo().boundingBox;
	const extendSizeWorld = boundingBox.extendSizeWorld;

	transformMesh('position', axis, -extendSizeWorld[axis]);

};

BABYLON.Mesh.prototype.getPaths = function(verticesDatas = this.getVerticesData(BABYLON.VertexBuffer.PositionKind), coeff) {
	let paths = [];
	let n = 0;

	const nbU    = !glo.params.fractalize.actived ? glo.params.steps_u : glo.params.fractalize.steps.u;
	const stepsU = coeff ? ((nbU + 1) * coeff) : (!glo.params.fractalize.actived ? glo.pathsInfos.u : nbU);
	const stepsV = !glo.params.fractalize.actived ? glo.params.steps_v : glo.params.fractalize.steps.v;
	for(let i = 0; i <= stepsU - 1; i++){
		paths[i] = [];
		for(let j = 0; j <= stepsV; j++){
			const v = { x: verticesDatas[n*3], y: verticesDatas[n*3 + 1], z: verticesDatas[n*3 + 2] };
			paths[i].push(new BABYLON.Vector3(v.x, v.y, v.z));

			n++;
		}
	}
	return paths;
};

BABYLON.Mesh.prototype.markAsDirtyAll = function() {
	this.markAsDirty(BABYLON.Mesh.POSITION_KIND);
	this.markAsDirty(BABYLON.Mesh.NORMAL_KIND );
	this.markAsDirty(BABYLON.Mesh.UV_KIND );
	this.markAsDirty(BABYLON.Mesh.TANGENT_KIND );
	this.markAsDirty(BABYLON.Mesh.COLOR_KIND );

	this.markVerticesDataAsUpdatable(BABYLON.VertexBuffer.NormalKind, true);
};

BABYLON.Mesh.prototype.getCurvatures = function(paths = glo.ribbon.getPaths()) {
    const pathsLength = paths.length;
    let curvatures = [];

    for(let i = 1; i < pathsLength - 1; i++){
        const pathLength = paths[i].length;
        for(let j = 1; j < pathLength - 1; j++){
            const pathBeforePoint = paths[i][j-1];
            const pathOnPoint = paths[i][j];
            const pathAfterPoint = paths[i][j+1];
            const pathOrthoBeforePoint = paths[i-1][j];
            const pathOrthoOnPoint = paths[i][j];
            const pathOrthoAfterPoint = paths[i+1][j];


            const vectorBeforePoint = new BABYLON.Vector3(pathOnPoint.x - pathBeforePoint.x, pathOnPoint.y - pathBeforePoint.y, pathOnPoint.z - pathBeforePoint.z);
            const vectorAfterPoint = new BABYLON.Vector3(pathAfterPoint.x - pathOnPoint.x, pathAfterPoint.y - pathOnPoint.y, pathAfterPoint.z - pathOnPoint.z);
            const vectorOrthoBeforePoint = new BABYLON.Vector3(pathOrthoOnPoint.x - pathOrthoBeforePoint.x, pathOrthoOnPoint.y - pathOrthoBeforePoint.y, pathOrthoOnPoint.z - pathOrthoBeforePoint.z);
            const vectorOrthoAfterPoint = new BABYLON.Vector3(pathOrthoAfterPoint.x - pathOrthoOnPoint.x, pathOrthoAfterPoint.y - pathOrthoOnPoint.y, pathOrthoAfterPoint.z - pathOrthoOnPoint.z);

            // Calcul du vecteur résultant pour le plan principal
            const resultVector = vectorBeforePoint.add(vectorAfterPoint);

            // Calcul du vecteur résultant pour les vecteurs orthogonaux
            const resultVectorOrtho = vectorOrthoBeforePoint.add(vectorOrthoAfterPoint);

            // Calcul des angles d'azimut et d'élévation pour les vecteurs résultants
            const azimuthResult = calculateAzimuth(resultVector);
            const elevationResult = calculateElevation(resultVector);
            const azimuthResultOrtho = calculateAzimuth(resultVectorOrtho);
            const elevationResultOrtho = calculateElevation(resultVectorOrtho);

            // Calcul des angles entre les vecteurs
            const angleBetweenPoints = calculateAngleBetweenVectors(vectorBeforePoint, vectorAfterPoint);
            const angleBetweenOrthoPoints = calculateAngleBetweenVectors(vectorOrthoBeforePoint, vectorOrthoAfterPoint);

			// Courbure
			const deltaS = vectorBeforePoint.length() + vectorAfterPoint.length();
			const curvature = angleBetweenPoints / deltaS;
			const radiusOfCurvature = round(1 / curvature, 2);

			const deltaSOrtho = vectorOrthoBeforePoint.length() + vectorOrthoAfterPoint.length();
			const curvatureOrtho = angleBetweenOrthoPoints / deltaSOrtho;
			const radiusOfCurvatureOrtho = round(1 / curvatureOrtho, 2);

            // Conversion des angles en degrés
            const angleBetweenPointsDegrees = 180 - round(BABYLON.Tools.ToDegrees(angleBetweenPoints), 2);
            let angleBetweenOrthoPointsDegrees = round(BABYLON.Tools.ToDegrees(angleBetweenOrthoPoints), 2);
			if(angleBetweenOrthoPointsDegrees !== 90){
				angleBetweenOrthoPointsDegrees = angleBetweenOrthoPointsDegrees < 90 ? 180 - angleBetweenOrthoPointsDegrees : angleBetweenOrthoPointsDegrees / 2;
			}
            const azimuthResultDegrees = round(BABYLON.Tools.ToDegrees(azimuthResult), 2);
            const elevationResultDegrees = round(BABYLON.Tools.ToDegrees(elevationResult), 2);
            const azimuthResultOrthoDegrees = round(BABYLON.Tools.ToDegrees(azimuthResultOrtho), 2);
            const elevationResultOrthoDegrees = round(BABYLON.Tools.ToDegrees(elevationResultOrtho), 2);

            curvatures.push({
                points: angleBetweenPointsDegrees,
                pointsOrtho: angleBetweenOrthoPointsDegrees,
                azimuth: azimuthResultDegrees,
                elevation: elevationResultDegrees,
                azimuthOrtho: azimuthResultOrthoDegrees,
                elevationOrtho: elevationResultOrthoDegrees,
				radius: radiusOfCurvature,
    			radiusOrtho: radiusOfCurvatureOrtho
            });
        }
    }

	function curvaturesDerive(prop){
		const val = a(a(curvatures[1][prop]) - a(curvatures[0][prop]));

		return curvatures.every((curvature, i) => {
			if(i){
				return a(a(curvature[prop]) - a(curvatures[i-1][prop])) === val; 
			}
	
			return true;
		}) ? val : false;
	}

    return {
        curvatures,
        pointsConstant: curvatures.every(curvature => curvature.points === curvatures[0].points) ? curvatures[0].points : false,
        pointsOrthoConstant: curvatures.every(curvature => curvature.pointsOrtho === curvatures[0].pointsOrtho) ? curvatures[0].pointsOrtho : false,
        azimutConstant: curvatures.every(curvature => curvature.azimuth === curvatures[0].azimuth) ? curvatures[0].azimuth : false,
        elevationConstant: curvatures.every(curvature => curvature.elevation === curvatures[0].elevation) ? curvatures[0].elevation : false,
        azimutOrthoConstant: curvatures.every(curvature => curvature.azimuthOrtho === curvatures[0].azimuthOrtho) ? curvatures[0].azimuthOrtho : false,
        elevationOrthoConstant: curvatures.every(curvature => curvature.elevationOrtho === curvatures[0].elevationOrtho) ? curvatures[0].elevationOrtho : false,
        radiusConstant: curvatures.every(curvature => curvature.radius === curvatures[0].radius) ? curvatures[0].radius : false,
        radiusOrthoConstant: curvatures.every(curvature => curvature.radiusOrtho === curvatures[0].radiusOrtho) ? curvatures[0].radiusOrtho : false,
        pointsDeriveConstant: curvaturesDerive('points'),
        pointsOrthoDeriveConstant: curvaturesDerive('pointsOrtho'),
        azimutDeriveConstant: curvaturesDerive('azimuth'),
        elevationDeriveConstant: curvaturesDerive('elevation'),
        azimutOrthoDeriveConstant: curvaturesDerive('azimuthOrtho'),
        elevationOrthoDeriveConstant: curvaturesDerive('elevationOrtho'),
        radiusDeriveConstant: curvaturesDerive('radius'),
        radiusOrthoDeriveConstant: curvaturesDerive('radiusOrtho'),
    };
};

BABYLON.Mesh.prototype.minimizeVertices = function() {
	var _pdata = this.getVerticesData(BABYLON.VertexBuffer.PositionKind);
	var _ndata = this.getVerticesData(BABYLON.VertexBuffer.NormalKind);
	var _idata = this.getIndices();

	var _newPdata = []; //new positions array
	var _newIdata =[]; //new indices array

	var _mapPtr =0; // new index;
	var _uniquePositions = []; // unique vertex positions
	for(var _i=0; _i<_idata.length; _i+=3) {
		var _facet = [_idata[_i], _idata[_i + 1], _idata[_i+2]]; //facet vertex indices
		var _pstring = []; //lists facet vertex positions (x,y,z) as string "xyz""
		for(var _j = 0; _j<3; _j++) { //
			_pstring[_j] = "";
			for(var _k = 0; _k<3; _k++) {
				//small values make 0
				if (Math.abs(_pdata[3*_facet[_j] + _k]) < 0.0001) {
					_pdata[3*_facet[_j] + _k] = 0;
				}
				_pstring[_j] += _pdata[3*_facet[_j] + _k] + "|";
			}
			_pstring[_j] = _pstring[_j].slice(0, -1);		
		}
		//check facet vertices to see that none are repeated
		// do not process any facet that has a repeated vertex, ie is a line
		if(!(_pstring[0] == _pstring[1] || _pstring[0] == _pstring[2] || _pstring[1] == _pstring[2])) {		
			//for each facet position check if already listed in uniquePositions
			// if not listed add to uniquePositions and set index pointer
			// if listed use its index in uniquePositions and new index pointer
			for(var _j = 0; _j<3; _j++) { 
				var _ptr = _uniquePositions.indexOf(_pstring[_j])
				if(_ptr < 0) {
					_uniquePositions.push(_pstring[_j]);
					_ptr = _mapPtr++;
					//not listed so add individual x, y, z coordinates to new positions array newPdata
					//and add matching normal data to new normals array newNdata
					for(var _k = 0; _k<3; _k++) {
						_newPdata.push(_pdata[3*_facet[_j] + _k]);
					}
				}
				// add new index pointer to new indices array newIdata
				_newIdata.push(_ptr);
			}
		}
	}

	this.reBuildVertexData(_newIdata);
}

BABYLON.Mesh.prototype.reBuildVertexData = function(newIndices = this.getIndices()) {
    // Récupérer les données de vertex actuelles
    let _currentPdata = this.getVerticesData(BABYLON.VertexBuffer.PositionKind);

    // Utiliser les données actuelles pour recalculer les normales
    let _newNdata = [];
    BABYLON.VertexData.ComputeNormals(_currentPdata, newIndices, _newNdata);

    // Créer un nouvel objet de données de vertex et mettre à jour le maillage
    var _vertexData = new BABYLON.VertexData();
    _vertexData.positions = _currentPdata; // Utiliser les positions actuelles
    _vertexData.indices   =  newIndices; // Utiliser les indices actuels
    _vertexData.normals   = _newNdata;     // Utiliser les nouvelles normales calculées

    _vertexData.applyToMesh(this, true); // Le deuxième paramètre à true pour mettre à jour les données existantes
};

BABYLON.Mesh.prototype.checkerboard = function(nb = glo.params.checkerboard, stepCoeff = glo.params.checkerboardNbSteps){
	let indices = this.getIndices();

	nb *= 3;
	const start = nb - 1;
	const step  = stepCoeff * nb;

	let newIndices = [];
	for(let i = start; i < indices.length; i+=step){
		for(let j = start; j >= 0; j--){
			newIndices.push(indices[i-j]);
		}
	}

	this.reBuildVertexData(newIndices);
}

BABYLON.Mesh.prototype.tIndices = function() {
	// Récupérer les données de vertex actuelles
    let _currentPdata = this.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    let _currentIdata = this.cIndices();

    // Utiliser les données actuelles pour recalculer les normales
    let _newNdata = [];
    BABYLON.VertexData.ComputeNormals(_currentPdata, _currentIdata, _newNdata);

    // Créer un nouvel objet de données de vertex et mettre à jour le maillage
    var _vertexData = new BABYLON.VertexData();
    _vertexData.positions = _currentPdata; // Utiliser les positions actuelles
    _vertexData.indices   = _currentIdata; // Utiliser les indices actuels
    _vertexData.normals   = _newNdata;     // Utiliser les nouvelles normales calculées

    _vertexData.applyToMesh(this, true); // Le deuxième paramètre à true pour mettre à jour les données existantes
}
BABYLON.Mesh.prototype.cIndices = function() {
    let inds = this.getIndices();

	const lims = {u: glo.params.steps_u, v: glo.params.steps_v};

	let nInds = [inds[0]];

	let dInds = [];
	for(let i = 1; i < inds.length; i++){
		const diffInds = inds[i] - inds[i-1];
		if(diffInds !== lims.u && diffInds !== -lims.u && diffInds !== lims.v && diffInds !== -lims.v &&
		   diffInds !== lims.u + 1 && diffInds !== -(lims.u + 1) && diffInds !== lims.v  + 1 && diffInds !== -(lims.v + 1)){
			dInds.push({indLessOne: i-1, ind: i, valIndLessOne: inds[i-1], valInd: inds[i], diffInds: diffInds});
		}
		else{ nInds.push(inds[i]); }
	}

	return nInds;
}

BABYLON.Mesh.prototype.isPointAroundOrigin = function() {
	return this.getPaths().some(path => 
		path.some(vect => h(vect.x, vect.y, vect.z) < ep)
	);
}

BABYLON.Mesh.prototype.fractalize = async function() {
    const fractalize        = glo.params.fractalize;
    const formeToFractalize = glo.formeToFractalize;

    const scale = {all: fractalize.scale.all, x: fractalize.scale.x, y: fractalize.scale.y, z: fractalize.scale.z};

	scale.x *= scale.all;
	scale.y *= scale.all;
	scale.z *= scale.all;

	const mainOptions = !formeToFractalize ? 
		{
			
			x: glo.params.text_input_x,
			y: glo.params.text_input_y,
			z: glo.params.text_input_z,
			alpha: glo.params.text_input_alpha,
			beta: glo.params.text_input_beta,
			
		} :
		{
			x: formeToFractalize.fx,
			y: formeToFractalize.fy,
			z: formeToFractalize.fz,
			alpha: '',
			beta: '',
		}
	;
	const secondOptions = !formeToFractalize ? 
		{
			x: glo.params.text_input_suit_x,
			y: glo.params.text_input_suit_y,
			z: glo.params.text_input_suit_z,
			alpha: glo.params.text_input_suit_alpha,
			beta: glo.params.text_input_suit_beta,
			theta: glo.params.text_input_suit_theta,
		} :
		{
			x: '',
			y: '',
			z: '',
			alpha: formeToFractalize.alpha,
			beta: formeToFractalize.beta,
			theta: formeToFractalize.theta,
		}
	;

    // Génération des courbes de chemin
    makeOnlyCurves({
        u: { min: -glo.params.u, max: glo.params.u, nb_steps: fractalize.steps.u },
        v: { min: -glo.params.v, max: glo.params.v, nb_steps: fractalize.steps.v },
    },
    mainOptions, secondOptions, false, !formeToFractalize ? false : formeToFractalize.typeCoords);

    const paths = glo.curves.paths;

    // Calcul des tangentes pour chaque chemin si l'orientation est activée
    if (glo.fractalizeOrient) {
        for (const path of paths) {
            const tangents = [];
            for (let i = 0; i < path.length - 1; i++) {
                let tangent = path[i + 1].subtract(path[i]).normalize();
                tangents.push(tangent);
            }
            tangents.push(tangents[tangents.length - 1]); // Dernière tangente identique à l'avant-dernière pour la cohérence
            path.tangents = tangents;
        }
    }

    // Calcul des distances successives et orthogonales entre les points
    let distMoy = 0;
    if (fractalize.scaleToDistPath) {
        let n = 0;
        for (const path of paths) {
            const dists = [], distsOrtho = [], distsAll = [];
            for (let i = 0; i < path.length - 1; i++) {
                let distSuccessive = BABYLON.Vector3.Distance(path[i], path[i + 1]);
                let distOrtho = (n + 1 < paths.length) ? BABYLON.Vector3.Distance(path[i], paths[n + 1][i]) : 0;
                dists.push(distSuccessive);
                distsOrtho.push(distOrtho);
                distsAll.push((distSuccessive + distOrtho) / 2); // Moyenne entre distances successives et orthogonales
            }
            dists.push(dists[dists.length - 1]);
            distsOrtho.push(distsOrtho[distsOrtho.length - 1]);
            distsAll.push(distsAll[distsAll.length - 1]);

            path.dists = dists;
            path.distsOrtho = distsOrtho;
            path.distsAll = distsAll;
            path.distMoy = dists.reduce((acc, val) => acc + val, 0) / path.length;
            path.distMoyOrtho = distsOrtho.reduce((acc, val) => acc + val, 0) / path.length;
            path.distMoyTot = (path.distMoy + path.distMoyOrtho) / 2;

            n++;
        }
        distMoy = paths.reduce((acc, val) => acc + val.distMoyTot, 0) / paths.length;
    }

	paths.pop();
	//paths.forEach((path, i) => paths[i].pop());

    let newRibbons = [];
    await paths.forEach(async (path, i) => {
        const pathIndex = paths.indexOf(path);  // Utiliser l'index du chemin courant
        await path.forEach(async (vect, j) => {
			if(!vect.isNearToOneVect(paths.flat(), ep/100)){
				let newRibbon = await this.clone();
				newRibbon.position = vect;
				if (!fractalize.scaleToDistPath) { newRibbon.scaling = new BABYLON.Vector3(0.1 * scale.x, 0.1 * scale.y, 0.1 * scale.z); }

				// Ajuster l'échelle des meshes en fonction de la distance
				if (fractalize.scaleToDistPath) {
					const distSuccessive = (j < path.length - 1) ? BABYLON.Vector3.Distance(vect, path[j + 1]) : BABYLON.Vector3.Distance(vect, path[j - 1]);
					const distOrtho = (pathIndex + 1 < paths.length) ? BABYLON.Vector3.Distance(vect, paths[pathIndex + 1][j]) : BABYLON.Vector3.Distance(vect, paths[pathIndex - 1][j]);

					// Calcul des rayons des meshes actuels et voisins (successifs ou orthogonaux)
					const currentRadius = newRibbon.getBoundingInfo().boundingSphere.radiusWorld;
					const neighborRadius = (j < path.length - 1)
						? this.getBoundingInfo().boundingSphere.radiusWorld // Mesh suivant
						: newRibbons[newRibbons.length - 1].getBoundingInfo().boundingSphere.radiusWorld; // Mesh précédent

					// Calcul du coefficient pour ajuster l'échelle afin que les meshes se touchent juste
					const totalRadius = currentRadius + neighborRadius;
					const totalDist = (distSuccessive + distOrtho) / 2; // Moyenne entre successif et orthogonal
					const scaleFactor = totalRadius !== 0 ? (totalDist / totalRadius) : 1; // Protection contre la division par 0

					newRibbon.scaling = new BABYLON.Vector3(
						newRibbon.scaling.x * scaleFactor * scale.x,
						newRibbon.scaling.y * scaleFactor * scale.y,
						newRibbon.scaling.z * scaleFactor * scale.z
					);
				}

				// Appliquer les rotations pour l'orientation des meshes
				if (glo.fractalizeOrient) {
					const tangent = path.tangents[j];
					const upVector = glo.fractalizeOrient;
					const axis = BABYLON.Vector3.Cross(upVector, tangent).normalize();
					const angle = Math.acos(BABYLON.Vector3.Dot(upVector, tangent));

					newRibbon.rotationQuaternion = BABYLON.Quaternion.RotationAxis(axis, angle);
					newRibbon.rotationQuaternion = newRibbon.rotationQuaternion.multiply(
						BABYLON.Quaternion.RotationYawPitchRoll(fractalize.rot.y, fractalize.rot.x, fractalize.rot.z)
					);
				}

				// Ajouter les rotations supplémentaires en fonction des paramètres
				newRibbon.rotation.x += fractalize.rot.x;
				newRibbon.rotation.y += fractalize.rot.y;
				newRibbon.rotation.z += fractalize.rot.z;

				newRibbons.push(newRibbon);
			}
			else{
				paths[i][j].yetNearToPath = true;
			}
        });
    });

    // Fusionner les meshes
    await glo.ribbon.dispose();
    glo.ribbon = await BABYLON.Mesh.MergeMeshes(newRibbons, true, true, undefined, false, false);

    const positions = await glo.ribbon.getPositionData();
    glo.ribbon.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions, true);

    glo.curves.paths = glo.ribbon.getPaths(positions, (fractalize.steps.u + 1) * fractalize.steps.v);
    glo.lines = glo.curves.paths;
    glo.ribbon.savePos = positions.slice();
};

BABYLON.Vector3.prototype.isNearToOneVect = function(vects, dist) {
	return vects.some(vect => vect !== this && !this.yetNearToPath && !vect.yetNearToPath ? BABYLON.Vector3.Distance(this, vect) < dist : false);
}