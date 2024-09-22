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

BABYLON.Mesh.prototype.moyPosToOrigin = function() {
	const moyPos = this.moyPos();

	transformMesh('position', 'x', -moyPos.x);
	transformMesh('position', 'y', -moyPos.y);
	transformMesh('position', 'z', -moyPos.z);
};

BABYLON.Mesh.prototype.getPaths = function(verticesDatas = this.getVerticesData(BABYLON.VertexBuffer.PositionKind), coeff) {
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