//*****************************************************************************************************//
//*********************************************BABYLON GUI*********************************************//
//*****************************************************************************************************//
BABYLON.GUI.Slider.prototype.subscribeToKeyEventsOnHover = function() {
  this.onWheelObservable.add(function (e) {
      var val = e.y < 0 ? this.step : -this.step;
      this.value += val;
  }.bind(this));
};

BABYLON.GUI.InputText.prototype.subscribeToFocusAndBlurEvents = function() {
  this.onFocusObservable.add(() => {
    for(const prop in glo.theme.input.onFocus){ this[prop] = glo.theme.input.onFocus[prop]; }
  });

  this.onBlurObservable.add(() => {
    for(const prop in glo.theme.input.onBlur){ this[prop] = glo.theme.input.onBlur[prop]; }
  });
};


function add_gui_controls(){
  glo.advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, glo.scene);
  glo.advancedTexture.useSmallestIdeal = true;

  add_switch_and_help_buttons();
  add_axis_and_rot_buttons();
  add_uv_sliders();
  add_alpha_slider();
  add_inputs_equations();
  add_lines_and_dim_buttons();

  add_radios();

  add_step_uv_slider();
  add_histo_buttons();
  add_views_buttons();

  add_color_pickers();
  add_shaders_ctrl();

  add_step_ABCD_sliders();
  add_symmetrize_sliders();
  add_blender_sliders();
  add_transformation_sliders();
  add_sixth_panel_sliders();
  add_functionIt_sliders();
  add_ninethPanel_controls();
  add_eleventh_panel_sliders();

  guiControls_AddIdentificationFunctions();

  param_controls();
  param_buttons();
}

function guiControls_AddIdentificationFunctions(){
  glo.allControls = glo.advancedTexture.getDescendants();
  function getByName(name){
  	var elemToReturn = false;
  	this.map(elem => {
  		if(typeof(elem) != 'undefined' && typeof(elem.name) != 'undefined' && elem.name == name){ elemToReturn = elem; }
  	});
  	return elemToReturn;
  }
  function haveThisClass(className){
  	return haveThisClassOrNot(this, className, true);
  }
  function haveNotThisClass(className){
  	return haveThisClassOrNot(this, className, false);
  }
  function haveThisClassOrNot(arr, className, have){
  	var elemsToReturn = [];
  	var reg = new RegExp("\\b" + className + "\\b");
    if(have){
    	arr.map(elem => {
    		if(typeof(elem) != 'undefined' && typeof(elem.class) != 'undefined' && elem.class.match(reg) != null){ elemsToReturn.push(elem); }
    	});
    }
    else{
      arr.map(elem => {
    		if(typeof(elem) != 'undefined' && typeof(elem.class) != 'undefined' && elem.class.match(reg) == null){ elemsToReturn.push(elem); }
    	});
    }

  	var elemsToReturnLength = elemsToReturn.length;
  	if(elemsToReturnLength == 0){ return []; }

    elemsToReturn.haveNotThisClass  = haveNotThisClass;
    elemsToReturn.haveNotTheseClass = haveNotTheseClass;

  	if(elemsToReturnLength == 1){
      elemsToReturn[0].hasThisClass = hasThisClass;
      elemsToReturn[0].getByName = this.getByName;
      return elemsToReturn;
    }
  	else{
      elemsToReturn.map(elem => { elem.hasThisClass = hasThisClass; });
      elemsToReturn.getByName = getByName;
      elemsToReturn.haveTheseClasses = haveTheseClasses;
      return elemsToReturn;
    }
  }
  function haveTheseClasses(...classesNames){
  	return haveTheseClassesOrNot(this, classesNames, true);
  }
  function haveNotTheseClass(...classesNames){
  	return haveTheseClassesOrNot(this, classesNames, false);
  }
  function haveTheseClassesOrNot(arr, classesNames, have){
  	var elemsToReturn = [];
  	var regs = [];
  	classesNames.map(className => {
      regs.push(new RegExp("\\b" + className + "\\b"));
    });
    if(have){
    	arr.map(elem => {
        if(typeof(elem) != 'undefined' && typeof(elem.class) != 'undefined'){
          var good = true;
          regs.map(reg => {
      		  if(elem.class.match(reg) == null){ good = false; }
          });
          if(good){ elemsToReturn.push(elem); }
        }
    	});
    }
    else{
      arr.map(elem => {
        if(typeof(elem) != 'undefined' && typeof(elem.class) != 'undefined'){
          var good = false;
          regs.map(reg => {
      		  if(elem.class.match(reg) != null){ good = true; }
          });
          if(good){ elemsToReturn.push(elem); }
        }
    	});
    }

    elemsToReturn.haveNotThisClass = haveNotThisClass;
    elemsToReturn.haveNotTheseClass = haveNotTheseClass;

  	var elemsToReturnLength = elemsToReturn.length;
  	if(elemsToReturnLength == 0){ return false; }

  	else{ return elemsToReturn; }
  }
  function hasThisClass(className){
  	var elemsToReturn = [];
  	var reg = new RegExp("\\b" + className + "\\b");
  	if(typeof(this.class) != 'undefined' && this.class.match(reg) != null){ return true; }

  	return false;
  }
  glo.allControls.getByName = getByName;
  glo.allControls.haveThisClass = haveThisClass;
  glo.allControls.haveTheseClasses = haveTheseClasses;
  glo.allControls.haveNotThisClass = haveNotThisClass;
  glo.allControls.haveNotTheseClass = haveNotTheseClass;
  glo.allControls.map(control => { control.hasThisClass =  hasThisClass; });
}

function parmamControl(control, name, className, options = {}, px = false, ident = true){
  if(ident){
    control.name = name;
    control.class = className;
  }
  if(typeof(options.hAlign) != 'undefined'){
    switch (options.hAlign) {
      case 'left':
        control.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        break;
      case 'right':
        control.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        break;
      case 'center':
        control.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        break;
    }
  }
  if(typeof(options.vAlign) != 'undefined'){
    switch (options.vAlign) {
      case 'bottom':
        control.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        break;
      case 'top':
        control.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        break;
      case 'center':
        control.horizontalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        break;
    }
  }

  for(var prop in options){ control[prop] = options[prop] }

  var unit = '%';
  if(px){ unit = 'px'; }

  if(typeof(options.w) != 'undefined'){ control.width = options.w + unit; }
  if(typeof(options.h) != 'undefined'){ control.height = options.h + unit; }
  if(typeof(options.t) != 'undefined'){ control.top = options.t + unit; }
  if(typeof(options.l) != 'undefined'){ control.left = options.l + unit; }
  if(typeof(options.pL) != 'undefined'){ control.paddingLeft = options.pL + unit; }
  if(typeof(options.pR) != 'undefined'){ control.paddingRight = options.pR + unit; }
  if(typeof(options.pT) != 'undefined'){ control.paddingTop = options.pT + unit; }
}

function exemple(){
  glo.allControls.haveThisClass('button').forEach(but => { but.background = '#654321'; });
}

function designButton(bt, color = glo.buttons_color, cornerRadius = glo.buttons_radius, background = glo.buttons_background, fontSize = glo.buttons_fontsize){
  bt.color = color; bt.cornerRadius = cornerRadius; bt.background = background; bt.textBlock.fontSize = fontSize;
}

function add_switch_and_help_buttons(){
  var panel = new BABYLON.GUI.StackPanel();
  var options = { isVertical: false, hAlign: 'right', vAlign: 'bottom', w: 20, l: 3, t: -1, };
  parmamControl(panel, 'hideSwitchHelp', 'panel right first noAutoParam', options);
  panel.height = "80px";
  glo.advancedTexture.addControl(panel);

  function add_button(name, text, width, height, paddingLeft, paddingRight, eventLeft, eventRight){
    var button = BABYLON.GUI.Button.CreateSimpleButton(name, text);
    parmamControl(button, name, 'button right first', {w: width, h: height, pL: paddingLeft, pR: paddingRight}, true);
    designButton(button);
    button.onPointerUpObservable.add(function(event) {
      if (event.buttonIndex !== 2){ eventLeft(); }
      else if(typeof eventRight === 'function'){ eventRight(); }
    });
    panel.addControl(button);
  }

  add_button("but_hide", "HIDE", glo.buttonBottomSize, glo.buttonBottomHeight, glo.buttonBottomPaddingLeft, 0, function(){
    glo.allControls.getByName('but_hide').textBlock.text = glo.gui_suit_visible ? "HIDE" : "SHOW";

    toggle_gui_controls(glo.gui_suit_visible);
    toggleRightPanels(glo.guiSelect, glo.gui_suit_visible);

    glo.gui_suit_visible = !glo.gui_suit_visible;
  });
  add_button("but_switch", "SWITCH", glo.buttonBottomSize, glo.buttonBottomHeight, glo.buttonBottomPaddingLeft, 0,
             function(){ switchRightPanel(true); }, function(){ switchRightPanel(false); } );

  add_button("but_help", "HELP", glo.buttonBottomSize, glo.buttonBottomHeight, glo.buttonBottomPaddingLeft, 0, function(){
    if(glo.fullScreen){ glo.engine.switchFullscreen(); }
    $('#helpModal').modal('open', {
      onCloseEnd: function() {
        if(glo.fullScreen){ glo.engine.switchFullscreen(); }
      }
    });
  });
}
function add_axis_and_rot_buttons(){
  var panel = new BABYLON.GUI.StackPanel();
  var options = {isVertical: false, hAlign: 'right', vAlign: 'top', w: 15, h: 5, t: 20, pL: -2.5 };
  parmamControl(panel, 'axisAndRotButton', 'panel right first noAutoParam', options);
  panel.isVertical = false;
  glo.advancedTexture.addControl(panel);

  function add_button(name, text, width, height, paddingLeft, paddingRight, eventLeft, eventRight = eventLeft){
    var button = BABYLON.GUI.Button.CreateSimpleButton(name, text);
    parmamControl(button, name, 'button right first', {w: width, h: height, pL: paddingLeft, pR: paddingRight}, true);
    designButton(button);
    button.onPointerUpObservable.add(function(event) {
      if (event.buttonIndex !== 2){ eventLeft(); }
      else{ eventRight(); }
    });
    panel.addControl(button);
  }

  add_button("but_axis", "AXIS", 70, 100/3, 10, 0, function(){
    glo.axis_visible = !glo.axis_visible;
    if(glo.first_axis_visible){ showAxis(glo.axis_size, 1); glo.first_axis_visible = false; }
    else{
      switch_axis();
    }
  });
  add_button("but_rot", "Rot α", 70, 100/3, 10, 0, function(){
    const rotType = glo.rotType.next().value;

    switch(rotType.next){
      case 'alpha':
        glo.allControls.getByName("but_rot").textBlock.text = "Rot α";
      break;
      case 'beta' :
        glo.allControls.getByName("but_rot").textBlock.text = "Rot β";
      break;
      case 'teta' :
        glo.allControls.getByName("but_rot").textBlock.text = "Rot θ";
      break;
      case 'none' :
        glo.allControls.getByName("but_rot").textBlock.text = "Stop";
      break;
    }

    glo.meshChannel.postMessage({ action: 'setRotateType', rotType: rotType.next });
  });

  var button1 = BABYLON.GUI.Button.CreateSimpleButton("but_screen", "↗ S");
  parmamControl(button1, 'fullScreenButton', 'button right first', {h: 35, pL: 10}, true);
  button1.width = 0.2;
  button1.onPointerUpObservable.add(async function() {
      glo.fullScreen = !glo.fullScreen;
      if (!document.fullscreenElement) {
          await glo.canvas.requestFullscreen();
          button1.textBlock.text = "↘ S";
      } else {
          await document.exitFullscreen();
          button1.textBlock.text = "↗ S";
      }
  });

  // Écouter le changement de fullscreen pour resync le GUI
  document.addEventListener('fullscreenchange', () => {
      glo.fullScreen = !!document.fullscreenElement;
      
      setTimeout(() => {
          glo.engine.resize();
          
          // Resync le GUI
          glo.advancedTexture.scaleTo(
              glo.engine.getRenderWidth(), 
              glo.engine.getRenderHeight()
          );
      }, 100);
  });

  panel.addControl(button1);
  glo.fullScreenButton = button1;

  add_button("but_resolution", "Rx1", 70, 100/3, 10, 0, function(){
    changeResolution('increase');
    glo.allControls.getByName('but_resolution').textBlock.text = `Rx${glo.resolutionCoeff}`;
  }, function(){
    changeResolution('decrease');
    glo.allControls.getByName('but_resolution').textBlock.text = `Rx${glo.resolutionCoeff}`;
  });
}
function add_lines_and_dim_buttons(){
  var topShift = 0;
  glo.formes.select.map( forme => {
    if(forme.typeCoords == glo.coordsType){ topShift+=glo.shiftLineDim; }
  });
  var top_panel = -3;

  var panel = new BABYLON.GUI.StackPanel();
  var options = {isVertical: false, hAlign: 'left', w: 20, h: 5, t: top_panel, pL: 1.77};
  parmamControl(panel, 'lineDim', 'panel left first noAutoParam', options);
  glo.advancedTexture.addControl(panel);

  function add_button(name, text, width, height, paddingLeft, paddingRight, eventLeft, eventRight = eventLeft){
    var button = BABYLON.GUI.Button.CreateSimpleButton(name, text);
    parmamControl(button, name, 'button left first', {w: width, h: height, pL: paddingLeft, pR: paddingRight}, true);

    button.onPointerUpObservable.add(function(event) {
      if (event.buttonIndex !== 2){ eventLeft(); }
      else{ eventRight(); }
    });
    panel.addControl(button);
  }

  add_button("but_grid", "GRID", 60, 30, 0, 0, async function(){
    glo.grid_visible = !glo.grid_visible;
    glo.axis_visible = !glo.axis_visible;
    
    if(!glo.grid_visible){ switch_grid(); showAxis(glo.axis_size, 0); return; }

    showAxis(glo.axis_size, 1);
    const gridScale = glo.params.gridScaleValue;
    showGrid(gridScale, gridScale, gridScale, 1); glo.first_grid_visible = false;
  });
  add_button("but_plan", "PLAN", 60, 30, 10, 0, function(){
    glo.planes_visible = !glo.planes_visible;
    make_planes();
  });
  add_button("but_coord", "CART", 70, 30, 10, 0, function(){switchCoords();}, function(){switchCoords(false);});
  add_button("but_import_obj", "IMP", 60, 30, 10, 0, function(){
    importOBJMesh();
  });
  add_button("but_dimension", "EXP", 60, 30, 10, 0, function(){
    exportModal();
  });
}
function add_histo_buttons(){
  var panel = new BABYLON.GUI.StackPanel();
  var options = {isVertical: false, hAlign: 'left', vAlign: 'bottom', w: 20, l: 5.66, t: -1, };
  parmamControl(panel, 'panelHistoButton', 'panel right left noAutoParam', options);
  panel.height = '80px';
  glo.advancedTexture.addControl(panel);

  function add_button(name, text, width, height, paddingLeft, paddingRight, eventLeft, eventRight){
    var button = BABYLON.GUI.Button.CreateSimpleButton(name, text);
    designButton(button);
    parmamControl(button, name, 'button right left first noAutoParam', {w: width, h: height, pL: paddingLeft, pR: paddingRight}, true);
    button.fontSize = "20px";
    button.onPointerDownObservable.add(function(event) {
      if (event.buttonIndex !== 2){ eventLeft(); }
      else{ eventRight(); }
    });
    panel.addControl(button);
  }

  add_button("but_goBack", "<", 80, 30, 10, 0, function(){glo.histo.goBack();}, function(){glo.histo.go('start');});
  add_button("but_goTo", ">", 80, 30, 10, 0, function(){glo.histo.goTo();}, function(){glo.histo.go('end');});
}

function add_views_buttons(){
  var panel = new BABYLON.GUI.StackPanel();
  var options = {isVertical: false, hAlign: 'right', vAlign: 'top', w: 20, h: 5, t: 14.5, pL: 5.5  };
  parmamControl(panel, 'viewsButtonsPanel', 'panel right first noAutoParam', options);
  glo.advancedTexture.addControl(panel);

  function add_button(name, text, width, height, paddingLeft, paddingRight, event){
    var button = BABYLON.GUI.Button.CreateSimpleButton(name, text);
    parmamControl(button, name, 'button right first', {w: width, h: height, pL: paddingLeft, pR: paddingRight}, true);
    button.onPointerUpObservable.add(function() {
      event();
    });
    panel.addControl(button);
  }

  function changeButtonsTexts(...texts){
    var namesButtons = ["but_viewX", "but_viewY", "but_viewZ"];
    var n = 0;
    texts.map(text => {
      glo.allControls.getByName(namesButtons[n]).textBlock.text = text;
      n++;
    });
  }

  add_button("but_viewX", "X", 52.5, 30, 0, 0, function(){
    glo.camera.upVector = new BABYLON.Vector3(0,0,1);
    if(glo.viewXpos){
      viewOnX(1); glo.viewYpos = true; glo.viewZpos = true;
      changeButtonsTexts("X-", "Y", "Z");
    }
    else {
      viewOnX(-1);
      changeButtonsTexts("X", "Y", "Z");
    }

    glo.viewXpos = !glo.viewXpos;
  });
  add_button("but_viewY", "Y", 60, 30, 10, 0, function(){
    glo.camera.upVector = new BABYLON.Vector3(0,0,1);
    if(glo.viewYpos){
      viewOnY(1); glo.viewXpos = true; glo.viewZpos = true;
      changeButtonsTexts("X", "Y-", "Z");
    }
    else {
      viewOnY(-1);
      changeButtonsTexts("X", "Y", "Z");
    }

    glo.viewYpos = !glo.viewYpos;
  });
  add_button("but_viewZ", "Z", 60, 30, 10, 0, function(){
    glo.camera.upVector = new BABYLON.Vector3(0,1,0);
    if(glo.viewZpos){
      viewOnZ(1); glo.viewXpos = true; glo.viewYpos = true;
      changeButtonsTexts("X", "Y", "Z-");
    }
    else {
      viewOnZ(-1);
      changeButtonsTexts("X", "Y", "Z");
    }

    glo.viewZpos = !glo.viewZpos;
  });
}

function add_uv_sliders(){
  function add_slider(name, headerText, gloPropToModify, gloPropToAssignInput){
    var panel = new BABYLON.GUI.StackPanel();
    parmamControl(panel, "panel_" + name, 'panel left first');
    glo.advancedTexture.addControl(panel);

    var min_start = -glo['params'][gloPropToModify].toFixed(2);
    var max_start = glo['params'][gloPropToModify].toFixed(2);
    var header = new BABYLON.GUI.TextBlock();
    parmamControl(header, 'uvSliderHeader-' + name, 'header left first', {text: headerText + " : " + min_start + " — " + max_start});
    panel.addControl(header);

    var slider = new BABYLON.GUI.Slider();
    parmamControl(slider, name, 'slider left first', {minimum: 0, maximum: 6*PI, value: glo['params'][gloPropToModify], startValue: glo['params'][gloPropToModify]});
    glo[gloPropToAssignInput] = slider;

    slider.onValueChangedObservable.add(async function (value) {
      if(value == 0){ value = 0.00001; }

      var min = -value.toFixed(2);
      var max =  value.toFixed(2);

      if(glo.slidersUVOnOneSign[name]){
        min = 0;
        this.min = 0;
      }

      glo['params'][gloPropToModify] = value;
      if(!glo.fromHisto){
        await remakeRibbon();
      }

      header.text = headerText + " : " + min + " — " + max;
    });
    slider.onPointerClickObservable.add(function (e) {
      if(e.buttonIndex == 2){ slider.value = slider.startValue; }
    });
    slider.onWheelObservable.add(function (e) {
      var val = e.y < 0 ? val = pi/8 : val = -pi/8; slider.value += val;
    });

    panel.addControl(slider);
  }

  add_slider('u', 'U', 'u', 'slider_u');
  add_slider('v', 'V', 'v', 'slider_v');
}

function add_alpha_slider(){
  var panel = new BABYLON.GUI.StackPanel();
  parmamControl(panel, "panelAlphaSlider", 'panel left first');
  panel.class = "panel left first";
  glo.advancedTexture.addControl(panel);

  var header = new BABYLON.GUI.TextBlock();
  parmamControl(header, 'alphaSliderHeader', 'header left first', {text: "Transparency"});
  panel.addControl(header);

  var slider = new BABYLON.GUI.Slider();
  parmamControl(slider, 'alphaSlider', 'slider left first', {minimum: 0, maximum: 1, value: glo.ribbon_alpha});

  slider.onValueChangedObservable.add(function (value) {
    if(typeof(glo.ribbon) != "undefined" && glo.ribbon != null){
      glo.ribbon.material.alpha = value;
      glo.ribbon_alpha = value;
      if(glo.curves.lineSystem){ glo.curves.lineSystem.alpha = value; }
      if(glo.curves.doubleLineSystem){ glo.curves.doubleLineSystem.alpha = value; }
    }
  });

  panel.addControl(slider);
}
function add_inputs_equations(){
  var panel                = new BABYLON.GUI.StackPanel();
  var panelSuitsEquations  = new BABYLON.GUI.StackPanel();
  var panelSymsEquations   = new BABYLON.GUI.StackPanel();
  let panelEvalY           = new BABYLON.GUI.StackPanel();

  parmamControl(panel, "inputsEquations", 'panel left first');
  parmamControl(panelSuitsEquations, "inputsSuitsEquations", 'panel right fourth noAutoParam', {hAlign: 'right', vAlign: 'top', w: 24, pR: 1, t: 26});
  parmamControl(panelEvalY, "panelEvalY", 'panel right sixth noAutoParam', {hAlign: 'right', vAlign: 'top', w: 60, pR: 1, t: 505, h: 100, pL: -330}, true);

  var options = {hAlign: 'right', vAlign: 'top', w: 24, t: 83, pR: 1};
  parmamControl(panelSymsEquations, "panelSymsEquations", 'panel right fourth noAutoParam', options);

  panel.onWheelObservable.add(function (e) {var val = e.y < 0 ? glo.histo.goTo() : glo.histo.goBack(); });

  glo.advancedTexture.addControl(panel);
  glo.advancedTexture.addControl(panelSuitsEquations);
  glo.advancedTexture.addControl(panelSymsEquations);
  glo.advancedTexture.addControl(panelEvalY);

  glo.text_input_alpha = "";
  glo.text_input_beta  = "";

  var indexInInputsEquations = 0;

  function add_input(parent, textHeader, textField, name, classNameHeader, classNameInput, gloPropToModify, gloPropToAssignInput, colorEquation = false, withEvent = true, width = 365){
    var header = new BABYLON.GUI.TextBlock();
    parmamControl(header, "header_" + name, classNameHeader, {text: textHeader});
    if(parent.name !== 'inputsEquations' && parent.name !== 'panelEvalY'){ header.paddingLeft = "20%"; }
    parent.addControl(header);

    var input = new BABYLON.GUI.InputText();
    parmamControl(input, name, classNameInput, {w: width, fontWeight: "500", fontSize: "19", text: textField, h:25}, true);

    input.inputsEquationsIndex = indexInInputsEquations;
    indexInInputsEquations++;

    async function inputChangeEvent(){
      await remakeRibbon();

      glo.advancedTexture.moveFocusToControl(input);
    }

    if(withEvent){
      input.onKeyboardEventProcessedObservable.add((event) => {
        let key  = event.key;
        let text = input.text;

        if(key != "Control" && key != "c" && key != "v" && key != "F12"){
          event.stopPropagation();
          event.preventDefault();
        }

        if (key != "Tab" && !key.match(/Arrow/, g)) {
          if(!colorEquation){
            if(!glo.normalMode){ glo['params'][gloPropToModify] = text; }
            else{ glo['params']['normale'][gloPropToModify] = text; }
          }
          else{
            glo['params'][gloPropToModify] = text;
          }
          if(event){
            if(!glo.normalOnNormalMode){ inputChangeEvent(); }
            else if(key == "Enter"){ inputChangeEvent(); }
          }
        }
        else if (key == "Tab") {
          var inputsEquations = glo.allControls.haveTheseClasses("input", "equation");
          var inputsEquationsLastIndex = inputsEquations.length - 1;
          var newIndex = 0;
          if(!event.shiftKey){
            if(input.inputsEquationsIndex < inputsEquationsLastIndex){ newIndex = input.inputsEquationsIndex + 1; }
            glo.advancedTexture.moveFocusToControl(inputsEquations[newIndex]);
          }
          else{
            if(input.inputsEquationsIndex > 0){ newIndex = input.inputsEquationsIndex - 1; }
            else{ newIndex = inputsEquationsLastIndex; }
            glo.advancedTexture.moveFocusToControl(inputsEquations[newIndex]);
          }
        }
      });
      input.onTextPasteObservable.add((event) => {
        var text = input.text;
        if(!colorEquation){
          if(!glo.normalMode){ glo['params'][gloPropToModify] = text; }
          else{ glo['params']['normale'][gloPropToModify] = text; }
        }
        else{
          glo['params'][gloPropToModify] = text;
        }
        if(event){ inputChangeEvent(); }
        glo.advancedTexture.moveFocusToControl(input);
      });
    }

    parent.addControl(input);

    glo[gloPropToAssignInput] = input;
  }

  add_input(panel, "X", "u", "inputX", "header left first", "input equation left first", "text_input_x", "input_x");
  add_input(panel, "Y", "usv", "inputY", "header left first", "input equation left first", "text_input_y", "input_y");
  add_input(panel, "Z", "ucvsu", "inputZ", "header left first", "input equation left first", "text_input_z", "input_z");
  add_input(panel, "Rot Z", "", "inputAlpha", "header left first", "input equation left first", "text_input_alpha", "input_alpha");
  add_input(panel, "Rot Y", "", "inputBeta", "header left first", "input equation left first", "text_input_beta", "input_beta");

  add_input(panelSymsEquations, "Equation", "", "inputRSymmetrize", "header right fourth noAutoParam", "input equation right fourth", "text_input_sym_r", "input_sym_r", false, false);

  add_input(panelEvalY, "Eval X", "", "inputEvalX", "header right sixth", "input equation right sixth", "text_input_eval_x", "input_eval_x");
  add_input(panelEvalY, "Eval Y", "", "inputEvalY", "header right sixth", "input equation right sixth", "text_input_eval_y", "input_eval_y");

  // Ajouter un événement personnalisé pour R Symmetrize
  glo.input_sym_r.onKeyboardEventProcessedObservable.add(async (event) => {
      let key = event.key;
      let text = glo.input_sym_r.text;

      if (key !== "Control" && key !== "c" && key !== "v" && key !== "F12") {
          event.stopPropagation();
          event.preventDefault();
      }

      glo.params.text_input_sym_r = text;

      if (key === "Enter" || (!glo.normalOnNormalMode && key !== "Tab" && !key.match(/Arrow/g))) {
          //if(glo.curves.lineSystem)       glo.curves.lineSystem.visibility       = glo.input_sym_r.text ? false : true;
          //if(glo.curves.lineSystemDouble) glo.curves.lineSystemDouble.visibility = glo.input_sym_r.text ? false : true;

          //await applyDeformationShader();
          glo.ribbon.shaderMeshInstance.updateDeformationExpression();
      }
  });

  glo.input_sym_r.onTextPasteObservable.add(async () => {
      glo.params.text_input_sym_r = glo.input_sym_r.text;

      //if(glo.curves.lineSystem)       glo.curves.lineSystem.visibility       = glo.input_sym_r.text ? false : true;
      //if(glo.curves.lineSystemDouble) glo.curves.lineSystemDouble.visibility = glo.input_sym_r.text ? false : true;

      glo.ribbon.shaderMeshInstance.updateDeformationExpression();
  });
}

function add_radios(suit = false){
  var topShift = 0;
  var topShiftLineDim = 0;
  glo.formes.select.map( forme => {
    if(forme.typeCoords == glo.coordsType){ topShift+=glo.shiftRadios; topShiftLineDim+=glo.shiftLineDim; }
  });
  var top_panel = 50;
  var top_panel_line_dim = -3;

  if(glo.first_radio){
    var panel = new BABYLON.GUI.StackPanel();
    panel.onWheelObservable.add(async function(event){
      glo.whellSwitchFormDown = event.y > 0 ? true : false;
      await whellSwitchForm();
      //glo.histo.save();
    });
    var options = {hAlign: 'left', vAlign: 'top', w: 20, t: top_panel, pL: 1};
    parmamControl(panel, 'panelRadios', 'panel right first noAutoParam', options);
    glo.advancedTexture.addControl(panel);
    var header = new BABYLON.GUI.TextBlock();
    parmamControl(header, "header_" + name, 'header left first', {text: "Forms :"});
    panel.addControl(header);
  }

  var addRadio = function(text, parent, group, check = false, typeCoords) {
    if(!glo.first_radio){ check = false; }
    var button = new BABYLON.GUI.RadioButton();
    var options = {w: "13", h: "13", group: 'radiosForms', isChecked: check};
    parmamControl(button, "Radio-" + text, 'radio left first', options, true);
    for(const prop in glo.theme.radio.button){ button[prop] = glo.theme.radio.button[prop]; }
    
    const formSelected = glo.formes.getFormSelect().form;
    if(formSelected && formSelected.text === text && formSelected.typeCoords === typeCoords){
      button.isChecked = true;
    }

    if(glo.formeToFractalize && text === glo.formeToFractalize.text && typeCoords === glo.formeToFractalize.typeCoords){
      button.color = 'red';
    }

    if(glo.formeToFractalize && text === glo.formeToFractalize.text && typeCoords === glo.formeToFractalize.typeCoords){
      button.color = 'red';
    }

    // Ajout du gestionnaire pour les clics gauche et droit
    button.onPointerClickObservable.add(async function(e) {
      // Gestion du clic gauche (buttonIndex 0 correspond au clic gauche)
      if (e.buttonIndex === 0 && !glo.fromHisto) {

        await glo.formes.setFormeSelect(text, glo.coordsType);
        //glo.histo.save();

        // button.onPointerClickObservable.remove(this);
      }

      if (e.buttonIndex === 2) {
        glo.formeToFractalize = glo.formes.getFormByName(text, glo.coordsType);
        glo.radios_formes.getByName('Radio-' + glo.formes.getFormSelect().form.text).button.isChecked = true;
        
        // Mettre à jour la couleur des boutons radio
        glo.radios_formes.forEach(radioForme => {
          radioForme.button.color = glo.theme.radio.text.color;
        });
        glo.radios_formes.getByName('Radio-' + text).button.color = 'red';

        // Si la fractalisation est activée, exécuter la logique
        if (glo.params.fractalize.actived) {
          await remakeRibbon();
        }
      }
    });



    var header = BABYLON.GUI.Control.AddHeader(button, text, "200px", { isHorizontal: true, controlFirst: true });
    parmamControl(header, "headerRadio-" + text, 'header radio left first noAutoParam', {h: 20, pT: 4}, true);
    header.paddingLeft = "16%";
    for(const prop in glo.theme.radio.text){ header[prop] = glo.theme.radio.text[prop]; }

    var textBlock = header.children[1];
    //textBlock.fontFamily = "Poppins";
    textBlock.fontFamily = "Manrope";
    textBlock.fontWeight = 300;
    textBlock.fontSize = "14px";

    glo.radios_formes.push({button: button, header: header});

    parent.addControl(header);
  }

  if(!glo.first_radio){
    var panel = glo.allControls.getByName('panelRadios');
    glo.allControls.getByName('panelRadios').top = top_panel + '%';
    glo.allControls.getByName('lineDim').top = top_panel_line_dim + '%';
    glo.formes.select.map( forme => {
        var radio_form = glo.radios_formes.getByName("Radio-" + forme.text);
        if(radio_form != false){
          radio_form.button.dispose();
          radio_form.header.dispose();
        }
    });
  }

  glo.radios_formes.length = 0;

  glo.formes.select.map( forme => {
    if(forme.typeCoords == glo.coordsType){
      if(!suit){
        if(!forme.suit){ addRadio(forme.text, panel, "forms", forme.check, forme.typeCoords); }
      }
      else{
        if(glo.formesSuit){
          if(forme.suit){ addRadio(forme.text, panel, "forms", forme.check, forme.typeCoords); }
        }
        else{
          if(!forme.suit){ addRadio(forme.text, panel, "forms", forme.check, forme.typeCoords); }
        }
      }
    }
  });

  //applyFontToRadio('Poppins', 300, false, 14);
  glo.first_radio = false;
}

function add_step_uv_slider(){
  function add_slider(name, headerText, gloPropToModify, gloPropToAssignInput){
    var panel = new BABYLON.GUI.StackPanel();
    parmamControl(panel, "panel_" + name, 'panel right first');
    glo.advancedTexture.addControl(panel);

    var header = new BABYLON.GUI.TextBlock();
    parmamControl(header, headerText, 'header right first', {text: headerText + " : " + glo['params'][gloPropToModify]});
    panel.addControl(header);

    var slider = new BABYLON.GUI.Slider();
    parmamControl(slider, name, "slider right first", {minimum: 1, maximum: 264, value: glo['params'][gloPropToModify], startValue: glo['params'][gloPropToModify], updating: false});

    slider.onValueChangedObservable.add(async function (value) {
      value = parseInt(value);
      glo['params'][gloPropToModify] = value;
      getPathsInfos();
      if(!glo.fromHisto){
        await remakeRibbon();
      }

      header.text = headerText + " : " + value;
    });
    slider.onPointerClickObservable.add(function (e) {
      if(e.buttonIndex == 2){ slider.value = slider.startValue; }
    });
    slider.onWheelObservable.add(function (e) {
      var val = e.y < 0 ? val = 1 : val = -1; slider.value += val;
    });
    panel.addControl(slider);

    glo[gloPropToAssignInput] = slider;
  }

  add_slider("stepU", "Steps U", "steps_u", "slider_nb_steps_u");
  add_slider("stepV", "Steps V", "steps_v", "slider_nb_steps_v");
}

function add_color_pickers(){
  //var panelHeader    = new BABYLON.GUI.StackPanel();
  var panelTitleUI   = new BABYLON.GUI.StackPanel();
  var panelTitleMesh = new BABYLON.GUI.StackPanel();
  var panel1         = new BABYLON.GUI.StackPanel();
  var panel2         = new BABYLON.GUI.StackPanel();
  var panelButtons   = new BABYLON.GUI.StackPanel();

  var panelTitleUIBg        = new BABYLON.GUI.StackPanel();
  var panelTitleUIButton    = new BABYLON.GUI.StackPanel();
  var panelTitleMeshBg      = new BABYLON.GUI.StackPanel();
  var panelTitleMeshDiffuse = new BABYLON.GUI.StackPanel();
  var panelTitleMeshLine    = new BABYLON.GUI.StackPanel();
  var panelTitleRandom      = new BABYLON.GUI.StackPanel();

  var top     = {panel1: 35, panel2: 55, panel3: 60, panelButtons: 73};
  var options = {hAlign: 'right', vAlign: 'top', w: 20, h:15, t: top.panel1, pL: 2, isVertical: false};

  const paramsPanels = {
    section: {
      title: {name: "colorHeaderPan", text: "Colors", top: 27, numUI: 'first onlyMainGui noAutoParam', fontSize: 22},
    },
    ui: {
      title: {name: "colorHeaderTitleUI", text: "UI", top: 31.5, numUI: 'first onlyMainGui noAutoParam', fontSize: 20},
    },
    mesh: {
      title: {name: "colorHeaderTitleMesh", text: "Mesh", top: 50.5, numUI: 'first onlyMainGui noAutoParam', fontSize: 20},
    },
    random: {
      title: {name: "colorHeaderTitleRandom", text: "Random", top: 71, numUI: 'first onlyMainGui noAutoParam', fontSize: 20},
    },
  };

  makePanelsTitles(paramsPanels);

  //makePanelTitle("colorHeaderPan", "Colors", 27, 'first onlyMainGui noAutoParam', 22);
  //makePanelTitle("colorHeaderTitleUI", "UI", 27, 'first onlyMainGui noAutoParam', 22);
  
  //parmamControl(panelHeader, 'colorHeaderPan', 'panel right first noAutoParam onlyMainGui', {hAlign: 'right', vAlign: 'top', w: 20, h: 15, t: 21, pL: 8, isVertical: false});
  //parmamControl(panelTitleUI, 'colorHeaderTitleUI', 'panel right first noAutoParam onlyMainGui', {hAlign: 'right', vAlign: 'top', w: 20, h: 15, t: 26, pL: 9.5, isVertical: false});
  //parmamControl(panelTitleMesh, 'colorHeaderTitleMesh', 'panel right first noAutoParam onlyMainGui', {hAlign: 'right', vAlign: 'top', w: 20, h: 15, t: 45, pL: 8.5, isVertical: false});
  
  const hTest = 2;
  parmamControl(panelTitleUIBg, 'colorTitleUIBg', 'panel right first noAutoParam onlyMainGui', {hAlign: 'right', vAlign: 'top', w: 20, h: hTest, t: 35.5, pL: 4.875, isVertical: false});
  parmamControl(panelTitleUIButton, 'colorTitleUIButton', 'panel right first noAutoParam onlyMainGui', {hAlign: 'right', vAlign: 'top', w: 20, h: hTest, t: 35.5, pL: 11.4166, isVertical: false});
  parmamControl(panelTitleMeshBg, 'colorTitleMeshBg', 'panel right first noAutoParam onlyMainGui', {hAlign: 'right', vAlign: 'top', w: 20, h: hTest, t: 55, pL: 2.4166, isVertical: false});
  parmamControl(panelTitleMeshDiffuse, 'colorTitleMeshDiffuse', 'panel right first noAutoParam onlyMainGui', {hAlign: 'right', vAlign: 'top', w: 20, h: hTest, t: 55, pL: 8.875, isVertical: false});
  parmamControl(panelTitleMeshLine, 'colorTitleMeshLine', 'panel right first noAutoParam onlyMainGui', {hAlign: 'right', vAlign: 'top', w: 20, h: hTest, t: 55, pL: 14.66, isVertical: false});
  //parmamControl(panelTitleRandom, 'colorTitleRandom', 'panel right first noAutoParam onlyMainGui', {hAlign: 'right', vAlign: 'top', w: 20, h: hTest, t: 72, pL: 8.25, isVertical: false});

  options.pL = 4.5;
  parmamControl(panel1, 'pickerColorPan1', 'panel right first noAutoParam onlyMainGui', options);
  options.t = top.panel2; options.pL = 2;
  parmamControl(panel2, 'pickerColorPan2', 'panel right first noAutoParam onlyMainGui', options);
  options.t = top.panel3;
  
  options.t = top.panelButtons; options.pL = 4.166;
  parmamControl(panelButtons, 'uiColorButtons', 'panel right first noAutoParam onlyMainGui', options);

  function paramHeader(panel, header, text, options){
    header.text = text;
    header.color = "white";
    header.height = "30px";
    header.width = "100%";
    header.fontSize = options.fontSize;
    header.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    parmamControl(header, options.name, 'header right first noAutoParam onlyMainGui');
    panel.addControl(header);
  }

  let optionsHeader = {
    color: "white",
    height: "30px",
    width: "100%",
    fontSize: 18,
    textHorizontalAlignment: BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT,
  };

  /*var header = new BABYLON.GUI.TextBlock();
  optionsHeader.fontSize = 24;
  paramHeader(panelHeader, header, "Colors", optionsHeader);
  optionsHeader.fontSize = 20;*/

  //var headerUI = new BABYLON.GUI.TextBlock();
  //paramHeader(panelTitleUI, headerUI, "UI", optionsHeader);

  //var headerMesh = new BABYLON.GUI.TextBlock();
  //paramHeader(panelTitleMesh, headerMesh, "Mesh", optionsHeader);

  optionsHeader.fontSize = 16;
  var headerUIBg = new BABYLON.GUI.TextBlock();
  paramHeader(panelTitleUIBg, headerUIBg, "Background", optionsHeader);

  var headerUIButton = new BABYLON.GUI.TextBlock();
  paramHeader(panelTitleUIButton, headerUIButton, "Button", optionsHeader);

  var headerMeshBg = new BABYLON.GUI.TextBlock();
  paramHeader(panelTitleMeshBg, headerMeshBg, "Background", optionsHeader);

  var headerMeshDiffuse = new BABYLON.GUI.TextBlock();
  paramHeader(panelTitleMeshDiffuse, headerMeshDiffuse, "Diffuse", optionsHeader);

  var headerMeshLine = new BABYLON.GUI.TextBlock();
  paramHeader(panelTitleMeshLine, headerMeshLine, "Lines", optionsHeader);

  /*var headerRandomColor = new BABYLON.GUI.TextBlock();
   optionsHeader.fontSize = 20;
  paramHeader(panelTitleRandom, headerRandomColor, "Random", optionsHeader);
  optionsHeader.fontSize = 16;*/

  var picker = new BABYLON.GUI.ColorPicker();
  parmamControl(picker, 'pickerColorBackground', "picker right first onlyMainGui", { value: glo.backgroundColor, hAlign: 'center', w: glo.pickers_size, h: glo.pickers_size, pT: 5 }, true);
  picker.onValueChangedObservable.add(function(value) {
    glo.scene.clearColor = value;
    glo.backgroundColor = value;
    glo.new_color = "rgb(0,0,0)";
    glo.color_line_grid = new BABYLON.Color3(0, 0, 0);
    if(value.r + value.g + value.b < 1.5){
      glo.new_color = "white";
      glo.color_line_grid = new BABYLON.Color3(1, 1, 1);
    }
    glo.labelGridColor = glo.new_color;

    glo.allControls.haveThisClass('header').map(header => { header.color = glo.new_color; });
    glo.radios_formes.changeColor(glo.new_color);

    if(typeof(glo.labels_axis) != "undefined"){ glo.labels_axis.map(label_axis => { label_axis.color = glo.new_color; }); }
    if(typeof(glo.labels_grid) != "undefined"){ glo.labels_grid.map(label_grid => { label_grid.color = glo.new_color; }); }

    var new_color_line_grid = glo.color_line_grid;
    if(typeof(glo.gridX) != "undefined"){ glo.gridX.map(line => { line.color = new_color_line_grid; }); }
    if(typeof(glo.gridY) != "undefined"){ glo.gridY.map(line => { line.color = new_color_line_grid; }); }
    if(typeof(glo.gridZ) != "undefined"){ glo.gridZ.map(line => { line.color = new_color_line_grid; }); }
  });

  var picker2 = new BABYLON.GUI.ColorPicker();
  parmamControl(picker2, 'pickerColorDiffuse', "picker right first onlyMainGui", { value: glo.diffuseColor, hAlign: 'center', w: glo.pickers_size, h: glo.pickers_size, pT: 5 }, true);
  picker2.onValueChangedObservable.add(function(value) {
    var ribbonToColorize = glo.ribbon;
    
    if(ribbonToColorize && !ribbonToColorize.material){
      var material = new BABYLON.StandardMaterial("myMaterial", glo.scene);
	    material.backFaceCulling  = false;
      ribbonToColorize.material = material;
    }
    if(ribbonToColorize) ribbonToColorize.material.diffuseColor = value;
    glo.diffuseColor = value;
  });

  var picker3 = new BABYLON.GUI.ColorPicker();
  parmamControl(picker3, 'pickerColorEmissive', "picker right first onlyMainGui", { value: glo.emissiveColor, hAlign: 'center', w: glo.pickers_size, h: glo.pickers_size, pT: 5 }, true);
  picker3.onValueChangedObservable.add(function(value) {
    var ribbonToColorize = glo.ribbon;
    
    if(ribbonToColorize && !ribbonToColorize.material){
      var material = new BABYLON.StandardMaterial("myMaterial", glo.scene);
	    material.backFaceCulling  = false;
      ribbonToColorize.material = material;
    }
    if(ribbonToColorize) ribbonToColorize.material.emissiveColor = value;
    glo.emissiveColor = value;

    glo.ribbon.shaderMeshInstance.updateColors();
  });

  var picker4 = new BABYLON.GUI.ColorPicker();
  parmamControl(picker4, 'pickerColorLine', "picker right first onlyMainGui", { value: glo.lineColor, hAlign: 'center', w: glo.pickers_size, h: glo.pickers_size, pT: 5 }, true);
  picker4.onValueChangedObservable.add(function(value) {
      glo.lineColor = value;
      glo.ribbon.shaderMeshInstance.updateColors();
  });

  var picker5 = new BABYLON.GUI.ColorPicker();
  parmamControl(picker5, 'pickerColorButton', "picker right first onlyMainGui", { value: glo.lineColor, hAlign: 'center', w: glo.pickers_size, h: glo.pickers_size, pT: 5 }, true);
  picker5.onValueChangedObservable.add(function(value) {
    glo.allControls.haveThisClass('button').forEach(button => {
      button.background = rgbNormalizedToHex(value);
      if(value.r + value.g + value.b < 1.5){
        button.color = "white";
      }
      else{
        button.color = "black";
      }
    });
  });

  function add_button(panel, name, text, width, height, paddingTop, paddingLeft, paddingRight, eventLeft, eventRight){
    var button = BABYLON.GUI.Button.CreateSimpleButton(name, text);
    parmamControl(button, name, 'button right first onlyMainGui noAutoParam', {w: width, h: height, pL: paddingLeft, pR: paddingRight, pT: paddingTop}, true);
    designButton(button);
    button.onPointerUpObservable.add(function(event) {
      if (event.buttonIndex !== 2){ eventLeft(); }
      else{ eventRight(); }
    });
    panel.addControl(button);
  }

  add_button(panelButtons, "randomUIAllColorButton", "All", "25%", 30, 0, 0, 0, async function(){
      randomize_colors_app();
  }, function(){});

  add_button(panelButtons, "randomUILightColorButton", "Light", "25%", 30, 0, 10, 0, async function(){
      special_randomize_colors_app();
  }, function(){});

  add_button(panelButtons, "resetColorButton", "Reset", "25%", 30, 0, 10, 0, async function(){
      intiColorUI();
  }, function(){});

  panel1.addControl(picker);
  panel1.addControl(picker5);
  panel2.addControl(picker3);
  panel2.addControl(picker2);
  panel2.addControl(picker4);

  panelButtons.height = '70px';

  //glo.advancedTexture.addControl(panelHeader);
  //glo.advancedTexture.addControl(panelTitleUI);
  //glo.advancedTexture.addControl(panelTitleMesh);
  glo.advancedTexture.addControl(panel1);
  glo.advancedTexture.addControl(panel2);
  glo.advancedTexture.addControl(panelButtons);
  glo.advancedTexture.addControl(panelTitleUIBg);
  glo.advancedTexture.addControl(panelTitleUIButton);
  glo.advancedTexture.addControl(panelTitleMeshBg);
  glo.advancedTexture.addControl(panelTitleMeshDiffuse);
  glo.advancedTexture.addControl(panelTitleMeshLine);
  //glo.advancedTexture.addControl(panelTitleRandom);
}

function makePanelTitle(name, title, t, numUI = 'eighth', fontSize = 17){
  var panelTitle = new BABYLON.GUI.StackPanel();
  parmamControl(panelTitle, "panelTitle-" + name, 'panel right ' + numUI, {hAlign: 'right', vAlign: 'top', w: 20, h: 5, t: t});
  panelTitle.isVertical = false;

  var header = new BABYLON.GUI.TextBlock();
  header.text = title;
  header.color = "white";
  header.fontSize = fontSize;
  header.height = "20px";
  header.width = "100%";
  header.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
  parmamControl(header, "headerTitle-" + name, `header title right ${numUI} noAutoParam`);
  panelTitle.addControl(header);

  glo.advancedTexture.addControl(panelTitle);
}

function makePanelsTitles(paramsPanels){
  let panels = [];
  for(const prop in paramsPanels){
    for(const sprop in paramsPanels[prop]){
      const params = paramsPanels[prop][sprop];
      
      if(sprop === 'title' && params) makePanelTitle(params.name, params.text, params.top, params.numUI, params.fontSize);
      if(sprop === 'ctrl'  && params){
        panels.push(makePanelCtrl(params.name, params.top, params.paddingLeft, params.isVertical, params.height, params.numUI));
      }
    }
  }

  return panels;
}

function makePanelCtrl(name, t, pL, isVertical = false, h = 5, numUI = 'eighth'){
  var panelCtrl = new BABYLON.GUI.StackPanel();
  parmamControl(panelCtrl, 'panelCtrl-' + name, 'panel right ' + numUI, {hAlign: 'right', vAlign: 'top', w: 20, h: h, t: t, pL: pL});
  panelCtrl.isVertical = isVertical;
  glo.advancedTexture.addControl(panelCtrl);

  return panelCtrl;
}

function add_shaders_ctrl(){
  const paramsPanels = {
    shaders: {
      title: {name: "Shaders", text: "Shaders", top: 25.5, numUI: 'fourth noAutoParam'},
      ctrl: { name: "Shaders", top: 28.5, paddingLeft: 3.25, isVertical: false, height: 5, numUI: 'fourth noAutoParam'}
    },
    normEquation: {
      title: {name: "normalDeformation", text: "Normal Deformation", top: 75, numUI: 'fourth noAutoParam'},
      ctrl: false,
    },
    lighting: {
      title:{ name: "Lighting", text: "Lighting", top: 25.5, numUI: 'eighth', fontSize: 20},
      ctrl: { name: "Lighting", top: 31.5, paddingLeft: 9.25, isVertical: false, height: 5 }
    },
    light: {
      title: false,
      ctrl: { name: "LightSliders", top: 30, paddingLeft: 0.0, isVertical: true, height: 32 }
    },
    grid: {
      title:{ name: "GridParams", text: "Grid", top: 60.5, numUI: 'eighth', fontSize: 20},
      ctrl: { name: "gridParamsSliders", top: 64, paddingLeft: 0.0, isVertical: true, height: 5 }
    },
    video: {
      title: {name: "Video", text: "Video", top: 66, numUI: 'fourth noAutoParam' },
      ctrl: { name: "Video", top: 67, paddingLeft: 0.5, isVertical: false, height: 10, numUI: 'fourth noAutoParam' }
    },
  };

  let panels = makePanelsTitles(paramsPanels);

  let panelButtons, panel3Buttons, panelLight, panelGrid, panelVideo;

  [panelButtons, panel3Buttons, panelLight, panelGrid, panelVideo] = panels;

  function add_button(panel, name, text, width, height, paddingTop, paddingLeft, paddingRight, eventLeft, eventRight, numUI = 'eighth noAutoParam'){
    var button = BABYLON.GUI.Button.CreateSimpleButton(name, text);
    parmamControl(button, name, 'button right ' + numUI, {w: width, h: height, pL: paddingLeft, pR: paddingRight, pT: paddingTop}, true);
    designButton(button);
    button.onPointerUpObservable.add(function(event) {
      if (event.buttonIndex !== 2){ eventLeft(); }
      else if(eventRight){ eventRight(); }
    });
    panel.addControl(button);
  }

  add_button(panelButtons, "openShaderEditorButton", "Editor", "20%", 30, 0, 10, 0, async function(){
      glo.editorWindow.style.display = glo.editorWindow.style.display === 'none' ? 'flex' : 'none';
      if(glo.editorWindow.style.display === 'flex'){ openShaderWindow(); }
      //giveMaterialToMesh();
  }, false, 'fourth noAutoParam');
  /*add_button(panelButtons, "colorizeShaderEditorButton", "Color", "20%", 30, 0, 10, 0, async function(){
      glo.shaderMaterial = !glo.shaderMaterial;
      glo.shaderColor    = !glo.shaderColor;
      giveMaterialToMesh();
  }, false, 'fourth noAutoParam');*/
  add_button(panelButtons, "nextShaderEditorButton", "Next", "20%", 30, 0, 10, 0, function(){
      switchShader();
  }, function(){ switchShader(false); }, false, 'fourth noAutoParam');
  add_button(panelButtons, "invcolShaderEditorButton", "Inv", "20%", 30, 0, 10, 0, async function(){
      glo.shaders.params.invcol = !glo.shaders.params.invcol;
      glo.ribbon.shaderMeshInstance.shaderMaterial.setFloat("invcol", glo.shaders.params.invcol ? 1.0 : 0.0);
  }, false, 'fourth noAutoParam');
  add_button(panelButtons, "shaderLightButton", "💡", "20%", 30, 0, 10, 0, async function(){
      glo.shaders.params.islight = !glo.shaders.params.islight;
      glo.ribbon.shaderMeshInstance.shaderMaterial.setFloat("islight", glo.shaders.params.islight ? 1.0 : 0.0);
      //giveMaterialToMesh();
  }, false, 'fourth noAutoParam');
  add_button(panelVideo, "videoButton", "►", "13.75%", 30, 0, 0, 0, async function(){
      switchRecordingVideo();

      glo.allControls.getByName('videoButton').textBlock.text = glo.video.recording ? "⏹" : "►";

  }, false, 'fourth noAutoParam');

  function addSlider(parent, name, text, val, decimalPrecision, min, max, step, event, classes = 'header right eighth'){
    var header = new BABYLON.GUI.TextBlock();
    parmamControl(header, "header_" + name, classes + ' noAutoParam', { text: text + ": " + val, color: 'white', fontSize: 14, h: 20, pT: 4, }, true);
    parent.addControl(header);

    var slider = new BABYLON.GUI.Slider();
    var options = {minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 18.5, background: 'grey'};
    parmamControl(slider, name, 'slider right eighth', options, true);
    slider.startValue = val;

    slider.onValueChangedObservable.add(function(value) {
      if(!glo.rightButton){
        header.text = text + ": " + value.toFixed(decimalPrecision);
        event(value);
        glo.ribbon.shaderMeshInstance.updateLighting();
      }
      glo.rightButton = false;
    });
    slider.onPointerClickObservable.add(function (e) {
      if(e.buttonIndex == 2){
        glo.rightButton = true;
        header.text = text + ": " + slider.startValue;
        slider.value = slider.startValue;

        event(slider.value);
        glo.ribbon.shaderMeshInstance.updateLighting();
      }
    });

    slider.onPointerUpObservable.add(function (e) {
      
    });
    parent.addControl(slider);
  }

  function addHorizontalSlider(parent, name, text, val, decimalPrecision, min, max, step, event, upEvent = false) {
    // Créer un conteneur vertical pour ce slider
    var container = new BABYLON.GUI.StackPanel();
    container.isVertical = true;
    container.width  = "85%"; // Pour en mettre 2 côte à côte
    container.height = "50%";
    
    var header = new BABYLON.GUI.TextBlock();
    parmamControl(header, "header_" + name, 'header right fourth noAutoParam', { 
      text: text + ": " + val, 
      color: 'white', 
      fontSize: 14, 
      h: 20, 
      pR: 47.5 
    }, true);
    container.addControl(header);

    var slider = new BABYLON.GUI.Slider();
    var options = {
      minimum: min, 
      maximum: max, 
      value: val, 
      lastValue: val, 
      startValue: val, 
      step: step, 
      h: 18.5, 
      background: 'grey'
    };
    parmamControl(slider, name, 'slider right fourth', options, true);
    slider.startValue = val;

    slider.onValueChangedObservable.add(function(value) {
      if(!glo.rightButton){
        header.text = text + ": " + value.toFixed(decimalPrecision);
        event(value);
      }
      glo.rightButton = false;
    });
    
    slider.onPointerClickObservable.add(function (e) {
      if(e.buttonIndex == 2){
        glo.rightButton = true;
        header.text = text + ": " + slider.startValue;
        slider.value = slider.startValue;
        event(slider.value);
      }
    });

    if(upEvent){
      slider.onPointerUpObservable.add(function() {
        upEvent();
      });
    }

    container.addControl(slider);
    parent.addControl(container);
  }

  const lightInfos = glo.shaders.light;

  addSlider(panelLight, "lightIntensity", "Intensity", glo.shaders.light.intensity, 2, 0, 2, 0.01, async function(value){
    glo.shaders.light.intensity = value;
  }, 'header right eighth');
  addSlider(panelLight, "lightDirectionX", "Direction X", glo.shaders.light.direction.x, 2, -PI, PI, 0.01, async function(value){
    glo.shaders.light.direction.x = value;
  }, 'header right eighth');
  addSlider(panelLight, "lightDirectionY", "Direction Y", glo.shaders.light.direction.y, 2, -PI, PI, 0.01, async function(value){
    glo.shaders.light.direction.y = value;
  }, 'header right eighth');
  addSlider(panelLight, "lightDirectionZ", "Direction Z", glo.shaders.light.direction.z, 2, -PI, PI, 0.01, async function(value){
    glo.shaders.light.direction.z = value;
  });
  addSlider(panelLight, "lightRadius", "Radius", lightInfos.radius, 2, 0, 100, 0.01, async function(value){
    glo.shaders.light.radius = value;
  });
  addSlider(panelLight, "lightSpecularIntensity", "Specular intesity", lightInfos.specular.intensity, 2, 0, 4, 0.01, async function(value){
    glo.shaders.light.specular.intensity = value;
  });
  addSlider(panelLight, "lightSpecularPower", "Specular power", lightInfos.specular.power, 2, 0, 2, 0.01, async function(value){
    glo.shaders.light.specular.power = value;
  });
  addSlider(panelGrid, "gridScaleSlider", "Grid Scale", glo.params.gridScaleValue, 1, 0, 20, 1, async function(value){
    glo.params.gridScaleValue = value;
    showGrid(value, value, value, 1);
    //showAxis(value, 1);
  });

  addHorizontalSlider(panelVideo, "videoBoxRange", "Box range", glo.videoBoxRange, 2, 0, 2.375, 0.01, async function(value){
    glo.videoBoxRange = value;
    updateVideoCropBox();
  }, function(){ hideVideoCropBox(); });
}

function add_step_ABCD_sliders(){
  makePanelTitle('paramEquationsSliders', 'Mesh variables', 26, 'second noAutoParam', 20);

  var panel = new BABYLON.GUI.StackPanel();
  parmamControl(panel, 'paramEquationsSlidersPanel', 'panel right second', {hAlign: 'right', vAlign: 'top', w: 20, t: 30});
  glo.advancedTexture.addControl(panel);

  var panelShadersVariables = new BABYLON.GUI.StackPanel();
  parmamControl(panelShadersVariables, 'paramEquationsSlidersPanel', 'panel right third', {hAlign: 'right', vAlign: 'top', w: 20, t: 43.5, pL: 0.5});
  glo.advancedTexture.addControl(panelShadersVariables);

  function addSlider(parent, name, text, val, decimalPrecision, min, max, step, event, numUI = 'second'){
    var header = new BABYLON.GUI.TextBlock();
    parmamControl(header, "header_" + name, `header right ${numUI} noAutoParam`, { text: text + ": " + val, color: 'white', fontSize: 14, h: 22.5 }, true);
    parent.addControl(header);

    var slider = new BABYLON.GUI.Slider();
    var options = {minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 5, background: 'grey'};
    parmamControl(slider, name, `slider right ${numUI}`, options, true);

    slider.onValueChangedObservable.add(async function(value) {
      glo.sliderGain = value - slider.lastValue;
      glo.is_sliderGainPos = glo.sliderGain > 0 ? true: false;
      glo.sliderGainSign = glo.sliderGain > 0 ? 1: -1;
      event(value);
      header.text = text + ": " + value.toFixed(decimalPrecision);
      
      if(numUI !== 'third'){
        await remakeRibbon();
      }
      
      slider.lastValue = value;
    });
    slider.onPointerClickObservable.add(function (e) {
      if(e.buttonIndex == 2){ slider.value = slider.startValue; }
    });
   
    parent.addControl(slider);
  }

  addSlider(panel, "A", "A", 0, 1, -2*PI, 2*PI, 0.1, function(value){ glo.params.A = value; });
  addSlider(panel, "B", "B", 0, 1, -2*PI, 2*PI, 0.1, function(value){ glo.params.B = value; });
  addSlider(panel, "C", "C", 0, 1, -2*PI, 2*PI, 0.1, function(value){ glo.params.C = value; });
  addSlider(panel, "D", "D", 0, 1, -2*PI, 2*PI, 0.1, function(value){ glo.params.D = value; });
  addSlider(panel, "E", "E", 0, 2, -1, 1, 0.01, function(value){ glo.params.E = value; });
  addSlider(panel, "F", "F", 0, 2, -1, 1, 0.01, function(value){ glo.params.F = value; });
  addSlider(panel, "G", "G", 1, 1, -12, 12, 0.1, function(value){ glo.params.G = value; });
  addSlider(panel, "H", "H", 1, 1, -12, 12, 0.1, function(value){ glo.params.H = value; });
  addSlider(panel, "I", "I", 1, 1, -12, 12, 0.1, function(value){ glo.params.I = value; });
  addSlider(panel, "J", "J", 1, 1, -12, 12, 0.1, function(value){ glo.params.J = value; });
  addSlider(panel, "K", "K", 1, 1, -12, 12, 0.1, function(value){ glo.params.K = value; });
  addSlider(panel, "L", "L", 1, 0, -36, 36, 1, function(value){ glo.params.L = value; });
  addSlider(panel, "M", "M", 64, 0, -360, 360, 1, function(value){ glo.params.M = value; });
  addSlider(panelShadersVariables, "shadersVariables-A", "A", 64, 0, -360, 360, 1, function(value){ glo.shaders.uservars.A = value; 
    glo.ribbon.shaderMeshInstance.updateFloatParam("A", value);
  }, 'third');
  addSlider(panelShadersVariables, "shadersVariables-B", "B", 64, 0, -360, 360, 1, function(value){ glo.shaders.uservars.B = value; 
    glo.ribbon.shaderMeshInstance.updateFloatParam("B", value);
  }, 'third');
  addSlider(panelShadersVariables, "shadersVariables-C", "C", 12, 1, -36, 36, 0.1, function(value){ glo.shaders.uservars.C = value; 
    glo.ribbon.shaderMeshInstance.updateFloatParam("C", value);
  }, 'third');
  addSlider(panelShadersVariables, "shadersVariables-D", "D", 0, 2, -1, 1, 0.01, function(value){ glo.shaders.uservars.D = value; 
    glo.ribbon.shaderMeshInstance.updateFloatParam("D", value);
  }, 'third');
}

function add_symmetrize_sliders(){
  var panel          = new BABYLON.GUI.StackPanel();
  var panelButton    = new BABYLON.GUI.StackPanel();
  var panelCheckB    = new BABYLON.GUI.StackPanel();
  var panelScaleNorm = new BABYLON.GUI.StackPanel();
  parmamControl(panel, 'paramSymmetrizeSlidersPanel', 'panel right fourth noAutoParam', {hAlign: 'right', vAlign: 'top', w: 20, t: 37});
  parmamControl(panelButton, 'paramSymmetrizeSlidersPanelButton', 'panel right fourth noAutoParam', {isVertical: false, hAlign: 'right', vAlign: 'top', w: 19.25, t: 55, pR: 1});
  parmamControl(panelCheckB, 'paramSymmetrizeSlidersPanelChekB', 'panel right fourth noAutoParam', {hAlign: 'right', vAlign: 'top', h: 5, w: 20, t: 61.5, pR: 0.5});
  parmamControl(panelScaleNorm, 'paramSymmetrizeSlidersPanelScaleNorm', 'panel right fourth noAutoParam', {hAlign: 'right', vAlign: 'top', h: 5, w: 20, t: 78.5, pR: 0.5});

  glo.advancedTexture.addControl(panel);
  glo.advancedTexture.addControl(panelCheckB);
  glo.advancedTexture.addControl(panelScaleNorm);
  glo.advancedTexture.addControl(panelButton);

  const paramsPanels = {
    shaders: {
      title: {name: "SymmetrizePanelTitle", text: "Symmetrize", top: 34, numUI: 'fourth noAutoParam'},
    },
  };

  for(const prop in paramsPanels){
    for(const sprop in paramsPanels[prop]){
      const params = paramsPanels[prop][sprop];
      
      if(sprop === 'title' && params) makePanelTitle(params.name, params.text, params.top, params.numUI);
    }
  }

  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  const debouncedGiveMaterial = debounce(() => {
    giveMaterialToMesh();
  }, 16);

  function addSlider(parent, name, text, val, decimalPrecision, min, max, step, event, fontSize = 14, toShaders = false, specialClass = ''){
    var header = new BABYLON.GUI.TextBlock();
    parmamControl(header, "header_" + name, `header right fourth noAutoParam ${specialClass}`, { text: text + ": " + val, color: 'white', fontSize: fontSize, h: 20, pT: 4, }, true);
    //if(fontWeight){ header.fontWeight = fontWeight; }
    parent.addControl(header);

    var slider = new BABYLON.GUI.Slider();
    var options = {minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 18.5, background: 'grey'};
    parmamControl(slider, name, 'slider right fourth', options, true);
    slider.startValue = val;

    slider.onValueChangedObservable.add(async function(value) {
        header.text = text + ": " + value.toFixed(decimalPrecision);
        slider.lastValue = value;

        event(value);

        if(!toShaders){ 
          getPathsInfos();
          glo.justSymmetrized = true;
          await remakeRibbon();
        }
    });
    
    slider.onPointerClickObservable.add(function (e) {
      if(e.buttonIndex == 2){
        slider.value = slider.startValue;
      }
    });

    parent.addControl(slider);
  }

  function add_button(name, text, width, height, paddingTop, paddingLeft, paddingRight, eventLeft, eventRight){
    var button = BABYLON.GUI.Button.CreateSimpleButton(name, text);
    parmamControl(button, name, 'button right fourth noAutoParam', {w: width, h: height, pL: paddingLeft, pR: paddingRight, pT: paddingTop}, true);
    designButton(button);
    button.onPointerUpObservable.add(function(event) {
      if (event.buttonIndex !== 2){ eventLeft(); }
      else{ eventRight(); }
    });
    panelButton.addControl(button);
  }

  addSlider(panel, "symmetrizeX", "X", 1, 0, 1, 48, 1, function(value){ glo.params.symmetrizeX = value; });
  addSlider(panel, "symmetrizeY", "Y", 1, 0, 1, 48, 1, function(value){ glo.params.symmetrizeY = value; });
  addSlider(panel, "symmetrizeZ", "Z", 1, 0, 1, 48, 1, function(value){ glo.params.symmetrizeZ = value; });
  addSlider(panel, "symmetrizeAngle", "Angle", 3.14, 2, PI/16, 4*PI, PI/16, function(value){
    glo.params.symmetrizeAngle = value;
    if (glo.ribbon && glo.ribbon.shaderMeshInstance) {
      glo.ribbon.shaderMeshInstance.shaderMaterial.setFloat("uSymAngle", value);
    }
  }, 14, true);

  addSlider(panelCheckB, "checkerboard", "Checkerboard", 0, 0, 0, 24, 1, function(value){ glo.params.checkerboard = value; glo.exceptionCreate = true; }, 16, false, 'title');

  addSlider(panelScaleNorm, "scaleNorm", "Scale", 1, 2, -24, 24, 0.01, function(value){
    glo.scaleNorm = value;
    glo.ribbon.shaderMeshInstance.setDeformationScale(value);
  }, 14, true);

  add_button("centerLocal", "⊕ on origin", 100, 30, 0, 0, 0, function(){
    glo.params.centerIsLocal = !glo.params.centerIsLocal;
    glo.allControls.getByName('centerLocal').textBlock.text = glo.params.centerIsLocal ? "⊕ on mesh" : "⊕ on origin";
    remakeRibbon();
  });
  
  add_button("symmetrizeOrder", "S order : XYZ", 100, 30, 0, 10, 0, 
    function(value){ switchSymmetrizeOrder(true); }, function(value){ switchSymmetrizeOrder(false); });

    add_button("symmetrizeAdding", "S add : OUI", 100, 30, 0, 0, 0, function(value){
    glo.addSymmetry = !glo.addSymmetry;
    glo.allControls.getByName('symmetrizeAdding').textBlock.text = "S add : " + (glo.addSymmetry ? 'OUI' : 'NON');
    remakeRibbon();
  }, function(value){ });
}

function add_blender_sliders(){
  var panel = new BABYLON.GUI.StackPanel();
  parmamControl(panel, 'paramBlenderSlidersPanel', 'panel right seventh noAutoParam', {hAlign: 'right', vAlign: 'top', w: 20, t: 29.5, pR: 1, pL: 1});
  glo.advancedTexture.addControl(panel);

  makePanelTitle('BlenderPanelTitle', 'Blend', 25.5, 'seventh noAutoParam', 18);

  function addXYZSlider(parent, baseName, text, paramObject, val, decimalPrecision, min, max, step){
    // Container principal vertical pour tout le groupe
    var groupContainer = new BABYLON.GUI.StackPanel();
    groupContainer.isVertical = true;
    groupContainer.width = "100%";
    groupContainer.adaptHeightToChildren = true;
    parent.addControl(groupContainer);

    // Header en haut
    var header = new BABYLON.GUI.TextBlock();
    parmamControl(header, "header_" + baseName, 'header right seventh noAutoParam', { 
      text: text + ": " + val, 
      color: 'white', 
      fontSize: 14, 
      h: 20, 
      pT: 4 
    }, true);
    groupContainer.addControl(header);

    // Container horizontal pour checkboxes + slider
    var rowContainer = new BABYLON.GUI.StackPanel();
    rowContainer.isVertical = false;
    rowContainer.height = "20px";
    rowContainer.width = "100%";
    groupContainer.addControl(rowContainer);

    // État des axes
    var axisState = {
      x: { checked: true, value: val },
      y: { checked: false, value: val },
      z: { checked: false, value: val }
    };

    // Créer les checkboxes inline
    ['x', 'y', 'z'].forEach(function(axis){
      var checkbox = new BABYLON.GUI.Checkbox();
      checkbox.width = "16px";
      checkbox.height = "16px";
      checkbox.isChecked = axisState[axis].checked;
      checkbox.color = axis === 'x' ? '#ff6666' : axis === 'y' ? '#66ff66' : '#6666ff';
      checkbox.background = "#333";
      rowContainer.addControl(checkbox);

      var label = new BABYLON.GUI.TextBlock();
      label.text = axis.toUpperCase();
      label.width = "16px";
      label.height = "16px";
      label.color = checkbox.color;
      label.fontSize = 11;
      label.paddingRight = "4px";
      rowContainer.addControl(label);

      checkbox.onIsCheckedChangedObservable.add(function(checked){
        axisState[axis].checked = checked;
        updateSliderDisplay();
      });

      axisState[axis].checkbox = checkbox;
    });

    // Slider
    var slider = new BABYLON.GUI.Slider();
    var options = {minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 18.5, background: 'grey'};
    parmamControl(slider, baseName, 'slider right seventh', options, true);
    slider.startValue = val;
    slider.width = "75%";
    rowContainer.addControl(slider);

    function getCheckedAxes(){
      return ['x', 'y', 'z'].filter(axis => axisState[axis].checked);
    }

    function getDisplayValue(){
      var checked = getCheckedAxes();
      if(checked.length === 0) return val;
      return axisState[checked[0]].value;
    }

    function updateSliderDisplay(){
      var displayVal = getDisplayValue();
      slider.value = displayVal;
      header.text = text + ": " + displayVal.toFixed(decimalPrecision);
      
      var checked = getCheckedAxes();
      if(checked.length === 0){
        header.color = 'grey';
      } else if(checked.length === 1){
        header.color = checked[0] === 'x' ? '#ff6666' : checked[0] === 'y' ? '#66ff66' : '#6666ff';
      } else {
        header.color = 'white';
      }
    }

    function updateShaderUniforms(){
      if (glo.ribbon && glo.ribbon.material && glo.ribbon.material.setVector4) {
        //remakeRibbon();
        glo.ribbon.shaderMeshInstance.updateBlender()
      } else {
        remakeRibbon();
        //applyDeformationShader();
      }
    }

    slider.onValueChangedObservable.add(function(value) {
      if(glo.rightButton) return;
      
      var checked = getCheckedAxes();
      header.text = text + ": " + value.toFixed(decimalPrecision);
      
      checked.forEach(function(axis){
        axisState[axis].value = value;
        paramObject[axis] = value;
      });

      slider.lastValue = value;
      updateShaderUniforms();
    });

    slider.onPointerClickObservable.add(function (e) {
      if(e.buttonIndex == 2){
        glo.rightButton = true;
        var checked = getCheckedAxes();
        
        checked.forEach(function(axis){
          axisState[axis].value = slider.startValue;
          paramObject[axis] = slider.startValue;
        });
        
        slider.value = slider.startValue;
        header.text = text + ": " + slider.startValue.toFixed(decimalPrecision);
        
        updateShaderUniforms();
        glo.rightButton = false;
      }
    });

    updateSliderDisplay();
    
    return { header, slider, axisState };
  }

  // Sliders XYZ combinés pour U et O
  addXYZSlider(panel, "blenderU", "U", glo.params.blender.u, 0, 2, -12, 12, .01);
  addXYZSlider(panel, "blenderO", "O", glo.params.blender.O, 0, 2, -12, 12, .01);
}

function add_functionIt_sliders(){
  makePanelTitle('shadersVariablesPanelTitle', 'Shaders variables', 39, 'third noAutoParam', 18);
}

function add_sixth_panel_sliders(){
  let panelSliders                   = new BABYLON.GUI.StackPanel();
  let panelButtonSlidersUVOnOneSignU = new BABYLON.GUI.StackPanel();
  let panelButtonSlidersUVOnOneSignV = new BABYLON.GUI.StackPanel();
  let panelButtonInvFormulaCosSin    = new BABYLON.GUI.StackPanel();
  let panelButtonInvFormulaUV        = new BABYLON.GUI.StackPanel();
  let panelButtonInvPosXYZ           = new BABYLON.GUI.StackPanel();

  function addPanel(panel, name, top, isVertical = true, width = 20, height = undefined){
    parmamControl(panel, name, 'panel right sixth noAutoParam', {isVertical: isVertical, hAlign: 'right', vAlign: 'top', w: width, h: height, t: top, pR: 0.5});
    glo.advancedTexture.addControl(panel);
  }
  function createIncrementer(start, increment) {
    let count = start - increment;
    return function() {
      count += increment;
      return count;
    };
  }
  addPanel(panelSliders, 'panelSliders', 26);
  const posPanel = createIncrementer(65, 5);

  addPanel(panelButtonSlidersUVOnOneSignU, 'panelButtonSlidersUVOnOneSignU', posPanel());
  addPanel(panelButtonSlidersUVOnOneSignV, 'panelButtonSlidersUVOnOneSignV', posPanel());
  addPanel(panelButtonInvFormulaCosSin, 'panelButtonInvFormulaCosSin', posPanel());
  addPanel(panelButtonInvFormulaUV, 'panelButtonInvFormulaUV', posPanel());
  addPanel(panelButtonInvPosXYZ, 'panelButtonInvPosXYZ', posPanel(), false, 15, 4);

  function addSlider(parent, name, text, val, decimalPrecision, min, max, step, event){
    var header = new BABYLON.GUI.TextBlock();
    parmamControl(header, "header_" + name, 'header right sixth noAutoParam', { text: text + ": " + val, color: 'white', fontSize: 14, h: 20, pT: 4, }, true);
    parent.addControl(header);

    var slider = new BABYLON.GUI.Slider();
    var options = {minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 18.5, background: 'grey'};
    parmamControl(slider, name, 'slider right sixth', options, true);
    slider.startValue = val;

    slider.onValueChangedObservable.add(async function(value) {
        if(!name.includes('scaleNorm')){ header.text = text + ": " + value.toFixed(decimalPrecision); }
        else{
          if(value < 0){
            val = parseFloat(value.toFixed(decimalPrecision));
            val     = -(1 / (val - 1));
            val     = parseFloat(val.toFixed(decimalPrecision));
            header.text = text + ": " + val;
          }
          else{
            val = 1 + parseFloat(value.toFixed(decimalPrecision));
            header.text = text + ": " + val;
          }
          value = val;
        }

        slider.lastValue = value;

        event(value);

        if(!name.includes('firstPoint')){ remakeRibbon(); }
        else{
          glo.ribbon.shaderMeshInstance.shaderMaterial.setVector3("uFirstPoint", new BABYLON.Vector3(
            glo.firstPoint?.x || 1,
            glo.firstPoint?.y || 0,
            glo.firstPoint?.z || 0
          ));
        }
        
    });
    slider.onPointerClickObservable.add(function (e) {
      if(e.buttonIndex == 2){
        slider.value = slider.startValue;
        remakeRibbon();
      }
    });

    slider.onPointerUpObservable.add(function (e) {
      
    });
    parent.addControl(slider);
  }

  function addButton(panelButton, name, text, width, height, paddingLeft, paddingRight, eventLeft, eventRight){
    var button = BABYLON.GUI.Button.CreateSimpleButton(name, text);
    parmamControl(button, name, 'button left first', {w: width, h: height, pL: paddingLeft, pR: paddingRight}, true);
    designButton(button);
    button.onPointerUpObservable.add(function(event) {
      if (event.buttonIndex !== 2){ eventLeft(); }
      else{ eventRight(); }
    });
    panelButton.addControl(button);
  }

  addSlider(panelSliders, "checkerboardNbSteps", "Checkerboard nb steps", 2, 2, 1.1, 24, .1, function(value){ glo.params.checkerboardNbSteps = value; });
  addSlider(panelSliders, "firstPointOffsetX", "First point offset X", 1, 1, -24, 24, .5, function(value){ glo.firstPoint.x = value; });
  addSlider(panelSliders, "firstPointOffsetY", "First point offset Y", 0, 1, -24, 24, .5, function(value){ glo.firstPoint.y = value; });
  addSlider(panelSliders, "firstPointOffsetZ", "First point offset Z", 0, 1, -24, 24, .5, function(value){ glo.firstPoint.z = value; });

  const buttonSizes = {width: 215, height: 33};

  addButton(panelButtonSlidersUVOnOneSignU, "slidersUVOnOneSignU", "Slider U sign : OUI", buttonSizes.width, buttonSizes.height, 0, 0, function(value){
    glo.slidersUVOnOneSign.u = !glo.slidersUVOnOneSign.u;
    let slidersUVOnOneSignU  = glo.allControls.getByName('slidersUVOnOneSignU');

    slidersUVOnOneSignU.textBlock.text = "Slider U sign : " + (glo.slidersUVOnOneSign.u ? 'NON' : 'OUI');

    if(glo.slidersUVOnOneSign.u){
      slidersUVOnOneSignU.min = 0;
    }
    else{
      slidersUVOnOneSignU.min = -glo.params.u;
    }

    glo.allControls.getByName('uvSliderHeader-u').text = 'U : ' + (Math.round(100 * slidersUVOnOneSignU.min, 2) / 100) + ' - ' + (Math.round(100 * glo.params.u, 2) / 100);

    remakeRibbon();
  }, function(value){ });
  addButton(panelButtonSlidersUVOnOneSignV, "slidersUVOnOneSignV", "Slider V sign : OUI", buttonSizes.width, buttonSizes.height, 0, 0, function(value){
    glo.slidersUVOnOneSign.v = !glo.slidersUVOnOneSign.v;
    let slidersUVOnOneSignV  = glo.allControls.getByName('slidersUVOnOneSignV');

    slidersUVOnOneSignV.textBlock.text = "Slider V sign : " + (glo.slidersUVOnOneSign.v ? 'NON' : 'OUI');

    if(glo.slidersUVOnOneSign.v){
      slidersUVOnOneSignV.min = 0;
    }
    else{
      slidersUVOnOneSignV.min = -glo.params.v;
    }

    glo.allControls.getByName('uvSliderHeader-v').text = 'V : ' + (Math.round(100 * slidersUVOnOneSignV.min, 2) / 100) + ' - ' + (Math.round(100 * glo.params.v, 2) / 100);

    remakeRibbon();
  }, function(value){ });
  addButton(panelButtonInvFormulaCosSin, "InvFormulaCosSin", "Inv cos sin", buttonSizes.width, buttonSizes.height, 0, 0, function(value){
    invElemInInput("cos", "sin", false);
    invElemInInput("cu", "su", false);
    invElemInInput("cv", "sv");
    
  }, function(value){ });
  addButton(panelButtonInvFormulaUV, "InvFormulaUV", "Inv UV", buttonSizes.width, buttonSizes.height, 0, 0, async function(value){
    await invElemInInput("u", "v");
    

  }, function(value){ });
}

function add_eleventh_panel_sliders(){
  let panelButton2 = new BABYLON.GUI.StackPanel();
  let panelButton3 = new BABYLON.GUI.StackPanel();
  let panelButton4 = new BABYLON.GUI.StackPanel();
  let panelButton5 = new BABYLON.GUI.StackPanel();
  let panelButton6 = new BABYLON.GUI.StackPanel();

  function addPanel(panel, name, top, isVertical = true, width = 20, height = 5){
    parmamControl(panel, name, 'panel right eleventh noAutoParam', {isVertical: isVertical, hAlign: 'right', vAlign: 'top', w: width, h: height, t: top});
    glo.advancedTexture.addControl(panel);
  }
  function createIncrementer(start, increment) {
    let count = start - increment;
    return function() {
      count += increment;
      return count;
    };
  }

  const topPanels = 28;

  const posPanel = createIncrementer(topPanels, 5);

  addPanel(panelButton2, 'panelButtonEleventh2', posPanel(), false);
  addPanel(panelButton3, 'panelButtonEleventh3', posPanel(), false);
  addPanel(panelButton4, 'panelButtonEleventh4', posPanel(), false);
  addPanel(panelButton5, 'panelButtonEleventh5', posPanel(), false);
  addPanel(panelButton6, 'panelButtonEleventh6', posPanel(), false);

  function addButton(panelButton, name, text, width, height, paddingLeft, paddingRight, eventLeft, eventRight){
    var button = BABYLON.GUI.Button.CreateSimpleButton(name, text);
    parmamControl(button, name, 'button right eleventh', {w: width, h: height, pL: paddingLeft, pR: paddingRight}, true);
    designButton(button);
    button.onPointerUpObservable.add(function(event) {
      if (event.buttonIndex !== 2){ eventLeft(); }
      else{ eventRight(); }
    });
    panelButton.addControl(button);
  }

  const buttonSizes = {width: 120, height: 33};

  addButton(panelButton2, "uvToXyButton", "UV → XY", buttonSizes.width, buttonSizes.height, 25, 0, function(value){
    swapControlBackground("uvToXyButton");
    glo.params.uvToXy = !glo.params.uvToXy;
    uvToXy();
    remakeRibbon();
  }, function(value){ });
  addButton(panelButton2, "resetEquationsButton", "RESET", buttonSizes.width, buttonSizes.height, 25, 0, function(value){
    resetEquationsParamSliders();
  }, function(value){ });
  addButton(panelButton2, "switchWritingTypeButton", "Long W", buttonSizes.width, buttonSizes.height, 25, 0, function(value){
    swapControlBackground("switchWritingTypeButton");
    glo.switchWritingType = !glo.switchWritingType;
    switchWritingType(glo.switchWritingType);
  }, function(value){ });
  addButton(panelButton3, "uMoreOneButton", "U ++", 70, buttonSizes.height, 26, 0, function(value){
    slidersAnim('u', 0, 0.01);
  }, function(value){ });
  addButton(panelButton3, "uLessOneButton", "U --", 50, buttonSizes.height, 7, 0, function(value){
    slidersAnim('u', 0, -0.01);
  }, function(value){ });
  addButton(panelButton3, "vMoreOneButton", "V ++", 70, buttonSizes.height, 25, 0, function(value){
    slidersAnim('v', 0, 0.01);
  }, function(value){ });
  addButton(panelButton3, "vLessOneButton", "V --", 50, buttonSizes.height, 7, 0, function(value){
    slidersAnim('v', 0, -0.01);
  }, function(value){ });
  addButton(panelButton3, "updateRots", "Upd Rot", buttonSizes.width, buttonSizes.height, 25, 0, async function(){
    swapControlBackground("updateRots", glo.controlConfig.backgroundActived, glo.controlConfig.background);
    glo.params.updateRots = !glo.params.updateRots;
  }, function(value){ });
  addButton(panelButton4, "uMoreLittleOneButton", "U +", 70, buttonSizes.height, 26, 0, function(value){
    slidersAnim('u', 0, 0.001);
  }, function(value){ });
  addButton(panelButton4, "uLessLittleOneButton", "U -", 50, buttonSizes.height, 7, 0, function(value){
    slidersAnim('u', 0, -0.001);
  }, function(value){ });
  addButton(panelButton4, "vMoreLittleOneButton", "V +", 70, buttonSizes.height, 25, 0, function(value){
    slidersAnim('v', 0, 0.001);
  }, function(value){ });
  addButton(panelButton4, "vLessLittleOneButton", "V -", 50, buttonSizes.height, 7, 0, function(value){
    slidersAnim('v', 0, -0.001);
  }, function(value){ });
  addButton(panelButton4, "camToZeroButton", "View on ⊙", buttonSizes.width, buttonSizes.height, 25, 0, function(value){
    cameraOnPos({x: 0, y: 0, z: 0});
  }, function(value){ });
  addButton(panelButton6, "moveToMeshButton", "Cam +", buttonSizes.width, buttonSizes.height, 25, 0, function(value){
    glo.camera.radius/=1.125;
  }, function(value){ });
  addButton(panelButton6, "moveFromMeshButton", "Cam -", buttonSizes.width, buttonSizes.height, 25, 0, function(value){
    glo.camera.radius*=1.125;
  }, function(value){ });
  addButton(panelButton6, "resetViewButton", "Cam 0", buttonSizes.width, buttonSizes.height, 25, 0, function(value){
    viewOnAxis();
  }, function(value){ });
}

function add_transformation_sliders(){
  var panel = new BABYLON.GUI.StackPanel();
  parmamControl(panel, 'paramTransformationSlidersPanel', 'panel right seventh noAutoParam', {hAlign: 'right', vAlign: 'top', w: 20, t: 60, pR: 1, pL: 1});
  glo.advancedTexture.addControl(panel);

  makePanelTitle('TransformationPanelTitle', 'Transformations', 56.5, 'seventh noAutoParam');

  function addSlider(parent, name, text, val, decimalPrecision, min, max, step, event){
    var header = new BABYLON.GUI.TextBlock();
    parmamControl(header, "header_" + name, 'header right seventh noAutoParam', { text: text + ": " + val, color: 'white', fontSize: 14, h: 20, pT: 4, }, true);
    parent.addControl(header);

    var slider = new BABYLON.GUI.Slider();
    var options = {minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 18.5, background: 'grey'};
    parmamControl(slider, name, 'slider right seventh', options, true);
    slider.startValue = val;

    slider.onValueChangedObservable.add(function(value) {
      let val;
      if(!glo.rightButton){
        if(!name.includes('scaleVertex')){ header.text = text + ": " + value.toFixed(decimalPrecision); }
        else{
          if(value < 0){
            val = parseFloat(value.toFixed(decimalPrecision));
            val = -(1 / (val - 1));
            val = parseFloat(val.toFixed(decimalPrecision));
            header.text = text + ": " + val;
          }
          else{
            val = 1 + parseFloat(value.toFixed(decimalPrecision));
            header.text = text + ": " + val;
          }
        }
        slider.lastValue = value;

        glo.params[name] = value;
        if(!name.includes('scaleVertex')){ event(value); }
        else{ event(val); }
      }
      glo.rightButton = false;
    });
    
    slider.onPointerClickObservable.add(function (e) {
      if(e.buttonIndex == 2){
        glo.rightButton = true;
        header.text = text + ": " + slider.startValue;
        slider.value = slider.startValue;

        glo.params[name] = slider.startValue;
        event(slider.startValue);
      }
    });

    parent.addControl(slider);
    return { header, slider };
  }

  function addXYZSlider(parent, baseName, text, val, decimalPrecision, min, max, step, eventCallback){
    // Container principal vertical pour tout le groupe
    var groupContainer = new BABYLON.GUI.StackPanel();
    groupContainer.isVertical = true;
    groupContainer.width = "100%";
    groupContainer.adaptHeightToChildren = true;
    parent.addControl(groupContainer);

    // Header en haut
    var header = new BABYLON.GUI.TextBlock();
    parmamControl(header, "header_" + baseName, 'header right seventh noAutoParam', { 
      text: text + ": " + val, 
      color: 'white', 
      fontSize: 14, 
      h: 20, 
      pT: 4 
    }, true);
    groupContainer.addControl(header);

    // Container horizontal pour checkboxes + slider
    var rowContainer = new BABYLON.GUI.StackPanel();
    rowContainer.isVertical = false;
    rowContainer.height = "20px";
    rowContainer.width = "100%";
    groupContainer.addControl(rowContainer);

    // État des axes
    var axisState = {
      x: { checked: true, value: val },
      y: { checked: false, value: val },
      z: { checked: false, value: val }
    };

    // Créer les checkboxes inline
    ['x', 'y', 'z'].forEach(function(axis){
      var checkbox = new BABYLON.GUI.Checkbox();
      checkbox.width = "16px";
      checkbox.height = "16px";
      checkbox.isChecked = axisState[axis].checked;
      checkbox.color = axis === 'x' ? '#ff6666' : axis === 'y' ? '#66ff66' : '#6666ff';
      checkbox.background = "#333";
      rowContainer.addControl(checkbox);

      var label = new BABYLON.GUI.TextBlock();
      label.text = axis.toUpperCase();
      label.width = "16px";
      label.height = "16px";
      label.color = checkbox.color;
      label.fontSize = 11;
      label.paddingRight = "4px";
      rowContainer.addControl(label);

      checkbox.onIsCheckedChangedObservable.add(function(checked){
        axisState[axis].checked = checked;
        updateSliderDisplay();
      });

      axisState[axis].checkbox = checkbox;
    });

    // Slider (prend le reste de l'espace)
    var slider = new BABYLON.GUI.Slider();
    var options = {minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 18.5, background: 'grey'};
    parmamControl(slider, baseName, 'slider right seventh', options, true);
    slider.startValue = val;
    slider.width = "100%"; // Prendra l'espace restant dans le StackPanel horizontal
    rowContainer.addControl(slider);

    function getCheckedAxes(){
      return ['x', 'y', 'z'].filter(axis => axisState[axis].checked);
    }

    function getDisplayValue(){
      var checked = getCheckedAxes();
      if(checked.length === 0) return val;
      return axisState[checked[0]].value;
    }

    function updateSliderDisplay(){
      var displayVal = getDisplayValue();
      slider.value = displayVal;
      header.text = text + ": " + displayVal.toFixed(decimalPrecision);
      
      var checked = getCheckedAxes();
      if(checked.length === 0){
        header.color = 'grey';
      } else if(checked.length === 1){
        header.color = checked[0] === 'x' ? '#ff6666' : checked[0] === 'y' ? '#66ff66' : '#6666ff';
      } else {
        header.color = 'white';
      }
    }

    slider.onValueChangedObservable.add(function(value) {
      if(glo.rightButton) return;
      
      var checked = getCheckedAxes();
      header.text = text + ": " + value.toFixed(decimalPrecision);
      
      checked.forEach(function(axis){
        axisState[axis].value = value;
        glo.params[baseName + axis.toUpperCase()] = value;
      });

      slider.lastValue = value;
      eventCallback(value, checked);
    });

    slider.onPointerClickObservable.add(function (e) {
      if(e.buttonIndex == 2){
        glo.rightButton = true;
        var checked = getCheckedAxes();
        
        checked.forEach(function(axis){
          axisState[axis].value = slider.startValue;
          glo.params[baseName + axis.toUpperCase()] = slider.startValue;
        });
        
        slider.value = slider.startValue;
        header.text = text + ": " + slider.startValue.toFixed(decimalPrecision);
        
        eventCallback(slider.startValue, checked);
        glo.rightButton = false;
      }
    });

    ['x', 'y', 'z'].forEach(function(axis){
      glo.params[baseName + axis.toUpperCase()] = val;
    });

    updateSliderDisplay();
    
    return { header, slider, axisState };
  }

  // Sliders XYZ combinés
  addXYZSlider(panel, "scaling", "Scaling", 1, 2, 0, 24, .1, function(value, axes){ 
    axes.forEach(function(axis){
      transformMesh('scaling', axis, value);
    });
    //applyTransformations();
  });
  
  addXYZSlider(panel, "rotation", "Rotation", 0, 3, -2*PI, 2*PI, PI/180, function(value, axes){ 
    axes.forEach(function(axis){
      transformMesh('rotation', axis, value);
    });
  });
  
  addXYZSlider(panel, "position", "Position", 0, 2, -24, 24, .01, function(value, axes){ 
    axes.forEach(function(axis){
      transformMesh('position', axis, value);
    });
  });
  
  addXYZSlider(panel, "cSymmetry", "Center Symmetry", 0, 1, -24, 24, .1, function(value, axes){
    axes.forEach(function(axis){
      glo.centerSymmetry[axis] = value;
    });
    if (glo.ribbon && glo.ribbon.shaderMeshInstance) {
      glo.ribbon.shaderMeshInstance.updateSymmetryCenter();
    }
  });
}

function add_ninethPanel_controls(){
  var panel = new BABYLON.GUI.StackPanel();
  parmamControl(panel, 'ninethPanelPanel', 'panel right seventh noAutoParam', {hAlign: 'right', vAlign: 'top', w: 20, t: 42.5, pR: 1, pL: 1});
  glo.advancedTexture.addControl(panel);
  var panelButton = new BABYLON.GUI.StackPanel();
  parmamControl(panelButton, 'thirdPanelButton', 'panel right eleventh noAutoParam', {isVertical: false, hAlign: 'right', vAlign: 'top', w: 20, h: 7, t: 52, pL: 0.775});
  glo.advancedTexture.addControl(panelButton);

  makePanelTitle("waveTitlePanel", "Waves", 39, "seventh noAutoParam", 17);
  

  function addSlider(parent, name, text, val, decimalPrecision, min, max, step, event){
    var header = new BABYLON.GUI.TextBlock();
    parmamControl(header, "header_" + name, 'header right seventh noAutoParam', { text: text + ": " + val, color: 'white', fontSize: 14, h: 20, pT: 4, }, true);
    parent.addControl(header);

    var slider = new BABYLON.GUI.Slider();
    var options = {minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 18.5, background: 'grey'};
    parmamControl(slider, name, 'slider right seventh', options, true);
    slider.startValue = val;

    slider.onValueChangedObservable.add(function(value) {
      if(!glo.rightButton){
        header.text = text + ": " + value.toFixed(decimalPrecision);
        event(value);
      }
      glo.rightButton = false;
    });
    slider.onPointerClickObservable.add(function (e) {
      if(e.buttonIndex == 2){
        glo.rightButton = true;
        header.text = text + ": " + slider.startValue;
        slider.value = slider.startValue;
        event(slider.value);
      }
    });

    parent.addControl(slider);
    return { header, slider };
  }

  // Slider combiné XYZ avec slider secondaire lié (n)
  function addLinkedXYZSliders(parent, baseName, textMain, textSecondary, valMain, valSecondary, decimalPrecision, minMain, maxMain, stepMain, minSecondary, maxSecondary, stepSecondary, getMainValue, setMainValue, getSecondaryValue, setSecondaryValue){
    // Container principal
    var groupContainer = new BABYLON.GUI.StackPanel();
    groupContainer.isVertical = true;
    groupContainer.width = "100%";
    groupContainer.adaptHeightToChildren = true;
    parent.addControl(groupContainer);

    // État des axes
    var axisState = {
      x: { checked: true },
      y: { checked: false },
      z: { checked: false }
    };

    var currentAxis = 'x';

    // === SLIDER PRINCIPAL ===
    var headerMain = new BABYLON.GUI.TextBlock();
    parmamControl(headerMain, "header_" + baseName, 'header right seventh noAutoParam', { 
      text: textMain + " X: " + valMain, 
      color: '#ff6666', 
      fontSize: 14, 
      h: 20, 
      pT: 4 
    }, true);
    groupContainer.addControl(headerMain);

    // Row pour checkboxes + slider principal
    var rowMain = new BABYLON.GUI.StackPanel();
    rowMain.isVertical = false;
    rowMain.height = "20px";
    rowMain.width = "100%";
    groupContainer.addControl(rowMain);

    // Container pour les checkboxes avec largeur fixe
    var checkboxContainer = new BABYLON.GUI.StackPanel();
    checkboxContainer.isVertical = false;
    checkboxContainer.width = "96px";
    checkboxContainer.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    rowMain.addControl(checkboxContainer);

    // Checkboxes
    ['x', 'y', 'z'].forEach(function(axis){
      var checkbox = new BABYLON.GUI.Checkbox();
      checkbox.width = "16px";
      checkbox.height = "16px";
      checkbox.isChecked = axisState[axis].checked;
      checkbox.color = axis === 'x' ? '#ff6666' : axis === 'y' ? '#66ff66' : '#6666ff';
      checkbox.background = "#333";
      checkboxContainer.addControl(checkbox);

      var label = new BABYLON.GUI.TextBlock();
      label.text = axis.toUpperCase();
      label.width = "16px";
      label.height = "16px";
      label.color = checkbox.color;
      label.fontSize = 11;
      label.paddingRight = "4px";
      checkboxContainer.addControl(label);

      checkbox.onIsCheckedChangedObservable.add(function(checked){
        axisState[axis].checked = checked;
        
        if(checked){
          currentAxis = axis;
        } else {
          var checkedAxes = getCheckedAxes();
          if(checkedAxes.length > 0){
            currentAxis = checkedAxes[0];
          }
        }
        
        updateDisplay();
      });

      axisState[axis].checkbox = checkbox;
    });

    // Slider principal
    var sliderMain = new BABYLON.GUI.Slider();
    parmamControl(sliderMain, baseName + "Main", 'slider right seventh', {
      minimum: minMain, maximum: maxMain, value: valMain, step: stepMain, h: 18.5, background: 'grey'
    }, true);
    sliderMain.startValue = valMain;
    sliderMain.width = "72.5%";  // Pourcentage du container parent
    sliderMain.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    sliderMain.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    rowMain.addControl(sliderMain);

    // === SLIDER SECONDAIRE (n) ===
    var headerSecondary = new BABYLON.GUI.TextBlock();
    parmamControl(headerSecondary, "header_" + baseName + "n", 'header right seventh noAutoParam', { 
      text: textSecondary + " X: " + valSecondary, 
      color: '#ff6666', 
      fontSize: 14, 
      h: 20, 
      pT: 4 
    }, true);
    groupContainer.addControl(headerSecondary);

    var sliderSecondary = new BABYLON.GUI.Slider();
    parmamControl(sliderSecondary, baseName + "Secondary", 'slider right seventh', {
      minimum: minSecondary, maximum: maxSecondary, value: valSecondary, step: stepSecondary, h: 18.5, background: 'grey'
    }, true);
    sliderSecondary.startValue = valSecondary;
    groupContainer.addControl(sliderSecondary);

    // === FONCTIONS UTILITAIRES ===
    function getCheckedAxes(){
      return ['x', 'y', 'z'].filter(axis => axisState[axis].checked);
    }

    function getAxisColor(axis){
      return axis === 'x' ? '#ff6666' : axis === 'y' ? '#66ff66' : '#6666ff';
    }

    function updateDisplay(){
      var checked = getCheckedAxes();
      
      if(checked.length === 0){
        headerMain.color = 'grey';
        headerSecondary.color = 'grey';
        return;
      }

      if(checked.length === 1){
        headerMain.color = getAxisColor(checked[0]);
        headerSecondary.color = getAxisColor(checked[0]);
      } else {
        headerMain.color = 'white';
        headerSecondary.color = 'white';
      }

      var mainVal = getMainValue(currentAxis);
      var secVal = getSecondaryValue(currentAxis);

      sliderMain.value = mainVal;
      sliderSecondary.value = secVal;

      var axisLabel = checked.length === 1 ? " " + currentAxis.toUpperCase() : "";
      headerMain.text = textMain + axisLabel + ": " + mainVal.toFixed(decimalPrecision);
      headerSecondary.text = textSecondary + axisLabel + ": " + secVal.toFixed(decimalPrecision);
    }

    // === ÉVÉNEMENTS SLIDER PRINCIPAL ===
    sliderMain.onValueChangedObservable.add(function(value) {
      if(glo.rightButton) return;
      
      var checked = getCheckedAxes();
      var axisLabel = checked.length === 1 ? " " + currentAxis.toUpperCase() : "";
      headerMain.text = textMain + axisLabel + ": " + value.toFixed(decimalPrecision);
      
      checked.forEach(function(axis){
        setMainValue(axis, value);
      });
    });

    sliderMain.onPointerClickObservable.add(function (e) {
      if(e.buttonIndex == 2){
        glo.rightButton = true;
        var checked = getCheckedAxes();

        checked.forEach(function(axis){
          setMainValue(axis, sliderMain.startValue);
        });

        sliderMain.value = sliderMain.startValue;
        var axisLabel = checked.length === 1 ? " " + currentAxis.toUpperCase() : "";
        headerMain.text = textMain + axisLabel + ": " + sliderMain.startValue.toFixed(decimalPrecision);

        glo.rightButton = false;
      }
    });

    // === ÉVÉNEMENTS SLIDER SECONDAIRE ===
    sliderSecondary.onValueChangedObservable.add(function(value) {
      if(glo.rightButton) return;
      
      var checked = getCheckedAxes();
      var axisLabel = checked.length === 1 ? " " + currentAxis.toUpperCase() : "";
      headerSecondary.text = textSecondary + axisLabel + ": " + value.toFixed(decimalPrecision);
      
      checked.forEach(function(axis){
        setSecondaryValue(axis, value);
      });
    });

    sliderSecondary.onPointerClickObservable.add(function (e) {
      if(e.buttonIndex == 2){
        glo.rightButton = true;
        var checked = getCheckedAxes();

        checked.forEach(function(axis){
          setSecondaryValue(axis, sliderSecondary.startValue);
        });

        sliderSecondary.value = sliderSecondary.startValue;
        var axisLabel = checked.length === 1 ? " " + currentAxis.toUpperCase() : "";
        headerSecondary.text = textSecondary + axisLabel + ": " + sliderSecondary.startValue.toFixed(decimalPrecision);

        glo.rightButton = false;
      }
    });

    updateDisplay();
    
    return { headerMain, sliderMain, headerSecondary, sliderSecondary, axisState };
  }

  // Slider combiné Norm (valeur + coefficient n)
  addLinkedXYZSliders(
    panel, 
    "norm", 
    "Norm",      // Label slider principal
    "n",         // Label slider secondaire
    0.0,         // Valeur initiale principale
    1.0,         // Valeur initiale secondaire
    1,           // Précision décimale
    -40, 40, .1, // Min, max, step principal
    -8, 8, .1,   // Min, max, step secondaire
    // Getters
    function(axis){ return glo.params.functionIt.norm[axis]; },
    function(axis, value){
      glo.params.functionIt.norm[axis] = value;
      if(glo.ribbon && glo.ribbon.shaderMeshInstance) glo.ribbon.shaderMeshInstance.setNormUniform("normVal" + axis.toUpperCase(), value);
    },
    function(axis){ return glo.params.functionIt.norm['n' + axis]; },
    function(axis, value){
      glo.params.functionIt.norm['n' + axis] = value;
      if(glo.ribbon && glo.ribbon.shaderMeshInstance) glo.ribbon.shaderMeshInstance.setNormUniform("normCoeff" + axis.toUpperCase(), value);
    }
  );

  addSlider(panel, "invPtsPowCoeff", "Inv Pts", 1.00, 2, 0, 8, .01, function(value){ glo.params.invPtsPowCoeff = value; remakeRibbon(); });
}

function param_buttons(){
  glo.allControls.haveThisClass('button').haveNotThisClass('noAutoParam').map(bt => { designButton(bt); });
}
function param_controls(){
  glo.allControls.haveTheseClasses('header').haveNotThisClass('noAutoParam').map(hd => {
    parmamControl(hd, '', '', { h: 20, color: 'white', fontSize: 16, }, true, false);
  });
  var pr_top = 1.5;
  glo.allControls.haveTheseClasses('panel', 'right', 'first').haveNotThisClass('noAutoParam').map(pr => {
    parmamControl(pr, '', '', { hAlign: 'right', vAlign: 'top', w: 20, t: pr_top, }, false, false);
    pr_top += glo.mainTopShift;
  });
  glo.allControls.haveTheseClasses('slider', 'right', 'first').map(sr => {
    parmamControl(sr, '', '', { hAlign: 'right', vAlign: 'top', h: 20, background: 'grey', }, true, false);
    sr.paddingRight = '1%';
  });
  pr_top = 1.5;
  glo.allControls.haveTheseClasses('panel', 'left', 'first').haveNotThisClass('noAutoParam').map(pr => {
    parmamControl(pr, '', '', { hAlign: 'left', vAlign: 'top', w: 20, t: pr_top, pL: 1, }, false, false);
    if(pr.name && (pr.name == "param" || pr.name == "type")){ pr.width = '10%'; }
    if(pr.name === "inputsEquations"){ pr.top = "20%"; }
    pr_top += glo.mainTopShift;
  });
  glo.allControls.haveTheseClasses('slider', 'left', 'first').map(sr => {
    parmamControl(sr, '', '', { hAlign: 'left', vAlign: 'top', h: 20, background: 'grey', }, true, false);
    sr.paddingLeft = '1%';
  });
  glo.allControls.haveTheseClasses('input', 'left', 'first').map(inp => {
    parmamControl(inp, '', '', { hAlign: 'left', vAlign: 'top', h: 22.5, background: 'grey', }, true, false);
    inp.paddingLeft = '1%';
  });
  glo.allControls.haveTheseClasses('panel', 'right', 'fourth').haveNotThisClass('noAutoParam').map(pr => {
    parmamControl(pr, '', '', { hAlign: 'right', vAlign: 'top', t: 33, }, false, false);
    if(pr.name && (pr.name == "param" || pr.name == "type")){ pr.width = '10%'; }
  });
  glo.allControls.haveTheseClasses('input', 'right', 'fourth').map(inp => {
    parmamControl(inp, '', '', { hAlign: 'right', vAlign: 'top', h: 22.5, background: 'grey', }, true, false);
  });
  glo.allControls.haveThisClass('slider').map(slider => { slider.subscribeToKeyEventsOnHover(); });
  glo.allControls.haveThisClass('input').map(input => { input.subscribeToFocusAndBlurEvents(); });
}

function toggle_gui_controls(state){
  glo.allControls.haveTheseClasses('first').map(ct => {
    if(ct.name != "but_hide" && ct.name != "hideSwitchHelp"){ ct.isVisible = state; ct.isEnabled = state; }
  });
}
function toggle_gui_controls_for_switch(state){
  glo.allControls.haveTheseClasses('panel', 'onlyMainGui').map(pn => { pn.isVisible = state; pn.isEnabled = state; });
  glo.allControls.haveTheseClasses('header', 'onlyMainGui').map(hd => { hd.isVisible = state; hd.isEnabled = state; });
  glo.allControls.haveTheseClasses('picker', 'onlyMainGui').map(pr => { pr.isVisible = state; pr.isEnabled = state; });
}
function toggle_gui_controls_suit(state){
  glo.allControls.haveThisClass('second').map(ct => { ct.isVisible = state; ct.isEnabled = state; });
}
function toggle_gui_controls_third(state){
  glo.allControls.haveThisClass('third').map(ct => { ct.isVisible = state; ct.isEnabled = state; });
}
function toggleGuiControlsByClass(state, theClass){
  glo.allControls.haveThisClass(theClass).map(ct => { ct.isVisible = state; ct.isEnabled = state; });
}