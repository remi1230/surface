//*****************************************************************************************************//
//**********************************************EVENTS*************************************************//
//*****************************************************************************************************//
$( document ).ready(function() {
  add_gui_controls();
  toggle_gui_controls_suit(false);
  toggle_gui_controls_third(false);
  gui_resize();
  $('.modal').modal();
  $('select').formSelect();
  make_curves();
  glo.histo.init();
  special_randomize_colors_app();
  startAnim(20, 1);
});

$("#univers_div").mouseenter(function(){
	$("#univers_div").css('cursor', 'pointer');
});
$("#univers_div").mouseleave(function(){
	$("#univers_div").css('cursor', 'auto');
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

$('#univers_div').keypress(function(e) {
  var key = e.which;
  if(!e.shiftKey){
  	switch (key) {
  		case code_car("g"):
        glo.curve_step.next();

  			break;
  		case code_car("r"):
        reset_curve_step_by_step();

  			break;
  		case code_car("w"):
        glo.anim_construct_mesh = !glo.anim_construct_mesh;

  			break;
  		case code_car("h"):
        randomize_colors_app();

  			break;
  		case code_car("e"):
          exportModal();

  			break;
  		case code_car("p"):
          importModal();

  			break;
  		case code_car("+"):
          glo.camera.radius/=2;

  			break;
  		case code_car("-"):
          glo.camera.radius*=2;

  			break;
  		case code_car("&"):
        invElemInInput("cos", "sin");
        invElemInInput("cu", "su");
        invElemInInput("cv", "sv");
        if(glo.cloneSystem){ cloneSystem(); }
        glo.histo.save();

  			break;
  		case code_car("é"):
        invElemInInput("u", "v");
        if(glo.cloneSystem){ cloneSystem();  }
        glo.histo.save();

  			break;
  		case code_car("7"):
        slidersAnim('u', 0, -0.01);

  			break;
  		case code_car("8"):
        slidersAnim('u', 0, 0.01);

  			break;
  		case code_car("4"):
        slidersAnim('v', 0, -0.01);

  			break;
  		case code_car("5"):
        slidersAnim('v', 0, 0.01);

  			break;
  		case code_car("è"):
        slidersAnim('stepU', 0, -1);

  			break;
  		case code_car("_"):
        slidersAnim('stepU', 0, 1);

  			break;
  		case code_car("ç"):
        slidersAnim('stepV', 0, -1);

  			break;
  		case code_car("à"):
        slidersAnim('stepV', 0, 1);

  			break;
  		case code_car("k"):
        glo.slider_nb_steps_u.maximum/=2;
        glo.slider_nb_steps_v.maximum/=2;

  			break;
  		case code_car("l"):
        glo.slider_nb_steps_u.maximum*=2;
        glo.slider_nb_steps_v.maximum*=2;

  			break;
  		case code_car(";"):
        switchWritingType(false);

  			break;
  		case code_car(":"):
        switchWritingType(true);

  			break;
  		case code_car("x"):
        glo.planeXYvisible = !glo.planeXYvisible;
        showPlane(glo.planeXYvisible, 'xy');

  			break;
  		case code_car("y"):
        glo.planeYZvisible = !glo.planeYZvisible;
        showPlane(glo.planeYZvisible, 'yz');

  			break;
  		case code_car("z"):
        glo.planeXZvisible = !glo.planeXZvisible;
        showPlane(glo.planeXZvisible, 'xz');

  			break;
  		case code_car("s"):
        switchCoords();

  			break;
  		case code_car("t"):
        switchEqSphericToCylindrical();

  			break;
  		case code_car("d"):
        darkTheme();

  			break;
  		case code_car("f"):
        if(glo.ribbonCloneHistoDone){ delete glo.ribbonSaveToClone; glo.ribbonCloneHistoDone = false; }
        cloneSystem();
        glo.cloneToSave = true;
        glo.histo.save();
        glo.cloneToSave = false;

  			break;
  		case code_car("q"):
        if(glo.cloneScale >= 0.2){ cloneScale(-0.1); }

  			break;
  		case code_car("ù"):
        cloneScale(0.1);

  			break;
  		case code_car("'"):
        if(typeof(glo.orientationClone ) == "undefined"){  glo.orientationClone = orientationClone(); }
        glo.orientationClone.next();
        orientClone(glo.cloneAxis);

  			break;
  		case code_car("("):
        saveRibbonToClone();

  			break;
  		case code_car('"'):
        special_randomize_colors_app();

  			break;
  		case code_car('$'):
        makeRndSurface();

  			break;
  		case code_car('*'):
        resetEquationsParamSliders();

  			break;
  		case code_car('a'):
        if(typeof(glo.playWithColMode) == "undefined"){ glo.playWithColMode = playWithColNextMode(); }
        glo.playWithColMode.next();
        if(glo.params.playWithColors){
          makeColors();
        }

  			break;
  		case code_car('b'):
        glo.params.playWithColors = !glo.params.playWithColors;
        glo.params.playWithColors ? makeColors() : make_ribbon();

  			break;
  		case code_car(','):
        reset_camera();

  			break;
  		case code_car('u'):
        glo.params.colors2 = !glo.params.colors2;
        makeColors();

  			break;
  		case code_car('j'):
        glo.params.colorsByRotate = !glo.params.colorsByRotate;
        makeColors();

  			break;
  		case code_car('m'):
        glo.params.colorsAbs = !glo.params.colorsAbs;
        makeColors();

  			break;
      case code_car("n"):
        glo.voronoiMode = !glo.voronoiMode;
        make_ribbon();

        break;
  		case code_car('1'):
        glo.curves.paths[0].shift();
        make_ribbon();

  			break;
  		case code_car('2'):
        glo.params.colorMove = !glo.params.colorMove;
        makeColors();

  			break;
  	}
  }
  else{
    switch (key) {
  		case code_car("w"):
  		case code_car("W"):
        glo.normalMode = !glo.normalMode;
        if(glo.normalMode){ resetInputsRibbonEquations(); drawNormalEquations(); }
        else{ restoreInputsRibbonEquations(); make_curves(); }

  			break;
  		case code_car("C"):
        glo.normalColorMode = !glo.normalColorMode;

  			break;
  		case code_car("a"):
  		case code_car("A"):
        if(glo.normalMode){
          glo.scaleNorm*=sqrt(2);
          drawNormalEquations();
        }

  			break;
  		case code_car("p"):
  		case code_car("P"):
        glo.closeFirstWithLastPath = !glo.closeFirstWithLastPath;
        make_curves();
        make_ribbon();

  			break;
  		case code_car("z"):
  		case code_car("Z"):
        if(glo.normalMode){
          glo.scaleNorm/=sqrt(2);
          drawNormalEquations();
        }

  			break;
  		case code_car("H"):
  		case code_car("h"):
         cameraOnPos({x: 0, y: 0, z: 0});

  			break;
  		case code_car("S"):
  		case code_car("s"):
        glo.normalOnNormalMode = !glo.normalOnNormalMode;

  			break;
  		case code_car("E"):
  		case code_car("e"):
        glo.coordinatesNomrType.next();
        if(glo.normalMode){ drawNormalEquations(); }

  			break;
  		case code_car("D"):
  		case code_car("d"):
        accuade();

  			break;
  		case code_car("F"):
  		case code_car("f"):
        testCol();

  			break;
  		case code_car("I"):
  		case code_car("i"):
        glo.params.invCol = !glo.params.invCol;
        invCol();

  			break;
  		case code_car("R"):
  		case code_car("r"):
        colByMid(0.5);

  			break;
  		case code_car("T"):
  		case code_car("t"):
        colByMid(2);
  		case code_car("U"):
  		case code_car("u"):
        glo.transCol = !glo.transCol;
        if(glo.params.playWithColors){
          makeColors();
        }
        break;
  		case code_car("B"):
  		case code_car("b"):
        glo.wireframe = !glo.wireframe;
        glo.ribbon.material.wireframe = glo.wireframe;

        break;
  		case code_car("L"):
  		case code_car("l"):
        glo.slider_u.maximum*=2;
        glo.slider_v.maximum*=2;

        break;
  		case code_car("K"):
  		case code_car("K"):
        glo.slider_u.maximum/=2;
        glo.slider_v.maximum/=2;

        break;
  		case code_car("O"):
  		case code_car("o"):
        glo.params.modCos = !glo.params.modCos;
        makeColors();

        break;
  		case code_car("V"):
  		case code_car("v"):
        glo.camera.alpha = glo.camera.start.alpha;
        glo.camera.beta  = glo.camera.start.beta;
        glo.camera.setPosition(glo.camera.start.pos.clone());
        glo.camera.setTarget(glo.camera.start.target.clone());

        break;
  		case code_car("Y"):
  		case code_car("y"):
        updInputsToQuaternion();

        break;
  		case code_car("Q"):
  		case code_car("q"):
        firstInputToOthers();

        break;
  		case code_car("N"):
  		case code_car("n"):
        glo.stepByStepFast = !glo.stepByStepFast;

        break;
    }
  }
});






















//
