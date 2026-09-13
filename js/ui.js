/**
 * Cycles through surface forms using the mouse wheel within the current coordinate type.
 * Wraps around to the first or last form depending on scroll direction.
 * Updates the radio button selection to match the newly selected form.
 * @async
 * @returns {Promise<void>}
 */
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
		glo.radiosFormes.setCheckByName(nameRadioFormToSelect);
	}
	else{
		await glo.formes.setFormSelectByNum(glo.formes.getNumFirstFormInCoordType());

		var formSelected = glo.formes.getFormSelect();
		var nameRadioFormToSelect = "Radio-" + formSelected.form.text;
		glo.radiosFormes.setCheckByName(nameRadioFormToSelect);
	}
}

/**
 * Iterates a generator in the forward or reverse direction.
 * In forward mode, advances the generator by one step.
 * In reverse mode, cycles backward by finding the previous value in the generator sequence.
 * @async
 * @param {Generator} gen - The generator to iterate.
 * @param {string} varToStoreValGen - The name of the global property (on `glo`) that stores the current generator value.
 * @param {boolean} [normalSens=true] - If true, iterate forward; if false, iterate in reverse.
 * @returns {Promise<void>}
 */
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

/**
 * Switches the coordinate system type (cartesian, spherical, cylindrical) by cycling
 * through available types. Updates the UI labels and rebuilds the radio button list.
 * @param {boolean} [normalSens=true] - If true, cycle forward; if false, cycle backward.
 */
function switchCoords(normalSens = true){
	genInTwoWays(glo.coordinatesType, 'coordsType', normalSens);

	switchDrawCoordsType();
	addRadios();

	glo.formesSuit = false;
}

/**
 * Cycles through available fragment shaders and applies the selected one.
 * Updates the shader editor content and the shader select dropdown.
 * If a shader mesh instance exists, updates the fragment shader directly;
 * otherwise, rebuilds the ribbon mesh.
 * @param {boolean} [normalSens=true] - If true, cycle forward; if false, cycle backward.
 * @param {Object} [edit=glo.editor] - The code editor instance to update with the new shader source.
 */
function switchShader(normalSens = true, edit = glo.editor){
	  genInTwoWays(glo.numShaderMove, 'numShaderSelect', normalSens);
      fragmentShader = fragmentShaderHeader + fragmentShaders[glo.numShaderSelect] + fragmentShaderFooter;

      if(edit){
		edit.setValue(fragmentShader);
	  }

	  getById('shaderSelect').value = glo.numShaderSelect;

	  // Update only the fragment shader without rebuilding the mesh
	  if (glo.ribbon && glo.ribbon.shaderMeshInstance) {
		glo.ribbon.shaderMeshInstance.updateFragmentShader(fragmentShaders[glo.numShaderSelect]);
	  } else {
		remakeRibbon();
	  }
}

/**
 * Cycles through symmetrization axis orders (e.g., 'xyz', 'xzy', 'yxz', etc.).
 * Updates the button label and the `uSymOrder` shader uniform if a shader mesh exists;
 * otherwise, rebuilds the ribbon mesh.
 * @param {boolean} [normalSens=true] - If true, cycle forward; if false, cycle backward.
 */
function switchSymmetrizeOrder(normalSens = true){
	genInTwoWays(glo.symmetrizeOrders, 'symmetrizeOrder', normalSens);

	glo.allControls.getByName('symmetrizeOrder').textBlock.text = "S order : " + glo.symmetrizeOrder.toUpperCase();

	// Update the uSymOrder uniform directly if the shader mesh exists
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

/**
 * Cycles through right-side GUI panels by toggling their visibility.
 * @param {boolean} [normalSens=true] - If true, cycle forward; if false, cycle backward.
 */
function switchRightPanel(normalSens = true){
	genInTwoWays(glo.switchGuiSelect, 'guiSelect', normalSens);

	toggleRightPanels(glo.guiSelect);
}

/**
 * Toggles visibility of right-side GUI panels, hiding all panels except the specified one.
 * @param {string} rightPanelToShowClass - The CSS class of the panel to show.
 * @param {boolean} [toShow=true] - If true, show the specified panel and hide others; if false, hide all panels.
 */
function toggleRightPanels(rightPanelToShowClass, toShow = true){
	glo.rightPanelsClasses
		.filter(rightPanelClass => toShow ? (rightPanelClass !== rightPanelToShowClass) : (1 === 1))
		.forEach(rightPanelClass => toggleGuiControlsByClass(false, rightPanelClass));
	if(toShow){ toggleGuiControlsByClass(true, rightPanelToShowClass); }
}

/**
 * Toggles between short and long notation for trigonometric expressions in equation inputs.
 * Short form uses abbreviations like "cu" for "cos(u)", "sv" for "sin(v)", etc.
 * Long form expands them back to full function calls.
 * @param {boolean} long - If true, expand abbreviations to full form; if false, abbreviate to short form.
 */
function switchWritingType(long){
	var f = {
		x: glo.inputX.text,
		y: glo.inputY.text,
		z: glo.inputZ.text,
		alpha: glo.inputAlpha.text,
		beta: glo.inputBeta.text,
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

	glo.inputX.text = f.x;
	glo.inputY.text = f.y;
	glo.inputZ.text = f.z;
	glo.inputAlpha.text = f.alpha;
	glo.inputBeta.text = f.beta;

	glo.params.textInputX = f.x;
	glo.params.textInputY = f.y;
	glo.params.textInputZ = f.z;
	glo.params.textInputAlpha = f.alpha;
	glo.params.textInputBeta = f.beta;
}

/**
 * Swaps two variables in all equation input fields (e.g., swapping 'u' and 'v').
 * When swapping u and v, also swaps the corresponding step and range slider values.
 * Optionally triggers a ribbon mesh rebuild.
 * @async
 * @param {string} toInv1 - The first variable name to swap.
 * @param {string} toInv2 - The second variable name to swap.
 * @param {boolean} [makeCurve=true] - If true, rebuild the ribbon mesh after swapping.
 * @returns {Promise<void>}
 */
async function invElemInInput(toInv1, toInv2, makeCurve = true){
	var f = {
		x: glo.inputX.text,
		y: glo.inputY.text,
		z: glo.inputZ.text,
		alpha: glo.inputAlpha.text,
		beta: glo.inputBeta.text,
	};
	f = regInv(f, toInv1, toInv2);
	glo.inputX.text = f.x;
	glo.inputY.text = f.y;
	glo.inputZ.text = f.z;
	glo.inputAlpha.text = f.alpha;
	glo.inputBeta.text = f.beta;

	glo.params.textInputX = f.x;
	glo.params.textInputY = f.y;
	glo.params.textInputZ = f.z;
	glo.params.textInputAlpha = f.alpha;
	glo.params.textInputBeta = f.beta;

	if(toInv1 === 'u' && toInv2 === 'v'){
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

/**
 * Animates a slider by incrementing its value based on speed and direction.
 * The increment is calculated as a fraction of the slider's range.
 * @param {string} name - The name of the slider control to animate.
 * @param {number} [speed=1] - The animation speed multiplier. If 0, the increment is set to 1.
 * @param {number} [dir=1] - The direction of animation (1 for forward, -1 for backward).
 */
function slidersAnim(name, speed = 1, dir = 1){
	var slider = glo.allControls.getByName(name);
	valToAdd = ((slider.maximum - slider.minimum) / 720) * speed;
	if(speed == 0){ valToAdd = 1; }
	slider.value += valToAdd * dir;
}

/**
 * Starts camera rotation and distance animations using BabylonJS animation system.
 * The rotation animation loops continuously, while the distance animation plays once.
 * @param {number} durationRot - The duration in frames for the rotation animation.
 * @param {number} durationDist - The duration in frames for the distance animation.
 * @param {number} nbTurns - The number of half-turns (multiples of PI) for the rotation.
 */
function startAnim(durationRot, durationDist, nbTurns) {
    var rotAnimation = new BABYLON.Animation("rotAnim", "alpha", 30,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_RELATIVE);

    rotAnimation.setKeys([
        { frame: 0, value: 0 },
        { frame: durationRot, value: nbTurns * Math.PI }
    ]);

    var distAnimation = new BABYLON.Animation("distAnim", "radius", 30,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);

	const startForm   = glo.formes.getStartForm();	
    var currentRadius = startForm.orient ? (startForm.orient.distance || 16.66) : 16.66;
    distAnimation.setKeys([
        { frame: 0, value: 0 },
        { frame: durationDist, value: currentRadius },
    ]);

    glo.rotAnim  = glo.scene.beginDirectAnimation(glo.camera, [rotAnimation], 0, durationRot, true, 1);
    glo.distAnim = glo.scene.beginDirectAnimation(glo.camera, [distAnimation], 0, durationDist, false, 1);
}

/**
 * Stops the camera rotation animation if one is currently running.
 */
function stopRotAnim() {
    if (glo.rotAnim) {
        glo.rotAnim.stop();
        glo.rotAnim = null;
    }
}

/**
 * Stops the camera distance animation if one is currently running.
 */
function stopDistAnim() {
    if (glo.distAnim) {
        glo.distAnim.stop();
        glo.distAnim = null;
    }
}

/**
 * Stops all camera animations (both rotation and distance).
 */
function stopAllCameraAnims() {
    stopRotAnim();
    stopDistAnim();
}

/**
 * Synchronizes global parameter values (`glo.params`) to their corresponding GUI controls.
 * Updates sliders (u, v, steps, A-M), equation text inputs, eval inputs, and symmetry input.
 * Temporarily sets `glo.skipRebuild` to true to prevent triggering mesh rebuilds during sync.
 */
function paramsToControls(){
	glo.skipRebuild = true;
	glo.allControls.getByName('u').value = glo.params.u;
	glo.allControls.getByName('v').value = glo.params.v;
	glo.allControls.getByName('stepU').value = glo.params.stepsU;
	glo.allControls.getByName('stepV').value = glo.params.stepsV;
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

	glo.allControls.getByName('inputX').text = glo.params.textInputX;
	glo.allControls.getByName('inputY').text = glo.params.textInputY;
	glo.allControls.getByName('inputZ').text = glo.params.textInputZ;
	glo.allControls.getByName('inputAlpha').text = glo.params.textInputAlpha;
	glo.allControls.getByName('inputBeta').text = glo.params.textInputBeta;

	glo.allControls.getByName('inputEvalX').text = glo.params.textInputEvalX;
	glo.allControls.getByName('inputEvalY').text = glo.params.textInputEvalY;

	if(glo.inputNormalAlpha){ glo.inputNormalAlpha.text = glo.params.textInputNormalAlpha || ''; }
	if(glo.inputNormalBeta){  glo.inputNormalBeta.text  = glo.params.textInputNormalBeta  || ''; }

	if(glo.inputSymR){ glo.inputSymR.text = glo.params.textInputSymR || ''; }
	glo.skipRebuild = false;
}

/**
 * Checks whether the current equation input texts match the equations of the
 * currently selected radio button form. Compares X, Y, Z, Alpha, and Beta fields.
 * @returns {boolean} True if all equation inputs match the selected form's equations.
 */
function isInputsEquationsSameAsRadioCheck(){
	var p = glo.params;
	var form = glo.formes.getFormByName(p.formName, p.coordsType);
	var formAlpha = ""; var formBeta = "";
	if(typeof(form.alpha) != "undefined"){ formAlpha = form.alpha; }
	if(typeof(form.beta) != "undefined"){ formBeta = form.beta; }
	if(p.textInputX == form.fx && p.textInputY == form.fy && p.textInputZ == form.fz && p.textInputAlpha == formAlpha && p.textInputBeta == formBeta){
		return true;
	}

	return false;
}

/**
 * Updates the UI labels for equation input headers based on the current coordinate system type.
 * For cartesian: X, Y, Z; for spherical: R, Rot Y, Rot Z; for cylindrical: R, Rot Z, Z.
 * Also updates the coordinate type button text and optionally adjusts UV sliders.
 * @param {boolean} [updateSliderUv=true] - If true, also adjust the UV slider values for the new coordinate type.
 */
function switchDrawCoordsType(updateSliderUv = true){
	if(updateSliderUv){ changeSliderUv(); }
	switch (glo.coordsType) {
		case 'cartesian':
			changeHeaderText('header_inputX', 'X');
			changeHeaderText('header_inputY', 'Y');
			changeHeaderText('header_inputZ', 'Z');
			changeHeaderText('header_inputAlpha', 'Rot Z');
			changeHeaderText('header_inputBeta', 'Rot Y');
			changeHeaderText('header_inputTheta', 'Rot X');

			glo.allControls.getByName("but_coord").textBlock.text = "CART"; 
		break;
		case 'spheric':
			changeHeaderText('header_inputX', 'R');
			changeHeaderText('header_inputY', 'Rot Y');
			changeHeaderText('header_inputZ', 'Rot Z');
			changeHeaderText('header_inputAlpha', 'Rot2 Z');
			changeHeaderText('header_inputBeta', 'Rot2 Y');
			changeHeaderText('header_inputTheta', 'Rot2 X');

			glo.allControls.getByName("but_coord").textBlock.text = "SPHE"; 
		break;
		case 'cylindrical':
			changeHeaderText('header_inputX', 'R');
			changeHeaderText('header_inputY', 'Rot Z');
			changeHeaderText('header_inputZ', 'Z');
			changeHeaderText('header_inputAlpha', 'Rot2 Z');
			changeHeaderText('header_inputBeta', 'Rot2 Y');
			changeHeaderText('header_inputTheta', 'Rot2 X');

			glo.allControls.getByName("but_coord").textBlock.text = "CYL"; 
		break;
	}
}

/**
 * Changes the text of a header control identified by name.
 * @param {string} headerName - The name of the header control to update.
 * @param {string} newText - The new text to display in the header.
 */
function changeHeaderText(headerName, newText){
	glo.allControls.haveThisClass("header").getByName(headerName).text = newText;
}

/**
 * Resets all equation input fields and parameter sliders to their default values.
 * Clears button texts, resets text input parameters, resets symmetrize parameters to 0,
 * and sets u and v sliders to PI.
 */
function resetEquationsParamSliders(){
	glo.advancedTexture.getControlsByType('Button').forEach(input => {
		input.text = '';
	});
	for(let prop in glo.params){
		if(prop.includes('textInput')){glo.params[prop] = ''; }
		else if(prop.includes('symmetrize') && !prop.includes('symmetrizeAngle')){ glo.params[prop] = 0; }
	}
	glo.allControls.getByName('u').value = PI;
	glo.allControls.getByName('v').value = PI;

	['X', 'Y', 'Z', 'Alpha', 'Beta', 'Theta', 'EvalX', 'EvalY', 'NormalAlpha', 'NormalBeta'].forEach(inputVar => {
		if(glo['input' + inputVar]){ glo['input' + inputVar].text = ''; }
	});

	glo.resolutionCoeff = 4;

	const res = 512;
	glo.sliderStepsU.value = res;
	glo.sliderStepsV.value = res;

	glo.inputSymR.text = '';	
}

/**
 * Applies a tiny offset to the U slider value to trigger a recalculation
 * when switching coordinate types. The offset direction depends on the coordinate type.
 */
function changeSliderUv(){
	if(glo.coordsType == 'spheric'){ glo.sliderU.value += 0.0000002; }
	else if(glo.coordsType == 'cylindrical'){ glo.sliderU.value -= 0.0000001; }
	else{ glo.sliderU.value -= 0.0000001; }
}

/**
 * Copies the value of the first equation input (X) to all other equation inputs
 * (Y, Z, Alpha, Beta) and triggers a mesh rebuild.
 */
function firstInputToOthers(){
	const val = glo.inputX.text;

	glo.inputBeta.text  = val;
	glo.inputAlpha.text = val;
	glo.inputZ.text 	 = val;
	glo.inputY.text 	 = val;

	glo.params.textInputBeta 	= val;
	glo.params.textInputAlpha = val;
	glo.params.textInputZ 	= val;
	glo.params.textInputY 	= val;

	makeCurves();
}

/**
 * Positions the camera target and location at the given 3D coordinates.
 * @param {Object} pos - The position object.
 * @param {number} pos.x - The X coordinate.
 * @param {number} pos.y - The Y coordinate.
 * @param {number} pos.z - The Z coordinate.
 */
function cameraOnPos(pos){
	glo.camera.setTarget(new BABYLON.Vector3(pos.x, pos.y, pos.z));
	glo.camera.setPosition(new BABYLON.Vector3(pos.x, pos.y, pos.z));
}

/**
 * Toggles a GUI control's background between its normal color and a dimmed (activated) color.
 * The colors are derived from the current color picker button value.
 * @param {string} controlName - The name of the GUI control whose background to toggle.
 */
function swapControlBackground(controlName){
	let control = glo.allControls.getByName(controlName);

	const currentButtonBg = glo.allControls.getByName('pickerColorButton').value;
	const buttonBg        = rgbNormalizedToHex(currentButtonBg);
	const buttonBgActived = rgbNormalizedToHex(currentButtonBg.scale(0.5));

	control.background = control.background === buttonBg ? buttonBgActived : buttonBg;
}

/**
 * Applies the activated background style to all buttons listed in `glo.bgActivedButtons`,
 * then applies special control parameter styling.
 */
function otherDesigns(){
	glo.bgActivedButtons.forEach(buttonName => {
		glo.allControls.getByName(buttonName).background = glo.controlConfig.backgroundActived;
	});

	paramSpecialControls();
}

/**
 * Applies custom positioning, sizing, and theming to special GUI controls.
 * Configures layout for symmetrize controls, color picker panels, sliders, and inputs
 * according to the current theme.
 */
function paramSpecialControls(){
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

/**
 * Applies theme styling to radio button controls and their header labels.
 * Applies text theme to radio headers and button theme to radio buttons.
 */
function paramRadios(){
	glo.allControls.haveTheseClasses('header', 'radio', 'left', 'first', 'noAutoParam').map(header => {
		for(const prop in glo.theme.radio.text){ header[prop] = glo.theme.radio.text[prop]; }
	});
	glo.allControls.haveTheseClasses('radio', 'left', 'first').haveNotThisClass('header').map(radio => {
		for(const prop in glo.theme.radio.button){ radio[prop] = glo.theme.radio.button[prop]; }
	});
}

/**
 * Doubles or halves the mesh resolution by scaling the step slider maximums and values.
 * Triggers a ribbon mesh rebuild after the change.
 * @param {string} [change='increase'] - Either 'increase' to double resolution or any other value to halve it.
 */
function changeResolution(change = 'increase'){
	const coeff = change === 'increase' ? 2 : 0.5;
	glo.resolutionCoeff *= coeff;

	glo.skipRebuild = true;
	glo.sliderStepsU.maximum*=coeff;
	glo.sliderStepsV.maximum*=coeff;

	glo.sliderStepsU.value*=coeff;
	glo.sliderStepsV.value*=coeff;
	glo.skipRebuild = false;

	remakeRibbon();
}

/**
 * Swaps u/v and X/Y notation in all equation input fields.
 * When `glo.params.uvToXy` is true, replaces u->X and v->Y;
 * otherwise, replaces X->u and Y->v.
 * Also initializes eval inputs to 'u' and 'v' if they are empty.
 */
function uvToXy(){
	const regs = glo.params.uvToXy ? [{exp: /u/gi, upd: "X"}, {exp: /v/gi, upd: "Y"}] : [{exp: /X/gi, upd: "u"}, {exp: /Y/gi, upd: "v"}];

	["X", "Y", "Z", "Alpha", "Beta", "SymR"].forEach(nameInput =>  {
		regs.forEach(reg => {
			glo[`input${nameInput}`].text = glo[`input${nameInput}`].text.replace(reg.exp, reg.upd);
		});
		glo.params[`textInput${nameInput}`] = glo[`input${nameInput}`].text;
	 });

	 if(!glo.inputEvalX.text && !glo.inputEvalY.text){
		glo.inputEvalX.text = 'u';
		glo.inputEvalY.text = 'v';

		glo.params.textInputEvalX = 'u';
		glo.params.textInputEvalY = 'v';
	 }
}

/**
 * Applies regex-based equation normalization to all properties of the given object.
 * Processes each non-falsy property through `regOne()`.
 * @param {Object.<string, string>} f - An object whose string values are equation expressions to normalize.
 * @returns {Object.<string, string>} The same object with all properties normalized.
 */
function reg(f) {
    for (var prop in f) {
        if(f[prop]){ f[prop] = regOne(f[prop]); }
    }

    return f;
}

/**
 * Debug/test version of `regOne()` that logs each regex transformation step to the console.
 * Handles the special case of a lone apostrophe by replacing it with "0".
 * @param {string} expReg - The equation expression string to normalize with verbose logging.
 * @returns {string} The normalized expression.
 */
function regOneTest(expReg) {
	console.log("=== regOne START ===");
	console.log("Input:", expReg, "| Type:", typeof expReg);
	
	if (expReg == "'") {
		console.log("Special case: apostrophe detected, replacing with '0'");
		expReg = "0";
	}
	else if(expReg) {
		expReg = expReg.toString();
		console.log("After toString():", expReg);
		
		for (let i = 0; i < glo.regs.length; i++) {
			const before = expReg;
			expReg = expReg.replace(glo.regs[i].exp, glo.regs[i].upd);
			if (before !== expReg) {
				console.log(`Regex #${i} matched:`, glo.regs[i].exp);
				console.log(`  Before: "${before}"`);
				console.log(`  After: "${expReg}"`);
			}
		}
	}
	else {
		console.log("expReg is falsy, no transformation applied");
	}
	
	console.log("Final output:", expReg);
	console.log("=== regOne END ===");
	return expReg;
}

/**
 * Replaces the `***` operator with `cpow()` function calls, handling nested parentheses.
 * Examples:
 *   - `(cos(u))***2` becomes `cpow(cos(u),2)`
 *   - `sin(u)***cos(v)` becomes `cpow(sin(u),cos(v))`
 *   - `u***(2+v)` becomes `cpow(u,2+v)`
 * Strips superfluous wrapping parentheses from operands.
 * @param {string} str - The expression string containing `***` operators.
 * @returns {string} The expression with all `***` operators replaced by `cpow()` calls.
 */
function replaceCpow(str) {
	let starIdx;
	while ((starIdx = str.indexOf('***')) !== -1) {
		// --- Left operand: scan backward from starIdx-1 ---
		let leftEnd = starIdx - 1;
		let leftStart;

		if (str[leftEnd] === ')') {
			// Parenthesized group: find the matching '('
			let depth = 1;
			let i = leftEnd - 1;
			while (i >= 0 && depth > 0) {
				if (str[i] === ')') depth++;
				else if (str[i] === '(') depth--;
				i--;
			}
			let parenStart = i + 1; // position of the '('
			// Include an identifier preceding the '(' (e.g., cos, sin)
			let idStart = parenStart;
			while (idStart > 0 && /[a-zA-Z_$]/.test(str[idStart - 1])) idStart--;
			leftStart = idStart;
		} else {
			// Identifier or number
			let i = leftEnd;
			while (i > 0 && /[\w$.]/.test(str[i - 1])) i--;
			leftStart = i;
		}

		// --- Right operand: scan forward from starIdx+3 ---
		let rightStart = starIdx + 3;
		let rightEnd;

		if (str[rightStart] === '(') {
			// Parenthesized group
			let depth = 1;
			let i = rightStart + 1;
			while (i < str.length && depth > 0) {
				if (str[i] === '(') depth++;
				else if (str[i] === ')') depth--;
				i++;
			}
			rightEnd = i; // just after the closing ')'
		} else {
			// Identifier or number, potentially followed by (...)
			let i = rightStart;
			while (i < str.length && /[\w$.]/.test(str[i])) i++;
			// If followed by '(', include the argument group
			if (i < str.length && str[i] === '(') {
				let depth = 1;
				i++;
				while (i < str.length && depth > 0) {
					if (str[i] === '(') depth++;
					else if (str[i] === ')') depth--;
					i++;
				}
			}
			rightEnd = i;
		}

		let left  = str.substring(leftStart, starIdx);
		let right = str.substring(starIdx + 3, rightEnd);

		// Remove superfluous wrapping parentheses from operands
		if (left[0] === '(' && left[left.length - 1] === ')' && isBalancedWrap(left)) {
			left = left.substring(1, left.length - 1);
		}
		if (right[0] === '(' && right[right.length - 1] === ')' && isBalancedWrap(right)) {
			right = right.substring(1, right.length - 1);
		}

		str = str.substring(0, leftStart) + 'cpow(' + left + ',' + right + ')' + str.substring(rightEnd);
	}
	return str;
}

/**
 * Checks whether the outer parentheses of a string wrap the entire expression.
 * Returns false if the opening parenthesis closes before the end of the string.
 * @param {string} s - The string to check (expected to start with '(' and end with ')').
 * @returns {boolean} True if the outer parentheses encompass the whole expression.
 */
function isBalancedWrap(s) {
	let depth = 0;
	for (let i = 0; i < s.length - 1; i++) {
		if (s[i] === '(') depth++;
		else if (s[i] === ')') depth--;
		if (depth === 0) return false; // the initial '(' closes before the end
	}
	return true;
}

/**
 * Normalizes a single equation expression string by applying `replaceCpow()` for the `***` operator
 * and then running all global regex replacements defined in `glo.regs`.
 * A lone apostrophe is treated as "0".
 * @param {string} expReg - The equation expression to normalize.
 * @returns {string} The normalized expression.
 */
function regOne(expReg) {
	if (expReg == "'") {
		expReg = "0";
	}
	else if(expReg) {
		expReg = expReg.toString();
		expReg = replaceCpow(expReg);
		for (let i = 0; i < glo.regs.length; i++) {
			expReg = expReg.replace(glo.regs[i].exp, glo.regs[i].upd);
		}
	}
    return expReg;
}

/**
 * Swaps all occurrences of two variable names in every property of the given object.
 * Uses a temporary placeholder to avoid double-replacement.
 * @param {Object.<string, string>} f - An object whose string values contain the variables to swap.
 * @param {string} toInv1 - The first variable name.
 * @param {string} toInv2 - The second variable name.
 * @returns {Object.<string, string>} The same object with variables swapped.
 */
function regInv(f, toInv1, toInv2){
	var regToInv1 = new RegExp(toInv1, "g");
	var regToInvTmp = new RegExp(toInv1 + "_tmp", "g");
	var regToInv2 = new RegExp(toInv2, "g");
	for(var prop in f){
		f[prop] = f[prop].replace(regToInv1, toInv2 + "_tmp");
		f[prop] = f[prop].replace(regToInv2, toInv1);
		f[prop] = f[prop].replace(regToInvTmp, toInv2);
	}

	return f;
}

/**
 * Computes a centered square bounding box for image/video export based on canvas dimensions
 * and the current video crop range setting.
 * @param {number} [margin=20] - Additional margin in pixels added to the crop area.
 * @param {number} [correction=1] - A scaling correction factor applied to the coefficient.
 * @returns {{x: number, y: number, width: number, height: number}} The crop bounding box in canvas coordinates.
 */
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

// =====================================================================================
// VIDEO TAKES
//
// A take is rendered offline, one frame at a time, and never in real time. Each captured
// frame stands for exactly 1/VIDEO_FPS s of simulation: the rotation, the animation clock
// `t`, the travelling camera and the walk all advance by that fixed step through
// frameDeltaSeconds() (bab.js), the frame is then handed to a WebCodecs VideoEncoder with
// the timestamp frameIndex / VIDEO_FPS, and mediabunny writes the MP4 or WebM container.
// Rendering or encoding slower than real time only makes the take longer to record; it
// cannot change a single frame of the file. When the encoder falls behind, the take holds
// (nothing moves, nothing is captured) until it has caught up.
//
// This replaces canvas.captureStream + MediaRecorder, whose timer-driven sampling, real-time
// timestamps and dropped frames were what made every recorded rotation stutter.
// =====================================================================================

/** Frame rate of every take: one captured frame stands for exactly 1/VIDEO_FPS s. */
const VIDEO_FPS = 60;

/**
 * Whether this browser can record: WebCodecs for the encoder, mediabunny for the container.
 * @returns {boolean}
 */
function videoRecordingSupported() {
	return typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined'
		&& typeof Mediabunny !== 'undefined';
}

/**
 * Shows a short message about a take, through the app's toast when it is available.
 * @param {string} html - The message.
 */
function videoNotify(html) {
	if (typeof M !== 'undefined' && M.toast) M.toast({ html, displayLength: 4000 });
	else console.warn('[Video]', html);
}

/**
 * Target bitrate for a take, from its pixel rate: about 0.15 bit per pixel and frame keeps a
 * finely shaded mesh clean at 60 fps. Clamped so a small crop is not starved and a 4K
 * fullscreen take does not balloon.
 * @param {number} width - Frame width in pixels.
 * @param {number} height - Frame height in pixels.
 * @param {number} fps - Frame rate.
 * @returns {number} Bits per second.
 */
function videoBitrate(width, height, fps) {
	return Math.round(Math.min(60e6, Math.max(6e6, width * height * fps * 0.15)));
}

/**
 * Picks the codec and container for a take: H.264 in MP4 when the browser can encode it
 * (hardware-accelerated on most machines, plays everywhere), otherwise VP9 or AV1 in WebM.
 * @param {number} width - Frame width in pixels.
 * @param {number} height - Frame height in pixels.
 * @param {object} quality - The mediabunny Quality the take will use.
 * @returns {Promise<?{codec: string, format: object, extension: string, mime: string}>} Null
 *   when nothing can be encoded.
 */
async function pickVideoCodec(width, height, quality) {
	const MB = Mediabunny;
	const probe = { width, height, quality };
	if (await MB.getFirstEncodableVideoCodec(['avc'], probe)) {
		return { codec: 'avc', format: new MB.Mp4OutputFormat(), extension: 'mp4', mime: 'video/mp4' };
	}
	const webm = await MB.getFirstEncodableVideoCodec(['vp9', 'av1'], probe);
	if (webm) {
		return { codec: webm, format: new MB.WebMOutputFormat(), extension: 'webm', mime: 'video/webm' };
	}
	return null;
}

/**
 * Hands a finished file to the browser's download.
 * @param {ArrayBuffer} buffer - The file bytes.
 * @param {string} mime - Its media type.
 * @param {string} fileName - The name to save under.
 */
function downloadVideoBuffer(buffer, mime, fileName) {
	const blob = new Blob([buffer], { type: mime });
	const url  = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = fileName;
	document.body.appendChild(a);
	a.click();
	a.remove();
	// Revoking straight away can cancel the download in some browsers.
	setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/**
 * Creates a video recorder that captures a region of the BabylonJS canvas, one frame per
 * rendered frame, into an MP4 (H.264) or WebM (VP9/AV1) file through WebCodecs.
 *
 * The take is deterministic: while it runs, {@link glo.video.take} is set and every part
 * of the simulation steps by exactly `1/fps` s per captured frame (see frameDeltaSeconds in
 * bab.js). On a frame the encoder has not caught up with, the recorder holds: nothing steps
 * and nothing is captured, so the file is the same whatever the machine's speed.
 *
 * Doubles the hardware resolution during a cropped take for higher quality output.
 * @param {BABYLON.Mesh} mesh - The mesh being recorded (unused, kept for the call sites).
 * @param {BABYLON.Scene} scene - The BabylonJS scene to observe for render callbacks.
 * @param {number} [fps=VIDEO_FPS] - Frames per second of the file; also the simulation step.
 * @param {object} [options] - Overrides for takes that are not the centred square crop.
 * @param {Function} [options.bounds] - Returns the crop rectangle to capture. Defaults to
 *   the centred square driven by {@link glo.videoBoxRange}.
 * @param {number} [options.hardwareScaling=0.5] - Hardware scaling level applied while
 *   recording. The default halves it, i.e. doubles the resolution, which is worth it when
 *   most of the frame is cropped away. A full-frame take already keeps every pixel, so it
 *   passes 1 and avoids rendering four times the fragments for nothing.
 * @param {string} [options.filePrefix='mesh'] - Leading part of the downloaded file name.
 * @param {Function} [options.onLoopClosed] - Called instead of `stop()` when a perfect-loop
 *   take has completed its turns after {@link requestStop}; it is expected to stop the
 *   recorder and restore the app's state.
 * @param {Function} [options.onFailed] - Called with the error when the take breaks down
 *   (encoder failure, unsupported codec); the recorder has already stopped itself.
 * @returns {{start: Function, stop: Function, requestStop: Function, isRecording: boolean, take: ?object}}
 *   The recorder control object.
 */
function createMeshRecorder(mesh, scene, fps = VIDEO_FPS, options = {}) {
	const sourceCanvas  = glo.engine.getRenderingCanvas();
	const captureCanvas = document.createElement('canvas');
	const ctx = captureCanvas.getContext('2d');

	const scaling    = options.hardwareScaling !== undefined ? options.hardwareScaling : 1 / 2;
	const filePrefix = options.filePrefix || 'mesh';

	/** 'idle' → 'warmup' → 'starting' → 'recording' → 'stopping' → 'done' */
	let phase = 'idle';
	let scalingApplied = false;
	let stopRequested = false;
	let take = null;
	let bounds = null;
	let output = null;
	let source = null;
	let container = null;
	let beforeObserver = null;
	let afterObserver = null;
	let pending = null;     // promise of the last add(): the encoder's backpressure
	let busy = false;       // true until that promise settles
	let failure = null;
	let stopPromise = null;

	/**
	 * Computes the centered square crop bounds based on the source canvas dimensions
	 * and the current video box range setting. Clamps values to canvas boundaries.
	 * @returns {{x: number, y: number, width: number, height: number}} The crop bounding box.
	 */
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

	/** Codecs want even dimensions; a frame is at least 2×2. */
	function evenSize(v) {
		return Math.max(2, Math.floor(v / 2) * 2);
	}

	function applyScaling() {
		if (scaling === 1 || scalingApplied) return;
		// Anchor the GUI space to the displayed CSS size before doubling
		// the hardware resolution, to prevent control misalignment.
		glo.advancedTexture.idealWidth  = sourceCanvas.clientWidth;
		glo.advancedTexture.idealHeight = sourceCanvas.clientHeight;
		glo.engine.setHardwareScalingLevel(scaling);
		scalingApplied = true;
	}

	function restoreScaling() {
		if (!scalingApplied) return;
		glo.engine.setHardwareScalingLevel(1);
		glo.advancedTexture.idealWidth  = 0;
		glo.advancedTexture.idealHeight = 0;
		scalingApplied = false;
	}

	/** Ends the take's hold on the simulation: no more stepping, no more capture. */
	function detach() {
		if (beforeObserver) { scene.onBeforeRenderObservable.remove(beforeObserver); beforeObserver = null; }
		if (afterObserver)  { scene.onAfterRenderObservable.remove(afterObserver);   afterObserver  = null; }
		if (take) take.stepping = false;
		if (glo.video.take === take) glo.video.take = null;
		if (glo.clock.frameLocked) glo.clock.unlockFromFrames();
		restoreScaling();
	}

	/** What the caller wants when the take ends on its own (loop closed, or not loopable). */
	function closeTake() {
		if (typeof options.onLoopClosed === 'function') options.onLoopClosed();
		else api.stop();
	}

	/** Breaks the take down after an error and tells the caller. */
	function abort(err) {
		if (failure) return;
		failure = err || new Error('Video take failed.');
		console.error('[Video] Take aborted:', failure);
		videoNotify('Échec de l\'enregistrement vidéo : ' + (failure.message || failure));
		api.stop();
		if (typeof options.onFailed === 'function') options.onFailed(failure);
	}

	/**
	 * Runs first in the frame: decides whether this frame is part of the take. Then the
	 * rotation, the clock-driven shaders and the walk see the same decision through
	 * frameDeltaSeconds().
	 */
	function onBeforeFrame() {
		if (phase !== 'recording') return;

		// A perfect loop ends once a whole number of turns is on file: the pose about to be
		// rendered is then exactly the first frame's, and recording it again would show as a
		// stutter on replay. A take that cannot loop ends as soon as it is asked to.
		const atTurn = take.frameIndex > 0 && take.frameIndex % take.framesPerTurn === 0;
		if (take.stopRequested && (!take.loop || atTurn)) {
			take.stepping = false;
			closeTake();
			return;
		}

		take.stepping = !busy && !failure;
		if (take.stepping) glo.clock.tickFrame(take.dt * 1000);
	}

	/** Runs after the frame is drawn: copies it out and hands it to the encoder. */
	function onAfterFrame() {
		if (phase !== 'recording' || !take.stepping) return;

		ctx.drawImage(
			sourceCanvas,
			bounds.x, bounds.y, bounds.width, bounds.height,
			0, 0, captureCanvas.width, captureCanvas.height
		);

		const index = take.frameIndex++;
		busy = true;
		pending = source.add(index / fps, 1 / fps)
			.then(() => { busy = false; })
			.catch(err => { busy = false; abort(err); });
	}

	/**
	 * Sets the encoder and the container up, then takes over the simulation. Called after the
	 * warmup frames so the crop is measured on the canvas at its recording resolution.
	 * @param {Function} [onCaptureStart] - Called with the take state once, before the first
	 *   frame, so the caller can zero its loop references and decorate the take.
	 */
	async function beginCapture(onCaptureStart) {
		phase = 'starting';

		bounds = (options.bounds || computeBounds)();
		captureCanvas.width  = evenSize(bounds.width);
		captureCanvas.height = evenSize(bounds.height);

		const MB = Mediabunny;
		const quality = new MB.Quality({ bitrate: videoBitrate(captureCanvas.width, captureCanvas.height, fps) });
		container = await pickVideoCodec(captureCanvas.width, captureCanvas.height, quality);
		if (phase !== 'starting') return;
		if (!container) throw new Error('aucun codec vidéo encodable dans ce navigateur (WebCodecs).');

		output = new MB.Output({ format: container.format, target: new MB.BufferTarget() });
		source = new MB.CanvasSource(captureCanvas, {
			codec: container.codec,
			quality,
			keyFrameInterval: 2,
			latencyMode: 'quality',
		});
		output.addVideoTrack(source, { frameRate: fps });
		await output.start();
		if (phase !== 'starting') { await output.cancel(); return; }

		take = {
			fps,
			dt: 1 / fps,
			frameIndex: 0,
			stepping: false,
			loop: false,
			framesPerTurn: 0,
			rotStep: 0,
			stopRequested,
		};
		glo.video.take = take;
		glo.clock.lockToFrames();
		if (typeof onCaptureStart === 'function') onCaptureStart(take);

		// First in line, so that everything else in the frame sees the take's decision.
		beforeObserver = scene.onBeforeRenderObservable.add(onBeforeFrame, undefined, true);
		afterObserver  = scene.onAfterRenderObservable.add(onAfterFrame);
		phase = 'recording';
	}

	/** Flushes the encoder, writes the container and downloads it. */
	async function finish() {
		try {
			if (pending) await pending.catch(() => {});
			if (!output) return;
			if (failure || !take || take.frameIndex === 0) {
				await output.cancel();
				return;
			}
			await output.finalize();
			downloadVideoBuffer(output.target.buffer, container.mime,
				`${filePrefix}-${Date.now()}.${container.extension}`);
		} catch (err) {
			console.error('[Video] Finalizing the take failed:', err);
			videoNotify('Échec de l\'écriture de la vidéo : ' + (err && err.message || err));
			try { if (output) await output.cancel(); } catch (_) { /* already closed */ }
		} finally {
			phase = 'done';
		}
	}

	const api = {
		/**
		 * Starts the take: doubles the hardware resolution, waits two frames for the resize
		 * to settle, then sets the encoder up and begins capturing.
		 * @param {Function} [onCaptureStart] - Forwarded to {@link beginCapture}; called with
		 *   the take state once when capture actually begins (after the warmup frames).
		 */
		start(onCaptureStart) {
			if (phase !== 'idle') return;
			if (!videoRecordingSupported()) {
				phase = 'done';
				abort(new Error('WebCodecs indisponible dans ce navigateur.'));
				return;
			}
			phase = 'warmup';
			applyScaling();

			// Wait 2 frames for the resize to stabilize
			scene.onAfterRenderObservable.addOnce(() => {
				scene.onAfterRenderObservable.addOnce(() => {
					if (phase !== 'warmup') return;
					beginCapture(onCaptureStart).catch(abort);
				});
			});
		},

		/**
		 * Asks a perfect-loop take to end at its next whole turn. A take that cannot loop
		 * (no rotation) ends at once. Before capture has begun, the request is kept and
		 * honoured once it has: at least one full turn then goes on file.
		 */
		requestStop() {
			stopRequested = true;
			if (take) take.stopRequested = true;
			if (take && phase === 'recording' && !take.loop) closeTake();
		},

		/**
		 * Stops the take, releases the simulation and restores normal scaling at once, then
		 * finalizes and downloads the file in the background.
		 * @returns {Promise<void>} Settles once the file has been handed to the download.
		 */
		stop() {
			if (phase === 'done' || phase === 'stopping') return stopPromise || Promise.resolve();
			if (phase === 'idle') { phase = 'done'; return Promise.resolve(); }
			if (phase === 'warmup') {
				// Capture never began: nothing to write.
				phase = 'done';
				restoreScaling();
				return Promise.resolve();
			}
			if (phase === 'starting') {
				// beginCapture is mid-setup; it sees the phase change and backs out.
				phase = 'done';
				restoreScaling();
				return Promise.resolve();
			}
			phase = 'stopping';
			detach();
			stopPromise = finish();
			return stopPromise;
		},

		/**
		 * Returns whether frames are being captured.
		 * @returns {boolean}
		 */
		get isRecording() {
			return phase === 'recording';
		},

		/** @returns {?object} The take state while capturing, see {@link glo.video.take}. */
		get take() {
			return phase === 'recording' ? take : null;
		}
	};

	return api;
}

/**
 * Updates or creates the video crop box overlay in the GUI.
 * Displays a yellow rectangle indicating the area that will be captured during recording.
 * Positions the rectangle based on the current export bounds relative to the canvas center.
 */
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
  
  // Convert from screen coordinates (0,0 = top-left)
  // to centered GUI coordinates (0,0 = center)
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

/**
 * Hides the video crop box overlay if it exists.
 */
function hideVideoCropBox() {
  if (glo.videoCropBoxGUI) {
    glo.videoCropBoxGUI.isVisible = false;
  }
}

// =====================================================================================
// FULLSCREEN TAKES
//
// Shared presentation for the two fullscreen recordings: the orbit one here and the
// first-person one in walk.js. Both fill the screen, clear every overlay out of the
// frame and capture the whole canvas instead of the centred square crop, so the
// difference between them is only which camera is filming.
// =====================================================================================

/**
 * Requests fullscreen on the canvas host.
 *
 * Must be called straight from a user gesture, before any await, or the browser refuses
 * it.
 * @returns {Promise} Resolves once the request settles, whether or not it succeeded.
 */
function cinemaRequestFullscreen() {
  const host = getById('univers_div');
  return (!document.fullscreenElement && host && host.requestFullscreen)
    ? host.requestFullscreen().catch(() => {})
    : Promise.resolve();
}

/**
 * Clears the screen for a take and records what to put back.
 *
 * The BabylonJS GUI and the grid are drawn into the canvas, so they would end up in the
 * video. The walk HUD and the history bar are DOM and invisible to the recorder, but
 * they would still sit on top of a fullscreen view.
 *
 * @returns {object} State to hand back to {@link cinemaRestoreOverlays}.
 */
function cinemaHideOverlays() {
  const saved = {
    gui: glo.advancedTexture ? glo.advancedTexture.rootContainer.isVisible : true,
    grid: glo.gridVisible,
  };
  if (glo.advancedTexture) glo.advancedTexture.rootContainer.isVisible = false;
  hideVideoCropBox();
  // Only when it is actually up: switchGrid reaches straight into glo.axisX and
  // friends, which do not exist until the grid has been built once.
  if (glo.gridVisible && typeof switchGrid === 'function') switchGrid(false);
  if (typeof walkHideHud === 'function') walkHideHud();
  const history = getById('historyPanel');
  if (history) history.style.display = 'none';
  return saved;
}

/**
 * Puts back everything {@link cinemaHideOverlays} took away and leaves fullscreen.
 * @param {object} [saved={}] - The state it returned.
 */
function cinemaRestoreOverlays(saved = {}) {
  if (glo.advancedTexture) glo.advancedTexture.rootContainer.isVisible = saved.gui !== false;
  if (saved.grid && glo.gridVisible && typeof switchGrid === 'function') switchGrid(true);
  const history = getById('historyPanel');
  if (history) history.style.display = '';
  cinemaHideBadge();

  if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  setTimeout(() => glo.engine.resize(), 250);
}

/**
 * Recorder options for a fullscreen take: the whole canvas, at the resolution already
 * being rendered.
 * @param {string} prefix - Leading part of the downloaded file name.
 * @returns {object} Options for {@link createMeshRecorder}.
 */
function cinemaFullFrameOptions(prefix) {
  const canvas = glo.engine.getRenderingCanvas();
  return {
    bounds: () => ({ x: 0, y: 0, width: canvas.width, height: canvas.height }),
    // Doubling the resolution earns its cost when most of the frame is cropped away;
    // a full-frame take already keeps every pixel.
    hardwareScaling: 1,
    filePrefix: prefix,
  };
}

/**
 * Runs `then` once the fullscreen resize has settled. Measuring the capture area any
 * earlier frames the take to the pre-fullscreen canvas.
 * @param {Promise} fsRequest - The promise from {@link cinemaRequestFullscreen}.
 * @param {Function} then - Called when the canvas has its final size.
 */
function cinemaWhenResized(fsRequest, then) {
  fsRequest
    .then(() => new Promise(r => setTimeout(r, 250)))
    .then(() => { glo.engine.resize(); return new Promise(r => setTimeout(r, 120)); })
    .then(then);
}

/**
 * Shows the recording badge. It hangs inside the fullscreen element, since a fullscreen
 * page renders only that element and its descendants — but it is a sibling of the
 * canvas, not part of it, so the recorder never picks it up.
 * @param {string} text - What to display.
 */
function cinemaShowBadge(text) {
  let el = getById('walkRec');
  if (!el) {
    el = document.createElement('div');
    el.id = 'walkRec';
    el.style.cssText = [
      'position:fixed', 'top:14px', 'left:16px', 'z-index:9500',
      'pointer-events:none', 'padding:5px 11px', 'border-radius:14px',
      'font:11px/1.4 monospace', 'color:#ffdada',
      'background:rgba(30,8,8,.72)', 'border:1px solid rgba(255,90,90,.45)'
    ].join(';');
    (getById('univers_div') || document.body).appendChild(el);
  }
  el.textContent = text;
  el.style.display = 'block';
}

/** Hides the recording badge. */
function cinemaHideBadge() {
  const el = getById('walkRec');
  if (el) el.style.display = 'none';
}

/**
 * Starts a fullscreen take from the orbit camera — the classic shot, filling a 16:9
 * screen instead of the centred square crop.
 *
 * Rides the existing recording machinery rather than a parallel one, so "perfect loop"
 * mode (`Shift+L`) behaves exactly as it always has: it starts the rotation and defers
 * the stop until a whole number of turns has gone by.
 * @returns {boolean} `true` if the take started.
 */
function startOrbitCinema() {
  if (glo.orbitCinema.active) return false;
  if (glo.video.recording || glo.video.loopPendingStop) {
    console.warn('[Video] A recording is already running.');
    return false;
  }

  const fsRequest = cinemaRequestFullscreen();   // while the gesture is still live

  glo.orbitCinema.active = true;
  glo.orbitCinema.saved = cinemaHideOverlays();
  glo.video.fullFrame = true;

  cinemaShowBadge('● REC — fullscreen'
    + (glo.loopRecordMode ? ' · perfect loop on rotation' : ' · Shift+L for a perfect loop')
    + ' · Shift+F to stop');

  cinemaWhenResized(fsRequest, () => {
    if (!glo.orbitCinema.active) return;
    switchRecordingVideo();
  });
  return true;
}

/**
 * Ends an orbit take. In loop mode the recorder stops itself once the rotation closes,
 * and {@link finishLoopRecording} calls back here; otherwise this asks it to stop.
 */
function stopOrbitCinema() {
  if (!glo.orbitCinema.active) return;

  if (glo.video.recording && !glo.video.loopPendingStop) {
    // In loop mode this only arms the stop; the teardown then comes from
    // finishLoopRecording once the rotation has completed its turns.
    switchRecordingVideo();
    if (glo.video.loopPendingStop) {
      cinemaShowBadge('● REC — finishing the turn to close the loop…');
      return;
    }
  }
  orbitCinemaTeardown();
}

/** Restores everything after an orbit take, however it ended. */
function orbitCinemaTeardown() {
  if (!glo.orbitCinema.active) return;
  glo.orbitCinema.active = false;
  glo.video.fullFrame = false;
  cinemaRestoreOverlays(glo.orbitCinema.saved);
  glo.orbitCinema.saved = {};
}

/**
 * Starts or stops a fullscreen take, choosing the shot from the camera in use: the
 * first-person one while walking, the orbit one otherwise. One key, one meaning.
 */
function toggleFullscreenTake() {
  if (glo.cameraMode === 'walk') { toggleWalkCinema(); return; }
  if (glo.orbitCinema.active) stopOrbitCinema(); else startOrbitCinema();
}

/**
 * Toggles video recording on or off. When starting, creates a new mesh recorder
 * and begins capturing. When stopping, finalizes and downloads the recorded video.
 *
 * When {@link glo.loopRecordMode} is enabled, starting also kicks off mesh
 * rotation, and stopping is deferred until the rotation has completed an
 * integer number of full turns so the resulting video loops perfectly. The turn is
 * cut into a whole number of frames at capture start, so the frame after the last
 * one on file is exactly the first: no shortened step, no repeated pose at the wrap.
 */
function switchRecordingVideo(){
	if (glo.video.loopPendingStop) return;

	if (!glo.video.recording) {
		if (!videoRecordingSupported()) {
			videoNotify('Enregistrement vidéo indisponible : ce navigateur n\'a pas WebCodecs.');
			if (glo.orbitCinema.active) orbitCinemaTeardown();
			return;
		}
		glo.video.recording = true;

		// The intro rotation (startAnim) is a BabylonJS animation on the camera, driven by
		// the wall clock: it runs until the mouse first moves, and would keep turning the
		// camera between the take's frames. A take owns the camera.
		stopAllCameraAnims();

		if (glo.loopRecordMode) {
			glo.video.loopActive = true;
			glo.video.loopPendingStop = false;
			glo.video.loopPrevRotateType = glo.rotateType;
			if (glo.rotateType === 'none' || glo.rotateType?.current === 'none') {
				glo.rotateType = { current: 'alpha', next: 'beta' };
			}
		}

		// A fullscreen take keeps the whole frame; the default take crops the centred
		// square driven by the video box range.
		const recorderOptions = glo.video.fullFrame ? cinemaFullFrameOptions('surface-orbit') : {};
		recorderOptions.onLoopClosed = finishLoopRecording;
		recorderOptions.onFailed     = recordingFailed;

		glo.video.recorder = createMeshRecorder(glo.ribbon, glo.scene, VIDEO_FPS, recorderOptions);
		glo.video.recorder.start((take) => {
			// Vrai début de capture (après le warmup qui double la résolution).
			if (glo.video.loopActive) {
				// Un tour doit tenir en un nombre entier de frames : le pas est figé ici,
				// au plus près de rotateSpeed, et le tour se ferme exactement sur la
				// première frame. Changer la vitesse pendant la prise n'a donc pas d'effet.
				const perFrame = glo.rotateSpeed * take.dt * 60;
				const framesPerTurn = Math.round(2 * Math.PI / Math.abs(perFrame));
				if (Number.isFinite(framesPerTurn) && framesPerTurn >= 2) {
					take.loop = true;
					take.framesPerTurn = framesPerTurn;
					take.rotStep = Math.sign(perFrame) * 2 * Math.PI / framesPerTurn;
				}
				// Le temps t repart de zéro sur la première frame réellement enregistrée.
				glo.clock.reset();
			}
		});
	}
	else {
		if (glo.video.loopActive) {
			// Only arms the stop: the take ends on its own at the next whole turn, and
			// finishLoopRecording then takes over.
			glo.video.loopPendingStop = true;
			glo.video.recorder.requestStop();
		}
		else {
			glo.video.recording = false;
			glo.video.recorder.stop();
			if (glo.orbitCinema.active) orbitCinemaTeardown();
		}
	}
}

/**
 * Finalizes a loop-mode recording: stops the recorder, restores the rotation
 * type that was active before the take, and resets loop state. Called by the
 * recorder once the take has completed an integer number of full turns.
 */
function finishLoopRecording(){
	if (glo.video.recorder) glo.video.recorder.stop();
	glo.video.recording       = false;
	glo.video.loopActive      = false;
	glo.video.loopPendingStop = false;
	glo.rotateType            = glo.video.loopPrevRotateType ?? 'none';
	glo.video.loopPrevRotateType = null;

	const btn = glo.advancedTexture?.getControlByName('videoButton');
	if (btn) btn.textBlock.text = videoButtonText();

	// A fullscreen take ends here too when the loop closes on its own.
	if (glo.orbitCinema.active) orbitCinemaTeardown();
}

/**
 * Puts the app back in order when a take breaks down (the recorder has already stopped
 * itself). A loop take restores its rotation like a finished one; a plain take only
 * clears the recording state.
 */
function recordingFailed(){
	if (glo.video.loopActive) { finishLoopRecording(); return; }
	glo.video.recording = false;
	const btn = glo.advancedTexture?.getControlByName('videoButton');
	if (btn) btn.textBlock.text = videoButtonText();
	if (glo.orbitCinema.active) orbitCinemaTeardown();
}

/**
 * Returns the symbol to display on the video record button based on the
 * current recording / loop-mode state.
 * @returns {string}
 */
function videoButtonText(){
	if (glo.video.loopPendingStop) return "⏳";
	if (glo.video.recording)       return "⏹";
	if (glo.loopRecordMode)        return "🔁";
	return "►";
}

/**
 * Toggles the "perfect loop" recording mode. While enabled, pressing the
 * video record button starts mesh rotation alongside the recording, and
 * stopping waits for the next integer number of full turns before finishing.
 */
function toggleLoopRecordMode(){
	if (glo.video.recording || glo.video.loopPendingStop) return;
	glo.loopRecordMode = !glo.loopRecordMode;

	const btn = glo.advancedTexture?.getControlByName('videoButton');
	if (btn) btn.textBlock.text = videoButtonText();

	if (typeof M !== 'undefined' && M.toast) {
		M.toast({
			html: glo.loopRecordMode
				? '🔁 Mode boucle parfaite : ON'
				: '🔁 Mode boucle parfaite : OFF',
			displayLength: 1500
		});
	}
}

/**
 * Parses a font size value, accepting either a number or a string (e.g., "14px").
 * @param {number|string} fontSize - The font size to parse.
 * @returns {number} The numeric font size value, or 0 if parsing fails.
 */
function parseFontSize(fontSize) {
    if (typeof fontSize === 'number') return fontSize;
    return parseFloat(fontSize) || 0;
}

/**
 * Applies font family, weight, and optional size adjustment to a GUI control.
 * Handles both controls with a `textBlock` property and those with direct font properties.
 * @param {Object} control - The BabylonJS GUI control to style.
 * @param {string} fontFamily - The CSS font family name to apply.
 * @param {number} [fontWeight=400] - The CSS font weight value.
 * @param {number} [fontSizeToAdd=0] - Additional pixels to add to the current font size. If 0, font size is unchanged.
 */
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

/**
 * Applies font styling to all header controls (excluding radio and title classes).
 * Title controls receive an extra +300 font weight boost.
 * @param {string} fontFamily - The CSS font family name.
 * @param {number} [fontWeight=400] - The base CSS font weight.
 * @param {number|boolean} [fontSizeToAdd=false] - Additional pixels to add to font size, or false for no change.
 */
function applyFontToHeaders(fontFamily, fontWeight = 400, fontSizeToAdd = false) {
  glo.allControls.haveThisClass('header').haveNotThisClass('radio').haveNotThisClass('title').forEach(control => {
      applyFont(control, fontFamily, fontWeight, fontSizeToAdd);
  });
  glo.allControls.haveThisClass('title').haveNotThisClass('radio').forEach(control => {
      applyFont(control, fontFamily, fontWeight+300, fontSizeToAdd);
  });
}
/**
 * Applies font settings to all button controls (excluding radio buttons).
 * @param {string} fontFamily - The CSS font family name.
 * @param {number} [fontWeight=400] - The CSS font weight.
 * @param {number|boolean} [fontSizeToAdd=false] - Additional pixels to add to font size, or false for no change.
 */
function applyFontToButtons(fontFamily, fontWeight = 400, fontSizeToAdd = false) {
  glo.allControls.haveThisClass('button').haveNotThisClass('radio').forEach(control => {
      applyFont(control, fontFamily, fontWeight, fontSizeToAdd);
  });
  glo.allControls.getByName('but_goBack').textBlock.fontSize = '20px';
  glo.allControls.getByName('but_goTo').textBlock.fontSize   = '20px';
}
/**
 * Applies font settings to all input controls.
 * @param {string} fontFamily - The CSS font family name.
 * @param {number} [fontWeight=400] - The CSS font weight.
 * @param {number|boolean} [fontSizeToAdd=false] - Additional pixels to add to font size, or false for no change.
 */
function applyFontToInputs(fontFamily, fontWeight = 400, fontSizeToAdd = false) {
  glo.allControls.haveThisClass('input').forEach(control => {
      applyFont(control, fontFamily, fontWeight, fontSizeToAdd);
  });
}
/**
 * Applies font weight and theme colors to headers and titles.
 * @param {number} [fontWeight=600] - The CSS font weight for title controls.
 */
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
/**
 * Customizes bar offset and thumb width for all slider controls.
 * @param {string} barOffset - The bar offset value (e.g. "6px").
 * @param {string|boolean} [thumbWidth=false] - The thumb width value, or false to keep default.
 */
function customSlidersBar(barOffset, thumbWidth = false) {
  glo.allControls.haveThisClass('slider').forEach(control => {
      control.barOffset = barOffset;
      if(thumbWidth) control.thumbWidth = thumbWidth;
  });
}
/**
 * Sets height on all non-radio button controls.
 * @param {number} [height=glo.theme.button.height] - The button height in pixels.
 */
function applyHeightToButtons(height = glo.theme.button.height){
	glo.allControls.haveThisClass('button').haveNotThisClass('radio').forEach(button => { button.height = `${height}px`; });
}

/**
 * Applies complete UI styling (fonts, heights, slider bars) to all controls.
 * @param {number} [fontSizeToAdd=-1] - Additional pixels to add to font sizes.
 */
function styleUI(fontSizeToAdd = -1){
	applyFontToHeaders('Poppins', 400, fontSizeToAdd);
    applyFontToButtons('Poppins', 400, fontSizeToAdd);
    applyHeightToButtons();
    applyFontToInputs('Inter', 400, fontSizeToAdd);
    applyFontStyleToTitle();
    customSlidersBar("6px", "21px");
}