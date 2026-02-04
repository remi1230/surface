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
			glo.curves = {}; delete glo.curves;
		}

		makeOnlyCurves();

		// Si GPUShaderMesh a créé le mesh, skip make_ribbon
		if (glo.ribbon) {
			setTimeout(() => {
				glo.camera.focusOn([glo.ribbon], true);
			}, 0);
		}

		if(!glo.first_rot){ glo.scene.meshes.map(mesh => { mesh.rotation.z = glo.rot_z; }); }

		const form = glo.formes.getFormSelect().form;
		if(form.orient.offset){
			const offset = form.orient.offset;
			glo.scene.onAfterRenderObservable.addOnce(() => {
				glo.ribbon.position.x += offset.x || 0;
				glo.ribbon.position.y += offset.y || 0;
				glo.ribbon.position.z += offset.z || 0;
			});
		}
	}
}

function makeOnlyCurves() {
	glo.formule = [];

	// Utiliser GPUShaderMesh
	if (glo.ribbon) { ribbonDispose(); }
	const meshResult = createShaderMeshFromGlo();
	glo.ribbon = meshResult;
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

async function remakeRibbon(fractalize = !glo.params.fractalize.actived ? false : 'fractalize', histo = true){
	await make_curves(undefined, undefined, undefined, undefined, fractalize, histo); 
}

function getPathsInfos(){
	const coeffSym = countSyms();
	glo.pathsInfos = {u: (glo.params.steps_u + 1) * coeffSym, v: glo.params.steps_v + 1};
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

			const paths = buildPathsFromOBJ(objData.vertices, objData.faces);

			if (paths.length === 0 || paths[0].length === 0) {
				console.error("Could not convert mesh to valid paths");
				document.body.removeChild(input);
				return;
			}

			ribbonDispose();

			if (typeof glo.curves === "undefined") {
				glo.curves = {};
			}
			glo.curves.paths = paths;

			glo.params.steps_u = paths.length - 1;
			glo.params.steps_v = paths[0].length - 1;

			await make_ribbon(true, true);

			glo.ribbon.refreshBoundingInfo();
			setTimeout(() => {
				glo.camera.focusOn([glo.ribbon], true);
			}, 0);

			console.log("OBJ imported successfully: " + fileName);
			console.log("Paths: " + paths.length + " x " + paths[0].length);

		} catch (error) {
			console.error("Error importing OBJ:", error);
		}

		document.body.removeChild(input);
	};

	input.click();
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

function transformMesh(transformKind = 'scaling', axis = 'x', value = 2, mesh = glo.ribbon, /*lines = glo.curves.lineSystem, dblLines = glo.curves.lineSystemDouble*/){
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
	return (glo.params.symmetrizeX ? glo.params.symmetrizeX : 1) *
	(glo.params.symmetrizeY ? glo.params.symmetrizeY : 1) *
	(glo.params.symmetrizeZ ? glo.params.symmetrizeZ : 1);
}