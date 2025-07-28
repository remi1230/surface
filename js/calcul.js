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

function convexHull(points) {
    if (points.length < 4) {
        throw new Error("Au moins 4 points requis pour construire un convex hull en 3D");
    }
    
    // Fonctions utilitaires
    function subtract(a, b) {
        return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    }
    function cross(a, b) {
        return {
            x: a.y * b.z - a.z * b.y,
            y: a.z * b.x - a.x * b.z,
            z: a.x * b.y - a.y * b.x
        };
    }
    function dot(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }
    function distanceToPlane(pt, face) {
        // face: { normal, offset, vertices }
        return dot(face.normal, pt) + face.offset;
    }
    function computeFaceNormal(i, j, k) {
        let a = points[i], b = points[j], c = points[k];
        let u = subtract(b, a), v = subtract(c, a);
        let normal = cross(u, v);
        let len = Math.sqrt(dot(normal, normal));
        if (len > 0) {
            normal.x /= len;
            normal.y /= len;
            normal.z /= len;
        }
        return normal;
    }
    
    // --- Étape 1 : Création du premier tétraèdre ---
    // Recherche des points extrêmes selon x
    let minX = 0, maxX = 0;
    for (let i = 1; i < points.length; i++) {
        if (points[i].x < points[minX].x) minX = i;
        if (points[i].x > points[maxX].x) maxX = i;
    }
    let v0 = minX, v1 = maxX;
    
    // Trouver le point le plus éloigné de la ligne v0-v1
    let maxDist = -Infinity, v2 = -1;
    let lineDir = subtract(points[v1], points[v0]);
    let lineLength = Math.sqrt(dot(lineDir, lineDir));
    for (let i = 0; i < points.length; i++) {
        if (i === v0 || i === v1) continue;
        let diff = subtract(points[i], points[v0]);
        let d = Math.sqrt(dot(cross(diff, lineDir), cross(diff, lineDir))) / lineLength;
        if (d > maxDist) { maxDist = d; v2 = i; }
    }
    
    // Trouver le point le plus éloigné du plan défini par (v0, v1, v2)
    let normal = computeFaceNormal(v0, v1, v2);
    let offset = -dot(normal, points[v0]);
    maxDist = -Infinity;
    let v3 = -1;
    for (let i = 0; i < points.length; i++) {
        if (i === v0 || i === v1 || i === v2) continue;
        let d = Math.abs(dot(normal, points[i]) + offset);
        if (d > maxDist) { maxDist = d; v3 = i; }
    }
    if (v3 === -1) {
        throw new Error("Tous les points sont coplanaires");
    }
    
    // --- Étape 2 : Création des faces du tétraèdre ---
    let faces = [];
    function addFace(i, j, k) {
        let normal = computeFaceNormal(i, j, k);
        let offset = -dot(normal, points[i]);
        faces.push({ vertices: [i, j, k], normal, offset, outside: [] });
    }
    
    // On détermine l'orientation en testant la position de v3 par rapport à la face (v0,v1,v2)
    let d = dot(normal, points[v3]) + offset;
    if (d > 0) {
        // v3 est au-dessus, orientation correcte
        addFace(v0, v1, v2);
        addFace(v0, v3, v1);
        addFace(v1, v3, v2);
        addFace(v2, v3, v0);
    } else {
        // v3 est en dessous, inverser l'ordre pour la première face
        addFace(v0, v2, v1);
        addFace(v0, v1, v3);
        addFace(v1, v2, v3);
        addFace(v2, v0, v3);
    }
    
    // Associer chaque point non utilisé aux faces s’il se trouve à l'extérieur
    for (let i = 0; i < points.length; i++) {
        if (i === v0 || i === v1 || i === v2 || i === v3) continue;
        for (let face of faces) {
            if (distanceToPlane(points[i], face) > 1e-6) {
                face.outside.push(i);
            }
        }
    }
    
    // --- Étape 3 : Boucle principale du QuickHull ---
    function getFurthestPoint(face) {
        let maxD = -Infinity, furthest;
        for (let idx of face.outside) {
            let d = distanceToPlane(points[idx], face);
            if (d > maxD) { maxD = d; furthest = idx; }
        }
        return furthest;
    }
    
    function visibleFacesFromPoint(pIndex) {
        let vis = [];
        for (let face of faces) {
            if (distanceToPlane(points[pIndex], face) > 1e-6) {
                vis.push(face);
            }
        }
        return vis;
    }
    
    while (faces.some(face => face.outside.length > 0)) {
        // Sélection d'une face ayant des points à l'extérieur
        let face = faces.find(face => face.outside.length > 0);
        let p = getFurthestPoint(face);
        
        // Récupérer toutes les faces visibles depuis le point p
        let visible = visibleFacesFromPoint(p);
        
        // Déterminer l'horizon : les arêtes communes entre faces visibles et non visibles
        let horizon = [];
        function addEdge(a, b) {
            // Si l'arête inverse existe déjà, on la retire (elle est interne)
            for (let i = 0; i < horizon.length; i++) {
                let edge = horizon[i];
                if (edge[0] === b && edge[1] === a) {
                    horizon.splice(i, 1);
                    return;
                }
            }
            horizon.push([a, b]);
        }
        for (let f of visible) {
            let verts = f.vertices;
            addEdge(verts[0], verts[1]);
            addEdge(verts[1], verts[2]);
            addEdge(verts[2], verts[0]);
        }
        
        // Retirer les faces visibles du hull
        faces = faces.filter(f => visible.indexOf(f) === -1);
        
        // Créer de nouvelles faces reliant p aux arêtes de l'horizon
        let newFaces = [];
        for (let edge of horizon) {
            let i = edge[0], j = edge[1];
            let normal = computeFaceNormal(i, j, p);
            let offset = -dot(normal, points[i]);
            newFaces.push({ vertices: [i, j, p], normal, offset, outside: [] });
        }
        
        // Regrouper les points extérieurs des faces supprimées
        let allOutside = [];
        for (let f of visible) {
            allOutside = allOutside.concat(f.outside);
        }
        // Retirer le point p et les doublons
        allOutside = allOutside.filter((idx, i, self) => idx !== p && self.indexOf(idx) === i);
        // Réassigner les points aux nouvelles faces
        for (let idx of allOutside) {
            for (let face of newFaces) {
                if (distanceToPlane(points[idx], face) > 1e-6) {
                    face.outside.push(idx);
                }
            }
        }
        faces = faces.concat(newFaces);
    }
    
    // --- Étape 4 : Extraction des indices du convex hull ---
    let indices = [];
    for (let face of faces) {
        indices.push(face.vertices[0], face.vertices[1], face.vertices[2]);
    }
    return indices;
}

function rgbNormalizedToHex({ r, g, b }) {
	// Convertit chaque composante en entier entre 0 et 255
	const to255 = x => Math.round(Math.min(1, Math.max(0, x)) * 255);

	// Convertit en hex, en ajoutant un 0 si besoin
	const toHex = x => to255(x).toString(16).padStart(2, '0');

	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}