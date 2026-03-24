//*****************************************************************************************************//
//*******************************************PROTOTYPES************************************************//
//*****************************************************************************************************//

/**
 * Computes and attaches a custom `uv_params` vertex buffer containing the
 * real (u, v) parameter values for each vertex in the mesh grid.
 * Used by the shader to access parametric coordinates alongside grid indices.
 */
BABYLON.Mesh.prototype.setDataShader = function() {
    const nbStepsU = glo.params.stepsU;
    const nbStepsV = glo.params.stepsV;
    const minU = !glo.slidersUVOnOneSign.u ? -glo.params.u : 0;
    const minV = !glo.slidersUVOnOneSign.v ? -glo.params.v : 0;
    const maxU = glo.params.u;
    const maxV = glo.params.v;

    const stepU = (maxU - minU) / nbStepsU;
    const stepV = (maxV - minV) / nbStepsV;

    // Buffer unique pour UV (vec2)
    const uvData = new Float32Array((nbStepsU + 1) * (nbStepsV + 1) * 2);
    let idx = 0;
    
    for (let i = 0; i <= nbStepsU; i++) {
        const u = minU + i * stepU;
        for (let j = 0; j <= nbStepsV; j++) {
            const v = minV + j * stepV;
            uvData[idx++] = u;
            uvData[idx++] = v;
        }
    }

    // Buffer UV avec stride = 2
    const uvBuffer = new BABYLON.VertexBuffer(
        glo.scene.getEngine(),
        uvData,
        "uv_params",  // nom distinct des UV de texture
        false, false, 2,  // stride = 2 pour vec2
        false, 0, 2
    );

    this.setVerticesBuffer(uvBuffer);
};

/**
 * Recomputes normals from the current positions and applies the given indices.
 * Rebuilds the entire VertexData (positions + normals + indices) on the mesh.
 * @param {number[]|Uint32Array} [newIndices=this.getIndices()] - Triangle indices to use.
 */
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

/**
 * Applies a checkerboard pattern to the mesh by selectively keeping every Nth group of triangles.
 * Modifies the index buffer so only alternating triangle groups are rendered.
 * @param {number} [nb=glo.params.checkerboard] - Number of triangles per group.
 * @param {number} [stepCoeff=glo.params.checkerboardNbSteps] - Step multiplier between groups.
 */
BABYLON.Mesh.prototype.checkerboard = function(nb = glo.params.checkerboard, stepCoeff = glo.params.checkerboardNbSteps){
	let indices = this.savedIndices || this.getIndices();

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

/**
 * Estimates the download file size of the mesh based on the grid resolution.
 * @returns {string} Human-readable size string (e.g. `"≈ 1.50 Mo"`).
 */
BABYLON.Mesh.prototype.weightToDownload = function() {
	const weight = glo.params.stepsU * glo.params.stepsV / 18000;
	return `≈ ${weight.toFixed(2)} Mo`;
}

/**
 * Returns the inverted (complementary) color: each component becomes `1 - component`.
 * @returns {BABYLON.Color3} The inverted color.
 */
BABYLON.Color3.prototype.inv = function() {
	return new BABYLON.Color3(1 - this.r, 1 - this.g, 1 - this.b);
}