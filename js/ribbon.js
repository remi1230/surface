//*****************************************************************************************************//
//********************************************MAIN FUNCTIONS*******************************************//
//*****************************************************************************************************//
async function make_curves(){
	if(typeof(glo.curves) != "undefined"){
		glo.curves = {}; delete glo.curves;
	}

	makeOnlyCurves();

	glo.params.meshTransformations.run();
}

function makeOnlyCurves() {
	// Utiliser GPUShaderMesh
	const meshResult = createShaderMeshFromGlo();
	glo.ribbon = meshResult ? meshResult : glo.ribbon;
	glo.fromShader = true;

	// Appliquer la déformation si une expression existe
	if (glo.ribbon && glo.ribbon.shaderMeshInstance) {
		const deformText = glo.input_sym_r ? glo.input_sym_r.text : null;
		if (deformText && deformText.trim()) {
			glo.ribbon.shaderMeshInstance.updateDeformationExpression(deformText);
		}
	}
	if (glo.params.checkerboard) { glo.ribbon.checkerboard(); }
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

async function remakeRibbon(){
	await make_curves(); 
}

function getPathsInfos(){
	const coeffSym = countSyms();
	glo.pathsInfos = {u: (glo.params.steps_u + 1) * coeffSym, v: glo.params.steps_v + 1};
}

async function exportMeshToSTL(mesh, filename){
	let meshForSTL = mesh;

	// Si c'est un shader mesh, extraire les positions réelles du GPU
	if (mesh.shaderMeshInstance) {
		meshForSTL = mesh.shaderMeshInstance.createExportMesh();
		if (!meshForSTL) {
			console.error('[STL Export] Impossible d\'extraire les positions du shader mesh');
			return;
		}
	}

	let stlString = BABYLON.STLExport.CreateSTL([meshForSTL], false, true);

	// Nettoyer le mesh temporaire d'export
	if (meshForSTL !== mesh) {
		meshForSTL.dispose();
	}

	let blob = new Blob([stlString], { type: 'text/plain' });
	let link = document.createElement('a');
	link.href = URL.createObjectURL(blob);
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

/**
 * Builds positions, normals, triangle indices from a grid of paths,
 * creates a shader mesh, and assigns it to glo.ribbon.
 * Shared by importOBJMesh() and importAppOBJ().
 */
function buildMeshFromPaths(paths, fileName) {
	const stepsU = paths.length - 1;
	const stepsV = paths[0].length - 1;
	glo.params.steps_u = stepsU;
	glo.params.steps_v = stepsV;

	const numVertices = paths.length * paths[0].length;
	const positions = new Float32Array(numVertices * 3);
	const normals   = new Float32Array(numVertices * 3);

	// Fill positions from paths grid
	for (let i = 0; i <= stepsU; i++) {
		for (let j = 0; j <= stepsV; j++) {
			const idx = i * (stepsV + 1) + j;
			const v = paths[i][j];
			positions[idx * 3]     = v.x;
			positions[idx * 3 + 1] = v.y;
			positions[idx * 3 + 2] = v.z;
		}
	}

	// Compute normals by finite differences on the grid
	for (let i = 0; i <= stepsU; i++) {
		for (let j = 0; j <= stepsV; j++) {
			const idx = i * (stepsV + 1) + j;
			const p   = paths[i][j];
			const pi1 = (i < stepsU) ? paths[i + 1][j] : paths[i][j];
			const pi0 = (i > 0)      ? paths[i - 1][j] : paths[i][j];
			const tu  = pi1.subtract(pi0);
			const pj1 = (j < stepsV) ? paths[i][j + 1] : paths[i][j];
			const pj0 = (j > 0)      ? paths[i][j - 1] : paths[i][j];
			const tv  = pj1.subtract(pj0);
			let n = BABYLON.Vector3.Cross(tu, tv);
			const len = n.length();
			if (len > 0.0001) {
				n.scaleInPlace(1.0 / len);
			} else {
				const pl = p.length();
				n = pl > 0.001 ? p.scale(1.0 / pl) : new BABYLON.Vector3(0, 1, 0);
			}
			normals[idx * 3]     = n.x;
			normals[idx * 3 + 1] = n.y;
			normals[idx * 3 + 2] = n.z;
		}
	}

	// Triangle indices
	const triangleIndices = [];
	for (let i = 0; i < stepsU; i++) {
		for (let j = 0; j < stepsV; j++) {
			const idx00 = i * (stepsV + 1) + j;
			const idx10 = (i + 1) * (stepsV + 1) + j;
			const idx01 = i * (stepsV + 1) + (j + 1);
			const idx11 = (i + 1) * (stepsV + 1) + (j + 1);
			triangleIndices.push(idx00, idx10, idx01);
			triangleIndices.push(idx01, idx10, idx11);
		}
	}

	return assignImportedShaderMesh(
		positions, normals, new Uint32Array(triangleIndices),
		stepsU, stepsV, fileName,
		"Grid: " + (stepsU + 1) + " x " + (stepsV + 1)
	);
}

/**
 * Creates a shader mesh from raw buffers and assigns it to glo.ribbon.
 * Shared by buildMeshFromPaths() and importOBJWithBabylon().
 */
function assignImportedShaderMesh(positions, normals, indices, stepsU, stepsV, fileName, logInfo) {
	const coordsType = glo.coordsType || 'cartesian';
	const MeshClass  = getShaderMeshClass(coordsType);
	const shaderMesh = new MeshClass();

	const mesh = shaderMesh.createFromImportedMesh(positions, normals, indices, stepsU, stepsV);

	if (mesh) {
		glo.ribbon = mesh;
		glo.fromShader = true;
		glo.ribbon.refreshBoundingInfo();
		setTimeout(() => { glo.camera.focusOn([glo.ribbon], true); }, 0);
		console.log("OBJ imported successfully: " + fileName);
		if (logInfo) console.log(logInfo);
		return true;
	} else {
		console.error("Failed to create shader mesh from OBJ");
		return false;
	}
}

function importOBJMesh() {
	const input = document.createElement('input');
	input.type = 'file';
	input.accept = '.obj';
	input.style.display = 'none';
	document.body.appendChild(input);

	input.onchange = async function(event) {
		const file = event.target.files[0];
		if (!file) {
			document.body.removeChild(input);
			return;
		}

		const fileName = file.name;

		try {
			const text = await file.text();
			const objData = parseOBJFile(text);

			console.log("OBJ parsed: " + objData.vertices.length + " vertices, " + objData.faces.length + " faces");

			if (objData.vertices.length === 0) {
				console.error("No vertices found in OBJ file");
				document.body.removeChild(input);
				return;
			}

			// Convertir en grille pour déterminer stepsU / stepsV
			const paths = buildPathsFromOBJ(objData.vertices, objData.faces);

			if (paths.length === 0 || paths[0].length === 0) {
				console.error("Could not convert mesh to valid paths");
				document.body.removeChild(input);
				return;
			}

			buildMeshFromPaths(paths, fileName);

		} catch (error) {
			console.error("Error importing OBJ:", error);
		}

		document.body.removeChild(input);
	};

	input.click();
}

async function importOBJWithBabylon(file, fileName) {
	const OBJLoader = BABYLON.SceneLoader.GetPluginForExtension(".obj").constructor;
	const prevSkip = OBJLoader.SKIP_MATERIALS;
	OBJLoader.SKIP_MATERIALS = true;
	try {
		const blobUrl = URL.createObjectURL(file);

		const result = await BABYLON.SceneLoader.ImportMeshAsync("", "", blobUrl, glo.scene, null, ".obj");
		URL.revokeObjectURL(blobUrl);

		if (!result.meshes || result.meshes.length === 0) {
			console.error("No meshes found in OBJ file");
			return;
		}

		const validMeshes = result.meshes.filter(m => m.getTotalVertices() > 0);
		let importedMesh;
		if (validMeshes.length === 1) {
			importedMesh = validMeshes[0];
		} else {
			importedMesh = BABYLON.Mesh.MergeMeshes(validMeshes, true, true);
		}

		if (!importedMesh) {
			console.error("Failed to process imported OBJ meshes");
			result.meshes.forEach(m => m.dispose());
			return;
		}

		importedMesh.bakeCurrentTransformIntoVertices();

		const positions = importedMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
		let normals     = importedMesh.getVerticesData(BABYLON.VertexBuffer.NormalKind);
		const indices   = importedMesh.getIndices();

		importedMesh.dispose();

		if (!positions || !indices) {
			console.error("Failed to extract vertex data from OBJ");
			return;
		}

		if (!normals) {
			normals = new Float32Array(positions.length);
			BABYLON.VertexData.ComputeNormals(positions, indices, normals);
		}

		const numVertices = positions.length / 3;
		const stepsU = Math.round(Math.sqrt(numVertices)) - 1;
		const stepsV = Math.ceil(numVertices / (stepsU + 1)) - 1;
		glo.params.steps_u = stepsU;
		glo.params.steps_v = stepsV;

		assignImportedShaderMesh(
			new Float32Array(positions),
			new Float32Array(normals),
			new Uint32Array(indices),
			stepsU, stepsV, fileName,
			"Vertices: " + numVertices + ", Triangles: " + (indices.length / 3)
		);
	} catch (error) {
		console.error("Error importing OBJ:", error);
	} finally {
		OBJLoader.SKIP_MATERIALS = prevSkip;
	}
}

function parseOBJFile(text) {
	const vertices = [];
	const faces = [];
	const lines = text.split('\n');

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.startsWith('v ')) {
			const parts = trimmed.split(/\s+/);
			vertices.push(new BABYLON.Vector3(
				parseFloat(parts[1]),
				parseFloat(parts[2]),
				parseFloat(parts[3])
			));
		} else if (trimmed.startsWith('f ')) {
			const parts = trimmed.split(/\s+/).slice(1);
			const faceIndices = parts.map(p => {
				const idx = parseInt(p.split('/')[0]);
				return idx > 0 ? idx - 1 : vertices.length + idx;
			});
			faces.push(faceIndices);
		}
	}

	return { vertices, faces };
}

function buildPathsFromOBJ(vertices, faces) {
	const totalVertices = vertices.length;

	let gridV = detectGridStepFromFaces(faces, totalVertices);

	if (!gridV || totalVertices % gridV !== 0) {
		gridV = Math.round(Math.sqrt(totalVertices));
		while (totalVertices % gridV !== 0 && gridV > 2) {
			gridV--;
		}
	}

	const gridU = totalVertices / gridV;

	console.log("Grid: " + gridU + " x " + gridV + " (total: " + totalVertices + ")");

	const paths = [];
	for (let i = 0; i < gridU; i++) {
		const path = [];
		for (let j = 0; j < gridV; j++) {
			path.push(vertices[i * gridV + j].clone());
		}
		paths.push(path);
	}

	return paths;
}

function detectGridStepFromFaces(faces, totalVertices) {
	if (!faces || faces.length === 0) return null;

	const stepCounts = new Map();

	for (let i = 0; i < Math.min(faces.length, 200); i++) {
		const face = faces[i];
		for (let j = 0; j < face.length; j++) {
			for (let k = j + 1; k < face.length; k++) {
				const diff = Math.abs(face[j] - face[k]);
				if (diff > 1) {
					stepCounts.set(diff, (stepCounts.get(diff) || 0) + 1);
				}
			}
		}
	}

	let bestStep = null;
	let bestCount = 0;

	for (const [step, count] of stepCounts) {
		if (count > bestCount) {
			bestCount = count;
			bestStep = step;
		}
	}

	if (bestStep && totalVertices % bestStep !== 0) {
		if (totalVertices % (bestStep + 1) === 0) {
			bestStep = bestStep + 1;
		}
	}

	console.log("Detected step: " + bestStep);
	return bestStep;
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
}

function isUV(){
	let inputs = [glo.params.text_input_x, glo.params.text_input_y, glo.params.text_input_z,
		          glo.params.text_input_alpha, glo.params.text_input_beta,
				  glo.input_eval_x.text, glo.input_eval_y.text].map(input => regOne(input));
	
	return {isU: inputs.some(input => input.includes('u') || input.includes('à') || input.includes('m')),
		    isV: inputs.some(input => input.includes('v') || input.includes('à') || input.includes('m') )};
}

function transformMesh(transformKind = 'scaling', axis = 'x', value = 2, mesh = glo.ribbon){
	mesh[transformKind][axis] = value;
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

function countSyms(){
	const symX = glo.params.symmetrizeX || 1;
	const symY = glo.params.symmetrizeY || 1;
	const symZ = glo.params.symmetrizeZ || 1;

	if (glo.addSymmetry) {
		// Mode additif : 1 original + copies indépendantes par axe
		return 1 + Math.max(symX - 1, 0) + Math.max(symY - 1, 0) + Math.max(symZ - 1, 0);
	}
	// Mode multiplicatif : produit cartésien
	return symX * symY * symZ;
}