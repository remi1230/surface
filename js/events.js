//*****************************************************************************************************//
//**********************************************EVENTS*************************************************//
//*****************************************************************************************************//
$( document ).ready(async function() {
  // Forcer le chargement de toutes les variantes Poppins avant de créer les contrôles GUI
  await Promise.all([
    document.fonts.load('200 1em Manrope'),
    document.fonts.load('300 1em Manrope'),
    document.fonts.load('400 1em Manrope'),
    document.fonts.load('500 1em Manrope'),
    document.fonts.load('600 1em Manrope'),
    document.fonts.load('700 1em Manrope'),
    document.fonts.load('800 1em Manrope'),
    document.fonts.load('100 1em Poppins'),
    document.fonts.load('300 1em Poppins'),
    document.fonts.load('400 1em Poppins'),
    document.fonts.load('500 1em Poppins'),
    document.fonts.load('600 1em Poppins'),
    document.fonts.load('700 1em Poppins'),
  ]);

  add_gui_controls();

  glo.rightPanelsClasses.forEach(panelClass => {
   if(panelClass !== glo.guiSelect){ toggleGuiControlsByClass(false, panelClass); }
  });

  gui_resize();
  initExportModal();
  $('.modal').not('#exportModal').modal();
  $('select').formSelect();
  glo.formes.setFormeSelect(...glo.formes.selected);
  startAnim(20, 1);
  getPathsInfos();
  otherDesigns();
  paramRadios();
  styleUI();
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
    glo.scene.stopAllAnimations();
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

document.getElementById('univers_div').addEventListener("keydown", function (e) {
   const key = e.key;

   if(glo.modalOpen){ 
      switch (key) {
         case "Enter":
            $("#exportButton").trigger('click');
         break;
      } 
   }
   else{ 
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
               case "g":
                  glo.ribbon.curveByStep.next();

                  break;
               case "r":
                  //FREE

                  break;
               case "w":
                  glo.anim_construct_mesh = !glo.anim_construct_mesh;

                  break;
               case "h":
                  randomize_colors_app();

                  break;
               case "e":
                  glo.params.normByFace = !glo.params.normByFace;
                  remakeRibbon();

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
               case "ç":
                  glo.rotateByMeshCenter = !glo.rotateByMeshCenter;

                  remakeRibbon();
                  break;
               case "à":
                  glo.params.NaNToZero = !glo.params.NaNToZero;
                  remakeRibbon();

                  break;
               case "k":
                  glo.skipRebuild = true;
                  glo.slider_nb_steps_u.maximum/=2;
                  glo.slider_nb_steps_v.maximum/=2;

                  if(glo.params.symmetrizeX < 2 && glo.params.symmetrizeY < 2 && glo.params.symmetrizeZ < 2){
                     glo.slider_nb_steps_u.value/=2;
                     glo.slider_nb_steps_v.value/=2;
                     glo.skipRebuild = false;

                     remakeRibbon();
                  }
                  else{ glo.skipRebuild = false; }
                  break;
               case "l":
                  glo.skipRebuild = true;
                  glo.slider_nb_steps_u.maximum*=2;
                  glo.slider_nb_steps_v.maximum*=2;

                  if(glo.params.symmetrizeX < 2 && glo.params.symmetrizeY < 2 && glo.params.symmetrizeZ < 2){
                     glo.slider_nb_steps_u.value*=2;
                     glo.slider_nb_steps_v.value*=2;
                     glo.skipRebuild = false;

                     remakeRibbon();
                  }
                  else{ glo.skipRebuild = false; }

                  break;
               case ";":
                  switchWritingType(false);

                  break;
               case ",":
                  switchWritingType(true);

                  break;
               case "x":
                  glo.planeXYvisible = !glo.planeXYvisible;
                  showPlane(glo.planeXYvisible, 'xy');

                  break;
               case "y":
                  glo.planeYZvisible = !glo.planeYZvisible;
                  showPlane(glo.planeYZvisible, 'yz');

                  break;
               case "z":
                  glo.planeXZvisible = !glo.planeXZvisible;
                  showPlane(glo.planeXZvisible, 'xz');

                  break;
               case "s":
                  glo.params.curvaturetoZero = !glo.params.curvaturetoZero;
                  remakeRibbon();

                  break;
               case "t":
                  glo.params.doubleLineSystem = !glo.params.doubleLineSystem;
                  remakeRibbon();

                  break;
               case "d":
                  darkTheme();

                  break;
               case "f":
                  //FREE

                  break;
               case "q":
                  //FREE

                  break;
               case "a":
                  styleUI();

               break;
               case "ù":
                  //FREE
                  
                  break;
               case "'":
                  glo.params.uvToXy = !glo.params.uvToXy;
                  uvToXy();

                  break;
               case "(":
                  glo.deformWithMat = !glo.deformWithMat;

                  break;
               case ")":
                  glo.editorGeometryIsOpened = !glo.editorGeometryIsOpened;
      
                  if (glo.editorGeometryIsOpened) {
                     openShaderWindow(glo, 'editorGeometry', glo.editorWindowGeometry, combinedVertexShader, getById('editor-geometry-container'));
                     giveMaterialToMesh();
                     
                  } else {
                     glo.editorWindowGeometry.style.display = 'none';
                  }

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
               case 'a':
                  //FREE

                  break;
               case 'b':
                  glo.params.playWithColors = !glo.params.playWithColors;
                  remakeRibbon();

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
               case 'm':
                  //FREE

                  break;
               case "n":
                  glo.voronoiMode = !glo.voronoiMode;
                  remakeRibbon();

               break;
               case '0':
                  slidersAnim('u', 0, -0.001);

                  break;
               case '1':
                  slidersAnim('u', 0, 0.001);

                  break;
               case '2':
                  //FREE

                  break;
               case "3":
                  glo.onlyTubes = !glo.onlyTubes;
                  remakeRibbon();

                  break;
               case "6":
                  slidersAnim('v', 0, -0.001);

                  break;
               case "9":
                  slidersAnim('v', 0, 0.001);

                  break;
               case ":":
                  //FREE
               break;
               case "!":
                  //FREE

               break;
               case "PageUp":
                  glo.allControls.getByName('symmetrizeX').maximum*=2;
                  glo.allControls.getByName('symmetrizeY').maximum*=2;
                  glo.allControls.getByName('symmetrizeZ').maximum*=2;
                  glo.allControls.getByName('symmetrizeX').value*=2;
                  glo.allControls.getByName('symmetrizeY').value*=2;
                  glo.allControls.getByName('symmetrizeZ').value*=2;

               break;
               case "PageDown":
                  glo.allControls.getByName('symmetrizeX').maximum/=2;
                  glo.allControls.getByName('symmetrizeY').maximum/=2;
                  glo.allControls.getByName('symmetrizeZ').maximum/=2;
                  glo.allControls.getByName('symmetrizeX').value/=2;
                  glo.allControls.getByName('symmetrizeY').value/=2;
                  glo.allControls.getByName('symmetrizeZ').value/=2;

               break;
               case "Home":
                  showRibonFacets();

               break;
               case "F8":
                  /*glo.allControls.forEach(ctrl => { ctrl.dispose(); });
                  glo.advancedTexture.dispose();

                  add_gui_controls();*/

                  glo.engine.resize();
                  glo.advancedTexture.scaleTo(
                     glo.engine.getRenderWidth(), 
                     glo.engine.getRenderHeight()
                  );

                  glo.allControls.haveTheseClasses('header radio').forEach(label => {
                           label.children[1].fontSize = '17px';
                        });

               break;
               case "F12":
                  /*setTimeout(() => {
                     glo.engine.resize();

                     glo.devTollsOpened = !glo.devTollsOpened;
                     if(glo.devTollsOpened){
                        
                     }
                     else{
                        glo.allControls.haveTheseClasses('header radio').forEach(label => {
                           label.children[1].fontSize = '17px';
                        });
                     }

                  }, 100);
                  glo.engine.resize();*/
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
               case "1":
                  glo.camera.radius/=1.2;

                  break;
               case "2":
                  glo.camera.radius*=1.2;

                  break;
               case "3":
                  //FREE

                  break;
               case "4":
                  glo.shaders.params.islight = !glo.shaders.params.islight;
                  glo.light.direction.z = glo.shaders.params.islight ? 0.5 : 0;
                  glo.allControls.getByName("lightDirectionZ").value = glo.light.direction.z;
                  giveMaterialToMesh();

                  break;
               case "5":
                  e.preventDefault();
                  e.stopPropagation();
                  giveMaterialToMesh();

                  break;
               case "6":
                  e.preventDefault();
                  e.stopPropagation();
                  glo.editorWindow.style.display = glo.editorWindow.style.display === 'none' ? 'flex' : 'none';
                  if(glo.editorWindow.style.display === 'flex'){ openShaderWindow(); }
                  giveMaterialToMesh();

                  break;
               case "7":
                  glo.shaders.params.invcol = !glo.shaders.params.invcol;
                  giveMaterialToMesh();

                  break;
               case "8":
                  glo.numShaderSelect = glo.numShaderMove.next().value;
                  fragmentShader = fragmentShaderHeader + fragmentShaders[glo.numShaderSelect] + fragmentShaderFooter;

                  if(glo.editor){ glo.editor.setValue(fragmentShader); }

                  giveMaterialToMesh();

                  break;
               case "0":
                  //FREE

                  break;
               case "9":
                  //FREE

                  break;
               case "!":
                  //FREE
                  break;
               case "g":
                  //FREE

                  break;
               case "PageUp":
                  //FREE

               break;
               case "PageDown":
                  //FREE

               break;
               case "c":
                  wstep/=2;

               break;
               case "v":
                  w = 0;

               break;
               case "b":
                  wstep*=2;

               break;
               case "j":
                  $('#rotationConventionsModal').modal('open');

               break;
               case "s":
                  glo.mergeMeshesByIntersect = !glo.mergeMeshesByIntersect;
                  remakeRibbon();

               break;
               case "r":
                  glo.additiveSurface = !glo.additiveSurface;
                  remakeRibbon();

               break;
               case "i":
                  //FREE

               break;
               case "x":
                  //FREE

               break;
               case "y":
                  //FREE

               break;
               case "z":
                  //FREE

               break;
               case "t":
                  //FREE

               break;
               case "q":
                  window.open(location.href  + "stats/", '_blank');

               break;
               case "k":
                  glo.allControls.getByName('checkerboard').maximum/=2;

                  break;
               case "l":
                  glo.allControls.getByName('checkerboard').maximum*=2;

                  break;
            }
         }
      }
      else{
         switch (key) {
            case "w":
            case "W":
            //FREE

               break;
            case "C":
               glo.invPointsByDistToOrigin = !glo.invPointsByDistToOrigin;

               remakeRibbon();

               break;
            case "a":
            case "A":
            //FREE

               break;
            case "p":
            case "P":
               glo.closeFirstWithLastPath = !glo.closeFirstWithLastPath;
               remakeRibbon();

               break;
            case "z":
            case "Z":
               //FREE

               break;
            case "x":
            case "X":
               fibonacciSphereRibbon();

               break;
            case "y":
            case "Y":
               //FREE

               break;
            case "z":
            case "Z":
               //FREE

               break;
            case "H":
            case "h":
               cameraOnPos({x: 0, y: 0, z: 0});

               break;
            case "S":
            case "s":
               //FREE

               break;
            case "T":
            case "t":
               //FREE
               
               break;
            case "E":
            case "e":
               //FREE

               break;
            case "D":
            case "d":
               !glo.scene.debugLayer.isVisible() ? glo.scene.debugLayer.show() : glo.scene.debugLayer.hide();

               break;
            case "F":
            case "f":
               //FREE

               break;
            case "I":
            case "i":
               //FREE

               break;
            case "R":
            case "r":
               gridToCenterMesh();

               break;
            case "U":
            case "u":
            //FREE
            break;
            case "B":
            case "b":
               glo.wireframe = !glo.wireframe;
               glo.ribbon.material.wireframe = glo.wireframe;

            break;
            case "L":
            case "l":
               glo.slider_u.maximum*=2;
               glo.slider_v.maximum*=2;

            break;
            case "K":
            case "K":
               glo.slider_u.maximum/=2;
               glo.slider_v.maximum/=2;

            break;
            case "O":
            case "o":
               //FREE

            break;
            case "V":
            case "v":
               viewOnAxis();

            break;
            case "Y":
            case "y":
               //FREE

            break;
            case "Q":
            case "q":
               firstInputToOthers();

            break;
            case "N":
            case "n":
               glo.stepByStepFast = !glo.stepByStepFast;

            break;
            case "?":
            //FREE

               break;
            case ".":
            //FREE

               break;
            case "§":
            //FREE

               break;
            case "PageUp":
               //FREE

            break;
            case "PageDown":
               //FREE

            break;
         }
      }
   }
});