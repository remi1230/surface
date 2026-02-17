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

BABYLON.GUI.Slider.prototype.subscribeToDoubleClick = function () {
    var lastClick = 0;
    var valueBeforeFirstClick = null;
    var firstClickAbove = null;
    var DELAY = 300;

    this.onPointerDownObservable.add(function (info) {
        var now = Date.now();
        // Déterminer si on clique au-dessus ou en-dessous du curseur
        var clickAbove = this.isVertical
            ? (info.y < this._currentMeasure.top + this._currentMeasure.height * (1 - (this.value - this.minimum) / (this.maximum - this.minimum)))
            : (info.x > this._currentMeasure.left + this._currentMeasure.width * ((this.value - this.minimum) / (this.maximum - this.minimum)));

        if (now - lastClick < DELAY && valueBeforeFirstClick !== null) {
            if (firstClickAbove) {
                this.maximum *= 2;
                this.value = valueBeforeFirstClick * 2;
            } else {
                this.value = valueBeforeFirstClick / 2;
                this.maximum /= 2;
            }
            lastClick = 0;
            valueBeforeFirstClick = null;
            firstClickAbove = null;
        } else {
            valueBeforeFirstClick = this.value;
            firstClickAbove = clickAbove;
            lastClick = now;
        }
    }.bind(this));
};

function add_gui_controls(){
  glo.advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, glo.scene);
  glo.advancedTexture.useSmallestIdeal = false;

  add_switch_and_help_buttons();
  add_axis_and_rot_buttons();
  add_uv_sliders();
  add_inputs_equations();
  add_lines_and_dim_buttons();

  add_radios();

  add_step_uv_slider();
  add_switchForm_buttons();
  add_views_buttons();

  add_color_pickers();
  add_shaders_ctrl();

  add_step_ABCD_sliders();
  add_symmetrize_sliders();
  add_blender_sliders();
  add_transformation_sliders();
  add_sixth_panel_sliders();
  add_ninethPanel_controls();
  add_eleventh_panel_sliders();

  guiControls_AddIdentificationFunctions();

  param_controls();
  param_buttons();
}

function guiControls_AddIdentificationFunctions(){
  glo.allControls = glo.advancedTexture.getDescendants();
  // Cache Map for O(1) lookup by name instead of O(n) linear search
  glo._controlsByName = new Map();
  glo.allControls.forEach(elem => {
    if(typeof(elem) != 'undefined' && typeof(elem.name) != 'undefined' && elem.name){
      glo._controlsByName.set(elem.name, elem);
    }
  });
  function getByName(name){
    // Use cached Map if available (for glo.allControls), otherwise linear search
    if(this === glo.allControls && glo._controlsByName.has(name)){
      return glo._controlsByName.get(name);
    }
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

function addButton(numUI, panel, name, text, width, height, paddingLeft, paddingRight, eventLeft, eventRight = eventLeft, side = 'right'){
    var button = BABYLON.GUI.Button.CreateSimpleButton(name, text);
    parmamControl(button, name, `button ${side} ${numUI}`, {w: width, h: height, pL: paddingLeft, pR: paddingRight}, true);
    designButton(button);
    button.onPointerUpObservable.add(function(event) {
      if (event.buttonIndex !== 2){ if(typeof eventLeft === 'function'){eventLeft();} }
      else if(typeof eventRight === 'function'){ eventRight(); }
    });
    panel.addControl(button);
  }

function add_switch_and_help_buttons(){
  var panel = new BABYLON.GUI.StackPanel();
  var options = { isVertical: false, hAlign: 'right', vAlign: 'bottom', w: 20, l: 3, t: -1, };
  parmamControl(panel, 'hideSwitchHelp', 'panel right first noAutoParam', options);
  panel.height = "80px";
  glo.advancedTexture.addControl(panel);

  addButton("first", panel, "but_hide", "HIDE", glo.buttonBottomSize, glo.buttonBottomHeight, glo.buttonBottomPaddingLeft, 0, function(){
    glo.allControls.getByName('but_hide').textBlock.text = glo.gui_suit_visible ? "HIDE" : "SHOW";

    toggle_gui_controls(glo.gui_suit_visible);
    toggleRightPanels(glo.guiSelect, glo.gui_suit_visible);

    glo.gui_suit_visible = !glo.gui_suit_visible;
  });
  addButton("first", panel, "but_switch", "SWITCH", glo.buttonBottomSize, glo.buttonBottomHeight, glo.buttonBottomPaddingLeft, 0,
             function(){ switchRightPanel(true); }, function(){ switchRightPanel(false); } );

  addButton("first", panel, "but_help", "HELP", glo.buttonBottomSize, glo.buttonBottomHeight, glo.buttonBottomPaddingLeft, 0, function(){
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
  var options = {isVertical: false, hAlign: 'right', vAlign: 'top', w: 15, h: 5, t: 19.5, pL: -2.5 };
  parmamControl(panel, 'axisAndRotButton', 'panel right first noAutoParam', options);
  panel.isVertical = false;
  glo.advancedTexture.addControl(panel);

  addButton("first", panel, "but_axis", "AXIS", 70, 30, 10, 0, function(){
    glo.axis_visible = !glo.axis_visible;
    if(glo.first_axis_visible){ showAxis(glo.axis_size, 1); glo.first_axis_visible = false; }
    else{
      switch_axis();
    }
  });

  function switchRotateTypeText(rotType = glo.rotateType.current){
    switch(rotType){
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
        glo.allControls.getByName("but_rot").textBlock.text = "ROT";
      break;
    }
  }

  addButton("first", panel, "but_rot", "ROT", 70, 30, 10, 0, function(){
    genInTwoWays(glo.rotType, 'rotateType', true);
    switchRotateTypeText();
    glo.meshChannel.postMessage({ action: 'setRotateType', rotType: glo.rotateType });
  }, function(){
    genInTwoWays(glo.rotType, 'rotateType', false);
    switchRotateTypeText();
    glo.meshChannel.postMessage({ action: 'setRotateType', rotType: glo.rotateType });
  });

  var button1 = BABYLON.GUI.Button.CreateSimpleButton("but_screen", "↗ S");
  parmamControl(button1, 'fullScreenButton', 'button right first', {h: 30, pL: 10}, true);
  button1.width = 0.2;
  button1.onPointerUpObservable.add(async function() {
      if (!document.fullscreenElement) {
          document.getElementById('univers_div').requestFullscreen();
      } else {
          document.exitFullscreen();
      }
  });

  // Écouter le changement de fullscreen pour resync le GUI
  document.addEventListener('fullscreenchange', () => {
      glo.fullScreen = !!document.fullscreenElement;
      button1.textBlock.text = glo.fullScreen ? "↘ S" : "↗ S";

      setTimeout(() => {
        if (!glo.fullScreen) {
            // Après sortie du fullscreen, clientHeight peut encore reporter
            // les dimensions plein écran. Forcer via style inline pour garantir
            // que engine.resize() lise les bonnes dimensions.
            var canvas = glo.engine.getRenderingCanvas();
            canvas.style.width = window.innerWidth + 'px';
            canvas.style.height = window.innerHeight + 'px';
            glo.engine.resize();
            canvas.style.width = '100%';
            canvas.style.height = '100%';
        } else {
            glo.engine.resize();
        }
      }, 150);
  });

  panel.addControl(button1);
  glo.fullScreenButton = button1;

  addButton("first", panel, "but_resolution", `Rx${glo.resolutionCoeff}`, 70, 30, 10, 0, function(){
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
  var top_panel = -3.42;

  var panel = new BABYLON.GUI.StackPanel();
  var options = {isVertical: false, hAlign: 'left', w: 20, h: 5, t: top_panel, pL: 1.75};
  parmamControl(panel, 'lineDim', 'panel left first noAutoParam', options);
  glo.advancedTexture.addControl(panel);

  addButton("first", panel, "but_grid", "GRID", 60, 30, 0, 0, async function(){
    glo.grid_visible = !glo.grid_visible;
    glo.axis_visible = glo.grid_visible;

    if(!glo.grid_visible){ switch_grid(); return; }

    showAxis(glo.axis_size, 1);
    glo.first_axis_visible = false;
    const gridScale = glo.params.gridScaleValue;
    showGrid(gridScale, gridScale, gridScale, 1); glo.first_grid_visible = false;
  }, undefined, 'left');
  addButton("first", panel, "but_plan", "PLAN", 60, 30, 10, 0, function(){
    glo.planes_visible = !glo.planes_visible;
    make_planes();
  }, undefined, 'left');
  addButton("first", panel, "but_coord", "CART", 70, 30, 10, 0, function(){switchCoords();}, function(){switchCoords(false);});
  addButton("first", panel, "but_import_obj", "IMP", 60, 30, 10, 0, function(){
    importOBJMesh();
  }, undefined, 'left');
  addButton("first", panel, "but_dimension", "EXP", 60, 30, 10, 0, function(){
    exportModal();
  }, undefined, 'left');
}
function add_switchForm_buttons(){
  var panel = new BABYLON.GUI.StackPanel();
  var options = {isVertical: false, hAlign: 'left', vAlign: 'bottom', w: 20, l: 6.33, t: -1, };
  parmamControl(panel, 'panelswitchFormButton', 'panel right left noAutoParam', options);
  panel.height = '80px';
  glo.advancedTexture.addControl(panel);

  function switchRadios(down = true){
    glo.formesSuit = down;
    add_radios(true);
    paramRadios();
  }
  

  addButton("first", panel, "but_goBack", "<", 60, 30, 10, 0, function(){switchRadios(false);}, undefined, 'left');
  addButton("first", panel, "but_goTo", ">", 60, 30, 10, 0, function(){switchRadios(true)}, undefined, 'left');
}

function add_views_buttons(){
  var panel = new BABYLON.GUI.StackPanel();
  var options = {isVertical: false, hAlign: 'right', vAlign: 'top', w: 20, h: 5, t: 14.5, pL: 5.5  };
  parmamControl(panel, 'viewsButtonsPanel', 'panel right first noAutoParam', options);
  glo.advancedTexture.addControl(panel);

  function changeButtonsTexts(...texts){
    var namesButtons = ["but_viewX", "but_viewY", "but_viewZ"];
    var n = 0;
    texts.map(text => {
      glo.allControls.getByName(namesButtons[n]).textBlock.text = text;
      n++;
    });
  }

  addButton("first", panel, "but_viewX", "X", 52.5, 30, 0, 0, function(){
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
  addButton("first", panel, "but_viewY", "Y", 60, 30, 10, 0, function(){
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
  addButton("first", panel, "but_viewZ", "Z", 60, 30, 10, 0, function(){
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
    parmamControl(panel, "panel_" + name, 'panel left first', {left: -20});
    glo.advancedTexture.addControl(panel);

    var min_start = -glo['params'][gloPropToModify].toFixed(2);
    var max_start = glo['params'][gloPropToModify].toFixed(2);
    var header = new BABYLON.GUI.TextBlock();
    parmamControl(header, 'uvSliderHeader-' + name, 'header left first', {text: headerText + " : " + min_start + " — " + max_start});
    panel.addControl(header);

    var slider = new BABYLON.GUI.Slider();
    parmamControl(slider, name, 'slider left first', {w: 105, minimum: 0, maximum: 6*PI, value: glo['params'][gloPropToModify], startValue: glo['params'][gloPropToModify]});
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
      if(!glo.skipRebuild){ await remakeRibbon(); }

      header.text = headerText + " : " + min + " — " + max;
    });
    slider.onPointerClickObservable.add(function (e) {
      if(e.buttonIndex == 2){ slider.value = slider.startValue; }
    });
    slider.onWheelObservable.add(function (e) {
      var val = e.y < 0 ? val = PI/8 : val = -PI/8; slider.value += val;
    });

    panel.addControl(slider);
  }

  add_slider('u', 'U', 'u', 'slider_u');
  add_slider('v', 'V', 'v', 'slider_v');
}

function add_inputs_equations(){
  var panel                = new BABYLON.GUI.StackPanel();
  var panelSymsEquations   = new BABYLON.GUI.StackPanel();
  let panelEvalY           = new BABYLON.GUI.StackPanel();

  parmamControl(panel, "inputsEquations", 'panel left first noAutoParam', {hAlign: 'left', vAlign: 'top', w: 20, pR: 1, t: 14.25, h: 30, pL: 0.5});

  var options = {hAlign: 'right', vAlign: 'top', w: 20, t: 30};
  parmamControl(panelEvalY, "panelEvalY", 'panel right sixth noAutoParam', options);
  options = {hAlign: 'right', vAlign: 'top', w: 24, t: 83, pR: 1};
  parmamControl(panelSymsEquations, "panelSymsEquations", 'panel right fourth noAutoParam', options);

  makePanelTitle("macrosVariables", "Macros variables", 25.5, "sixth noAutoParam");

  glo.advancedTexture.addControl(panel);
  glo.advancedTexture.addControl(panelSymsEquations);
  glo.advancedTexture.addControl(panelEvalY);

  glo.text_input_alpha = "";
  glo.text_input_beta  = "";

  var indexInInputsEquations = 0;

  function add_input(parent, textHeader, textField, name, classNameHeader, classNameInput, gloPropToModify, gloPropToAssignInput, withEvent = true, width = 365){
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
          glo['params'][gloPropToModify] = text;
          if(event){
            inputChangeEvent();
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
        if(!glo.normalMode){ glo['params'][gloPropToModify] = text; }
        else{ glo['params']['normale'][gloPropToModify] = text; }
        
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
  add_input(panel, "Rot X", "", "inputTheta", "header left first", "input equation left first", "text_input_theta", "input_theta");
  add_input(panel, "Rot Y", "", "inputBeta", "header left first", "input equation left first", "text_input_beta", "input_beta");
  add_input(panel, "Rot Z", "", "inputAlpha", "header left first", "input equation left first", "text_input_alpha", "input_alpha");

  add_input(panelSymsEquations, "Equation", "", "inputRSymmetrize", "header right fourth noAutoParam", "input equation right fourth", "text_input_sym_r", "input_sym_r", false, 354);

  add_input(panelEvalY, "X", "u", "inputEvalX", "header right sixth", "input equation right sixth", "text_input_eval_x", "input_eval_x");
  add_input(panelEvalY, "Y", "v", "inputEvalY", "header right sixth", "input equation right sixth", "text_input_eval_y", "input_eval_y");

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
          glo.ribbon.shaderMeshInstance.updateDeformationExpression();
      }
  });

  glo.input_sym_r.onTextPasteObservable.add(async () => {
      glo.params.text_input_sym_r = glo.input_sym_r.text;

      glo.ribbon.shaderMeshInstance.updateDeformationExpression();
  });
}

function add_radios(suit = false){
  var topShift = 0;
  var topShiftLineDim = 0;
  glo.formes.select.map( forme => {
    if(forme.typeCoords == glo.coordsType){ topShift+=glo.shiftRadios; topShiftLineDim+=glo.shiftLineDim; }
  });
  var top_panel = 51;

  if(glo.first_radio){
    var panel = new BABYLON.GUI.StackPanel();
    panel.onWheelObservable.add(async function(event){
      glo.whellSwitchFormDown = event.y > 0 ? true : false;
      await whellSwitchForm();
    });
    var options = {hAlign: 'left', vAlign: 'top', w: 9.5, t: top_panel, pL: 0, l:7.5};
    parmamControl(panel, 'panelRadios', 'panel right first noAutoParam', options);
    glo.advancedTexture.addControl(panel);
    var header = new BABYLON.GUI.TextBlock();
    parmamControl(header, "header_forms", 'title header left first', {text: "Forms :", pR: 50});
    panel.addControl(header);//panel.background='red';
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

    // Ajout du gestionnaire pour les clics gauche et droit
    button.onPointerClickObservable.add(async function(e) {
      // Gestion du clic gauche (buttonIndex 0 correspond au clic gauche)
      if (e.buttonIndex === 0) {

        await glo.formes.setFormeSelect(text, glo.coordsType);

        // button.onPointerClickObservable.remove(this);
      }
    });



    var header = BABYLON.GUI.Control.AddHeader(button, text, "200px", { isHorizontal: true, controlFirst: true });
    parmamControl(header, "headerRadio-" + text, 'header radio left first noAutoParam', {h: 20, pT: 4}, true);
    header.paddingLeft = "16%";
    for(const prop in glo.theme.radio.text){ header[prop] = glo.theme.radio.text[prop]; }

    var textBlock = header.children[1];
    textBlock.fontFamily = "Manrope";
    textBlock.fontWeight = 300;
    textBlock.fontSize = "14px";

    glo.radios_formes.push({button: button, header: header});

    parent.addControl(header);
  }

  if(!glo.first_radio){
    var panel = glo.allControls.getByName('panelRadios');
    glo.allControls.getByName('panelRadios').top = top_panel + '%';
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
      if(!glo.skipRebuild){ await remakeRibbon(); }

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
  var panel1         = new BABYLON.GUI.StackPanel();
  var panel2         = new BABYLON.GUI.StackPanel();
  var panelButtons   = new BABYLON.GUI.StackPanel();

  var panelTitleUIBg        = new BABYLON.GUI.StackPanel();
  var panelTitleUIButton    = new BABYLON.GUI.StackPanel();
  var panelTitleMeshBg      = new BABYLON.GUI.StackPanel();
  var panelTitleMeshLine    = new BABYLON.GUI.StackPanel();

  var top     = {panel1: 34, panel2: 55, panel3: 60, panelButtons: 73};
  var options = {hAlign: 'right', vAlign: 'top', w: 20, h:15, t: top.panel1, pL: 2, isVertical: false};

  const paramsPanels = {
    section: {
      title: {name: "colorHeaderPan", text: "Colors", top: 25.5, numUI: 'first onlyMainGui noAutoParam', titleLevel: 1},
    },
    ui: {
      title: {name: "colorHeaderTitleUI", text: "UI", top: 29.5, numUI: 'first onlyMainGui noAutoParam', fontSize: 18},
    },
    mesh: {
      title: {name: "colorHeaderTitleMesh", text: "Mesh", top: 50.5, numUI: 'first onlyMainGui noAutoParam', fontSize: 18},
    },
    random: {
      title: {name: "colorHeaderTitleRandom", text: "Random", top: 70.5, numUI: 'first onlyMainGui noAutoParam', fontSize: 18},
    },
  };

  makePanelsTitles(paramsPanels);
  
  const hTest = 2;
  parmamControl(panelTitleUIBg, 'colorTitleUIBg', 'panel right first noAutoParam onlyMainGui', {hAlign: 'right', vAlign: 'top', w: 20, h: hTest, t: 34, pL: 4.666, isVertical: false});
  parmamControl(panelTitleUIButton, 'colorTitleUIButton', 'panel right first noAutoParam onlyMainGui', {hAlign: 'right', vAlign: 'top', w: 20, h: hTest, t: 34, pL: 11.25, isVertical: false});
  parmamControl(panelTitleMeshBg, 'colorTitleMeshBg', 'panel right first noAutoParam onlyMainGui', {hAlign: 'right', vAlign: 'top', w: 20, h: hTest, t: 55, pL: 4.666, isVertical: false});
  parmamControl(panelTitleMeshLine, 'colorTitleMeshLine', 'panel right first noAutoParam onlyMainGui', {hAlign: 'right', vAlign: 'top', w: 20, h: hTest, t: 55, pL: 11.5, isVertical: false});

  options.pL = 4.5;
  parmamControl(panel1, 'pickerColorPan1', 'panel right first noAutoParam onlyMainGui', options);
  options.t = top.panel2;
  parmamControl(panel2, 'pickerColorPan2', 'panel right first noAutoParam onlyMainGui', options);
  options.t = top.panel3;
  
  options.t = top.panelButtons; options.pL = 3.666;
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

  optionsHeader.fontSize = 16;
  var headerUIBg = new BABYLON.GUI.TextBlock();
  paramHeader(panelTitleUIBg, headerUIBg, "Background", optionsHeader);

  var headerUIButton = new BABYLON.GUI.TextBlock();
  paramHeader(panelTitleUIButton, headerUIButton, "Button", optionsHeader);

  var headerMeshBg = new BABYLON.GUI.TextBlock();
  paramHeader(panelTitleMeshBg, headerMeshBg, "Background", optionsHeader);

  var headerMeshLine = new BABYLON.GUI.TextBlock();
  paramHeader(panelTitleMeshLine, headerMeshLine, "Lines", optionsHeader);


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

    glo.planes.map(plane => { plane.material.emissiveColor = glo.backgroundColor.inv(); });
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

  addButton("first onlyMainGui noAutoParam", panelButtons, "randomUIAllColorButton", "All", "25%", 30, 0, 0, async function(){
      randomize_colors_app();
  });

  addButton("first onlyMainGui noAutoParam", panelButtons, "randomUILightColorButton", "Light", "25%", 30, 10, 0, async function(){
      special_randomize_colors_app();
  });

  addButton("first onlyMainGui noAutoParam", panelButtons, "resetColorButton", "Reset", "25%", 30, 10, 0, async function(){
      intiColorUI();
      styleUI(0);
  });

  panel1.addControl(picker);
  panel1.addControl(picker5);
  panel2.addControl(picker3);
  panel2.addControl(picker4);

  panelButtons.height = '70px';

  glo.advancedTexture.addControl(panel1);
  glo.advancedTexture.addControl(panel2);
  glo.advancedTexture.addControl(panelButtons);
  glo.advancedTexture.addControl(panelTitleUIBg);
  glo.advancedTexture.addControl(panelTitleUIButton);
  glo.advancedTexture.addControl(panelTitleMeshBg);
  glo.advancedTexture.addControl(panelTitleMeshLine);
}

function makePanelTitle(name, title, t, numUI = 'eighth', titleLevel = 2){
  var panelTitle = new BABYLON.GUI.StackPanel();
  parmamControl(panelTitle, "panelTitle-" + name, 'panel right ' + numUI, {hAlign: 'right', vAlign: 'top', w: 20, h: 5, t: t});
  panelTitle.isVertical = false;

  titleLevels = ['22px', '20px', '17px', '16px'];

  var header = new BABYLON.GUI.TextBlock();
  header.text = title;
  header.color = "white";
  header.fontSize = titleLevels[titleLevel];
  header.height = "20px";
  header.width = "100%";
  header.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
  parmamControl(header, "headerTitle-" + name, `title header right ${numUI} noAutoParam`);
  panelTitle.addControl(header);

  glo.advancedTexture.addControl(panelTitle);
}

function makePanelsTitles(paramsPanels){
  let panels = [];
  for(const prop in paramsPanels){
    for(const sprop in paramsPanels[prop]){
      const params = paramsPanels[prop][sprop];
      
      if(sprop === 'title' && params) makePanelTitle(params.name, params.text, params.top, params.numUI, params.titleLevel);
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

function addSlider(parent, name, text, val, decimalPrecision, min, max, step, event, numUI = 'eighth', classes = 'right', eventUp = false, fontSize = 14){
  var header = new BABYLON.GUI.TextBlock();
  parmamControl(header, "header_" + name,  `header ${classes} ${numUI} noAutoParam`, { text: text + ": " + val, fontSize: fontSize, h: 20, pT: 4, }, true);
  parent.addControl(header);

  var slider = new BABYLON.GUI.Slider();
  var options = {minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 18.5, background: 'grey'};
  parmamControl(slider, name, `slider ${classes} ${numUI}`, options, true);
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

  if(eventUp){
    slider.onPointerUpObservable.add(function (e) {
      eventUp(e);
    });
  }

  slider.subscribeToDoubleClick();

  parent.addControl(slider);
}

function add_shaders_ctrl(){
  const paramsPanels = {
    shaders: {
      title: {name: "Shaders", text: "Shaders", top: 25.5, numUI: 'fourth noAutoParam'},
      ctrl: { name: "Shaders", top: 28.5, paddingLeft: 1.75, isVertical: false, height: 5, numUI: 'fourth noAutoParam'}
    },
    normEquation: {
      title: {name: "normalDeformation", text: "Normal Deformation", top: 75, numUI: 'fourth noAutoParam'},
      ctrl: false,
    },
    lighting: {
      title:{ name: "Lighting", text: "Lighting", top: 25.5, numUI: 'seventh'},
      ctrl: { name: "Lighting", top: 31.5, numUI: 'seventh', paddingLeft: 9.25, isVertical: false, height: 5 }
    },
    light: {
      title: false,
      ctrl: { name: "LightSliders", top: 29.5, numUI: 'seventh', paddingLeft: 0.0, isVertical: true, height: 32 }
    },
    grid: {
      title:{ name: "GridParams", text: "Grid", top: 64, numUI: 'sixth', numUI: 'sixth noAutoParam'},
      ctrl: { name: "gridParamsSliders", top: 67.5, paddingLeft: 0.0, isVertical: true, height: 5, numUI: 'sixth noAutoParam' }
    },
    video: {
      title: {name: "Video", text: "Video", top: 66, numUI: 'fourth noAutoParam' },
      ctrl: { name: "Video", top: 67, paddingLeft: 0.5, isVertical: false, height: 10, numUI: 'fourth noAutoParam' }
    },
  };

  let panels = makePanelsTitles(paramsPanels);

  makePanelTitle('shadersVariablesPanelTitle', 'Shaders variables', 62, 'seventh noAutoParam title');

  let panelButtons, panel3Buttons, panelLight, panelGrid, panelVideo;

  [panelButtons, panel3Buttons, panelLight, panelGrid, panelVideo] = panels;

  addButton("fourth noAutoParam", panelButtons, "openShaderEditorButton", "Color", "17.5%", 30, 10, 0, async function(){
      glo.editorWindow.style.display = glo.editorWindow.style.display === 'none' ? 'flex' : 'none';
      if(glo.editorWindow.style.display === 'flex'){ openShaderWindow(); }
  });
  addButton("fourth noAutoParam", panelButtons, "openNormalEditorButton", "Norm", "17.5%", 30, 10, 0, async function(){
      glo.editorWindowNormal.style.display = glo.editorWindowNormal.style.display === 'none' ? 'flex' : 'none';
      if(glo.editorWindowNormal.style.display === 'flex'){
          normalShader = normalShaderHeader + normalShaders[glo.numNormalShaderSelect] + normalShaderFooter;
          openShaderWindow(glo, 'editorNormal', glo.editorWindowNormal, normalShader, getById('editor-Normal-container'), 'compileBtnNormal', document.getElementById('editorStatusNormal'));
      }
  });
  addButton("fourth noAutoParam", panelButtons, "nextShaderEditorButton", "Next", "17.5%", 30, 10, 0, function(){
      switchShader();
  }, function(){ switchShader(false); });
  addButton("fourth noAutoParam", panelButtons, "invcolShaderEditorButton", "Inv", "17.5%", 30, 10, 0, async function(){
      glo.shaders.params.invcol = !glo.shaders.params.invcol;
      swapControlBackground("invcolShaderEditorButton");
      glo.ribbon.shaderMeshInstance.shaderMaterial.setFloat("invcol", glo.shaders.params.invcol ? 1.0 : 0.0);
  });
  addButton("fourth noAutoParam", panelButtons, "shaderLightButton", "💡", "17.5%", 30, 10, 0, async function(){
      glo.shaders.params.islight = !glo.shaders.params.islight;
      glo.ribbon.shaderMeshInstance.shaderMaterial.setFloat("islight", glo.shaders.params.islight ? 1.0 : 0.0);
  }, false, 'fourth noAutoParam');
  addButton("fourth noAutoParam", panelVideo, "videoButton", "►", "13.75%", 30, 0, 0, async function(){
      switchRecordingVideo();

      glo.allControls.getByName('videoButton').textBlock.text = glo.video.recording ? "⏹" : "►";

  });

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
  const dirRange   = 5;

  addSlider(panelLight, "lightIntensity", "Intensity", glo.shaders.light.intensity, 2, 0, dirRange, 0.01, async function(value){
    glo.shaders.light.intensity = value; glo.ribbon.shaderMeshInstance.updateLighting();
  }, 'seventh');
  addSlider(panelLight, "lightDirectionX", "Direction X", glo.shaders.light.direction.x, 2, -dirRange, dirRange, 0.01, async function(value){
    glo.shaders.light.direction.x = value; glo.ribbon.shaderMeshInstance.updateLighting();
  }, 'seventh');
  addSlider(panelLight, "lightDirectionY", "Direction Y", glo.shaders.light.direction.y, 2, -dirRange, dirRange, 0.01, async function(value){
    glo.shaders.light.direction.y = value; glo.ribbon.shaderMeshInstance.updateLighting();
  }, 'seventh');
  addSlider(panelLight, "lightDirectionZ", "Direction Z", glo.shaders.light.direction.z, 2, -dirRange, dirRange, 0.01, async function(value){
    glo.shaders.light.direction.z = value; glo.ribbon.shaderMeshInstance.updateLighting();
  }, 'seventh');
  addSlider(panelLight, "lightRadius", "Radius", lightInfos.radius, 2, 0, 100, 0.01, async function(value){
    glo.shaders.light.radius = value; glo.ribbon.shaderMeshInstance.updateLighting();
  }, 'seventh');
  addSlider(panelLight, "lightSpecularIntensity", "Specular intesity", lightInfos.specular.intensity, 2, 0, 4, 0.01, async function(value){
    glo.shaders.light.specular.intensity = value; glo.ribbon.shaderMeshInstance.updateLighting();
  }, 'seventh');
  addSlider(panelLight, "lightSpecularPower", "Specular power", lightInfos.specular.power, 2, 0, 2, 0.01, async function(value){
    glo.shaders.light.specular.power = value; glo.ribbon.shaderMeshInstance.updateLighting();
  }, 'seventh');
  addSlider(panelGrid, "gridScaleSlider", "Scale", glo.params.gridScaleValue, 1, 0, 20, 1, async function(value){
    glo.params.gridScaleValue = value;
    glo.planSize  = value;
    glo.axis_size = value;

    glo.grid_visible = true;
    glo.axis_visible = true;
    glo.first_axis_visible = false;

    showAxis(glo.axis_size, 1);

    glo.planes_visible = true;
    make_planes();

    showGrid(value, value, value, 1);
  }, 'sixth');

  addHorizontalSlider(panelVideo, "videoBoxRange", "Box range", glo.videoBoxRange, 2, 0, 2.375, 0.01, async function(value){
    glo.videoBoxRange = value;
    updateVideoCropBox();
  }, function(){ hideVideoCropBox(); });
}

function add_step_ABCD_sliders(){
  makePanelTitle('paramEquationsSliders', 'Mesh variables', 26, 'second noAutoParam title');

  var panel = new BABYLON.GUI.StackPanel();
  parmamControl(panel, 'paramEquationsSlidersPanel', 'panel right second', {hAlign: 'right', vAlign: 'top', w: 20, t: 30});
  glo.advancedTexture.addControl(panel);

  var panelShadersVariables = new BABYLON.GUI.StackPanel();
  parmamControl(panelShadersVariables, 'paramEquationsSlidersPanel', 'panel right seventh', {hAlign: 'right', vAlign: 'top', w: 20, t: 66, pL: 0.5});
  glo.advancedTexture.addControl(panelShadersVariables);

  const updFloatParam       = (param, val) => { glo.ribbon.shaderMeshInstance.updateFloatParam(param, val); }
  const updFloatABCDParam   = (param, val) => { glo.params[param] = val; updFloatParam(param, val); }
  const updFloatShaderParam = (param, val) => { glo.shaders.uservars[param] = val; updFloatParam(param, val); }

  addSlider(panel, "sliderMeshVar-A", "A", 0, 1, -2*PI, 2*PI, 0.1, function(value){ updFloatABCDParam("A", value) }, 'second');
  addSlider(panel, "sliderMeshVar-B", "B", 0, 1, -2*PI, 2*PI, 0.1, function(value){ updFloatABCDParam("B", value) }, 'second');
  addSlider(panel, "sliderMeshVar-C", "C", 0, 1, -2*PI, 2*PI, 0.1, function(value){ updFloatABCDParam("C", value) }, 'second');
  addSlider(panel, "sliderMeshVar-D", "D", 0, 1, -2*PI, 2*PI, 0.1, function(value){ updFloatABCDParam("D", value) }, 'second');
  addSlider(panel, "sliderMeshVar-E", "E", 0, 2, -1, 1, 0.01, function(value){ updFloatABCDParam("E", value) }, 'second');
  addSlider(panel, "sliderMeshVar-F", "F", 0, 2, -1, 1, 0.01, function(value){ updFloatABCDParam("F", value) }, 'second');
  addSlider(panel, "sliderMeshVar-G", "G", 1, 1, -12, 12, 0.1, function(value){ updFloatABCDParam("G", value) }, 'second');
  addSlider(panel, "sliderMeshVar-H", "H", 1, 1, -12, 12, 0.1, function(value){ updFloatABCDParam("H", value) }, 'second');
  addSlider(panel, "sliderMeshVar-I", "I", 1, 1, -12, 12, 0.1, function(value){ updFloatABCDParam("I", value) }, 'second');
  addSlider(panel, "sliderMeshVar-J", "J", 1, 1, -12, 12, 0.1, function(value){ updFloatABCDParam("J", value) }, 'second');
  addSlider(panel, "sliderMeshVar-K", "K", 1, 1, -12, 12, 0.1, function(value){ updFloatABCDParam("K", value) }, 'second');
  addSlider(panel, "sliderMeshVar-L", "L", 1, 0, -36, 36, 1, function(value){ updFloatABCDParam("L", value) }, 'second');
  addSlider(panel, "sliderMeshVar-M", "M", 64, 0, -360, 360, 1, function(value){ updFloatABCDParam("M", value) }, 'second');
  addSlider(panelShadersVariables, "shadersVariables-P", "P", 64, 0, -360, 360, 1, function(value){ updFloatShaderParam("P", value) }, 'seventh');
  addSlider(panelShadersVariables, "shadersVariables-Q", "Q", 64, 0, -360, 360, 1, function(value){ updFloatShaderParam("Q", value) }, 'seventh');
  addSlider(panelShadersVariables, "shadersVariables-S", "S", 12, 1, -36, 36, 0.1, function(value){ updFloatShaderParam("S", value) }, 'seventh');
  addSlider(panelShadersVariables, "shadersVariables-T", "T", 0, 2, -1, 1, 0.01, function(value){ updFloatShaderParam("T", value) }, 'seventh');
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

  async function remakeRibbonBeforeSymm(){
    getPathsInfos();
    glo.justSymmetrized = true;
    await remakeRibbon();
  }

  addSlider(panel, "symmetrizeX", "X", 1, 0, 1, 48, 1, function(value){ glo.params.symmetrizeX = value; remakeRibbonBeforeSymm(); }, 'fourth');
  addSlider(panel, "symmetrizeY", "Y", 1, 0, 1, 48, 1, function(value){ glo.params.symmetrizeY = value; remakeRibbonBeforeSymm(); }, 'fourth');
  addSlider(panel, "symmetrizeZ", "Z", 1, 0, 1, 48, 1, function(value){ glo.params.symmetrizeZ = value; remakeRibbonBeforeSymm(); }, 'fourth');
  addSlider(panel, "symmetrizeAngle", "Angle", 3.14, 2, PI/16, 4*PI, PI/16, function(value){
    glo.params.symmetrizeAngle = value;
    if (glo.ribbon && glo.ribbon.shaderMeshInstance) {
      glo.ribbon.shaderMeshInstance.shaderMaterial.setFloat("uSymAngle", value);
    }
  }, 'fourth');

  addSlider(panelCheckB, "checkerboard", "Checkerboard", 0, 0, 0, 24, 1, function(value){ glo.params.checkerboard = value; glo.exceptionCreate = true; remakeRibbonBeforeSymm(); }, 'fourth title', 'right', false, 17);

  addSlider(panelScaleNorm, "scaleNorm", "Scale", 1, 2, -24, 24, 0.01, function(value){
    glo.scaleNorm = value;
    glo.ribbon.shaderMeshInstance.setDeformationScale(value);
  }, 'fourth');
   
  addButton("fourth noAutoParam", panelButton, "symmetrizeOrder", "S order : XYZ", 127, 30, 10, 0, 
    function(value){ switchSymmetrizeOrder(true); }, function(value){ switchSymmetrizeOrder(false); });

  addButton("fourth noAutoParam", panelButton,"symmetrizeAdding", "S ADD", 127, 30, 10, 0, function(value){
    glo.addSymmetry = !glo.addSymmetry;
    glo.allControls.getByName('symmetrizeAdding').textBlock.text = "S " + (glo.addSymmetry ? 'ADD' : 'MUL');
    remakeRibbon();
  });
}

function add_blender_sliders(){
  var panel = new BABYLON.GUI.StackPanel();
  parmamControl(panel, 'paramBlenderSlidersPanel', 'panel right eighth noAutoParam', {hAlign: 'right', vAlign: 'top', w: 20, t: 29.5, pR: 1, pL: 1});
  glo.advancedTexture.addControl(panel);

  makePanelTitle('BlenderPanelTitle', 'Blend', 25.5, 'eighth noAutoParam');

  function addXYZSlider(parent, baseName, text, paramObject, val, decimalPrecision, min, max, step){
    // Container principal vertical pour tout le groupe
    var groupContainer = new BABYLON.GUI.StackPanel();
    groupContainer.isVertical = true;
    groupContainer.width = "100%";
    groupContainer.adaptHeightToChildren = true;
    parent.addControl(groupContainer);

    // Header en haut
    var header = new BABYLON.GUI.TextBlock();
    parmamControl(header, "header_" + baseName, 'header right eighth noAutoParam', { 
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
    parmamControl(slider, baseName, 'slider right eighth', options, true);
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
        glo.ribbon.shaderMeshInstance.updateBlender()
      } else {
        remakeRibbon();
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

function add_sixth_panel_sliders(){
  let panelSliders                   = new BABYLON.GUI.StackPanel();
  let panelButton                    = new BABYLON.GUI.StackPanel();
  let panelButtonSlidersUVOnOneSignU = new BABYLON.GUI.StackPanel();
  let panelButtonSlidersUVOnOneSignV = new BABYLON.GUI.StackPanel();
  let panelTimeButtons               = new BABYLON.GUI.StackPanel();

  function addPanel(panel, name, top, isVertical = true, width = 20, height = undefined, numUI = 'sixth', paddingLeft = 0){
    parmamControl(panel, name, `panel right ${numUI} noAutoParam`, {isVertical: isVertical, hAlign: 'right', vAlign: 'top', w: width, h: height, t: top, pR: 0.5, pL: paddingLeft});
    glo.advancedTexture.addControl(panel);
  }
  function createIncrementer(start, increment) {
    let count = start - increment;
    return function() {
      count += increment;
      return count;
    };
  }
  addPanel(panelButton, 'panelButtonUvToXy', 41);
  addPanel(panelSliders, 'panelSliders', 50);
  const posPanel = createIncrementer(55, 5);

  addPanel(panelButtonSlidersUVOnOneSignU, 'panelButtonSlidersUVOnOneSignU', posPanel(), false, 20, 4, 'eleventh', 1.42);
  addPanel(panelButtonSlidersUVOnOneSignV, 'panelButtonSlidersUVOnOneSignV', posPanel(), false, 20, 4, 'eleventh', 1.42);
  addPanel(panelTimeButtons, 'panelTimeButtons', posPanel()+4, false, 20, 4, 'eleventh', 1.42);

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

  addButton("sixth", panelButton, "uvToXyButton", "UV → XY", 100, 30, 25, 0, function(value){
    glo.params.uvToXy = !glo.params.uvToXy;

    glo.allControls.getByName("uvToXyButton").textBlock.text = glo.params.uvToXy ? "XY → UV" : "UV → XY";

    uvToXy();
    remakeRibbon();
  });

  makePanelTitle("firstPointOffset", "First point offset", 46, "sixth noAutoParam");

  addSlider(panelSliders, "firstPointOffsetX", "X", 1, 1, -24, 24, .5, function(value){ glo.firstPoint.x = value; });
  addSlider(panelSliders, "firstPointOffsetY", "Y", 0, 1, -24, 24, .5, function(value){ glo.firstPoint.y = value; });
  addSlider(panelSliders, "firstPointOffsetZ", "Z", 0, 1, -24, 24, .5, function(value){ glo.firstPoint.z = value; });

  const buttonSizes = {width: 150, height: 33};

  addButton("eleventh", panelButtonSlidersUVOnOneSignU,"slidersUVOnOneSignU", "Slider U sign : OUI", buttonSizes.width, buttonSizes.height, 0, 0, function(value){
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
  });
  addButton("eleventh", panelButtonSlidersUVOnOneSignU,"slidersUVOnOneSignV", "Slider V sign : OUI", buttonSizes.width+30, buttonSizes.height, 32, 0, function(value){
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
  });
  addButton("eleventh", panelButtonSlidersUVOnOneSignV, "InvFormulaCosSin", "Inv cos sin", buttonSizes.width, buttonSizes.height, 0, 0, function(value){
    invElemInInput("cos", "sin", false);
    invElemInInput("cu", "su", false);
    invElemInInput("cv", "sv");
    
  });
  addButton("eleventh", panelButtonSlidersUVOnOneSignV, "InvFormulaUV", "Inv UV", buttonSizes.width+30, buttonSizes.height, 32, 0, async function(value){
    await invElemInInput("u", "v");
  });
  addButton("eleventh", panelTimeButtons, "minusTimeButton", "Time -", 95, buttonSizes.height, 0, 0, async function(value){
    glo.timeCoeff /= 2;
  });
  addButton("eleventh", panelTimeButtons, "resetTimeButton", "Stop", 122, buttonSizes.height, 28, 0, async function(value){
    glo.savedTimeCoeff = glo.pause ? glo.savedTimeCoeff : glo.timeCoeff;
    glo.pause          = !glo.pause;

    glo.timeCoeff = glo.pause ? 0 : glo.savedTimeCoeff;

    glo.allControls.getByName('resetTimeButton').textBlock.text = glo.pause ? 'PLAY' : 'STOP';
  });
  addButton("eleventh", panelTimeButtons, "majorTimeButton", "Time +", 122, buttonSizes.height, 28, 0, async function(value){
    glo.timeCoeff *= 2;
  });
}

function add_eleventh_panel_sliders(){
  let panelButton2 = new BABYLON.GUI.StackPanel();
  let panelButton3 = new BABYLON.GUI.StackPanel();
  let panelButton4 = new BABYLON.GUI.StackPanel();
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
  addPanel(panelButton6, 'panelButtonEleventh6', 46, false);

  const buttonSizes = {width: 120, height: 33};

  addButton("eleventh", panelButton2, "resetEquationsButton", "RESET", buttonSizes.width, buttonSizes.height, 25, 0, function(value){
    resetEquationsParamSliders();
  });
  addButton("eleventh", panelButton2, "switchWritingTypeButton", "Long W", buttonSizes.width, buttonSizes.height, 25, 0, function(value){
    swapControlBackground("switchWritingTypeButton");
    glo.switchWritingType = !glo.switchWritingType;
    switchWritingType(glo.switchWritingType);
  });
  addButton("eleventh", panelButton2, "planSwitchEquationsButton", "1 PLAN", buttonSizes.width, buttonSizes.height, 25, 0, function(value){
    showAPlane(glo.planSelects.next().value);
  });
  addButton("eleventh", panelButton3, "uMoreOneButton", "U ++", 70, buttonSizes.height, 26, 0, function(value){
    slidersAnim('u', 0, 0.01);
  });
  addButton("eleventh", panelButton3, "uLessOneButton", "U --", 50, buttonSizes.height, 7, 0, function(value){
    slidersAnim('u', 0, -0.01);
  });
  addButton("eleventh", panelButton3, "vMoreOneButton", "V ++", 70, buttonSizes.height, 25, 0, function(value){
    slidersAnim('v', 0, 0.01);
  });
  addButton("eleventh", panelButton3, "vLessOneButton", "V --", 50, buttonSizes.height, 7, 0, function(value){
    slidersAnim('v', 0, -0.01);
  });
  addButton("eleventh", panelButton3, "updateRots", "Upd Rot", buttonSizes.width, buttonSizes.height, 25, 0, async function(){
    swapControlBackground("updateRots");
    glo.params.updateRots = !glo.params.updateRots;
  });
  addButton("eleventh", panelButton4, "uMoreLittleOneButton", "U +", 70, buttonSizes.height, 26, 0, function(value){
    slidersAnim('u', 0, 0.001);
  });
  addButton("eleventh", panelButton4, "uLessLittleOneButton", "U -", 50, buttonSizes.height, 7, 0, function(value){
    slidersAnim('u', 0, -0.001);
  });
  addButton("eleventh", panelButton4, "vMoreLittleOneButton", "V +", 70, buttonSizes.height, 25, 0, function(value){
    slidersAnim('v', 0, 0.001);
  });
  addButton("eleventh", panelButton4, "vLessLittleOneButton", "V -", 50, buttonSizes.height, 7, 0, function(value){
    slidersAnim('v', 0, -0.001);
  });
  addButton("eleventh", panelButton4, "camToZeroButton", "View on ⊙", buttonSizes.width, buttonSizes.height, 25, 0, function(value){
    cameraOnPos({x: 0, y: 0, z: 0});
  });
  addButton("eleventh", panelButton6, "moveToMeshButton", "Cam +", buttonSizes.width, buttonSizes.height, 25, 0, function(value){
    glo.camera.radius/=1.0625;
  });
  addButton("eleventh", panelButton6, "moveFromMeshButton", "Cam -", buttonSizes.width, buttonSizes.height, 25, 0, function(value){
    glo.camera.radius*=1.0625;
  });
  addButton("eleventh", panelButton6, "resetViewButton", "Cam 0", buttonSizes.width, buttonSizes.height, 25, 0, function(value){
    cameraOnPos({x: 0, y: 0, z: 0});
    viewOnAxis();
  });
}

function add_transformation_sliders(){
  var panel = new BABYLON.GUI.StackPanel();
  parmamControl(panel, 'paramTransformationSlidersPanel', 'panel right eighth noAutoParam', {hAlign: 'right', vAlign: 'top', w: 20, t: 60, pR: 1, pL: 1});
  glo.advancedTexture.addControl(panel);

  makePanelTitle('TransformationPanelTitle', 'Transformations', 56.5, 'eighth noAutoParam');

  function addXYZSlider(parent, baseName, text, val, decimalPrecision, min, max, step, eventCallback){
    // Container principal vertical pour tout le groupe
    var groupContainer = new BABYLON.GUI.StackPanel();
    groupContainer.isVertical = true;
    groupContainer.width = "100%";
    groupContainer.adaptHeightToChildren = true;
    parent.addControl(groupContainer);

    // Header en haut
    var header = new BABYLON.GUI.TextBlock();
    parmamControl(header, "header_" + baseName, 'header right eighth noAutoParam', { 
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
    parmamControl(slider, baseName, 'slider right eighth', options, true);
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
        glo.params.meshTransformations[baseName][axis] = value;
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
          glo.params.meshTransformations[baseName][axis] = slider.startValue;
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
  parmamControl(panel, 'ninethPanelPanel', 'panel right eighth noAutoParam', {hAlign: 'right', vAlign: 'top', w: 20, t: 44.75, pR: 1, pL: 1});
  glo.advancedTexture.addControl(panel);

  makePanelTitle("waveTitlePanel", "Waves", 41.25, "eighth noAutoParam");

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
    parmamControl(headerMain, "header_" + baseName, 'header right eighth noAutoParam', { 
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
    parmamControl(sliderMain, baseName + "Main", 'slider right eighth', {
      minimum: minMain, maximum: maxMain, value: valMain, step: stepMain, h: 18.5, background: 'grey'
    }, true);
    sliderMain.startValue = valMain;
    sliderMain.width = "72.5%";  // Pourcentage du container parent
    sliderMain.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    sliderMain.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    rowMain.addControl(sliderMain);

    // === SLIDER SECONDAIRE (n) ===
    var headerSecondary = new BABYLON.GUI.TextBlock();
    parmamControl(headerSecondary, "header_" + baseName + "n", 'header right eighth noAutoParam', { 
      text: textSecondary + " X: " + valSecondary, 
      color: '#ff6666', 
      fontSize: 14, 
      h: 20, 
      pT: 4 
    }, true);
    groupContainer.addControl(headerSecondary);

    var sliderSecondary = new BABYLON.GUI.Slider();
    parmamControl(sliderSecondary, baseName + "Secondary", 'slider right eighth', {
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
    0.30,         // Valeur initiale secondaire
    2,           // Précision décimale
    -40, 40, .1, // Min, max, step principal
    -2, 2, .01,   // Min, max, step secondaire
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
function toggleGuiControlsByClass(state, theClass){
  glo.allControls.haveThisClass(theClass).map(ct => { ct.isVisible = state; ct.isEnabled = state; });
}