//*****************************************************************************************************//
//*********************************************BABYLON GUI*********************************************//
//*****************************************************************************************************//
/**
 * Subscribes a slider to mouse wheel events when hovered, allowing the user
 * to increment or decrement the slider value by its step amount.
 */
BABYLON.GUI.Slider.prototype.subscribeToKeyEventsOnHover = function() {
  this.onWheelObservable.add(function (e) {
      var val = e.y < 0 ? this.step : -this.step;
      this.value += val;
  }.bind(this));
};

/**
 * Subscribes an input text control to focus and blur events, applying
 * theme styles from {@link glo.theme.input} on focus and blur.
 */
BABYLON.GUI.InputText.prototype.subscribeToFocusAndBlurEvents = function() {
  this.onFocusObservable.add(() => {
    for(const prop in glo.theme.input.onFocus){ this[prop] = glo.theme.input.onFocus[prop]; }
  });

  this.onBlurObservable.add(() => {
    for(const prop in glo.theme.input.onBlur){ this[prop] = glo.theme.input.onBlur[prop]; }
  });
};

/**
 * Subscribes a slider to double-click behavior. On double-click above the
 * thumb, the slider maximum is doubled and the value is scaled up. On
 * double-click below the thumb, the value is halved and the maximum is
 * halved. This allows dynamic range adjustment.
 */
BABYLON.GUI.Slider.prototype.subscribeToDoubleClick = function () {
    var lastClick = 0;
    var valueBeforeFirstClick = null;
    var firstClickAbove = null;
    var DELAY = 300;

    this.onPointerDownObservable.add(function (info) {
        var now = Date.now();
        // Determine whether the click is above or below the thumb
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

/**
 * Subscribes a slider so that its maximum is automatically doubled whenever
 * the current value exceeds the maximum.
 */
BABYLON.GUI.Slider.prototype.subscribeToDoubleMax = function () {
    this.onValueChangedObservable.add(function (value) {
        if(this.maximum < this.value){ this.maximum = this.value * 2; }
    }.bind(this));
};

/**
 * Creates and initializes all GUI controls for the application.
 * Sets up the BabylonJS fullscreen GUI overlay and adds all panels including
 * sliders, buttons, inputs, color pickers, radio buttons, and shader controls.
 * This is the main entry point for GUI construction.
 */
function addGuiControls(){
  glo.advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, glo.scene);
  glo.advancedTexture.useSmallestIdeal = false;

  addSwitchAndHelpButtons();
  addAxisAndRotButtons();
  addUvSliders();
  addInputsEquations();
  addLinesAndDimButtons();

  addRadios();

  addStepUvSlider();
  addSwitchFormButtons();
  addViewsButtons();

  addColorPickers();
  addShadersCtrl();

  addStepABCDSliders();
  addSymmetrizeSliders();
  addBlenderSliders();
  addTransformationSliders();
  addSixthPanelSliders();
  addNinthPanelControls();
  addEleventhPanelSliders();

  guiControls_AddIdentificationFunctions();

  paramControls();
  paramButtons();
}

/**
 * Adds identification and query functions to the GUI controls collection.
 * Builds a cached Map for O(1) lookup by name and attaches helper methods
 * (getByName, haveThisClass, haveTheseClasses, haveNotThisClass,
 * haveNotTheseClass, hasThisClass) to {@link glo.allControls} for filtering
 * controls by CSS-like class names.
 */
function guiControls_AddIdentificationFunctions(){
  glo.allControls = glo.advancedTexture.getDescendants();
  // Cache Map for O(1) lookup by name instead of O(n) linear search
  glo._controlsByName = new Map();
  glo.allControls.forEach(elem => {
    if(typeof(elem) != 'undefined' && typeof(elem.name) != 'undefined' && elem.name){
      glo._controlsByName.set(elem.name, elem);
    }
  });
  /**
   * Finds a control by its name property.
   * Uses the cached Map for O(1) lookup when called on glo.allControls,
   * otherwise falls back to linear search.
   * @param {string} name - The name of the control to find.
   * @returns {BABYLON.GUI.Control|false} The matching control, or false if not found.
   */
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
  /**
   * Filters the controls array to return only those having the specified class.
   * @param {string} className - The class name to match.
   * @returns {Array<BABYLON.GUI.Control>} Controls matching the class.
   */
  function haveThisClass(className){
  	return haveThisClassOrNot(this, className, true);
  }
  /**
   * Filters the controls array to return only those NOT having the specified class.
   * @param {string} className - The class name to exclude.
   * @returns {Array<BABYLON.GUI.Control>} Controls not matching the class.
   */
  function haveNotThisClass(className){
  	return haveThisClassOrNot(this, className, false);
  }
  /**
   * Filters an array of controls by whether they have or lack a given class.
   * Attaches query methods (haveNotThisClass, haveNotTheseClass, etc.) to the result.
   * @param {Array<BABYLON.GUI.Control>} arr - The array of controls to filter.
   * @param {string} className - The class name to test against.
   * @param {boolean} have - If true, keep controls that have the class; if false, keep those that do not.
   * @returns {Array<BABYLON.GUI.Control>} The filtered controls with query methods attached.
   */
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
  /**
   * Filters the controls array to return only those having ALL the specified classes.
   * @param {...string} classesNames - The class names that must all be present.
   * @returns {Array<BABYLON.GUI.Control>|false} Matching controls, or false if none found.
   */
  function haveTheseClasses(...classesNames){
  	return haveTheseClassesOrNot(this, classesNames, true);
  }
  /**
   * Filters the controls array to return those NOT having ALL the specified classes.
   * @param {...string} classesNames - The class names to exclude.
   * @returns {Array<BABYLON.GUI.Control>|false} Matching controls, or false if none found.
   */
  function haveNotTheseClass(...classesNames){
  	return haveTheseClassesOrNot(this, classesNames, false);
  }
  /**
   * Filters an array of controls by whether they have or lack all given classes.
   * @param {Array<BABYLON.GUI.Control>} arr - The array of controls to filter.
   * @param {Array<string>} classesNames - The class names to test against.
   * @param {boolean} have - If true, keep controls having all classes; if false, keep those missing at least one.
   * @returns {Array<BABYLON.GUI.Control>|false} The filtered controls, or false if none match.
   */
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
  /**
   * Checks whether a single control has the specified class.
   * @param {string} className - The class name to check.
   * @returns {boolean} True if the control has the class, false otherwise.
   */
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

/**
 * Configures a BabylonJS GUI control with identification, alignment, sizing, and custom properties.
 * Shorthand option keys: w=width, h=height, t=top, l=left, pL=paddingLeft, pR=paddingRight, pT=paddingTop,
 * hAlign=horizontalAlignment ('left'|'right'|'center'), vAlign=verticalAlignment ('top'|'bottom'|'center').
 * @param {BABYLON.GUI.Control} control - The GUI control to configure.
 * @param {string} name - The control name for identification.
 * @param {string} className - Space-separated class names for filtering/styling.
 * @param {Object} [options={}] - Properties to set on the control, including shorthand keys.
 * @param {boolean} [px=false] - If true, use pixels ('px') as the unit; otherwise use percentages ('%').
 * @param {boolean} [ident=true] - If true, assign name and class to the control.
 */
function parmamControl(control, name, className, options = {}, px = false, ident = true){
  if(ident){
    control.name = name;
    control.class = className;
  }

  for(var prop in options){ control[prop] = options[prop] }

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
        control.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        break;
    }
  }

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

/**
 * Creates a titled panel header and adds it to the fullscreen GUI overlay.
 * @param {string} name - The unique name suffix for the panel and header controls.
 * @param {string} title - The display text for the title.
 * @param {number} t - The top position in percentage.
 * @param {string} [numUI='eighth'] - The UI panel class identifier (e.g., 'eighth', 'fourth noAutoParam').
 * @param {number} [titleLevel=2] - The title level (0-3) controlling font size (22px, 20px, 17px, 16px).
 */
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

/**
 * Creates multiple panel titles and control panels from a configuration object.
 * Each entry in paramsPanels can have a 'title' sub-object (passed to makePanelTitle)
 * and a 'ctrl' sub-object (passed to makePanelCtrl).
 * @param {Object} paramsPanels - Configuration object where each key maps to {title, ctrl} definitions.
 * @returns {Array<BABYLON.GUI.StackPanel>} Array of created control panels.
 */
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

/**
 * Creates a StackPanel control container and adds it to the fullscreen GUI overlay.
 * @param {string} name - The unique name suffix for the panel.
 * @param {number} t - The top position in percentage.
 * @param {number} pL - The left padding in percentage.
 * @param {boolean} [isVertical=false] - Whether the stack panel lays out children vertically.
 * @param {number} [h=5] - The height in percentage.
 * @param {string} [numUI='eighth'] - The UI panel class identifier.
 * @returns {BABYLON.GUI.StackPanel} The created stack panel.
 */
function makePanelCtrl(name, t, pL, isVertical = false, h = 5, numUI = 'eighth'){
  var panelCtrl = new BABYLON.GUI.StackPanel();
  parmamControl(panelCtrl, 'panelCtrl-' + name, 'panel right ' + numUI, {hAlign: 'right', vAlign: 'top', w: 20, h: h, t: t, pL: pL});
  panelCtrl.isVertical = isVertical;
  glo.advancedTexture.addControl(panelCtrl);

  return panelCtrl;
}

/**
 * Creates a labeled text input control with optional keyboard/paste event handling
 * and adds it to a parent panel. Supports Tab navigation between equation inputs
 * and triggers mesh rebuild on text changes.
 * @param {BABYLON.GUI.StackPanel} parent - The parent panel to add the input to.
 * @param {string} textHeader - The label text displayed above the input.
 * @param {string} textField - The initial text content of the input field (compact equation notation, e.g. "2cucv" for "2*cos(u)*cos(v)").
 * @param {string} name - The unique control name.
 * @param {string} classNameHeader - Space-separated class names for the header label.
 * @param {string} classNameInput - Space-separated class names for the input control.
 * @param {string} gloPropToModify - The property key in glo.params to update on text change.
 * @param {string} gloPropToAssignInput - The property key in glo to store a reference to the input control.
 * @param {boolean} [withEvent=true] - Whether to attach keyboard and paste event handlers.
 * @param {number|string} [width=354] - The width of the input (number for px, string for percentage).
 * @param {boolean} [isInPx=true] - Whether width/height values use pixels.
 */
function addInput(parent, textHeader, textField, name, classNameHeader, classNameInput, gloPropToModify, gloPropToAssignInput, withEvent = true, width = 354, isInPx = true){
  var header = new BABYLON.GUI.TextBlock();
  parmamControl(header, "header_" + name, classNameHeader, {text: textHeader, hAlign: 'center'});
  
  if(parent.name === 'inputsEquations'){ header.paddingLeft = "-6.85%"; }
  parent.addControl(header);

  var input = new BABYLON.GUI.InputText();
  parmamControl(input, name, classNameInput, {w: width, fontWeight: "500", fontSize: "19", text: textField, h:25}, isInPx);

  if(parent.name === 'inputsEquations' || parent.name === 'panelSymsEquations'){
    input.inputsEquationsIndex = glo.inputsEquationsIndex++;
  }

  /**
   * Rebuilds the ribbon mesh after an input change and restores focus to the input.
   * @async
   */
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
        var inputsEquationsLastIndex = inputsEquations.length - 3;
        var newIndex = 0;
        if(!event.shiftKey){
          if(input.inputsEquationsIndex < inputsEquationsLastIndex){ newIndex = input.inputsEquationsIndex + 1; }
          else{ newIndex = 0; }
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
      glo['params'][gloPropToModify] = text;
      
      if(event){ inputChangeEvent(); }
      glo.advancedTexture.moveFocusToControl(input);
    });
  }

  parent.addControl(input);

  glo[gloPropToAssignInput] = input;
}


/**
 * Creates a slider control with a text header and adds it to a parent panel.
 * The slider supports value change events, right-click reset to start value,
 * and double-click range adjustment.
 * @param {BABYLON.GUI.StackPanel} parent - The parent panel to add the slider to.
 * @param {string} name - The unique control name.
 * @param {string} text - The label text displayed in the header.
 * @param {number} val - The initial slider value.
 * @param {number} decimalPrecision - Number of decimal places for display.
 * @param {number} min - The minimum slider value.
 * @param {number} max - The maximum slider value.
 * @param {number} step - The slider step increment.
 * @param {Function} event - Callback invoked with the new value on change.
 * @param {string} [numUI='eighth'] - The UI panel class identifier.
 * @param {string} [classes='right'] - Additional class names for the slider.
 * @param {Function|false} [eventUp=false] - Optional callback invoked on pointer up.
 * @param {number} [fontSize=14] - The font size for the header text.
 */
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

/**
 * Creates a multi-axis slider with per-axis checkboxes (X/Y/Z or custom axes).
 * Each axis has a colored checkbox; checked axes receive the slider value on change.
 * The header color reflects the selected axis or white when multiple are selected.
 * Right-click resets to the start value.
 * @param {BABYLON.GUI.StackPanel} parent - The parent panel to add the slider group to.
 * @param {string} baseName - The base name for the slider control.
 * @param {string} text - The label text displayed in the header.
 * @param {number} val - The initial slider value.
 * @param {number} decimalPrecision - Number of decimal places for display.
 * @param {number} min - The minimum slider value.
 * @param {number} max - The maximum slider value.
 * @param {number} step - The slider step increment.
 * @param {Function} eventCallback - Callback invoked with (value, checkedAxes) on change.
 * @param {Array<string>} [axes=['x','y','z']] - The axis labels and keys.
 * @returns {{header: BABYLON.GUI.TextBlock, slider: BABYLON.GUI.Slider, axisState: Object}} References to the created controls and state.
 */
function addXYZSlider(parent, baseName, text, val, decimalPrecision, min, max, step, eventCallback, axes = ['x', 'y', 'z']) {
  const AXIS_COLORS = ['#ff6666', '#66ff66', '#6666ff'];

  var groupContainer = new BABYLON.GUI.StackPanel();
  groupContainer.isVertical = true;
  groupContainer.width = "100%";
  groupContainer.adaptHeightToChildren = true;
  parent.addControl(groupContainer);

  var header = new BABYLON.GUI.TextBlock();
  parmamControl(header, "header_" + baseName, 'header right eighth noAutoParam', {
    text: text + ": " + val,
    color: AXIS_COLORS[0],
    fontSize: 14,
    h: 20,
    pT: 4
  }, true);
  groupContainer.addControl(header);

  var rowContainer = new BABYLON.GUI.StackPanel();
  rowContainer.isVertical = false;
  rowContainer.height = "20px";
  rowContainer.width = "100%";
  groupContainer.addControl(rowContainer);

  var axisState = {};
  axes.forEach(function(axis, i) {
    axisState[axis] = { checked: i === 0, value: val };
  });

  axes.forEach(function(axis, i) {
    var checkbox = new BABYLON.GUI.Checkbox();
    checkbox.width = "16px";
    checkbox.height = "16px";
    checkbox.isChecked = axisState[axis].checked;
    checkbox.color = AXIS_COLORS[i];
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

    checkbox.onIsCheckedChangedObservable.add(function(checked) {
      axisState[axis].checked = checked;
      updateSliderDisplay();
    });

    axisState[axis].checkbox = checkbox;
  });

  var slider = new BABYLON.GUI.Slider();
  parmamControl(slider, baseName, 'slider right eighth', {
    minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 18.5, background: 'grey'
  }, true);
  slider.startValue = val;
  slider.width = "280px";
  rowContainer.addControl(slider);

  /**
   * Returns the list of currently checked axis keys.
   * @returns {Array<string>} Checked axis keys (e.g. ['x', 'z']).
   */
  function getCheckedAxes() {
    return axes.filter(function(axis) { return axisState[axis].checked; });
  }

  /**
   * Gets the display value based on the first checked axis, or the default value if none are checked.
   * @returns {number} The value to display.
   */
  function getDisplayValue() {
    var checked = getCheckedAxes();
    return checked.length === 0 ? val : axisState[checked[0]].value;
  }

  /**
   * Updates the slider position and header text/color to reflect the current axis selection.
   */
  function updateSliderDisplay() {
    var displayVal = getDisplayValue();
    var checked = getCheckedAxes();
    slider.value = displayVal;
    header.text = text + ": " + displayVal.toFixed(decimalPrecision);
    if (checked.length === 0) {
      header.color = 'grey';
    } else if (checked.length === 1) {
      header.color = AXIS_COLORS[axes.indexOf(checked[0])];
    } else {
      header.color = 'white';
    }
  }

  slider.onValueChangedObservable.add(function(value) {
    if (glo.rightButton) return;
    var checked = getCheckedAxes();
    header.text = text + ": " + value.toFixed(decimalPrecision);
    checked.forEach(function(axis) { axisState[axis].value = value; });
    slider.lastValue = value;
    eventCallback(value, checked);
  });

  slider.onPointerClickObservable.add(function(e) {
    if (e.buttonIndex == 2) {
      glo.rightButton = true;
      var checked = getCheckedAxes();
      checked.forEach(function(axis) { axisState[axis].value = slider.startValue; });
      slider.value = slider.startValue;
      header.text = text + ": " + slider.startValue.toFixed(decimalPrecision);
      eventCallback(slider.startValue, checked);
      glo.rightButton = false;
    }
  });

  updateSliderDisplay();

  return { header, slider, axisState };
}

/**
 * Applies visual styling (color, corner radius, background, font size) to a button control.
 * @param {BABYLON.GUI.Button} bt - The button to style.
 * @param {string} [color=glo.buttonsColor] - The text/border color.
 * @param {number} [cornerRadius=glo.buttonsRadius] - The corner radius in pixels.
 * @param {BABYLON.Color3} [background=defaultTheme.pickerColorButton] - The background color (normalized RGB, converted to hex).
 * @param {number} [fontSize=glo.buttonsFontsize] - The font size for the button text.
 */
function designButton(bt, color = glo.buttonsColor, cornerRadius = glo.buttonsRadius, background = defaultTheme.pickerColorButton, fontSize = glo.buttonsFontsize){
  bt.color = color; bt.cornerRadius = cornerRadius; bt.background = rgbNormalizedToHex(background); bt.textBlock.fontSize = fontSize;
}

/**
 * Creates a styled button control and adds it to a parent panel.
 * Left-click triggers eventLeft; right-click triggers eventRight.
 * @param {string} numUI - The UI panel class identifier.
 * @param {BABYLON.GUI.StackPanel} panel - The parent panel to add the button to.
 * @param {string} name - The unique control name.
 * @param {string} text - The button label text.
 * @param {number|string} width - The button width in pixels.
 * @param {number} height - The button height in pixels.
 * @param {number} paddingLeft - The left padding in pixels.
 * @param {number} paddingRight - The right padding in pixels.
 * @param {Function} eventLeft - Callback invoked on left-click.
 * @param {Function} [eventRight=eventLeft] - Callback invoked on right-click (defaults to eventLeft).
 * @param {string} [side='right'] - The side class ('right' or 'left').
 * @param {string|false} [hAlign=false] - Optional horizontal alignment ('left', 'right', 'center').
 */
function addButton(numUI, panel, name, text, width, height, paddingLeft, paddingRight, eventLeft, eventRight = eventLeft, side = 'right', hAlign = false){
    var button = BABYLON.GUI.Button.CreateSimpleButton(name, text);
    const options = {w: width, h: height, pL: paddingLeft, pR: paddingRight};
    if(hAlign){ options.hAlign = hAlign; }
    parmamControl(button, name, `button ${side} ${numUI}`, options, true);
    designButton(button);
    button.onPointerUpObservable.add(function(event) {
      if (event.buttonIndex !== 2){ if(typeof eventLeft === 'function'){eventLeft();} }
      else if(typeof eventRight === 'function'){ eventRight(); }
    });

    //if(hAlign){ button.horizontalAlignment = hAlign; }

    panel.addControl(button);
}

/**
 * Creates an invisible spacer rectangle for layout purposes.
 * @param {string} [height="20px"] - The height of the spacer.
 * @returns {BABYLON.GUI.Rectangle} A transparent rectangle control.
 */
function createSpacer(height = "20px") {
    const spacer = new BABYLON.GUI.Rectangle();
    spacer.width = "1px";
    spacer.height = height;
    spacer.thickness = 0;
    spacer.background = "transparent";
    return spacer;
}

/**
 * Creates the shader controls section including buttons for opening shader editors,
 * switching shaders, inverting colors, toggling lighting, and video recording.
 * Also creates lighting sliders (intensity, direction XYZ, radius, specular),
 * grid scale slider, and video crop box range slider.
 */
function addShadersCtrl(){
  const paramsPanels = {
    shaders: {
      title: {name: "Shaders", text: "Shaders", top: 24.25, numUI: 'fourth noAutoParam'},
      ctrl: { name: "Shaders", top: 27.25, paddingLeft: 1.75, isVertical: false, height: 5, numUI: 'fourth noAutoParam'}
    },
    normEquation: {
      title: {name: "normalDeformation", text: "Normal Deformation", top: 74.5, numUI: 'fourth noAutoParam'},
      ctrl: false,
    },
    lighting: {
      title:{ name: "Lighting", text: "Lighting", top: 24, numUI: 'seventh'},
      ctrl: { name: "Lighting", top: 30, numUI: 'seventh', paddingLeft: 9.25, isVertical: false, height: 5 }
    },
    light: {
      title: false,
      ctrl: { name: "LightSliders", top: 27.5, numUI: 'seventh', paddingLeft: 0.0, isVertical: true, height: 32 }
    },
    grid: {
      title:{ name: "GridParams", text: "Grid", top: 59.5, numUI: 'sixth', numUI: 'sixth noAutoParam'},
      ctrl: { name: "gridParamsSliders", top: 62.5, paddingLeft: 0.0, isVertical: true, height: 10, numUI: 'sixth noAutoParam' }
    },
    video: {
      title: {name: "Video", text: "Video", top: 65, numUI: 'fourth noAutoParam' },
      ctrl: { name: "Video", top: 65.5, paddingLeft: 0.5, isVertical: false, height: 10, numUI: 'fourth noAutoParam' }
    },
  };

  let panels = makePanelsTitles(paramsPanels);

  makePanelTitle('shadersVariablesPanelTitle', 'Shaders variables', 59.5, 'seventh noAutoParam title');

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

      glo.advancedTexture.getControlByName('videoButton').textBlock.text = glo.video.recording ? "⏹" : "►";

  });

  /**
   * Creates a horizontal slider inside a vertical container with header and value display.
   * Supports right-click reset and optional pointer-up callback.
   * @param {BABYLON.GUI.StackPanel} parent - The parent panel.
   * @param {string} name - The unique control name.
   * @param {string} text - The label text.
   * @param {number} val - The initial value.
   * @param {number} decimalPrecision - Number of decimal places for display.
   * @param {number} min - The minimum value.
   * @param {number} max - The maximum value.
   * @param {number} step - The step increment.
   * @param {Function} event - Callback invoked with the new value on change.
   * @param {Function|false} [upEvent=false] - Optional callback on pointer up.
   */
  function addHorizontalSlider(parent, name, text, val, decimalPrecision, min, max, step, event, upEvent = false) {
    // Create a vertical container for this slider
    var container = new BABYLON.GUI.StackPanel();
    container.isVertical = true;
    container.width  = "86.5%"; // Pour en mettre 2 côte à côte
    //container.height = "50%";
    
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

  /**
   * Updates a lighting float parameter in the global state and on the shader material.
   * @param {string} varName - The property name in glo.shaders.light.
   * @param {string} shaderVarName - The uniform name in the shader.
   * @param {number} varValue - The new float value.
   */
  function updLightingFloat(varName, shaderVarName, varValue){
    glo.shaders.light[varName] = varValue;
    if(glo.ribbon && glo.ribbon.shaderMeshInstance) glo.ribbon.shaderMeshInstance.updateFloatParam(shaderVarName, varValue);
  }
  /**
   * Updates a single axis of the light direction vector and pushes it to the shader.
   * @param {string} axis - The axis to update ('x', 'y', or 'z').
   * @param {number} value - The new axis value.
   */
  function updLightingVec3(axis, value){
    glo.shaders.light.direction[axis] = value;
    
    if(glo.ribbon && glo.ribbon.shaderMeshInstance) {
      let shaderMeshInstance = glo.ribbon.shaderMeshInstance;
      let direction = glo.shaders.light.direction;

      shaderMeshInstance._vecLampPos.set(direction.x, direction.y, direction.z);
      shaderMeshInstance.shaderMaterial.setVector3("lampPosition", shaderMeshInstance._vecLampPos);
    }
  }
  /**
   * Updates a specular lighting float parameter in the global state and on the shader material.
   * @param {string} varName - The property name in glo.shaders.light.specular.
   * @param {string} shaderVarName - The uniform name in the shader.
   * @param {number} varValue - The new float value.
   */
  function updLightingSpecularFloat(varName, shaderVarName, varValue){
    glo.shaders.light.specular[varName] = varValue;
    if(glo.ribbon && glo.ribbon.shaderMeshInstance) glo.ribbon.shaderMeshInstance.updateFloatParam(shaderVarName, varValue);
  }

  const lightInfos = glo.shaders.light;
  const dirRange   = 5;

  addSlider(panelLight, "lightIntensity", "Intensity", glo.shaders.light.intensity, 2, 0, 100, 0.01, async function(value){
    updLightingFloat('intensity', 'lampIntensity', value);
  }, 'seventh');
  addSlider(panelLight, "lightDirectionX", "Direction X", glo.shaders.light.direction.x, 2, -dirRange, dirRange, 0.01, async function(value){
    updLightingVec3('x', value);
  }, 'seventh');
  addSlider(panelLight, "lightDirectionY", "Direction Y", glo.shaders.light.direction.y, 2, -dirRange, dirRange, 0.01, async function(value){
    updLightingVec3('y', value);
  }, 'seventh');
  addSlider(panelLight, "lightDirectionZ", "Direction Z", glo.shaders.light.direction.z, 2, -dirRange, dirRange, 0.01, async function(value){
    updLightingVec3('z', value);
  }, 'seventh');
  addSlider(panelLight, "lightRadius", "Radius", lightInfos.radius, 2, 0, 100, 0.01, async function(value){
    updLightingFloat('radius', 'lampRadius', value);
  }, 'seventh');
  addSlider(panelLight, "lightSpecularIntensity", "Specular intesity", lightInfos.specular.intensity, 2, 0, 6, 0.01, async function(value){
    updLightingSpecularFloat('intensity', 'lampSpecularIntensity', value);
  }, 'seventh');
  addSlider(panelLight, "lightSpecularPower", "Specular power", lightInfos.specular.power, 2, 0, 2, 0.01, async function(value){
    updLightingSpecularFloat('power', 'lampSpecularPower', value);
  }, 'seventh');
  addSlider(panelGrid, "gridScaleSlider", "Scale", glo.params.gridScaleValue, 1, 0, 20, 1, async function(value){
    glo.params.gridScaleValue = value;
    glo.planSize  = value;
    glo.axisSize = value;

    glo.gridVisible = true;
    glo.axisVisible = true;
    glo.firstAxisVisible = false;

    showAxis(glo.axisSize, 1);

    glo.planesVisible = true;
    makePlanes();

    showGrid(value, value, value, 1);
  }, 'sixth');

  addHorizontalSlider(panelVideo, "videoBoxRange", "Box range", glo.videoBoxRange, 2, 0, 2.375, 0.01, async function(value){
    glo.videoBoxRange = value;
    updateVideoCropBox();
  }, function(){ hideVideoCropBox(); });
}

/**
 * Creates the bottom panel with HELP, SWITCH, and HIDE buttons.
 * HELP opens a modal dialog, SWITCH toggles the right panel,
 * and HIDE toggles visibility of all GUI controls.
 */
function addSwitchAndHelpButtons(){
  var panel = new BABYLON.GUI.StackPanel();
  var options = { isVertical: false, hAlign: 'right', vAlign: 'bottom', w: 17.125, pR:3, t: -1, };
  parmamControl(panel, 'hideSwitchHelp', 'panel right first noAutoParam', options);
  panel.height = "80px";
  glo.advancedTexture.addControl(panel);

  addButton("first", panel, "but_help", "HELP", glo.buttonBottomSize, glo.buttonBottomHeight, glo.buttonBottomPaddingLeft, 0, function(){
    if(glo.fullScreen){ glo.engine.switchFullscreen(); }
    var helpEl = getById('helpModal');
    M.Modal.init(helpEl, {
      onCloseEnd: function() {
        if(glo.fullScreen){ glo.engine.switchFullscreen(); }
      }
    });
    M.Modal.getInstance(helpEl).open();
  });

  addButton("first", panel, "but_switch", "SWITCH", glo.buttonBottomSize, glo.buttonBottomHeight, glo.buttonBottomPaddingLeft, 0,
             function(){ switchRightPanel(true); }, function(){ switchRightPanel(false); } );

  addButton("first", panel, "but_hide", "HIDE", glo.buttonBottomSize, glo.buttonBottomHeight, glo.buttonBottomPaddingLeft, 0, function(){
    const buthide = glo.advancedTexture.getControlByName('but_hide');
    buthide.textBlock.text = glo.guiSuitVisible ? "HIDE" : "👁️";

    toggleGuiControls(glo.guiSuitVisible);
    toggleRightPanels(glo.guiSelect, glo.guiSuitVisible);

    if(!glo.guiSuitVisible){
      buthide.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
      buthide.width        = '50px';
      buthide.paddingRight = '1px';
    }
    else{
      buthide.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
      buthide.width        = '90px';
      buthide.paddingRight = '1px';
    }

    glo.guiSuitVisible = !glo.guiSuitVisible;
  });
}
/**
 * Creates the top-right panel with AXIS, ROT (rotation type toggle),
 * fullscreen, and resolution buttons. Also listens for fullscreen
 * changes to resize the rendering engine.
 */
function addAxisAndRotButtons(){
  var panel = new BABYLON.GUI.StackPanel();
  var options = {isVertical: false, hAlign: 'right', vAlign: 'top', w: 15, h: 5, t: 18.75, pL: -2.5 };
  parmamControl(panel, 'axisAndRotButton', 'panel right first noAutoParam', options);
  panel.isVertical = false;
  glo.advancedTexture.addControl(panel);

  addButton("first", panel, "but_axis", "AXIS", 70, 30, 10, 0, function(){
    glo.axisVisible = !glo.axisVisible;
    if(glo.firstAxisVisible){ showAxis(glo.axisSize, 1); glo.firstAxisVisible = false; }
    else{
      switchAxis();
    }
  });

  /**
   * Updates the ROT button text to reflect the current rotation type (alpha, beta, theta, or none).
   * @param {string} [rotType=glo.rotateType.current] - The rotation type identifier.
   */
  function switchRotateTypeText(rotType = glo.rotateType.current){
    switch(rotType){
      case 'alpha':
        glo.advancedTexture.getControlByName("but_rot").textBlock.text = "Rot α";
      break;
      case 'beta' :
        glo.advancedTexture.getControlByName("but_rot").textBlock.text = "Rot β";
      break;
      case 'teta' :
        glo.advancedTexture.getControlByName("but_rot").textBlock.text = "Rot θ";
      break;
      case 'none' :
        glo.advancedTexture.getControlByName("but_rot").textBlock.text = "ROT";
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

  // Listen for fullscreen changes to resync the GUI
  document.addEventListener('fullscreenchange', () => {
      glo.fullScreen = !!document.fullscreenElement;
      button1.textBlock.text = glo.fullScreen ? "↘ S" : "↗ S";

      setTimeout(() => {
        if (!glo.fullScreen) {
            // After exiting fullscreen, clientHeight may still report
            // fullscreen dimensions. Force via inline style to ensure
            // engine.resize() reads the correct dimensions.
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
    glo.advancedTexture.getControlByName('but_resolution').textBlock.text = `Rx${glo.resolutionCoeff}`;
  }, function(){
    changeResolution('decrease');
    glo.advancedTexture.getControlByName('but_resolution').textBlock.text = `Rx${glo.resolutionCoeff}`;
  });
}
/**
 * Creates the top-left panel with GRID, PLAN, CART (coordinate type toggle),
 * IMP (import), and EXP (export) buttons.
 */
function addLinesAndDimButtons(){
  var topShift = 0;
  glo.formes.select.map( forme => {
    if(forme.typeCoords == glo.coordsType){ topShift+=glo.shiftLineDim; }
  });
  var topPanel = -3.42;

  var panel = new BABYLON.GUI.StackPanel();
  var options = {isVertical: false, hAlign: 'left', w: 20, h: 5, t: topPanel, pL: 1.75};
  parmamControl(panel, 'lineDim', 'panel left first noAutoParam', options);
  glo.advancedTexture.addControl(panel);

  addButton("first", panel, "but_grid", "GRID", 60, 30, 0, 0, async function(){
    glo.gridVisible = !glo.gridVisible;
    glo.axisVisible = glo.gridVisible;

    if(!glo.gridVisible){ switchGrid(); return; }

    showAxis(glo.axisSize, 1);
    glo.firstAxisVisible = false;
    const gridScale = glo.params.gridScaleValue;
    showGrid(gridScale, gridScale, gridScale, 1); glo.firstGridVisible = false;
  }, undefined, 'left');
  addButton("first", panel, "but_plan", "PLAN", 60, 30, 10, 0, function(){
    glo.planesVisible = !glo.planesVisible;
    makePlanes();
  }, undefined, 'left');
  addButton("first", panel, "but_coord", "CART", 70, 30, 10, 0, function(){switchCoords();}, function(){switchCoords(false);});
  addButton("first", panel, "but_import_obj", "IMP", 60, 30, 10, 0, function(){
    importModal();
  }, undefined, 'left');
  addButton("first", panel, "but_dimension", "EXP", 60, 30, 10, 0, function(){
    exportModal();
  }, undefined, 'left');
}
/**
 * Creates the bottom-left panel with navigation buttons ("<" and ">") to
 * page through the available parametric surface forms (radio button lists).
 */
function addSwitchFormButtons(){
  var panel = new BABYLON.GUI.StackPanel();
  var options = {isVertical: false, hAlign: 'left', vAlign: 'bottom', w: 20, l: 6.58, t: -1, };
  parmamControl(panel, 'panelswitchFormButton', 'panel right left noAutoParam', options);
  panel.height = '80px';
  glo.advancedTexture.addControl(panel);

  /**
   * Switches between the main and secondary form radio lists.
   * @param {boolean} [down=true] - If true, show the next page; if false, the previous.
   */
  function switchRadios(down = true){
    glo.formesSuit = down;
    addRadios(true);
    paramRadios();
  }
  

  addButton("first", panel, "but_goBack", "<", 60, 30, 10, 0, function(){switchRadios(false);}, undefined, 'left');
  addButton("first", panel, "but_goTo", ">", 60, 30, 10, 0, function(){switchRadios(true)}, undefined, 'left');
}

/**
 * Creates the view buttons panel (X, Y, Z) that orient the camera
 * along each axis. Toggling a button switches between positive and
 * negative views on that axis.
 */
function addViewsButtons(){
  var panel = new BABYLON.GUI.StackPanel();
  var options = {isVertical: false, hAlign: 'right', vAlign: 'top', w: 20, h: 5, t: 14.25, pL: 5.5  };
  parmamControl(panel, 'viewsButtonsPanel', 'panel right first noAutoParam', options);
  glo.advancedTexture.addControl(panel);

  /**
   * Updates the text labels of the X, Y, Z view buttons.
   * @param {...string} texts - The new text values for each button in order.
   */
  function changeButtonsTexts(...texts){
    var namesButtons = ["but_viewX", "but_viewY", "but_viewZ"];
    var n = 0;
    texts.map(text => {
      glo.advancedTexture.getControlByName(namesButtons[n]).textBlock.text = text;
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

/**
 * Creates the U and V range sliders on the left side of the GUI.
 * These sliders control the parametric range of the surface
 * (from -value to +value, or 0 to value if one-sign mode is active).
 * Supports right-click reset and mouse wheel adjustment.
 */
function addUvSliders(){
  /**
   * Creates a UV range slider with header, right-click reset, and mouse wheel support.
   * @param {string} name - Slider identifier ('u' or 'v')
   * @param {string} headerText - Display label for the slider header
   * @param {string} gloPropToModify - Property name in glo.params to modify
   * @param {string} gloPropToAssignInput - Property name in glo to store the slider reference
   */
  function addSlider(name, headerText, gloPropToModify, gloPropToAssignInput){
    var panel = new BABYLON.GUI.StackPanel();
    parmamControl(panel, "panel_" + name, 'panel left first noAutoParam', 
      {hAlign: 'left', vAlign: 'top', w: 20.5, t: 5 * (name == 'u' ? 0.2 : 1), pT: 5 * (name == 'u' ? 0.1 : 0.6), h: 7, pL: 0, l: -0.25 });
    glo.advancedTexture.addControl(panel);

    var minStart = -glo['params'][gloPropToModify].toFixed(2);
    var maxStart = glo['params'][gloPropToModify].toFixed(2);
    var header = new BABYLON.GUI.TextBlock();
    parmamControl(header, 'uvSliderHeader-' + name, 'header left first', {text: headerText + " : " + minStart + " — " + maxStart});
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
      if(!glo.skipRebuild){ await remakeRibbon(); }

      header.text = headerText + " : " + min + " — " + max;
    });
    slider.onPointerClickObservable.add(function (e) {
      if(e.buttonIndex == 2){ slider.value = slider.startValue; }
    });
    slider.onWheelObservable.add(function (e) {
      var val = e.y < 0 ? val = PI/8 : val = -PI/8; slider.value += val;
    });

    slider.subscribeToDoubleClick();

    panel.addControl(slider);
  }

  addSlider('u', 'U', 'u', 'sliderU');
  addSlider('v', 'V', 'v', 'sliderV');
}

/**
 * Creates radio buttons for form selection in the GUI.
 * @param {boolean} [suit=false] - Whether to show suit (second-class) forms only
 */
function addRadios(suit = false){
  var topShift = 0;
  var topShiftLineDim = 0;
  glo.formes.select.map( forme => {
    if(forme.typeCoords == glo.coordsType){ topShift+=glo.shiftRadios; topShiftLineDim+=glo.shiftLineDim; }
  });
  var topPanel = 51;

  if(glo.firstRadio){
    var panel = new BABYLON.GUI.StackPanel();
    panel.onWheelObservable.add(async function(event){
      glo.whellSwitchFormDown = event.y > 0 ? true : false;
      await whellSwitchForm();
    });
    var options = {hAlign: 'left', vAlign: 'top', w: 9.5, t: topPanel, pL: 0, l:7.5};
    parmamControl(panel, 'panelRadios', 'panel right first noAutoParam', options);
    glo.advancedTexture.addControl(panel);
    var header = new BABYLON.GUI.TextBlock();
    parmamControl(header, "header_forms", 'title header left first', {text: "Forms :", pR: 50});
    panel.addControl(header);
  }

  /**
   * Creates a single radio button with click handler for form switching.
   * @param {string} text - Display text and form name for the radio button
   * @param {BABYLON.GUI.StackPanel} parent - Parent panel to add the radio to
   * @param {string} group - Radio button group name
   * @param {boolean} [check=false] - Whether the radio is initially checked
   * @param {string} typeCoords - Coordinate type for the form
   */
  var addRadio = function(text, parent, group, check = false, typeCoords) {
    if(!glo.firstRadio){ check = false; }
    var button = new BABYLON.GUI.RadioButton();
    var options = {w: "13", h: "13", group: 'radiosForms', isChecked: check};
    parmamControl(button, "Radio-" + text, 'radio left first', options, true);
    for(const prop in glo.theme.radio.button){ button[prop] = glo.theme.radio.button[prop]; }
    
    const formSelected = glo.formes.getFormSelect().form;
    if(formSelected && formSelected.text === text && formSelected.typeCoords === typeCoords){
      button.isChecked = true;
    }

    button.onPointerClickObservable.add(async function(e) {
      if (e.buttonIndex === 0) {
        await glo.formes.setFormeSelect(text, glo.coordsType);
      }
      else{
        inputEquaToMorphing(glo.formes.getFormSelect().form.text);
      }
    });

    var header = BABYLON.GUI.Control.AddHeader(button, text, "200px", { isHorizontal: true, controlFirst: true });
    parmamControl(header, "headerRadio-" + text, 'header radio left first noAutoParam', {h: 20, pT: 4}, true);
    header.paddingLeft = "16%";
    for(const prop in glo.theme.radio.text){ header[prop] = glo.theme.radio.text[prop]; }

    var textBlock = header.children[1];
    textBlock.fontFamily = "Poppins";
    textBlock.fontWeight = 400;
    textBlock.fontSize = "14px";

    glo.radiosFormes.push({button: button, header: header});

    parent.addControl(header);
  }

  if(!glo.firstRadio){
    var panel = glo.advancedTexture.getControlByName('panelRadios');
    glo.advancedTexture.getControlByName('panelRadios').top = topPanel + '%';
    glo.formes.select.map( forme => {
        var radioForm = glo.radiosFormes.getByName("Radio-" + forme.text);
        if(radioForm != false){
          radioForm.button.dispose();
          radioForm.header.dispose();
        }
    });
  }

  glo.radiosFormes.length = 0;

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

  glo.firstRadio = false;
}

/**
 * Creates the equation input fields (X, Y, Z, rotations) and symmetrize/eval panels.
 */
function addInputsEquations(){
  var panel                = new BABYLON.GUI.StackPanel();
  var panelSymsEquations   = new BABYLON.GUI.StackPanel();
  let panelEvalY           = new BABYLON.GUI.StackPanel();

  parmamControl(panel, "inputsEquations", 'panel left first noAutoParam', {hAlign: 'left', vAlign: 'top', w: 21, pR: 0, t: 14.25, h: 30, pL: 0.375});

  var options = {hAlign: 'right', vAlign: 'top', w: 19.5, t: 27.5, pL: 0, pR: 0.5};
  parmamControl(panelEvalY, "panelEvalY", 'panel right sixth noAutoParam', options);
  options = {hAlign: 'right', vAlign: 'top', w: 19.125, t: 82, l: -0.375, pR: 0, pL:0};
  parmamControl(panelSymsEquations, "panelSymsEquations", 'panel right fourth noAutoParam', options);

  makePanelTitle("macrosVariables", "Macros variables", 24, "sixth noAutoParam");

  glo.advancedTexture.addControl(panel);
  glo.advancedTexture.addControl(panelSymsEquations);
  glo.advancedTexture.addControl(panelEvalY);

  glo.textInputAlpha = "";
  glo.textInputBeta  = "";

  addInput(panel, "X", "u", "inputX", "header left first", "input equation left first", "textInputX", "inputX", true, 366);
  addInput(panel, "Y", "usv", "inputY", "header left first", "input equation left first", "textInputY", "inputY", true, 366);
  addInput(panel, "Z", "ucvsu", "inputZ", "header left first", "input equation left first", "textInputZ", "inputZ", true, 366);
  addInput(panel, "Rot X", "", "inputTheta", "header left first", "input equation left first", "textInputTheta", "inputTheta", true, 366);
  addInput(panel, "Rot Y", "", "inputBeta", "header left first", "input equation left first", "textInputBeta", "inputBeta", true, 366);
  addInput(panel, "Rot Z", "", "inputAlpha", "header left first", "input equation left first", "textInputAlpha", "inputAlpha", true, 366);

  addInput(panelSymsEquations, "Equation", "", "inputRSymmetrize", "header right fourth noAutoParam", "input equation right fourth", "textInputSymR", "inputSymR", false, "100%");

  addInput(panelEvalY, "X", "u", "inputEvalX", "header right sixth", "input equation right sixth", "textInputEvalX", "inputEvalX", true, "100%");
  addInput(panelEvalY, "Y", "v", "inputEvalY", "header right sixth", "input equation right sixth", "textInputEvalY", "inputEvalY", true, "100%");

  // Ajouter un événement personnalisé pour R Symmetrize
  glo.inputSymR.onKeyboardEventProcessedObservable.add(async (event) => {
      let key = event.key;
      let text = glo.inputSymR.text;

      if (key !== "Control" && key !== "c" && key !== "v" && key !== "F12") {
          event.stopPropagation();
          event.preventDefault();
      }

      glo.params.textInputSymR = text;

      if (key === "Enter" || (key !== "Tab" && !key.match(/Arrow/g))) {
          glo.ribbon.shaderMeshInstance.updateDeformationExpression();
      }
      else if (key == "Tab") {
        var inputsEquations = glo.allControls.haveTheseClasses("input", "equation");
        var inputsEquationsLastIndex = inputsEquations.length - 3;
        var newIndex = 0;
        if(!event.shiftKey){
          if(glo.inputSymR.inputsEquationsIndex < inputsEquationsLastIndex){ newIndex = glo.inputSymR.inputsEquationsIndex + 1; }
          else{ newIndex = 0; }
          glo.advancedTexture.moveFocusToControl(inputsEquations[newIndex]);
        }
        else{
          if(glo.inputSymR.inputsEquationsIndex > 0){ newIndex = glo.inputSymR.inputsEquationsIndex - 1; }
          else{ newIndex = inputsEquationsLastIndex; }
          glo.advancedTexture.moveFocusToControl(inputsEquations[newIndex]);
        }
      }
  });

  glo.inputSymR.onTextPasteObservable.add(async () => {
      glo.params.textInputSymR = glo.inputSymR.text;

      glo.ribbon.shaderMeshInstance.updateDeformationExpression();
  });
}

/**
 * Creates step U/V sliders controlling mesh resolution.
 */
function addStepUvSlider(){
  /**
   * Creates a step slider for U or V resolution.
   * @param {string} name - Slider identifier ('stepU' or 'stepV')
   * @param {string} headerText - Display label for the slider header
   * @param {string} gloPropToModify - Property name in glo.params to modify
   * @param {string} gloPropToAssignInput - Property name in glo to store the slider reference
   */
  function addSlider(name, headerText, gloPropToModify, gloPropToAssignInput){
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

    //slider.subscribeToDoubleMax();

    glo[gloPropToAssignInput] = slider;
  }

  addSlider("stepU", "Steps U", "stepsU", "sliderStepsU");
  addSlider("stepV", "Steps V", "stepsV", "sliderStepsV");
}

/**
 * Creates color picker controls for UI and mesh colors.
 */
function addColorPickers(){
  var panel1           = new BABYLON.GUI.StackPanel();
  var panel2           = new BABYLON.GUI.StackPanel();
  var panelButtons     = new BABYLON.GUI.StackPanel();
  var panelLightLevel  = new BABYLON.GUI.StackPanel();
  var panelThemeButton = new BABYLON.GUI.StackPanel();

  var panelTitleUIBg        = new BABYLON.GUI.StackPanel();
  var panelTitleUIButton    = new BABYLON.GUI.StackPanel();
  var panelTitleMeshBg      = new BABYLON.GUI.StackPanel();
  var panelTitleMeshLine    = new BABYLON.GUI.StackPanel();

  var top     = {panel1: 32, panel2: 51, panel3: 56.5, panelButtons: 68, panelLightLevel: 74, panelThemeButton: 81.5};
  var options = {hAlign: 'right', vAlign: 'top', w: 20, h:15, t: top.panel1, pL: 2, isVertical: false};

  const paramsPanels = {
    section: {
      title: {name: "colorHeaderPan", text: "Colors", top: 24, numUI: 'first onlyMainGui noAutoParam', titleLevel: 1},
    },
    ui: {
      title: {name: "colorHeaderTitleUI", text: "UI", top: 28, numUI: 'first onlyMainGui noAutoParam', fontSize: 18},
    },
    mesh: {
      title: {name: "colorHeaderTitleMesh", text: "Mesh", top: 47, numUI: 'first onlyMainGui noAutoParam', fontSize: 18},
    },
    random: {
      title: {name: "colorHeaderTitleRandom", text: "Random", top: 66, numUI: 'first onlyMainGui noAutoParam', fontSize: 18},
    },
  };

  makePanelsTitles(paramsPanels);
  
  const hTest = 2;
  parmamControl(panelTitleUIBg, 'colorTitleUIBg', 'panel right first noAutoParam onlyMainGui', {hAlign: 'right', vAlign: 'top', w: 20, h: hTest, t: 32, pL: 4.666, isVertical: false});
  parmamControl(panelTitleUIButton, 'colorTitleUIButton', 'panel right first noAutoParam onlyMainGui', {hAlign: 'right', vAlign: 'top', w: 20, h: hTest, t: 32, pL: 11.25, isVertical: false});
  parmamControl(panelTitleMeshBg, 'colorTitleMeshBg', 'panel right first noAutoParam onlyMainGui', {hAlign: 'right', vAlign: 'top', w: 20, h: hTest, t: 51, pL: 4.666, isVertical: false});
  parmamControl(panelTitleMeshLine, 'colorTitleMeshLine', 'panel right first noAutoParam onlyMainGui', {hAlign: 'right', vAlign: 'top', w: 20, h: hTest, t: 51, pL: 11.5, isVertical: false});

  options.pL = 4.5;
  parmamControl(panel1, 'pickerColorPan1', 'panel right first noAutoParam onlyMainGui', options);
  options.t = top.panel2;
  parmamControl(panel2, 'pickerColorPan2', 'panel right first noAutoParam onlyMainGui', options);
  options.t = top.panel3;
  
  options.t = top.panelButtons; options.pL = 3.666;
  parmamControl(panelButtons, 'uiColorButtons', 'panel right first noAutoParam onlyMainGui', options);
  options.t = top.panelLightLevel; options.pL = 3.666; options.isVertical = true; options.h = 5; options.pL = 0; options.w = 13; options.l = -3.66;
  parmamControl(panelLightLevel, 'panelLightLevel', 'panel right first noAutoParam onlyMainGui', options);
  options.t = top.panelThemeButton; options.pL = 3.666; options.isVertical = true; options.h = 5; options.pL = 0; options.w = 13; options.l = -3.66;
  parmamControl(panelThemeButton, 'panelThemeButton', 'panel right first noAutoParam onlyMainGui', options);

  /**
   * Configures a text header for a color picker section.
   * @param {BABYLON.GUI.StackPanel} panel - Parent panel to add the header to
   * @param {BABYLON.GUI.TextBlock} header - The text block to configure
   * @param {string} text - Display text for the header
   * @param {Object} options - Configuration options (fontSize, name)
   */
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
  parmamControl(picker, 'pickerColorBackground', "picker right first onlyMainGui", { value: defaultTheme.pickerColorBackground, hAlign: 'center', w: glo.pickersSize, h: glo.pickersSize, pT: 5 }, true);
  picker.onValueChangedObservable.add(function(value) {
    glo.scene.clearColor = value;
    glo.backgroundColor = value;
    glo.newColor = "rgb(0,0,0)";
    glo.colorLineGrid = new BABYLON.Color3(0, 0, 0);
    if(value.r + value.g + value.b < 1.5){
      glo.newColor = "white";
      glo.colorLineGrid = new BABYLON.Color3(1, 1, 1);
    }
    glo.labelGridColor = glo.newColor;

    glo.allControls.haveThisClass('header').map(header => { header.color = glo.newColor; });
    glo.radiosFormes.changeColor(glo.newColor);

    if(typeof(glo.labelsAxis) != "undefined"){ glo.labelsAxis.map(labelAxis => { labelAxis.color = glo.newColor; }); }
    if(typeof(glo.labelsGrid) != "undefined"){ glo.labelsGrid.map(labelGrid => { labelGrid.color = glo.newColor; }); }

    var newColorLineGrid = glo.colorLineGrid;
    if(typeof(glo.gridX) != "undefined"){ glo.gridX.map(line => { line.color = newColorLineGrid; }); }
    if(typeof(glo.gridY) != "undefined"){ glo.gridY.map(line => { line.color = newColorLineGrid; }); }
    if(typeof(glo.gridZ) != "undefined"){ glo.gridZ.map(line => { line.color = newColorLineGrid; }); }

    glo.planes?.map(plane => { plane.material.emissiveColor = glo.backgroundColor.inv(); });

    if(glo.ribbon && glo.ribbon.shaderMeshInstance) {
      let shaderMeshInstance = glo.ribbon.shaderMeshInstance;

      shaderMeshInstance._backgroundCanvasColor.set(value.r, value.g, value.b);
      shaderMeshInstance.shaderMaterial.setVector3("backgroundColor", shaderMeshInstance._backgroundCanvasColor);
    }
  });

  var picker3 = new BABYLON.GUI.ColorPicker();
  parmamControl(picker3, 'pickerColorMeshBg', "picker right first onlyMainGui", { value: defaultTheme.pickerColorMeshBg, hAlign: 'center', w: glo.pickersSize, h: glo.pickersSize, pT: 5 }, true);
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
  parmamControl(picker4, 'pickerColorLine', "picker right first onlyMainGui", { value: defaultTheme.pickerColorLine, hAlign: 'center', w: glo.pickersSize, h: glo.pickersSize, pT: 5 }, true);
  picker4.onValueChangedObservable.add(function(value) {
      glo.lineColor = value;
      glo.ribbon.shaderMeshInstance.updateColors();
  });

  var picker5 = new BABYLON.GUI.ColorPicker();
  parmamControl(picker5, 'pickerColorButton', "picker right first onlyMainGui", { value: defaultTheme.pickerColorButton, hAlign: 'center', w: glo.pickersSize, h: glo.pickersSize, pT: 5 }, true);
  picker5.onValueChangedObservable.add(function(value) {
    glo.advancedTexture.getControlsByType('Button').forEach(button => {
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
      randomizeColorsApp();
  });

  addButton("first onlyMainGui noAutoParam", panelButtons, "randomUILightColorButton", "Light", "25%", 30, 10, 0, async function(){
      specialRandomizeColorsApp();
  });

  addButton("first onlyMainGui noAutoParam", panelButtons, "resetColorButton", "Reset", "25%", 30, 10, 0, async function(){
      intiColorUI();
      styleUI(0);
  });

  addSlider(panelLightLevel, "sliderLightLevel", "Light level", glo.randomizeColorLightLevel, 0, 0, 9, 1, function(value){
    glo.randomizeColorLightLevel = value;
    specialRandomizeColorsApp();
  }, "first");

  addButton("first onlyMainGui noAutoParam", panelThemeButton, "themeButton", "Theme: Default", "66.67%", 30, 0, 0, async function(){
    glo.advancedTexture.getControlByName('themeButton').textBlock.text = `Theme: ${glo.uiThemes.activateNextTheme()}`;
  },  async function(){
    glo.advancedTexture.getControlByName('themeButton').textBlock.text = `Theme: ${glo.uiThemes.activateNextTheme(false)}`;
  }, 'right', 'center');

  //glo.advancedTexture.getControlByName('themeButton').horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;

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
  glo.advancedTexture.addControl(panelLightLevel);
  glo.advancedTexture.addControl(panelThemeButton);
}

/**
 * Creates mesh variable sliders (A-M) and shader variable sliders (P, Q, S, T, U).
 */
function addStepABCDSliders(){
  makePanelTitle('paramEquationsSliders', 'Mesh variables', 24, 'second noAutoParam title');

  var panel = new BABYLON.GUI.StackPanel();
  parmamControl(panel, 'paramEquationsSlidersPanel', 'panel right second', {hAlign: 'right', vAlign: 'top', w: 20, t: 27});
  glo.advancedTexture.addControl(panel);

  var panelShadersVariables = new BABYLON.GUI.StackPanel();
  parmamControl(panelShadersVariables, 'paramEquationsSlidersPanel', 'panel right seventh', {hAlign: 'right', vAlign: 'top', w: 20, t: 63, pL: 0});
  glo.advancedTexture.addControl(panelShadersVariables);

  /**
   * Updates a float parameter on the shader mesh instance.
   * @param {string} param - Parameter name
   * @param {number} val - Parameter value
   */
  const updFloatParam       = (param, val) => { glo.ribbon.shaderMeshInstance.updateFloatParam(param, val); }
  /**
   * Updates a mesh variable (A-M) in glo.params and shader.
   * @param {string} param - Parameter name
   * @param {number} val - Parameter value
   */
  const updFloatABCDParam   = (param, val) => { glo.params[param] = val; updFloatParam(param, val); }
  /**
   * Updates a shader user variable and shader float param.
   * @param {string} param - Parameter name
   * @param {number} val - Parameter value
   */
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
  addSlider(panelShadersVariables, "shadersVariables-U", "Checkerboard", 2, 2, 0, 2, 0.01, function(value){ updFloatShaderParam("U", value) }, 'seventh');
}

/**
 * Creates symmetrize controls (X, Y, Z repetition, angle, checkerboard, scale).
 */
function addSymmetrizeSliders(){
  var panel          = new BABYLON.GUI.StackPanel();
  var panelButton    = new BABYLON.GUI.StackPanel();
  var panelCheckB    = new BABYLON.GUI.StackPanel();
  var panelScaleNorm = new BABYLON.GUI.StackPanel();
  parmamControl(panel, 'paramSymmetrizeSlidersPanel', 'panel right fourth noAutoParam', {hAlign: 'right', vAlign: 'top', w: 20, t: 35.5});
  parmamControl(panelButton, 'paramSymmetrizeSlidersPanelButton', 'panel right fourth noAutoParam', {isVertical: false, hAlign: 'right', vAlign: 'top', w: 16, t: 53, left:-66.67});
  parmamControl(panelCheckB, 'paramSymmetrizeSlidersPanelChekB', 'panel right fourth noAutoParam', {hAlign: 'right', vAlign: 'top', h: 5, w: 20, t: 59.25, pR: 0});
  parmamControl(panelScaleNorm, 'paramSymmetrizeSlidersPanelScaleNorm', 'panel right fourth noAutoParam', {hAlign: 'right', vAlign: 'top', h: 5, w: 20, t: 77.5, pR: 0});

  glo.advancedTexture.addControl(panel);
  glo.advancedTexture.addControl(panelCheckB);
  glo.advancedTexture.addControl(panelScaleNorm);
  glo.advancedTexture.addControl(panelButton);

  const paramsPanels = {
    shaders: {
      title: {name: "SymmetrizePanelTitle", text: "Symmetrize", top: 32.5, numUI: 'fourth noAutoParam'},
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
   
  addButton("fourth noAutoParam", panelButton, "symmetrizeOrder", "S order : XYZ", 127, 30, 0, 0, 
    function(value){ switchSymmetrizeOrder(true); }, function(value){ switchSymmetrizeOrder(false); });

  addButton("fourth noAutoParam", panelButton,"symmetrizeAdding", "S ADD", 127, 30, 10, 0, function(value){
    glo.addSymmetry = !glo.addSymmetry;
    glo.advancedTexture.getControlByName('symmetrizeAdding').textBlock.text = "S " + (glo.addSymmetry ? 'ADD' : 'MUL');
    remakeRibbon();
  });
}

/**
 * Creates blender U/O sliders for mesh blending.
 */
function addBlenderSliders(){
  var panel = new BABYLON.GUI.StackPanel();
  parmamControl(panel, 'paramBlenderSlidersPanel', 'panel right eighth noAutoParam', {hAlign: 'right', vAlign: 'top', w: 20, t: 27.5, pR: 0, pL: 0.5});
  glo.advancedTexture.addControl(panel);

  makePanelTitle('BlenderPanelTitle', 'Blend', 24, 'eighth noAutoParam');

  function updateBlender() {
    if (glo.ribbon && glo.ribbon.material && glo.ribbon.material.setVector4) {
      glo.ribbon.shaderMeshInstance.updateBlender();
    } else {
      remakeRibbon();
    }
  }

  addXYZSlider(panel, "blenderU", "U", 0, 2, -12, 12, .01, function(value, checked) {
    checked.forEach(function(axis) { glo.params.blender.u[axis] = value; });
    updateBlender();
  });
  addXYZSlider(panel, "blenderO", "O", 0, 2, -12, 12, .01, function(value, checked) {
    checked.forEach(function(axis) { glo.params.blender.O[axis] = value; });
    updateBlender();
  });//panel.background='green';
}

function addSixthPanelSliders(){
  let panelSliders                   = new BABYLON.GUI.StackPanel();
  let panelButton                    = new BABYLON.GUI.StackPanel();
  let panelButtonSlidersUVOnOneSignU = new BABYLON.GUI.StackPanel();
  let panelButtonSlidersUVOnOneSignV = new BABYLON.GUI.StackPanel();
  let panelTimeButtons               = new BABYLON.GUI.StackPanel();

  function addPanel(panel, name, top, isVertical = true, width = 20, height = undefined, numUI = 'sixth', paddingLeft = 0, left = 0){
    parmamControl(panel, name, `panel right ${numUI} noAutoParam`,
      {isVertical: isVertical, hAlign: 'right', vAlign: 'top', w: width, h: height, t: top, pR: 0.5, pL: paddingLeft, l: left}
    );
    glo.advancedTexture.addControl(panel);
  }
  function createIncrementer(start, increment) {
    let count = start - increment;
    return function() {
      count += increment;
      return count;
    };
  }
  addPanel(panelButton, 'panelButtonUvToXy', 38, true, 19.125, undefined, 'sixth', -0.33);
  addPanel(panelSliders, 'panelSliders', 45.5, true, 20, undefined, 'sixth', -0.5, 0.5);
  const posPanel = createIncrementer(57.5, 5);

  addPanel(panelButtonSlidersUVOnOneSignU, 'panelButtonSlidersUVOnOneSignU', posPanel(), false, 20, 4, 'eleventh', 1.42);
  addPanel(panelButtonSlidersUVOnOneSignV, 'panelButtonSlidersUVOnOneSignV', posPanel(), false, 20, 4, 'eleventh', 1.42);
  addPanel(panelTimeButtons, 'panelTimeButtons', 50, false, 20, 4, 'eleventh', 1.42);

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

  addButton("sixth", panelButton, "uvToXyButton", "UV → XY", 79.5, 30, 0, 0, function(value){
    glo.params.uvToXy = !glo.params.uvToXy;

    glo.advancedTexture.getControlByName("uvToXyButton").textBlock.text = glo.params.uvToXy ? "XY → UV" : "UV → XY";

    uvToXy();
    remakeRibbon();
  });

  makePanelTitle("firstPointOffset", "First point offset", 42.5, "sixth noAutoParam");

  addSlider(panelSliders, "firstPointOffsetX", "X", 1, 1, -24, 24, .5, function(value){ glo.firstPoint.x = value; });
  addSlider(panelSliders, "firstPointOffsetY", "Y", 0, 1, -24, 24, .5, function(value){ glo.firstPoint.y = value; });
  addSlider(panelSliders, "firstPointOffsetZ", "Z", 0, 1, -24, 24, .5, function(value){ glo.firstPoint.z = value; });

  const buttonSizes = {width: 150, height: 33};

  addButton("eleventh", panelButtonSlidersUVOnOneSignU,"slidersUVOnOneSignU", "Slider U sign : OUI", buttonSizes.width, buttonSizes.height, 0, 0, function(value){
    glo.slidersUVOnOneSign.u = !glo.slidersUVOnOneSign.u;
    let slidersUVOnOneSignU  = glo.advancedTexture.getControlByName('slidersUVOnOneSignU');

    slidersUVOnOneSignU.textBlock.text = "Slider U sign : " + (glo.slidersUVOnOneSign.u ? 'NON' : 'OUI');

    if(glo.slidersUVOnOneSign.u){
      slidersUVOnOneSignU.min = 0;
    }
    else{
      slidersUVOnOneSignU.min = -glo.params.u;
    }

    glo.advancedTexture.getControlByName('uvSliderHeader-u').text = 'U : ' + (Math.round(100 * slidersUVOnOneSignU.min, 2) / 100) + ' - ' + (Math.round(100 * glo.params.u, 2) / 100);

    remakeRibbon();
  });
  addButton("eleventh", panelButtonSlidersUVOnOneSignU,"slidersUVOnOneSignV", "Slider V sign : OUI", buttonSizes.width+35, buttonSizes.height, 35, 0, function(value){
    glo.slidersUVOnOneSign.v = !glo.slidersUVOnOneSign.v;
    let slidersUVOnOneSignV  = glo.advancedTexture.getControlByName('slidersUVOnOneSignV');

    slidersUVOnOneSignV.textBlock.text = "Slider V sign : " + (glo.slidersUVOnOneSign.v ? 'NON' : 'OUI');

    if(glo.slidersUVOnOneSign.v){
      slidersUVOnOneSignV.min = 0;
    }
    else{
      slidersUVOnOneSignV.min = -glo.params.v;
    }

    glo.advancedTexture.getControlByName('uvSliderHeader-v').text = 'V : ' + (Math.round(100 * slidersUVOnOneSignV.min, 2) / 100) + ' - ' + (Math.round(100 * glo.params.v, 2) / 100);

    remakeRibbon();
  });
  addButton("eleventh", panelButtonSlidersUVOnOneSignV, "InvFormulaCosSin", "Inv cos sin", buttonSizes.width, buttonSizes.height, 0, 0, function(value){
    invElemInInput("cos", "sin", false);
    invElemInInput("cu", "su", false);
    invElemInInput("cv", "sv");
    
  });
  addButton("eleventh", panelButtonSlidersUVOnOneSignV, "InvFormulaUV", "Inv UV", buttonSizes.width+35, buttonSizes.height, 35, 0, async function(value){
    await invElemInInput("u", "v");
  });
  addButton("eleventh", panelTimeButtons, "minusTimeButton", "Time -", 95, buttonSizes.height, 0, 0, async function(value){
    glo.timeCoeff /= 2;
  });
  addButton("eleventh", panelTimeButtons, "resetTimeButton", "Stop", 120, buttonSizes.height, 25, 0, async function(value){
    glo.savedTimeCoeff = glo.pause ? glo.savedTimeCoeff : glo.timeCoeff;
    glo.pause          = !glo.pause;

    glo.timeCoeff = glo.pause ? 0 : glo.savedTimeCoeff;

    glo.advancedTexture.getControlByName('resetTimeButton').textBlock.text = glo.pause ? 'PLAY' : 'STOP';
  });
  addButton("eleventh", panelTimeButtons, "majorTimeButton", "Time +", 120, buttonSizes.height, 25, 0, async function(value){
    glo.timeCoeff *= 2;
  });
}

function addEleventhPanelSliders(){
  let panelButton2      = new BABYLON.GUI.StackPanel();
  let panelButton3      = new BABYLON.GUI.StackPanel();
  let panelButton4      = new BABYLON.GUI.StackPanel();
  let panelButton6      = new BABYLON.GUI.StackPanel();
  let panelRotateCamera = new BABYLON.GUI.StackPanel();

  function addPanel(panel, name, top, isVertical = true, width = 20, height = 5, numUI = 'eleventh'){
    parmamControl(panel, name, `panel right ${numUI} noAutoParam`, {isVertical: isVertical, hAlign: 'right', vAlign: 'top', w: width, h: height, t: top});
    glo.advancedTexture.addControl(panel);
  }
  function createIncrementer(start, increment) {
    let count = start - increment;
    return function() {
      count += increment;
      return count;
    };
  }

  makePanelTitle("miscellaneous", "Miscellaneous", 24, 'eleventh', 2);

  const topPanels = 27.5;

  const posPanel = createIncrementer(topPanels, 5);

  addPanel(panelButton2, 'panelButtonEleventh2', posPanel(), false);
  addPanel(panelButton3, 'panelButtonEleventh3', posPanel(), false);
  addPanel(panelButton4, 'panelButtonEleventh4', posPanel(), false);
  addPanel(panelButton6, 'panelButtonEleventh6', 45, false);
  addPanel(panelRotateCamera, 'panelRotateCamera', 71.5, true, 20, 10, 'sixth');

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

  makePanelTitle("rotateSpeed", "Rotate", 68, "sixth", 2);
  addSlider(panelRotateCamera, "rotateSpeedSlider", "Speed", Math.round(glo.rotateSpeed*1000, 3)/1000, 3, -0.1, 0.1, 0.001, function(value){
    glo.rotateSpeed = value;
  }, "sixth", "sixth");

  panelRotateCamera.addControl(createSpacer("15px"));

  addButton("'sixth'", panelRotateCamera, "rotateViewButton", "+ ROT", 79.5, buttonSizes.height, 0, 0, function(value){
    glo.camera.alpha += PI/4;
  }, function(value){
    glo.camera.alpha -= PI/4;
  });
}

function addTransformationSliders(){
  var panel = new BABYLON.GUI.StackPanel();
  parmamControl(panel, 'paramTransformationSlidersPanel', 'panel right eighth noAutoParam', {hAlign: 'right', vAlign: 'top', w: 20, t: 54.75, pR: 0, pL: 0.5});
  glo.advancedTexture.addControl(panel);

  var panelVarColor = new BABYLON.GUI.StackPanel();
  parmamControl(panelVarColor, 'panelVarColor', 'panel right eighth noAutoParam', {hAlign: 'right', vAlign: 'top', w: 20, t: 77.75, pR: 0, pL: 0.5});
  glo.advancedTexture.addControl(panelVarColor);

  var panelVarColorTint = new BABYLON.GUI.StackPanel();
  parmamControl(panelVarColorTint, 'panelVarColorTint', 'panel right eighth noAutoParam', {hAlign: 'right', vAlign: 'top', w: 20, t: 82, pR: 0, pL: 0, pT: 1});
  glo.advancedTexture.addControl(panelVarColorTint);

  makePanelTitle('TransformationPanelTitle', 'Transformations', 51.25, 'eighth noAutoParam');
  makePanelTitle('panelVarColorTitle', 'Colors', 74.25, 'eighth noAutoParam');

  function updParamsTrans(baseName, axis, value) {
    glo.params[baseName + axis.toUpperCase()] = value;
    glo.params.meshTransformations[baseName][axis] = value;
  }

  addXYZSlider(panel, "scaling", "Scaling", 1, 2, 0, 24, .1, function(value, checked) {
    checked.forEach(function(axis) {
      updParamsTrans('scaling', axis, value);
      transformMesh('scaling', axis, value);
    });
  });

  addXYZSlider(panel, "rotation", "Rotation", 0, 3, -2*PI, 2*PI, PI/180, function(value, checked) {
    checked.forEach(function(axis) {
      updParamsTrans('rotation', axis, value);
      transformMesh('rotation', axis, value);
    });
  });

  addXYZSlider(panel, "position", "Position", 0, 2, -24, 24, .01, function(value, checked) {
    checked.forEach(function(axis) {
      updParamsTrans('position', axis, value);
      transformMesh('position', axis, value);
    });
  });

  addXYZSlider(panel, "cSymmetry", "Center Symmetry", 0, 1, -24, 24, .1, function(value, checked) {
    checked.forEach(function(axis) {
      updParamsTrans('cSymmetry', axis, value);
      glo.centerSymmetry[axis] = value;
    });
    if (glo.ribbon && glo.ribbon.shaderMeshInstance) {
      glo.ribbon.shaderMeshInstance.updateSymmetryCenter();
    }
  });

  function updColorsVec3(color, value) {
    glo.shaders.colors.toAdd[color] = value;
    if (glo.ribbon && glo.ribbon.shaderMeshInstance) {
      let shaderMeshInstance = glo.ribbon.shaderMeshInstance;
      const colorsToAdd = glo.shaders.colors.toAdd;
      shaderMeshInstance._colorsToAdd.set(colorsToAdd.r, colorsToAdd.g, colorsToAdd.b);
      shaderMeshInstance.shaderMaterial.setVector3("colorsToAdd", shaderMeshInstance._colorsToAdd);
    }
  }

  addXYZSlider(panelVarColor, "varingColor", "Add", 0, 2, -1, 1, .01, function(value, checked) {
    checked.forEach(function(axis) { updColorsVec3(axis, value); });
  }, ['r', 'g', 'b']);

  addSlider(panelVarColorTint, "varTintSlider", "Tint", 1, 2, 0, 2, 0.01,
    function(value){
      glo.shaders.colors.tint = value;

      if(glo.ribbon && glo.ribbon.shaderMeshInstance) {
        let shaderMeshInstance = glo.ribbon.shaderMeshInstance;
        shaderMeshInstance.shaderMaterial.setFloat("tintColor", value);
      }
    });
}

function addNinthPanelControls(){
  var panel = new BABYLON.GUI.StackPanel();
  parmamControl(panel, 'ninethPanelPanel', 'panel right eighth noAutoParam', {hAlign: 'right', vAlign: 'top', w: 20, t: 41, pR: 0, pL: 0.5});
  glo.advancedTexture.addControl(panel);

  makePanelTitle("waveTitlePanel", "Waves", 37.5, "eighth noAutoParam");

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
    sliderMain.width = "75%";  // Pourcentage du container parent
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
      minimum: minSecondary, maximum: maxSecondary, value: valSecondary, step: stepSecondary, h: 18.5, w: 380, pL: -5, background: 'grey'
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

function inputEquaToMorphing(targetFormName){
  const originFormName = glo.radiosFormes.getCheck().header.getDescendants()[1].text;
  const targetForm     = glo.formes.getFormByName(targetFormName, glo.coordsType);
  const originForm     = glo.formes.getFormByName(originFormName, glo.coordsType);

  /*const originForm = {
    fx: glo.params.textInputX,
    fy: glo.params.textInputY,
    fz: glo.params.textInputZ,
    alpha: glo.params.textInputAlpha,
    beta: glo.params.textInputBeta,
    theta: glo.params.textInputTheta,
  };*/

  const fields = [
    {equa: 'fx', code: 'x'}, 
    {equa: 'fy', code: 'y'},
    {equa: 'fz', code: 'z'},
    {equa: 'alpha', code: 'alpha'},
    {equa: 'beta', code: 'beta'},
    {equa: 'theta', code: 'theta'},
  ];

  fields.forEach(field => { if(!targetForm[field.equa]){ targetForm[field.equa] = '0'; } });
  fields.forEach(field => { if(!originForm[field.equa]){ originForm[field.equa] = '0'; } });

  fields.forEach(field => {
    glo['input_' + field.code].text = `q(${originForm[field.equa]}, ${targetForm[field.equa]}, cat)`;
    glo.params['text_input_' + field.code] = `q(${originForm[field.equa]}, ${targetForm[field.equa]}, cat)`;
  });

  remakeRibbon();
}

function paramButtons(){
  glo.allControls.haveThisClass('button').haveNotThisClass('noAutoParam').map(bt => { designButton(bt); });
}
function paramControls(){
  glo.allControls.haveTheseClasses('header').haveNotThisClass('noAutoParam').map(hd => {
    parmamControl(hd, '', '', { h: 20, color: 'white', fontSize: 16, }, true, false);
  });
  var prTop = 1.5;
  glo.allControls.haveTheseClasses('panel', 'right', 'first').haveNotThisClass('noAutoParam').map(pr => {
    parmamControl(pr, '', '', { hAlign: 'right', vAlign: 'top', w: 20, t: prTop, }, false, false);
    prTop += glo.mainTopShift;
  });
  prTop = 1.5;
  glo.allControls.haveTheseClasses('panel', 'left', 'first').haveNotThisClass('noAutoParam').map(pr => {
    parmamControl(pr, '', '', { hAlign: 'left', vAlign: 'top', w: 21, t: prTop, pL: 1, }, false, false);
    if(pr.name && (pr.name == "param" || pr.name == "type")){ pr.width = '10%'; }
    if(pr.name === "inputsEquations"){ pr.top = "20%"; }
    prTop += glo.mainTopShift;
  });
  glo.allControls.haveTheseClasses('slider', 'left', 'first').map(sr => {
    parmamControl(sr, '', '', { hAlign: 'left', vAlign: 'top', h: 20, w: 98.125, background: 'grey', }, false, false);
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

function toggleGuiControls(state){
  glo.allControls.haveTheseClasses('first').map(ct => {
    if(ct.name != "but_hide" && ct.name != "hideSwitchHelp"){ ct.isVisible = state; ct.isEnabled = state; }
  });
}
function toggleGuiControlsForSwitch(state){
  glo.allControls.haveTheseClasses('panel', 'onlyMainGui').map(pn => { pn.isVisible = state; pn.isEnabled = state; });
  glo.allControls.haveTheseClasses('header', 'onlyMainGui').map(hd => { hd.isVisible = state; hd.isEnabled = state; });
  glo.allControls.haveTheseClasses('picker', 'onlyMainGui').map(pr => { pr.isVisible = state; pr.isEnabled = state; });
}
function toggleGuiControlsSuit(state){
  glo.allControls.haveThisClass('second').map(ct => { ct.isVisible = state; ct.isEnabled = state; });
}
function toggleGuiControlsByClass(state, theClass){
  glo.allControls.haveThisClass(theClass).map(ct => { ct.isVisible = state; ct.isEnabled = state; });
}