/**
 * Structure complète du contenu GUI de l'application
 * Cet objet documente tous les panels et contrôles de gui.js
 * Organisé par conteneur principal (first/onlyMainGui, second, third, fourth, sixth, seventh, eighth, tenth, eleventh)
 */

const guiContentStructure = {

  // ============================================================================
  // FIRST / ONLYMAIN GUI - Panneau principal visible par défaut
  // ============================================================================
  first: {
    description: "Panneau principal visible par défaut (gauche et droite)",

    panels: {
      // --- PANNEAU GAUCHE - SLIDERS U/V ---
      panel_u: {
        name: "panel_u",
        class: "panel left first",
        layout: { hAlign: "left", vAlign: "top", w: 20 },
        controls: [
          {
            type: "TextBlock",
            name: "uvSliderHeader-u",
            class: "header left first",
            properties: { text: "U : -value — value" }
          },
          {
            type: "Slider",
            name: "u",
            class: "slider left first",
            properties: { minimum: 0, maximum: "6*PI", value: "glo.params.u", startValue: "glo.params.u" }
          }
        ]
      },
      panel_v: {
        name: "panel_v",
        class: "panel left first",
        layout: { hAlign: "left", vAlign: "top", w: 20 },
        controls: [
          {
            type: "TextBlock",
            name: "uvSliderHeader-v",
            class: "header left first",
            properties: { text: "V : -value — value" }
          },
          {
            type: "Slider",
            name: "v",
            class: "slider left first",
            properties: { minimum: 0, maximum: "6*PI", value: "glo.params.v", startValue: "glo.params.v" }
          }
        ]
      },

      // --- PANNEAU GAUCHE - SLIDER TRANSPARENCE ---
      panelAlphaSlider: {
        name: "panelAlphaSlider",
        class: "panel left first",
        layout: { hAlign: "left", vAlign: "top", w: 20 },
        controls: [
          {
            type: "TextBlock",
            name: "alphaSliderHeader",
            class: "header left first",
            properties: { text: "Transparency" }
          },
          {
            type: "Slider",
            name: "alphaSlider",
            class: "slider left first",
            properties: { minimum: 0, maximum: 1, value: "glo.ribbon_alpha" }
          }
        ]
      },

      // --- PANNEAU GAUCHE - INPUTS EQUATIONS ---
      inputsEquations: {
        name: "inputsEquations",
        class: "panel left first",
        layout: { hAlign: "left", vAlign: "top", w: 20, t: "20%" },
        controls: [
          {
            type: "TextBlock",
            name: "header_inputX",
            class: "header left first",
            properties: { text: "X" }
          },
          {
            type: "InputText",
            name: "inputX",
            class: "input equation left first",
            properties: { text: "u", w: 350, fontWeight: "500", fontSize: 19, h: 25 }
          },
          {
            type: "TextBlock",
            name: "header_inputY",
            class: "header left first",
            properties: { text: "Y" }
          },
          {
            type: "InputText",
            name: "inputY",
            class: "input equation left first",
            properties: { text: "usv", w: 350, fontWeight: "500", fontSize: 19, h: 25 }
          },
          {
            type: "TextBlock",
            name: "header_inputZ",
            class: "header left first",
            properties: { text: "Z" }
          },
          {
            type: "InputText",
            name: "inputZ",
            class: "input equation left first",
            properties: { text: "ucvsu", w: 350, fontWeight: "500", fontSize: 19, h: 25 }
          },
          {
            type: "TextBlock",
            name: "header_inputAlpha",
            class: "header left first",
            properties: { text: "Rot Z" }
          },
          {
            type: "InputText",
            name: "inputAlpha",
            class: "input equation left first",
            properties: { text: "", w: 350, fontWeight: "500", fontSize: 19, h: 25 }
          },
          {
            type: "TextBlock",
            name: "header_inputBeta",
            class: "header left first",
            properties: { text: "Rot Y" }
          },
          {
            type: "InputText",
            name: "inputBeta",
            class: "input equation left first",
            properties: { text: "", w: 350, fontWeight: "500", fontSize: 19, h: 25 }
          }
        ]
      },

      // --- PANNEAU GAUCHE - RADIOS FORMES ---
      panelRadios: {
        name: "panelRadios",
        class: "panel right first noAutoParam",
        layout: { hAlign: "left", vAlign: "top", w: 20, t: 50, pL: 1 },
        controls: [
          {
            type: "TextBlock",
            name: "header_forms",
            class: "header left first",
            properties: { text: "Forms :" }
          },
          {
            type: "RadioButton[]",
            description: "Liste dynamique de radio buttons pour chaque forme",
            class: "radio left first",
            properties: { w: 13, h: 13, group: "radiosForms" }
          }
        ]
      },

      // --- PANNEAU GAUCHE - BOUTONS GRID/PLAN/COORD ---
      lineDim: {
        name: "lineDim",
        class: "panel left first noAutoParam",
        layout: { isVertical: false, hAlign: "left", w: 20, h: 5, t: -3, pL: 1.77 },
        controls: [
          {
            type: "Button",
            name: "but_grid",
            class: "button left first",
            properties: { text: "GRID", w: 60, h: 30, pL: 0, pR: 0 }
          },
          {
            type: "Button",
            name: "but_plan",
            class: "button left first",
            properties: { text: "PLAN", w: 60, h: 30, pL: 10, pR: 0 }
          },
          {
            type: "Button",
            name: "but_coord",
            class: "button left first",
            properties: { text: "CART", w: 70, h: 30, pL: 10, pR: 0 }
          },
          {
            type: "Button",
            name: "but_lines_state",
            class: "button left first",
            properties: { text: "LINE", w: 70, h: 30, pL: 10, pR: 0 }
          },
          {
            type: "Button",
            name: "but_dimension",
            class: "button left first",
            properties: { text: "EXP", w: 60, h: 30, pL: 10, pR: 0 }
          }
        ]
      },

      // --- PANNEAU DROIT BAS - BOUTONS HIDE/SWITCH/HELP ---
      hideSwitchHelp: {
        name: "hideSwitchHelp",
        class: "panel right first noAutoParam",
        layout: { isVertical: false, hAlign: "right", vAlign: "bottom", w: 20, l: 3, t: -1, height: "80px" },
        controls: [
          {
            type: "Button",
            name: "but_hide",
            class: "button right first",
            properties: { text: "HIDE", w: "glo.buttonBottomSize", h: "glo.buttonBottomHeight", pL: "glo.buttonBottomPaddingLeft" }
          },
          {
            type: "Button",
            name: "but_switch",
            class: "button right first",
            properties: { text: "SWITCH", w: "glo.buttonBottomSize", h: "glo.buttonBottomHeight", pL: "glo.buttonBottomPaddingLeft" }
          },
          {
            type: "Button",
            name: "but_help",
            class: "button right first",
            properties: { text: "HELP", w: "glo.buttonBottomSize", h: "glo.buttonBottomHeight", pL: "glo.buttonBottomPaddingLeft" }
          }
        ]
      },

      // --- PANNEAU DROIT HAUT - BOUTONS AXIS/ROT/FULLSCREEN/BOX ---
      axisAndRotButton: {
        name: "axisAndRotButton",
        class: "panel right first noAutoParam",
        layout: { isVertical: false, hAlign: "right", vAlign: "top", w: 15, h: 5, t: 20, pL: -2.5 },
        controls: [
          {
            type: "Button",
            name: "but_axis",
            class: "button right first",
            properties: { text: "AXIS", w: 70, h: "100/3", pL: 10 }
          },
          {
            type: "Button",
            name: "but_rot",
            class: "button right first",
            properties: { text: "Rot α", w: 70, h: "100/3", pL: 10 }
          },
          {
            type: "Button",
            name: "but_screen",
            class: "button right first",
            properties: { text: "↗ S", h: 35, pL: 10, w: "0.2 (20%)" }
          },
          {
            type: "Button",
            name: "but_box",
            class: "button right first",
            properties: { text: "BOX", w: 70, h: "100/3", pL: 10 }
          }
        ]
      },

      // --- PANNEAU DROIT - SLIDERS STEPS U/V ---
      panel_stepU: {
        name: "panel_stepU",
        class: "panel right first",
        layout: { hAlign: "right", vAlign: "top", w: 20 },
        controls: [
          {
            type: "TextBlock",
            name: "Steps U",
            class: "header right first",
            properties: { text: "Steps U : value" }
          },
          {
            type: "Slider",
            name: "stepU",
            class: "slider right first",
            properties: { minimum: 1, maximum: 264, value: "glo.params.steps_u", startValue: "glo.params.steps_u" }
          }
        ]
      },
      panel_stepV: {
        name: "panel_stepV",
        class: "panel right first",
        layout: { hAlign: "right", vAlign: "top", w: 20 },
        controls: [
          {
            type: "TextBlock",
            name: "Steps V",
            class: "header right first",
            properties: { text: "Steps V : value" }
          },
          {
            type: "Slider",
            name: "stepV",
            class: "slider right first",
            properties: { minimum: 1, maximum: 264, value: "glo.params.steps_v", startValue: "glo.params.steps_v" }
          }
        ]
      },

      // --- PANNEAU GAUCHE BAS - BOUTONS HISTORIQUE ---
      panelHistoButton: {
        name: "panelHistoButton",
        class: "panel right left noAutoParam",
        layout: { isVertical: false, hAlign: "left", vAlign: "bottom", w: 20, l: 5.66, t: -1, height: "80px" },
        controls: [
          {
            type: "Button",
            name: "but_goBack",
            class: "button right left noAutoParam",
            properties: { text: "<", w: 80, h: 30, pL: 10, fontSize: "20px" }
          },
          {
            type: "Button",
            name: "but_goTo",
            class: "button right left noAutoParam",
            properties: { text: ">", w: 80, h: 30, pL: 10, fontSize: "20px" }
          }
        ]
      },

      // --- PANNEAU DROIT - BOUTONS VUES X/Y/Z ---
      viewsButtonsPanel: {
        name: "viewsButtonsPanel",
        class: "panel right first noAutoParam",
        layout: { isVertical: false, hAlign: "right", vAlign: "top", w: 20, h: 5, t: 14.5, pL: 5.5 },
        controls: [
          {
            type: "Button",
            name: "but_viewX",
            class: "button right first",
            properties: { text: "X", w: 52.5, h: 30, pL: 0 }
          },
          {
            type: "Button",
            name: "but_viewY",
            class: "button right first",
            properties: { text: "Y", w: 60, h: 30, pL: 10 }
          },
          {
            type: "Button",
            name: "but_viewZ",
            class: "button right first",
            properties: { text: "Z", w: 60, h: 30, pL: 10 }
          }
        ]
      },

      // --- PANNEAU DROIT - COLOR PICKERS (onlyMainGui) ---
      colorHeaderPan: {
        name: "colorHeaderPan",
        class: "panel right first noAutoParam onlyMainGui",
        layout: { hAlign: "right", vAlign: "top", w: 20, h: 15, t: 21, pL: 8, isVertical: false },
        controls: [
          {
            type: "TextBlock",
            name: "colorHeader",
            class: "header right first noAutoParam onlyMainGui",
            properties: { text: "Colors", fontSize: 24, color: "white" }
          }
        ]
      },
      colorHeaderTitleUI: {
        name: "colorHeaderTitleUI",
        class: "panel right first noAutoParam onlyMainGui",
        layout: { hAlign: "right", vAlign: "top", w: 20, h: 15, t: 26, pL: 9.5, isVertical: false },
        controls: [
          {
            type: "TextBlock",
            name: "headerUI",
            class: "header right first noAutoParam onlyMainGui",
            properties: { text: "UI", fontSize: 20 }
          }
        ]
      },
      colorHeaderTitleMesh: {
        name: "colorHeaderTitleMesh",
        class: "panel right first noAutoParam onlyMainGui",
        layout: { hAlign: "right", vAlign: "top", w: 20, h: 15, t: 45, pL: 8.5, isVertical: false },
        controls: [
          {
            type: "TextBlock",
            name: "headerMesh",
            class: "header right first noAutoParam onlyMainGui",
            properties: { text: "Mesh", fontSize: 20 }
          }
        ]
      },
      colorTitleUIBg: {
        name: "colorTitleUIBg",
        class: "panel right first noAutoParam onlyMainGui",
        layout: { hAlign: "right", vAlign: "top", w: 20, h: 2, t: 35.5, pL: 4.875, isVertical: false },
        controls: [
          {
            type: "TextBlock",
            name: "headerUIBg",
            class: "header right first noAutoParam onlyMainGui",
            properties: { text: "Background", fontSize: 16 }
          }
        ]
      },
      colorTitleUIButton: {
        name: "colorTitleUIButton",
        class: "panel right first noAutoParam onlyMainGui",
        layout: { hAlign: "right", vAlign: "top", w: 20, h: 2, t: 35.5, pL: 11.4166, isVertical: false },
        controls: [
          {
            type: "TextBlock",
            name: "headerUIButton",
            class: "header right first noAutoParam onlyMainGui",
            properties: { text: "Button", fontSize: 16 }
          }
        ]
      },
      colorTitleMeshBg: {
        name: "colorTitleMeshBg",
        class: "panel right first noAutoParam onlyMainGui",
        layout: { hAlign: "right", vAlign: "top", w: 20, h: 2, t: 55, pL: 2.4166, isVertical: false },
        controls: [
          {
            type: "TextBlock",
            name: "headerMeshBg",
            class: "header right first noAutoParam onlyMainGui",
            properties: { text: "Background", fontSize: 16 }
          }
        ]
      },
      colorTitleMeshDiffuse: {
        name: "colorTitleMeshDiffuse",
        class: "panel right first noAutoParam onlyMainGui",
        layout: { hAlign: "right", vAlign: "top", w: 20, h: 2, t: 55, pL: 8.875, isVertical: false },
        controls: [
          {
            type: "TextBlock",
            name: "headerMeshDiffuse",
            class: "header right first noAutoParam onlyMainGui",
            properties: { text: "Diffuse", fontSize: 16 }
          }
        ]
      },
      colorTitleMeshLine: {
        name: "colorTitleMeshLine",
        class: "panel right first noAutoParam onlyMainGui",
        layout: { hAlign: "right", vAlign: "top", w: 20, h: 2, t: 55, pL: 14.66, isVertical: false },
        controls: [
          {
            type: "TextBlock",
            name: "headerMeshLine",
            class: "header right first noAutoParam onlyMainGui",
            properties: { text: "Lines", fontSize: 16 }
          }
        ]
      },
      colorTitleRandom: {
        name: "colorTitleRandom",
        class: "panel right first noAutoParam onlyMainGui",
        layout: { hAlign: "right", vAlign: "top", w: 20, h: 2, t: 72, pL: 8.25, isVertical: false },
        controls: [
          {
            type: "TextBlock",
            name: "headerRandomColor",
            class: "header right first noAutoParam onlyMainGui",
            properties: { text: "Random", fontSize: 20 }
          }
        ]
      },
      pickerColorPan1: {
        name: "pickerColorPan1",
        class: "panel right first noAutoParam onlyMainGui",
        layout: { hAlign: "right", vAlign: "top", w: 20, h: 15, t: 35, pL: 4.5, isVertical: false },
        controls: [
          {
            type: "ColorPicker",
            name: "pickerColorBackground",
            class: "picker right first onlyMainGui",
            properties: { value: "glo.backgroundColor", hAlign: "center", w: "glo.pickers_size", h: "glo.pickers_size", pT: 5 }
          },
          {
            type: "ColorPicker",
            name: "pickerColorButton",
            class: "picker right first onlyMainGui",
            properties: { value: "glo.lineColor", hAlign: "center", w: "glo.pickers_size", h: "glo.pickers_size", pT: 5 }
          }
        ]
      },
      pickerColorPan2: {
        name: "pickerColorPan2",
        class: "panel right first noAutoParam onlyMainGui",
        layout: { hAlign: "right", vAlign: "top", w: 20, h: 15, t: 55, pL: 2, isVertical: false },
        controls: [
          {
            type: "ColorPicker",
            name: "pickerColorEmissive",
            class: "picker right first onlyMainGui",
            properties: { value: "glo.emissiveColor", hAlign: "center", w: "glo.pickers_size", h: "glo.pickers_size", pT: 5 }
          },
          {
            type: "ColorPicker",
            name: "pickerColorDiffuse",
            class: "picker right first onlyMainGui",
            properties: { value: "glo.diffuseColor", hAlign: "center", w: "glo.pickers_size", h: "glo.pickers_size", pT: 5 }
          },
          {
            type: "ColorPicker",
            name: "pickerColorLine",
            class: "picker right first onlyMainGui",
            properties: { value: "glo.lineColor", hAlign: "center", w: "glo.pickers_size", h: "glo.pickers_size", pT: 5 }
          }
        ]
      },
      uiColorButtons: {
        name: "uiColorButtons",
        class: "panel right first noAutoParam onlyMainGui",
        layout: { hAlign: "right", vAlign: "top", w: 20, h: 15, t: 73, pL: 4.166, isVertical: false, height: "70px" },
        controls: [
          {
            type: "Button",
            name: "randomUIAllColorButton",
            class: "button right first onlyMainGui noAutoParam",
            properties: { text: "All", w: "25%", h: 30, pT: 0, pL: 0, pR: 0 }
          },
          {
            type: "Button",
            name: "randomUILightColorButton",
            class: "button right first onlyMainGui noAutoParam",
            properties: { text: "Light", w: "25%", h: 30, pT: 0, pL: 10, pR: 0 }
          },
          {
            type: "Button",
            name: "resetColorButton",
            class: "button right first onlyMainGui noAutoParam",
            properties: { text: "Reset", w: "25%", h: 30, pT: 0, pL: 10, pR: 0 }
          }
        ]
      }
    }
  },

  // ============================================================================
  // SECOND - Panneau Mesh Variables (Sliders A-M)
  // ============================================================================
  second: {
    description: "Panneau Mesh Variables avec sliders A à M",

    panels: {
      paramEquationsSlidersTitle: {
        name: "paramEquationsSlidersPanel",
        class: "panel right second",
        layout: { hAlign: "right", vAlign: "top", w: 20, t: 27 },
        controls: [
          {
            type: "TextBlock",
            name: "headerBlendersTitle",
            class: "header right second noAutoParam",
            properties: { text: "Mesh variables", fontSize: 18, color: "white", height: "20px", textHorizontalAlignment: "CENTER" }
          }
        ]
      },
      paramEquationsSlidersPanel: {
        name: "paramEquationsSlidersPanel",
        class: "panel right second",
        layout: { hAlign: "right", vAlign: "top", w: 20, t: 30 },
        controls: [
          {
            type: "Slider",
            name: "A",
            class: "slider right second",
            header: { name: "header_A", text: "A: 0" },
            properties: { minimum: "-2*PI", maximum: "2*PI", value: 0, step: 0.1 }
          },
          {
            type: "Slider",
            name: "B",
            class: "slider right second",
            header: { name: "header_B", text: "B: 0" },
            properties: { minimum: "-2*PI", maximum: "2*PI", value: 0, step: 0.1 }
          },
          {
            type: "Slider",
            name: "C",
            class: "slider right second",
            header: { name: "header_C", text: "C: 0" },
            properties: { minimum: "-2*PI", maximum: "2*PI", value: 0, step: 0.1 }
          },
          {
            type: "Slider",
            name: "D",
            class: "slider right second",
            header: { name: "header_D", text: "D: 0" },
            properties: { minimum: "-2*PI", maximum: "2*PI", value: 0, step: 0.1 }
          },
          {
            type: "Slider",
            name: "E",
            class: "slider right second",
            header: { name: "header_E", text: "E: 0" },
            properties: { minimum: -1, maximum: 1, value: 0, step: 0.01 }
          },
          {
            type: "Slider",
            name: "F",
            class: "slider right second",
            header: { name: "header_F", text: "F: 0" },
            properties: { minimum: -1, maximum: 1, value: 0, step: 0.01 }
          },
          {
            type: "Slider",
            name: "G",
            class: "slider right second",
            header: { name: "header_G", text: "G: 1" },
            properties: { minimum: -12, maximum: 12, value: 1, step: 0.1 }
          },
          {
            type: "Slider",
            name: "H",
            class: "slider right second",
            header: { name: "header_H", text: "H: 1" },
            properties: { minimum: -12, maximum: 12, value: 1, step: 0.1 }
          },
          {
            type: "Slider",
            name: "I",
            class: "slider right second",
            header: { name: "header_I", text: "I: 1" },
            properties: { minimum: -12, maximum: 12, value: 1, step: 0.1 }
          },
          {
            type: "Slider",
            name: "J",
            class: "slider right second",
            header: { name: "header_J", text: "J: 1" },
            properties: { minimum: -12, maximum: 12, value: 1, step: 0.1 }
          },
          {
            type: "Slider",
            name: "K",
            class: "slider right second",
            header: { name: "header_K", text: "K: 1" },
            properties: { minimum: -12, maximum: 12, value: 1, step: 0.1 }
          },
          {
            type: "Slider",
            name: "L",
            class: "slider right second",
            header: { name: "header_L", text: "L: 1" },
            properties: { minimum: -36, maximum: 36, value: 1, step: 1 }
          },
          {
            type: "Slider",
            name: "M",
            class: "slider right second",
            header: { name: "header_M", text: "M: 64" },
            properties: { minimum: -360, maximum: 360, value: 64, step: 1 }
          }
        ]
      }
    }
  },

  // ============================================================================
  // THIRD - Panneau Transformations et Shaders Variables
  // ============================================================================
  third: {
    description: "Panneau Transformations (FunctionIt) et Shaders Variables",

    panels: {
      panelFunctionItTitle: {
        name: "panelShadersTitle-FunctionItPanelTitle",
        class: "panel right third noAutoParam",
        layout: { hAlign: "right", vAlign: "top", w: 20, h: 5, t: 25.5 },
        controls: [
          {
            type: "TextBlock",
            name: "headerShadersTitle-FunctionItPanelTitle",
            class: "header right third noAutoParam",
            properties: { text: "Tranformations", fontSize: 18, color: "white" }
          }
        ]
      },
      paramFunctionItSlidersPanel: {
        name: "paramFunctionItSlidersPanel",
        class: "panel right third noAutoParam",
        layout: { hAlign: "right", vAlign: "top", w: 20, t: 30, pL: 1 },
        controls: [
          {
            type: "XYZSlider",
            name: "rotateLine",
            class: "slider right third",
            header: { name: "header_rotateLine", text: "Line: 0" },
            description: "Rotation combinée avec checkboxes X/Y/Z",
            properties: { minimum: "-PI", maximum: "PI", value: 0, step: 0.01 },
            axisMapping: { x: "rotLine.alpha", y: "rotLine.beta", z: "rotLine.theta" }
          }
        ]
      },
      paramFunctionItSlidersPanel2: {
        name: "paramFunctionItSlidersPanel2",
        class: "panel third noAutoParam",
        layout: { hAlign: "right", vAlign: "top", w: 20, t: 34, pL: 1 },
        controls: [
          {
            type: "XYZSlider",
            name: "flat",
            class: "slider right third",
            header: { name: "header_flat", text: "Flat: 100" },
            properties: { minimum: 0, maximum: 100, value: 100, step: 0.01 }
          }
        ]
      },
      panelShadersVariablesTitle: {
        name: "panelShadersTitle-shadersVariablesPanelTitle",
        class: "panel right third noAutoParam",
        layout: { hAlign: "right", vAlign: "top", w: 20, h: 5, t: 39 },
        controls: [
          {
            type: "TextBlock",
            name: "headerShadersTitle-shadersVariablesPanelTitle",
            class: "header right third noAutoParam",
            properties: { text: "Shaders variables", fontSize: 18, color: "white" }
          }
        ]
      },
      paramShadersVariablesPanel: {
        name: "paramEquationsSlidersPanel",
        class: "panel right third",
        layout: { hAlign: "right", vAlign: "top", w: 20, t: 43.5, pL: 0.5 },
        controls: [
          {
            type: "Slider",
            name: "shadersVariables-A",
            class: "slider right third",
            header: { name: "header_shadersVariables-A", text: "A: 64" },
            properties: { minimum: -360, maximum: 360, value: 64, step: 1 }
          },
          {
            type: "Slider",
            name: "shadersVariables-B",
            class: "slider right third",
            header: { name: "header_shadersVariables-B", text: "B: 64" },
            properties: { minimum: -360, maximum: 360, value: 64, step: 1 }
          },
          {
            type: "Slider",
            name: "shadersVariables-C",
            class: "slider right third",
            header: { name: "header_shadersVariables-C", text: "C: 12" },
            properties: { minimum: -36, maximum: 36, value: 12, step: 0.1 }
          },
          {
            type: "Slider",
            name: "shadersVariables-D",
            class: "slider right third",
            header: { name: "header_shadersVariables-D", text: "D: 0" },
            properties: { minimum: -1, maximum: 1, value: 0, step: 0.01 }
          }
        ]
      }
    }
  },

  // ============================================================================
  // FOURTH - Panneau Shaders, Symmetrize, Normal Deformation, Video
  // ============================================================================
  fourth: {
    description: "Panneau Shaders controls, Symmetrize, Normal Deformation et Video",

    panels: {
      // --- SHADERS TITLE ---
      panelShadersTitle: {
        name: "panelShadersTitle-Shaders",
        class: "panel right fourth noAutoParam",
        layout: { hAlign: "right", vAlign: "top", w: 20, h: 5, t: 25.5 },
        controls: [
          {
            type: "TextBlock",
            name: "headerShadersTitle-Shaders",
            class: "header right fourth noAutoParam",
            properties: { text: "Shaders", fontSize: 17 }
          }
        ]
      },
      panelShadersButtons: {
        name: "panelShadersButtons-Shaders",
        class: "panel right fourth noAutoParam",
        layout: { hAlign: "right", vAlign: "top", w: 20, h: 5, t: 28.5, pL: 3.25, isVertical: false },
        controls: [
          {
            type: "Button",
            name: "openShaderEditorButton",
            class: "button right fourth noAutoParam",
            properties: { text: "Editor", w: "20%", h: 30, pT: 0, pL: 10, pR: 0 }
          },
          {
            type: "Button",
            name: "colorizeShaderEditorButton",
            class: "button right fourth noAutoParam",
            properties: { text: "Color", w: "20%", h: 30, pT: 0, pL: 10, pR: 0 }
          },
          {
            type: "Button",
            name: "nextShaderEditorButton",
            class: "button right fourth noAutoParam",
            properties: { text: "Next", w: "20%", h: 30, pT: 0, pL: 10, pR: 0 }
          },
          {
            type: "Button",
            name: "invcolShaderEditorButton",
            class: "button right fourth noAutoParam",
            properties: { text: "Inv", w: "20%", h: 30, pT: 0, pL: 10, pR: 0 }
          }
        ]
      },

      // --- SYMMETRIZE ---
      panelSymmetrizeTitlePanel: {
        name: "panelShadersTitle-SymmetrizePanelTitle",
        class: "panel right fourth noAutoParam",
        layout: { hAlign: "right", vAlign: "top", w: 20, h: 5, t: 34 },
        controls: [
          {
            type: "TextBlock",
            name: "headerShadersTitle-SymmetrizePanelTitle",
            class: "header right fourth noAutoParam",
            properties: { text: "Symmetrize", fontSize: 17 }
          }
        ]
      },
      paramSymmetrizeSlidersPanel: {
        name: "paramSymmetrizeSlidersPanel",
        class: "panel right fourth noAutoParam",
        layout: { hAlign: "right", vAlign: "top", w: 20, t: 37 },
        controls: [
          {
            type: "Slider",
            name: "symmetrizeX",
            class: "slider right fourth",
            header: { name: "header_symmetrizeX", text: "X: 1" },
            properties: { minimum: 1, maximum: 24, value: 1, step: 1 }
          },
          {
            type: "Slider",
            name: "symmetrizeY",
            class: "slider right fourth",
            header: { name: "header_symmetrizeY", text: "Y: 1" },
            properties: { minimum: 1, maximum: 24, value: 1, step: 1 }
          },
          {
            type: "Slider",
            name: "symmetrizeZ",
            class: "slider right fourth",
            header: { name: "header_symmetrizeZ", text: "Z: 1" },
            properties: { minimum: 1, maximum: 24, value: 1, step: 1 }
          },
          {
            type: "Slider",
            name: "symmetrizeAngle",
            class: "slider right fourth",
            header: { name: "header_symmetrizeAngle", text: "Angle: 3.14" },
            properties: { minimum: "PI/16", maximum: "4*PI", value: 3.14, step: "PI/16" }
          }
        ]
      },
      paramSymmetrizeSlidersPanelButton: {
        name: "paramSymmetrizeSlidersPanelButton",
        class: "panel right fourth noAutoParam",
        layout: { isVertical: false, hAlign: "right", vAlign: "top", w: 19.25, t: 55, pR: 1 },
        controls: [
          {
            type: "Button",
            name: "centerLocal",
            class: "button right fourth noAutoParam",
            properties: { text: "⊕ on origin", w: 100, h: 30, pT: 0, pL: 0, pR: 0 }
          },
          {
            type: "Button",
            name: "symmetrizeOrder",
            class: "button right fourth noAutoParam",
            properties: { text: "S order : XYZ", w: 100, h: 30, pT: 0, pL: 10, pR: 0 }
          },
          {
            type: "Button",
            name: "symmetrizeAdding",
            class: "button right fourth noAutoParam",
            properties: { text: "S add : OUI", w: 100, h: 30, pT: 0, pL: 0, pR: 0 }
          }
        ]
      },
      paramSymmetrizeSlidersPanelChekB: {
        name: "paramSymmetrizeSlidersPanelChekB",
        class: "panel right fourth noAutoParam",
        layout: { hAlign: "right", vAlign: "top", h: 5, w: 20, t: 61.5, pR: 0.5 },
        controls: [
          {
            type: "Slider",
            name: "checkerboard",
            class: "slider right fourth",
            header: { name: "header_checkerboard", text: "Checkerboard: 0" },
            properties: { minimum: 0, maximum: 24, value: 0, step: 1 }
          }
        ]
      },

      // --- VIDEO ---
      panelVideoTitle: {
        name: "panelShadersTitle-Video",
        class: "panel right fourth noAutoParam",
        layout: { hAlign: "right", vAlign: "top", w: 20, h: 5, t: 66 },
        controls: [
          {
            type: "TextBlock",
            name: "headerShadersTitle-Video",
            class: "header right fourth noAutoParam",
            properties: { text: "Video", fontSize: 17 }
          }
        ]
      },
      panelVideo: {
        name: "panelShadersButtons-Video",
        class: "panel right fourth noAutoParam",
        layout: { hAlign: "right", vAlign: "top", w: 20, h: 10, t: 67, pL: 0.5, isVertical: false },
        controls: [
          {
            type: "Button",
            name: "videoButton",
            class: "button right fourth noAutoParam",
            properties: { text: "►", w: "13.75%", h: 30, pT: 0, pL: 0, pR: 0 }
          },
          {
            type: "HorizontalSlider",
            name: "videoBoxRange",
            class: "slider right fourth",
            header: { name: "header_videoBoxRange", text: "Box range: value" },
            properties: { minimum: 0, maximum: 2.375, value: "glo.videoBoxRange", step: 0.01 }
          }
        ]
      },

      // --- NORMAL DEFORMATION ---
      panelNormalDeformationTitle: {
        name: "panelShadersTitle-normalDeformation",
        class: "panel right fourth noAutoParam",
        layout: { hAlign: "right", vAlign: "top", w: 20, h: 5, t: 75 },
        controls: [
          {
            type: "TextBlock",
            name: "headerShadersTitle-normalDeformation",
            class: "header right fourth noAutoParam",
            properties: { text: "Normal Deformation", fontSize: 17 }
          }
        ]
      },
      paramSymmetrizeSlidersPanelScaleNorm: {
        name: "paramSymmetrizeSlidersPanelScaleNorm",
        class: "panel right fourth noAutoParam",
        layout: { hAlign: "right", vAlign: "top", h: 5, w: 20, t: 78.5, pR: 0.5 },
        controls: [
          {
            type: "Slider",
            name: "scaleNorm",
            class: "slider right fourth",
            header: { name: "header_scaleNorm", text: "Scale: 1" },
            properties: { minimum: -24, maximum: 24, value: 1, step: 0.01 }
          }
        ]
      },

      // --- EQUATIONS SUITS/SYMS ---
      inputsSuitsEquations: {
        name: "inputsSuitsEquations",
        class: "panel right fourth noAutoParam",
        layout: { hAlign: "right", vAlign: "top", w: 24, pR: 1, t: 26 },
        controls: []
      },
      panelSymsEquations: {
        name: "panelSymsEquations",
        class: "panel right fourth noAutoParam",
        layout: { hAlign: "right", vAlign: "top", w: 24, t: 83, pR: 1 },
        controls: [
          {
            type: "TextBlock",
            name: "header_inputRSymmetrize",
            class: "header right fourth noAutoParam",
            properties: { text: "Equation" }
          },
          {
            type: "InputText",
            name: "inputRSymmetrize",
            class: "input equation right fourth",
            properties: { text: "", w: 350, fontWeight: "500", fontSize: 19, h: 25 }
          }
        ]
      }
    }
  },

  // ============================================================================
  // SIXTH - Panneau Sliders supplémentaires et boutons d'inversion
  // ============================================================================
  sixth: {
    description: "Panneau avec sliders supplémentaires (Checkerboard, First point offset, etc.) et boutons d'inversion",

    panels: {
      panelSliders: {
        name: "panelSliders",
        class: "panel right sixth noAutoParam",
        layout: { isVertical: true, hAlign: "right", vAlign: "top", w: 20, t: 26, pR: 0.5 },
        controls: [
          {
            type: "Slider",
            name: "checkerboardNbSteps",
            class: "slider right sixth",
            header: { name: "header_checkerboardNbSteps", text: "Checkerboard nb steps: 2" },
            properties: { minimum: 1.1, maximum: 24, value: 2, step: 0.1 }
          },
          {
            type: "Slider",
            name: "firstPointOffsetX",
            class: "slider right sixth",
            header: { name: "header_firstPointOffsetX", text: "First point offset X: 1" },
            properties: { minimum: -24, maximum: 24, value: 1, step: 0.5 }
          },
          {
            type: "Slider",
            name: "firstPointOffsetY",
            class: "slider right sixth",
            header: { name: "header_firstPointOffsetY", text: "First point offset Y: 0" },
            properties: { minimum: -24, maximum: 24, value: 0, step: 0.5 }
          },
          {
            type: "Slider",
            name: "firstPointOffsetZ",
            class: "slider right sixth",
            header: { name: "header_firstPointOffsetZ", text: "First point offset Z: 0" },
            properties: { minimum: -24, maximum: 24, value: 0, step: 0.5 }
          },
          {
            type: "Slider",
            name: "expanseAngleX",
            class: "slider right sixth",
            header: { name: "header_expanseAngleX", text: "Expanse angle X: 0" },
            properties: { minimum: "-PI", maximum: "PI", value: 0, step: "PI/16" }
          },
          {
            type: "Slider",
            name: "expanseAngleY",
            class: "slider right sixth",
            header: { name: "header_expanseAngleY", text: "Expanse angle Y: 0" },
            properties: { minimum: "-PI", maximum: "PI", value: 0, step: "PI/16" }
          }
        ]
      },
      panelButtonSlidersUVOnOneSignU: {
        name: "panelButtonSlidersUVOnOneSignU",
        class: "panel right sixth noAutoParam",
        layout: { isVertical: true, hAlign: "right", vAlign: "top", w: 20, t: 65, pR: 0.5 },
        controls: [
          {
            type: "Button",
            name: "slidersUVOnOneSignU",
            class: "button left first",
            properties: { text: "Slider U sign : OUI", w: 215, h: 33, pL: 0, pR: 0 }
          }
        ]
      },
      panelButtonSlidersUVOnOneSignV: {
        name: "panelButtonSlidersUVOnOneSignV",
        class: "panel right sixth noAutoParam",
        layout: { isVertical: true, hAlign: "right", vAlign: "top", w: 20, t: 70, pR: 0.5 },
        controls: [
          {
            type: "Button",
            name: "slidersUVOnOneSignV",
            class: "button left first",
            properties: { text: "Slider V sign : OUI", w: 215, h: 33, pL: 0, pR: 0 }
          }
        ]
      },
      panelButtonInvFormulaCosSin: {
        name: "panelButtonInvFormulaCosSin",
        class: "panel right sixth noAutoParam",
        layout: { isVertical: true, hAlign: "right", vAlign: "top", w: 20, t: 75, pR: 0.5 },
        controls: [
          {
            type: "Button",
            name: "InvFormulaCosSin",
            class: "button left first",
            properties: { text: "Inv cos sin", w: 215, h: 33, pL: 0, pR: 0 }
          }
        ]
      },
      panelButtonInvFormulaUV: {
        name: "panelButtonInvFormulaUV",
        class: "panel right sixth noAutoParam",
        layout: { isVertical: true, hAlign: "right", vAlign: "top", w: 20, t: 80, pR: 0.5 },
        controls: [
          {
            type: "Button",
            name: "InvFormulaUV",
            class: "button left first",
            properties: { text: "Inv UV", w: 215, h: 33, pL: 0, pR: 0 }
          }
        ]
      },
      panelButtonInvPosXYZ: {
        name: "panelButtonInvPosXYZ",
        class: "panel right sixth noAutoParam",
        layout: { isVertical: false, hAlign: "right", vAlign: "top", w: 15, h: 4, t: 85, pR: 0.5 },
        controls: []
      },
      panelEvalY: {
        name: "panelEvalY",
        class: "panel right sixth noAutoParam",
        layout: { hAlign: "right", vAlign: "top", w: 60, pR: 1, t: 505, h: 100, pL: -330 },
        controls: [
          {
            type: "TextBlock",
            name: "header_inputEvalX",
            class: "header right sixth",
            properties: { text: "Eval X" }
          },
          {
            type: "InputText",
            name: "inputEvalX",
            class: "input equation right sixth",
            properties: { text: "", w: 350, fontWeight: "500", fontSize: 19, h: 25 }
          },
          {
            type: "TextBlock",
            name: "header_inputEvalY",
            class: "header right sixth",
            properties: { text: "Eval Y" }
          },
          {
            type: "InputText",
            name: "inputEvalY",
            class: "input equation right sixth",
            properties: { text: "", w: 350, fontWeight: "500", fontSize: 19, h: 25 }
          }
        ]
      }
    }
  },

  // ============================================================================
  // SEVENTH - Panneau Lighting
  // ============================================================================
  seventh: {
    description: "Panneau Lighting avec contrôles de lumière shader et classique",

    panels: {
      panelLightingTitle: {
        name: "panelShadersTitle-Lighting",
        class: "panel right seventh",
        layout: { hAlign: "right", vAlign: "top", w: 20, h: 5, t: 25 },
        controls: [
          {
            type: "TextBlock",
            name: "headerShadersTitle-Lighting",
            class: "header right seventh noAutoParam",
            properties: { text: "Lighting", fontSize: 20 }
          }
        ]
      },
      panelLightingButton: {
        name: "panelShadersButtons-Lighting",
        class: "panel right seventh",
        layout: { hAlign: "right", vAlign: "top", w: 20, h: 5, t: 31.5, pL: 9.25, isVertical: false },
        controls: [
          {
            type: "Button",
            name: "shaderLightButton",
            class: "button right seventh noAutoParam",
            properties: { text: "💡", w: "20%", h: 30, pT: 0, pL: 0, pR: 0 }
          }
        ]
      },
      panelShadersTitleHeader: {
        name: "panelShadersTitle-shadersTitle",
        class: "panel right seventh",
        layout: { hAlign: "right", vAlign: "top", w: 20, h: 5, t: 28.5 },
        controls: [
          {
            type: "TextBlock",
            name: "headerShadersTitle-shadersTitle",
            class: "header right seventh noAutoParam",
            properties: { text: "Shaders", fontSize: 17 }
          }
        ]
      },
      panelLightSliders: {
        name: "panelShadersButtons-LightSliders",
        class: "panel right seventh",
        layout: { hAlign: "right", vAlign: "top", w: 20, h: 32, t: 36, pL: 0.0, isVertical: true },
        controls: [
          {
            type: "Slider",
            name: "lightIntensity",
            class: "slider right seventh",
            header: { name: "header_lightIntensity", text: "Intensity: value", color: "white", fontSize: 14 },
            properties: { minimum: 0, maximum: 2, value: "glo.shaders.light.intensity", step: 0.01 }
          },
          {
            type: "Slider",
            name: "lightDirectionX",
            class: "slider right seventh",
            header: { name: "header_lightDirectionX", text: "Direction X: value" },
            properties: { minimum: "-PI", maximum: "PI", value: "glo.shaders.light.direction.x", step: 0.01 }
          },
          {
            type: "Slider",
            name: "lightDirectionY",
            class: "slider right seventh",
            header: { name: "header_lightDirectionY", text: "Direction Y: value" },
            properties: { minimum: "-PI", maximum: "PI", value: "glo.shaders.light.direction.y", step: 0.01 }
          },
          {
            type: "Slider",
            name: "lightDirectionZ",
            class: "slider right seventh",
            header: { name: "header_lightDirectionZ", text: "Direction Z: value" },
            properties: { minimum: "-PI", maximum: "PI", value: "glo.shaders.light.direction.z", step: 0.01 }
          },
          {
            type: "Slider",
            name: "lightRadius",
            class: "slider right seventh",
            header: { name: "header_lightRadius", text: "Radius: value" },
            properties: { minimum: 0, maximum: 100, value: "glo.shaders.light.radius", step: 0.01 }
          },
          {
            type: "Slider",
            name: "lightSpecularIntensity",
            class: "slider right seventh",
            header: { name: "header_lightSpecularIntensity", text: "Specular intesity: value" },
            properties: { minimum: 0, maximum: 4, value: "glo.shaders.light.specular.intensity", step: 0.01 }
          },
          {
            type: "Slider",
            name: "lightSpecularPower",
            class: "slider right seventh",
            header: { name: "header_lightSpecularPower", text: "Specular power: value" },
            properties: { minimum: 0, maximum: 2, value: "glo.shaders.light.specular.power", step: 0.01 }
          }
        ]
      },
      panelLightClassicTitle: {
        name: "panelShadersTitle-classicTitle",
        class: "panel right seventh",
        layout: { hAlign: "right", vAlign: "top", w: 20, h: 5, t: 66.5 },
        controls: [
          {
            type: "TextBlock",
            name: "headerShadersTitle-classicTitle",
            class: "header right seventh noAutoParam",
            properties: { text: "Classic", fontSize: 17 }
          }
        ]
      },
      panelLightClassicSliders: {
        name: "panelShadersButtons-LightClassicSliders",
        class: "panel right seventh",
        layout: { hAlign: "right", vAlign: "top", w: 20, h: 20, t: 70, pL: 0.0, isVertical: true },
        controls: [
          {
            type: "Slider",
            name: "lightIntensity",
            class: "slider right seventh",
            header: { name: "header_lightIntensity", text: "Intensity: value" },
            properties: { minimum: 0, maximum: 2, value: "glo.light.intensity", step: 0.01 }
          },
          {
            type: "Slider",
            name: "lightDirectionX",
            class: "slider right seventh",
            header: { name: "header_lightDirectionX", text: "Direction X: value" },
            properties: { minimum: "-PI", maximum: "PI", value: "glo.light.direction.x", step: 0.01 }
          },
          {
            type: "Slider",
            name: "lightDirectionY",
            class: "slider right seventh",
            header: { name: "header_lightDirectionY", text: "Direction Y: value" },
            properties: { minimum: "-PI", maximum: "PI", value: "glo.light.direction.y", step: 0.01 }
          },
          {
            type: "Slider",
            name: "lightDirectionZ",
            class: "slider right seventh",
            header: { name: "header_lightDirectionZ", text: "Direction Z: value" },
            properties: { minimum: "-PI", maximum: "PI", value: "glo.light.direction.z", step: 0.01 }
          }
        ]
      }
    }
  },

  // ============================================================================
  // EIGHTH - Panneau Blend, Expend, Transformations, Waves
  // ============================================================================
  eighth: {
    description: "Panneau Blend, Expend, Transformations mesh et Waves/Norm",

    panels: {
      panelBlenderTitle: {
        name: "panelShadersTitle-BlenderPanelTitle",
        class: "panel right eighth noAutoParam",
        layout: { hAlign: "right", vAlign: "top", w: 20, h: 5, t: 25.5 },
        controls: [
          {
            type: "TextBlock",
            name: "headerShadersTitle-BlenderPanelTitle",
            class: "header right eighth noAutoParam",
            properties: { text: "Blend", fontSize: 18 }
          }
        ]
      },
      paramBlenderSlidersPanel: {
        name: "paramBlenderSlidersPanel",
        class: "panel right eighth noAutoParam",
        layout: { hAlign: "right", vAlign: "top", w: 20, t: 29.5, pR: 1, pL: 1 },
        controls: [
          {
            type: "XYZSlider",
            name: "blenderU",
            class: "slider right eighth",
            header: { name: "header_blenderU", text: "U: value" },
            description: "Slider XYZ combiné avec checkboxes pour axes",
            properties: { minimum: -12, maximum: 12, value: 2, step: 0.01 }
          },
          {
            type: "XYZSlider",
            name: "blenderO",
            class: "slider right eighth",
            header: { name: "header_blenderO", text: "O: value" },
            properties: { minimum: -12, maximum: 12, value: 2, step: 0.01 }
          }
        ]
      },
      panelWaveTitle: {
        name: "panelShadersTitle-waveTitlePanel",
        class: "panel right eighth noAutoParam",
        layout: { hAlign: "right", vAlign: "top", w: 20, h: 5, t: 39 },
        controls: [
          {
            type: "TextBlock",
            name: "headerShadersTitle-waveTitlePanel",
            class: "header right eighth noAutoParam",
            properties: { text: "Waves", fontSize: 17 }
          }
        ]
      },
      ninethPanelPanel: {
        name: "ninethPanelPanel",
        class: "panel right eighth noAutoParam",
        layout: { hAlign: "right", vAlign: "top", w: 20, t: 42.5, pR: 1, pL: 1 },
        controls: [
          {
            type: "LinkedXYZSliders",
            name: "norm",
            description: "Slider combiné XYZ avec slider secondaire lié (n)",
            mainSlider: {
              name: "normMain",
              header: { text: "Norm X: 0.0" },
              properties: { minimum: -40, maximum: 40, value: 0.0, step: 0.1 }
            },
            secondarySlider: {
              name: "normSecondary",
              header: { text: "n X: 1.0" },
              properties: { minimum: -8, maximum: 8, value: 1.0, step: 0.1 }
            }
          },
          {
            type: "Slider",
            name: "invPtsPowCoeff",
            class: "slider right eighth",
            header: { name: "header_invPtsPowCoeff", text: "Inv Pts: 1.00" },
            properties: { minimum: 0, maximum: 8, value: 1.00, step: 0.01 }
          }
        ]
      },
      thirdPanelButton: {
        name: "thirdPanelButton",
        class: "panel right eleventh noAutoParam",
        layout: { isVertical: false, hAlign: "right", vAlign: "top", w: 20, h: 7, t: 52, pL: 0.775 },
        controls: [
          {
            type: "Button",
            name: "secondCurveOperation",
            class: "button right eleventh",
            properties: { text: "SCO", w: 106, h: "glo.buttonBottomHeight", pL: "glo.buttonBottomPaddingLeft" }
          },
          {
            type: "Button",
            name: "GridScale",
            class: "button right eleventh",
            properties: { text: "Grid Sc", w: 119, h: "glo.buttonBottomHeight", pL: 25, background: "glo.controlConfig.backgroundActived" }
          },
          {
            type: "Button",
            name: "updateRots",
            class: "button right eleventh",
            properties: { text: "Upd Rot", w: 119, h: "glo.buttonBottomHeight", pL: 25, background: "glo.controlConfig.backgroundActived" }
          }
        ]
      },
      panelTransformationTitle: {
        name: "panelShadersTitle-TransformationPanelTitle",
        class: "panel right eighth noAutoParam",
        layout: { hAlign: "right", vAlign: "top", w: 20, h: 5, t: 56.5 },
        controls: [
          {
            type: "TextBlock",
            name: "headerShadersTitle-TransformationPanelTitle",
            class: "header right eighth noAutoParam",
            properties: { text: "Transformations", fontSize: 17 }
          }
        ]
      },
      paramTransformationSlidersPanel: {
        name: "paramTransformationSlidersPanel",
        class: "panel right eighth noAutoParam",
        layout: { hAlign: "right", vAlign: "top", w: 20, t: 60, pR: 1, pL: 1 },
        controls: [
          {
            type: "XYZSlider",
            name: "scaling",
            class: "slider right eighth",
            header: { name: "header_scaling", text: "Scaling: 1" },
            properties: { minimum: 0, maximum: 24, value: 1, step: 0.1 }
          },
          {
            type: "XYZSlider",
            name: "rotation",
            class: "slider right eighth",
            header: { name: "header_rotation", text: "Rotation: 0" },
            properties: { minimum: "-2*PI", maximum: "2*PI", value: 0, step: "PI/180" }
          },
          {
            type: "XYZSlider",
            name: "position",
            class: "slider right eighth",
            header: { name: "header_position", text: "Position: 0" },
            properties: { minimum: -24, maximum: 24, value: 0, step: 1 }
          },
          {
            type: "XYZSlider",
            name: "cSymmetry",
            class: "slider right eighth",
            header: { name: "header_cSymmetry", text: "Center Symmetry: 0" },
            properties: { minimum: -24, maximum: 24, value: 0, step: 0.1 }
          },
          {
            type: "Slider",
            name: "scaleVertex",
            class: "slider right eighth",
            header: { name: "header_scaleVertex", text: "Scale Vertex: 1" },
            properties: { minimum: -24, maximum: 24, value: 1, step: 0.1 }
          }
        ]
      },
      paramFunctionItSlidersPanelExpend: {
        name: "paramFunctionItSlidersPanelExpend",
        class: "panel right eighth noAutoParam",
        layout: { hAlign: "right", vAlign: "top", w: 20, t: 83, pL: 1 },
        controls: [
          {
            type: "Slider",
            name: "expendLine",
            class: "slider right eighth",
            header: { name: "header_expendLine", text: "Expend: 0" },
            properties: { minimum: -24, maximum: 24, value: 0, step: 0.01 }
          }
        ]
      }
    }
  },

  // ============================================================================
  // TENTH - Panneau Pseudo Fractal
  // ============================================================================
  tenth: {
    description: "Panneau Pseudo Fractal avec contrôles de fractalisation",

    panels: {
      tenthPanelTitle: {
        name: "tenthPanelTitle",
        class: "panel right tenth noAutoParam",
        layout: { isVertical: false, hAlign: "right", vAlign: "top", w: 13.25, h: 4, t: 27 },
        controls: [
          {
            type: "TextBlock",
            name: "headerTitle",
            class: "header right tenth noAutoParam",
            properties: { text: "Pseudo fractal", fontSize: 18 }
          }
        ]
      },
      tenthPanelPanel: {
        name: "tenthPanelPanel",
        class: "panel right tenth noAutoParam",
        layout: { hAlign: "right", vAlign: "top", w: 20, t: 32, pR: 1 },
        controls: [
          {
            type: "Slider",
            name: "fractalizedStepsU",
            class: "slider right tenth",
            header: { name: "header_fractalizedStepsU", text: "Nb cloned in U: 12" },
            properties: { minimum: 1, maximum: 132, value: 12, step: 1 }
          },
          {
            type: "Slider",
            name: "fractalizedStepsV",
            class: "slider right tenth",
            header: { name: "header_fractalizedStepsV", text: "Nb cloned in V: 12" },
            properties: { minimum: 1, maximum: 132, value: 12, step: 1 }
          },
          {
            type: "Slider",
            name: "fractalizeStepsU",
            class: "slider right tenth",
            header: { name: "header_fractalizeStepsU", text: "Cloned Steps U: 12" },
            properties: { minimum: 1, maximum: 132, value: 12, step: 1 }
          },
          {
            type: "Slider",
            name: "fractalizeStepsV",
            class: "slider right tenth",
            header: { name: "header_fractalizeStepsV", text: "Cloned Steps V: 12" },
            properties: { minimum: 1, maximum: 132, value: 12, step: 1 }
          },
          {
            type: "Slider",
            name: "fractalizeRotateX",
            class: "slider right tenth",
            header: { name: "header_fractalizeRotateX", text: "Rot X: 0" },
            properties: { minimum: 0, maximum: "2*PI", value: 0, step: 0.01 }
          },
          {
            type: "Slider",
            name: "fractalizeRotateY",
            class: "slider right tenth",
            header: { name: "header_fractalizeRotateY", text: "Rot Y: 0" },
            properties: { minimum: 0, maximum: "2*PI", value: 0, step: 0.01 }
          },
          {
            type: "Slider",
            name: "fractalizeRotateZ",
            class: "slider right tenth",
            header: { name: "header_fractalizeRotateZ", text: "Rot Z: 0" },
            properties: { minimum: 0, maximum: "2*PI", value: 0, step: 0.01 }
          },
          {
            type: "Slider",
            name: "fractalizeScaleAll",
            class: "slider right tenth",
            header: { name: "header_fractalizeScaleAll", text: "Scale All: 1" },
            properties: { minimum: 0, maximum: 8, value: 1, step: 0.01 }
          },
          {
            type: "Slider",
            name: "fractalizeScaleX",
            class: "slider right tenth",
            header: { name: "header_fractalizeScaleX", text: "Scale X: 1" },
            properties: { minimum: 0, maximum: 8, value: 1, step: 0.01 }
          },
          {
            type: "Slider",
            name: "fractalizeScaleY",
            class: "slider right tenth",
            header: { name: "header_fractalizeScaleY", text: "Scale Y: 1" },
            properties: { minimum: 0, maximum: 8, value: 1, step: 0.01 }
          },
          {
            type: "Slider",
            name: "fractalizeScaleZ",
            class: "slider right tenth",
            header: { name: "header_fractalizeScaleZ", text: "Scale Z: 1" },
            properties: { minimum: 0, maximum: 8, value: 1, step: 0.01 }
          }
        ]
      },
      tenthPanelButton: {
        name: "tenthPanelButton",
        class: "panel right tenth noAutoParam",
        layout: { isVertical: false, hAlign: "right", vAlign: "top", w: 20, h: 7, t: 77, pL: 7 },
        controls: [
          {
            type: "Button",
            name: "refractalize",
            class: "button right tenth",
            properties: { text: "Refract", w: "glo.buttonBottomSize", h: "glo.buttonBottomHeight", pL: "glo.buttonBottomPaddingLeft", background: "glo.controlConfig.background" }
          }
        ]
      },
      tenthPanelButton2: {
        name: "tenthPanelButton2",
        class: "panel right tenth noAutoParam",
        layout: { isVertical: false, hAlign: "right", vAlign: "top", w: 20, h: 7, t: 81.5, pL: 0 },
        controls: [
          {
            type: "Button",
            name: "fractalizeActive",
            class: "button right tenth",
            properties: { text: "ON", w: "glo.buttonBottomSize", h: "glo.buttonBottomHeight", pL: "glo.buttonBottomPaddingLeft", background: "glo.controlConfig.background" }
          },
          {
            type: "Button",
            name: "fractalizeRotActive",
            class: "button right tenth",
            properties: { text: "No Rot", w: "glo.buttonBottomSize", h: "glo.buttonBottomHeight", pL: "glo.buttonBottomPaddingLeft", background: "glo.controlConfig.background" }
          },
          {
            type: "Button",
            name: "fractalizeScalingActive",
            class: "button right tenth",
            properties: { text: "Scale", w: "glo.buttonBottomSize", h: "glo.buttonBottomHeight", pL: "glo.buttonBottomPaddingLeft", background: "glo.controlConfig.background" }
          },
          {
            type: "Button",
            name: "fractalizeLineOnMesh",
            class: "button right tenth",
            properties: { text: "Line", w: "glo.buttonBottomSize", h: "glo.buttonBottomHeight", pL: "glo.buttonBottomPaddingLeft", background: "glo.controlConfig.background" }
          }
        ]
      }
    }
  },

  // ============================================================================
  // ELEVENTH - Panneau Boutons et Sliders divers
  // ============================================================================
  eleventh: {
    description: "Panneau avec boutons divers (Norm By F, Dbl lines, HD Max, etc.) et sliders d'angles de symétrie",

    panels: {
      panelSymmAngle: {
        name: "panelSymmAngle",
        class: "panel right eleventh noAutoParam",
        layout: { hAlign: "right", vAlign: "top", w: 20, pL: 1, pR: 0.5, t: 72, h: 24, height: "100px" },
        controls: [
          {
            type: "TextBlock",
            name: "panelSymmAnglesTitle",
            class: "header right eleventh noAutoParam",
            properties: { text: "Symmetry angles", fontSize: 17 }
          },
          {
            type: "TextBlock",
            name: "header_inputSymmAngleX",
            class: "header right eleventh",
            properties: { text: "∡ X", fontSize: "12px", color: "white" }
          },
          {
            type: "InputText",
            name: "inputSymmAngleX",
            class: "input equation right eleventh",
            properties: { text: "", w: 350, fontWeight: "500", fontSize: 19, h: 25 }
          },
          {
            type: "TextBlock",
            name: "header_inputSymmAngleY",
            class: "header right eleventh",
            properties: { text: "∡ Y", fontSize: "12px", color: "white" }
          },
          {
            type: "InputText",
            name: "inputSymmAngleY",
            class: "input equation right eleventh",
            properties: { text: "", w: 350, fontWeight: "500", fontSize: 19, h: 25 }
          }
        ]
      },
      panelButtonEleventh1: {
        name: "panelButtonEleventh1",
        class: "panel right eleventh noAutoParam",
        layout: { isVertical: true, hAlign: "right", vAlign: "top", w: 20, h: 5, t: 28 },
        controls: []
      },
      panelButtonEleventh2: {
        name: "panelButtonEleventh2",
        class: "panel right eleventh noAutoParam",
        layout: { isVertical: false, hAlign: "right", vAlign: "top", w: 20, h: 5, t: 33 },
        controls: [
          {
            type: "Button",
            name: "normByFaceButton",
            class: "button right eleventh",
            properties: { text: "Norm By F", w: 120, h: 33, pL: 25, pR: 0 }
          },
          {
            type: "Button",
            name: "doubleLineSystemButton",
            class: "button right eleventh",
            properties: { text: "Dbl lines", w: 120, h: 33, pL: 25, pR: 0 }
          },
          {
            type: "Button",
            name: "hdMaxButton",
            class: "button right eleventh",
            properties: { text: " HD Max ", w: 120, h: 33, pL: 25, pR: 0 }
          }
        ]
      },
      panelButtonEleventh3: {
        name: "panelButtonEleventh3",
        class: "panel right eleventh noAutoParam",
        layout: { isVertical: false, hAlign: "right", vAlign: "top", w: 20, h: 5, t: 38 },
        controls: [
          {
            type: "Button",
            name: "uvToXyButton",
            class: "button right eleventh",
            properties: { text: "UV → XY", w: 120, h: 33, pL: 25, pR: 0 }
          },
          {
            type: "Button",
            name: "resetEquationsButton",
            class: "button right eleventh",
            properties: { text: "RESET", w: 120, h: 33, pL: 25, pR: 0 }
          },
          {
            type: "Button",
            name: "switchWritingTypeButton",
            class: "button right eleventh",
            properties: { text: "Long W", w: 120, h: 33, pL: 25, pR: 0 }
          }
        ]
      },
      panelButtonEleventh4: {
        name: "panelButtonEleventh4",
        class: "panel right eleventh noAutoParam",
        layout: { isVertical: false, hAlign: "right", vAlign: "top", w: 20, h: 5, t: 43 },
        controls: [
          {
            type: "Button",
            name: "uMoreOneButton",
            class: "button right eleventh",
            properties: { text: "U ++", w: 70, h: 33, pL: 26, pR: 0 }
          },
          {
            type: "Button",
            name: "uLessOneButton",
            class: "button right eleventh",
            properties: { text: "U --", w: 50, h: 33, pL: 7, pR: 0 }
          },
          {
            type: "Button",
            name: "vMoreOneButton",
            class: "button right eleventh",
            properties: { text: "V ++", w: 70, h: 33, pL: 25, pR: 0 }
          },
          {
            type: "Button",
            name: "vLessOneButton",
            class: "button right eleventh",
            properties: { text: "V --", w: 50, h: 33, pL: 7, pR: 0 }
          },
          {
            type: "Button",
            name: "showRibonFacetsButton",
            class: "button right eleventh",
            properties: { text: "Facets", w: 120, h: 33, pL: 25, pR: 0 }
          }
        ]
      },
      panelButtonEleventh5: {
        name: "panelButtonEleventh5",
        class: "panel right eleventh noAutoParam",
        layout: { isVertical: false, hAlign: "right", vAlign: "top", w: 20, h: 5, t: 48 },
        controls: [
          {
            type: "Button",
            name: "uMoreLittleOneButton",
            class: "button right eleventh",
            properties: { text: "U +", w: 70, h: 33, pL: 26, pR: 0 }
          },
          {
            type: "Button",
            name: "uLessLittleOneButton",
            class: "button right eleventh",
            properties: { text: "U -", w: 50, h: 33, pL: 7, pR: 0 }
          },
          {
            type: "Button",
            name: "vMoreLittleOneButton",
            class: "button right eleventh",
            properties: { text: "V +", w: 70, h: 33, pL: 25, pR: 0 }
          },
          {
            type: "Button",
            name: "vLessLittleOneButton",
            class: "button right eleventh",
            properties: { text: "V -", w: 50, h: 33, pL: 7, pR: 0 }
          },
          {
            type: "Button",
            name: "camToZeroButton",
            class: "button right eleventh",
            properties: { text: "View on ⊙", w: 120, h: 33, pL: 25, pR: 0 }
          }
        ]
      },
      panelButtonEleventh6: {
        name: "panelButtonEleventh6",
        class: "panel right eleventh noAutoParam",
        layout: { isVertical: false, hAlign: "right", vAlign: "top", w: 20, h: 5, t: 53 },
        controls: [
          {
            type: "Button",
            name: "onlyTubeButton",
            class: "button right eleventh",
            properties: { text: "Tube", w: 120, h: 33, pL: 26, pR: 0 }
          },
          {
            type: "Button",
            name: "tubeMoreThinButton",
            class: "button right eleventh",
            properties: { text: "T +", w: 70, h: 33, pL: 26, pR: 0 }
          },
          {
            type: "Button",
            name: "tubeLessThinButton",
            class: "button right eleventh",
            properties: { text: "T -", w: 50, h: 33, pL: 7, pR: 0 }
          },
          {
            type: "Button",
            name: "MeshAndTubeButton",
            class: "button right eleventh",
            properties: { text: "Tube + M", w: 120, h: 33, pL: 26, pR: 0 }
          }
        ]
      },
      panelButtonEleventh7: {
        name: "panelButtonEleventh7",
        class: "panel right eleventh noAutoParam",
        layout: { isVertical: false, hAlign: "right", vAlign: "top", w: 20, h: 5, t: 58 },
        controls: [
          {
            type: "Button",
            name: "moveToMeshButton",
            class: "button right eleventh",
            properties: { text: "Cam +", w: 120, h: 33, pL: 25, pR: 0 }
          },
          {
            type: "Button",
            name: "moveFromMeshButton",
            class: "button right eleventh",
            properties: { text: "Cam -", w: 120, h: 33, pL: 25, pR: 0 }
          },
          {
            type: "Button",
            name: "resetViewButton",
            class: "button right eleventh",
            properties: { text: "Cam 0", w: 120, h: 33, pL: 25, pR: 0 }
          }
        ]
      },
      panelSliderEleventh: {
        name: "panelSliderEleventh",
        class: "panel right eleventh noAutoParam",
        layout: { isVertical: true, hAlign: "right", vAlign: "top", w: 20, h: 9, t: 64 },
        controls: [
          {
            type: "Slider",
            name: "sliderSymmAngleX",
            class: "slider right eleventh",
            header: { name: "header_sliderSymmAngleX", text: "∡ X: 0" },
            properties: { minimum: 0, maximum: 180, value: 0, step: 0.01, w: 350, pL: 4.5 }
          },
          {
            type: "Slider",
            name: "sliderSymmAngleY",
            class: "slider right eleventh",
            header: { name: "header_sliderSymmAngleY", text: "∡ Y: 0" },
            properties: { minimum: 0, maximum: 180, value: 0, step: 0.01, w: 350, pL: 4.5 }
          }
        ]
      },
      panelButtonEleventh8: {
        name: "panelButtonEleventh8",
        class: "panel right eleventh noAutoParam",
        layout: { isVertical: false, hAlign: "right", vAlign: "top", w: 20, h: 5, t: 73 },
        controls: [
          {
            type: "Button",
            name: "DelOrKeep",
            class: "button right eleventh",
            properties: { text: "DEL", w: 240, h: 25, pL: 145, pR: 0 }
          }
        ]
      }
    }
  }
};

// Export pour utilisation dans d'autres fichiers
if (typeof module !== 'undefined' && module.exports) {
  module.exports = guiContentStructure;
}
