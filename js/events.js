//*****************************************************************************************************//
//**********************************************EVENTS*************************************************//
//*****************************************************************************************************//

/**
 * Main application bootstrap.
 * Waits for fonts to load, then initializes GUI controls, modals, form radios,
 * renders the startup surface, and starts the intro animation.
 */
document.addEventListener('DOMContentLoaded', async function() {
   await Promise.all([
      document.fonts.load('300 1em Poppins'),
      document.fonts.load('400 1em Poppins'),
      document.fonts.load('600 1em Poppins'),
   ]);

   addGuiControls();

   glo.rightPanelsClasses.forEach(panelClass => {
      if(panelClass !== glo.guiSelect){ toggleGuiControlsByClass(false, panelClass); }
   });

   initExportModal();
   initImportModal();
   initHelpModal();
   document.querySelectorAll('.modal:not(#exportModal):not(#importModal)').forEach(el => M.Modal.init(el));
   document.querySelectorAll('select').forEach(el => M.FormSelect.init(el));
   glo.formes.setStartForm();
   startAnim(100, 15, 1);
   getPathsInfos();
   otherDesigns();
   paramRadios();
   styleUI();
   // Pre-load Monaco modules in the background so they are ready before the user opens an editor
   ensureMonacoLoaded();
});

/** Resizes the BabylonJS engine when the browser window is resized. */
window.addEventListener('resize', () => {
   glo.engine.resize();
});

/**
 * Temporary pointer-move handler on the canvas that stops the intro rotation animation
 * after a few moves, then removes itself. Used to detect initial user interaction.
 * @param {PointerEvent} e
 */
function onCanvasPointerMove(e){
    glo.n++;
    stopRotAnim();
    if(glo.n > 20){ getById('renderCanvas').removeEventListener('pointermove', onCanvasPointerMove); delete glo.n; }
}
getById('renderCanvas').addEventListener('pointermove', onCanvasPointerMove);

/**
 * Compiles the fragment shader from the Monaco editor.
 * On success, extracts the user code between markers, updates the active shader,
 * and recompiles the GPU material. On failure, parses the GLSL error to highlight
 * the offending line in the editor and display a toast notification.
 */
getById('compileBtn')?.addEventListener('click', () => {
    monaco.editor.setModelMarkers(glo.editor.getModel(), 'glsl', []);
    
    fragmentShader   = glo.editor.getValue();
    const validation = validateShader(fragmentShader);

    if(validation.valid){
      updateStatus(`Prêt`, false);
      const startTag = "vec3 col = meshBg;";
      const endTag = "// __FOOTER_START__";
      const startIndex = fragmentShader.indexOf(startTag);
      const endIndex   = fragmentShader.indexOf(endTag);
      const finalCode  = fragmentShader.slice(startIndex + startTag.length, endIndex).trim();
      fragmentShaders[glo.numShaderSelect] = finalCode;
      glo.ribbon.shaderMeshInstance.updateFragmentShader(fragmentShaders[glo.numShaderSelect]);
   }
    else{
      console.log('Erreur de compilation:', validation.error);
        
        // Extraire le numéro de ligne depuis l'erreur
        // Format GLSL: "ERROR: 0:5: 'variable' : undeclared identifier"
        let lineNumber = 1;
        let columnNumber = 1;
        
        // Essayer différents formats d'erreur
        const lineMatch1 = validation.error.match(/ERROR: \d+:(\d+):/); // Format: ERROR: 0:5:
        const lineMatch2 = validation.error.match(/(\d+):(\d+)/);       // Format: 5:10
        const lineMatch3 = validation.error.match(/line (\d+)/i);       // Format: line 5
        
        if (lineMatch1) {
            lineNumber = parseInt(lineMatch1[1]);
        } else if (lineMatch2) {
            lineNumber = parseInt(lineMatch2[1]);
            columnNumber = parseInt(lineMatch2[2]);
        } else if (lineMatch3) {
            lineNumber = parseInt(lineMatch3[1]);
        }
        
        console.log('Erreur détectée à la ligne:', lineNumber);
        
        // Nettoyer le message d'erreur pour l'affichage
        let cleanMessage = validation.error
            .replace(/^ERROR: \d+:\d+:\s*/, '')  // Enlever le préfixe ERROR: 0:5:
            .trim();
        
        // Afficher le marqueur d'erreur dans Monaco
        monaco.editor.setModelMarkers(glo.editor.getModel(), 'glsl', [{
            severity: monaco.MarkerSeverity.Error,
            message: cleanMessage,
            startLineNumber: lineNumber,
            startColumn: columnNumber,
            endLineNumber: lineNumber,
            endColumn: 1000  // Toute la ligne
        }]);
        
        // Aller à la ligne de l'erreur et la mettre en surbrillance
        glo.editor.revealLineInCenter(lineNumber);
        glo.editor.setPosition({ lineNumber: lineNumber, column: columnNumber });
        glo.editor.focus();
        
        // Toast avec le numéro de ligne
        M.toast({
            html: `❌ Erreur ligne ${lineNumber}:<br><small>${cleanMessage}</small>`,
            classes: 'red darken-2',
            displayLength: 8000
        });
        
        updateStatus(`Erreur ligne ${lineNumber}`, true);
        return;
    }
});

/** Closes the fragment shader editor panel. */
getById('closeEditor')?.addEventListener('click', () => {
   glo.editorIsOpened = false;
   glo.editorWindow.style.display = 'none';
});

/** Toggles the fragment shader editor between normal and fullscreen mode. */
getById('toggleFullscreen')?.addEventListener('click', function() {
   const icon = this.querySelector('i');
   
   if (!isFullscreen) {
      glo.editorWindow.classList.add('fullscreen');
      icon.textContent = 'fullscreen_exit';
      isFullscreen = true;
   } else {
      glo.editorWindow.classList.remove('fullscreen');
      icon.textContent = 'fullscreen';
      isFullscreen = false;
   }
   
   if (glo.editor) {
      setTimeout(() => glo.editor.layout(), 100);
   }
});

/**
 * Updates a shader option toggle (opt1/opt2/opt3) and pushes the value to the GPU.
 * @param {string} param - Option key ("opt1", "opt2", or "opt3").
 * @param {boolean} value - Whether the option is enabled.
 */
const updShaderOpt = (param, value) => {
   glo.shaderOpt[param] = value;
   glo.ribbon.shaderMeshInstance.updateFloatParam(param, value ? 1.0 : 0.0);
}

const shaderOpt1 = getById("shaderOpt1");
const shaderOpt2 = getById("shaderOpt2");
const shaderOpt3 = getById("shaderOpt3");
shaderOpt1.addEventListener("change", () => { updShaderOpt('opt1', shaderOpt1.checked); });
shaderOpt2.addEventListener("change", () => { updShaderOpt('opt2', shaderOpt2.checked); });
shaderOpt3.addEventListener("change", () => { updShaderOpt('opt3', shaderOpt3.checked); });

// ==================== NORMAL SHADER EDITOR EVENTS ====================

/** Resets the time variable to zero for normal/deformation shader preview. */
getById('resetBtnNormal')?.addEventListener('click', () => {
   w = 0;
});

/**
 * Compiles the normal/deformation shader from the normal editor.
 * Extracts user code between markers, saves it, and recompiles the vertex shader.
 */
getById('compileBtnNormal')?.addEventListener('click', () => {
   const statusEl = getById('editorStatusNormal');

   if (!glo.editorNormal) return;

   const fullCode = glo.editorNormal.getValue();

   // Extraire le code entre les marqueurs de computeDeformation
   const startTag = 'float result = 0.0;';
   const endTag = 'return result;';
   const startIndex = fullCode.indexOf(startTag);
   const endIndex = fullCode.indexOf(endTag);

   if (startIndex === -1 || endIndex === -1) {
      updateStatus('Erreur: marqueurs manquants', true, statusEl);
      return;
   }

   const normCode = fullCode.slice(startIndex + startTag.length, endIndex);

   // Sauvegarder dans le tableau (sauf en mode création, géré par save())
   if (!ShaderCRUDNormal.isCreatingNew) {
      normalShaders[glo.numNormalShaderSelect] = normCode;
   }

   // Tenter de recompiler le vertex shader via updateNormDeformGLSL
   if (glo.ribbon && glo.ribbon.shaderMeshInstance) {
      const result = glo.ribbon.shaderMeshInstance.updateNormDeformGLSL(normCode);
      if (result.success) {
         updateStatus('Prêt', false, statusEl);
      } else {
         updateStatus('Erreur: ' + (result.error || 'compilation'), true, statusEl);
      }
   } else {
      updateStatus('Prêt (pas de mesh actif)', false, statusEl);
   }
});

/** Closes the normal/deformation shader editor panel. */
getById('closeEditorNormal')?.addEventListener('click', () => {
   glo.editorNormalIsOpened = false;
   glo.editorWindowNormal.style.display = 'none';
});

/** Toggles the normal shader editor between normal and fullscreen mode. */
let isFullscreenNormal = false;
getById('toggleFullscreenNormal')?.addEventListener('click', function() {
   const icon = this.querySelector('i');

   if (!isFullscreenNormal) {
      glo.editorWindowNormal.classList.add('fullscreen');
      icon.textContent = 'fullscreen_exit';
      isFullscreenNormal = true;
   } else {
      glo.editorWindowNormal.classList.remove('fullscreen');
      icon.textContent = 'fullscreen';
      isFullscreenNormal = false;
   }

   if (glo.editorNormal) {
      setTimeout(() => glo.editorNormal.layout(), 100);
   }
});

/** Triggers export when Enter is pressed in the filename input field. */
getById('filename').addEventListener("keydown", function (e) {
   if(e.key === 'Enter'){ getById('exportButton').click(); }
});

/**
 * Declarative keyboard shortcuts registry.
 * Each entry maps a key (with optional ctrl/shift/alt modifiers) to an action callback.
 * Modifiers default to false when omitted. Matched by the keydown handler on #univers_div.
 * @type {{key: string, ctrl?: boolean, shift?: boolean, alt?: boolean, action: Function}[]}
 */
const keyboardShortcuts = [
   // --- No modifier ---
   { key: "h",  action: () => randomizeColorsApp() },
   { key: "p",  action: () => importModal() },
   { key: "+",  action: () => glo.camera.radius /= 1.125 },
   { key: "-",  action: () => glo.camera.radius *= 1.125 },
   { key: "7",  action: () => slidersAnim('u', 0, -0.01) },
   { key: "8",  action: () => slidersAnim('u', 0, 0.01) },
   { key: "4",  action: () => slidersAnim('v', 0, -0.01) },
   { key: "5",  action: () => slidersAnim('v', 0, 0.01) },
   { key: "0",  action: () => slidersAnim('u', 0, -0.001) },
   { key: "1",  action: () => slidersAnim('u', 0, 0.001) },
   { key: "6",  action: () => slidersAnim('v', 0, -0.001) },
   { key: "9",  action: () => slidersAnim('v', 0, 0.001) },
   { key: ";",  action: () => switchWritingType(false) },
   { key: ",",  action: () => switchWritingType(true) },
   { key: "F10",  action: () => glo.clock.setTime(glo.clock.time + .25) },
   { key: "F8",  action: () => glo.clock.setTime(glo.clock.time - .25) },
   { key: "F9",  action: () => {
      const paused = glo.clock.togglePause();
      glo.allControls.getByName('resetTimeButton').textBlock.text = paused ? 'PLAY' : 'STOP';
   }},
   { key: " ",  action: () => {
      const paused = glo.clock.togglePause();
      glo.allControls.getByName('resetTimeButton').textBlock.text = paused ? 'PLAY' : 'STOP';
   }},
   { key: "'",  action: () => { glo.params.uvToXy = !glo.params.uvToXy; uvToXy(); } },
   { key: '"',  action: () => specialRandomizeColorsApp() },
   { key: '$',  action: () => makeRndSurface() },
   { key: '*',  action: () => intiColorUI() },
   { key: '<',  action: () => { glo.formesSuit = !glo.formesSuit; addRadios(true); paramRadios(); } },
   { key: 'u',  action: () => changeResolution('increase') },
   { key: 'j',  action: () => changeResolution('decrease') },
   { key: 'c',  action: () => toggleTravelling() },

   // --- Alt ---
   { key: "+",  alt: true, action: () => glo.rotateSpeed *= 1.2 },
   { key: "-",  alt: true, action: () => glo.rotateSpeed /= 1.2 },
   { key: "j",  alt: true, action: () => M.Modal.getInstance(getById('rotationConventionsModal')).open() },

   // --- Shift (keys matched case-insensitively) ---
   { key: "h",  shift: true, action: () => cameraOnPos({x: 0, y: 0, z: 0}) },
   { key: "b",  shift: true, action: () => { glo.wireframe = !glo.wireframe; glo.ribbon.material.wireframe = glo.wireframe; } },
   { key: "v",  shift: true, action: () => viewOnAxis() },
   { key: "q",  shift: true, action: () => firstInputToOthers() },
   { key: "l",  shift: true, action: () => toggleLoopRecordMode() },
];

getById('univers_div').addEventListener("keydown", function (e) {
   // Babylon GUI InputText whitelists `c`/`v` so Ctrl+C / Ctrl+V still copy/paste —
   // which means bare `c` and `v` also bubble to here. Skip global shortcuts while
   // any GUI input has focus to keep typing from triggering them.
   if (glo.advancedTexture && glo.advancedTexture.focusedControl) return;
   
   const pressedKey  = e.key.toLowerCase();
   const pressedCtrl  = !!e.ctrlKey;
   const pressedShift = !!e.shiftKey;
   const pressedAlt   = !!e.altKey;

   for (const shortcut of keyboardShortcuts) {
      const wantCtrl  = !!shortcut.ctrl;
      const wantShift = !!shortcut.shift;
      const wantAlt   = !!shortcut.alt;

      if (shortcut.key.toLowerCase() === pressedKey &&
          wantCtrl  === pressedCtrl &&
          wantShift === pressedShift &&
          wantAlt   === pressedAlt) {
         shortcut.action();
         return;
      }
   }
});

// =====================================================================================
// HISTORY (undo/redo) integration
//
// All hooks here run only on user-driven state changes, never per render frame —
// the GPU render loop (engine.runRenderLoop in bab.js) is untouched.
// =====================================================================================

(function wireHistory() {
   if (typeof History === 'undefined') { return; }

   History.init();

   // Wrap makeCurves: every mesh rebuild path (sliders, equations, form select,
   // import, symmetry, transforms…) flows through here. We commit a debounced
   // snapshot so a slider drag or equation typing does not flood the stack.
   if (typeof makeCurves === 'function') {
      const _origMakeCurves = makeCurves;
      makeCurves = async function () {
         const result = await _origMakeCurves.apply(this, arguments);
         if (!History.suspended) { History.commitDebounced(); }
         return result;
      };
   }

   // Shader compile (fragment): commit immediately on success, no debounce needed.
   const _origCompileBtn = getById('compileBtn');
   if (_origCompileBtn) {
      _origCompileBtn.addEventListener('click', () => {
         // Run after the existing compile handler completes so fragmentShaders[i] is up to date.
         setTimeout(() => { if (!History.suspended) { History.commit('Compile shader'); } }, 0);
      });
   }
   const _origCompileBtnNormal = getById('compileBtnNormal');
   if (_origCompileBtnNormal) {
      _origCompileBtnNormal.addEventListener('click', () => {
         setTimeout(() => { if (!History.suspended) { History.commit('Compile normal shader'); } }, 0);
      });
   }

   // Document-level Ctrl+Z / Ctrl+Shift+Z (and Ctrl+Y) — works regardless of focus,
   // except when typing in the Monaco editor (which has its own undo/redo).
   document.addEventListener('keydown', function (e) {
      if (!(e.ctrlKey || e.metaKey)) { return; }
      const key = e.key.toLowerCase();
      const isUndo = (key === 'z' && !e.shiftKey);
      const isRedo = (key === 'y') || (key === 'z' && e.shiftKey);
      if (!isUndo && !isRedo) { return; }

      // Let Monaco handle its own undo/redo when focused inside the editor.
      const target = e.target;
      if (target && target.closest && target.closest('.monaco-editor')) { return; }

      e.preventDefault();
      e.stopPropagation();
      if (isUndo) { History.undo(); } else { History.redo(); }
      refreshHistoryUI();
   }, true);

   // Minimal floating UI: undo/redo buttons + label of last action.
   function refreshHistoryUI() {
      const undoBtn = getById('historyUndoBtn');
      const redoBtn = getById('historyRedoBtn');
      const labelEl = getById('historyLabel');
      if (undoBtn) { undoBtn.disabled = !History.canUndo(); undoBtn.classList.toggle('disabled', !History.canUndo()); }
      if (redoBtn) { redoBtn.disabled = !History.canRedo(); redoBtn.classList.toggle('disabled', !History.canRedo()); }
      if (labelEl) {
         const top = History.past[History.past.length - 1];
         labelEl.textContent = top ? top.label : '';
      }
   }
   History.onChange(refreshHistoryUI);

   // Hook UI buttons after DOM is ready.
   function setupHistoryButtons() {
      const undoBtn = getById('historyUndoBtn');
      const redoBtn = getById('historyRedoBtn');
      if (undoBtn && !undoBtn._wired) {
         undoBtn._wired = true;
         undoBtn.addEventListener('click', () => { History.undo(); refreshHistoryUI(); });
      }
      if (redoBtn && !redoBtn._wired) {
         redoBtn._wired = true;
         redoBtn.addEventListener('click', () => { History.redo(); refreshHistoryUI(); });
      }
      refreshHistoryUI();
   }
   if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupHistoryButtons);
   } else {
      setupHistoryButtons();
   }
})();