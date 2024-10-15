//*****************************************************************************************************//
//*********************************************BABYLON GUI*********************************************//
//*****************************************************************************************************//

//Les touches a ou z enfoncée plus le ckique gauche de la souris
BABYLON.GUI.Slider.prototype.subscribeToKeyEventsOnHover = function() {
  this.isKeyPressed = false; // Drapeau pour éviter les déclenchements multiples

  this.onPointerEnterObservable.add(function() {
      const keyEventListener = function(e) {
          if (this.isKeyPressed) return; // Si une touche a déjà été pressée, on ignore le reste

          switch(e.key){
            case "&":
              this.step /= 10;
              this.isKeyPressed = true;
            break;
            case "é":
              this.step *= 10;
              this.isKeyPressed = true;
            break;
            case "è":
              this.maximum/=2;
              if(this.minimum < 0){ this.minimum/=2; }
              this.isKeyPressed = true;
            break;
            case "_":
              this.maximum*=2;
              if(this.minimum < 0){ this.minimum*=2; }
              this.isKeyPressed = true;
            break;
          }
      }.bind(this); // Lier le contexte du slider à la fonction

      const keyUpListener = function(e) {
          if (e.key === '&' || e.key === 'é' || e.key === 'è' || e.key === '_') {
              this.isKeyPressed = false; // Réinitialiser le drapeau lorsque la touche est relâchée
          }
      }.bind(this);

      window.addEventListener('keydown', keyEventListener);
      window.addEventListener('keyup', keyUpListener);

      this.onPointerOutObservable.add(function() {
          window.removeEventListener('keydown', keyEventListener);
          window.removeEventListener('keyup', keyUpListener);
          this.isKeyPressed = false; // Réinitialiser le drapeau lorsque le curseur quitte le slider
      }.bind(this), { once: true });
  }.bind(this)); // Lier le contexte du slider à la fonction

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

  add_step_ABCD_sliders();
  add_symmetrize_sliders();
  add_blender_sliders();
  add_transformation_sliders();
  add_sixth_panel_sliders();
  add_functionIt_sliders();
  add_ninethPanel_controls();
  add_fractalize_controls();

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

function designButton(bt, color = glo.buttons_color, cornerRadius = glo.buttons_radius, background = glo.buttons_background, fontSize = glo.buttons_fontsize){
  bt.color = color; bt.cornerRadius = cornerRadius; bt.background = background; bt.textBlock.fontSize = fontSize;
}

function add_switch_and_help_buttons(){
  var panel = new BABYLON.GUI.StackPanel();
  var options = { isVertical: false, hAlign: 'left', vAlign: 'bottom', w: 20, l: 3, t: -1, };
  parmamControl(panel, 'hideSwitchHelp', 'panel left first noAutoParam', options);
  panel.height = "80px";
  glo.advancedTexture.addControl(panel);

  function add_button(name, text, width, height, paddingLeft, paddingRight, eventLeft, eventRight){
    var button = BABYLON.GUI.Button.CreateSimpleButton(name, text);
    parmamControl(button, name, 'button left first', {w: width, h: height, pL: paddingLeft, pR: paddingRight}, true);
    designButton(button);
    button.onPointerUpObservable.add(function(event) {
      if (event.buttonIndex !== 2){ eventLeft(); }
      else{ eventRight(); }
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

  function add_button(name, text, width, height, paddingLeft, paddingRight, event){
    var button = BABYLON.GUI.Button.CreateSimpleButton(name, text);
    parmamControl(button, name, 'button right first', {w: width, h: height, pL: paddingLeft, pR: paddingRight}, true);
    designButton(button);
    button.onPointerUpObservable.add(function() {
      event();
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
  });

  var button1 = BABYLON.GUI.Button.CreateSimpleButton("but_screen", "↗ S");
  parmamControl(button1, 'fullScreenButton', 'button right first', {h: 35, pL: 10}, true);
  button1.width = 0.2;
  button1.onPointerUpObservable.add(function() {
    glo.engine.switchFullscreen();
    glo.fullScreen = !glo.fullScreen;
    if(glo.fullScreen){
      glo.allControls.haveTheseClasses('input', 'right', 'third').map(inp => { inp.width = '325px'; });
      glo.canvasHeight = $("#renderCanvas").attr("height");
      glo.canvasWidth = $("#renderCanvas").attr("width");
      button1.textBlock.text = "↘ S";
    }
    else{
      glo.allControls.haveTheseClasses('input', 'right', 'third').map(inp => { inp.width = '350px'; });
      //window.resizeTo(500, 500);
      //window.resizeTo(screen.width, screen.height);
      //$("#renderCanvas").attr("height", glo.canvasHeight);
      //$("#renderCanvas").attr("width", glo.canvasWidth);
      //glo.engine.resize();
      //gui_resize();
      button1.textBlock.text = "↗ S";
    }
  });
  panel.addControl(button1);
  glo.fullScreenButton = button1;

  add_button("but_box", "BOX", 70, 100/3, 10, 0, function(){
    glo.ribbon.showBoundingBox = !glo.ribbon.showBoundingBox;
    glo.params.showBoundingBox = !glo.params.showBoundingBox;
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

  add_button("but_grid", "GRID", 60, 30, 0, 0, function(){
    glo.grid_visible = !glo.grid_visible;
    if(glo.first_axis_visible){ showAxis(glo.axis_size, 1); glo.first_axis_visible = false; glo.axis_visible = true; }
    if(glo.first_grid_visible){ showGrid(20, 20, 20, 1); glo.first_grid_visible = false; glo.grid_visible = true; }
    else{ switch_grid(); }
  });
  add_button("but_plan", "PLAN", 60, 30, 10, 0, function(){
    glo.planes_visible = !glo.planes_visible;
    make_planes();
  });
  add_button("but_coord", "CART", 70, 30, 10, 0, function(){switchCoords();}, function(){switchCoords(false);});
  add_button("but_lines_state", "LINE", 70, 30, 10, 0, function(){
    glo.allControls.getByName("but_lines_state").textBlock.text = glo.drawType.next().value;
    if(glo.ribbon_visible){ glo.ribbon.visibility = 1; }
    else{ glo.ribbon.visibility = 0; }
    switch_lines();
  });
  add_button("but_dimension", "EXP", 60, 30, 10, 0, function(){
    exportModal();
  });
}
function add_histo_buttons(){
  var panel = new BABYLON.GUI.StackPanel();
  var options = {isVertical: false, hAlign: 'right', vAlign: 'bottom', w: 20, l: 5.66, t: -1, };
  parmamControl(panel, 'panelHistoButton', 'panel right first noAutoParam', options);
  panel.height = '80px';
  glo.advancedTexture.addControl(panel);

  function add_button(name, text, width, height, paddingLeft, paddingRight, event){
    var button = BABYLON.GUI.Button.CreateSimpleButton(name, text);
    designButton(button);
    parmamControl(button, name, 'button right first noAutoParam', {w: width, h: height, pL: paddingLeft, pR: paddingRight}, true);
    button.fontSize = "20px";
    button.onPointerDownObservable.add(function() {
      event();
    });
    panel.addControl(button);
  }

  add_button("but_goBack", "<", 80, 30, 10, 0, function(){
    glo.histo.goBack();
  });
  add_button("but_goTo", ">", 80, 30, 10, 0, function(){
    glo.histo.goTo();
  });
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
    slider.onPointerUpObservable.add(function (e) {
      glo.histo.save();
    });

    panel.addControl(slider);
  }

  add_slider('u', 'U', 'u', 'slider_u');
  add_slider('v', 'V', 'v', 'slider_v');
}

function add_grid_slider(){
  var panel = new BABYLON.GUI.StackPanel();
  panel.class = "panel left first";
  glo.advancedTexture.addControl(panel);

  var header = new BABYLON.GUI.TextBlock();
  header.class = 'header left first';
  header.text = "GRID SCALE";
  panel.addControl(header);

  var slider = new BABYLON.GUI.Slider();
  slider.name = 'grid_var';
  slider.class = "slider left first";
  slider.prop_value = 'none';
  slider.step = 1;
  slider.minimum = 1;
  slider.maximum = 60;
  slider.value = 20;
  slider.onValueChangedObservable.add(function (value) {
    if(glo.first_grid_visible){ showGrid(20, 10, 20); glo.first_grid_visible = false; }
    if(glo.first_axis_visible){ showAxis(glo.axis_size, 1); glo.first_axis_visible = false; }
    else{
      if(!glo.grid_visible){ glo.grid_visible = true; switch_grid(); }
      else if(value%10 == 0 || (value%5 == 0 && value <= 20) || (value < 10)){
        var nb_grads = 10;
        if(value < 16){ nb_grads = value; }
        if(value < 11){ nb_grads = value * 2; }
        if(value < 4){ nb_grads = value * 10; }
        showGrid(value, nb_grads, value, 1);
      }
    }
    make_planes();
  });

  panel.addControl(slider);
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
      glo.curves.lineSystem.alpha = value;
    }
  });

  panel.addControl(slider);
}
function add_inputs_equations(){
  var panel                = new BABYLON.GUI.StackPanel();
  var panelColorsEquations = new BABYLON.GUI.StackPanel();
  var panelSuitsEquations  = new BABYLON.GUI.StackPanel();
  var panelSymsEquations   = new BABYLON.GUI.StackPanel();
  parmamControl(panel, "inputsEquations", 'panel left first');
  parmamControl(panelColorsEquations, "inputsColorsEquations", 'panel right third noAutoParam', {hAlign: 'right', vAlign: 'top', w: 24, pR: 1, t: 24});
  parmamControl(panelSuitsEquations, "inputsSuitsEquations", 'panel right fourth noAutoParam', {hAlign: 'right', vAlign: 'top', w: 24, pR: 1, t: 26});

  var options = {hAlign: 'right', vAlign: 'top', w: 24, t: 86, pR: 1};
  parmamControl(panelSymsEquations, "panelSymsEquations", 'panel right fourth noAutoParam', options);

  panel.onWheelObservable.add(function (e) {var val = e.y < 0 ? glo.histo.goTo() : glo.histo.goBack(); });
  panelColorsEquations.onWheelObservable.add(function (e) {var val = e.y < 0 ? glo.histoColo.goTo() : glo.histoColo.goBack(); });

  glo.advancedTexture.addControl(panel);
  glo.advancedTexture.addControl(panelColorsEquations);
  glo.advancedTexture.addControl(panelSuitsEquations);
  glo.advancedTexture.addControl(panelSymsEquations);

  glo.text_input_alpha = "";
  glo.text_input_beta  = "";

  var indexInInputsEquations = 0;

  function add_input(parent, textHeader, textField, name, classNameHeader, classNameInput, gloPropToModify, gloPropToAssignInput, colorEquation = false, event = true){
    var header = new BABYLON.GUI.TextBlock();
    parmamControl(header, "header_" + name, classNameHeader, {text: textHeader});
    if(parent.name !== 'inputsEquations'){ header.paddingLeft = "20%"; }
    parent.addControl(header);

    var input = new BABYLON.GUI.InputText();
    parmamControl(input, name, classNameInput, {w: "350", fontWeight: "500", fontSize: "19", text: textField}, true);

    input.inputsEquationsIndex = indexInInputsEquations;
    indexInInputsEquations++;

    async function inputChangeEvent(){
      if(colorEquation){ glo.params.playWithColors = true; }
      if(glo.normalMode){
        if(!colorEquation && !glo.params.playWithColors){ drawNormalEquations(); }
        else{
          var equations = {
            fx: glo.params.text_input_color_x,
            fy: glo.params.text_input_color_y,
            fz: glo.params.text_input_color_z,
            falpha: glo.params.text_input_color_alpha,
            fbeta: glo.params.text_input_color_beta,
          };
          if(test_equations(equations, false)){
            glo.fromSlider = true;
            await make_curves(undefined, undefined, undefined, undefined, !glo.params.fractalize.actived ? false : 'fractalize');
            glo.fromSlider = false; drawNormalEquations(true);
          } 
        }
      }
      else{
        if(!colorEquation){
          await remakeRibbon();

          glo.histo.save();
          glo.advancedTexture.moveFocusToControl(input);
        }
        else{
          var equations = {
            fx: glo.params.text_input_color_x,
            fy: glo.params.text_input_color_y,
            fz: glo.params.text_input_color_z,
            falpha: glo.params.text_input_color_alpha,
            fbeta: glo.params.text_input_color_beta,
          };
          glo.params.playWithColors = true;
          glo.histoColo.save();
          if(test_equations(equations, false)){ makeColors(); }
        }
      }
    }

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
    parent.addControl(input);

    glo[gloPropToAssignInput] = input;
  }

  add_input(panel, "X", "u", "inputX", "header left first", "input equation left first", "text_input_x", "input_x");
  add_input(panel, "Y", "usv", "inputY", "header left first", "input equation left first", "text_input_y", "input_y");
  add_input(panel, "Z", "ucvsu", "inputZ", "header left first", "input equation left first", "text_input_z", "input_z");
  add_input(panel, "R", "", "inputAlpha", "header left first", "input equation left first", "text_input_alpha", "input_alpha");
  add_input(panel, "W", "", "inputBeta", "header left first", "input equation left first", "text_input_beta", "input_beta");

  add_input(panelColorsEquations, "R", "cu", "inputColorX", "header right third", "input equation right third", "text_input_color_x", "input_color_x", true);
  add_input(panelColorsEquations, "G", "cv", "inputColorY", "header right third", "input equation right third", "text_input_color_y", "input_color_y", true);
  add_input(panelColorsEquations, "B", "", "inputColorZ", "header right third", "input equation right third", "text_input_color_z", "input_color_z", true);
  add_input(panelColorsEquations, "Alpha", "", "inputColorAlpha", "header right third", "input equation right third", "text_input_color_alpha", "input_color_alpha", true);
  add_input(panelColorsEquations, "Bêta", "", "inputColorBeta", "header right third", "input equation right third", "text_input_color_beta", "input_color_beta", true);

  add_input(panelSuitsEquations, "X", "", "inputSuitX", "header right fourth", "input equation right fourth", "text_input_suit_x", "input_suit_x");
  add_input(panelSuitsEquations, "Y", "", "inputSuitY", "header right fourth", "input equation right fourth", "text_input_suit_y", "input_suit_y");
  add_input(panelSuitsEquations, "Z", "", "inputSuitZ", "header right fourth", "input equation right fourth", "text_input_suit_z", "input_suit_z");
  add_input(panelSuitsEquations, "Rot X", "", "inputSuitAlpha", "header right fourth", "input equation right fourth", "text_input_suit_alpha", "input_suit_alpha");
  add_input(panelSuitsEquations, "Rot Y", "", "inputSuitBeta", "header right fourth", "input equation right fourth", "text_input_suit_beta", "input_suit_beta");
  add_input(panelSuitsEquations, "Rot Z", "", "inputSuitTheta", "header right fourth", "input equation right fourth", "text_input_suit_theta", "input_suit_theta");

  add_input(panelSymsEquations, "R Symmetrize", "", "inputRSymmetrize", "header right fourth", "input equation right fourth", "text_input_sym_r", "input_sym_r");
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
        glo.histo.save();

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

    var textBlock = header.children[1]
    textBlock.fontSize = "17px";

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
    slider.onPointerUpObservable.add(function (e) {
      glo.histo.save();
    });
    panel.addControl(slider);

    glo[gloPropToAssignInput] = slider;
  }

  add_slider("stepU", "Steps U", "steps_u", "slider_nb_steps_u");
  add_slider("stepV", "Steps V", "steps_v", "slider_nb_steps_v");
}

function add_color_pickers(){
  var panelLight   = new BABYLON.GUI.StackPanel();
  var panel        = new BABYLON.GUI.StackPanel();
  var optionsLight = {hAlign: 'right', vAlign: 'top', w: 20, t: 26, };
  var options      = {hAlign: 'right', vAlign: 'top', w: 20, t: 43.5, };
  parmamControl(panelLight, 'lightPanel', 'panel right first noAutoParam onlyMainGui', optionsLight);
  parmamControl(panel, 'pickerColorPanel', 'panel right first noAutoParam onlyMainGui', options);
  glo.advancedTexture.addControl(panelLight);
  glo.advancedTexture.addControl(panel);

  var header = new BABYLON.GUI.TextBlock();
  parmamControl(header, "pickersColorHeader", 'header right first onlyMainGui', {text: "Back, emissive, diffuse & lines :"});
  panel.addControl(header);

  function addSlider(parent, name, text, val, decimalPrecision, min, max, step, event){
    var header = new BABYLON.GUI.TextBlock();
    parmamControl(header, "header_" + name, 'header right first noAutoParam', { text: text + ": " + val, color: 'white', fontSize: 14, h: 20, pT: 4, }, true);
    parent.addControl(header);

    var slider = new BABYLON.GUI.Slider();
    var options = {minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 18.5, background: 'grey'};
    parmamControl(slider, name, 'slider right first', options, true);
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

    slider.onPointerUpObservable.add(function (e) {
      
    });
    parent.addControl(slider);
  }

  addSlider(panelLight, "lightIntensity", "Light Intensity", 0.7, 2, 0, 1, 0.01, async function(value){
    glo.light.intensity = value;
  });
  addSlider(panelLight, "lightDirectionX", "Light Direction X", 0.3, 2, 0, 1, 0.01, async function(value){
    glo.light.direction = new BABYLON.Vector3(value, glo.light.direction.y, glo.light.direction.z);
  });
  addSlider(panelLight, "lightDirectionY", "Light Direction Y", 0.6, 2, 0, 1, 0.01, async function(value){
    glo.light.direction = new BABYLON.Vector3(glo.light.direction.x, value, glo.light.direction.z);
  });
  addSlider(panelLight, "lightDirectionZ", "Light Direction Z", 0, 2, 0, 1, 0.01, async function(value){
    glo.light.direction = new BABYLON.Vector3(glo.light.direction.x, glo.light.direction.y, value);
  });

  var picker = new BABYLON.GUI.ColorPicker();
  parmamControl(picker, 'pickerColorBackground', "picker right first onlyMainGui", { value: glo.backgroundColor, hAlign: 'center', w: glo.pickers_size, h: glo.pickers_size, pT: 5 }, true);
  picker.onValueChangedObservable.add(function(value) { // value is a color3
    glo.scene.clearColor = value;
    glo.backgroundColor = value;
    glo.new_color = "rgb(0,0,0)";
    glo.color_line_grid = new BABYLON.Color3(0, 0, 0);
    if(value.r < 77/255 && value.g < 77/255 && value.b < 77/255){
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
    
    if(!ribbonToColorize.material){
      var material = new BABYLON.StandardMaterial("myMaterial", glo.scene);
	    material.backFaceCulling  = false;
      ribbonToColorize.material = material;
    }
    ribbonToColorize.material.diffuseColor = value;
    glo.diffuseColor = value;
  });

  var picker3 = new BABYLON.GUI.ColorPicker();
  parmamControl(picker3, 'pickerColorEmissive', "picker right first onlyMainGui", { value: glo.emissiveColor, hAlign: 'center', w: glo.pickers_size, h: glo.pickers_size, pT: 5 }, true);
  picker3.onValueChangedObservable.add(function(value) {
    var ribbonToColorize = glo.ribbon;
    
    if(!ribbonToColorize.material){
      var material = new BABYLON.StandardMaterial("myMaterial", glo.scene);
	    material.backFaceCulling  = false;
      ribbonToColorize.material = material;
    }
    ribbonToColorize.material.emissiveColor = value;
    glo.emissiveColor = value;
  });

  var picker4 = new BABYLON.GUI.ColorPicker();
  parmamControl(picker4, 'pickerColorLine', "picker right first onlyMainGui", { value: glo.lineColor, hAlign: 'center', w: glo.pickers_size, h: glo.pickers_size, pT: 5 }, true);
  picker4.onValueChangedObservable.add(function(value) {
      changeLineColor(value.r, value.g, value.b);
  });

  panel.addControl(picker);
  panel.addControl(picker3);
  panel.addControl(picker2);
  panel.addControl(picker4);
}

function add_step_ABCD_sliders(){
  var panel = new BABYLON.GUI.StackPanel();
  var panelColors = new BABYLON.GUI.StackPanel();
  parmamControl(panel, 'paramEquationsSlidersPanel', 'panel right second', {hAlign: 'right', vAlign: 'top', w: 20, t: 26, pR: 0.5});
  parmamControl(panelColors, 'paramColorsSlidersPanel', 'panel right third noAutoParam', {hAlign: 'right', vAlign: 'top', w: 20, t: 51, pR: 0.5 });
  glo.advancedTexture.addControl(panel);
  glo.advancedTexture.addControl(panelColors);

  function addSlider(parent, name, text, val, decimalPrecision, min, max, step, event, second = 'true', action = null){
    var header = new BABYLON.GUI.TextBlock();
    if(second){ parmamControl(header, "header_" + name, 'header right second noAutoParam', { text: text + ": " + val, color: 'white', fontSize: 14, h: 20, pT: 4, }, true); }
    else{ parmamControl(header, "header_" + name, 'header right third noAutoParam', { text: text + ": " + val, color: 'white', fontSize: 14, h: 20, pT: 4, }, true); }
    parent.addControl(header);

    var slider = new BABYLON.GUI.Slider();
    var options = {minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 18.5, background: 'grey'};
    var optionsThird = {minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 18.5, background: 'grey', };
    if(second){  parmamControl(slider, name, 'slider right second', options, true); }
    else{  parmamControl(slider, name, 'slider right third', optionsThird, true); }
    slider.onValueChangedObservable.add(async function(value) {
      glo.sliderGain = value - slider.lastValue;
      glo.is_sliderGainPos = glo.sliderGain > 0 ? true: false;
      glo.sliderGainSign = glo.sliderGain > 0 ? 1: -1;
      event(value);
      header.text = text + ": " + value.toFixed(decimalPrecision);
      if(second){
        if(!glo.normalMode){ await remakeRibbon(); }
        else{ drawNormalEquations(); }
      }
      else{
        glo.params.playWithColors = true;
        if(!glo.normalMode){
          if(action == null){ makeColors(); }
          else{
            if(typeof(glo.colors) != 'undefined'){ action(); }
            else{ makeColors(); }
          }
        }
        else{ glo.fromSlider = true; make_ribbon(); glo.fromSlider = false; drawNormalEquations(); }
      }
      slider.lastValue = value;
    });
    slider.onPointerClickObservable.add(function (e) {
      if(e.buttonIndex == 2){ slider.value = slider.startValue; }
    });
   
    slider.onPointerUpObservable.add(function (e) {
      glo.histoColo.save();
    });
    parent.addControl(slider);
  }

  function updateWithGain(param){
    var p = glo.params[param]; var gain = glo.sliderGain;
    gain = abs(gain) + 1;
    gain = !glo.is_sliderGainPos ? 1/gain : gain;
    p = p != 0 ? p*=gain : p = gain;
    glo.params[param] = p;
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
  addSlider(panel, "M", "M", 1, 0, -360, 360, 1, function(value){ glo.params.M = value; });

  addSlider(panelColors, "saturationSlider", "Saturation", 0, 1, -12, 12, 0.1, function(value){ updateWithGain('saturation'); }, false, saturation);
  addSlider(panelColors, "tintSlider", "Tint", 0, 2, -1, 1, 0.01, function(value){ glo.params.tint = value; }, false, tint);
  addSlider(panelColors, "rotAlphaSlider", "Alpha", 0, 2, 0, PI, 0.01, function(value){ glo.params.rotAlpha = value; }, false, alphaColor);
  addSlider(panelColors, "rotBetaSlider", "Bêta", 0, 2, 0, PI, 0.01, function(value){ glo.params.rotBeta = value; }, false, betaColor);
  addSlider(panelColors, "toColRSlider", "Grey or Not", 0, 1, -3, 3, 0.1, function(value){ glo.params.toColR = value; }, false, colByMidSLid);
  addSlider(panelColors, "gColorSlider", "Shell", 0, 2, -1, 1, 0.01, function(value){ glo.params.gColor = value; }, false, mColorShell);
  addSlider(panelColors, "bColorSlider", "B", 0, 2, -1, 1, 0.01, function(value){ glo.params.bColor = value; }, false, mColorB);
  addSlider(panelColors, "itColorsSlider", "IT", 1, 0, 1, 256, 1, function(value){ glo.params.itColors = value; }, false);
}

function add_symmetrize_sliders(){
  var panel = new BABYLON.GUI.StackPanel();
  parmamControl(panel, 'paramSymmetrizeSlidersPanel', 'panel right fourth noAutoParam', {hAlign: 'right', vAlign: 'top', w: 20, t: 54, pR: 0.5});
  glo.advancedTexture.addControl(panel);

  function addSlider(parent, name, text, val, decimalPrecision, min, max, step, event){
    var header = new BABYLON.GUI.TextBlock();
    parmamControl(header, "header_" + name, 'header right fourth noAutoParam', { text: text + ": " + val, color: 'white', fontSize: 14, h: 20, pT: 4, }, true);
    parent.addControl(header);

    var slider = new BABYLON.GUI.Slider();
    var options = {minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 18.5, background: 'grey'};
    parmamControl(slider, name, 'slider right fourth', options, true);
    slider.startValue = val;

    slider.onValueChangedObservable.add(async function(value) {
        header.text = text + ": " + value.toFixed(decimalPrecision);
        slider.lastValue = value;

        event(value);

        getPathsInfos();

        await remakeRibbon();
    });
    
    slider.onPointerClickObservable.add(function (e) {
      if(e.buttonIndex == 2){
        slider.value = slider.startValue;
      }
    });

    parent.addControl(slider);
  }

  function add_button(name, text, width, height, paddingTop, paddingLeft, paddingRight, event){
    var button = BABYLON.GUI.Button.CreateSimpleButton(name, text);
    parmamControl(button, name, 'button right fourth noAutoParam', {w: width, h: height, pL: paddingLeft, pR: paddingRight, pT: paddingTop}, true);
    designButton(button);
    button.onPointerUpObservable.add(function() {
      event();
    });
    panel.addControl(button);
  }

  addSlider(panel, "blendForce", "blend force", 1, 3, 0, 24, .001, function(value){ glo.params.blender.force = value; });
  addSlider(panel, "symmetrizeX", "symmetrize X", 0, 0, 0, 24, 1, function(value){ glo.params.symmetrizeX = value; });
  addSlider(panel, "symmetrizeY", "symmetrize Y", 0, 0, 0, 24, 1, function(value){ glo.params.symmetrizeY = value; });
  addSlider(panel, "symmetrizeZ", "symmetrize Z", 0, 0, 0, 24, 1, function(value){ glo.params.symmetrizeZ = value; });
  addSlider(panel, "symmetrizeAngle", "symmetrize Angle", 3.14, 2, PI/16, 4*PI, PI/16, function(value){ glo.params.symmetrizeAngle = value; });
  addSlider(panel, "checkerboard", "Checkerboard", 0, 1, 0, 24, .5, function(value){ glo.params.checkerboard = value; });

  add_button("centerLocal", "Center on origin", 40, 30, 0, 5, 0, function(){
    glo.params.centerIsLocal = !glo.params.centerIsLocal;
    glo.allControls.getByName('centerLocal').textBlock.text = glo.params.centerIsLocal ? "Center on mesh" : "Center on origin";
    remakeRibbon();
  });
}

function add_blender_sliders(){
  var panel = new BABYLON.GUI.StackPanel();
  parmamControl(panel, 'paramBlenderSlidersPanel', 'panel right seventh noAutoParam', {hAlign: 'right', vAlign: 'top', w: 20, t: 26, pR: 0.5});
  glo.advancedTexture.addControl(panel);

  function addSlider(parent, name, text, val, decimalPrecision, min, max, step, event){
    var header = new BABYLON.GUI.TextBlock();
    parmamControl(header, "header_" + name, 'header right seventh noAutoParam', { text: text + ": " + val, color: 'white', fontSize: 14, h: 20, pT: 4, }, true);
    parent.addControl(header);

    var slider = new BABYLON.GUI.Slider();
    var options = {minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 20, background: 'grey'};
    parmamControl(slider, name, 'slider right seventh', options, true);
    slider.startValue = val;

    slider.onValueChangedObservable.add(async function(value) {
        header.text = text + ": " + value.toFixed(decimalPrecision);
        slider.lastValue = value;

        event(value);

        getPathsInfos();

        await remakeRibbon();
    });
    slider.onPointerClickObservable.add(function (e) {
      if(e.buttonIndex == 2){
        slider.value = slider.startValue;
      }
    });

    /*slider.onWheelObservable.add(function (e) {
      var val = e.y < 0 ? val = slider.step : val = -slider.step; slider.value += val;
    });*/
    slider.onPointerUpObservable.add(function (e) {
      
    });
    parent.addControl(slider);
  }

  addSlider(panel, "blenderUX", "U blend X", 0, 2, -24, 24, .01, function(value){ glo.params.blender.u.x = value; });
  addSlider(panel, "blenderUY", "U blend Y", 0, 2, -24, 24, .01, function(value){ glo.params.blender.u.y = value; });
  addSlider(panel, "blenderUZ", "U blend Z", 0, 2, -24, 24, .01, function(value){ glo.params.blender.u.z = value; });
  addSlider(panel, "blenderVX", "V blend X", 0, 2, -24, 24, .01, function(value){ glo.params.blender.v.x = value; });
  addSlider(panel, "blenderVY", "V blend Y", 0, 2, -24, 24, .01, function(value){ glo.params.blender.v.y = value; });
  addSlider(panel, "blenderVZ", "V blend Z", 0, 2, -24, 24, .01, function(value){ glo.params.blender.v.z = value; });
  addSlider(panel, "blenderOX", "O blend X", 0, 2, -24, 24, .01, function(value){ glo.params.blender.O.x = value; });
  addSlider(panel, "blenderOY", "O blend Y", 0, 2, -24, 24, .01, function(value){ glo.params.blender.O.y = value; });
  addSlider(panel, "blenderOZ", "O blend Z", 0, 2, -24, 24, .01, function(value){ glo.params.blender.O.z = value; });
  addSlider(panel, "blenderCUX", "CU blend X", 0, 2, -24, 24, .01, function(value){ glo.params.blender.cu.x = value; });
  addSlider(panel, "blenderCUY", "CU blend Y", 0, 2, -24, 24, .01, function(value){ glo.params.blender.cu.y = value; });
  addSlider(panel, "blenderCUZ", "CU blend Z", 0, 2, -24, 24, .01, function(value){ glo.params.blender.cu.z = value; });
  addSlider(panel, "blenderCVX", "CV blend X", 0, 2, -24, 24, .01, function(value){ glo.params.blender.cv.x = value; });
  addSlider(panel, "blenderCVY", "CV blend Y", 0, 2, -24, 24, .01, function(value){ glo.params.blender.cv.y = value; });
  addSlider(panel, "blenderCVZ", "CV blend Z", 0, 2, -24, 24, .01, function(value){ glo.params.blender.cv.z = value; });
}

function add_functionIt_sliders(){
  var panel        = new BABYLON.GUI.StackPanel();
  var panelButtons = new BABYLON.GUI.StackPanel();
  parmamControl(panel, 'paramFunctionItSlidersPanel', 'panel right eighth noAutoParam', {hAlign: 'right', vAlign: 'top', w: 20, t: 25.5, pR: 0.5});
  parmamControl(panelButtons, 'paramFunctionItButtonsPanel', 'panel right eighth noAutoParam', {isVertical: false, hAlign: 'right', vAlign: 'top', h: 9, w: 20, t: 82, pL: 3, pR: 0.5});
  glo.advancedTexture.addControl(panel);
  glo.advancedTexture.addControl(panelButtons);

  panel.zIndex = 999;

  function addSlider(parent, name, text, val, decimalPrecision, min, max, step, event, remakingRibbon = true){
    var header = new BABYLON.GUI.TextBlock();
    parmamControl(header, "header_" + name, 'header right eighth noAutoParam', { text: text + ": " + val, color: 'white', fontSize: 14, h: 20, pT: 4, }, true);
    parent.addControl(header);

    var slider = new BABYLON.GUI.Slider();
    var options = {minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 18.5, background: 'grey'};
    parmamControl(slider, name, 'slider right eighth', options, true);
    slider.startValue = val;

    slider.onValueChangedObservable.add(async function(value) {
        header.text = text + ": " + value.toFixed(decimalPrecision);
        slider.lastValue = value;

        event(value);

        getPathsInfos();
        await remakeRibbon();
    });
    slider.onPointerClickObservable.add(function (e) {
      if(e.buttonIndex == 2){
        slider.value = slider.startValue;
      }
    });

    parent.addControl(slider);
  }

  addSlider(panel, "cpowX", "Cpow X", 1, 2, -2, 4, .01, function(value){ glo.params.functionIt.cpow.x = value; });
  addSlider(panel, "cpowY", "Cpow Y", 1, 2, -2, 4, .01, function(value){ glo.params.functionIt.cpow.y = value; });
  addSlider(panel, "cpowZ", "Cpow Z", 1, 2, -2, 4, .01, function(value){ glo.params.functionIt.cpow.z = value; });
  addSlider(panel, "sX", "Sin X", 0, 2, -8, 8, .01, function(value){ glo.params.functionIt.sin.x = value; });
  addSlider(panel, "snX", "Sin nX", 1, 2, -8, 8, .01, function(value){ glo.params.functionIt.sin.nx = value; });
  addSlider(panel, "sY", "Sin Y", 0, 2, -8, 8, .01, function(value){ glo.params.functionIt.sin.y = value; });
  addSlider(panel, "snY", "Sin nY", 1, 2, -8, 8, .01, function(value){ glo.params.functionIt.sin.ny = value; });
  addSlider(panel, "sZ", "Sin Z", 0, 2, -8, 8, .01, function(value){ glo.params.functionIt.sin.z = value; });
  addSlider(panel, "snZ", "Sin nZ", 1, 2, -8, 8, .01, function(value){ glo.params.functionIt.sin.nz = value; });
  addSlider(panel, "rotateLineAlpha", "Rot Line Alpha", 0, 2, -PI, PI, .01, function(value){ glo.params.functionIt.rotLine.alpha = value; });
  addSlider(panel, "rotateLineBeta", "Rot Line Bêta", 0, 2, -PI, PI, .01, function(value){ glo.params.functionIt.rotLine.beta = value; });
  addSlider(panel, "rotateLineTheta", "Rot Line Thêta", 0, 2, -PI, PI, .01, function(value){ glo.params.functionIt.rotLine.theta = value; });
  addSlider(panel, "expendLine", "Expend Line", 0, 2, -24, 24, .01, function(value){ glo.params.functionIt.expend = value > 0 ? value : value/24; });
  addSlider(panel, "flatX", "Flat X", 100, 2, 0, 100, .01, function(value){ glo.params.functionIt.flat.x.bottom = value; });
  addSlider(panel, "flatY", "Flat Y", 100, 2, 0, 100, .01, function(value){ glo.params.functionIt.flat.y.bottom = value; });
  addSlider(panel, "flatZ", "Flat Z", 100, 2, 0, 100, .01, function(value){ glo.params.functionIt.flat.z.bottom = value; });
}

function add_sixth_panel_sliders(){
  let panelSliders                   = new BABYLON.GUI.StackPanel();
  let panelButtonSymmetrizeOrder     = new BABYLON.GUI.StackPanel();
  let panelButtonSymmetrizeAdding    = new BABYLON.GUI.StackPanel();
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

  const posPanel = createIncrementer(57, 5);
  addPanel(panelButtonSymmetrizeOrder, 'panelButtonSymmetrizeOrder', posPanel());
  addPanel(panelButtonSymmetrizeAdding, 'panelButtonSymmetrizeAdding', posPanel());
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

        remakeRibbon();
    });
    slider.onPointerClickObservable.add(function (e) {
      if(e.buttonIndex == 2){
        slider.value = slider.startValue;
        remakeRibbon();
      }
    });

    /*slider.onWheelObservable.add(function (e) {
      var val = e.y < 0 ? val = step : val = -step; slider.value += val;
    });*/
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

  addSlider(panelSliders, "checkerboardNbSteps", "Checkerboard nb steps", 2, 1, 1.5, 24, .5, function(value){ glo.params.checkerboardNbSteps = value; });
  addSlider(panelSliders, "firstPointOffsetX", "First point offset X", 1, 1, -24, 24, .5, function(value){ glo.firstPoint.x = value; });
  addSlider(panelSliders, "firstPointOffsetY", "First point offset Y", 0, 1, -24, 24, .5, function(value){ glo.firstPoint.y = value; });
  addSlider(panelSliders, "firstPointOffsetZ", "First point offset Z", 0, 1, -24, 24, .5, function(value){ glo.firstPoint.z = value; });
  addSlider(panelSliders, "expanseAngleX", "Expanse angle X", 0, 2, -PI, PI, PI/16, function(value){ glo.angleToUpdateRibbon.x = value; });
  addSlider(panelSliders, "expanseAngleY", "Expanse angle Y", 0, 2, -PI, PI, PI/16, function(value){ glo.angleToUpdateRibbon.y = value; });
  addSlider(panelSliders, "scaleNorm", "Scale norm", 1, 2, -24, 24, 0.01, function(value){ glo.scaleNorm = value; });

  const buttonSizes = {width: 215, height: 33};
  addButton(panelButtonSymmetrizeOrder, "symmetrizeOrder", "Symmetrize order : XYZ", buttonSizes.width, buttonSizes.height, 0, 0, function(value){ switchSymmetrizeOrder(true); }, function(value){ switchSymmetrizeOrder(false); });
  addButton(panelButtonSymmetrizeAdding, "symmetrizeAdding", "Symmetrize adding : OUI", buttonSizes.width, buttonSizes.height, 0, 0, function(value){
    glo.addSymmetry = !glo.addSymmetry;
    glo.allControls.getByName('symmetrizeAdding').textBlock.text = "Symmetrize adding : " + (glo.addSymmetry ? 'OUI' : 'NON');
    remakeRibbon();
  }, function(value){ });
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
    
    glo.histo.save();
  }, function(value){ });
  addButton(panelButtonInvFormulaUV, "InvFormulaUV", "Inv UV", buttonSizes.width, buttonSizes.height, 0, 0, async function(value){
    await invElemInInput("u", "v");
    
    glo.histo.save();

  }, function(value){ });
  addButton(panelButtonInvPosXYZ, "InvPosX", "Inv X", buttonSizes.width/4, buttonSizes.height, 0, 0, function(value){
    glo.params.invPos.x = !glo.params.invPos.x;
    swapControlBackground("InvPosX");
    remakeRibbon();
  }, function(value){ });
  addButton(panelButtonInvPosXYZ, "InvPosY", "Inv Y", buttonSizes.width/4, buttonSizes.height, 5, 0, function(value){
    glo.params.invPos.y = !glo.params.invPos.y;
    swapControlBackground("InvPosY");
    remakeRibbon();
  }, function(value){ });
  addButton(panelButtonInvPosXYZ, "InvPosZ", "Inv Z", buttonSizes.width/4, buttonSizes.height, 5, 0, function(value){
    glo.params.invPos.z = !glo.params.invPos.z;
    swapControlBackground("InvPosZ");
    remakeRibbon();
  }, function(value){ });
  addButton(panelButtonInvPosXYZ, "InvPosIf", "P", buttonSizes.width/8, buttonSizes.height, 5, 0, function(value){
    glo.invPositionIfs.next().value;
    remakeRibbon();
  }, function(value){ glo.invPositionIfs = glo.invPosIfs(); glo.invPosIf = ''; remakeRibbon(); });
}

function add_transformation_sliders(){
  var panel = new BABYLON.GUI.StackPanel();
  parmamControl(panel, 'paramTransformationSlidersPanel', 'panel right fifth noAutoParam', {hAlign: 'right', vAlign: 'top', w: 20, t: 26, pR: 1});
  glo.advancedTexture.addControl(panel);

  function addSlider(parent, name, text, val, decimalPrecision, min, max, step, event){
    var header = new BABYLON.GUI.TextBlock();
    parmamControl(header, "header_" + name, 'header right fifth noAutoParam', { text: text + ": " + val, color: 'white', fontSize: 14, h: 20, pT: 4, }, true);
    parent.addControl(header);

    var slider = new BABYLON.GUI.Slider();
    var options = {minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 18.5, background: 'grey'};
    parmamControl(slider, name, 'slider right fifth', options, true);
    slider.startValue = val;

    slider.onValueChangedObservable.add(function(value) {
      let val;
      if(!glo.rightButton){
        if(!name.includes('scaleVertex')){ header.text = text + ": " + value.toFixed(decimalPrecision); }
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

    slider.onPointerUpObservable.add(function (e) {
      
    });
    parent.addControl(slider);
  }

  addSlider(panel, "scalingAll", "Scaling All", 1, 2, 0, 24, .1, function(value){ transformMesh('scaling', 'x', value); transformMesh('scaling', 'y', value); transformMesh('scaling', 'z', value);});
  addSlider(panel, "scalingX", "scalingX", 1, 2, 0, 24, .1, function(value){ applyTransformations(); });
  addSlider(panel, "scalingY", "scalingY", 1, 2, 0, 24, .1, function(value){ applyTransformations(); });
  addSlider(panel, "scalingZ", "scalingZ", 1, 2, 0, 24, .1, function(value){ applyTransformations(); });
  addSlider(panel, "rotationX", "rotationX", 0, 3, -2*PI, 2*PI, PI/180, function(value){ transformMesh('rotation', 'x', value); });
  addSlider(panel, "rotationY", "rotationY", 0, 3, -2*PI, 2*PI, PI/180, function(value){ transformMesh('rotation', 'y', value); });
  addSlider(panel, "rotationZ", "rotationZ", 0, 3, -2*PI, 2*PI, PI/180, function(value){ transformMesh('rotation', 'z', value); });
  addSlider(panel, "positionX", "positionX", 0, 0, -24, 24, 1, function(value){ transformMesh('position', 'x', value); });
  addSlider(panel, "positionY", "positionY", 0, 0, -24, 24, 1, function(value){ transformMesh('position', 'y', value); });
  addSlider(panel, "positionZ", "positionZ", 0, 0, -24, 24, 1, function(value){ transformMesh('position', 'z', value); });
  addSlider(panel, "cSymmetryX", "cSymmetryX", 0, 1, -24, 24, .1, function(value){ glo.centerSymmetry.x = value; remakeRibbon(); });
  addSlider(panel, "cSymmetryY", "cSymmetryY", 0, 1, -24, 24, .1, function(value){ glo.centerSymmetry.y = value; remakeRibbon(); });
  addSlider(panel, "cSymmetryZ", "cSymmetryZ", 0, 1, -24, 24, .1, function(value){ glo.centerSymmetry.z = value; remakeRibbon(); });
  addSlider(panel, "expansion", "expansion", 0, 2, -24, 24, .1, function(value){ remakeRibbon(); });
  addSlider(panel, "scaleVertex", "scaleVertexs", 1, 2, -24, 24, .1, function(value){ glo.scaleVertex = value; remakeRibbon(); });
}

function add_ninethPanel_controls(){
  var panel = new BABYLON.GUI.StackPanel();
  parmamControl(panel, 'ninethPanelPanel', 'panel right nineth noAutoParam', {hAlign: 'right', vAlign: 'top', w: 20, t: 26, pR: 1});
  glo.advancedTexture.addControl(panel);
  var panelButton = new BABYLON.GUI.StackPanel();
  parmamControl(panelButton, 'ninethPanelButton', 'panel right nineth noAutoParam', {isVertical: false, hAlign: 'right', vAlign: 'top', w: 20, h: 7, t: 80, pL: 2});
  glo.advancedTexture.addControl(panelButton);
  var panelButton2 = new BABYLON.GUI.StackPanel();
  parmamControl(panelButton2, 'ninethPanelButton2', 'panel right nineth noAutoParam', {isVertical: false, hAlign: 'right', vAlign: 'top', w: 20, h: 7, t: 84.5, pL: 2});
  glo.advancedTexture.addControl(panelButton2);

  function add_button(name, text, width, height, paddingLeft, paddingRight, eventLeft, eventRight, panelButt = panelButton, background = glo.controlConfig.background){
    var button = BABYLON.GUI.Button.CreateSimpleButton(name, text);
    parmamControl(button, name, 'button right nineth', {background: background, w: width, h: height, pL: paddingLeft, pR: paddingRight}, true);
    designButton(button);
    button.onPointerUpObservable.add(function(event) {
      if (event.buttonIndex !== 2){ eventLeft(); }
      else{ eventRight(); }
    });
    panelButt.addControl(button);
  }

  add_button("permutSignButton", "P pos ", glo.buttonBottomSize, glo.buttonBottomHeight, glo.buttonBottomPaddingLeft, 0, function(){
    glo.permutSigns.next();
    glo.allControls.getByName("permutSignButton").textBlock.text = `P pos ${glo.permutSign}`;
    remakeRibbon();
  });
  add_button("quarenionMode", "Q rot R", glo.buttonBottomSize, glo.buttonBottomHeight, glo.buttonBottomPaddingLeft, 0, function(){
    swapControlBackground("quarenionMode");
    glo.params.quaternionByRotR = !glo.params.quaternionByRotR;
    remakeRibbon();
  });
  add_button("secondCurveOperation", "SCO", glo.buttonBottomSize, glo.buttonBottomHeight, glo.buttonBottomPaddingLeft, 0, function(){
    swapControlBackground("secondCurveOperation");
    glo.secondCurveOperation = !glo.secondCurveOperation;
    remakeRibbon();
  });
  add_button("WaveOnXYZ", "W - XYZ", glo.buttonBottomSize, glo.buttonBottomHeight, glo.buttonBottomPaddingLeft, 0, function(){
    swapControlBackground("WaveOnXYZ");
    glo.params.wOnXYZ = !glo.params.wOnXYZ;
    remakeRibbon();
  }, undefined, panelButton2);
  add_button("GridScale", "Grid Sc", glo.buttonBottomSize, glo.buttonBottomHeight, glo.buttonBottomPaddingLeft, 0, async function(){
    swapControlBackground("GridScale", glo.controlConfig.backgroundActived, glo.controlConfig.background);
    glo.params.gridScale = !glo.params.gridScale;
    await remakeRibbon();
  }, undefined, panelButton2, glo.controlConfig.backgroundActived);
  add_button("updateRots", "Upd Rot", glo.buttonBottomSize, glo.buttonBottomHeight, glo.buttonBottomPaddingLeft, 0, async function(){
    swapControlBackground("updateRots", glo.controlConfig.backgroundActived, glo.controlConfig.background);
    glo.params.updateRots = !glo.params.updateRots;
    //await remakeRibbon();
  }, undefined, panelButton2, glo.controlConfig.backgroundActived);

  function addSlider(parent, name, text, val, decimalPrecision, min, max, step, event){
    var header = new BABYLON.GUI.TextBlock();
    parmamControl(header, "header_" + name, 'header right nineth noAutoParam', { text: text + ": " + val, color: 'white', fontSize: 14, h: 20, pT: 4, }, true);
    parent.addControl(header);

    var slider = new BABYLON.GUI.Slider();
    var options = {minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 18.5, background: 'grey'};
    parmamControl(slider, name, 'slider right nineth', options, true);
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

    slider.onPointerUpObservable.add(function (e) {
      
    });
    parent.addControl(slider);
  }

  addSlider(panel, "offsetCenterX", "Offset center X", 1.00, 2, -2, 2, .01, function(value){ glo.params.functionIt.rotatePaths.centerOffset.x = value; remakeRibbon(); });
  addSlider(panel, "offsetCenterY", "Offset center Y", 1.00, 2, -2, 2, .01, function(value){ glo.params.functionIt.rotatePaths.centerOffset.y = value; remakeRibbon(); });
  addSlider(panel, "offsetCenterz", "Offset center Z", 1.00, 2, -2, 2, .01, function(value){ glo.params.functionIt.rotatePaths.centerOffset.z = value; remakeRibbon(); });
  addSlider(panel, "sinRU", "Sin R U", 0.00, 2, -8, 8, .01, function(value){ glo.params.functionIt.r.u.sin.val = value; remakeRibbon(); });
  addSlider(panel, "sinNRU", "Sin R NU", 1.00, 2, -8, 8, .01, function(value){ glo.params.functionIt.r.u.sin.nb = value; remakeRibbon(); });
  addSlider(panel, "cosR$T", "Cos R $T", 0.00, 2, -8, 8, .01, function(value){ glo.params.functionIt.r.$T.cos.val = value; remakeRibbon(); });
  addSlider(panel, "cosNR$T", "Cos R N$T", 1.00, 2, -8, 8, .01, function(value){ glo.params.functionIt.r.$T.cos.nb = value; remakeRibbon(); });
  addSlider(panel, "normX", "Wave X", 0.0, 1, -80, 80, .1, function(value){ glo.params.functionIt.norm.x = value; remakeRibbon(); });
  addSlider(panel, "normnX", "Wave NX", 1.0, 1, -8, 8, .1, function(value){ glo.params.functionIt.norm.nx = value; remakeRibbon(); });
  addSlider(panel, "normY", "Wave Y", 0.0, 1, -80, 80, .1, function(value){ glo.params.functionIt.norm.y = value; remakeRibbon(); });
  addSlider(panel, "normnY", "Wave NY", 1.0, 1, -8, 8, .1, function(value){ glo.params.functionIt.norm.ny = value; remakeRibbon(); });
  addSlider(panel, "normZ", "Wave Z", 0.0, 1, -80, 80, .1, function(value){ glo.params.functionIt.norm.z = value; remakeRibbon(); });
  addSlider(panel, "normnZ", "Wave NZ", 1.0, 1, -8, 8, .1, function(value){ glo.params.functionIt.norm.nz = value; remakeRibbon(); });
}

function add_fractalize_controls(){
  var panel = new BABYLON.GUI.StackPanel();
  parmamControl(panel, 'tenthPanelPanel', 'panel right tenth noAutoParam', {hAlign: 'right', vAlign: 'top', w: 20, t: 26, pR: 1});
  glo.advancedTexture.addControl(panel);
  var panelButton = new BABYLON.GUI.StackPanel();
  parmamControl(panelButton, 'tenthPanelButton', 'panel right tenth noAutoParam', {isVertical: false, hAlign: 'right', vAlign: 'top', w: 20, h: 7, t: 80, pL: 7});
  glo.advancedTexture.addControl(panelButton);
  var panelButton2 = new BABYLON.GUI.StackPanel();
  parmamControl(panelButton2, 'tenthPanelButton2', 'panel right tenth noAutoParam', {isVertical: false, hAlign: 'right', vAlign: 'top', w: 20, h: 7, t: 84.5, pL: 0});
  glo.advancedTexture.addControl(panelButton2);

  function add_button(name, text, width, height, paddingLeft, paddingRight, eventLeft, eventRight, panelButt = panelButton, background = glo.controlConfig.background){
    var button = BABYLON.GUI.Button.CreateSimpleButton(name, text);
    parmamControl(button, name, 'button right tenth', {background: background, w: width, h: height, pL: paddingLeft, pR: paddingRight}, true);
    designButton(button);
    button.onPointerUpObservable.add(function(event) {
      if (event.buttonIndex !== 2){ eventLeft(); }
      else{ eventRight(); }
    });
    panelButt.addControl(button);
  }

  function addSlider(parent, name, text, val, decimalPrecision, min, max, step, event){
    var header = new BABYLON.GUI.TextBlock();
    parmamControl(header, "header_" + name, 'header right tenth noAutoParam', { text: text + ": " + val, color: 'white', fontSize: 14, h: 20, pT: 4, }, true);
    parent.addControl(header);

    var slider = new BABYLON.GUI.Slider();
    var options = {minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 18.5, background: 'grey'};
    parmamControl(slider, name, 'slider right tenth', options, true);
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

    slider.onPointerUpObservable.add(function (e) {
      
    });
    parent.addControl(slider);
  }

  addSlider(panel, "fractalizedStepsU", "Nb cloned in U", 12, 0, 1, 132, 1, async function(value){
    glo.params.fractalize.fractalized.steps.u = value;
    await remakeRibbon();
  });
  addSlider(panel, "fractalizedStepsV", "Nb cloned in V", 12, 0, 1, 132, 1, async function(value){
    glo.params.fractalize.fractalized.steps.v = value;
    await remakeRibbon();
  });
  addSlider(panel, "fractalizeStepsU", "Cloned Steps U", 12, 0, 1, 132, 1, async function(value){
    glo.params.fractalize.steps.u = value;
    await remakeRibbon();
  });
  addSlider(panel, "fractalizeStepsV", "Cloned Steps V", 12, 0, 1, 132, 1, async function(value){
    glo.params.fractalize.steps.v = value;
    await remakeRibbon();
  });
  addSlider(panel, "fractalizeRotateX", "Rot X", 0, 2, 0, 2*PI, 0.01, async function(value){
    glo.params.fractalize.rot.x = value;
    await remakeRibbon();
  });
  addSlider(panel, "fractalizeRotateY", "Rot Y", 0, 2, 0, 2*PI, 0.01, async function(value){
    glo.params.fractalize.rot.y = value;
    await remakeRibbon();
  });
  addSlider(panel, "fractalizeRotateZ", "Rot Z", 0, 2, 0, 2*PI, 0.01, async function(value){
    glo.params.fractalize.rot.z = value;
    await remakeRibbon();
  });
  addSlider(panel, "fractalizeScaleAll", "Scale All", 1, 2, 0, 8, 0.01, async function(value){
    glo.params.fractalize.scale.all = value;
    await remakeRibbon();
  });
  addSlider(panel, "fractalizeScaleX", "Scale X", 1, 2, 0, 8, 0.01, async function(value){
    glo.params.fractalize.scale.x = value;
    await remakeRibbon();
  });
  addSlider(panel, "fractalizeScaleY", "Scale Y", 1, 2, 0, 8, 0.01, async function(value){
    glo.params.fractalize.scale.y = value;
    await remakeRibbon();
  });
  addSlider(panel, "fractalizeScaleZ", "Scale Z", 1, 2, 0, 8, 0.01, async function(value){
    glo.params.fractalize.scale.z = value;
    await remakeRibbon();
  });
  
  add_button("refractalize", "Refract", glo.buttonBottomSize, glo.buttonBottomHeight, glo.buttonBottomPaddingLeft, 0, async function(){
    if(glo.params.fractalize.actived){
      swapControlBackground("refractalize", glo.controlConfig.background, glo.controlConfig.backgroundActived);
      glo.params.fractalize.refractalize = !glo.params.fractalize.refractalize;
      await remakeRibbon();
    }
  }, undefined, panelButton, glo.controlConfig.background);
  add_button("fractalizeActive", "ON", glo.buttonBottomSize, glo.buttonBottomHeight, glo.buttonBottomPaddingLeft, 0, async function(){
    swapControlBackground("fractalizeActive", glo.controlConfig.background, glo.controlConfig.backgroundActived);
    glo.params.fractalize.actived = !glo.params.fractalize.actived;
    await remakeRibbon();
  }, undefined, panelButton2, glo.controlConfig.background);
  add_button("fractalizeRotActive", "No Rot", glo.buttonBottomSize, glo.buttonBottomHeight, glo.buttonBottomPaddingLeft, 0,
    async function(){
      await switchFractalOrient();
    },
    async function(){
      await switchFractalOrient(false);
    },
    panelButton2, glo.controlConfig.background);
  add_button("fractalizeScalingActive", "Scale", glo.buttonBottomSize, glo.buttonBottomHeight, glo.buttonBottomPaddingLeft, 0, async function(){
    swapControlBackground("fractalizeScalingActive", glo.controlConfig.background, glo.controlConfig.backgroundActived);
    glo.params.fractalize.scaleToDistPath = !glo.params.fractalize.scaleToDistPath;
    await remakeRibbon();
  }, undefined, panelButton2, glo.controlConfig.background);
  add_button("fractalizeLineOnMesh", "Line", glo.buttonBottomSize, glo.buttonBottomHeight, glo.buttonBottomPaddingLeft, 0, async function(){
    swapControlBackground("fractalizeLineOnMesh", glo.controlConfig.background, glo.controlConfig.backgroundActived);
    glo.params.fractalize.lineOnNewMeshes = !glo.params.fractalize.lineOnNewMeshes;
    await remakeRibbon();
  }, undefined, panelButton2, glo.controlConfig.background);
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
  glo.allControls.haveTheseClasses('panel', 'right', 'third').haveNotThisClass('noAutoParam').map(pr => {
    parmamControl(pr, '', '', { hAlign: 'right', vAlign: 'top', t: 33, }, false, false);
    if(pr.name && (pr.name == "param" || pr.name == "type")){ pr.width = '10%'; }
  });
  glo.allControls.haveTheseClasses('input', 'right', 'third').map(inp => {
    parmamControl(inp, '', '', { hAlign: 'right', vAlign: 'top', h: 22.5, background: 'grey', }, true, false);
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
