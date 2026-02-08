async function whellSwitchForm(){
	var formSelect = glo.formes.getFormSelect();
	if(formSelect){
	  var numFormSelect = formSelect.num;
	  var numFormSelectInCoordType = formSelect.numFormInCoorType;
		var formsLengthInCoordType = glo.formes.getNbFormsInThisCoordtype();
		var numFirstFormInCoorType = glo.formes.getNumFirstFormInCoordType();
		var numLastFormInCoorType  = glo.formes.getNumLastFormInCoordType();
		if(glo.whellSwitchFormDown){
			var numFormToSelect = numFirstFormInCoorType;
			if(numFormSelectInCoordType < formsLengthInCoordType - 1){ numFormToSelect = numFormSelect + 1; }
		}
		else{
			var numFormToSelect = numLastFormInCoorType;
			if(numFormSelectInCoordType > 0){ numFormToSelect = numFormSelect - 1; }
		}
		await glo.formes.setFormSelectByNum(numFormToSelect);

		var formSelected = glo.formes.getFormSelect();
		var nameRadioFormToSelect = "Radio-" + formSelected.form.text;
		glo.radios_formes.setCheckByName(nameRadioFormToSelect);
	}
	else{
		await glo.formes.setFormSelectByNum(glo.formes.getNumFirstFormInCoordType());

		var formSelected = glo.formes.getFormSelect();
		var nameRadioFormToSelect = "Radio-" + formSelected.form.text;
		glo.radios_formes.setCheckByName(nameRadioFormToSelect);
	}
}

async function genInTwoWays(gen, varToStoreValGen, normalSens = true){
	let newOrient = '';

	if(normalSens){ newOrient = gen.next().value; }
	else{
		const currentOrient = glo[varToStoreValGen];
		
		while(gen.next().value !== currentOrient){
			newOrient = glo[varToStoreValGen];
		}
		glo[varToStoreValGen] = newOrient;

		while(gen.next().value !== newOrient){}
	}
}

function switchCoords(normalSens = true){
	genInTwoWays(glo.coordinatesType, 'coordsType', normalSens);

	switchDrawCoordsType();
	add_radios();

	glo.formesSuit = false;
}

function switchShader(normalSens = true, edit = glo.editor){
	  genInTwoWays(glo.numShaderMove, 'numShaderSelect', normalSens);
      fragmentShader = fragmentShaderHeader + fragmentShaders[glo.numShaderSelect] + fragmentShaderFooter;

      if(edit){
		edit.setValue(fragmentShader);
	  }

	  getById('shaderSelect').value = glo.numShaderSelect;

	  // Mettre à jour uniquement le fragment shader sans reconstruire le mesh
	  if (glo.ribbon && glo.ribbon.shaderMeshInstance) {
		glo.ribbon.shaderMeshInstance.updateFragmentShader(fragmentShaders[glo.numShaderSelect]);
	  } else {
		remakeRibbon();
	  }
}

function switchSymmetrizeOrder(normalSens = true){
	genInTwoWays(glo.symmetrizeOrders, 'symmetrizeOrder', normalSens);

	glo.allControls.getByName('symmetrizeOrder').textBlock.text = "S order : " + glo.symmetrizeOrder.toUpperCase();

	// Mettre à jour l'uniform uSymOrder directement si le shader mesh existe
	if (glo.ribbon && glo.ribbon.shaderMeshInstance) {
		const orderStr = (glo.symmetrizeOrder || 'xyz').toLowerCase();
		const axisMap = { x: 0.0, y: 1.0, z: 2.0 };
		glo.ribbon.shaderMeshInstance.shaderMaterial.setVector3("uSymOrder", new BABYLON.Vector3(
			axisMap[orderStr[0]] ?? 0.0,
			axisMap[orderStr[1]] ?? 1.0,
			axisMap[orderStr[2]] ?? 2.0
		));
	} else {
		remakeRibbon();
	}
}

function switchRightPanel(normalSens = true){
	genInTwoWays(glo.switchGuiSelect, 'guiSelect', normalSens);

	toggleRightPanels(glo.guiSelect);
}

function toggleRightPanels(rightPanelToShowClass, toShow = true){
	glo.rightPanelsClasses
		.filter(rightPanelClass => toShow ? (rightPanelClass !== rightPanelToShowClass) : (1 === 1))
		.forEach(rightPanelClass => toggleGuiControlsByClass(false, rightPanelClass));
	if(toShow){ toggleGuiControlsByClass(true, rightPanelToShowClass); }
}

function switchWritingType(long){
	var f = {
		x: glo.input_x.text,
		y: glo.input_y.text,
		z: glo.input_z.text,
		alpha: glo.input_alpha.text,
		beta: glo.input_beta.text,
	};

	if(!long){
		for(var prop in f){
			f[prop] = f[prop].replace(/cos\(u\+v\)/g, "cupv");
			f[prop] = f[prop].replace(/cos\(u-v\)/g, "cumv");
			f[prop] = f[prop].replace(/cos\(v-u\)/g, "cvmu");
			f[prop] = f[prop].replace(/cos\(u\/v\)/g, "cudv");
			f[prop] = f[prop].replace(/cos\(u\*v\)/g, "cufv");
			f[prop] = f[prop].replace(/sin\(u\+v\)/g, "supv");
			f[prop] = f[prop].replace(/sin\(u-v\)/g, "sumv");
			f[prop] = f[prop].replace(/sin\(v-u\)/g, "svmu");
			f[prop] = f[prop].replace(/sin\(u\/v\)/g, "sudv");
			f[prop] = f[prop].replace(/sin\(u\*v\)/g, "sufv");
			f[prop] = f[prop].replace(/cos\(u\)/g, "cu");
			f[prop] = f[prop].replace(/sin\(u\)/g, "su");
			f[prop] = f[prop].replace(/cos\(v\)/g, "cv");
			f[prop] = f[prop].replace(/sin\(v\)/g, "sv");
		}
	}
	else{
		for(var prop in f){
			f[prop] = f[prop].replace(/cupv|cvpu/g, "cos(u+v)");
			f[prop] = f[prop].replace(/cumv/g, "cos(u-v)");
			f[prop] = f[prop].replace(/cvmu/g, "cos(v-u)");
			f[prop] = f[prop].replace(/cudv|cvdu/g, "cos(u/v)");
			f[prop] = f[prop].replace(/cufv|cvfu/g, "cos(u*v)");
			f[prop] = f[prop].replace(/supv|svpu/g, "sin(u+v)");
			f[prop] = f[prop].replace(/sumv/g, "sin(u-v)");
			f[prop] = f[prop].replace(/svmu/g, "sin(v-u)");
			f[prop] = f[prop].replace(/sudv|svdu/g, "sin(u/v)");
			f[prop] = f[prop].replace(/sufv|svfu/g, "sin(u*v)");
			f[prop] = f[prop].replace(/cu/g, "cos(u)");
			f[prop] = f[prop].replace(/cu/g, "cos(u)");
			f[prop] = f[prop].replace(/cu/g, "cos(u)");
			f[prop] = f[prop].replace(/su/g, "sin(u)");
			f[prop] = f[prop].replace(/cv/g, "cos(v)");
			f[prop] = f[prop].replace(/sv/g, "sin(v)");
		}
	}

	glo.input_x.text = f.x;
	glo.input_y.text = f.y;
	glo.input_z.text = f.z;
	glo.input_alpha.text = f.alpha;
	glo.input_beta.text = f.beta;

	glo.params.text_input_x = f.x;
	glo.params.text_input_y = f.y;
	glo.params.text_input_z = f.z;
	glo.params.text_input_alpha = f.alpha;
	glo.params.text_input_beta = f.beta;
}

async function invElemInInput(toInv_1, toInv_2, makeCurve = true){
	var f = {
		x: glo.input_x.text,
		y: glo.input_y.text,
		z: glo.input_z.text,
		alpha: glo.input_alpha.text,
		beta: glo.input_beta.text,
	};
	f = reg_inv(f, toInv_1, toInv_2);
	glo.input_x.text = f.x;
	glo.input_y.text = f.y;
	glo.input_z.text = f.z;
	glo.input_alpha.text = f.alpha;
	glo.input_beta.text = f.beta;

	glo.params.text_input_x = f.x;
	glo.params.text_input_y = f.y;
	glo.params.text_input_z = f.z;
	glo.params.text_input_alpha = f.alpha;
	glo.params.text_input_beta = f.beta;

	if(toInv_1 === 'u' && toInv_2 === 'v'){
		let remakeCurve = true;
		if(glo.allControls.getByName('stepU').value !== glo.allControls.getByName('stepV').value){
			const stepU = glo.allControls.getByName('stepU').value; 
			glo.allControls.getByName('stepU').value = glo.allControls.getByName('stepV').value;
			glo.allControls.getByName('stepV').value = stepU;
			remakeCurve = false;
		}
		if(glo.allControls.getByName('u').value !== glo.allControls.getByName('v').value){
			const U = glo.allControls.getByName('u').value; 
			glo.allControls.getByName('u').value = glo.allControls.getByName('v').value;
			glo.allControls.getByName('v').value = U;
			remakeCurve = false;
		}
		if(remakeCurve){
			await remakeRibbon();
		}
	}
	else if(makeCurve){
		await remakeRibbon();
	}
}

function slidersAnim(name, speed = 1, dir = 1){
	var slider = glo.allControls.getByName(name);
	valToAdd = ((slider.maximum - slider.minimum) / 720) * speed;
	if(speed == 0){ valToAdd = 1; }
	slider.value += valToAdd * dir;
}

function startAnim(duration, nb_turns){
	var rot_animation = new BABYLON.Animation("startAnimation", "alpha", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_RELATIVE);

  var keys_rot = [];
  keys_rot.push({
      frame: 0,
      value: 0
  });
  keys_rot.push({
      frame: duration,
      value: nb_turns*Math.PI,
  });
  rot_animation.setKeys(keys_rot);

	glo.scene.beginDirectAnimation(glo.camera, [rot_animation], 0, duration, true, 1, afterAnimation);
}

var afterAnimation = function() {

};

function paramsToControls(){
	glo.skipRebuild = true;
	glo.allControls.getByName('u').value = glo.params.u;
	glo.allControls.getByName('v').value = glo.params.v;
	glo.allControls.getByName('stepU').value = glo.params.steps_u;
	glo.allControls.getByName('stepV').value = glo.params.steps_v;
	glo.allControls.getByName('A').value = glo.params.A;
	glo.allControls.getByName('B').value = glo.params.B;
	glo.allControls.getByName('C').value = glo.params.C;
	glo.allControls.getByName('D').value = glo.params.D;
	glo.allControls.getByName('E').value = glo.params.E;
	glo.allControls.getByName('F').value = glo.params.F;
	glo.allControls.getByName('G').value = glo.params.G;
	glo.allControls.getByName('H').value = glo.params.H;
	glo.allControls.getByName('I').value = glo.params.I;
	glo.allControls.getByName('J').value = glo.params.J;
	glo.allControls.getByName('K').value = glo.params.K;
	glo.allControls.getByName('L').value = glo.params.L;
	glo.allControls.getByName('M').value = glo.params.M;
	glo.allControls.getByName('saturationSlider').value = glo.params.saturation;
	glo.allControls.getByName('tintSlider').value = glo.params.tint;
	glo.allControls.getByName('rotAlphaSlider').value = glo.params.rotAlpha;
	glo.allControls.getByName('rotBetaSlider').value = glo.params.rotBeta;
	glo.allControls.getByName('rColorSlider').value = glo.params.rColor;
	glo.allControls.getByName('gColorSlider').value = glo.params.gColor;
	glo.allControls.getByName('bColorSlider').value = glo.params.bColor;
	glo.allControls.getByName('itColorsSlider').value = glo.params.itColors;

	glo.allControls.getByName('inputX').text = glo.params.text_input_x;
	glo.allControls.getByName('inputY').text = glo.params.text_input_y;
	glo.allControls.getByName('inputZ').text = glo.params.text_input_z;
	glo.allControls.getByName('inputAlpha').text = glo.params.text_input_alpha;
	glo.allControls.getByName('inputBeta').text = glo.params.text_input_beta;
	glo.allControls.getByName('inputColorX').text = glo.params.text_input_color_x;
	glo.allControls.getByName('inputColorY').text = glo.params.text_input_color_y;
	glo.allControls.getByName('inputColorZ').text = glo.params.text_input_color_z;
	glo.allControls.getByName('inputColorAlpha').text = glo.params.text_input_color_alpha;
	glo.allControls.getByName('inputColorBeta').text = glo.params.text_input_color_beta;
	glo.skipRebuild = false;
}

function isInputsEquationsSameAsRadioCheck(){
	var p = glo.params;
	var form = glo.formes.getFormByName(p.formName, p.coordsType);
	var formAlpha = ""; var formBeta = "";
	if(typeof(form.alpha) != "undefined"){ formAlpha = form.alpha; }
	if(typeof(form.beta) != "undefined"){ formBeta = form.beta; }
	if(p.text_input_x == form.fx && p.text_input_y == form.fy && p.text_input_z == form.fz && p.text_input_alpha == formAlpha && p.text_input_beta == formBeta){
		return true;
	}

	return false;
}

function switchDrawCoordsType(update_slider_uv = true){
	if(update_slider_uv){ change_slider_uv(); }
	switch (glo.coordsType) {
		case 'cartesian':
			changeHeaderText('header_inputX', 'X');
			changeHeaderText('header_inputY', 'Y');
			changeHeaderText('header_inputZ', 'Z');
			changeHeaderText('header_inputAlpha', 'Rot Z');
			changeHeaderText('header_inputBeta', 'Rot Y');

			glo.allControls.getByName("but_coord").textBlock.text = "CART"; 
		break;
		case 'spheric':
			changeHeaderText('header_inputX', 'R');
			changeHeaderText('header_inputY', 'Rot Z');
			changeHeaderText('header_inputZ', 'Rot Y');
			changeHeaderText('header_inputAlpha', 'Rot2 Y');
			changeHeaderText('header_inputBeta', 'Rot2 Z');

			glo.allControls.getByName("but_coord").textBlock.text = "SPHE"; 
		break;
		case 'cylindrical':
			changeHeaderText('header_inputX', 'R');
			changeHeaderText('header_inputY', 'Rot Z');
			changeHeaderText('header_inputZ', 'Z');
			changeHeaderText('header_inputAlpha', 'Rot2 Z');
			changeHeaderText('header_inputBeta', 'Rot Y');

			glo.allControls.getByName("but_coord").textBlock.text = "CYL"; 
		break;
	}
}

function changeHeaderText(headerName, newText){
	glo.allControls.haveThisClass("header").getByName(headerName).text = newText;
}

function resetEquationsParamSliders(){
	glo.allControls.haveThisClass('input').forEach(input => {
		input.text = '';
	});
	for(let prop in glo.params){
		if(prop.includes('text_input')){ glo.params[prop] = ''; }
		else if(prop.includes('symmetrize') && !prop.includes('symmetrizeAngle')){ glo.params[prop] = 0; }
	}
	glo.allControls.getByName('u').value = PI;
	glo.allControls.getByName('v').value = PI;
}

function change_slider_uv(){
	if(glo.coordsType == 'spheric'){ glo.slider_u.value += 0.0000002; }
	else if(glo.coordsType == 'cylindrical'){ glo.slider_u.value -= 0.0000001; }
	else{ glo.slider_u.value -= 0.0000001; }
}

function firstInputToOthers(){
	const val = glo.input_x.text;

	glo.input_beta.text  = val;
	glo.input_alpha.text = val;
	glo.input_z.text 	 = val;
	glo.input_y.text 	 = val;

	glo.params.text_input_beta 	= val;
	glo.params.text_input_alpha = val;
	glo.params.text_input_z 	= val;
	glo.params.text_input_y 	= val;

	make_curves();
}

function cameraOnPos(pos){
	glo.camera.setTarget(new BABYLON.Vector3(pos.x, pos.y, pos.z));
	glo.camera.setPosition(new BABYLON.Vector3(pos.x, pos.y, pos.z));
}

function swapControlBackground(controlName, background = glo.controlConfig.background, backgroundActived = glo.controlConfig.backgroundActived){
	let control = glo.allControls.getByName(controlName);

	control.background = control.background === background ? backgroundActived : background;
}

function otherDesigns(){
	glo.bgActivedButtons.forEach(buttonName => {
		glo.allControls.getByName(buttonName).background = glo.controlConfig.backgroundActived;
	});

	param_special_controls();
}

function param_special_controls(){
	glo.allControls.getByName('inputsColorsEquations').top = '27%';
	glo.allControls.getByName('centerLocal').width         = '115px';
	glo.allControls.getByName('symmetrizeOrder').width     = '115px';
	glo.allControls.getByName('symmetrizeAdding').width    = '125px';
	glo.allControls.getByName('centerLocal').height        = '30px';

	glo.allControls.getByName('centerLocal').paddingRight     = '5px';
	glo.allControls.getByName('symmetrizeOrder').paddingLeft  = '5px';
	glo.allControls.getByName('symmetrizeAdding').paddingLeft = '10px';

	glo.allControls.getByName('paramSymmetrizeSlidersPanelButton').height      = '40px';
	glo.allControls.getByName('paramSymmetrizeSlidersPanelButton').paddingLeft = '65px';

	for(i = 1; i < 8; i++){ glo.allControls.getByName(`panelButtonEleventh${i}`).isVertical = false; }

	glo.allControls.getByName(`pickerColorPanel1`).isVertical = false;
	glo.allControls.getByName(`pickerColorPanel2`).isVertical = false;
	glo.allControls.getByName(`pickerColorPanel3`).isVertical = false;
	glo.allControls.getByName(`colorHeaderPanel`).height  = "5%";
	glo.allControls.getByName(`colorHeaderPanel`).top     = "5%";
	glo.allControls.getByName(`pickerColorPanel1`).height = "12%";
	glo.allControls.getByName(`pickerColorPanel1`).left   = "5%";
	glo.allControls.getByName(`pickerColorPanel2`).top    = "15%";
	glo.allControls.getByName(`pickerColorPanel2`).left   = "40.5%";
	glo.allControls.getByName(`pickerColorPanel2`).height = "12%";
	glo.allControls.getByName(`pickerColorPanel3`).top    = "30%";
	glo.allControls.getByName(`pickerColorPanel3`).left   = "40.5%";
	glo.allControls.getByName(`pickerColorPanel3`).height = "12%";
  
	glo.allControls.haveThisClass('slider').map(slider => {
		for(const prop in glo.theme.slider){ slider[prop] = glo.theme.slider[prop]; }
	});
	glo.allControls.haveThisClass('input').map(input => {
		for(const prop in glo.theme.input.onBlur){ input[prop] = glo.theme.input.onBlur[prop]; }
	});

	glo.allControls.haveTheseClasses('header', 'right', 'seventh', 'noAutoParam').map(header => {header.height = '25px'; });
	glo.allControls.haveTheseClasses('header', 'right', 'eighth', 'noAutoParam').map(header => {header.height = '23px'; });
	glo.allControls.haveTheseClasses('header', 'right', 'fourth', 'noAutoParam').map(header => {header.height = '24px'; });
	glo.allControls.haveTheseClasses('header', 'right', 'sixth', 'noAutoParam').map(header => {header.height = '24px'; });
	glo.allControls.haveTheseClasses('header', 'right', 'second', 'noAutoParam').map(header => {header.height = '25px'; });

	glo.allControls.getByName('header_inputRSymmetrize').fontSize = '14px';
	glo.allControls.getByName('header_inputRSymmetrize').color    = 'white';
}

function paramRadios(){
	glo.allControls.haveTheseClasses('header', 'radio', 'left', 'first', 'noAutoParam').map(header => {
		for(const prop in glo.theme.radio.text){ header[prop] = glo.theme.radio.text[prop]; }
	});
	glo.allControls.haveTheseClasses('radio', 'left', 'first').haveNotThisClass('header').map(radio => {
		for(const prop in glo.theme.radio.button){ radio[prop] = glo.theme.radio.button[prop]; }
	});
}

function gui_resize(){
	var w = window.screen.width;
	var h = window.screen.height;
	var coeff = glo.coeff_gui_resize.width_1920;
	if(w < 1367){ coeff = glo.coeff_gui_resize.width_1366; }
	else if(w < 1601){ coeff = glo.coeff_gui_resize.width_1600; }

	coeff/=Math.pow(window.devicePixelRatio, 0.75);

	glo.advancedTexture.idealWidth = w / coeff;
	glo.advancedTexture.idealHeight = h / coeff;
}

function changeResolution(change = 'increase'){
	const coeff = change === 'increase' ? 2 : 0.5;
	glo.resolutionCoeff *= coeff;

	glo.skipRebuild = true;
	glo.slider_nb_steps_u.maximum*=coeff;
	glo.slider_nb_steps_v.maximum*=coeff;

	glo.slider_nb_steps_u.value*=coeff;
	glo.slider_nb_steps_v.value*=coeff;
	glo.skipRebuild = false;

	remakeRibbon();
}

function uvToXy(){
	const regs = glo.params.uvToXy ? [{exp: /u/gi, upd: "X"}, {exp: /v/gi, upd: "Y"}] : [{exp: /X/gi, upd: "u"}, {exp: /Y/gi, upd: "v"}];

	["x", "y", "z", "alpha", "beta", "sym_r"].forEach(nameInput =>  {
		regs.forEach(reg => {
			glo[`input_${nameInput}`].text = glo[`input_${nameInput}`].text.replace(reg.exp, reg.upd);
		});
		glo.params[`text_input_${nameInput}`] = glo[`input_${nameInput}`].text;
	 });

	 if(!glo.input_eval_x.text && !glo.input_eval_y.text){
		glo.input_eval_x.text = 'u';
		glo.input_eval_y.text = 'v';

		glo.params.text_input_eval_x = 'u';
		glo.params.text_input_eval_y = 'v';
	 }
}

function reg(f) {
    for (var prop in f) {
        if(f[prop]){ f[prop] = regOne(f[prop]); }
    }

	glo.formule.push(f);

    return f;
}

function regOneTest(expReg) {
	console.log("=== regOne START ===");
	console.log("Input:", expReg, "| Type:", typeof expReg);
	
	if (expReg == "'") {
		console.log("Cas spécial: apostrophe détectée, remplacement par '0'");
		expReg = "0";
	}
	else if(expReg) {
		expReg = expReg.toString();
		console.log("Après toString():", expReg);
		
		for (let i = 0; i < glo.regs.length; i++) {
			const avant = expReg;
			expReg = expReg.replace(glo.regs[i].exp, glo.regs[i].upd);
			if (avant !== expReg) {
				console.log(`Regex #${i} a matché:`, glo.regs[i].exp);
				console.log(`  Avant: "${avant}"`);
				console.log(`  Après: "${expReg}"`);
			}
		}
	}
	else {
		console.log("expReg est falsy, aucune transformation");
	}
	
	console.log("Output final:", expReg);
	console.log("=== regOne END ===");
	return expReg;
}

function regOne(expReg) {
	if (expReg == "'") {
		expReg = "0";
	}
	else if(expReg) {
		expReg = expReg.toString();
		for (let i = 0; i < glo.regs.length; i++) {
			expReg = expReg.replace(glo.regs[i].exp, glo.regs[i].upd);
		}
	}
    return expReg;
}

function reg_inv(f, toInv_1, toInv_2){
	var reg_toInv_1 = new RegExp(toInv_1, "g");
	var reg_toInv_tmp = new RegExp(toInv_1 + "_tmp", "g");
	var reg_toInv_2 = new RegExp(toInv_2, "g");
	for(var prop in f){
		f[prop] = f[prop].replace(reg_toInv_1, toInv_2 + "_tmp");
		f[prop] = f[prop].replace(reg_toInv_2, toInv_1);
		f[prop] = f[prop].replace(reg_toInv_tmp, toInv_2);
	}

	return f;
}

function getFixedExportBounds(margin = 20, correction = 1) {
    const w = glo.canvas.width;
    const h = glo.canvas.height;

    const coeff = 0.5 * glo.videoBoxRange * correction;
    const baseSize = Math.min(w, h);
    const size = baseSize * coeff + margin * coeff;

    return {
        x: w / 2 - size / 2,
        y: h / 2 - size / 2,
        width: size,
        height: size
    };
}

function createMeshRecorder(mesh, scene, fps = 60) {
    const sourceCanvas = glo.engine.getRenderingCanvas();
    const captureCanvas = document.createElement('canvas');
    const ctx = captureCanvas.getContext('2d');

    let mediaRecorder = null;
    let chunks = [];
    let observer = null;
    let bounds = null;

    function computeBounds() {
        const sw = sourceCanvas.width;
        const sh = sourceCanvas.height;

        const coeff = 0.5 * glo.videoBoxRange;
        const baseSize = Math.min(sw, sh);
        const size = baseSize * coeff + 20 * coeff;

        return {
            x: Math.max(0, sw / 2 - size / 2),
            y: Math.max(0, sh / 2 - size / 2),
            width: Math.min(size, sw),
            height: Math.min(size, sh)
        };
    }

    function startRecording() {
        bounds = computeBounds();
        captureCanvas.width = bounds.width;
        captureCanvas.height = bounds.height;

        chunks = [];

        let mimeType;
        if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
            mimeType = 'video/webm;codecs=h264';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
            mimeType = 'video/webm;codecs=vp9';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
            mimeType = 'video/webm';
        } else {
            mimeType = 'video/mp4';
        }

        const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';

        const stream = captureCanvas.captureStream(fps);
        mediaRecorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: 15000000
        });

        mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            if (chunks.length === 0) return;
            const blob = new Blob(chunks, { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mesh-${Date.now()}.${extension}`;
            a.click();
            URL.revokeObjectURL(url);
        };

        mediaRecorder.onerror = e => console.error('Recorder error:', e);

        observer = scene.onAfterRenderObservable.add(() => {
            ctx.drawImage(
                sourceCanvas,
                bounds.x, bounds.y, bounds.width, bounds.height,
                0, 0, captureCanvas.width, captureCanvas.height
            );
        });

        mediaRecorder.start(1000);
    }

    return {
        start() {
            glo.engine.setHardwareScalingLevel(1 / 2);

            // Attendre 2 frames pour que le resize soit stabilisé
            scene.onAfterRenderObservable.addOnce(() => {
                scene.onAfterRenderObservable.addOnce(() => {
                    startRecording();
                });
            });
        },

        stop() {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                if (observer) {
                    scene.onAfterRenderObservable.remove(observer);
                    observer = null;
                }
                glo.engine.setHardwareScalingLevel(1);
            }
        },

        get isRecording() {
            return mediaRecorder?.state === 'recording';
        }
    };
}

function updateVideoCropBox() {
  if (glo.videoCropBox) {
    glo.videoCropBox.dispose();
  }
  
  const bounds = getFixedExportBounds();
  const canvas = glo.engine.getRenderingCanvas();
  
  if (!glo.videoCropBoxGUI) {
    glo.videoCropBoxGUI = new BABYLON.GUI.Rectangle("videoCropBox");
    glo.advancedTexture.addControl(glo.videoCropBoxGUI);
  }
  
  const rect = glo.videoCropBoxGUI;
  
  rect.width  = bounds.width + "px";
  rect.height = bounds.height + "px";
  
  // Convertir de coordonnées écran (0,0 = top-left) 
  // vers coordonnées GUI centrées (0,0 = center)
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  
  rect.left = (centerX - canvas.clientWidth / 2) + "px";
  rect.top  = (centerY - canvas.clientHeight / 2) + "px";
  
  rect.thickness           = 2;
  rect.color               = "yellow";
  rect.background          = "transparent";
  rect.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
  rect.verticalAlignment   = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
  
  rect.isVisible = true;
}

function hideVideoCropBox() {
  if (glo.videoCropBoxGUI) {
    glo.videoCropBoxGUI.isVisible = false;
  }
}

function switchRecordingVideo(){
	glo.video.recording = !glo.video.recording;

	if(glo.video.recording){
		glo.video.recorder = createMeshRecorder(glo.ribbon, glo.scene);
		glo.video.recorder.start();
	}
	else{
		glo.video.recorder.stop();
	}
}

function parseFontSize(fontSize) {
    if (typeof fontSize === 'number') return fontSize;
    return parseFloat(fontSize) || 0;
}

function applyFont(control, fontFamily, fontWeight = 400, fontSizeToAdd = 0) {
	if (control.textBlock) {
        control.textBlock.fontFamily = fontFamily;
        control.textBlock.fontWeight = fontWeight;
        if (fontSizeToAdd) {
            control.textBlock.fontSize = parseFontSize(control.textBlock.fontSize) + fontSizeToAdd + "px";
        }
    }
    else if (control.fontFamily !== undefined) {
        control.fontFamily = fontFamily;
        control.fontWeight = fontWeight;
        if (fontSizeToAdd) {
            control.fontSize = parseFontSize(control.fontSize) + fontSizeToAdd + "px";
        }
    }
}

function applyFontToHeaders(fontFamily, fontWeight = 400, fontSizeToAdd = false) {
  glo.allControls.haveThisClass('header').haveNotThisClass('radio').haveNotThisClass('title').forEach(control => {
      applyFont(control, fontFamily, fontWeight, fontSizeToAdd);
  });
  glo.allControls.haveThisClass('title').haveNotThisClass('radio').forEach(control => {
      applyFont(control, fontFamily, fontWeight+300, fontSizeToAdd);
  });
}
function applyFontToButtons(fontFamily, fontWeight = 400, fontSizeToAdd = false) {
  glo.allControls.haveThisClass('button').haveNotThisClass('radio').forEach(control => {
      applyFont(control, fontFamily, fontWeight, fontSizeToAdd);
  });
}
function applyFontToInputs(fontFamily, fontWeight = 400, fontSizeToAdd = false) {
  glo.allControls.haveThisClass('input').forEach(control => {
      applyFont(control, fontFamily, fontWeight, fontSizeToAdd);
  });
}
function applyFontStyleToTitle(fontWeight = 600) {
	glo.allControls.haveThisClass('header').haveNotThisClass('title').forEach(control => {
	  control.color = glo.theme.header.text.color;
  });
  glo.allControls.haveThisClass('title').forEach(control => {
      control.fontWeight = fontWeight;
	  control.color = glo.theme.header.title.color;
  });
  glo.allControls.haveThisClass('h1').forEach(control => { control.fontSize = 48; });
}
function customSlidersBar(barOffset, thumbWidth = false) {
  glo.allControls.haveThisClass('slider').forEach(control => {
      control.barOffset = barOffset;
      if(thumbWidth) control.thumbWidth = thumbWidth;
  });
}

function styleUI(fontSizeToAdd = -1){		
	applyFontToHeaders('Poppins', 300, fontSizeToAdd);
    applyFontToButtons('Poppins', 400, fontSizeToAdd);
    applyFontToInputs('Inter', 400, fontSizeToAdd);
    applyFontStyleToTitle();
    customSlidersBar("6px", "21px");
}