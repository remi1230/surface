function giveMaterialToMesh(mesh = glo.ribbon, emissiveColor = glo.emissiveColor, diffuseColor = glo.diffuseColor){
	disposeAllMaterials();

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

function disposeAllMaterials(){
	for(let i = 0; i < glo.scene.materials.length; i++){
		glo.scene.materials[i].dispose();
		i--;
	} 
}

function makeOtherColors(){
	if(glo.colorsType != 'none' && !glo.params.playWithColors){ return makeRandomColors(); }
	else{ return makeColors(); }
}

function makeRandomColors(){
	var colors = []; var n = 0;
	var pathsLenght = glo.curves.paths.length * glo.curves.paths[0].length;
	glo.curves.paths.map(path => {
		var color = BABYLON.Color3.Random();
		path.map(p => {
			if(glo.colorsType == 'face'){ color = BABYLON.Color3.Random(); }
			colors.push(color);
			n++;
		});
	});
	return colors;
}

function makeColors(){
	if(!glo.params.colorByCurvatures){
		var colors = [];
		var verticesNormals = glo.ribbon.getVerticesData(BABYLON.VertexBuffer.NormalKind);

		var verticesNormalsLength = verticesNormals.length;

		var dim_one = false;

		var equations = {
			fx: glo.params.text_input_color_x,
			fy: glo.params.text_input_color_y,
			fz: glo.params.text_input_color_z,
			falpha: glo.params.text_input_color_alpha,
			fbeta: glo.params.text_input_color_beta,
		};

		var A = glo.params.A; var B = glo.params.B; var C = glo.params.C; var D = glo.params.D; var E = glo.params.E; var F = glo.params.F; var G = glo.params.G; var H = glo.params.H;
		var I = glo.params.I; var J = glo.params.J; var K = glo.params.K; var L = glo.params.L; var M = glo.params.M;

		xEmpty = equations.fx == '' ? true : false; yEmpty = equations.fy == '' ? true : false; zEmpty = equations.fz == '' ? true : false;

		var good = test_equations(equations, dim_one);
		if(good){
			ribbonToWhite();

			var f = {
				x: equations.fx,
				y: equations.fy,
				z: equations.fz,
				alpha: equations.falpha,
				beta: equations.fbeta,
			};

			reg(f);

			var x = 0; var y = 0; var z = 0; var alpha = 0; var beta = 0;

			if(f.x == ""){ f.x = 0; }
			if(f.y == ""){ f.y = 0; }
			if(f.z == ""){ f.z = 0; }
			if(f.alpha == ""){ f.alpha = 0; }
			if(f.beta == ""){ f.beta = 0; }

			var isAlpha = false;
			var alpha = 0;
			if(glo.params.text_input_color_alpha != ""){
				isAlpha = true;
			}
			var isBeta = false;
			var beta = 0;
			if(glo.params.text_input_color_beta != ""){
				isBeta = true;
			}

			let d, k, p, t;

			var colorsNumbersX = []; var colorsNumbersY = []; var colorsNumbersZ = [];
			var colorsAllNumbers = [];
			var paths = glo.ribbon.getPaths(); var pathsLength = paths.length;
			var allPathsNb = pathsLength*paths[0].length;
			var pathsNow = [];
			var itColors = glo.params.itColors; var itLength = itColors**2; pathsLength/=itColors;
			var n = 0;
			for(var it = 0; it < itLength; it++){
				for(var u = 0; u < pathsLength; u++){
					ind_u = u;
					var path = paths[u];
					k = !(u%2) ? -1 : 1;
					p = !(u%2) ? -u : u;
					var pathNow = [];
					var pathLength = path.length/itColors;
					for(var v = 0; v < pathLength; v++){
						d = !(v%2) ? -1 : 1;
						t = !(v%2) ? -v : v;

						var pv = path[v];
						if(n*3 + 2 > verticesNormalsLength){ n = 0; }
						var xN = verticesNormals[n*3]; var yN = verticesNormals[n*3 + 1]; var zN = verticesNormals[n*3 + 2];
						var xP = pv.x; var yP = pv.y; var zP = pv.z;
						var µN = xN*yN*zN;
						var $N = (xN+yN+zN)/3; var $P = (xP+yP+zP)/3; var µP = xP*yP*zP;
						var µ$N = µN*$N; var $µN = µN+$N;
						var µµN = µ$N*$µN;

						const invRad = 180/PI;
						var O = Math.acos(yP/(h(xP,yP,zP))) * invRad;
						var T = Math.atan2(zP, xP) * invRad;

						var vectT = new BABYLON.Vector3(xP,yP,zP);
						vectT = BABYLON.Vector3.Normalize(vectT);
						xT = vectT.x; yT = vectT.y; zT = vectT.z;
						var µT = xT*yT*zT;
						var $T = (xT+yT+zT)/3;
						var µ$T = µT*$T; var $µT = µT+$T;
						var µµT = µ$T*$µT;

						ind_v = v;

						x = eval(f.x);
						y = eval(f.y);
						z = eval(f.z);

						if(glo.params.modCos){ x = !xEmpty ? c(x) : x; y = !yEmpty ? c(y) : y; z = !zEmpty ? c(z) : z; }

						if(glo.params.colorsByRotate){
							var pos = {x: x, y: 0, z: 0};
							pos = rotateByMatrix(pos, 0, y, z);
							x = pos.x; y = pos.y; z = pos.z;
						}

						if(x == Infinity || x == -Infinity || isNaN(x)){ x = 0; }
						if(y == Infinity || y == -Infinity || isNaN(y)){ y = 0; }
						if(z == Infinity || z == -Infinity || isNaN(z)){ z = 0; }
						if(isBeta){
							alpha = eval(f.alpha);
							beta = eval(f.beta);
							if(alpha == Infinity || alpha == -Infinity || isNaN(alpha)){ alpha = 0; }
							if(beta == Infinity || beta == -Infinity || isNaN(beta)){ beta = 0; }
							if(glo.params.rotAlpha != 0){ alpha*=glo.params.rotAlpha; } if(glo.params.rotBeta != 0){ beta*=glo.params.rotBeta; }
							var pos = {x: x, y: y, z: z};
							pos = rotateByMatrix(pos, 0, alpha, beta);
							x = pos.x; y = pos.y; z = pos.z;
						}
						else if(isAlpha){
							alpha = eval(f.alpha);
							if(alpha == Infinity || alpha == -Infinity || isNaN(alpha)){ alpha = 0; }
							if(glo.params.rotAlpha != 0){ alpha*=glo.params.rotAlpha; }
							var pos = {x: x, y: y, z: z};
							pos = rotateByMatrix(pos, 0, alpha, 0);
							x = pos.x; y = pos.y; z = pos.z;
						}

						colorsNumbersX.push(x); colorsNumbersY.push(y); colorsNumbersZ.push(z);
						colorsAllNumbers.push(x, y, z);
						pathNow.push({x: x, y: y, z: z});
						pathsNow.push({x: x, y: y, z: z});
						colors.push({r: x, g: y, b: z});

						n++;
					}
				}
			}

			var maxX = U(...colorsNumbersX); var maxY = U(...colorsNumbersY); var maxZ = U(...colorsNumbersZ);
			var minX = V(...colorsNumbersX); var minY = V(...colorsNumbersY); var minZ = V(...colorsNumbersZ);
			var maximumX = abs(maxX - minX); var maximumY = abs(maxY - minY); var maximumZ = abs(maxZ - minZ);
			var maxAll = U(...colorsAllNumbers);
			var minAll = V(...colorsAllNumbers);
			var maximumAll = abs(maxAll - minAll);
			var newColors = [];

			if(glo.params.playWithColorMode == 'xyz'){ colors.map(color => {
				if(!glo.transCol){ var r = color.r / maxX; r = r == Infinity ? 0 : r; var g = color.g / maxY; g = g == Infinity ? 0 : g; var b = color.b / maxZ; b = b == Infinity ? 0 : b; }
				else{ var r = (color.r - minX) / maximumX; r = r == Infinity ? 0 : r; var g = (color.g - minY) / maximumY; g = g == Infinity ? 0 : g; var b = (color.b - minZ) / maximumZ; b = b == Infinity ? 0 : b; }
				r = isNaN(r) ? 0 : r; g = isNaN(g) ? 0 : g; b = isNaN(b) ? 0 : b;
				newColors.push(new BABYLON.Color4(r, g, b, 1)); });
			}
			else if(glo.params.playWithColorMode == 'all'){
				colors.map(color => {
					if(!glo.transCol){ var r = color.r / maxAll; r = r == Infinity ? 0 : r; var g = color.g / maxAll; g = g == Infinity ? 0 : g; var b = color.b / maxAll; b = b == Infinity ? 0 : b; }
					else{ var r = (color.r - minAll) / maximumAll; r = r == Infinity ? 0 : r; var g = (color.g - minAll) / maximumAll; g = g == Infinity ? 0 : g; var b = (color.b - minAll) / maximumAll; b = b == Infinity ? 0 : b; }
						r = isNaN(r) ? 0 : r; g = isNaN(g) ? 0 : g; b = isNaN(b) ? 0 : b;
					newColors.push(new BABYLON.Color4(r, g, b, 1));
				});
			}
			else{
				colors.map(color => {
					var r = color.r; r = r == Infinity ? 0 : r; var g = color.g; g = g == Infinity ? 0 : g; var b = color.b; b = b == Infinity ? 0 : b;
						r = isNaN(r) ? 0 : r; g = isNaN(g) ? 0 : g; b = isNaN(b) ? 0 : b;
					newColors.push(new BABYLON.Color4(r, g, b, 1));
				});
			}

			glo.colors = newColors;

			if(glo.params.saturation != 0){ newColors = saturation(false, true); }
			if(glo.params.tint != 0){ newColors = tint(false, true); }

			if(glo.params.rColor != 0){ var rColor = glo.params.rColor; newColors.map(newColor => { newColor.r*=rColor; }); }
			if(glo.params.gColor != 0){ newColors = mColorShell(false, true); }
			if(glo.params.bColor != 0){ var bColor = glo.params.bColor; newColors.map(newColor => { newColor.b*=bColor; }); }

			if(glo.params.colorsAbs){ newColors.map(newColor => { newColor.r = abs(newColor.r); newColor.b = abs(newColor.b); newColor.g = abs(newColor.g); }); }

			if(glo.params.colors2){
				var a = 0;
				colors.map(color => {
					var r = ((abs(color.r)) / maxX);
					var g = ((abs(color.g)) / maxY);
					if(r == 0){ r = 1; } if(g == 0){ g = 1; }
					var ind = parseInt(r*g*allPathsNb);
					if(ind > newColors.length - 1){ ind = newColors.length - 1 }

					newColors[ind] = new BABYLON.Color4(newColors[a].r, newColors[a].g, newColors[a].b, 1);
					a++;
				});
			}

			if(glo.params.invCol){
				newColors.map(newColor => { newColor.r = 1 - newColor.r; newColor.b = 1 - newColor.b; newColor.g = 1 - newColor.g; });
			}
			glo.colors = newColors;

			var colorsArray = []; newColors.map(newColor => { colorsArray.push(newColor.r, newColor.g, newColor.b, newColor.a); });
			glo.ribbon.setVerticesData(BABYLON.VertexBuffer.ColorKind, colorsArray);

			return true;
		}

		return false;
	}
	else{
		glo.ribbon.colorByCurvatures();
	}
}

function allColorsSlide(noSlide){
	remake = {tintSlider: true, saturationSlider: true, rotAlphaSlider: true, rotBetaSlider: true, toColRSlider: true, gColorSlider: true};
	remake[noSlide] = false;
	if(glo.params.tint != 0 && remake.tintSlider){ tint(); }
	if(glo.params.saturation != 0 && remake.saturationSlider){ saturation(); }
	if(glo.params.rotAlpha != 0 && remake.rotAlphaSlider){ alphaColor(); }
	if(glo.params.rotBeta != 0 && remake.rotBetaSlider){ betaColor(); }
	if(glo.params.toColR != 0 && remake.toColRSlider){ colByMidSLid(); }
	if(glo.params.gColor != 0 && remake.gColorSlider){ mColorShell(); }
}

function saturation(update = true, fromMakeColors = false){
	return updateColors({ mode: true, updateGloColors: false, update: update, }, function(c){ fCol(c, x => x*=glo.params.saturation); });
}
function tint(update = true, fromMakeColors = false){
	var tint = glo.sliderGain;
	if(fromMakeColors){ tint = glo.params.tint; }
	return updateColors({ mode: true, updateGloColors: true, update: update, }, function(c){ fCol(c, x => x+=tint); });
}
function mColorShell(update = true, fromMakeColors = false){
	var gain = abs(glo.params.gColor);
	var pos = true;
	var coeff = 1 + glo.params.G;
	gain*=coeff;
	var n = 0; var k = 0; var m = glo.params.M
	return updateColors({ mode: glo.params.playWithColors, updateGloColors: true, update: update, }, function(col){
		if(n%2==0){
			var co = abs(cos(gain+k)); var si = abs(sin(gain+k));
			var cps = si+co;
			pos ? fCol(col, x => x/=cps) : fCol(col, x => x*=cps);
		}
		else{
			var co = abs(cos(gain+k)); var si = abs(sin(gain+k));
			var cms = co-si;
			pos ? fCol(col, x => x/=cms) : fCol(col, x => x*=cms);
		}

		n++; k+=PI/m;
	});
}
function modColor(color){
	var col = glo.params[color];
	colorsArr = [];
	switch (color) {
		case 'rColor':
			glo.colors.map(c => { colorsArr.push(c.r * col, c.g, c.b, c.a); });
			break;
		case 'gColor':
			glo.colors.map(c => { colorsArr.push(c.r, c.g * col, c.b, c.a); });
			break;
		case 'bColor':
			glo.colors.map(c => { colorsArr.push(c.r, c.g, c.b * col, c.a); });
			break;
	}
	glo.ribbon.setVerticesData(BABYLON.VertexBuffer.ColorKind, colorsArr);
}

function modColorR(){ modColor('rColor'); }
function modColorG(){ modColor('gColor'); }
function modColorB(){ modColor('bColor'); }

function ribbonToWhite(){
	if((glo.emissiveColor != white || glo.diffuseColor != white) && glo.ribbon.material != null){
		var white = BABYLON.Color3.White();
		glo.ribbon.material.emissiveColor = white; glo.ribbon.material.diffuseColor = BABYLON.Color3.White();
	}
}

function simpleColorsArr_ToArrColors4(arr){
	var arrToReturn = [];
	var arrLength = arr.length;
	for (var i = 0; i < arrLength; i++) {
		arrToReturn.push({
			r: arr[i*4], g: arr[(i*4)+1], b: arr[(i*4)+2], a: arr[(i*4)+3]
		});
	}
	return arrToReturn;
}

function updateColors(options = {}, fUpdate){
	options.updateGloColors = typeof(options.updateGloColors) == 'undefined' ? true : options.updateGloColors;
	options.update = typeof(options.update) == 'undefined' ? true : options.update;
	options.mode = typeof(options.mode) == 'undefined' ? true : options.mode;
	options.toGloColors = typeof(options.toGloColors) == 'undefined' ? true : options.toGloColors;

	if(options.toGloColors){ var colorsToUpdate = glo.colors; }
	else{ var colorsToUpdate = simpleColorsArr_ToArrColors4(glo.ribbon.getVerticesData(BABYLON.VertexBuffer.ColorKind)); }

	var colorsArr = [];
	if(options.mode){
		if(options.updateGloColors){
			colorsToUpdate.map(c => {
				fUpdate(c);
				if(options.update){ colorsArr.push(c.r, c.g, c.b, c.a); }
				else{ colorsArr.push({r: c.r, g: c.g, b: c.b, a: c.a}); }
			});
		}
		else{
			colorsToUpdate.map(c => {
				var col = { r: c.r, g: c.g, b: c.b, a: c.a };
				fUpdate(col);
				if(options.update){ colorsArr.push(col.r, col.g, col.b, col.a); }
				else{ colorsArr.push({r: col.r, g: col.g, b: col.b, a: col.a}); }
			});
		}
		if(options.update){ glo.ribbon.setVerticesData(BABYLON.VertexBuffer.ColorKind, colorsArr); }
		else{ return colorsArr; }
	}

	return false;
}
function fCol(colorToUpdate, f){
	colorToUpdate.r = f(colorToUpdate.r); colorToUpdate.g = f(colorToUpdate.g); colorToUpdate.b = f(colorToUpdate.b);
}

function invCol(){
	updateColors({mode: glo.params.playWithColors, updateGloColors: true }, function(c){ fCol(c, x => x = 1-x) });
}

function mColorB(){
	var pos = glo.is_sliderGainPos;
	var gain = abs(glo.sliderGain);
	var coeff = 1 + glo.params.G;
	gain*=coeff;
	var n = 0; var k = 0; var e = glo.params.E
	updateColors({ mode: glo.params.playWithColors, updateGloColors: true, }, function(col){
		if(n%2==0){
			var co = abs(cos(gain+k)); var si = abs(sin(gain+k));
			var cs = co*si; var cds = co/si; var cms = co-si; var smc = si-co; var cps = si+co;
			if(pos){ col.r/=cs; col.g/=cs; col.b/=cs; }
			else{ col.r*=cs; col.g*= cs; col.b*=cs; }
		}
		else{
			var co = abs(cos(gain+k)); var si = abs(sin(gain+k));
			var cs = co*si; var cds = co/si; var cms = co-si; var smc = si-co; var cps = si+co;
			if(pos){ col.r/=cds; col.g/=cds; col.b/=cds; }
			else{ col.r*=cds; col.g*=cds; col.b*=cds; }
		}

		n++; k+=PI/(1+e);
	});
}

function alphaColor(){
	rotationColors(glo.params.rotAlpha, 0, 0);
}
function betaColor(){
	rotationColors(0, glo.params.rotBeta, 0);
}
function rotationColors(alpha, beta, teta, updateCol = true){
	updateColors({ mode: glo.params.playWithColors, updateGloColors: updateCol, }, function(c){
		var pos = {x: c.r, y: c.g, z: c.b};
		pos = rotateByMatrix(pos, alpha, beta, teta);
		c.r = pos.x; c.g = pos.y; c.b = pos.z;
	});
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
		//var backColor = getRndDarkColor(5);
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
function playWithColors(){
	glo.params.playWithColors = !glo.params.playWithColors;
	if(glo.params.playWithColors){
		saveFunColors();
		var white = BABYLON.Color3.White();
		glo.allControls.getByName('pickerColorDiffuse').value = white;
		glo.allControls.getByName('pickerColorEmissive').value = white;
	}
	else{
		restoreFunColors();
	}
	make_curves();
}
function saveColors(pickers, saveName){
	pickers.map(picker => {
		glo[picker.name + saveName] = {};
		Object.assign(glo[picker.name + saveName], picker.value);
	});
}
function restoreColors(pickers, saveName){
	pickers.map(picker => { picker.value = glo[picker.name + saveName]; });
}
function saveRandomColors(){
	saveColors(glo.allControls.haveThisClass('picker'), 'saveRandomColors');
}
function restoreRandomColors(){
	restoreColors(glo.allControls.haveThisClass('picker'), 'saveRandomColors');
}

function accuade(){
	if(glo.params.playWithColors ){
		var colorsArr = [];
		var acc = 2;
		glo.colors.map(c => {
			if(c.r != c.g || c.r != c.b || c.g != c.b){
				var colorMaxName = c.r > c.g ? "r" : "g";
				if(colorMaxName == 'r'){ colorMaxName = c.r > c.b ? "r" : "b"; }
				else{ colorMaxName = c.g > c.b ? "g" : "b"; }
				if(c[colorMaxName] <= 1 && c[colorMaxName] >= 0.33){ c[colorMaxName] = 1 - ((1 - c[colorMaxName]) / acc); }
				else{ c[colorMaxName]*=acc; }
			}
			colorsArr.push(c.r, c.g, c.b, c.a);
		});
		glo.ribbon.setVerticesData(BABYLON.VertexBuffer.ColorKind, colorsArr);
	}
}
function colByMid(mod = 0.5){
	if(glo.params.playWithColors ){
		var colorsArr = [];
		if(mod > 1){ mod = -mod; }
		glo.colors.map(c => {
			if(c.r != c.g || c.r != c.b || c.g != c.b){
				var colorMidName = 'r';
				if((c.g < c.r && c.g > c.b) || (c.g > c.r && c.g < c.b)){ colorMidName = 'g'; }
				else if((c.b < c.r && c.b > c.g) || (c.b > c.r && c.b < c.g)){ colorMidName = 'b'; }
				if(colorMidName == 'r'){
					c.b = c.b < c.g ? c.b + ((c.r - c.b) * mod) : c.b - ((c.b - c.r) * mod);
					c.g = c.b < c.g ? c.g - ((c.g - c.r) * mod) : c.g + ((c.r - c.g) * mod);
				}
				else if(colorMidName == 'g'){
					c.r = c.r < c.b ? c.r + ((c.g - c.r) * mod) : c.r - ((c.r - c.g) * mod);
					c.b = c.r < c.b ? c.b - ((c.b - c.g) * mod) : c.b + ((c.g - c.b) * mod);
				}
				else if(colorMidName == 'b'){
					c.r = c.r < c.g ? c.r + ((c.b - c.r) * mod) : c.r - ((c.r - c.b) * mod);
					c.g = c.r < c.g ? c.g - ((c.g - c.b) * mod) : c.g + ((c.b - c.g) * mod);
				}
			}
			c.r < 0 ? 0 : c.r; c.g < 0 ? 0 : c.g; c.b < 0 ? 0 : c.b;
			c.r > 1 ? 1 : c.r; c.g > 1 ? 1 : c.g; c.b > 1 ? 1 : c.b;
			colorsArr.push(c.r, c.g, c.b, c.a);
		});
		glo.ribbon.setVerticesData(BABYLON.VertexBuffer.ColorKind, colorsArr);
	}
}
function colByMidSLid(mod = glo.sliderGain){
	glo.params.playWithColors = true;
	var colorsArr = [];
	mod=-mod;
	updateColors({ mode: glo.params.playWithColors, updateGloColors: true, }, function(c){
		var colorMidName = 'r';
		if((c.g < c.r && c.g > c.b) || (c.g > c.r && c.g < c.b)){ colorMidName == 'g'; }
		else if((c.b < c.r && c.b > c.g) || (c.b > c.r && c.b < c.g)){ colorMidName == 'b'; }
		if(colorMidName == 'r'){ c.b = goToNumber(c.b, c.r, mod); c.g = goToNumber(c.g, c.r, mod); }
		else if(colorMidName == 'g'){ c.b = goToNumber(c.b, c.g, mod); c.r = goToNumber(c.r, c.g, mod); }
		else{ c.r = goToNumber(c.r, c.b, mod); c.g = goToNumber(c.g, c.b, mod); }
		c.r < 0 ? 0 : c.r; c.g < 0 ? 0 : c.g; c.b < 0 ? 0 : c.b;
		c.r > 1 ? 1 : c.r; c.g > 1 ? 1 : c.g; c.b > 1 ? 1 : c.b;
	});
}
function goToNumber(numGo, numToGo, k){
	return numGo < numToGo ? numGo + ((numToGo - numGo) * k) : numGo - ((numGo - numToGo) * k);
}
function testCol(){
	if(glo.params.playWithColors ){
		var colorsArr = [];
		var acc = 2;
		glo.colors.map(c => {
			if(c.r != c.g || c.r != c.b || c.g != c.b){
				var colorMaxName = c.r > c.g ? "r" : "g";
				if(colorMaxName == 'r'){ colorMaxName = c.r > c.b ? "r" : "b"; }
				else{ colorMaxName = c.g > c.b ? "g" : "b"; }
				if(c[colorMaxName] < 0.1){ c[colorMaxName] = 1 - ((1 - c[colorMaxName]) / acc); }
			}
			colorsArr.push(c.r, c.g, c.b, c.a);
		});
		glo.ribbon.setVerticesData(BABYLON.VertexBuffer.ColorKind, colorsArr);
	}
}

function voronoi(func = min){
	var paths = glo.ribbon.getPaths();
	const pathsULength = paths.length;
	const pathsVLength = paths[0].length;
	var nbPoints = glo.voronoi.nbPoints;
	var points = []; var colors = [];
	for(var i = 0; i < nbPoints; i++){
		points.push({pt: paths[parseInt(rnd() * (pathsULength - 1))][parseInt(rnd() * (pathsVLength - 1))], color: BABYLON.Color3.Random(), });
	}
	paths.map(path => {
		path.map(p => {
			var distances = [];
			var distancesCalc = [];
			for(var i = 0; i < nbPoints; i++){
				var dist = BABYLON.Vector3.Distance(p, points[i].pt);
				distances.push( { point: points[i], distance: dist, } );
				distancesCalc.push(dist);
			}

			var condition = func(distancesCalc);
			for(var i = 0; i < nbPoints; i++){
				if(distances[i].distance == condition){
					var colorRef = distances[i].point.color;
					break;
				}
			}

			colors.push(colorRef.r, colorRef.g, colorRef.b, 1);
		});
	});
	glo.colors = colors;

	return colors;
}

function meshEquationToColor(){
	['x', 'y', 'z', 'alpha', 'beta'].forEach(inputEndName => {
		const paramsColorName = `text_input_color_${inputEndName}`;
		const paramsCurveName = `text_input_${inputEndName}`;
		const inputColorName  = `input_color_${inputEndName}`;
		const inputCurveName  = `input_${inputEndName}`;

		glo.params[paramsColorName] = glo.params[paramsCurveName];
		glo[inputColorName].text    = glo[inputCurveName].text;
	});
}

function* playWithColNextMode(){
  var index = 0;
  var tab = ['xyz', 'all', 'none'];
  while(true){
		index++;
		if(index == tab.length){ index = 0; }
		glo.params.playWithColorMode = tab[index];
    yield tab[index];
  }
}