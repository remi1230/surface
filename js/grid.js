function make_planes(){
	function make_plan(x,y,z){
		var sourcePlane = new BABYLON.Plane(x, y, z, 0);
		sourcePlane.normalize();
		var plane = BABYLON.MeshBuilder.CreatePlane("plane", {height: glo.planSize, width: glo.planSize, sourcePlane: sourcePlane, sideOrientation: BABYLON.Mesh.DOUBLESIDE}, glo.scene);
		var material = new BABYLON.StandardMaterial("myMaterial", glo.scene);
		material.backFaceCulling = false;
		material.alpha = 0.25;
		plane.material = material;
		plane.isPickable = false;

		return plane;
	}

	if(typeof(glo.planes) != "undefined"){
		glo.planes.map(plane => { plane.dispose(); plane = {}; } );
	}

	if(glo.planes_visible){
		glo.planes = [];
		glo.planes.push(make_plan(0, 0, 1));
		glo.planes.push(make_plan(0, 1, 0));
		glo.planes.push(make_plan(1, 0, 0));
	}
}

function showPlane(visible, plan){
	if(visible){
		var material = new BABYLON.StandardMaterial("myMaterial", glo.scene);
		material.backFaceCulling = false;
		material.alpha = 0.25;
		switch (plan) {
			case 'xy':
				var sourcePlane = new BABYLON.Plane(0, 0, 1, 0);
				sourcePlane.normalize();
				glo.planeXY = BABYLON.MeshBuilder.CreatePlane("plane", {height: glo.planSize, width: glo.planSize, sourcePlane: sourcePlane, sideOrientation: BABYLON.Mesh.DOUBLESIDE}, glo.scene);
				glo.planeXY.material = material;
				glo.planeXY.isPickable = false;
				break;
			case 'yz':
				var sourcePlane = new BABYLON.Plane(1, 0, 0, 0);
				sourcePlane.normalize();
				glo.planeYZ = BABYLON.MeshBuilder.CreatePlane("plane", {height: glo.planSize, width: glo.planSize, sourcePlane: sourcePlane, sideOrientation: BABYLON.Mesh.DOUBLESIDE}, glo.scene);
				glo.planeYZ.material = material;
				glo.planeYZ.isPickable = false;
				break;
			case 'xz':
				var sourcePlane = new BABYLON.Plane(0, 1, 0, 0);
				sourcePlane.normalize();
				glo.planeXZ = BABYLON.MeshBuilder.CreatePlane("plane", {height: glo.planSize, width: glo.planSize, sourcePlane: sourcePlane, sideOrientation: BABYLON.Mesh.DOUBLESIDE}, glo.scene);
				glo.planeXZ.material = material;
				glo.planeXZ.isPickable = false;
				break;
		}
	}
	else{
		switch (plan) {
			case 'xy':
				glo.planeXY.dispose(); glo.planeXY = {};
				break;
			case 'yz':
				glo.planeYZ.dispose(); glo.planeYZ = {};
				break;
			case 'xz':
				glo.planeXZ.dispose(); glo.planeXZ = {};
				break;
		}
	}
}

var showAxis = function(size, visibility = 0) {
	glo.labels_axis = [];
	glo.planes_axis = [];
	var makeTextPlane = function(text, color, size_plane) {
	  var plane = new BABYLON.Mesh.CreatePlane("TextPlane", size_plane, glo.scene, true);
		plane.visibility = 0;
		var label = new BABYLON.GUI.TextBlock();
    label.text = text;
    label.color = glo.labelGridColor;
    label.fontSize = size_plane * 10 + "px";
    label.fontWeight = "bold";
		label.height = "25px";
		label.width = "20px";
		label.name = "plane_label";
    label.isVisible = visibility;

		var panel = new BABYLON.GUI.StackPanel();
		panel.isVertical = false;
	  panel.zIndex = -1;

		panel.addControl(label);
    glo.advancedTexture.addControl(panel);

		panel.linkWithMesh(plane);

		glo.labels_axis.push(label);
		glo.planes_axis.push(plane);
		return plane;
   };

	 var pivot = new BABYLON.Vector3(0, 0, 0);

  glo.axisX = BABYLON.Mesh.CreateLines("axisX", [
    new BABYLON.Vector3.Zero(), new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, 0.05 * size, 0),
    new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, -0.05 * size, 0)
    ], glo.scene);
  glo.axisX.color = new BABYLON.Color3(1, 0, 0);
  glo.axisX.isPickable = false;
  var xChar = makeTextPlane("X", "red", size / 10);
  xChar.position = new BABYLON.Vector3(0.9 * size, -0.05 * size, 0);
  xChar.isPickable = false;

  var pivot_translation_xChar = xChar.position.subtract(pivot);
	xChar.setPivotMatrix(BABYLON.Matrix.Translation(pivot_translation_xChar.x, pivot_translation_xChar.y, pivot_translation_xChar.z));
	glo.xChar = xChar;

  glo.axisY = BABYLON.Mesh.CreateLines("axisY", [
      new BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3( -0.05 * size, size * 0.95, 0),
      new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3( 0.05 * size, size * 0.95, 0)
      ], glo.scene);
  glo.axisY.color = new BABYLON.Color3(0, 1, 0);
  glo.axisY.isPickable = false;
  var yChar = makeTextPlane("Y", "green", size / 10);
  yChar.position = new BABYLON.Vector3(0, 0.9 * size, -0.05 * size);
  yChar.isPickable = false;

	var pivot_translation_yChar = yChar.position.subtract(pivot);
	yChar.setPivotMatrix(BABYLON.Matrix.Translation(pivot_translation_yChar.x, pivot_translation_yChar.y, pivot_translation_yChar.z));
	glo.yChar = yChar;

  glo.axisZ = BABYLON.Mesh.CreateLines("axisZ", [
      new BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0 , -0.05 * size, size * 0.95),
      new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0, 0.05 * size, size * 0.95)
      ], glo.scene);
  glo.axisZ.color = new BABYLON.Color3(0, 0, 1);
  glo.axisZ.isPickable = false;
  var zChar = makeTextPlane("Z", "blue", size / 10);
  zChar.position = new BABYLON.Vector3(0, 0.05 * size, 0.9 * size);
  zChar.isPickable = false;

	var pivot_translation_zChar = zChar.position.subtract(pivot);
	zChar.setPivotMatrix(BABYLON.Matrix.Translation(pivot_translation_zChar.x, pivot_translation_zChar.y, pivot_translation_zChar.z));
	glo.zChar = zChar;

	glo.axisX.visibility = visibility;
	glo.axisY.visibility = visibility;
	glo.axisZ.visibility = visibility;
	xChar.visibility = 0;
	yChar.visibility = 0;
	zChar.visibility = 0;
};

function showGrid(size, number, axis_size = glo.axis_size, visibility = 0) {
	glo.axis_size = axis_size;

	if(typeof(glo.labels_grid) != "undefined"){
		glo.labels_grid.map(label_grid => { label_grid.dispose(); label_grid = {}; } );
		glo.planes_grid.map(plane_grid => { plane_grid.dispose(); plane_grid = {}; } );
		glo.gridX.map(gridX => { gridX.dispose(); gridX = {}; } );
		glo.gridY.map(gridY => { gridY.dispose(); gridY = {}; } );
		glo.gridZ.map(gridZ => { gridZ.dispose(); gridZ = {}; } );
	}
	glo.labels_grid = [];
	glo.planes_grid = [];

   function makeTextPlane(text, color, size_plane, axis, isOrtho) {
		var plane = new BABYLON.Mesh.CreatePlane("TextPlane", size_plane, glo.scene, true);
		var label_size = 10;
		if (size_plane < 1) { label_size = 10; }

		text = text.toFixed(1).toString();
		if (text[text.length - 1] == "0") { text = text.substring(0, text.length - 2); }

		plane.visibility = 0;
		plane.isPickable = true; // Rend le texte cliquable
		var label = new BABYLON.GUI.TextBlock();
		label.text = text;
		label.color = glo.labelGridColor;
		label.fontSize = label_size + "px";
		label.fontWeight = "bold";
		label.height = "20px";
		label.width = "30px";
		label.name = "grid_label";
		label.isVisible = visibility;

		var panel = new BABYLON.GUI.StackPanel();
		panel.isVertical = false;
		panel.zIndex = -1;

		panel.addControl(label);
		glo.advancedTexture.addControl(panel);

		panel.linkWithMesh(plane);

		// Stockons `ind` et `axis` comme propriétés du plane directement
		plane.metadata = { ind: parseInt(text), axis: axis, isOrtho: isOrtho, type: 'plane' };

		// Ajoutons l'événement de clic
		plane.actionManager = new BABYLON.ActionManager(glo.scene);
		plane.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
			BABYLON.ActionManager.OnPickTrigger, function(evt) {
				// Récupérons les valeurs directement depuis le plane cliqué
				var clickedPlane = evt.meshUnderPointer;
				var clickedInd   = clickedPlane.metadata.ind;
				var clickedAxis  = clickedPlane.metadata.axis;

				// Vérifions que les valeurs sont correctes
				console.log("Clicked:", clickedInd, clickedAxis);

				// Appelons la fonction pour changer la couleur de la ligne
				changeLineColor(clickedInd, clickedAxis, isOrtho);
			}
		));

		glo.labels_grid.push(label);
		glo.planes_grid.push(plane);
		glo.controls_grid.push(label, plane);
		return plane;
	}

	function changeLineColor(ind, axis, isOrtho) {
		console.log("Changing line color for:", ind, axis, isOrtho);
		if(isOrtho){
			switch(axis){
				case 'Z': axis = 'Y'; break;
				case 'Y': axis = 'Z'; break;
			}
		}

		console.log("Changing line color for:", ind, axis, isOrtho);
		const name = `grid${axis}`;
		const lines = glo[name].filter(line => {
			return line.points[0][axis.toLowerCase()] === ind;
		});

		const lineInd = !isOrtho ? 0 : 1;

		lines[lineInd].metadata = lines[lineInd].metadata ? lines[lineInd].metadata : {isSelected: false};
		lines[lineInd].metadata.isSelected = !lines[lineInd].metadata.isSelected;
		lines[lineInd].color = lines[lineInd].metadata.isSelected ? BABYLON.Color3.Purple() : BABYLON.Color3.White();
	}

   function makeLine(size, axis, ind){
		const name = `grid${axis}`;
		let startPoint      = {x: 0, y: 0, z: 0}, endPoint      = {x: 0, y: 0, z: 0};
		let startPointOrtho = {x: 0, y: 0, z: 0}, endPointOrtho = {x: 0, y: 0, z: 0};
		let posChar         = {x: 0, y: 0, z: 0}, posCharOrtho  = {x: 0, y: 0, z: 0};

		switch(axis){
			case 'X': 
				startPoint      = {x: ind, y: -size, z: 0};
				endPoint        = {x: ind, y: size, z: 0};
				startPointOrtho = {x: -size, y: ind, z: 0};
				endPointOrtho   = {x: size, y: ind, z: 0};
				posChar         = {x: ind, y: size * 1.025, z: 0};
				posCharOrtho    = {x: size * 1.025, y: ind, z: 0};
			break;
			case 'Y': 
				startPoint      = {x: 0, y: ind, z: -size};
				endPoint   	    = {x: 0, y: ind, z: size};
				startPointOrtho = {x: 0, y: -size, z: ind};
				endPointOrtho   = {x: 0, y: size, z: ind};
				posChar    		= {x: 0, y: ind, z: size * 1.025};
				posCharOrtho    = {x: ind, y: 0, z: size * 1.025};
			break;
			case 'Z': 
				startPoint 		= {x: -size, y: 0, z: ind};
				endPoint   		= {x: size, y: 0, z: ind};
				startPointOrtho = {x: ind, y: 0, z: -size};
				endPointOrtho   = {x: ind, y: 0, z: size};
				posChar    		= {x: size, y: 0, z: ind * 1.025};
				posCharOrtho    = {x: 0, y: size, z: ind * 1.025};
			break;
		}

		var points = [
				new BABYLON.Vector3(startPoint.x, startPoint.y, startPoint.z),
				new BABYLON.Vector3(endPoint.x, endPoint.y, endPoint.z),
		];
		var pointsOrtho = [
				new BABYLON.Vector3(startPointOrtho.x, startPointOrtho.y, startPointOrtho.z),
				new BABYLON.Vector3(endPointOrtho.x, endPointOrtho.y, endPointOrtho.z),
		];

		function designLine(line){
			line.points = points;
			line.color = glo.color_line_grid;
			line.alpha = 0.5;
			line.visibility = visibility;
			line.isPickable = false;
		}

		let line = BABYLON.Mesh.CreateLines(name, points, glo.scene);
		designLine(line);

		var pivot_translation_line = line.position.subtract(BABYLON.Vector3.Zero());
		line.setPivotMatrix(BABYLON.Matrix.Translation(pivot_translation_line.x, pivot_translation_line.y, pivot_translation_line.z));

		function makeAxisChar(posChar, isOrtho){
			var axisChar = makeTextPlane(ind, "black", size / 20, axis, isOrtho);
			axisChar.position = new BABYLON.Vector3(posChar.x, posChar.y, posChar.z);
			var pivot_translation_axisChar = axisChar.position.subtract(BABYLON.Vector3.Zero());
			axisChar.setPivotMatrix(BABYLON.Matrix.Translation(pivot_translation_axisChar.x, pivot_translation_axisChar.y, pivot_translation_axisChar.z));
		}

		makeAxisChar(posChar, false);
		makeAxisChar(posCharOrtho, true);

		glo[name].push(line);
		let lineOrtho = BABYLON.Mesh.CreateLines(name, pointsOrtho, glo.scene);
		designLine(lineOrtho);
		glo[name].push(lineOrtho);
		glo.controls_grid.push(line, lineOrtho);
   }

	var step = axis_size/number;
	glo.step = step;
	glo.gridX = []; glo.gridY = []; glo.gridZ = [];
	var start = step;
	if(glo.negatif){ start = -axis_size; }
	for(var i = start; i <= axis_size; i+=step){
		makeLine(size, "X", i);
		makeLine(size, "Y", i);
		makeLine(size, "Z", i);
	}
};

function viewOnX(orient = 1, alpha = 0, beta = PI/2){
	glo.camera.alpha = alpha;
	glo.camera.beta  = beta;

	if(orient == 1){
		glo.camera.upVector = new BABYLON.Vector3(0,1,0);
	}
	else{
		glo.camera.upVector = new BABYLON.Vector3(0,0,1);
	}
}
function viewOnY(orient = 1, alpha = -PI, beta = PI/2){
	glo.camera.beta = beta;

	if(orient == 1){
		glo.camera.alpha = alpha/2;
		glo.camera.upVector = new BABYLON.Vector3(0,0,1);
	}
	else{
		glo.camera.alpha = alpha;
		glo.camera.upVector = new BABYLON.Vector3(1,0,0);
	}
}
function viewOnZ(orient = 1, alpha = PI/2, beta = PI/2){
	glo.camera.alpha = alpha;
	glo.camera.beta  = beta;
	if(orient == 1){
		glo.camera.upVector = new BABYLON.Vector3(1,0,0);
	}
	else{
		glo.camera.upVector = new BABYLON.Vector3(0,1,0);
	}
}

function viewOnAxis(options = {axis: "X", direction: -1, alpha: PI/4, beta: -PI/4, distance: 60}){
	if(!options.axis){ options.axis = "X"; }
	if(!options.direction){ options.direction = -1; }
	if(!options.alpha && options.alpha !== 0){ options.alpha = PI/4; }
	if(!options.beta && options.beta !== 0){ options.beta = -PI/4; }
	if(!options.distance && options.distance !== 0){ options.distance = 60; }

	const distForOne = 15; 
	const extendSize = glo.ribbon ? glo.ribbon.getBoundingInfo().boundingBox.extendSize : {x: distForOne, y: distForOne, z: distForOne};
	const coeff      = h(extendSize.x, extendSize.y, extendSize.z);

	options.distance = 3 * coeff * (glo.ribbon ? glo.ribbon.gridScaleValue : 1);

	switch(options.axis){
		case "X":{
			viewOnX(options.direction, options.alpha, PI/2 + options.beta);
			break;
		}
		case "Y":{
			viewOnY(options.direction, -PI + options.alpha, PI/2 + options.beta);
			break;
		}
		case "Z":{
			viewOnZ(options.direction, PI/2 + options.alpha, PI/2 + options.beta);
			break;
		}
	}
	glo.camera.radius = options.distance;
}

function switch_grid(grid_visible = glo.grid_visible){
	if(grid_visible){
		glo.controls_grid.forEach(ctrl => {
			if(!ctrl.metadata || !ctrl.metadata.type || ctrl.metadata.type !== 'plane'){
				ctrl[ctrl.name === 'grid_label' ? 'isVisible': 'visibility'] = 1; 
			}
		});
		if(!glo.axis_visible){
			switch_axis(true);
			glo.axis_visible = true;
		}
	}
	else{
		glo.controls_grid.forEach(ctrl => { ctrl[ctrl.name === 'grid_label' ? 'isVisible': 'visibility'] = 0; } );
		
		switch_axis(false);
		glo.axis_visible = false;
	}
}

function gridToCenterMesh(mesh = glo.ribbon){
	const centerWorld = glo.ribbon.getBoundingInfo().boundingBox.centerWorld;
	glo.controls_grid.forEach(ctrl => {
		if(ctrl.position){
			ctrl.position.x += centerWorld.x;
			ctrl.position.y += centerWorld.y;
			ctrl.position.z += centerWorld.z;
		}
	});

	glo.planes_axis.forEach(plane => {
		plane.position.x += centerWorld.x; plane.position.y += centerWorld.y; plane.position.z += centerWorld.z;
	});

	glo.axisX.position.x += centerWorld.x;
	glo.axisX.position.y += centerWorld.y;
	glo.axisX.position.z += centerWorld.z;
	glo.axisY.position.x += centerWorld.x;
	glo.axisY.position.y += centerWorld.y;
	glo.axisY.position.z += centerWorld.z;
	glo.axisZ.position.x += centerWorld.x;
	glo.axisZ.position.y += centerWorld.y;
	glo.axisZ.position.z += centerWorld.z;
}

function gridToOrigin(){
	glo.controls_grid.forEach(ctrl => {
		if(ctrl.position){
			ctrl.position.x = 0;
			ctrl.position.y = 0;
			ctrl.position.z = 0;
		}
	});

	glo.planes_axis.forEach(plane => {
		plane.position.x = 0; plane.position.y = 0; plane.position.z = 0;
	});

	glo.axisX.position.x = 0;
	glo.axisX.position.y = 0;
	glo.axisX.position.z = 0;
	glo.axisY.position.x = 0;
	glo.axisY.position.y = 0;
	glo.axisY.position.z = 0;
	glo.axisZ.position.x = 0;
	glo.axisZ.position.y = 0;
	glo.axisZ.position.z = 0;
}

function switch_axis(axis_visible = glo.axis_visible){
	if(axis_visible){
		glo.axisX.visibility = 1;
		glo.axisY.visibility = 1;
		glo.axisZ.visibility = 1;
		glo.xChar.visibility = 0;
		glo.yChar.visibility = 0;
		glo.zChar.visibility = 0;
		glo.labels_axis.map(label_axis => { label_axis.isVisible = 1; } );
		glo.planes_axis.map(plane_axis => { plane_axis.visibility = 0; } );
	}
	else{
		glo.axisX.visibility = 0;
		glo.axisY.visibility = 0;
		glo.axisZ.visibility = 0;
		glo.xChar.visibility = 0;
		glo.yChar.visibility = 0;
		glo.zChar.visibility = 0;
		glo.labels_axis.map(label_axis => { label_axis.isVisible = 0; } );
		glo.planes_axis.map(plane_axis => { plane_axis.isVisible = 0; } );
	}
}

function gridScale(mesh = glo.ribbon) {
	const scale = mesh.gridScale();

	const moyPos    = mesh.moyPos();
	const newMoyPos = new BABYLON.Vector3(moyPos.x * scale, moyPos.y * scale, moyPos.z * scale);
	const moveVect  = new BABYLON.Vector3(newMoyPos.x - moyPos.x, newMoyPos.y - moyPos.y, newMoyPos.z - moyPos.z);

	transformMesh('scaling', 'x', scale, mesh, glo.curves.lineSystem, false);
	transformMesh('scaling', 'y', scale, mesh, glo.curves.lineSystem, false);
	transformMesh('scaling', 'z', scale, mesh, glo.curves.lineSystem, false);

	if (glo.params.doubleLineSystem) {
		transformMesh('scaling', 'x', scale, mesh, glo.curves.lineSystemDouble, false);
		transformMesh('scaling', 'y', scale, mesh, glo.curves.lineSystemDouble, false);
		transformMesh('scaling', 'z', scale, mesh, glo.curves.lineSystemDouble, false);
	}

	mesh.position.x -= moveVect.x;
	mesh.position.y -= moveVect.y;
	mesh.position.z -= moveVect.z;

	glo.curves.lineSystem.position.x -= moveVect.x;
	glo.curves.lineSystem.position.y -= moveVect.y;
	glo.curves.lineSystem.position.z -= moveVect.z;

	if (glo.params.doubleLineSystem) {
		glo.curves.lineSystemDouble.position.x -= moveVect.x;
		glo.curves.lineSystemDouble.position.y -= moveVect.y;
		glo.curves.lineSystemDouble.position.z -= moveVect.z;
	}
}