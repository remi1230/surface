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

function rgbNormalizedToHex({ r, g, b }) {
	// Convertit chaque composante en entier entre 0 et 255
	const to255 = x => Math.round(Math.min(1, Math.max(0, x)) * 255);

	// Convertit en hex, en ajoutant un 0 si besoin
	const toHex = x => to255(x).toString(16).padStart(2, '0');

	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}