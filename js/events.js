//*****************************************************************************************************//
//**********************************************EVENTS*************************************************//
//*****************************************************************************************************//
$( document ).ready(function() {
  add_gui_controls();

  glo.rightPanelsClasses.forEach(panelClass => {
   if(panelClass !== glo.guiSelect){ toggleGuiControlsByClass(false, panelClass); }
  });

  gui_resize();
  initExportModal();
  $('.modal').not('#exportModal').modal();
  $('select').formSelect();
  glo.formes.setFormeSelect(...glo.formes.selected);
  glo.histo.init();
  special_randomize_colors_app(true);
  startAnim(20, 1);
  initDataModal();
  getPathsInfos();
  otherDesigns();
  paramRadios();
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

document.addEventListener("fullscreenchange", function( event ) {
    if (!document.fullscreen ) {
      glo.fullScreen = false;
      $("#renderCanvas").attr("height", glo.canvasHeight);
      $("#renderCanvas").attr("width", glo.canvasWidth);
      glo.fullScreenButton.textBlock.text = "↗ S";
    }
});

$("#renderCanvas").on('pointermove', function(e){
    glo.n++;
    glo.scene.stopAllAnimations();
    if(glo.n > 20){ $("#renderCanvas").off("pointermove"); delete glo.n; }
});

document.getElementById('dataTable').addEventListener("click", function(ev){
   showVertex(parseInt(ev.target.parentElement.childNodes[5].innerText), parseInt(ev.target.parentElement.childNodes[6].innerText),
   parseInt(ev.target.parentElement.childNodes[7].innerText)); 
});

window.addEventListener("keydown", function (e) {
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
            case "x": case "y": case "z":
               negativeMeshGeometry(key);
            break;
         }
      }
      else if(!e.shiftKey){
         if(!e.altKey){
            switch (key) {
               case "g":
                  glo.curve_step.next();

                  break;
               case "r":
                  reset_curve_step_by_step();

                  break;
               case "w":
                  glo.anim_construct_mesh = !glo.anim_construct_mesh;

                  break;
               case "h":
               randomize_colors_app();

                  break;
               case "e":
                  //FREE

                  break;
               case "p":
                  importModal();

                  break;
               case "+":
                  glo.camera.radius/=2;

                  break;
               case "-":
                  glo.camera.radius*=2;

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
               slidersAnim('stepV', 0, -1);

                  break;
               case "à":
               slidersAnim('stepV', 0, 1);

                  break;
               case "k":
               glo.slider_nb_steps_u.maximum/=2;
               glo.slider_nb_steps_v.maximum/=2;

                  break;
               case "l":
               glo.slider_nb_steps_u.maximum*=2;
               glo.slider_nb_steps_v.maximum*=2;

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
                  if(glo.ribbonCloneHistoDone){ delete glo.ribbonSaveToClone; glo.ribbonCloneHistoDone = false; }
                  cloneSystem();
                  glo.cloneToSave = true;
                  glo.histo.save();
                  glo.cloneToSave = false;

                  break;
               case "q":
                  if(glo.cloneScale >= 0.2){ cloneScale(-0.1); }

                  break;
               case "ù":
                  cloneScale(0.1);

                  break;
               case "'":
                  if(typeof(glo.orientationClone ) == "undefined"){  glo.orientationClone = orientationClone(); }
                  glo.orientationClone.next();
                  orientClone(glo.cloneAxis);

                  break;
               case "(":
                  saveRibbonToClone();

                  break;
               case '"':
                  special_randomize_colors_app();

                  break;
               case '$':
                  makeRndSurface();

                  break;
               case '*':
                  resetEquationsParamSliders();

                  break;
               case '<':
                  glo.formesSuit = !glo.formesSuit;
                  add_radios(true);
                  paramRadios();

                  break;
               case 'a':
                  if(typeof(glo.playWithColMode) == "undefined"){ glo.playWithColMode = playWithColNextMode(); }
                  glo.playWithColMode.next();
                  if(glo.params.playWithColors){
                     makeColors();
                  }

                  break;
               case 'b':
                  glo.params.playWithColors = !glo.params.playWithColors;
                  glo.params.playWithColors ? makeColors() : make_ribbon(false);

                  break;
               case ',':
                  reset_camera();

                  break;
               case 'u':
                  glo.params.colors2 = !glo.params.colors2;
                  makeColors();

                  break;
               case 'j':
                  glo.params.colorsByRotate = !glo.params.colorsByRotate;
                  makeColors();

                  break;
               case 'm':
                  glo.params.colorsAbs = !glo.params.colorsAbs;
                  makeColors();

                  break;
               case "n":
                  glo.voronoiMode = !glo.voronoiMode;
                  make_ribbon();

               break;
               case '1':
                  glo.curves.paths[0].shift();
                  make_ribbon();

                  break;
               case '2':
                  glo.params.colorMove = !glo.params.colorMove;
                  makeColors();

                  break;
               case "3":
                  glo.onlyTubes = !glo.onlyTubes;
                  remakeRibbon();

                  break;
               case "6":
                  glo.vertexsTypes.next();
                  if(glo.normalMode){ drawNormalEquations(); }

                  break;
               case ":":
                  transformMesh('scaling', 'x', glo.ribbon.scaling.x/2, glo.ribbon, glo.curves.lineSystem, false);
                  transformMesh('scaling', 'y', glo.ribbon.scaling.y/2, glo.ribbon, glo.curves.lineSystem, false);
                  transformMesh('scaling', 'z', glo.ribbon.scaling.z/2, glo.ribbon, glo.curves.lineSystem, false);

               break;
               case "!":
                  transformMesh('scaling', 'x', glo.ribbon.scaling.x*2, glo.ribbon, glo.curves.lineSystem, false);
                  transformMesh('scaling', 'y', glo.ribbon.scaling.y*2, glo.ribbon, glo.curves.lineSystem, false);
                  transformMesh('scaling', 'z', glo.ribbon.scaling.z*2, glo.ribbon, glo.curves.lineSystem, false);

               break;
               case ")":
                  glo.ribbon.fractalize();

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
                  //FREE

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
                  //FREE

                  break;
               case "5":
                  //FREE

                  break;
               case "6":
                  //FREE

                  break;
               case "7":
                  //FREE

                  break;
               case "8":
                  //FREE

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
                  toggleDataTable();

                  break;
               case "PageUp":
                  //FREE

               break;
               case "PageDown":
                  //FREE

               break;
               case "b":
                  //FREE

               break;
               case "c":
                  //FREE

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
                  if(!glo.normalMode){  make_curves(); }
                  else{
                     glo.fromSlider = true; make_curves(); glo.fromSlider = false; drawNormalEquations();
                  }

               break;
               case "i":
                  inverseMeshGeometry();

               break;
               case "x":
                  glo.cutRibbon.x = !glo.cutRibbon.x ? 1 : 0;
                  cutsRibbon();

               break;
               case "y":
                  glo.cutRibbon.y = !glo.cutRibbon.y ? 1 : 0;
                  cutsRibbon();

               break;
               case "z":
                  glo.cutRibbon.z = !glo.cutRibbon.z ? 1 : 0;
                  cutsRibbon();

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
            glo.normalMode = !glo.normalMode;
            if(glo.normalMode){ resetInputsRibbonEquations(); drawNormalEquations(); }
            else{ restoreInputsRibbonEquations(); make_curves(); }

               break;
            case "C":
            //FREE

               break;
            case "a":
            case "A":
            //FREE

               break;
            case "p":
            case "P":
            glo.closeFirstWithLastPath = !glo.closeFirstWithLastPath;
            if(!glo.normalMode){ 
               make_curves();
            }
            else{
               drawNormalEquations();
            }

               break;
            /*case "z":
            case "Z":
               glo.noLinkToZero = !glo.noLinkToZero;
               if(!glo.normalMode){ make_curves(); }
               else{ glo.fromSlider = true; make_curves(); glo.fromSlider = false; drawNormalEquations(); }

               break;*/
            case "x":
            case "X":
               glo.ribbon.axisToOrigin('x');

               break;
            case "y":
            case "Y":
               glo.ribbon.axisToOrigin('y');

               break;
            case "z":
            case "Z":
               glo.ribbon.axisToOrigin('z');

               break;
            case "H":
            case "h":
               cameraOnPos({x: 0, y: 0, z: 0});

               break;
            case "S":
            case "s":
            glo.normalOnNormalMode = !glo.normalOnNormalMode;

               break;
            case "E":
            case "e":
               glo.params.centerIsLocal = !glo.params.centerIsLocal;
               remakeRibbon();

               break;
            case "D":
            case "d":
               !glo.scene.debugLayer.isVisible() ? glo.scene.debugLayer.show() : glo.scene.debugLayer.hide();

               break;
            case "F":
            case "f":
            testCol();

               break;
            case "I":
            case "i":
            glo.params.invCol = !glo.params.invCol;
            invCol();

               break;
            case "R":
            case "r":
               gridToCenterMesh();

               break;
            case "T":
            case "t":
               gridToOrigin(); break;
            case "U":
            case "u":
            glo.transCol = !glo.transCol;
            if(glo.params.playWithColors){
               makeColors();
            }
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
               glo.params.modCos = !glo.params.modCos;
            makeColors();

            break;
            case "V":
            case "v":
               glo.camera.alpha = glo.camera.start.alpha;
               glo.camera.beta  = glo.camera.start.beta;
               glo.camera.setPosition(glo.camera.start.pos.clone());
               glo.camera.setTarget(glo.camera.start.target.clone());

            break;
            case "Y":
            case "y":
               updInputsToQuaternion();

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
               glo.meshWithTubes = !glo.meshWithTubes;
               remakeRibbon();

               break;
            case ".":
            glo.meshWithTubes = true;
            glo.tubes.radius /= glo.tubes.coeffRadiusVariation;
            make_ribbon();

               break;
            case "§":
            glo.meshWithTubes = true;
            glo.tubes.radius *= glo.tubes.coeffRadiusVariation;
            make_ribbon();

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






















//
