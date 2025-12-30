function giveMaterialToMesh(mesh = glo.ribbon, emissiveColor = glo.emissiveColor, diffuseColor = glo.diffuseColor){
	disposeAllMaterials();

	if(!glo.shaderMaterial){
		let material = new BABYLON.StandardMaterial("myMaterial", glo.scene);

		material.backFaceCulling = false;
		mesh.material = material;
		mesh.material.emissiveColor = emissiveColor;
		mesh.material.diffuseColor = diffuseColor;
		mesh.material.alphaMode = BABYLON.Engine.ALPHA_COMBINE;
		mesh.material.alpha = glo.ribbon_alpha;
		mesh.alphaIndex = 998;
		mesh.material.wireframe = glo.wireframe;
	}
	else{
		glo.ribbon.setDataShader();

		const shaderMaterial = new BABYLON.ShaderMaterial(
			"ribbonShader",
			glo.scene,
			{
				vertexSource: vertexShader,
				fragmentSource: fragmentShader
			},
			{
				attributes: ["position", "normal", "uv", 'uv_params', 'curvatures'],
				uniforms: ["world", "worldView", "worldViewProjection", "view", "projection", "time", "cameraPosition", "iResolution"],
				needAlphaBlending: false
			}
		);

		shaderMaterial.setVector2("iResolution", new BABYLON.Vector2(
			glo.scene.getEngine().getRenderWidth(), 
			glo.scene.getEngine().getRenderHeight()
		));

		// Configuration du backface culling pour voir les deux côtés
		shaderMaterial.backFaceCulling = false;

		// Définir les uniforms
		shaderMaterial.setFloat("time", 0);
		shaderMaterial.setVector3("cameraPosition", glo.scene.activeCamera.position);

		shaderMaterial.setFloat("gridU", glo.params.steps_u);
		shaderMaterial.setFloat("gridV", glo.params.steps_v);
		shaderMaterial.setFloat("lineWidth", 1.0);

		const meshinfos = mesh.getBoundingInfo();

		shaderMaterial.setVector3("minpoint",
			{x: meshinfos.boundingBox.minimumWorld.x, y: meshinfos.boundingBox.minimumWorld.y, z: meshinfos.boundingBox.minimumWorld.z});

		shaderMaterial.setVector3("maxpoint",
			{x: meshinfos.boundingBox.maximumWorld.x, y: meshinfos.boundingBox.maximumWorld.y, z: meshinfos.boundingBox.maximumWorld.z});
			
		shaderMaterial.setVector3("msize",
			{x: meshinfos.boundingBox.extendSizeWorld.x, y: meshinfos.boundingBox.extendSizeWorld.y, z: meshinfos.boundingBox.extendSizeWorld.z});

		shaderMaterial.setInt("invcol", glo.shaders.params.invcol);
		shaderMaterial.setInt("islight", glo.shaders.params.islight);

		shaderMaterial.setVector3("lampPosition", {x: glo.light.direction.x, y: glo.light.direction.y, z: glo.light.direction.z});
		shaderMaterial.setFloat("lampIntensity", glo.light.intensity);
		shaderMaterial.setFloat("lampRadius", glo.shaders.light.radius);
		shaderMaterial.setFloat("lampSpecularPower", glo.shaders.light.specular.power);
		shaderMaterial.setFloat("lampSpecularIntensity", glo.shaders.light.specular.intensity);

		// Appliquer le matériau au mesh
		mesh.material = shaderMaterial;
		mesh.alphaIndex = 998;
		mesh.material.wireframe = glo.wireframe;

		// Animation
		glo.scene.registerBeforeRender(() => {
			shaderMaterial.setFloat("time", performance.now() * 0.001);
			shaderMaterial.setVector3("cameraPosition", glo.scene.activeCamera.position);
		});
	}
}

function disposeAllMaterials(){
	for(let i = 0; i < glo.scene.materials.length; i++){
		glo.scene.materials[i].dispose();
		i--;
	} 
}

function ribbonToWhite(){
	if((glo.emissiveColor != white || glo.diffuseColor != white) && glo.ribbon.material != null){
		var white = BABYLON.Color3.White();
		glo.ribbon.material.emissiveColor = white; glo.ribbon.material.diffuseColor = BABYLON.Color3.White();
	}
}

function changeLineColor(r, g, b){
	var colorLineSystem = new BABYLON.Color3(r, g, b);
	glo.lineColor = colorLineSystem;
	glo.curves.lineSystem.color = colorLineSystem;
}

function randomize_colors_app(){
	glo.allControls.haveThisClass('picker').map(picker_color => {
		picker_color.value = BABYLON.Color3.Random();
	});
}
function special_randomize_colors_app(first = false){
	if(!first){
		var backColor     = getRndLightColor(4);
		var emissiveColor = getComplementaryColor(backColor, 0.58);
		var diffuseColor  = getComplementaryColor(emissiveColor, 0.58);
		var lineColor     = getComplementaryColor(backColor);

		glo.allControls.getByName('pickerColorBackground').value = backColor;
		glo.allControls.getByName('pickerColorEmissive').value   = new BABYLON.Color3(emissiveColor.r, emissiveColor.g, emissiveColor.b);
		glo.allControls.getByName('pickerColorDiffuse').value    = new BABYLON.Color3(diffuseColor.r, diffuseColor.g, diffuseColor.b);
		glo.allControls.getByName('pickerColorLine').value       = lineColor;
	}
	else{
		glo.allControls.getByName('pickerColorBackground').value = new BABYLON.Color3(0.1, 0.1, 0.1);
		glo.allControls.getByName('pickerColorEmissive').value   = new BABYLON.Color3(0.3, 0.5, 0.5);
		glo.allControls.getByName('pickerColorDiffuse').value 	 = new BABYLON.Color3(0.6, 0.5, 0.5);
		glo.allControls.getByName('pickerColorLine').value 		 = new BABYLON.Color3(1, 1, 1);
	}
}

function intiColorUI(){
	glo.allControls.getByName('pickerColorBackground').value = glo.initialColor.backgroundColor;
	glo.allControls.getByName('pickerColorEmissive').value   = glo.initialColor.emissiveColor;
	glo.allControls.getByName('pickerColorDiffuse').value    = glo.initialColor.diffuseColor;
	glo.allControls.getByName('pickerColorLine').value       = glo.initialColor.lineColor;

	glo.allControls.haveThisClass('button').forEach(button => {
      button.background = glo.buttons_background;
	  button.color      = glo.buttons_color;
    });
	
	
}

function getComplementaryColor(color3, darkForce = 1){
	function calcul_color(col){
		return 1 - col*darkForce;
	}

	var r = calcul_color(color3.r); var g = calcul_color(color3.g); var b = calcul_color(color3.b);
	r = r > 0 ? r : 0; g = g > 0 ? g : 0; b = b > 0 ? b : 0;
	r = r < 1 ? r : 1; g = g < 1 ? g : 1; b = b < 1 ? b : 1;
	return new BABYLON.Color3(r, g, b);
}
function darkingColor(color3, force){
	var r = color3.r / force; var g = color3.g / force; var b = color3.b / force;
	return new BABYLON.Color3(r, g, b);
}
function lightingColor(color3, force){
	var r = color3.r * force; var g = color3.g * force; var b = color3.b * force;
	r = r < 1 ? r : 1; g = g < 1 ? g : 1; b = b < 1 ? b : 1;
	return new BABYLON.Color3(r, g, b);
}

function getRndDarkColor(force = 0){
	if(force >= 5){ force = 4; }
	else if(force < 0){ force = 0; }
	force = 0.5 - (force / 10);

	var rndObjectDarkColor = getRndObjectDarkColor(force);
	while(rndObjectDarkColor.reg){
		rndObjectDarkColor = getRndObjectDarkColor(force);
	}
	return rndObjectDarkColor.color;
}

function getRndObjectDarkColor(force){
	var keepSup = 0.05;
	var color = BABYLON.Color3.Random();
	var verifColor1 = color.r * color.g * color.b > Math.pow(force, 3);
	var verifColor2 = color.r < keepSup || color.g < keepSup || color.b < keepSup;
	var regRed = color.r > (color.g + color.b) * 1.25;
	var regGreen = color.g > (color.r + color.b) * 1.25;
	var regBlue = color.b > (color.r + color.g) * 1.25;
	var noPurpleInComplementaryColor = color.r > 0.07 * 0.5 && color.r < 0.07 * 2 && color.g > 0.18 * 0.5 && color.g < 0.18 * 2 && color.b > 0.07 * 0.5 && color.b < 0.07 * 2;

	var reg = verifColor1 || verifColor2 || regRed || regGreen || regBlue || noPurpleInComplementaryColor;

	return {color: color, reg: reg };
}

function getRndLightColor(force = 0){
	var color = BABYLON.Color3.Random();
	var verifColor = color.r * color.g * color.b;

	if(force >= 5){ force = 4.9; }
	else if(force < 0){ force = 0; }
	force = 0.5 + (force / 10);
	while(verifColor < Math.pow(force, 3)){
		color = BABYLON.Color3.Random();
		verifColor = color.r * color.g * color.b;
	}
	return color;
}

function EdgeOrVertexColor(){
	glo.params.playWithColors = false;
	glo.colorType.next().value;
	if(glo.colorsType == 'edge'){
		saveRandomColors();

		var white = BABYLON.Color3.White();
		glo.allControls.getByName('pickerColorDiffuse').value = white;
		glo.allControls.getByName('pickerColorEmissive').value = white;
	}
	else if(glo.colorsType == 'none'){
		restoreRandomColors();
	}
	make_curves();
}

function goToNumber(numGo, numToGo, k){
	return numGo < numToGo ? numGo + ((numToGo - numGo) * k) : numGo - ((numGo - numToGo) * k);
}