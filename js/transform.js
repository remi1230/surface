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