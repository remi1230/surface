//*****************************************************************************************************//
//**********************************************EVENTS*************************************************//
//*****************************************************************************************************//
$( document ).ready(async function() {
   // Forcer le chargement de toutes les variantes Poppins avant de créer les contrôles GUI
   await Promise.all([
      document.fonts.load('300 1em Poppins'),
      document.fonts.load('400 1em Poppins'),
      document.fonts.load('600 1em Poppins'),
   ]);

   add_gui_controls();

   glo.rightPanelsClasses.forEach(panelClass => {
      if(panelClass !== glo.guiSelect){ toggleGuiControlsByClass(false, panelClass); }
   });

   initExportModal();
   initImportModal();
   $('.modal').not('#exportModal').not('#importModal').modal();
   $('select').formSelect();
   glo.formes.setStartForm();
   startAnim(100, 15, 1);
   getPathsInfos();
   otherDesigns();
   paramRadios();
   styleUI();
});

window.addEventListener('resize', () => {
   glo.engine.resize();
});

$("#univers_div").mouseenter(function(){
	$("#univers_div").css('cursor', 'pointer');
});
$("#univers_div").mouseleave(function(){
	$("#univers_div").css('cursor', 'auto');
});
$("#univers_div").click(function(){
	glo.modalOpen = false;
});

$("#renderCanvas").on('pointermove', function(e){
    glo.n++;
    stopRotAnim();
    //$("#renderCanvas").off("pointermove");
    if(glo.n > 20){ $("#renderCanvas").off("pointermove"); delete glo.n; }
});

document.getElementById('resetBtn')?.addEventListener('click', () => {
   w = 0;
});

document.getElementById('compileBtn')?.addEventListener('click', () => {
   // ✅ EFFACER LES MARQUEURS D'ERREUR DÈS LE DÉBUT
    monaco.editor.setModelMarkers(glo.editor.getModel(), 'glsl', []);
    
    fragmentShader   = glo.editor.getValue();
    const validation = validateShader(fragmentShader);

    if(validation.valid){
      updateStatus(`Prêt`, false);
      const startTag = "vec3 col = meshBg;";
      const endTag = "// Inversion";
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

// Fermer l'éditeur
document.getElementById('closeEditor')?.addEventListener('click', () => {
   glo.editorIsOpened = false;
   glo.editorWindow.style.display = 'none';
});

// Plein écran
document.getElementById('toggleFullscreen')?.addEventListener('click', function() {
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

// Reset du temps pour l'éditeur normal
document.getElementById('resetBtnNormal')?.addEventListener('click', () => {
   w = 0;
});

// Compiler le shader normal
document.getElementById('compileBtnNormal')?.addEventListener('click', () => {
   const statusEl = document.getElementById('editorStatusNormal');

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

   // Sauvegarder dans le tableau
   normalShaders[glo.numNormalShaderSelect] = normCode;

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

// Fermer l'éditeur normal
document.getElementById('closeEditorNormal')?.addEventListener('click', () => {
   glo.editorNormalIsOpened = false;
   glo.editorWindowNormal.style.display = 'none';
});

// Plein écran éditeur normal
let isFullscreenNormal = false;
document.getElementById('toggleFullscreenNormal')?.addEventListener('click', function() {
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

document.getElementById('filename').addEventListener("keydown", function (e) {
   if(e.key === 'Enter'){ $("#exportButton").trigger('click'); }
});

document.getElementById('univers_div').addEventListener("keydown", function (e) {
   const key = e.key;

   if(e.ctrlKey){
      switch (key) {
         case "q": 
            //FREE
         break;
      }
   }
   else if(!e.shiftKey){
      if(!e.altKey){
         switch (key) {
            case "h":
               randomize_colors_app();

               break;
            case "p":
               importModal();

               break;
            case "+":
               glo.camera.radius/=1.125;

               break;
            case "-":
               glo.camera.radius*=1.125;

               break;
            case "7":
               slidersAnim('u', 0, -0.01);

               break;
            case "8":
               slidersAnim('u', 0, 0.01);

               break;
            case "4":
               slidersAnim('v', 0, -0.01);

               break;
            case "5":
               slidersAnim('v', 0, 0.01);

               break;
            case ";":
               switchWritingType(false);

               break;
            case ",":
               switchWritingType(true);

               break;
            case "f":
               glo.timeCoeff *= 2;

               break;
            case "q":
               glo.timeCoeff /= 2;

               break;
            case "a":
               glo.savedTimeCoeff = glo.pause ? glo.savedTimeCoeff : glo.timeCoeff;
               glo.pause          = !glo.pause;

               glo.timeCoeff = glo.pause ? 0 : glo.savedTimeCoeff;

               glo.allControls.getByName('resetTimeButton').text = glo.pause ? 'PLAY' : 'STOP';

            break;
            case "'":
               glo.params.uvToXy = !glo.params.uvToXy;
               uvToXy();

               break;
            case '"':
               special_randomize_colors_app();

               break;
            case '$':
               makeRndSurface();

               break;
            case '*':
               intiColorUI();

               break;
            case '<':
               glo.formesSuit = !glo.formesSuit;
               add_radios(true);
               paramRadios();

               break;
            case ',':
               remakeRibbon();

               break;
            case 'u':
               changeResolution('increase');

               break;
            case 'j':
               changeResolution('decrease');

               break;
            case '0':
               slidersAnim('u', 0, -0.001);

               break;
            case '1':
               slidersAnim('u', 0, 0.001);

               break;
            case "6":
               slidersAnim('v', 0, -0.001);

               break;
            case "9":
               slidersAnim('v', 0, 0.001);

               break;
         }
      }
      else{
         switch (key) {
            case "+":
               glo.rotate_speed*=1.2;

               break;
            case "-":
               glo.rotate_speed/=1.2;

               break;
            case "j":
               $('#rotationConventionsModal').modal('open');

            break;
         }
      }
   }
   else{
      switch (key) {
         case "H":
         case "h":
            cameraOnPos({x: 0, y: 0, z: 0});

            break;
         case "B":
         case "b":
            glo.wireframe = !glo.wireframe;
            glo.ribbon.material.wireframe = glo.wireframe;

         break;
         case "V":
         case "v":
            viewOnAxis();

         break;
         case "Q":
         case "q":
            firstInputToOthers();

         break;
      }
   }
   
});