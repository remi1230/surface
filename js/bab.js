//*****************************************************************************************************//
//*********************************************BABYLON WORD********************************************//
//*****************************************************************************************************//
Player = function(game, canvas) {
  this.scene = game.scene;
  this._initCamera(this.scene, canvas);
};

Player.prototype = {
  _initCamera: function(scene, canvas) {
    this.camera = new BABYLON.ArcRotateCamera(
      "Camera",
      Math.PI / 2,
      Math.PI / 2,
      -glo.cam_pose,
      new BABYLON.Vector3.Zero(),
      scene
    );

    this.camera.start = {};

    this.camera.start.pos = new BABYLON.Vector3(this.camera.position.x + 18, this.camera.position.y, this.camera.position.z);

    this.camera.attachControl(canvas, true);
    this.camera.setPosition(new BABYLON.Vector3(this.camera.position.x + 18, this.camera.position.y, this.camera.position.z));
    this.camera.lowerAlphaLimit = null;
    this.camera.upperAlphaLimit = null;
    this.camera.lowerBetaLimit = null;
    this.camera.upperBetaLimit = Math.PI;

    this.camera.start.alpha   = this.camera.alpha;
    this.camera.start.beta    = this.camera.beta;
    this.camera.start.target  = this.camera.getTarget().clone();

    glo.camera = this.camera;
    glo.camera_target = this.camera.getTarget();
  }
};

Arena = function(game) {
  this.game = game;
  var scene = game.scene;
  var light = new BABYLON.HemisphericLight(
    "light1",
    new BABYLON.Vector3(0.3, 0.6, 0),
    scene
  );
  light.intensity = 0.7;

  glo.light = light;
};

Game = function(canvasId) {
  var canvas = document.getElementById(canvasId);
  var engine = new BABYLON.Engine(canvas, true, {
    doNotHandleContextLost: true
  });
  engine.enableOfflineSupport = false;
  glo.engine = engine;
  var _this = this;

  this.scene = this._initScene(engine);

  var _player = new Player(_this, canvas);
  var _arena = new Arena(_this);
  glo.end_loop = false;
  _this.scene.executeWhenReady(function() {
    engine.runRenderLoop(function() {
      if (glo.rotateType != 'none') { rotate_camera(); }
      if (glo.anim_construct_mesh && !glo.end_loop) { glo.ribbon.animConstructMesh(); }
      _this.scene.render();
    });
  });

  window.addEventListener("resize", function() {
    if (engine) {
      engine.resize();
      gui_resize();
    }
  }, false);
};

Game.prototype = {
  _initScene: function(engine) {
    var scene = new BABYLON.Scene(engine);
    scene.clearCachedVertexData();
    scene.cleanCachedTextureBuffer();
    scene.clearColor = glo.backgroundColor;

    glo.scene = scene;

    return scene;
  }
};

g = new Game('renderCanvas');