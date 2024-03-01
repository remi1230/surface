//*****************************************************************************************************//
//**********************************************EVENTS*************************************************//
//*****************************************************************************************************//
$( document ).ready(function() {
  add_gui_controls();
  toggle_gui_controls_suit(false);
  toggle_gui_controls_third(false);
  toggleGuiControlsByClass(false, 'fourth');
  toggleGuiControlsByClass(false, 'fifth');
  toggleGuiControlsByClass(false, 'sixth');
  gui_resize();
  $('.modal').modal();
  $('select').formSelect();
  make_curves();
  glo.histo.init();
  special_randomize_colors_app(true);
  startAnim(20, 1);
  initDataModal();
  getPathsInfos();
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
      glo.fullScreenButton.textBlock.text = "↗ SCREEN";
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

//$('#univers_div').keypress(function(e) {
window.addEventListener("keydown", function (e) {
   if(!glo.modalOpen){ 
      var key = e.key;
      if(!e.shiftKey){
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
                  exportModal();

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
               case "&":
               invElemInInput("cos", "sin", false);
               invElemInInput("cu", "su", false);
               invElemInInput("cv", "sv");
               if(glo.cloneSystem){ cloneSystem(); }
               glo.histo.save();

                  break;
               case "é":
               invElemInInput("u", "v");
               if(glo.cloneSystem){ cloneSystem();  }
               glo.histo.save();

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
               case "è":
               slidersAnim('stepU', 0, -1);

                  break;
               case "_":
               slidersAnim('stepU', 0, 1);

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
               switchCoords();

                  break;
               case "t":
               switchEqSphericToCylindrical();

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
                  meshWithTubes();

                  break;
               case "6":
                  glo.vertexsTypes.next();
                  if(glo.normalMode){ drawNormalEquations(); }

                  break;
               case ":":
                  glo.slidersUVOnOneSign.u = !glo.slidersUVOnOneSign.u;

               break;
               case "!":
                  glo.slidersUVOnOneSign.v = !glo.slidersUVOnOneSign.v;

               break;
               case ")":
                  glo.lineSystem = !glo.lineSystem;

               break;
               case "PageUp":
                  glo.firstPoint.y++;
                  if(!glo.normalMode){  make_curves(); }
                  else{
                     glo.fromSlider = true; make_curves(); glo.fromSlider = false; drawNormalEquations();
                  }

               break;
               case "PageDown":
                  glo.firstPoint.y--;
                  if(!glo.normalMode){  make_curves(); }
                  else{
                     glo.fromSlider = true; make_curves(); glo.fromSlider = false; drawNormalEquations();
                  }

               break;
               case "Home":
                  glo.firstPoint = {x: 1, y: 0, z: 0};
                  if(!glo.normalMode){  make_curves(); }
                  else{
                     glo.fromSlider = true; make_curves(); glo.fromSlider = false; drawNormalEquations();
                  }

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
                  updRibbon();

                  break;
               case "4":
                  updRibbon(-1);

                  break;
               case "5":
                  updRibbon(1);

                  break;
               case "6":
                  if(!glo.normalMode){  make_curves(); }
                  else{
                     glo.fromSlider = true; make_curves(); glo.fromSlider = false; drawNormalEquations();
                  }

                  break;
               case "7":
                  glo.angleToUpdateRibbon.x -= PI/8;
                  remakeRibbon();

                  break;
               case "8":
                  glo.angleToUpdateRibbon.x += PI/8;
                  remakeRibbon();

                  break;
               case "0":
                  glo.angleToUpdateRibbon.y -= PI/8;
                  remakeRibbon();

                  break;
               case "9":
                  glo.angleToUpdateRibbon.y += PI/8;
                  remakeRibbon();

                  break;
               case "!":
                  glo.angleToUpdateRibbon.x = 0;
                  glo.angleToUpdateRibbon.y = 0;

                  remakeRibbon();
                  break;
               case "g":
                  toggleDataTable();

                  break;
               case "PageUp":
                  glo.firstPoint.z++;
                  if(!glo.normalMode){  make_curves(); }
                  else{
                     glo.fromSlider = true; make_curves(); glo.fromSlider = false; drawNormalEquations();
                  }

               break;
               case "PageDown":
                  glo.firstPoint.z--;
                  if(!glo.normalMode){  make_curves(); }
                  else{
                     glo.fromSlider = true; make_curves(); glo.fromSlider = false; drawNormalEquations();
                  }

               break;
               case "b":
                  glo.addSymmetry = !glo.addSymmetry;
                  if(!glo.normalMode){  make_curves(); }
                  else{
                     glo.fromSlider = true; make_curves(); glo.fromSlider = false; drawNormalEquations();
                  }

               break;
               case "c":
                  cleanRibbon2();

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
                  glo.symmetrizeOrders.next();
                  remakeRibbon();

               break;
               case "q":
                  window.open(location.href  + "stats/", '_blank');

               break;
               case "k":
                  glo.allControls.getByName('checkerboard').maximum/=2 

                  break;
               case "l":
                  glo.allControls.getByName('checkerboard').maximum*=2 

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
            glo.normalColorMode = !glo.normalColorMode;

               break;
            case "a":
            case "A":
            if(glo.normalMode){
               glo.scaleNorm*=sqrt(2);
               drawNormalEquations();
            }

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
            case "z":
            case "Z":
               glo.noLinkToZero = !glo.noLinkToZero;
               if(!glo.normalMode){ make_curves(); }
               else{ glo.fromSlider = true; make_curves(); glo.fromSlider = false; drawNormalEquations(); }

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
            glo.coordinatesNomrType.next();
            if(glo.normalMode){ drawNormalEquations(); }

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
            colByMid(0.5);

               break;
            case "T":
            case "t":
            colByMid(2);
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
            make_ribbon();

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
               glo.firstPoint.x++;
               if(!glo.normalMode){  make_curves(); }
               else{
                  glo.fromSlider = true; make_curves(); glo.fromSlider = false; drawNormalEquations();
               }

            break;
            case "PageDown":
               glo.firstPoint.x--;
               if(!glo.normalMode){  make_curves(); }
               else{
                  glo.fromSlider = true; make_curves(); glo.fromSlider = false; drawNormalEquations();
               }

            break;
         }
      }
   }
});






















//
