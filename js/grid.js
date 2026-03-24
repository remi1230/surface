function makePlanes(planXY = true, planYZ = true, planXZ = true){
	function makePlan(x, y, z) {
		var sourcePlane = new BABYLON.Plane(x, y, z, 0);
		sourcePlane.normalize();
		var plane = BABYLON.MeshBuilder.CreatePlane("plane", {
			sourcePlane: sourcePlane,
			sideOrientation: BABYLON.Mesh.DOUBLESIDE
		}, glo.scene);
		
		var material = new BABYLON.StandardMaterial("myMaterial", glo.scene);
		material.emissiveColor = glo.backgroundColor.inv();
		material.backFaceCulling = false;
		material.alpha = 0.25;
		plane.material = material;
		plane.isPickable = false;

		// Le mesh fait 1x1 de base, on scale pour couvrir la grille (-planSize à +planSize)
		const s = glo.planSize * 2;
		plane.scaling = new BABYLON.Vector3(s, s, 1);

		return plane;
	}

	if(typeof(glo.planes) != "undefined"){
		glo.planes.map(plane => { plane.dispose(); plane = {}; } );
	}

	if(glo.planesVisible || !planXY || !planYZ || !planXZ){
		glo.planes = [];
		if(planXY) glo.planes.push(makePlan(0, 0, 1));
		if(planXZ) glo.planes.push(makePlan(0, 1, 0));
		if(planYZ) glo.planes.push(makePlan(1, 0, 0));
	}

	glo.params.gridScaleValueOrigin = glo.params.gridScaleValue;
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
				if(glo.planeXY && typeof glo.planeXY.dispose === 'function'){ glo.planeXY.dispose(); glo.planeXY = {}; }
				break;
			case 'yz':
				if(glo.planeYZ && typeof glo.planeYZ.dispose === 'function'){ glo.planeYZ.dispose(); glo.planeYZ = {}; }
				break;
			case 'xz':
				if(glo.planeXZ && typeof glo.planeXZ.dispose === 'function'){ glo.planeXZ.dispose(); glo.planeXZ = {}; }
				break;
		}
	}
}

function showPlaneX(visible = true){ showPlane(visible, 'xy'); showPlane(false, 'yz'); showPlane(false, 'xz'); }
function showPlaneY(visible = true){ showPlane(visible, 'yz'); showPlane(false, 'xy'); showPlane(false, 'xz'); }
function showPlaneZ(visible = true){ showPlane(visible, 'xz'); showPlane(false, 'xy'); showPlane(false, 'yz'); }
function showNoPlane(){ showPlane(false, 'xz'); showPlane(false, 'xy'); showPlane(false, 'yz'); }

function showAPlane(plan){
	switch(plan){
		case 'x' : makePlanes(true, false, false); break;
		case 'y' : makePlanes(false, true, false); break;
		case 'z' : makePlanes(false, false, true); break;

		case 'none' : makePlanes(false, false, false);  break;
	}
}

var showAxis = function(size, visibility = 0) {
	if(glo.axisX){
		glo.axisX.dispose(); glo.axisY.dispose(); glo.axisZ.dispose();
	}
	if(glo.labelsAxis && glo.labelsAxis.length){
		glo.labelsAxis.forEach(label => label.dispose());
	}
	if(glo.planesAxis && glo.planesAxis.length){
		glo.planesAxis.forEach(plane => plane.dispose());
	}
	glo.labelsAxis = [];
	glo.planesAxis = [];
	var makeTextPlane = function(text, color, sizePlane) {
	  var plane = new BABYLON.Mesh.CreatePlane("TextPlane", sizePlane, glo.scene, true);
		plane.visibility = 0;
		var label = new BABYLON.GUI.TextBlock();
    label.text = text;
    label.color = glo.labelGridColor;
    label.fontSize = sizePlane * 10 + "px";
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

		glo.labelsAxis.push(label);
		glo.planesAxis.push(plane);
		return plane;
   };

	 var pivot = new BABYLON.Vector3(0, 0, 0);

  glo.axisX = BABYLON.Mesh.CreateLines("axisX", [
    new BABYLON.Vector3.Zero(), new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, 0.05 * size, 0),
    new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, -0.05 * size, 0)
    ], glo.scene);
  glo.axisX.color = new BABYLON.Color3(1, 0, 0);
  glo.axisX.isPickable = false;
  var xChar = makeTextPlane("X", "red", 1.5);
  xChar.position = new BABYLON.Vector3(0.9 * size, -0.05 * size, 0);
  xChar.isPickable = false;

  var pivotTranslationXChar = xChar.position.subtract(pivot);
	xChar.setPivotMatrix(BABYLON.Matrix.Translation(pivotTranslationXChar.x, pivotTranslationXChar.y, pivotTranslationXChar.z));
	glo.xChar = xChar;

  glo.axisY = BABYLON.Mesh.CreateLines("axisY", [
      new BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3( -0.05 * size, size * 0.95, 0),
      new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3( 0.05 * size, size * 0.95, 0)
      ], glo.scene);
  glo.axisY.color = new BABYLON.Color3(0, 1, 0);
  glo.axisY.isPickable = false;
  var yChar = makeTextPlane("Y", "green", 1.5);
  yChar.position = new BABYLON.Vector3(0, 0.9 * size, -0.05 * size);
  yChar.isPickable = false;

	var pivotTranslationYChar = yChar.position.subtract(pivot);
	yChar.setPivotMatrix(BABYLON.Matrix.Translation(pivotTranslationYChar.x, pivotTranslationYChar.y, pivotTranslationYChar.z));
	glo.yChar = yChar;

  glo.axisZ = BABYLON.Mesh.CreateLines("axisZ", [
      new BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0 , -0.05 * size, size * 0.95),
      new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0, 0.05 * size, size * 0.95)
      ], glo.scene);
  glo.axisZ.color = new BABYLON.Color3(0, 0, 1);
  glo.axisZ.isPickable = false;
  var zChar = makeTextPlane("Z", "blue", 1.5);
  zChar.position = new BABYLON.Vector3(0, 0.05 * size, 0.9 * size);
  zChar.isPickable = false;

	var pivotTranslationZChar = zChar.position.subtract(pivot);
	zChar.setPivotMatrix(BABYLON.Matrix.Translation(pivotTranslationZChar.x, pivotTranslationZChar.y, pivotTranslationZChar.z));
	glo.zChar = zChar;

	glo.axisX.visibility = visibility;
	glo.axisY.visibility = visibility;
	glo.axisZ.visibility = visibility;
	xChar.visibility = 0;
	yChar.visibility = 0;
	zChar.visibility = 0;
};

function showGrid(size, number, axisSize = glo.axisSize, visibility = 0) {
	glo.axisSize = axisSize;

	if(typeof(glo.labelsGrid) != "undefined"){
		glo.labelsGrid.map(labelGrid => { labelGrid.dispose(); labelGrid = {}; } );
		glo.planesGrid.map(planeGrid => { planeGrid.dispose(); planeGrid = {}; } );
		glo.gridX.map(gridX => { gridX.dispose(); gridX = {}; } );
		glo.gridY.map(gridY => { gridY.dispose(); gridY = {}; } );
		glo.gridZ.map(gridZ => { gridZ.dispose(); gridZ = {}; } );
	}
	glo.labelsGrid = [];
	glo.planesGrid = [];

   function makeTextPlane(text, color, sizePlane, axis, isOrtho) {
		var plane = new BABYLON.Mesh.CreatePlane("TextPlane", sizePlane, glo.scene, true);
		var labelSize = 10;
		if (sizePlane < 1) { labelSize = 10; }

		text = text.toFixed(1).toString();
		if (text[text.length - 1] == "0") { text = text.substring(0, text.length - 2); }

		plane.visibility = 0;
		plane.isPickable = true; // Rend le texte cliquable
		var label = new BABYLON.GUI.TextBlock();
		label.text = text;
		label.color = glo.labelGridColor;
		label.fontSize = labelSize + "px";
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
		/*plane.actionManager = new BABYLON.ActionManager(glo.scene);
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
		));*/

		glo.labelsGrid.push(label);
		glo.planesGrid.push(plane);
		glo.controlsGrid.push(label, plane);
		return plane;
	}

	function changeLineColor(ind, axis, isOrtho) {
		//console.log("Changing line color for:", ind, axis, isOrtho);
		if(isOrtho){
			switch(axis){
				case 'Z': axis = 'Y'; break;
				case 'Y': axis = 'Z'; break;
			}
		}

		//console.log("Changing line color for:", ind, axis, isOrtho);
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
			line.color = glo.colorLineGrid;
			line.alpha = 0.5;
			line.visibility = visibility;
			line.isPickable = false;
		}

		let line = BABYLON.Mesh.CreateLines(name, points, glo.scene);
		designLine(line);

		var pivotTranslationLine = line.position.subtract(BABYLON.Vector3.Zero());
		line.setPivotMatrix(BABYLON.Matrix.Translation(pivotTranslationLine.x, pivotTranslationLine.y, pivotTranslationLine.z));

		function makeAxisChar(posChar, isOrtho){
			var axisChar = makeTextPlane(ind, "black", 10, axis, isOrtho);
			axisChar.position = new BABYLON.Vector3(posChar.x, posChar.y, posChar.z);
			var pivotTranslationAxisChar = axisChar.position.subtract(BABYLON.Vector3.Zero());
			axisChar.setPivotMatrix(BABYLON.Matrix.Translation(pivotTranslationAxisChar.x, pivotTranslationAxisChar.y, pivotTranslationAxisChar.z));
		}

		makeAxisChar(posChar, false);
		makeAxisChar(posCharOrtho, true);

		glo[name].push(line);
		let lineOrtho = BABYLON.Mesh.CreateLines(name, pointsOrtho, glo.scene);
		designLine(lineOrtho);
		glo[name].push(lineOrtho);
		glo.controlsGrid.push(line, lineOrtho);
   }

	var step = axisSize/number;
	glo.step = step;
	glo.gridX = []; glo.gridY = []; glo.gridZ = [];
	var start = step;
	if(glo.negatif){ start = -axisSize; }
	for(var i = start; i <= axisSize; i+=step){
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

function viewOnAxis(options = glo.formes.getFormSelect().form.orient){
	if(!options.axis){ options.axis = "X"; }
	if(!options.direction){ options.direction = -1; }
	if(!options.alpha && options.alpha !== 0){ options.alpha = PI/4; }
	if(!options.beta && options.beta !== 0){ options.beta = -PI/4; }
	if(!options.distance && options.distance !== 0){ options.distance = 60; }

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

function switchGrid(gridVisible = glo.gridVisible){
	if(gridVisible){
		glo.controlsGrid.forEach(ctrl => {
			if(!ctrl.metadata || !ctrl.metadata.type || ctrl.metadata.type !== 'plane'){
				ctrl[ctrl.name === 'grid_label' ? 'isVisible': 'visibility'] = 1; 
			}
		});
		if(!glo.axisVisible){
			switchAxis(true);
		}
	}
	else{
		glo.controlsGrid.forEach(ctrl => { ctrl[ctrl.name === 'grid_label' ? 'isVisible': 'visibility'] = 0; } );
		
		switchAxis(false);
	}
}

function gridToCenterMesh(mesh = glo.ribbon){
	const centerWorld = glo.ribbon.getBoundingInfo().boundingBox.centerWorld;
	glo.controlsGrid.forEach(ctrl => {
		if(ctrl.position){
			ctrl.position.x += centerWorld.x;
			ctrl.position.y += centerWorld.y;
			ctrl.position.z += centerWorld.z;
		}
	});

	glo.planesAxis.forEach(plane => {
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
	glo.controlsGrid.forEach(ctrl => {
		if(ctrl.position){
			ctrl.position.x = 0;
			ctrl.position.y = 0;
			ctrl.position.z = 0;
		}
	});

	glo.planesAxis.forEach(plane => {
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

function switchAxis(axisVisible = glo.axisVisible){
	if(axisVisible){
		glo.axisX.visibility = 1;
		glo.axisY.visibility = 1;
		glo.axisZ.visibility = 1;
		glo.xChar.visibility = 0;
		glo.yChar.visibility = 0;
		glo.zChar.visibility = 0;
		glo.labelsAxis.map(labelAxis => { labelAxis.isVisible = 1; } );
		glo.planesAxis.map(planeAxis => { planeAxis.visibility = 0; } );
	}
	else{
		glo.axisX.visibility = 0;
		glo.axisY.visibility = 0;
		glo.axisZ.visibility = 0;
		glo.xChar.visibility = 0;
		glo.yChar.visibility = 0;
		glo.zChar.visibility = 0;
		glo.labelsAxis.map(labelAxis => { labelAxis.isVisible = 0; } );
		glo.planesAxis.map(planeAxis => { planeAxis.isVisible = 0; } );
	}
}