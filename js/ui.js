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

function switchEqSphericToCylindrical(){
	var r = glo.input_x.text;
	var alpha = glo.input_y.text;
	var beta = glo.input_z.text;

	glo.input_x.text = r + "sin(" + alpha + ")";
	glo.input_y.text = beta;
	glo.input_z.text = r + "cos(" + alpha + ")";

	glo.params.text_input_x = glo.input_x.text;
	glo.params.text_input_y = glo.input_y.text;
	glo.params.text_input_z = glo.input_z.text;

	switchCoords();
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

async function switchColorByCurve(normalSens = true){
	genInTwoWays(glo.colorByCurves, 'colorByCurve', normalSens);	
}

async function switchFractalOrient(normalSens = true){
	genInTwoWays(glo.fractalizeOrients, 'fractalizeOrient', normalSens);

	const newOrient = glo.fractalizeOrient;

	const orient = newOrient ? `Rot ${newOrient.x ? 'X' : ''}${newOrient.y ? 'Y' : ''}${newOrient.z ? 'Z' : ''}` : 'No Rot';

	glo.allControls.getByName("fractalizeRotActive").textBlock.text = orient;
    await remakeRibbon('fractalize');
}

function switchSymmetrizeOrder(normalSens = true){
	genInTwoWays(glo.symmetrizeOrders, 'symmetrizeOrder', normalSens);

	glo.allControls.getByName('symmetrizeOrder').textBlock.text = "S order : " + glo.symmetrizeOrder.toUpperCase();

	remakeRibbon();
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

function scaleSlidersUV(coeff){
	if(typeof(glo.scaleSlidersUV) == "undefined"){ glo.scaleSlidersUV = 1; }
	glo.scaleSlidersUV *= coeff;

	glo.slider_u.maximum *= coeff;
	glo.slider_v.maximum *= coeff;
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

function sliders_animations(){
	if(glo.guiAnims.sliderU){ slidersAnim('u'); }
	if(glo.guiAnims.sliderV){ slidersAnim('v'); }
	if(glo.guiAnims.stepU){ slidersAnim('stepU', 0); }
	if(glo.guiAnims.stepV){ slidersAnim('stepV', 0); }
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
	glo.fromHisto = true;

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

	glo.fromHisto = false;
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
		case 'spheric':
			changeHeaderText('header_inputX', 'R');
			changeHeaderText('header_inputY', 'Rot Z');
			changeHeaderText('header_inputZ', 'Rot Y');
			changeHeaderText('header_inputAlpha', 'R (Q)');
			changeHeaderText('header_inputBeta', 'W');

			glo.allControls.getByName("but_coord").textBlock.text = "SPHE"; 
			break;
		case 'quaternion':
			changeHeaderText('header_inputX', 'R');
			changeHeaderText('header_inputY', 'Axis X');
			changeHeaderText('header_inputZ', 'Axis Y');
			changeHeaderText('header_inputAlpha', 'Axis Z');
			changeHeaderText('header_inputBeta', 'W');

			glo.allControls.getByName("but_coord").textBlock.text = "QUAC"; 
			break;
		case 'quaternionRotAxis':
			changeHeaderText('header_inputX', 'R');
			changeHeaderText('header_inputY', 'Axis Rot Y');
			changeHeaderText('header_inputZ', 'Axis Rot Z');
			changeHeaderText('header_inputAlpha', 'W');
			changeHeaderText('header_inputBeta', 'ROT Y');

			glo.allControls.getByName("but_coord").textBlock.text = "QUAR"; 
			break;
		case 'cylindrical':
			changeHeaderText('header_inputX', 'R');
			changeHeaderText('header_inputY', 'Rot Z');
			changeHeaderText('header_inputZ', 'Z');
			changeHeaderText('header_inputAlpha', 'R (Q)');
			changeHeaderText('header_inputBeta', 'W');

			glo.allControls.getByName("but_coord").textBlock.text = "CYL"; 
			break;
		case 'curvature':
			changeHeaderText('header_inputX', 'R');
			changeHeaderText('header_inputY', 'Alpha');
			changeHeaderText('header_inputZ', 'Beta');
			changeHeaderText('header_inputAlpha', 'R (Q)');
			changeHeaderText('header_inputBeta', 'W');

			glo.allControls.getByName("but_coord").textBlock.text = "CURV"; 
			break;
		case 'cartesian':
			changeHeaderText('header_inputX', 'X');
			changeHeaderText('header_inputY', 'Y');
			changeHeaderText('header_inputZ', 'Z');
			changeHeaderText('header_inputAlpha', 'R');
			changeHeaderText('header_inputBeta', 'W');

			glo.allControls.getByName("but_coord").textBlock.text = "CART"; 
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

function resetInputsRibbonEquations(){
	var prsNorm = glo.params.normale;
	glo.input_x.text = prsNorm.text_input_x; glo.input_y.text = prsNorm.text_input_y; glo.input_z.text = prsNorm.text_input_z;
	glo.input_alpha.text = prsNorm.text_input_alpha; glo.input_beta.text = prsNorm.text_input_beta;
}
function restoreInputsRibbonEquations(){
	var prs = glo.params;
	glo.input_x.text = prs.text_input_x; glo.input_y.text = prs.text_input_y; glo.input_z.text = prs.text_input_z;
	glo.input_alpha.text = prs.text_input_alpha; glo.input_beta.text = prs.text_input_beta;
}

function reset_camera(){
	var radius = glo.camera.radius;
	glo.camera.setTarget(new BABYLON.Vector3(glo.ribbon.position.x, glo.ribbon.position.y, glo.ribbon.position.z));
	glo.camera.setPosition(new BABYLON.Vector3(glo.ribbon.position.x, glo.ribbon.position.y, glo.ribbon.position.z - 12));
	glo.camera.radius = radius;
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
	glo.allControls.getByName('symmetrizeAdding').width     = '125px';
	glo.allControls.getByName('centerLocal').height        = '30px';

	glo.allControls.getByName('centerLocal').paddingRight     = '5px';
	glo.allControls.getByName('symmetrizeOrder').paddingLeft  = '5px';
	glo.allControls.getByName('symmetrizeAdding').paddingLeft = '10px';

	glo.allControls.getByName('paramSymmetrizeSlidersPanelButton').height      = '40px';
	glo.allControls.getByName('paramSymmetrizeSlidersPanelButton').paddingLeft = '5px';
  
	glo.allControls.haveThisClass('slider').map(slider => {
		for(const prop in glo.theme.slider){ slider[prop] = glo.theme.slider[prop]; }
	});
	glo.allControls.haveThisClass('input').map(input => {
		for(const prop in glo.theme.input.onBlur){ input[prop] = glo.theme.input.onBlur[prop]; }
	});

	glo.allControls.haveTheseClasses('header', 'right', 'seventh', 'noAutoParam').map(header => {header.height = '25px'; });
	glo.allControls.haveTheseClasses('header', 'right', 'eighth', 'noAutoParam').map(header => {header.height = '23px'; });
	glo.allControls.haveTheseClasses('header', 'right', 'nineth', 'noAutoParam').map(header => {header.height = '23px'; });
	glo.allControls.haveTheseClasses('header', 'right', 'fifth', 'noAutoParam').map(header => {header.height = '24.5px'; });
	glo.allControls.haveTheseClasses('header', 'right', 'fourth', 'noAutoParam').map(header => {header.height = '24px'; });
	glo.allControls.haveTheseClasses('header', 'right', 'sixth', 'noAutoParam').map(header => {header.height = '24px'; });
	glo.allControls.haveTheseClasses('header', 'right', 'third', 'noAutoParam').map(header => {header.height = '24px'; });
	glo.allControls.haveTheseClasses('header', 'right', 'second', 'noAutoParam').map(header => {header.height = '30px'; });
}

function paramRadios(){
	glo.allControls.haveTheseClasses('header', 'radio', 'left', 'first', 'noAutoParam').map(header => {
		for(const prop in glo.theme.radio.text){ header[prop] = glo.theme.radio.text[prop]; }
	});
	glo.allControls.haveTheseClasses('radio', 'left', 'first').haveNotThisClass('header').map(radio => {
		for(const prop in glo.theme.radio.button){ radio[prop] = glo.theme.radio.button[prop]; }
	});
}

function camToOrigin(){
	glo.camera.alpha = glo.camera.start.alpha;
	glo.camera.beta  = glo.camera.start.beta;
	glo.camera.setPosition(glo.camera.start.pos.clone());
	glo.camera.setTarget(glo.camera.start.target.clone());
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

function regSave(f) {
	console.log("//**************************************//");
	console.log("TEST REG FUNCTION");
    for (var prop in f) {
        f[prop] = regOne(f[prop]);
		console.log("");
    }
	console.log("//**************************************//");
    return f;
}

function reg(f) {
    for (var prop in f) {
        f[prop] = regOne(f[prop]);
    }

	glo.formule.push(f);

    return f;
}

function regOneSave(expReg) {
	if (expReg == "'") {
		expReg = "0";
	}
	else if(expReg) {
		expReg = expReg.toString();
		//expReg = expReg.replace(/\s/g, "");

		console.log("_________________________________________________");
		console.log("TEST ONE STR : " + expReg);
		for (let i = 0; i < glo.regs.length; i++) { 
			console.log("Reg.exp : " + glo.regs[i].exp + "    Reg.upd : " + glo.regs[i].upd); 
			expReg = expReg.replace(glo.regs[i].exp, glo.regs[i].upd);
			console.log("Str trans : " + expReg);
			console.log("---------------------------------------------");
			console.log("");
		}
		console.log("_________________________________________________");
		console.log("");
		console.log("");
	}
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