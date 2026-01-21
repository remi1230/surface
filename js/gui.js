//*****************************************************************************************************//
//*********************************************BABYLON GUI*********************************************//
//*****************************************************************************************************//

//=================================================================================================//
//========================================== CLASSE BABGUI ==========================================//
//=================================================================================================//

class BabGui {
  constructor() {
    this.controls = new Map();      // Tous les contrôles indexés par nom
    this.panels = new Map();        // Tous les panneaux indexés par nom
    this.advancedTexture = null;
  }

  //-------------------------------------------------------------------------------------------//
  //--------------------------------- MÉTHODES D'IDENTIFICATION -------------------------------//
  //-------------------------------------------------------------------------------------------//

  // Récupérer un contrôle par son nom
  getByName(name) {
    return this.controls.get(name) || null;
  }

  // Récupérer tous les contrôles sous forme de tableau
  getAllControls() {
    return Array.from(this.controls.values());
  }

  // Filtrer les contrôles qui ont cette classe
  haveThisClass(className) {
    const reg = new RegExp("\\b" + className + "\\b");
    const result = this.getAllControls().filter(ctrl =>
      ctrl.class && ctrl.class.match(reg) !== null
    );
    return this._wrapResult(result);
  }

  // Filtrer les contrôles qui ont toutes ces classes
  haveTheseClasses(...classNames) {
    const regs = classNames.map(cn => new RegExp("\\b" + cn + "\\b"));
    const result = this.getAllControls().filter(ctrl => {
      if (!ctrl.class) return false;
      return regs.every(reg => ctrl.class.match(reg) !== null);
    });
    return this._wrapResult(result);
  }

  // Filtrer les contrôles qui n'ont pas cette classe
  haveNotThisClass(className) {
    const reg = new RegExp("\\b" + className + "\\b");
    const result = this.getAllControls().filter(ctrl =>
      ctrl.class && ctrl.class.match(reg) === null
    );
    return this._wrapResult(result);
  }

  // Filtrer les contrôles qui n'ont aucune de ces classes
  haveNotTheseClasses(...classNames) {
    const regs = classNames.map(cn => new RegExp("\\b" + cn + "\\b"));
    const result = this.getAllControls().filter(ctrl => {
      if (!ctrl.class) return true;
      return regs.every(reg => ctrl.class.match(reg) === null);
    });
    return this._wrapResult(result);
  }

  // Wrapper pour chaîner les méthodes de filtrage sur les résultats
  _wrapResult(arr) {
    if (arr.length === 0) return [];

    arr.getByName = (name) => arr.find(c => c.name === name) || null;
    arr.haveThisClass = (className) => {
      const reg = new RegExp("\\b" + className + "\\b");
      return this._wrapResult(arr.filter(ctrl => ctrl.class && ctrl.class.match(reg) !== null));
    };
    arr.haveTheseClasses = (...classNames) => {
      const regs = classNames.map(cn => new RegExp("\\b" + cn + "\\b"));
      return this._wrapResult(arr.filter(ctrl => {
        if (!ctrl.class) return false;
        return regs.every(reg => ctrl.class.match(reg) !== null);
      }));
    };
    arr.haveNotThisClass = (className) => {
      const reg = new RegExp("\\b" + className + "\\b");
      return this._wrapResult(arr.filter(ctrl => ctrl.class && ctrl.class.match(reg) === null));
    };
    arr.haveNotTheseClasses = (...classNames) => {
      const regs = classNames.map(cn => new RegExp("\\b" + cn + "\\b"));
      return this._wrapResult(arr.filter(ctrl => {
        if (!ctrl.class) return true;
        return regs.every(reg => ctrl.class.match(reg) === null);
      }));
    };

    return arr;
  }

  // Vérifier si un contrôle a une classe donnée
  hasThisClass(control, className) {
    const reg = new RegExp("\\b" + className + "\\b");
    return control.class && control.class.match(reg) !== null;
  }

  //-------------------------------------------------------------------------------------------//
  //--------------------------------- MÉTHODES DE PARAMÉTRAGE ---------------------------------//
  //-------------------------------------------------------------------------------------------//

  // Appliquer des options à un contrôle (équivalent de parmamControl)
  applyOptions(control, name, className, options = {}, px = false, ident = true) {
    if (ident) {
      control.name = name;
      control.class = className;
    }

    // Alignement horizontal
    if (options.hAlign) {
      const alignMap = {
        'left': BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT,
        'right': BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT,
        'center': BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER
      };
      control.horizontalAlignment = alignMap[options.hAlign];
    }

    // Alignement vertical
    if (options.vAlign) {
      const alignMap = {
        'bottom': BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM,
        'top': BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP,
        'center': BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER
      };
      control.verticalAlignment = alignMap[options.vAlign];
    }

    // Appliquer toutes les autres options directement
    for (const prop in options) {
      if (!['w', 'h', 't', 'l', 'pL', 'pR', 'pT', 'hAlign', 'vAlign'].includes(prop)) {
        control[prop] = options[prop];
      }
    }

    // Dimensions et positions avec unité
    const unit = px ? 'px' : '%';
    if (options.w !== undefined) control.width = options.w + unit;
    if (options.h !== undefined) control.height = options.h + unit;
    if (options.t !== undefined) control.top = options.t + unit;
    if (options.l !== undefined) control.left = options.l + unit;
    if (options.pL !== undefined) control.paddingLeft = options.pL + unit;
    if (options.pR !== undefined) control.paddingRight = options.pR + unit;
    if (options.pT !== undefined) control.paddingTop = options.pT + unit;

    return control;
  }

  // Appliquer le style par défaut aux boutons
  designButton(button, color, cornerRadius, background, fontSize) {
    button.color = color || glo.buttons_color;
    button.cornerRadius = cornerRadius || glo.buttons_radius;
    button.background = background || glo.buttons_background;
    if (button.textBlock) {
      button.textBlock.fontSize = fontSize || glo.buttons_fontsize;
    }
  }

  //-------------------------------------------------------------------------------------------//
  //--------------------------------- MÉTHODES DE CRÉATION ------------------------------------//
  //-------------------------------------------------------------------------------------------//

  // Initialiser l'AdvancedDynamicTexture
  init() {
    this.advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, glo.scene);
    this.advancedTexture.useSmallestIdeal = true;
    glo.advancedTexture = this.advancedTexture;
  }

  // Enregistrer un contrôle
  register(control) {
    if (control.name) {
      this.controls.set(control.name, control);
    }
    // Ajouter la méthode hasThisClass à chaque contrôle
    control.hasThisClass = (className) => this.hasThisClass(control, className);
    return control;
  }

  // Créer un panneau (StackPanel)
  createPanel(config) {
    const panel = new BABYLON.GUI.StackPanel();

    this.applyOptions(panel, config.name, config.className, config.options || {}, config.px || false);

    if (config.isVertical !== undefined) panel.isVertical = config.isVertical;
    if (config.height) panel.height = config.height;
    if (config.width) panel.width = config.width;

    this.advancedTexture.addControl(panel);
    this.panels.set(config.name, panel);
    this.register(panel);

    return panel;
  }

  // Créer un bouton
  createButton(config) {
    const button = BABYLON.GUI.Button.CreateSimpleButton(config.name, config.text);

    this.applyOptions(button, config.name, config.className, config.options || {}, config.px !== false);

    if (config.styled !== false) {
      this.designButton(button, config.color, config.cornerRadius, config.background, config.fontSize);
    }

    // Événements
    if (config.onLeftClick || config.onRightClick) {
      button.onPointerUpObservable.add((event) => {
        if (event.buttonIndex !== 2 && config.onLeftClick) {
          config.onLeftClick(event);
        } else if (event.buttonIndex === 2 && config.onRightClick) {
          config.onRightClick(event);
        }
      });
    }

    if (config.onClick) {
      button.onPointerUpObservable.add(config.onClick);
    }

    // Ajouter au parent
    if (config.parent) {
      config.parent.addControl(button);
    } else if (config.panelName && this.panels.has(config.panelName)) {
      this.panels.get(config.panelName).addControl(button);
    }

    this.register(button);
    return button;
  }

  // Créer un header (TextBlock)
  createHeader(config) {
    const header = new BABYLON.GUI.TextBlock();

    const options = { text: config.text, ...config.options };
    this.applyOptions(header, config.name || ('header_' + config.text), config.className, options, config.px || false);

    if (config.parent) {
      config.parent.addControl(header);
    }

    this.register(header);
    return header;
  }

  // Créer un slider
  createSlider(config) {
    const panel = new BABYLON.GUI.StackPanel();
    this.applyOptions(panel, 'panel_' + config.name, config.panelClassName || 'panel ' + config.className);
    this.advancedTexture.addControl(panel);
    this.panels.set('panel_' + config.name, panel);
    this.register(panel);

    // Header
    const headerText = config.headerText + (config.showValue !== false ? ' : ' + config.value : '');
    const header = new BABYLON.GUI.TextBlock();
    this.applyOptions(header, 'header_' + config.name, 'header ' + config.className, { text: headerText });
    panel.addControl(header);
    this.register(header);

    // Slider
    const slider = new BABYLON.GUI.Slider();
    this.applyOptions(slider, config.name, 'slider ' + config.className, {
      minimum: config.min || 0,
      maximum: config.max || 100,
      value: config.value || 0,
      step: config.step,
      startValue: config.value
    });

    if (config.gloProp) {
      glo[config.gloProp] = slider;
    }

    // Événement de changement de valeur
    slider.onValueChangedObservable.add(async (value) => {
      if (config.showValue !== false) {
        let displayMin = config.signed ? -value.toFixed(2) : (config.min || 0);
        let displayMax = value.toFixed(2);

        if (config.formatHeader) {
          header.text = config.formatHeader(value, displayMin, displayMax);
        } else if (config.signed) {
          header.text = config.headerText + ' : ' + displayMin + ' — ' + displayMax;
        } else {
          header.text = config.headerText + ' : ' + value.toFixed(config.decimals || 0);
        }
      }

      if (config.onChange) {
        await config.onChange(value);
      }
    });

    // Clic droit pour reset
    slider.onPointerClickObservable.add((e) => {
      if (e.buttonIndex === 2) {
        slider.value = slider.startValue;
      }
    });

    // Molette
    slider.onWheelObservable.add((e) => {
      const val = e.y < 0 ? (config.wheelStep || config.step || 0.1) : -(config.wheelStep || config.step || 0.1);
      slider.value += val;
    });

    if (config.onPointerUp) {
      slider.onPointerUpObservable.add(config.onPointerUp);
    }

    panel.addControl(slider);
    this.register(slider);

    return { panel, header, slider };
  }

  // Créer un input text
  createInput(config) {
    const header = new BABYLON.GUI.TextBlock();
    this.applyOptions(header, 'header_' + config.name, config.headerClassName || ('header ' + config.className), { text: config.headerText });

    if (config.parent) {
      config.parent.addControl(header);
    }
    this.register(header);

    const input = new BABYLON.GUI.InputText();
    this.applyOptions(input, config.name, 'input ' + config.className, {
      text: config.text || '',
      fontWeight: config.fontWeight || '500',
      fontSize: config.fontSize || '19',
      w: config.width || 350,
      h: config.height || 25
    }, true);

    if (config.gloProp) {
      glo[config.gloProp] = input;
    }

    if (config.onKeyboard) {
      input.onKeyboardEventProcessedObservable.add(config.onKeyboard);
    }

    if (config.onPaste) {
      input.onTextPasteObservable.add(config.onPaste);
    }

    if (config.parent) {
      config.parent.addControl(input);
    }

    this.register(input);
    return { header, input };
  }

  // Créer un color picker
  createColorPicker(config) {
    const picker = new BABYLON.GUI.ColorPicker();

    this.applyOptions(picker, config.name, 'picker ' + config.className, {
      value: config.value || new BABYLON.Color3(1, 1, 1),
      height: config.height || '80px',
      width: config.width || '80px'
    }, true);

    if (config.onChange) {
      picker.onValueChangedObservable.add(config.onChange);
    }

    if (config.parent) {
      config.parent.addControl(picker);
    }

    this.register(picker);
    return picker;
  }

  // Créer une checkbox
  createCheckbox(config) {
    const checkbox = new BABYLON.GUI.Checkbox();

    this.applyOptions(checkbox, config.name, 'checkbox ' + config.className, {
      width: config.width || '20px',
      height: config.height || '20px',
      isChecked: config.checked || false,
      color: config.color || 'white',
      background: config.background || 'grey'
    }, true);

    if (config.onChange) {
      checkbox.onIsCheckedChangedObservable.add(config.onChange);
    }

    if (config.parent) {
      config.parent.addControl(checkbox);
    }

    this.register(checkbox);
    return checkbox;
  }

  // Créer un radio button
  createRadio(config) {
    const radio = new BABYLON.GUI.RadioButton();

    this.applyOptions(radio, config.name, 'radio ' + config.className, {
      width: config.width || '13px',
      height: config.height || '13px',
      group: config.group,
      isChecked: config.checked || false
    }, true);

    for (const prop in glo.theme.radio.button) {
      radio[prop] = glo.theme.radio.button[prop];
    }

    if (config.onClick) {
      radio.onPointerClickObservable.add(config.onClick);
    }

    const header = BABYLON.GUI.Control.AddHeader(radio, config.text, config.headerWidth || '200px', {
      isHorizontal: true,
      controlFirst: true
    });

    this.applyOptions(header, 'headerRadio-' + config.text, 'header radio ' + config.className + ' noAutoParam', {
      h: 20,
      pT: 4
    }, true);

    header.paddingLeft = config.paddingLeft || '16%';
    for (const prop in glo.theme.radio.text) {
      header[prop] = glo.theme.radio.text[prop];
    }

    const textBlock = header.children[1];
    textBlock.fontSize = config.fontSize || '17px';

    if (config.parent) {
      config.parent.addControl(header);
    }

    this.register(radio);
    return { radio, header };
  }

  // Créer un titre de panneau
  createPanelTitle(config) {
    const header = new BABYLON.GUI.TextBlock();
    header.text = config.title;
    header.color = 'white';
    header.fontSize = config.fontSize || 17;
    header.height = '30px';
    header.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;

    this.applyOptions(header, config.name, config.className || 'header right noAutoParam', {
      hAlign: 'right',
      vAlign: 'top',
      t: config.top,
      pL: config.paddingLeft || 2
    });

    this.advancedTexture.addControl(header);
    this.register(header);
    return header;
  }

  //-------------------------------------------------------------------------------------------//
  //--------------------------------- AUTO-PARAMÉTRAGE ----------------------------------------//
  //-------------------------------------------------------------------------------------------//

  // Appliquer les styles par défaut aux contrôles (remplace param_controls et param_buttons)
  applyDefaultStyles() {
    // Boutons
    this.haveThisClass('button').haveNotThisClass('noAutoParam').forEach(bt => {
      this.designButton(bt);
    });

    // Headers
    this.haveTheseClasses('header').haveNotThisClass('noAutoParam').forEach(hd => {
      this.applyOptions(hd, '', '', { h: 20, color: 'white', fontSize: 16 }, true, false);
    });

    // Panels right first
    let prTop = 1.5;
    this.haveTheseClasses('panel', 'right', 'first').haveNotThisClass('noAutoParam').forEach(pr => {
      this.applyOptions(pr, '', '', { hAlign: 'right', vAlign: 'top', w: 20, t: prTop }, false, false);
      prTop += glo.mainTopShift;
    });

    // Sliders right first
    this.haveTheseClasses('slider', 'right', 'first').forEach(sr => {
      this.applyOptions(sr, '', '', { hAlign: 'right', vAlign: 'top', h: 20, background: 'grey' }, true, false);
      sr.paddingRight = '1%';
    });

    // Panels left first
    prTop = 1.5;
    this.haveTheseClasses('panel', 'left', 'first').haveNotThisClass('noAutoParam').forEach(pr => {
      this.applyOptions(pr, '', '', { hAlign: 'left', vAlign: 'top', w: 20, t: prTop, pL: 1 }, false, false);
      if (pr.name && (pr.name === 'param' || pr.name === 'type')) pr.width = '10%';
      if (pr.name === 'inputsEquations') pr.top = '20%';
      prTop += glo.mainTopShift;
    });

    // Sliders left first
    this.haveTheseClasses('slider', 'left', 'first').forEach(sr => {
      this.applyOptions(sr, '', '', { hAlign: 'left', vAlign: 'top', h: 20, background: 'grey' }, true, false);
      sr.paddingLeft = '1%';
    });

    // Inputs left first
    this.haveTheseClasses('input', 'left', 'first').forEach(inp => {
      this.applyOptions(inp, '', '', { hAlign: 'left', vAlign: 'top', h: 22.5, background: 'grey' }, true, false);
      inp.paddingLeft = '1%';
    });

    // Panels right fourth
    this.haveTheseClasses('panel', 'right', 'fourth').haveNotThisClass('noAutoParam').forEach(pr => {
      this.applyOptions(pr, '', '', { hAlign: 'right', vAlign: 'top', t: 33 }, false, false);
      if (pr.name && (pr.name === 'param' || pr.name === 'type')) pr.width = '10%';
    });

    // Inputs right fourth
    this.haveTheseClasses('input', 'right', 'fourth').forEach(inp => {
      this.applyOptions(inp, '', '', { hAlign: 'right', vAlign: 'top', h: 22.5, background: 'grey' }, true, false);
    });

    // Activer les événements sur les sliders et inputs
    this.haveThisClass('slider').forEach(slider => {
      slider.subscribeToKeyEventsOnHover();
    });
    this.haveThisClass('input').forEach(input => {
      input.subscribeToFocusAndBlurEvents();
    });
  }

  //-------------------------------------------------------------------------------------------//
  //--------------------------------- UTILITAIRES DE TOGGLE -----------------------------------//
  //-------------------------------------------------------------------------------------------//

  toggleByClass(state, className) {
    this.haveThisClass(className).forEach(ct => {
      ct.isVisible = state;
      ct.isEnabled = state;
    });
  }

  toggleByClasses(state, ...classNames) {
    this.haveTheseClasses(...classNames).forEach(ct => {
      ct.isVisible = state;
      ct.isEnabled = state;
    });
  }
}

//=================================================================================================//
//======================================= INSTANCE GLOBALE ========================================//
//=================================================================================================//

const babGui = new BabGui();

//=================================================================================================//
//==================================== EXTENSIONS PROTOTYPES ======================================//
//=================================================================================================//

BABYLON.GUI.Slider.prototype.subscribeToKeyEventsOnHover = function() {
  this.onWheelObservable.add(function(e) {
    const val = e.y < 0 ? this.step : -this.step;
    this.value += val;
  }.bind(this));
};

BABYLON.GUI.InputText.prototype.subscribeToFocusAndBlurEvents = function() {
  this.onFocusObservable.add(() => {
    for (const prop in glo.theme.input.onFocus) {
      this[prop] = glo.theme.input.onFocus[prop];
    }
  });

  this.onBlurObservable.add(() => {
    for (const prop in glo.theme.input.onBlur) {
      this[prop] = glo.theme.input.onBlur[prop];
    }
  });
};

//=================================================================================================//
//==================================== DÉFINITIONS DES CONTRÔLES ==================================//
//=================================================================================================//

// Configuration des panneaux
const PANELS_CONFIG = {
  hideSwitchHelp: {
    name: 'hideSwitchHelp',
    className: 'panel right first noAutoParam',
    options: { isVertical: false, hAlign: 'right', vAlign: 'bottom', w: 20, l: 3, t: -1 },
    height: '80px'
  },
  axisAndRotButton: {
    name: 'axisAndRotButton',
    className: 'panel right first noAutoParam',
    options: { isVertical: false, hAlign: 'right', vAlign: 'top', w: 15, h: 5, t: 20, pL: -2.5 },
    isVertical: false
  },
  lineDim: {
    name: 'lineDim',
    className: 'panel left first noAutoParam',
    options: { isVertical: false, hAlign: 'left', w: 20, h: 5, t: -3, pL: 1.77 }
  },
  panelHistoButton: {
    name: 'panelHistoButton',
    className: 'panel right left noAutoParam',
    options: { isVertical: false, hAlign: 'left', vAlign: 'bottom', w: 20, l: 5.66, t: -1 },
    height: '80px'
  },
  viewsButtonsPanel: {
    name: 'viewsButtonsPanel',
    className: 'panel right first noAutoParam',
    options: { isVertical: false, hAlign: 'right', vAlign: 'top', w: 20, h: 5, t: 14.5, pL: 5.5 }
  }
};

// Configuration des boutons
const BUTTONS_CONFIG = {
  // Panel hideSwitchHelp
  but_hide: {
    name: 'but_hide',
    text: 'HIDE',
    className: 'button right first',
    panelName: 'hideSwitchHelp',
    options: { w: glo.buttonBottomSize, h: glo.buttonBottomHeight, pL: glo.buttonBottomPaddingLeft, pR: 0 },
    onLeftClick: function() {
      babGui.getByName('but_hide').textBlock.text = glo.gui_suit_visible ? 'HIDE' : 'SHOW';
      toggle_gui_controls(glo.gui_suit_visible);
      toggleRightPanels(glo.guiSelect, glo.gui_suit_visible);
      glo.gui_suit_visible = !glo.gui_suit_visible;
    }
  },
  but_switch: {
    name: 'but_switch',
    text: 'SWITCH',
    className: 'button right first',
    panelName: 'hideSwitchHelp',
    options: { w: glo.buttonBottomSize, h: glo.buttonBottomHeight, pL: glo.buttonBottomPaddingLeft, pR: 0 },
    onLeftClick: function() { switchRightPanel(true); },
    onRightClick: function() { switchRightPanel(false); }
  },
  but_help: {
    name: 'but_help',
    text: 'HELP',
    className: 'button right first',
    panelName: 'hideSwitchHelp',
    options: { w: glo.buttonBottomSize, h: glo.buttonBottomHeight, pL: glo.buttonBottomPaddingLeft, pR: 0 },
    onLeftClick: function() {
      if (glo.fullScreen) glo.engine.switchFullscreen();
      $('#helpModal').modal('open', {
        onCloseEnd: function() {
          if (glo.fullScreen) glo.engine.switchFullscreen();
        }
      });
    }
  },

  // Panel axisAndRotButton
  but_axis: {
    name: 'but_axis',
    text: 'AXIS',
    className: 'button right first',
    panelName: 'axisAndRotButton',
    options: { w: 70, h: 100/3, pL: 10, pR: 0 },
    onLeftClick: function() {
      glo.axis_visible = !glo.axis_visible;
      if (glo.first_axis_visible) {
        showAxis(glo.axis_size, 1);
        glo.first_axis_visible = false;
      } else {
        switch_axis();
      }
    }
  },
  but_rot: {
    name: 'but_rot',
    text: 'Rot α',
    className: 'button right first',
    panelName: 'axisAndRotButton',
    options: { w: 70, h: 100/3, pL: 10, pR: 0 },
    onLeftClick: function() {
      const rotType = glo.rotType.next().value;
      const textMap = { alpha: 'Rot α', beta: 'Rot β', teta: 'Rot θ', none: 'Stop' };
      babGui.getByName('but_rot').textBlock.text = textMap[rotType.next] || 'Stop';
      glo.meshChannel.postMessage({ action: 'setRotateType', rotType: rotType.next });
    }
  },
  but_box: {
    name: 'but_box',
    text: 'BOX',
    className: 'button right first',
    panelName: 'axisAndRotButton',
    options: { w: 70, h: 100/3, pL: 10, pR: 0 },
    onLeftClick: function() {
      glo.ribbon.showBoundingBox = !glo.ribbon.showBoundingBox;
      glo.params.showBoundingBox = !glo.params.showBoundingBox;
    }
  },

  // Panel lineDim
  but_grid: {
    name: 'but_grid',
    text: 'GRID',
    className: 'button left first',
    panelName: 'lineDim',
    options: { w: 60, h: 30, pL: 0, pR: 0 },
    onLeftClick: function() {
      glo.grid_visible = !glo.grid_visible;
      if (glo.first_axis_visible) {
        showAxis(glo.axis_size, 1);
        glo.first_axis_visible = false;
        glo.axis_visible = true;
      }
      if (glo.first_grid_visible) {
        showGrid(20, 20, 20, 1);
        glo.first_grid_visible = false;
        glo.grid_visible = true;
      } else {
        switch_grid();
      }
    }
  },
  but_plan: {
    name: 'but_plan',
    text: 'PLAN',
    className: 'button left first',
    panelName: 'lineDim',
    options: { w: 60, h: 30, pL: 10, pR: 0 },
    onLeftClick: function() {
      glo.planes_visible = !glo.planes_visible;
      make_planes();
    }
  },
  but_coord: {
    name: 'but_coord',
    text: 'CART',
    className: 'button left first',
    panelName: 'lineDim',
    options: { w: 70, h: 30, pL: 10, pR: 0 },
    onLeftClick: function() { switchCoords(); },
    onRightClick: function() { switchCoords(false); }
  },
  but_lines_state: {
    name: 'but_lines_state',
    text: 'LINE',
    className: 'button left first',
    panelName: 'lineDim',
    options: { w: 70, h: 30, pL: 10, pR: 0 },
    onLeftClick: function() {
      babGui.getByName('but_lines_state').textBlock.text = glo.drawType.next().value;
      if (glo.ribbon_visible) glo.ribbon.visibility = 1;
      else glo.ribbon.visibility = 0;
      switch_lines();
    }
  },
  but_dimension: {
    name: 'but_dimension',
    text: 'EXP',
    className: 'button left first',
    panelName: 'lineDim',
    options: { w: 60, h: 30, pL: 10, pR: 0 },
    onLeftClick: function() { exportModal(); }
  },

  // Panel panelHistoButton
  but_goBack: {
    name: 'but_goBack',
    text: '<',
    className: 'button right left noAutoParam',
    panelName: 'panelHistoButton',
    options: { w: 80, h: 30, pL: 10, pR: 0, fontSize: '20px' },
    onLeftClick: function() { glo.histo.goBack(); },
    onRightClick: function() { glo.histo.go('start'); }
  },
  but_goTo: {
    name: 'but_goTo',
    text: '>',
    className: 'button right left noAutoParam',
    panelName: 'panelHistoButton',
    options: { w: 80, h: 30, pL: 10, pR: 0, fontSize: '20px' },
    onLeftClick: function() { glo.histo.goTo(); },
    onRightClick: function() { glo.histo.go('end'); }
  },

  // Panel viewsButtonsPanel
  but_viewX: {
    name: 'but_viewX',
    text: 'X',
    className: 'button right first',
    panelName: 'viewsButtonsPanel',
    options: { w: 52.5, h: 30, pL: 0, pR: 0 },
    onLeftClick: function() {
      glo.camera.upVector = new BABYLON.Vector3(0, 0, 1);
      if (glo.viewXpos) {
        viewOnX(1);
        glo.viewYpos = true;
        glo.viewZpos = true;
        changeViewButtonsTexts('X-', 'Y', 'Z');
      } else {
        viewOnX(-1);
        changeViewButtonsTexts('X', 'Y', 'Z');
      }
      glo.viewXpos = !glo.viewXpos;
    }
  },
  but_viewY: {
    name: 'but_viewY',
    text: 'Y',
    className: 'button right first',
    panelName: 'viewsButtonsPanel',
    options: { w: 60, h: 30, pL: 10, pR: 0 },
    onLeftClick: function() {
      glo.camera.upVector = new BABYLON.Vector3(0, 0, 1);
      if (glo.viewYpos) {
        viewOnY(1);
        glo.viewXpos = true;
        glo.viewZpos = true;
        changeViewButtonsTexts('X', 'Y-', 'Z');
      } else {
        viewOnY(-1);
        changeViewButtonsTexts('X', 'Y', 'Z');
      }
      glo.viewYpos = !glo.viewYpos;
    }
  },
  but_viewZ: {
    name: 'but_viewZ',
    text: 'Z',
    className: 'button right first',
    panelName: 'viewsButtonsPanel',
    options: { w: 60, h: 30, pL: 10, pR: 0 },
    onLeftClick: function() {
      glo.camera.upVector = new BABYLON.Vector3(0, 1, 0);
      if (glo.viewZpos) {
        viewOnZ(1);
        glo.viewXpos = true;
        glo.viewYpos = true;
        changeViewButtonsTexts('X', 'Y', 'Z-');
      } else {
        viewOnZ(-1);
        changeViewButtonsTexts('X', 'Y', 'Z');
      }
      glo.viewZpos = !glo.viewZpos;
    }
  }
};

// Fonction helper pour changer les textes des boutons de vue
function changeViewButtonsTexts(textX, textY, textZ) {
  babGui.getByName('but_viewX').textBlock.text = textX;
  babGui.getByName('but_viewY').textBlock.text = textY;
  babGui.getByName('but_viewZ').textBlock.text = textZ;
}

//=================================================================================================//
//================================= FONCTIONS D'INSTANCIATION =====================================//
//=================================================================================================//

function add_gui_controls() {
  babGui.init();

  // Créer les panneaux et boutons de base
  add_switch_and_help_buttons();
  add_axis_and_rot_buttons();
  add_lines_and_dim_buttons();
  add_histo_buttons();
  add_views_buttons();

  // Sliders et contrôles
  add_uv_sliders();
  add_alpha_slider();
  add_inputs_equations();
  add_radios();
  add_step_uv_slider();
  add_color_pickers();
  add_shaders_ctrl();
  add_step_ABCD_sliders();
  add_symmetrize_sliders();
  add_blender_sliders();
  add_transformation_sliders();
  add_sixth_panel_sliders();
  add_functionIt_sliders();
  add_ninethPanel_controls();
  add_fractalize_controls();
  add_eleventh_panel_sliders();

  // Synchroniser avec glo.allControls pour compatibilité
  guiControls_AddIdentificationFunctions();

  // Appliquer les styles par défaut
  babGui.applyDefaultStyles();
}

function add_switch_and_help_buttons() {
  const panel = babGui.createPanel(PANELS_CONFIG.hideSwitchHelp);

  babGui.createButton(BUTTONS_CONFIG.but_hide);
  babGui.createButton(BUTTONS_CONFIG.but_switch);
  babGui.createButton(BUTTONS_CONFIG.but_help);
}

function add_axis_and_rot_buttons() {
  const panel = babGui.createPanel(PANELS_CONFIG.axisAndRotButton);

  babGui.createButton(BUTTONS_CONFIG.but_axis);
  babGui.createButton(BUTTONS_CONFIG.but_rot);

  // Bouton fullscreen (cas spécial avec async)
  const button1 = BABYLON.GUI.Button.CreateSimpleButton('but_screen', '↗ S');
  babGui.applyOptions(button1, 'fullScreenButton', 'button right first', { h: 35, pL: 10 }, true);
  button1.width = 0.2;
  button1.onPointerUpObservable.add(async function() {
    glo.fullScreen = !glo.fullScreen;
    if (!document.fullscreenElement) {
      await glo.canvas.requestFullscreen();
      button1.textBlock.text = '↘ S';
    } else {
      await document.exitFullscreen();
      button1.textBlock.text = '↗ S';
    }
  });
  babGui.designButton(button1);
  panel.addControl(button1);
  babGui.register(button1);
  glo.fullScreenButton = button1;

  // Écouter le changement de fullscreen
  document.addEventListener('fullscreenchange', () => {
    glo.fullScreen = !!document.fullscreenElement;
    setTimeout(() => {
      glo.engine.resize();
      glo.advancedTexture.scaleTo(
        glo.engine.getRenderWidth(),
        glo.engine.getRenderHeight()
      );
    }, 100);
  });

  babGui.createButton(BUTTONS_CONFIG.but_box);
}

function add_lines_and_dim_buttons() {
  const panel = babGui.createPanel(PANELS_CONFIG.lineDim);

  babGui.createButton(BUTTONS_CONFIG.but_grid);
  babGui.createButton(BUTTONS_CONFIG.but_plan);
  babGui.createButton(BUTTONS_CONFIG.but_coord);
  babGui.createButton(BUTTONS_CONFIG.but_lines_state);
  babGui.createButton(BUTTONS_CONFIG.but_dimension);
}

function add_histo_buttons() {
  const panel = babGui.createPanel(PANELS_CONFIG.panelHistoButton);

  // Ces boutons utilisent onPointerDownObservable au lieu de onPointerUpObservable
  const but_goBack = BABYLON.GUI.Button.CreateSimpleButton('but_goBack', '<');
  babGui.applyOptions(but_goBack, 'but_goBack', 'button right left noAutoParam', { w: 80, h: 30, pL: 10, pR: 0 }, true);
  babGui.designButton(but_goBack);
  but_goBack.fontSize = '20px';
  but_goBack.onPointerDownObservable.add(function(event) {
    if (event.buttonIndex !== 2) glo.histo.goBack();
    else glo.histo.go('start');
  });
  panel.addControl(but_goBack);
  babGui.register(but_goBack);

  const but_goTo = BABYLON.GUI.Button.CreateSimpleButton('but_goTo', '>');
  babGui.applyOptions(but_goTo, 'but_goTo', 'button right left noAutoParam', { w: 80, h: 30, pL: 10, pR: 0 }, true);
  babGui.designButton(but_goTo);
  but_goTo.fontSize = '20px';
  but_goTo.onPointerDownObservable.add(function(event) {
    if (event.buttonIndex !== 2) glo.histo.goTo();
    else glo.histo.go('end');
  });
  panel.addControl(but_goTo);
  babGui.register(but_goTo);
}

function add_views_buttons() {
  const panel = babGui.createPanel(PANELS_CONFIG.viewsButtonsPanel);

  babGui.createButton(BUTTONS_CONFIG.but_viewX);
  babGui.createButton(BUTTONS_CONFIG.but_viewY);
  babGui.createButton(BUTTONS_CONFIG.but_viewZ);
}

//=================================================================================================//
//========================= FONCTIONS DE COMPATIBILITÉ (pour glo.allControls) ====================//
//=================================================================================================//

function guiControls_AddIdentificationFunctions() {
  glo.allControls = glo.advancedTexture.getDescendants();

  function getByName(name) {
    let elemToReturn = false;
    this.map(elem => {
      if (typeof elem !== 'undefined' && typeof elem.name !== 'undefined' && elem.name === name) {
        elemToReturn = elem;
      }
    });
    return elemToReturn;
  }

  function haveThisClass(className) {
    return haveThisClassOrNot(this, className, true);
  }

  function haveNotThisClass(className) {
    return haveThisClassOrNot(this, className, false);
  }

  function haveThisClassOrNot(arr, className, have) {
    const elemsToReturn = [];
    const reg = new RegExp("\\b" + className + "\\b");

    if (have) {
      arr.map(elem => {
        if (typeof elem !== 'undefined' && typeof elem.class !== 'undefined' && elem.class.match(reg) !== null) {
          elemsToReturn.push(elem);
        }
      });
    } else {
      arr.map(elem => {
        if (typeof elem !== 'undefined' && typeof elem.class !== 'undefined' && elem.class.match(reg) === null) {
          elemsToReturn.push(elem);
        }
      });
    }

    if (elemsToReturn.length === 0) return [];

    elemsToReturn.haveNotThisClass = haveNotThisClass;
    elemsToReturn.haveNotTheseClass = haveNotTheseClass;

    if (elemsToReturn.length === 1) {
      elemsToReturn[0].hasThisClass = hasThisClass;
      elemsToReturn[0].getByName = this.getByName;
      return elemsToReturn;
    } else {
      elemsToReturn.map(elem => { elem.hasThisClass = hasThisClass; });
      elemsToReturn.getByName = getByName;
      elemsToReturn.haveTheseClasses = haveTheseClasses;
      return elemsToReturn;
    }
  }

  function haveTheseClasses(...classesNames) {
    return haveTheseClassesOrNot(this, classesNames, true);
  }

  function haveNotTheseClass(...classesNames) {
    return haveTheseClassesOrNot(this, classesNames, false);
  }

  function haveTheseClassesOrNot(arr, classesNames, have) {
    const elemsToReturn = [];
    const regs = [];
    classesNames.map(className => {
      regs.push(new RegExp("\\b" + className + "\\b"));
    });

    if (have) {
      arr.map(elem => {
        if (typeof elem !== 'undefined' && typeof elem.class !== 'undefined') {
          let good = true;
          regs.map(reg => {
            if (elem.class.match(reg) === null) good = false;
          });
          if (good) elemsToReturn.push(elem);
        }
      });
    } else {
      arr.map(elem => {
        if (typeof elem !== 'undefined' && typeof elem.class !== 'undefined') {
          let good = false;
          regs.map(reg => {
            if (elem.class.match(reg) !== null) good = true;
          });
          if (good) elemsToReturn.push(elem);
        }
      });
    }

    elemsToReturn.haveNotThisClass = haveNotThisClass;
    elemsToReturn.haveNotTheseClass = haveNotTheseClass;

    if (elemsToReturn.length === 0) return false;
    return elemsToReturn;
  }

  function hasThisClass(className) {
    const reg = new RegExp("\\b" + className + "\\b");
    if (typeof this.class !== 'undefined' && this.class.match(reg) !== null) return true;
    return false;
  }

  glo.allControls.getByName = getByName;
  glo.allControls.haveThisClass = haveThisClass;
  glo.allControls.haveTheseClasses = haveTheseClasses;
  glo.allControls.haveNotThisClass = haveNotThisClass;
  glo.allControls.haveNotTheseClass = haveNotTheseClass;
  glo.allControls.map(control => { control.hasThisClass = hasThisClass; });
}

//=================================================================================================//
//========================= FONCTIONS DE TOGGLE (compatibilité) ===================================//
//=================================================================================================//

function toggle_gui_controls(state) {
  glo.allControls.haveTheseClasses('first').map(ct => {
    if (ct.name !== 'but_hide' && ct.name !== 'hideSwitchHelp') {
      ct.isVisible = state;
      ct.isEnabled = state;
    }
  });
}

function toggle_gui_controls_for_switch(state) {
  glo.allControls.haveTheseClasses('panel', 'onlyMainGui').map(pn => { pn.isVisible = state; pn.isEnabled = state; });
  glo.allControls.haveTheseClasses('header', 'onlyMainGui').map(hd => { hd.isVisible = state; hd.isEnabled = state; });
  glo.allControls.haveTheseClasses('picker', 'onlyMainGui').map(pr => { pr.isVisible = state; pr.isEnabled = state; });
}

function toggle_gui_controls_suit(state) {
  glo.allControls.haveThisClass('second').map(ct => { ct.isVisible = state; ct.isEnabled = state; });
}

function toggle_gui_controls_third(state) {
  glo.allControls.haveThisClass('third').map(ct => { ct.isVisible = state; ct.isEnabled = state; });
}

function toggleGuiControlsByClass(state, theClass) {
  glo.allControls.haveThisClass(theClass).map(ct => { ct.isVisible = state; ct.isEnabled = state; });
}

//=================================================================================================//
//============================= CONTRÔLES À MIGRER (ÉTAPES 2 ET 3) ================================//
//=================================================================================================//

// Les fonctions ci-dessous seront migrées dans les prochaines étapes

function add_uv_sliders() {
  function add_slider(name, headerText, gloPropToModify, gloPropToAssignInput) {
    var panel = new BABYLON.GUI.StackPanel();
    babGui.applyOptions(panel, "panel_" + name, 'panel left first');
    glo.advancedTexture.addControl(panel);
    babGui.register(panel);

    var min_start = -glo['params'][gloPropToModify].toFixed(2);
    var max_start = glo['params'][gloPropToModify].toFixed(2);
    var header = new BABYLON.GUI.TextBlock();
    babGui.applyOptions(header, 'uvSliderHeader-' + name, 'header left first', { text: headerText + " : " + min_start + " — " + max_start });
    panel.addControl(header);
    babGui.register(header);

    var slider = new BABYLON.GUI.Slider();
    babGui.applyOptions(slider, name, 'slider left first', { minimum: 0, maximum: 6 * PI, value: glo['params'][gloPropToModify], startValue: glo['params'][gloPropToModify] });
    glo[gloPropToAssignInput] = slider;
    babGui.register(slider);

    slider.onValueChangedObservable.add(async function(value) {
      if (value == 0) value = 0.00001;

      var min = -value.toFixed(2);
      var max = value.toFixed(2);

      if (glo.slidersUVOnOneSign[name]) {
        min = 0;
        this.min = 0;
      }

      glo['params'][gloPropToModify] = value;
      if (!glo.fromHisto) {
        await remakeRibbon();
      }

      header.text = headerText + " : " + min + " — " + max;
    });
    slider.onPointerClickObservable.add(function(e) {
      if (e.buttonIndex == 2) slider.value = slider.startValue;
    });
    slider.onWheelObservable.add(function(e) {
      var val = e.y < 0 ? pi / 8 : -pi / 8;
      slider.value += val;
    });

    panel.addControl(slider);
  }

  add_slider('u', 'U', 'u', 'slider_u');
  add_slider('v', 'V', 'v', 'slider_v');
}

function add_alpha_slider() {
  var panel = new BABYLON.GUI.StackPanel();
  babGui.applyOptions(panel, "panelAlphaSlider", 'panel left first');
  panel.class = "panel left first";
  glo.advancedTexture.addControl(panel);
  babGui.register(panel);

  var header = new BABYLON.GUI.TextBlock();
  babGui.applyOptions(header, 'alphaSliderHeader', 'header left first', { text: "Transparency" });
  panel.addControl(header);
  babGui.register(header);

  var slider = new BABYLON.GUI.Slider();
  babGui.applyOptions(slider, 'alphaSlider', 'slider left first', { minimum: 0, maximum: 1, value: glo.ribbon_alpha });
  babGui.register(slider);

  slider.onValueChangedObservable.add(function(value) {
    if (typeof glo.ribbon !== "undefined" && glo.ribbon !== null) {
      glo.ribbon.material.alpha = value;
      glo.ribbon_alpha = value;
      if (glo.curves.lineSystem) glo.curves.lineSystem.alpha = value;
      if (glo.curves.doubleLineSystem) glo.curves.doubleLineSystem.alpha = value;
    }
  });

  panel.addControl(slider);
}

function add_inputs_equations() {
  var panel = new BABYLON.GUI.StackPanel();
  var panelSuitsEquations = new BABYLON.GUI.StackPanel();
  var panelSymsEquations = new BABYLON.GUI.StackPanel();
  let panelEvalY = new BABYLON.GUI.StackPanel();
  let panelSymmAngle = new BABYLON.GUI.StackPanel();

  babGui.applyOptions(panel, "inputsEquations", 'panel left first');
  babGui.applyOptions(panelSuitsEquations, "inputsSuitsEquations", 'panel right fourth noAutoParam', { hAlign: 'right', vAlign: 'top', w: 24, pR: 1, t: 26 });
  babGui.applyOptions(panelEvalY, "panelEvalY", 'panel right sixth noAutoParam', { hAlign: 'right', vAlign: 'top', w: 60, pR: 1, t: 505, h: 100, pL: -330 }, true);
  babGui.applyOptions(panelSymmAngle, "panelSymmAngle", 'panel right eleventh noAutoParam', { hAlign: 'right', vAlign: 'top', w: 20, pL: 1, pR: 0.5, t: 72, h: 24 });
  panelSymmAngle.height = "100px";
  makePanelTitle("panelSymmAnglesTitle", "Symmetry angles", 60.5, "header right eleventh noAutoParam");

  var options = { hAlign: 'right', vAlign: 'top', w: 24, t: 83, pR: 1 };
  babGui.applyOptions(panelSymsEquations, "panelSymsEquations", 'panel right fourth noAutoParam', options);

  panel.onWheelObservable.add(function(e) {
    e.y < 0 ? glo.histo.goTo() : glo.histo.goBack();
  });

  glo.advancedTexture.addControl(panel);
  glo.advancedTexture.addControl(panelSuitsEquations);
  glo.advancedTexture.addControl(panelSymsEquations);
  glo.advancedTexture.addControl(panelEvalY);
  glo.advancedTexture.addControl(panelSymmAngle);

  [panel, panelSuitsEquations, panelSymsEquations, panelEvalY, panelSymmAngle].forEach(p => babGui.register(p));

  glo.text_input_alpha = "";
  glo.text_input_beta = "";

  var indexInInputsEquations = 0;

  function add_input(parent, textHeader, textField, name, classNameHeader, classNameInput, gloPropToModify, gloPropToAssignInput, colorEquation = false, withEvent = true) {
    var header = new BABYLON.GUI.TextBlock();
    babGui.applyOptions(header, "header_" + name, classNameHeader, { text: textHeader });
    if (parent.name !== 'inputsEquations' && parent.name !== 'panelEvalY' && parent.name !== 'panelSymmAngle') header.paddingLeft = "20%";
    if (parent.name === 'panelSymmAngle') { header.fontSize = '12px'; header.color = 'white'; }
    parent.addControl(header);
    babGui.register(header);

    var input = new BABYLON.GUI.InputText();
    babGui.applyOptions(input, name, classNameInput, { w: "350", fontWeight: "500", fontSize: "19", text: textField, h: 25 }, true);
    babGui.register(input);

    input.inputsEquationsIndex = indexInInputsEquations;
    indexInInputsEquations++;

    async function inputChangeEvent() {
      isWInMeshEquations();
      if (colorEquation) glo.params.playWithColors = true;
      if (glo.normalMode) {
        if (!colorEquation && !glo.params.playWithColors) {
          await remakeRibbon();
        } else {
          var equations = {
            fx: glo.params.text_input_color_x,
            fy: glo.params.text_input_color_y,
            fz: glo.params.text_input_color_z,
            falpha: glo.params.text_input_color_alpha,
            fbeta: glo.params.text_input_color_beta,
            alpha: glo.input_eval_y.text,
          };
          if (test_equations(equations, false)) {
            glo.fromSlider = true;
            await make_curves(undefined, undefined, undefined, undefined, !glo.params.fractalize.actived ? false : 'fractalize');
            glo.fromSlider = false;
            await drawNormalEquations(isSym());
          }
        }
      } else {
        await remakeRibbon();
        glo.advancedTexture.moveFocusToControl(input);
      }
    }

    if (withEvent) {
      input.onKeyboardEventProcessedObservable.add((event) => {
        let key = event.key;
        let text = input.text;

        if (key != "Control" && key != "c" && key != "v" && key != "F12") {
          event.stopPropagation();
          event.preventDefault();
        }

        if (key != "Tab" && !key.match(/Arrow/, g)) {
          if (!colorEquation) {
            if (!glo.normalMode) glo['params'][gloPropToModify] = text;
            else glo['params']['normale'][gloPropToModify] = text;
          } else {
            glo['params'][gloPropToModify] = text;
          }
          if (event) {
            if (!glo.normalOnNormalMode) inputChangeEvent();
            else if (key == "Enter") inputChangeEvent();
          }
        } else if (key == "Tab") {
          var inputsEquations = glo.allControls.haveTheseClasses("input", "equation");
          var inputsEquationsLastIndex = inputsEquations.length - 1;
          var newIndex = 0;
          if (!event.shiftKey) {
            if (input.inputsEquationsIndex < inputsEquationsLastIndex) newIndex = input.inputsEquationsIndex + 1;
            glo.advancedTexture.moveFocusToControl(inputsEquations[newIndex]);
          } else {
            if (input.inputsEquationsIndex > 0) newIndex = input.inputsEquationsIndex - 1;
            else newIndex = inputsEquationsLastIndex;
            glo.advancedTexture.moveFocusToControl(inputsEquations[newIndex]);
          }
        }
      });
      input.onTextPasteObservable.add((event) => {
        var text = input.text;
        if (!colorEquation) {
          if (!glo.normalMode) glo['params'][gloPropToModify] = text;
          else glo['params']['normale'][gloPropToModify] = text;
        } else {
          glo['params'][gloPropToModify] = text;
        }
        if (event) inputChangeEvent();
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

  add_input(panelSymmAngle, "∡ X", "", "inputSymmAngleX", "header right eleventh", "input equation right eleventh", "text_input_symmAngleX", "input_symmAngleX");
  add_input(panelSymmAngle, "∡ Y", "", "inputSymmAngleY", "header right eleventh", "input equation right eleventh", "text_input_symmAngleY", "input_symmAngleY");

  // Événement personnalisé pour R Symmetrize
  glo.input_sym_r.onKeyboardEventProcessedObservable.add(async (event) => {
    let key = event.key;
    let text = glo.input_sym_r.text;

    if (key !== "Control" && key !== "c" && key !== "v" && key !== "F12") {
      event.stopPropagation();
      event.preventDefault();
    }

    glo.params.text_input_sym_r = text;

    if (key === "Enter" || (!glo.normalOnNormalMode && key !== "Tab" && !key.match(/Arrow/g))) {
      glo.shaderMaterial = glo.input_sym_r.text ? true : false;
      if (glo.shaderColor && !glo.input_sym_r.text) glo.shaderMaterial = true;
      if (glo.curves.lineSystem) glo.curves.lineSystem.visibility = glo.input_sym_r.text ? false : true;
      if (glo.curves.lineSystemDouble) glo.curves.lineSystemDouble.visibility = glo.input_sym_r.text ? false : true;
      await applyDeformationShader();
    }
  });

  glo.input_sym_r.onTextPasteObservable.add(async () => {
    glo.params.text_input_sym_r = glo.input_sym_r.text;
    glo.shaderMaterial = glo.input_sym_r.text ? true : false;
    if (glo.shaderColor && !glo.input_sym_r.text) glo.shaderMaterial = true;
    if (glo.curves.lineSystem) glo.curves.lineSystem.visibility = glo.input_sym_r.text ? false : true;
    if (glo.curves.lineSystemDouble) glo.curves.lineSystemDouble.visibility = glo.input_sym_r.text ? false : true;
    await applyDeformationShader();
  });
}

function add_radios(suit = false) {
  var topShift = 0;
  var topShiftLineDim = 0;
  glo.formes.select.map(forme => {
    if (forme.typeCoords == glo.coordsType) {
      topShift += glo.shiftRadios;
      topShiftLineDim += glo.shiftLineDim;
    }
  });
  var top_panel = 50;
  var top_panel_line_dim = -3;

  if (glo.first_radio) {
    var panel = new BABYLON.GUI.StackPanel();
    panel.onWheelObservable.add(async function(event) {
      glo.whellSwitchFormDown = event.y > 0 ? true : false;
      await whellSwitchForm();
    });
    var options = { hAlign: 'left', vAlign: 'top', w: 20, t: top_panel, pL: 1 };
    babGui.applyOptions(panel, 'panelRadios', 'panel right first noAutoParam', options);
    glo.advancedTexture.addControl(panel);
    babGui.register(panel);
    var header = new BABYLON.GUI.TextBlock();
    babGui.applyOptions(header, "header_" + name, 'header left first', { text: "Forms :" });
    panel.addControl(header);
    babGui.register(header);
  }

  var addRadio = function(text, parent, group, check = false, typeCoords) {
    if (!glo.first_radio) check = false;
    var button = new BABYLON.GUI.RadioButton();
    var options = { w: "13", h: "13", group: 'radiosForms', isChecked: check };
    babGui.applyOptions(button, "Radio-" + text, 'radio left first', options, true);
    for (const prop in glo.theme.radio.button) button[prop] = glo.theme.radio.button[prop];

    const formSelected = glo.formes.getFormSelect().form;
    if (formSelected && formSelected.text === text && formSelected.typeCoords === typeCoords) {
      button.isChecked = true;
    }

    if (glo.formeToFractalize && text === glo.formeToFractalize.text && typeCoords === glo.formeToFractalize.typeCoords) {
      button.color = 'red';
    }

    button.onPointerClickObservable.add(async function(e) {
      if (e.buttonIndex === 0 && !glo.fromHisto) {
        await glo.formes.setFormeSelect(text, glo.coordsType);
      }

      if (e.buttonIndex === 2) {
        glo.formeToFractalize = glo.formes.getFormByName(text, glo.coordsType);
        glo.radios_formes.getByName('Radio-' + glo.formes.getFormSelect().form.text).button.isChecked = true;

        glo.radios_formes.forEach(radioForme => {
          radioForme.button.color = glo.theme.radio.text.color;
        });
        glo.radios_formes.getByName('Radio-' + text).button.color = 'red';

        if (glo.params.fractalize.actived) {
          await remakeRibbon();
        }
      }
    });

    var header = BABYLON.GUI.Control.AddHeader(button, text, "200px", { isHorizontal: true, controlFirst: true });
    babGui.applyOptions(header, "headerRadio-" + text, 'header radio left first noAutoParam', { h: 20, pT: 4 }, true);
    header.paddingLeft = "16%";
    for (const prop in glo.theme.radio.text) header[prop] = glo.theme.radio.text[prop];

    var textBlock = header.children[1];
    textBlock.fontSize = "17px";

    glo.radios_formes.push({ button: button, header: header });
    babGui.register(button);

    parent.addControl(header);
  }

  if (!glo.first_radio) {
    var panel = glo.allControls.getByName('panelRadios');
    glo.allControls.getByName('panelRadios').top = top_panel + '%';
    glo.allControls.getByName('lineDim').top = top_panel_line_dim + '%';
    glo.formes.select.map(forme => {
      var radio_form = glo.radios_formes.getByName("Radio-" + forme.text);
      if (radio_form != false) {
        radio_form.button.dispose();
        radio_form.header.dispose();
      }
    });
  }

  glo.formes.select.map(forme => {
    if (forme.typeCoords == glo.coordsType) {
      if (!suit) {
        if (!forme.suit) addRadio(forme.text, panel, "forms", forme.check, forme.typeCoords);
      } else {
        if (glo.formesSuit) {
          if (forme.suit) addRadio(forme.text, panel, "forms", forme.check, forme.typeCoords);
        } else {
          if (!forme.suit) addRadio(forme.text, panel, "forms", forme.check, forme.typeCoords);
        }
      }
    }
  });

  glo.first_radio = false;
}

function add_step_uv_slider() {
  function add_slider(name, headerText, gloPropToModify, gloPropToAssignInput) {
    var panel = new BABYLON.GUI.StackPanel();
    babGui.applyOptions(panel, "panel_" + name, 'panel right first');
    glo.advancedTexture.addControl(panel);
    babGui.register(panel);

    var header = new BABYLON.GUI.TextBlock();
    babGui.applyOptions(header, headerText, 'header right first', { text: headerText + " : " + glo['params'][gloPropToModify] });
    panel.addControl(header);
    babGui.register(header);

    var slider = new BABYLON.GUI.Slider();
    babGui.applyOptions(slider, name, "slider right first", { minimum: 1, maximum: 264, value: glo['params'][gloPropToModify], startValue: glo['params'][gloPropToModify], updating: false });
    babGui.register(slider);

    slider.onValueChangedObservable.add(async function(value) {
      value = parseInt(value);
      glo['params'][gloPropToModify] = value;
      getPathsInfos();
      if (!glo.fromHisto) {
        await remakeRibbon();
      }
      header.text = headerText + " : " + value;
    });
    slider.onPointerClickObservable.add(function(e) {
      if (e.buttonIndex == 2) slider.value = slider.startValue;
    });
    slider.onWheelObservable.add(function(e) {
      var val = e.y < 0 ? 1 : -1;
      slider.value += val;
    });
    panel.addControl(slider);

    glo[gloPropToAssignInput] = slider;
  }

  add_slider("stepU", "Steps U", "steps_u", "slider_nb_steps_u");
  add_slider("stepV", "Steps V", "steps_v", "slider_nb_steps_v");
}

function makePanelTitle(name, title, t, className = 'header right seventh noAutoParam', fontSize = 17) {
  var header = new BABYLON.GUI.TextBlock();
  header.text = title;
  header.color = 'white';
  header.fontSize = fontSize;
  header.height = '30px';
  header.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  babGui.applyOptions(header, name, className, { hAlign: 'right', vAlign: 'top', t: t, pL: 2 });
  glo.advancedTexture.addControl(header);
  babGui.register(header);
}

function makePanelCtrl(name, t, pL, isVertical = false, h = 5, numUI = 'seventh') {
  var panel = new BABYLON.GUI.StackPanel();
  babGui.applyOptions(panel, name, 'panel right ' + numUI + ' noAutoParam', { hAlign: 'right', vAlign: 'top', w: 20, h: h, t: t, pL: pL, isVertical: isVertical });
  glo.advancedTexture.addControl(panel);
  babGui.register(panel);
  return panel;
}

// Placeholder pour les fonctions restantes - à migrer dans l'étape 2
function add_color_pickers() {
  // TODO: À migrer
  var panelHeader = new BABYLON.GUI.StackPanel();
  var panelTitleUI = new BABYLON.GUI.StackPanel();
  var panelTitleMesh = new BABYLON.GUI.StackPanel();
  var panel1 = new BABYLON.GUI.StackPanel();
  var panel2 = new BABYLON.GUI.StackPanel();
  var panelButtons = new BABYLON.GUI.StackPanel();

  var panelTitleUIBg = new BABYLON.GUI.StackPanel();
  var panelTitleUIButton = new BABYLON.GUI.StackPanel();
  var panelTitleMeshBg = new BABYLON.GUI.StackPanel();
  var panelTitleMeshDiffuse = new BABYLON.GUI.StackPanel();
  var panelTitleMeshLine = new BABYLON.GUI.StackPanel();
  var panelTitleRandom = new BABYLON.GUI.StackPanel();

  var top = { panel1: 35, panel2: 55, panel3: 60, panelButtons: 73 };
  var options = { hAlign: 'right', vAlign: 'top', w: 20, h: 15, t: top.panel1, pL: 2, isVertical: false };

  babGui.applyOptions(panelHeader, 'colorHeaderPan', 'panel right first noAutoParam onlyMainGui', { hAlign: 'right', vAlign: 'top', w: 20, h: 15, t: 21, pL: 8, isVertical: false });
  babGui.applyOptions(panelTitleUI, 'colorHeaderTitleUI', 'panel right first noAutoParam onlyMainGui', { hAlign: 'right', vAlign: 'top', w: 20, h: 15, t: 26, pL: 9.5, isVertical: false });
  babGui.applyOptions(panelTitleMesh, 'colorHeaderTitleMesh', 'panel right first noAutoParam onlyMainGui', { hAlign: 'right', vAlign: 'top', w: 20, h: 15, t: 45, pL: 8.5, isVertical: false });

  const hTest = 2;
  babGui.applyOptions(panelTitleUIBg, 'colorTitleUIBg', 'panel right first noAutoParam onlyMainGui', { hAlign: 'right', vAlign: 'top', w: 20, h: hTest, t: 35.5, pL: 4.875, isVertical: false });
  babGui.applyOptions(panelTitleUIButton, 'colorTitleUIButton', 'panel right first noAutoParam onlyMainGui', { hAlign: 'right', vAlign: 'top', w: 20, h: hTest, t: 35.5, pL: 11.4166, isVertical: false });
  babGui.applyOptions(panelTitleMeshBg, 'colorTitleMeshBg', 'panel right first noAutoParam onlyMainGui', { hAlign: 'right', vAlign: 'top', w: 20, h: hTest, t: 55, pL: 2.4166, isVertical: false });
  babGui.applyOptions(panelTitleMeshDiffuse, 'colorTitleMeshDiffuse', 'panel right first noAutoParam onlyMainGui', { hAlign: 'right', vAlign: 'top', w: 20, h: hTest, t: 55, pL: 8.875, isVertical: false });
  babGui.applyOptions(panelTitleMeshLine, 'colorTitleMeshLine', 'panel right first noAutoParam onlyMainGui', { hAlign: 'right', vAlign: 'top', w: 20, h: hTest, t: 55, pL: 14.66, isVertical: false });
  babGui.applyOptions(panelTitleRandom, 'colorTitleRandom', 'panel right first noAutoParam onlyMainGui', { hAlign: 'right', vAlign: 'top', w: 20, h: hTest, t: 72, pL: 8.25, isVertical: false });

  options.pL = 4.5;
  babGui.applyOptions(panel1, 'pickerColorPan1', 'panel right first noAutoParam onlyMainGui', options);
  options.t = top.panel2; options.pL = 2;
  babGui.applyOptions(panel2, 'pickerColorPan2', 'panel right first noAutoParam onlyMainGui', options);
  options.t = top.panelButtons; options.pL = 4.166;
  babGui.applyOptions(panelButtons, 'uiColorButtons', 'panel right first noAutoParam onlyMainGui', options);

  glo.advancedTexture.addControl(panelHeader);
  glo.advancedTexture.addControl(panelTitleUI);
  glo.advancedTexture.addControl(panelTitleMesh);
  glo.advancedTexture.addControl(panel1);
  glo.advancedTexture.addControl(panel2);
  glo.advancedTexture.addControl(panelButtons);
  glo.advancedTexture.addControl(panelTitleUIBg);
  glo.advancedTexture.addControl(panelTitleUIButton);
  glo.advancedTexture.addControl(panelTitleMeshBg);
  glo.advancedTexture.addControl(panelTitleMeshDiffuse);
  glo.advancedTexture.addControl(panelTitleMeshLine);
  glo.advancedTexture.addControl(panelTitleRandom);

  [panelHeader, panelTitleUI, panelTitleMesh, panel1, panel2, panelButtons,
   panelTitleUIBg, panelTitleUIButton, panelTitleMeshBg, panelTitleMeshDiffuse,
   panelTitleMeshLine, panelTitleRandom].forEach(p => babGui.register(p));

  function paramHeader(panel, header, text, options) {
    header.text = text;
    header.color = "white";
    header.height = "30px";
    header.width = "100%";
    header.fontSize = options.fontSize;
    header.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    babGui.applyOptions(header, options.name, 'header right first noAutoParam onlyMainGui');
    panel.addControl(header);
    babGui.register(header);
  }

  var headerUI = new BABYLON.GUI.TextBlock();
  paramHeader(panelHeader, headerUI, "COLORS :", { name: "colorHeaderPanTitle", fontSize: 20 });

  var titleUI = new BABYLON.GUI.TextBlock();
  paramHeader(panelTitleUI, titleUI, "UI", { name: "colorTitleUIText", fontSize: 16 });

  var titleMesh = new BABYLON.GUI.TextBlock();
  paramHeader(panelTitleMesh, titleMesh, "MESH", { name: "colorTitleMeshText", fontSize: 16 });

  var titleBg = new BABYLON.GUI.TextBlock();
  paramHeader(panelTitleUIBg, titleBg, "Back", { name: "colorTitleUIBgText", fontSize: 13 });

  var titleButton = new BABYLON.GUI.TextBlock();
  paramHeader(panelTitleUIButton, titleButton, "Button", { name: "colorTitleUIButtonText", fontSize: 13 });

  var titleMeshBg = new BABYLON.GUI.TextBlock();
  paramHeader(panelTitleMeshBg, titleMeshBg, "Back", { name: "colorTitleMeshBgText", fontSize: 13 });

  var titleDiffuse = new BABYLON.GUI.TextBlock();
  paramHeader(panelTitleMeshDiffuse, titleDiffuse, "Diffuse", { name: "colorTitleMeshDiffuseText", fontSize: 13 });

  var titleLine = new BABYLON.GUI.TextBlock();
  paramHeader(panelTitleMeshLine, titleLine, "Line", { name: "colorTitleMeshLineText", fontSize: 13 });

  var titleRandom = new BABYLON.GUI.TextBlock();
  paramHeader(panelTitleRandom, titleRandom, "Random", { name: "colorTitleRandomText", fontSize: 13 });

  function add_color_picker(name, panel, defaultColor, callback, options = {}) {
    var picker = new BABYLON.GUI.ColorPicker();
    picker.name = name;
    picker.class = 'picker right first noAutoParam onlyMainGui';
    picker.value = defaultColor;
    picker.height = options.height || "80px";
    picker.width = options.width || "80px";
    picker.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    if (options.paddingLeft) picker.paddingLeft = options.paddingLeft;
    picker.onValueChangedObservable.add(callback);
    panel.addControl(picker);
    babGui.register(picker);
    return picker;
  }

  glo.pickerBackground = add_color_picker('backgroundColorPicker', panel1, glo.scene.clearColor, function(color) {
    glo.scene.clearColor = color;
  });

  glo.pickerButton = add_color_picker('buttonColorPicker', panel1, BABYLON.Color3.FromHexString(glo.buttons_background), function(color) {
    glo.allControls.haveThisClass('button').forEach(bt => { bt.background = color.toHexString(); });
  }, { paddingLeft: "10px" });

  glo.pickerMeshBackground = add_color_picker('meshBackgroundColorPicker', panel2, glo.ribbon_emissiveColor || new BABYLON.Color3(0, 0, 0), function(color) {
    if (glo.ribbon) glo.ribbon.material.emissiveColor = color;
    glo.ribbon_emissiveColor = color;
  });

  glo.pickerDiffuse = add_color_picker('diffuseColorPicker', panel2, glo.ribbon_diffuseColor || new BABYLON.Color3(1, 1, 1), function(color) {
    if (glo.ribbon) glo.ribbon.material.diffuseColor = color;
    glo.ribbon_diffuseColor = color;
  }, { paddingLeft: "10px" });

  glo.pickerLine = add_color_picker('lineColorPicker', panel2, glo.line_Color || new BABYLON.Color3(1, 1, 1), function(color) {
    glo.curves.color = [color.r, color.g, color.b];
    glo.line_Color = color;
    make_curves();
  }, { paddingLeft: "10px" });

  function add_color_button(name, text, panel, callback) {
    var button = BABYLON.GUI.Button.CreateSimpleButton(name, text);
    button.width = "80px";
    button.height = "30px";
    button.color = "white";
    button.cornerRadius = 5;
    button.background = glo.buttons_background;
    button.fontSize = "14px";
    button.paddingLeft = "10px";
    button.onPointerUpObservable.add(callback);
    panel.addControl(button);
    babGui.register(button);
    return button;
  }

  add_color_button('randomBackgroundColorButton', 'Rnd Bg', panelButtons, function() {
    var randomColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
    glo.scene.clearColor = randomColor;
    glo.pickerBackground.value = randomColor;
  });

  add_color_button('randomMeshColorButton', 'Rnd Mesh', panelButtons, function() {
    var randomDiffuse = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
    var randomEmissive = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
    if (glo.ribbon) {
      glo.ribbon.material.diffuseColor = randomDiffuse;
      glo.ribbon.material.emissiveColor = randomEmissive;
    }
    glo.ribbon_diffuseColor = randomDiffuse;
    glo.ribbon_emissiveColor = randomEmissive;
    glo.pickerDiffuse.value = randomDiffuse;
    glo.pickerMeshBackground.value = randomEmissive;
  });

  add_color_button('randomLineColorButton', 'Rnd Line', panelButtons, function() {
    var randomColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
    glo.curves.color = [randomColor.r, randomColor.g, randomColor.b];
    glo.line_Color = randomColor;
    glo.pickerLine.value = randomColor;
    make_curves();
  });
}

//=================================================================================================//
//============================= CONTRÔLES STEP 2 - SLIDERS COMPLEXES ==============================//
//=================================================================================================//

function add_shaders_ctrl() {
  // Panneau principal des shaders
  var panel = new BABYLON.GUI.StackPanel();
  babGui.applyOptions(panel, 'shadersCtrlPanel', 'panel right seventh noAutoParam', { hAlign: 'right', vAlign: 'top', w: 20, t: 26, pR: 1 });
  glo.advancedTexture.addControl(panel);
  babGui.register(panel);

  makePanelTitle('ShadersPanelTitle', 'Shaders', 22, 'header right seventh noAutoParam');

  function addSlider(parent, name, text, val, decimalPrecision, min, max, step, event) {
    var header = new BABYLON.GUI.TextBlock();
    babGui.applyOptions(header, "header_" + name, 'header right seventh noAutoParam', { text: text + ": " + val, color: 'white', fontSize: 14, h: 20, pT: 4 }, true);
    parent.addControl(header);
    babGui.register(header);

    var slider = new BABYLON.GUI.Slider();
    babGui.applyOptions(slider, name, 'slider right seventh', { minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 18.5, background: 'grey' }, true);
    slider.startValue = val;
    babGui.register(slider);

    slider.onValueChangedObservable.add(function(value) {
      header.text = text + ": " + value.toFixed(decimalPrecision);
      slider.lastValue = value;
      event(value);
    });

    slider.onPointerClickObservable.add(function(e) {
      if (e.buttonIndex == 2) {
        slider.value = slider.startValue;
      }
    });

    parent.addControl(slider);
    return { header, slider };
  }

  // Sliders de contrôle des shaders
  addSlider(panel, "shaderIntensity", "Intensity", 1, 2, 0, 5, 0.01, function(value) {
    glo.shaderIntensity = value;
    giveMaterialToMesh();
  });

  addSlider(panel, "shaderFrequency", "Frequency", 1, 2, 0, 10, 0.1, function(value) {
    glo.shaderFrequency = value;
    giveMaterialToMesh();
  });

  addSlider(panel, "shaderAmplitude", "Amplitude", 1, 2, 0, 5, 0.01, function(value) {
    glo.shaderAmplitude = value;
    giveMaterialToMesh();
  });
}

function add_step_ABCD_sliders() {
  var panel = new BABYLON.GUI.StackPanel();
  babGui.applyOptions(panel, 'paramABCDSlidersPanel', 'panel right second noAutoParam', { hAlign: 'right', vAlign: 'top', w: 20, t: 26, pR: 1 });
  glo.advancedTexture.addControl(panel);
  babGui.register(panel);

  makePanelTitle('ABCDPanelTitle', 'ABCD Parameters', 22, 'header right second noAutoParam');

  function addSlider(parent, name, text, val, decimalPrecision, min, max, step, event) {
    var header = new BABYLON.GUI.TextBlock();
    babGui.applyOptions(header, "header_" + name, 'header right second noAutoParam', { text: text + ": " + val, color: 'white', fontSize: 14, h: 20, pT: 4 }, true);
    parent.addControl(header);
    babGui.register(header);

    var slider = new BABYLON.GUI.Slider();
    babGui.applyOptions(slider, name, 'slider right second', { minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 18.5, background: 'grey' }, true);
    slider.startValue = val;
    babGui.register(slider);

    slider.onValueChangedObservable.add(async function(value) {
      header.text = text + ": " + value.toFixed(decimalPrecision);
      slider.lastValue = value;
      event(value);
      await remakeRibbon();
    });

    slider.onPointerClickObservable.add(function(e) {
      if (e.buttonIndex == 2) {
        slider.value = slider.startValue;
      }
    });

    parent.addControl(slider);
  }

  addSlider(panel, "stepA", "A", glo.params.A || 1, 2, -10, 10, 0.1, function(value) { glo.params.A = value; });
  addSlider(panel, "stepB", "B", glo.params.B || 1, 2, -10, 10, 0.1, function(value) { glo.params.B = value; });
  addSlider(panel, "stepC", "C", glo.params.C || 1, 2, -10, 10, 0.1, function(value) { glo.params.C = value; });
  addSlider(panel, "stepD", "D", glo.params.D || 1, 2, -10, 10, 0.1, function(value) { glo.params.D = value; });
}

function add_symmetrize_sliders() {
  var panel = new BABYLON.GUI.StackPanel();
  var panelButton = new BABYLON.GUI.StackPanel();
  var panelCheckB = new BABYLON.GUI.StackPanel();
  var panelScaleNorm = new BABYLON.GUI.StackPanel();

  babGui.applyOptions(panel, 'paramSymmetrizeSlidersPanel', 'panel right fourth noAutoParam', { hAlign: 'right', vAlign: 'top', w: 20, t: 37 });
  babGui.applyOptions(panelButton, 'paramSymmetrizeSlidersPanelButton', 'panel right fourth noAutoParam', { isVertical: false, hAlign: 'right', vAlign: 'top', w: 20, t: 55, pR: 0.5 });
  babGui.applyOptions(panelCheckB, 'paramSymmetrizeSlidersPanelChekB', 'panel right fourth noAutoParam', { hAlign: 'right', vAlign: 'top', h: 5, w: 20, t: 61.5, pR: 0.5 });
  babGui.applyOptions(panelScaleNorm, 'paramSymmetrizeSlidersPanelScaleNorm', 'panel right fourth noAutoParam', { hAlign: 'right', vAlign: 'top', h: 5, w: 20, t: 78.5, pR: 0.5 });

  glo.advancedTexture.addControl(panel);
  glo.advancedTexture.addControl(panelCheckB);
  glo.advancedTexture.addControl(panelScaleNorm);
  glo.advancedTexture.addControl(panelButton);

  [panel, panelButton, panelCheckB, panelScaleNorm].forEach(p => babGui.register(p));

  makePanelTitle('SymmetrizePanelTitle', 'Symmetrize', 34, 'header right fourth noAutoParam');

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

  function addSlider(parent, name, text, val, decimalPrecision, min, max, step, event, fontSize = 14, toShaders = false) {
    var header = new BABYLON.GUI.TextBlock();
    babGui.applyOptions(header, "header_" + name, 'header right fourth noAutoParam', { text: text + ": " + val, color: 'white', fontSize: fontSize, h: 20, pT: 4 }, true);
    parent.addControl(header);
    babGui.register(header);

    var slider = new BABYLON.GUI.Slider();
    babGui.applyOptions(slider, name, 'slider right fourth', { minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 18.5, background: 'grey' }, true);
    slider.startValue = val;
    babGui.register(slider);

    slider.onValueChangedObservable.add(async function(value) {
      header.text = text + ": " + value.toFixed(decimalPrecision);
      slider.lastValue = value;
      event(value);

      if (!toShaders) {
        getPathsInfos();
        glo.justSymmetrized = true;
        await remakeRibbon();
      } else {
        debouncedGiveMaterial();
      }
    });

    slider.onPointerClickObservable.add(function(e) {
      if (e.buttonIndex == 2) {
        slider.value = slider.startValue;
      }
    });

    parent.addControl(slider);
  }

  function add_button(name, text, width, height, paddingTop, paddingLeft, paddingRight, eventLeft, eventRight) {
    var button = BABYLON.GUI.Button.CreateSimpleButton(name, text);
    babGui.applyOptions(button, name, 'button right fourth noAutoParam', { w: width, h: height, pL: paddingLeft, pR: paddingRight, pT: paddingTop }, true);
    babGui.designButton(button);
    button.onPointerUpObservable.add(function(event) {
      if (event.buttonIndex !== 2) eventLeft();
      else eventRight();
    });
    panelButton.addControl(button);
    babGui.register(button);
  }

  addSlider(panel, "symmetrizeX", "X", 1, 0, 1, 24, 1, function(value) { glo.params.symmetrizeX = value; });
  addSlider(panel, "symmetrizeY", "Y", 1, 0, 1, 24, 1, function(value) { glo.params.symmetrizeY = value; });
  addSlider(panel, "symmetrizeZ", "Z", 1, 0, 1, 24, 1, function(value) { glo.params.symmetrizeZ = value; });
  addSlider(panel, "symmetrizeAngle", "Angle", 3.14, 2, PI / 16, 4 * PI, PI / 16, function(value) { glo.params.symmetrizeAngle = value; });

  addSlider(panelCheckB, "checkerboard", "Checkerboard", 0, 0, 0, 24, 1, function(value) { glo.params.checkerboard = value; glo.exceptionCreate = true; }, 16);

  addSlider(panelScaleNorm, "scaleNorm", "Scale", 1, 2, -24, 24, 0.01, function(value) { glo.scaleNorm = value; }, 14, true);

  add_button("centerLocal", "⊕ on origin", 100, 30, 0, 0, 0, function() {
    glo.params.centerIsLocal = !glo.params.centerIsLocal;
    glo.allControls.getByName('centerLocal').textBlock.text = glo.params.centerIsLocal ? "⊕ on mesh" : "⊕ on origin";
    remakeRibbon();
  }, function() {});

  add_button("symmetrizeOrder", "S order : XYZ", 100, 30, 0, 0, 0,
    function(value) { switchSymmetrizeOrder(true); },
    function(value) { switchSymmetrizeOrder(false); });

  add_button("symmetrizeAdding", "S add : OUI", 100, 30, 0, 0, 0, function(value) {
    glo.addSymmetry = !glo.addSymmetry;
    glo.allControls.getByName('symmetrizeAdding').textBlock.text = "S add : " + (glo.addSymmetry ? 'OUI' : 'NON');
    remakeRibbon();
  }, function(value) {});
}

function add_blender_sliders() {
  var panel = new BABYLON.GUI.StackPanel();
  babGui.applyOptions(panel, 'paramBlenderSlidersPanel', 'panel right eighth noAutoParam', { hAlign: 'right', vAlign: 'top', w: 20, t: 26, pR: 1 });
  glo.advancedTexture.addControl(panel);
  babGui.register(panel);

  makePanelTitle('BlenderPanelTitle', 'Blender', 22, 'header right eighth noAutoParam');

  function addSlider(parent, name, text, val, decimalPrecision, min, max, step, event) {
    var header = new BABYLON.GUI.TextBlock();
    babGui.applyOptions(header, "header_" + name, 'header right eighth noAutoParam', { text: text + ": " + val, color: 'white', fontSize: 14, h: 20, pT: 4 }, true);
    parent.addControl(header);
    babGui.register(header);

    var slider = new BABYLON.GUI.Slider();
    babGui.applyOptions(slider, name, 'slider right eighth', { minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 18.5, background: 'grey' }, true);
    slider.startValue = val;
    babGui.register(slider);

    slider.onValueChangedObservable.add(async function(value) {
      header.text = text + ": " + value.toFixed(decimalPrecision);
      slider.lastValue = value;
      event(value);
      await remakeRibbon();
    });

    slider.onPointerClickObservable.add(function(e) {
      if (e.buttonIndex == 2) {
        slider.value = slider.startValue;
      }
    });

    parent.addControl(slider);
  }

  addSlider(panel, "blendForce", "Blend Force", glo.params.blender?.force || 1, 3, 0, 24, 0.001, function(value) { glo.params.blender.force = value; });
  addSlider(panel, "blendX", "Blend X", glo.params.blender?.x || 0, 2, -24, 24, 0.1, function(value) { glo.params.blender.x = value; });
  addSlider(panel, "blendY", "Blend Y", glo.params.blender?.y || 0, 2, -24, 24, 0.1, function(value) { glo.params.blender.y = value; });
  addSlider(panel, "blendZ", "Blend Z", glo.params.blender?.z || 0, 2, -24, 24, 0.1, function(value) { glo.params.blender.z = value; });
}

function add_transformation_sliders() {
  var panel = new BABYLON.GUI.StackPanel();
  babGui.applyOptions(panel, 'paramTransformationSlidersPanel', 'panel right eighth noAutoParam', { hAlign: 'right', vAlign: 'top', w: 20, t: 60, pR: 1, pL: 1 });
  glo.advancedTexture.addControl(panel);
  babGui.register(panel);

  makePanelTitle('TransformationPanelTitle', 'Transformations', 56.5, 'header right eighth noAutoParam');

  function addSlider(parent, name, text, val, decimalPrecision, min, max, step, event) {
    var header = new BABYLON.GUI.TextBlock();
    babGui.applyOptions(header, "header_" + name, 'header right eighth noAutoParam', { text: text + ": " + val, color: 'white', fontSize: 14, h: 20, pT: 4 }, true);
    parent.addControl(header);
    babGui.register(header);

    var slider = new BABYLON.GUI.Slider();
    babGui.applyOptions(slider, name, 'slider right eighth', { minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 18.5, background: 'grey' }, true);
    slider.startValue = val;
    babGui.register(slider);

    slider.onValueChangedObservable.add(function(value) {
      let val;
      if (!glo.rightButton) {
        if (!name.includes('scaleVertex')) {
          header.text = text + ": " + value.toFixed(decimalPrecision);
        } else {
          if (value < 0) {
            val = parseFloat(value.toFixed(decimalPrecision));
            val = -(1 / (val - 1));
            val = parseFloat(val.toFixed(decimalPrecision));
            header.text = text + ": " + val;
          } else {
            val = 1 + parseFloat(value.toFixed(decimalPrecision));
            header.text = text + ": " + val;
          }
        }
        slider.lastValue = value;
        glo.params[name] = value;
        if (!name.includes('scaleVertex')) event(value);
        else event(val);
      }
      glo.rightButton = false;
    });

    slider.onPointerClickObservable.add(function(e) {
      if (e.buttonIndex == 2) {
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

  function addXYZSlider(parent, baseName, text, val, decimalPrecision, min, max, step, eventCallback) {
    var groupContainer = new BABYLON.GUI.StackPanel();
    groupContainer.isVertical = true;
    groupContainer.width = "100%";
    groupContainer.adaptHeightToChildren = true;
    parent.addControl(groupContainer);

    var header = new BABYLON.GUI.TextBlock();
    babGui.applyOptions(header, "header_" + baseName, 'header right eighth noAutoParam', {
      text: text + ": " + val,
      color: 'white',
      fontSize: 14,
      h: 20,
      pT: 4
    }, true);
    groupContainer.addControl(header);
    babGui.register(header);

    var rowContainer = new BABYLON.GUI.StackPanel();
    rowContainer.isVertical = false;
    rowContainer.height = "20px";
    rowContainer.width = "100%";
    groupContainer.addControl(rowContainer);

    var axisState = {
      x: { checked: true, value: val },
      y: { checked: false, value: val },
      z: { checked: false, value: val }
    };

    ['x', 'y', 'z'].forEach(function(axis) {
      var checkbox = new BABYLON.GUI.Checkbox();
      checkbox.width = "16px";
      checkbox.height = "16px";
      checkbox.isChecked = axisState[axis].checked;
      checkbox.color = axis === 'x' ? '#ff6666' : axis === 'y' ? '#66ff66' : '#6666ff';
      checkbox.background = "#333";
      rowContainer.addControl(checkbox);
      babGui.register(checkbox);

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
    babGui.applyOptions(slider, baseName, 'slider right eighth', { minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 18.5, background: 'grey' }, true);
    slider.startValue = val;
    slider.width = "100%";
    rowContainer.addControl(slider);
    babGui.register(slider);

    function getCheckedAxes() {
      return ['x', 'y', 'z'].filter(axis => axisState[axis].checked);
    }

    function getDisplayValue() {
      var checked = getCheckedAxes();
      if (checked.length === 0) return val;
      return axisState[checked[0]].value;
    }

    function updateSliderDisplay() {
      var displayVal = getDisplayValue();
      slider.value = displayVal;
      header.text = text + ": " + displayVal.toFixed(decimalPrecision);

      var checked = getCheckedAxes();
      if (checked.length === 0) {
        header.color = 'grey';
      } else if (checked.length === 1) {
        header.color = checked[0] === 'x' ? '#ff6666' : checked[0] === 'y' ? '#66ff66' : '#6666ff';
      } else {
        header.color = 'white';
      }
    }

    slider.onValueChangedObservable.add(function(value) {
      if (glo.rightButton) return;

      var checked = getCheckedAxes();
      header.text = text + ": " + value.toFixed(decimalPrecision);

      checked.forEach(function(axis) {
        axisState[axis].value = value;
        glo.params[baseName + axis.toUpperCase()] = value;
      });

      slider.lastValue = value;
      eventCallback(value, checked);
    });

    slider.onPointerClickObservable.add(function(e) {
      if (e.buttonIndex == 2) {
        glo.rightButton = true;
        var checked = getCheckedAxes();

        checked.forEach(function(axis) {
          axisState[axis].value = slider.startValue;
          glo.params[baseName + axis.toUpperCase()] = slider.startValue;
        });

        slider.value = slider.startValue;
        header.text = text + ": " + slider.startValue.toFixed(decimalPrecision);

        eventCallback(slider.startValue, checked);
        glo.rightButton = false;
      }
    });

    ['x', 'y', 'z'].forEach(function(axis) {
      glo.params[baseName + axis.toUpperCase()] = val;
    });

    updateSliderDisplay();
    return { header, slider, axisState };
  }

  addXYZSlider(panel, "scaling", "Scaling", 1, 2, 0, 24, .1, function(value, axes) {
    axes.forEach(function(axis) {
      transformMesh('scaling', axis, value);
    });
    applyTransformations();
  });

  addXYZSlider(panel, "rotation", "Rotation", 0, 3, -2 * PI, 2 * PI, PI / 180, function(value, axes) {
    axes.forEach(function(axis) {
      transformMesh('rotation', axis, value);
    });
  });

  addXYZSlider(panel, "position", "Position", 0, 0, -24, 24, 1, function(value, axes) {
    axes.forEach(function(axis) {
      transformMesh('position', axis, value);
    });
  });

  addXYZSlider(panel, "cSymmetry", "Center Symmetry", 0, 1, -24, 24, .1, function(value, axes) {
    axes.forEach(function(axis) {
      glo.centerSymmetry[axis] = value;
    });
    remakeRibbon();
  });

  addSlider(panel, "scaleVertex", "Scale Vertex", 1, 2, -24, 24, .1, function(value) {
    glo.scaleVertex = value;
    remakeRibbon();
  });
}

function add_sixth_panel_sliders() {
  let panelSliders = new BABYLON.GUI.StackPanel();
  let panelButtonSlidersUVOnOneSignU = new BABYLON.GUI.StackPanel();
  let panelButtonSlidersUVOnOneSignV = new BABYLON.GUI.StackPanel();
  let panelButtonInvFormulaCosSin = new BABYLON.GUI.StackPanel();
  let panelButtonInvFormulaUV = new BABYLON.GUI.StackPanel();
  let panelButtonInvPosXYZ = new BABYLON.GUI.StackPanel();

  function addPanel(panel, name, top, isVertical = true, width = 20, height = undefined) {
    babGui.applyOptions(panel, name, 'panel right sixth noAutoParam', { isVertical: isVertical, hAlign: 'right', vAlign: 'top', w: width, h: height, t: top, pR: 0.5 });
    glo.advancedTexture.addControl(panel);
    babGui.register(panel);
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

  function addSlider(parent, name, text, val, decimalPrecision, min, max, step, event) {
    var header = new BABYLON.GUI.TextBlock();
    babGui.applyOptions(header, "header_" + name, 'header right sixth noAutoParam', { text: text + ": " + val, color: 'white', fontSize: 14, h: 20, pT: 4 }, true);
    parent.addControl(header);
    babGui.register(header);

    var slider = new BABYLON.GUI.Slider();
    babGui.applyOptions(slider, name, 'slider right sixth', { minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 18.5, background: 'grey' }, true);
    slider.startValue = val;
    babGui.register(slider);

    slider.onValueChangedObservable.add(async function(value) {
      if (!name.includes('scaleNorm')) {
        header.text = text + ": " + value.toFixed(decimalPrecision);
      } else {
        if (value < 0) {
          val = parseFloat(value.toFixed(decimalPrecision));
          val = -(1 / (val - 1));
          val = parseFloat(val.toFixed(decimalPrecision));
          header.text = text + ": " + val;
        } else {
          val = 1 + parseFloat(value.toFixed(decimalPrecision));
          header.text = text + ": " + val;
        }
        value = val;
      }

      slider.lastValue = value;
      event(value);
      remakeRibbon();
    });

    slider.onPointerClickObservable.add(function(e) {
      if (e.buttonIndex == 2) {
        slider.value = slider.startValue;
        remakeRibbon();
      }
    });

    parent.addControl(slider);
  }

  function addButton(panelButton, name, text, width, height, paddingLeft, paddingRight, eventLeft, eventRight) {
    var button = BABYLON.GUI.Button.CreateSimpleButton(name, text);
    babGui.applyOptions(button, name, 'button left first', { w: width, h: height, pL: paddingLeft, pR: paddingRight }, true);
    babGui.designButton(button);
    button.onPointerUpObservable.add(function(event) {
      if (event.buttonIndex !== 2) eventLeft();
      else eventRight();
    });
    panelButton.addControl(button);
    babGui.register(button);
  }

  addSlider(panelSliders, "checkerboardNbSteps", "Checkerboard nb steps", 2, 2, 1.1, 24, .1, function(value) { glo.params.checkerboardNbSteps = value; });
  addSlider(panelSliders, "firstPointOffsetX", "First point offset X", 1, 1, -24, 24, .5, function(value) { glo.firstPoint.x = value; });
  addSlider(panelSliders, "firstPointOffsetY", "First point offset Y", 0, 1, -24, 24, .5, function(value) { glo.firstPoint.y = value; });
  addSlider(panelSliders, "firstPointOffsetZ", "First point offset Z", 0, 1, -24, 24, .5, function(value) { glo.firstPoint.z = value; });
  addSlider(panelSliders, "expanseAngleX", "Expanse angle X", 0, 2, -PI, PI, PI / 16, function(value) { glo.angleToUpdateRibbon.x = value; });
  addSlider(panelSliders, "expanseAngleY", "Expanse angle Y", 0, 2, -PI, PI, PI / 16, function(value) { glo.angleToUpdateRibbon.y = value; });

  const buttonSizes = { width: 215, height: 33 };

  addButton(panelButtonSlidersUVOnOneSignU, "slidersUVOnOneSignU", "Slider U sign : OUI", buttonSizes.width, buttonSizes.height, 0, 0, function(value) {
    glo.slidersUVOnOneSign.u = !glo.slidersUVOnOneSign.u;
    let slidersUVOnOneSignU = glo.allControls.getByName('slidersUVOnOneSignU');
    slidersUVOnOneSignU.textBlock.text = "Slider U sign : " + (glo.slidersUVOnOneSign.u ? 'NON' : 'OUI');
    if (glo.slidersUVOnOneSign.u) {
      slidersUVOnOneSignU.min = 0;
    } else {
      slidersUVOnOneSignU.min = -glo.params.u;
    }
    glo.allControls.getByName('uvSliderHeader-u').text = 'U : ' + (Math.round(100 * slidersUVOnOneSignU.min, 2) / 100) + ' - ' + (Math.round(100 * glo.params.u, 2) / 100);
    remakeRibbon();
  }, function(value) {});

  addButton(panelButtonSlidersUVOnOneSignV, "slidersUVOnOneSignV", "Slider V sign : OUI", buttonSizes.width, buttonSizes.height, 0, 0, function(value) {
    glo.slidersUVOnOneSign.v = !glo.slidersUVOnOneSign.v;
    let slidersUVOnOneSignV = glo.allControls.getByName('slidersUVOnOneSignV');
    slidersUVOnOneSignV.textBlock.text = "Slider V sign : " + (glo.slidersUVOnOneSign.v ? 'NON' : 'OUI');
    if (glo.slidersUVOnOneSign.v) {
      slidersUVOnOneSignV.min = 0;
    } else {
      slidersUVOnOneSignV.min = -glo.params.v;
    }
    glo.allControls.getByName('uvSliderHeader-v').text = 'V : ' + (Math.round(100 * slidersUVOnOneSignV.min, 2) / 100) + ' - ' + (Math.round(100 * glo.params.v, 2) / 100);
    remakeRibbon();
  }, function(value) {});

  addButton(panelButtonInvFormulaCosSin, "InvFormulaCosSin", "Inv cos sin", buttonSizes.width, buttonSizes.height, 0, 0, function(value) {
    invElemInInput("cos", "sin", false);
    invElemInInput("cu", "su", false);
    invElemInInput("cv", "sv");
  }, function(value) {});

  addButton(panelButtonInvFormulaUV, "InvFormulaUV", "Inv UV", buttonSizes.width, buttonSizes.height, 0, 0, async function(value) {
    await invElemInInput("u", "v");
  }, function(value) {});
}

function add_functionIt_sliders() {
  var panel = new BABYLON.GUI.StackPanel();
  babGui.applyOptions(panel, 'paramFunctionItSlidersPanel', 'panel right eighth noAutoParam', { hAlign: 'right', vAlign: 'top', w: 20, t: 26, pR: 1 });
  glo.advancedTexture.addControl(panel);
  babGui.register(panel);

  makePanelTitle('FunctionItPanelTitle', 'Function Iteration', 22, 'header right eighth noAutoParam');

  function addSlider(parent, name, text, val, decimalPrecision, min, max, step, event) {
    var header = new BABYLON.GUI.TextBlock();
    babGui.applyOptions(header, "header_" + name, 'header right eighth noAutoParam', { text: text + ": " + val, color: 'white', fontSize: 14, h: 20, pT: 4 }, true);
    parent.addControl(header);
    babGui.register(header);

    var slider = new BABYLON.GUI.Slider();
    babGui.applyOptions(slider, name, 'slider right eighth', { minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 18.5, background: 'grey' }, true);
    slider.startValue = val;
    babGui.register(slider);

    slider.onValueChangedObservable.add(async function(value) {
      header.text = text + ": " + value.toFixed(decimalPrecision);
      slider.lastValue = value;
      event(value);
      await remakeRibbon();
    });

    slider.onPointerClickObservable.add(function(e) {
      if (e.buttonIndex == 2) {
        slider.value = slider.startValue;
      }
    });

    parent.addControl(slider);
  }

  addSlider(panel, "functionItNb", "Iterations", glo.params.functionIt?.nb || 1, 0, 1, 24, 1, function(value) { glo.params.functionIt.nb = value; });
  addSlider(panel, "functionItScale", "Scale", glo.params.functionIt?.scale || 1, 2, 0, 5, 0.01, function(value) { glo.params.functionIt.scale = value; });
}

function add_ninethPanel_controls() {
  var panel = new BABYLON.GUI.StackPanel();
  babGui.applyOptions(panel, 'ninethPanelPanel', 'panel right nineth noAutoParam', { hAlign: 'right', vAlign: 'top', w: 20, t: 26, pR: 1 });
  glo.advancedTexture.addControl(panel);
  babGui.register(panel);

  makePanelTitle('NinethPanelTitle', 'Panel 9', 22, 'header right nineth noAutoParam');

  function addSlider(parent, name, text, val, decimalPrecision, min, max, step, event) {
    var header = new BABYLON.GUI.TextBlock();
    babGui.applyOptions(header, "header_" + name, 'header right nineth noAutoParam', { text: text + ": " + val, color: 'white', fontSize: 14, h: 20, pT: 4 }, true);
    parent.addControl(header);
    babGui.register(header);

    var slider = new BABYLON.GUI.Slider();
    babGui.applyOptions(slider, name, 'slider right nineth', { minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 18.5, background: 'grey' }, true);
    slider.startValue = val;
    babGui.register(slider);

    slider.onValueChangedObservable.add(async function(value) {
      header.text = text + ": " + value.toFixed(decimalPrecision);
      slider.lastValue = value;
      event(value);
      await remakeRibbon();
    });

    slider.onPointerClickObservable.add(function(e) {
      if (e.buttonIndex == 2) {
        slider.value = slider.startValue;
      }
    });

    parent.addControl(slider);
  }

  addSlider(panel, "ninethParam1", "Param 1", 0, 2, -10, 10, 0.1, function(value) { glo.params.nineth = glo.params.nineth || {}; glo.params.nineth.param1 = value; });
  addSlider(panel, "ninethParam2", "Param 2", 0, 2, -10, 10, 0.1, function(value) { glo.params.nineth = glo.params.nineth || {}; glo.params.nineth.param2 = value; });
}

function add_fractalize_controls() {
  var panel = new BABYLON.GUI.StackPanel();
  babGui.applyOptions(panel, 'tenthPanelPanel', 'panel right tenth noAutoParam', { hAlign: 'right', vAlign: 'top', w: 20, t: 32, pR: 1 });
  glo.advancedTexture.addControl(panel);
  babGui.register(panel);

  var panelButton = new BABYLON.GUI.StackPanel();
  babGui.applyOptions(panelButton, 'tenthPanelButton', 'panel right tenth noAutoParam', { isVertical: false, hAlign: 'right', vAlign: 'top', w: 20, h: 7, t: 77, pL: 7 });
  glo.advancedTexture.addControl(panelButton);
  babGui.register(panelButton);

  var panelButton2 = new BABYLON.GUI.StackPanel();
  babGui.applyOptions(panelButton2, 'tenthPanelButton2', 'panel right tenth noAutoParam', { isVertical: false, hAlign: 'right', vAlign: 'top', w: 20, h: 7, t: 81.5, pL: 0 });
  glo.advancedTexture.addControl(panelButton2);
  babGui.register(panelButton2);

  var panelTitle = new BABYLON.GUI.StackPanel();
  babGui.applyOptions(panelTitle, 'tenthPanelTitle', 'panel right tenth noAutoParam', { isVertical: false, hAlign: 'right', vAlign: 'top', w: 13.25, h: 4, t: 27 });
  glo.advancedTexture.addControl(panelTitle);
  babGui.register(panelTitle);

  var headerTitle = new BABYLON.GUI.TextBlock();
  headerTitle.text = "Pseudo fractal";
  headerTitle.color = "white";
  headerTitle.height = "30px";
  headerTitle.width = "100%";
  headerTitle.fontSize = 18;
  headerTitle.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
  babGui.applyOptions(headerTitle, 'tenthPanelHeaderTitle', 'header right tenth noAutoParam');
  panelTitle.addControl(headerTitle);
  babGui.register(headerTitle);

  function add_button(name, text, width, height, paddingLeft, paddingRight, eventLeft, eventRight, panelButt = panelButton, background = glo.controlConfig.background) {
    var button = BABYLON.GUI.Button.CreateSimpleButton(name, text);
    babGui.applyOptions(button, name, 'button right tenth', { background: background, w: width, h: height, pL: paddingLeft, pR: paddingRight }, true);
    babGui.designButton(button);
    button.onPointerUpObservable.add(function(event) {
      if (event.buttonIndex !== 2) eventLeft();
      else if (eventRight) eventRight();
    });
    panelButt.addControl(button);
    babGui.register(button);
  }

  function addSlider(parent, name, text, val, decimalPrecision, min, max, step, event) {
    var header = new BABYLON.GUI.TextBlock();
    babGui.applyOptions(header, "header_" + name, 'header right tenth noAutoParam', { text: text + ": " + val, color: 'white', fontSize: 14, h: 20, pT: 4 }, true);
    parent.addControl(header);
    babGui.register(header);

    var slider = new BABYLON.GUI.Slider();
    babGui.applyOptions(slider, name, 'slider right tenth', { minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 18.5, background: 'grey' }, true);
    slider.startValue = val;
    babGui.register(slider);

    slider.onValueChangedObservable.add(function(value) {
      if (!glo.rightButton) {
        header.text = text + ": " + value.toFixed(decimalPrecision);
        event(value);
      }
      glo.rightButton = false;
    });

    slider.onPointerClickObservable.add(function(e) {
      if (e.buttonIndex == 2) {
        glo.rightButton = true;
        header.text = text + ": " + slider.startValue;
        slider.value = slider.startValue;
        event(slider.value);
      }
    });

    parent.addControl(slider);
  }

  addSlider(panel, "fractalizedStepsU", "Nb cloned in U", 12, 0, 1, 132, 1, async function(value) {
    glo.params.fractalize.fractalized.steps.u = value;
    await remakeRibbon();
  });
  addSlider(panel, "fractalizedStepsV", "Nb cloned in V", 12, 0, 1, 132, 1, async function(value) {
    glo.params.fractalize.fractalized.steps.v = value;
    await remakeRibbon();
  });
  addSlider(panel, "fractalizeStepsU", "Cloned Steps U", 12, 0, 1, 132, 1, async function(value) {
    glo.params.fractalize.steps.u = value;
    await remakeRibbon();
  });
  addSlider(panel, "fractalizeStepsV", "Cloned Steps V", 12, 0, 1, 132, 1, async function(value) {
    glo.params.fractalize.steps.v = value;
    await remakeRibbon();
  });
  addSlider(panel, "fractalizeRotateX", "Rot X", 0, 2, 0, 2 * PI, 0.01, async function(value) {
    glo.params.fractalize.rot.x = value;
    await remakeRibbon();
  });
  addSlider(panel, "fractalizeRotateY", "Rot Y", 0, 2, 0, 2 * PI, 0.01, async function(value) {
    glo.params.fractalize.rot.y = value;
    await remakeRibbon();
  });
  addSlider(panel, "fractalizeRotateZ", "Rot Z", 0, 2, 0, 2 * PI, 0.01, async function(value) {
    glo.params.fractalize.rot.z = value;
    await remakeRibbon();
  });
  addSlider(panel, "fractalizeScaleAll", "Scale All", 1, 2, 0, 8, 0.01, async function(value) {
    glo.params.fractalize.scale.all = value;
    await remakeRibbon();
  });
  addSlider(panel, "fractalizeScaleX", "Scale X", 1, 2, 0, 8, 0.01, async function(value) {
    glo.params.fractalize.scale.x = value;
    await remakeRibbon();
  });
  addSlider(panel, "fractalizeScaleY", "Scale Y", 1, 2, 0, 8, 0.01, async function(value) {
    glo.params.fractalize.scale.y = value;
    await remakeRibbon();
  });
  addSlider(panel, "fractalizeScaleZ", "Scale Z", 1, 2, 0, 8, 0.01, async function(value) {
    glo.params.fractalize.scale.z = value;
    await remakeRibbon();
  });

  add_button("refractalize", "Refract", glo.buttonBottomSize, glo.buttonBottomHeight, glo.buttonBottomPaddingLeft, 0, async function() {
    if (glo.params.fractalize.actived) {
      swapControlBackground("refractalize", glo.controlConfig.background, glo.controlConfig.backgroundActived);
      glo.params.fractalize.refractalize = !glo.params.fractalize.refractalize;
      await remakeRibbon();
    }
  }, undefined, panelButton, glo.controlConfig.background);

  add_button("fractalizeActive", "ON", glo.buttonBottomSize, glo.buttonBottomHeight, glo.buttonBottomPaddingLeft, 0, async function() {
    swapControlBackground("fractalizeActive", glo.controlConfig.background, glo.controlConfig.backgroundActived);
    glo.params.fractalize.actived = !glo.params.fractalize.actived;
    await remakeRibbon();
  }, undefined, panelButton2, glo.controlConfig.background);

  add_button("fractalizeRotActive", "No Rot", glo.buttonBottomSize, glo.buttonBottomHeight, glo.buttonBottomPaddingLeft, 0,
    async function() {
      await switchFractalOrient();
    },
    async function() {
      await switchFractalOrient(false);
    },
    panelButton2, glo.controlConfig.background);

  add_button("fractalizeScalingActive", "Scale", glo.buttonBottomSize, glo.buttonBottomHeight, glo.buttonBottomPaddingLeft, 0, async function() {
    swapControlBackground("fractalizeScalingActive", glo.controlConfig.background, glo.controlConfig.backgroundActived);
    glo.params.fractalize.scaleToDistPath = !glo.params.fractalize.scaleToDistPath;
    await remakeRibbon();
  }, undefined, panelButton2, glo.controlConfig.background);

  add_button("fractalizeLineOnMesh", "Line", glo.buttonBottomSize, glo.buttonBottomHeight, glo.buttonBottomPaddingLeft, 0, async function() {
    swapControlBackground("fractalizeLineOnMesh", glo.controlConfig.background, glo.controlConfig.backgroundActived);
    glo.params.fractalize.lineOnNewMeshes = !glo.params.fractalize.lineOnNewMeshes;
    await remakeRibbon();
  }, undefined, panelButton2, glo.controlConfig.background);
}

function add_eleventh_panel_sliders() {
  var panel = new BABYLON.GUI.StackPanel();
  babGui.applyOptions(panel, 'eleventhPanelPanel', 'panel right eleventh noAutoParam', { hAlign: 'right', vAlign: 'top', w: 20, t: 26, pR: 1 });
  glo.advancedTexture.addControl(panel);
  babGui.register(panel);

  makePanelTitle('EleventhPanelTitle', 'Panel 11', 22, 'header right eleventh noAutoParam');

  function addSlider(parent, name, text, val, decimalPrecision, min, max, step, event) {
    var header = new BABYLON.GUI.TextBlock();
    babGui.applyOptions(header, "header_" + name, 'header right eleventh noAutoParam', { text: text + ": " + val, color: 'white', fontSize: 14, h: 20, pT: 4 }, true);
    parent.addControl(header);
    babGui.register(header);

    var slider = new BABYLON.GUI.Slider();
    babGui.applyOptions(slider, name, 'slider right eleventh', { minimum: min, maximum: max, value: val, lastValue: val, startValue: val, step: step, h: 18.5, background: 'grey' }, true);
    slider.startValue = val;
    babGui.register(slider);

    slider.onValueChangedObservable.add(async function(value) {
      header.text = text + ": " + value.toFixed(decimalPrecision);
      slider.lastValue = value;
      event(value);
      await remakeRibbon();
    });

    slider.onPointerClickObservable.add(function(e) {
      if (e.buttonIndex == 2) {
        slider.value = slider.startValue;
      }
    });

    parent.addControl(slider);
  }

  addSlider(panel, "eleventhParam1", "Param 1", 0, 2, -10, 10, 0.1, function(value) { glo.params.eleventh = glo.params.eleventh || {}; glo.params.eleventh.param1 = value; });
  addSlider(panel, "eleventhParam2", "Param 2", 0, 2, -10, 10, 0.1, function(value) { glo.params.eleventh = glo.params.eleventh || {}; glo.params.eleventh.param2 = value; });
}
