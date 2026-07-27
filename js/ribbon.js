//*****************************************************************************************************//
//********************************************MAIN FUNCTIONS*******************************************//
//*****************************************************************************************************//

/**
 * Creates the parametric surface curves and applies mesh transformations.
 * Disposes of any previously existing curves before rebuilding them.
 * @async
 * @returns {Promise<void>}
 */
async function makeCurves(){
	if(typeof(glo.curves) != "undefined"){
		glo.curves = {}; delete glo.curves;
	}

	makeOnlyCurves();

	glo.params.meshTransformations.run();
}

/**
 * Creates the surface mesh using the GPU shader pipeline.
 * Uses {@link createShaderMeshFromGlo} to build the mesh, then applies
 * any deformation expression from the symmetry input, and optionally
 * enables the checkerboard pattern.
 */
function makeOnlyCurves() {
	// Use GPUShaderMesh
	const meshResult = createShaderMeshFromGlo();
	glo.ribbon = meshResult ? meshResult : glo.ribbon;
	glo.fromShader = true;

	// Apply deformation if an expression exists
	if (glo.ribbon && glo.ribbon.shaderMeshInstance) {
		const deformText = glo.inputSymR ? glo.inputSymR.text : null;
		if (deformText && deformText.trim()) {
			glo.ribbon.shaderMeshInstance.updateDeformationExpression(deformText);
		}
	}
	if (glo.params.checkerboard) { glo.ribbon.checkerboard(); }
}

/**
 * Disposes of the current ribbon mesh and optionally all other scene meshes.
 * Preserves axis lines, grid planes, the line system, and text planes.
 * @param {boolean} [all=true] - When true, disposes all scene meshes except
 *   protected ones (axes, grids, lineSystem, plane, TextPlane, walk overlays).
 *   When false, only disposes the ribbon and tube meshes.
 */
function ribbonDispose(all = true){
	if(typeof(glo.ribbon)    != "undefined" && glo.ribbon != null){ glo.ribbon.dispose(); glo.ribbon = null; }
	if(typeof(glo.meshTubes) != "undefined" && glo.meshTubes != null){ glo.meshTubes.dispose(); glo.meshTubes = null; }

	if(all){
		// walkAvatar / walkMapPanel / walkMapFrame belong to the first-person overlay and
		// outlive any single mesh, exactly like the axes and the grid.
		const notToDispose = ['axisX', 'axisY', 'axisZ', 'gridX', 'gridY', 'gridZ', 'lineSystem', 'plane', 'TextPlane',
		                      'walkAvatar', 'walkMapPanel', 'walkMapFrame'];
		glo.scene.meshes.forEach(mesh => {
			if(!notToDispose.includes(mesh.name)){ mesh.dispose(); }
		});
	}
}

/**
 * Rebuilds the ribbon mesh by re-creating all curves and applying transformations.
 * Convenience wrapper around {@link makeCurves}.
 * @async
 * @returns {Promise<void>}
 */
async function remakeRibbon(){
	await makeCurves();
}

/**
 * Computes and stores the grid dimensions (number of vertices along U and V)
 * into {@link glo.pathsInfos}, taking symmetry copies into account.
 */
function getPathsInfos(){
	const coeffSym = countSyms();
	glo.pathsInfos = {u: (glo.params.stepsU + 1) * coeffSym, v: glo.params.stepsV + 1};
}

/**
 * Exports a BabylonJS mesh to an STL file and triggers a browser download.
 * If the mesh is a GPU shader mesh, it first extracts real vertex positions
 * from the GPU into a temporary CPU mesh for export.
 * @async
 * @param {BABYLON.Mesh} mesh - The mesh to export.
 * @param {string} filename - The desired filename for the downloaded STL file.
 * @returns {Promise<void>}
 */
async function exportMeshToSTL(mesh, filename){
	let meshForSTL = mesh;

	// If it's a shader mesh, extract the real positions from the GPU
	if (mesh.shaderMeshInstance) {
		meshForSTL = mesh.shaderMeshInstance.createExportMesh();
		if (!meshForSTL) {
			console.error('[STL Export] Unable to extract positions from shader mesh');
			return;
		}
	}

	let stlString = BABYLON.STLExport.CreateSTL([meshForSTL], false, true);

	// Clean up the temporary export mesh
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
 * @param {BABYLON.Vector3[][]} paths - 2D array of vertices organized as a grid
 *   where paths[i][j] is the vertex at row i, column j.
 * @param {string} fileName - The name of the source file (used for logging).
 * @returns {boolean} True if the mesh was created and assigned successfully, false otherwise.
 */
function buildMeshFromPaths(paths, fileName) {
	const stepsU = paths.length - 1;
	const stepsV = paths[0].length - 1;
	glo.params.stepsU = stepsU;
	glo.params.stepsV = stepsV;

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
 * Creates a shader mesh from raw vertex buffers and assigns it to glo.ribbon.
 * Shared by buildMeshFromPaths() and importOBJWithBabylon().
 * @param {Float32Array} positions - Flat array of vertex positions (x, y, z interleaved).
 * @param {Float32Array} normals - Flat array of vertex normals (x, y, z interleaved).
 * @param {Uint32Array} indices - Triangle index buffer.
 * @param {number} stepsU - Number of subdivisions along the U axis.
 * @param {number} stepsV - Number of subdivisions along the V axis.
 * @param {string} fileName - Source file name for logging.
 * @param {string} logInfo - Additional info string to log on success.
 * @returns {boolean} True if the shader mesh was created and assigned successfully, false otherwise.
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

/**
 * Opens a file picker dialog for the user to select an OBJ file, parses it,
 * converts the mesh data into a grid of paths, and builds a shader mesh from it.
 * The OBJ is parsed manually via {@link parseOBJFile} and grid-reconstructed
 * via {@link buildPathsFromOBJ}.
 */
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

			// Convert to grid to determine stepsU / stepsV
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

/**
 * Imports an OBJ file using BabylonJS's built-in SceneLoader, extracts vertex
 * data (positions, normals, indices), estimates grid dimensions, and creates
 * a shader mesh assigned to glo.ribbon. Materials are skipped during import.
 * @async
 * @param {File} file - The OBJ File object to import.
 * @param {string} fileName - Display name for logging purposes.
 * @returns {Promise<void>}
 */
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
		glo.params.stepsU = stepsU;
		glo.params.stepsV = stepsV;

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

/**
 * Parses raw OBJ file text and extracts vertex positions and face indices.
 * Handles both positive (1-based) and negative (relative) vertex indices
 * in face definitions. Only processes 'v' and 'f' lines.
 * @param {string} text - The raw text content of the OBJ file.
 * @returns {{vertices: BABYLON.Vector3[], faces: number[][]}} An object containing
 *   the parsed vertices as Vector3 instances and faces as arrays of 0-based indices.
 */
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

/**
 * Reconstructs a 2D grid of paths from an unstructured list of OBJ vertices and faces.
 * Attempts to detect the grid dimensions by analyzing face index patterns via
 * {@link detectGridStepFromFaces}. Falls back to a square-root heuristic if
 * detection fails or does not evenly divide the vertex count.
 * @param {BABYLON.Vector3[]} vertices - Array of vertex positions.
 * @param {number[][]} faces - Array of face index arrays (0-based).
 * @returns {BABYLON.Vector3[][]} 2D array of vertex paths suitable for ribbon/mesh creation.
 */
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

/**
 * Detects the grid step size (number of vertices per row) by analyzing
 * index differences within face definitions. Examines up to 200 faces
 * and selects the most frequently occurring index difference greater than 1.
 * @param {number[][]} faces - Array of face index arrays (0-based).
 * @param {number} totalVertices - Total number of vertices in the mesh.
 * @returns {number|null} The detected grid step, or null if no faces are provided
 *   or detection fails.
 */
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

/**
 * Generates a random mathematical expression string for a parametric surface equation.
 * Combines trigonometric shorthand functions (cu, cv, su, sv, etc.) with random
 * arithmetic operators and numeric coefficients.
 * @param {number} end - The number of terms to generate in the expression.
 * @returns {string} A randomly generated equation string.
 */
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

	var numLimit = 4;
	var rndEquation = "";
	var n = 0;
	while(n < end){
		if(n == end - 1){ rndEquation += rnd.get_a_function(1); }
		else if(n%2 == 0){ rndEquation += rnd.get_a_function(1) + rnd.get_an_operator(0) + parseInt(Math.random() * numLimit + 2); }
		else if(n%2 != 0){ rndEquation += rnd.get_a_function(1) + rnd.get_an_operator(1) + rnd.get_a_function(2); }
		n++;
	}

	return rndEquation;
}

/**
 * Generates a random parametric surface by creating random equations for X, Y, and Z,
 * updates the input fields in the UI, and rebuilds the mesh.
 */
function makeRndSurface(){
	glo.params.textInputX = "u" + rndSurface(1); glo.inputX.text = glo.params.textInputX;
	glo.params.textInputY = "v" + rndSurface(1); glo.inputY.text = glo.params.textInputY;
	glo.params.textInputZ = rndSurface(3); glo.inputZ.text = glo.params.textInputZ;

	makeCurves();
}

/**
 * Checks whether the current parametric equations depend on the U and/or V parameters.
 * Inspects all input fields (X, Y, Z, Alpha, Beta, EvalX, EvalY) after normalizing
 * each expression via {@link regOne}.
 * @returns {{isU: boolean, isV: boolean}} An object indicating whether the equations
 *   reference the U parameter and/or the V parameter.
 */
function isUV(){
	let inputs = [glo.params.textInputX, glo.params.textInputY, glo.params.textInputZ,
		          glo.params.textInputAlpha, glo.params.textInputBeta,
				  glo.inputEvalX.text, glo.inputEvalY.text].map(input => regOne(input));

	return {isU: inputs.some(input => input.includes('u') || input.includes('à') || input.includes('m')),
		    isV: inputs.some(input => input.includes('v') || input.includes('à') || input.includes('m') )};
}

/**
 * Applies a transformation (scaling, rotation, or position) to a mesh along a given axis.
 * @param {string} [transformKind='scaling'] - The type of transformation to apply
 *   (e.g., 'scaling', 'rotation', 'position').
 * @param {string} [axis='x'] - The axis to transform ('x', 'y', or 'z').
 * @param {number} [value=2] - The value to set for the transformation.
 * @param {BABYLON.Mesh} [mesh=glo.ribbon] - The target mesh to transform.
 */
function transformMesh(transformKind = 'scaling', axis = 'x', value = 2, mesh = glo.ribbon){
	mesh[transformKind][axis] = value;
}

/**
 * Converts a flat vertex data array (from a BabylonJS mesh) into a 2D array of
 * paths (Vector3 arrays), suitable for ribbon or parametric surface reconstruction.
 * @param {number[]} [verticesDatas=glo.ribbon.getVerticesData(BABYLON.VertexBuffer.PositionKind)] -
 *   Flat array of vertex positions (x, y, z interleaved).
 * @param {number} [coeff] - Optional multiplier for stepsU. If provided, the number of
 *   U paths is (stepsU + 1) * coeff; otherwise uses glo.pathsInfos.u.
 * @returns {BABYLON.Vector3[][]} 2D array of paths where each inner array is a row
 *   of vertices along the V direction.
 */
function turnVerticesDatasToPaths(verticesDatas = glo.ribbon.getVerticesData(BABYLON.VertexBuffer.PositionKind), coeff){
	let paths = [];
	let n = 0;

	const stepsU = coeff ? ((glo.params.stepsU + 1) * coeff) : glo.pathsInfos.u;
	for(let i = 0; i <= stepsU - 1; i++){
		paths[i] = [];
		for(let j = 0; j <= glo.params.stepsV; j++){
			const v = { x: verticesDatas[n*3], y: verticesDatas[n*3 + 1], z: verticesDatas[n*3 + 2] };
			paths[i].push(new BABYLON.Vector3(v.x, v.y, v.z));

			n++;
		}
	}
	return paths;
}

/**
 * Counts the total number of mesh copies produced by the current symmetry settings.
 * In additive mode ({@link glo.addSymmetry} = true), returns 1 (original) plus
 * the sum of extra copies per axis. In multiplicative mode, returns the Cartesian
 * product of symmetry counts across all three axes.
 * @returns {number} The total symmetry multiplier.
 */
function countSyms(){
	const symX = glo.params.symmetrizeX || 1;
	const symY = glo.params.symmetrizeY || 1;
	const symZ = glo.params.symmetrizeZ || 1;

	if (glo.addSymmetry) {
		// Additive mode: 1 original + independent copies per axis
		return 1 + Math.max(symX - 1, 0) + Math.max(symY - 1, 0) + Math.max(symZ - 1, 0);
	}
	// Multiplicative mode: Cartesian product
	return symX * symY * symZ;
}
