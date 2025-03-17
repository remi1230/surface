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

		const boundingSphere = glo.ribbon.getBoundingInfo().boundingSphere;

		// Définir le centre de rotation
		if(!center){
			center = !glo.rotateByMeshCenter ? boundingSphere.centerWorld : boundingSphere.center;
		}

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

function S(val, cp = true){
	return cp ? cpow(val, val) : val**val;
}

function µ(res, varForSign){
	return sign(varForSign) === sign(res) ? res : -res;
}

function round(val, pre){
	prePow = 10**pre;
	return Math.round(val * prePow, pre) / prePow;
}

function directionXY(angleXY, dist, positive = 1){
	return {
		x: Math.cos(angleXY.y) * Math.cos(angleXY.x) * positive * dist,
		y: Math.sin(angleXY.y) * positive * dist,
		z: Math.cos(angleXY.y) * Math.sin(angleXY.x) * positive * dist
	};
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

function getAzimuthElevationAngles(vector, center = { x: 0, y: 0, z: 0 }) {
    // Calcul des coordonnées relatives du vecteur par rapport au centre
    var relativeX = vector.x - center.x;
    var relativeY = vector.y - center.y;
    var relativeZ = vector.z - center.z;

    // Calcul de l'angle d'azimut (angle autour de l'axe Y)
    var azimuth = Math.atan2(relativeZ, relativeX);

    // Calcul de l'angle d'élévation (angle par rapport au plan horizontal)
    var elevation = Math.atan2(relativeY, Math.sqrt(relativeX * relativeX + relativeZ * relativeZ));

    return { x: azimuth, y: elevation };
}


function getAzimuthElevationAnglesSave(vector) {
    // Calcul de l'angle d'azimut (angleX)
    var azimuth = Math.atan2(vector.z, vector.x);

    // Calcul de l'angle d'élévation (angleY)
    var elevation = Math.atan2(vector.y, Math.sqrt(vector.x * vector.x + vector.z * vector.z));

    return { x: azimuth, y: elevation };
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

function scaleNoSignToSign(value){
	if(value > 0){ return ++value; }
	else{ return 1/(-value+1); }
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

function code_car(car){
	return parseInt(car.charCodeAt());
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

	obj.U = function(...arr){
		return arr.reduce(function(a,b) { return Math.max(a, b); });
	};
	obj.V = function(...arr){
		return arr.reduce(function(a,b) { return Math.min(a, b); });
	};

	obj.W = function(x) {
		const phi = (1 + Math.sqrt(5)) / 2;
		return (Math.pow(phi, x) - Math.cos(Math.PI * x) * Math.pow(phi, -x)) / Math.sqrt(5);
	};

	obj.èé = function(n) {
		function gamma(z) {
			const g = 7;
			const p = [
				0.99999999999980993,
				676.5203681218851,
				-1259.1392167224028,
				771.32342877765313,
				-176.61502916214059,
				12.507343278686905,
				-0.13857109526572012,
				9.9843695780195716e-6,
				1.5056327351493116e-7
			];
			if (z < 0.5) {
				return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
			} else {
				z -= 1;
				let x = p[0];
				for (let i = 1; i < p.length; i++) {
					x += p[i] / (z + i);
				}
				const t = z + g + 0.5;
				return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
			}
		}
		return gamma(n + 1);
	};

	obj.é = function(val, pre = 1) {
		let precision = 1 / Math.pow(2, pre - 1);
		return Math.ceil(val / precision) * precision;
	};

	obj.è = function(val){
		val = val ? val : 1;
		return Math.sign(val) * Math.log(Math.abs(val));
	};

	obj.éé = function(val){
		return Math.acos(val);
	};

	obj.èè = function(val){
		return Math.asin(val);
	};

	obj.éè = function(val){
		return Math.asin(val) * Math.acos(val);
	};

	obj.ç = function(val){
		return Math.cosh(val);
	};

	obj.çç = function(val){
		return Math.sinh(val);
	};

	obj.ù = function(a = glo.currentCurveInfos.u, b = glo.currentCurveInfos.v, t = 0){
		return a + (b-a)*t;
	};
	obj.se = function(n, div = 1){
		const m = Math.abs(n);
		return Math.sign(n) * ((m*(m+1)) / (2*div));
	};
	obj.à = function(nbU = 8, nbV = nbU){
		return cos(nbU * glo.currentCurveInfos.u) * sin(nbV * glo.currentCurveInfos.v);
	};
}
addCommonTools(this);