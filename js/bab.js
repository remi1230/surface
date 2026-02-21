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
    this.camera.wheelPrecision = 32;
    this.camera.inertia        = 0.933;

    this.camera.start.alpha   = this.camera.alpha;
    this.camera.start.beta    = this.camera.beta;
    this.camera.start.target  = this.camera.getTarget().clone();

    glo.camera = this.camera;
    glo.camera_target = this.camera.getTarget();
  }
};

Game = function(canvasId) {
  var canvas = document.getElementById(canvasId);
  
  var engine = new BABYLON.Engine(canvas, true, {
    doNotHandleContextLost: true,
    disableWebGL2Support: false
  });
  
  canvas.height = window.innerHeight;
  engine.resize();
  engine.enableOfflineSupport = false;
  glo.engine = engine;
  var _this = this;

  this.scene = this._initScene(engine);

  glo.video.canvas   = engine.getRenderingCanvas();
  glo.video.stream   = glo.video.canvas.captureStream(60); // 60 fps
  glo.video.recorder = new MediaRecorder(glo.video.stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 8000000
  });

  var _player = new Player(_this, canvas);
  _this.scene.executeWhenReady(function() {
    engine.runRenderLoop(function() {
        _this.scene.render();
    });
  });
  _this.scene.registerBeforeRender(() => {
    if (glo.rotateType !== 'none') rotate_camera();
  });
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

function rotate_camera() {
  if (glo.ribbon) {
    // Sauvegarde l'inertie souris, la neutralise le temps d'appliquer la
    // vitesse de rotation, puis la restaure pour que Babylon.js puisse
    // continuer à la décroître naturellement sans interférer avec la rotation.
    const savedAlpha = glo.camera.inertialAlphaOffset;
    const savedBeta  = glo.camera.inertialBetaOffset;
    glo.camera.inertialAlphaOffset = 0;
    glo.camera.inertialBetaOffset  = 0;

    const dt = glo.engine.getDeltaTime() / 1000; // en secondes
    const speed = glo.rotate_speed * dt * 60; // normalise pour ~60fps
    switch (glo.rotateType.current) {
      case 'alpha':
        glo.camera.alpha += speed;
        break;
      case 'beta':
        glo.camera.beta += speed;
        break;
      case 'teta':
        glo.camera.alpha += speed;
        glo.camera.beta += speed;
        break;
    }

    glo.camera.inertialAlphaOffset = savedAlpha;
    glo.camera.inertialBetaOffset  = savedBeta;
  }
}