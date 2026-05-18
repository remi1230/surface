//*****************************************************************************************************//
//*********************************************BABYLON WORD********************************************//
//*****************************************************************************************************//

/**
 * Creates a player with an ArcRotateCamera attached to the scene.
 * Stores the camera reference in {@link glo.camera}.
 * @constructor
 * @param {Game} game - The game instance holding the BabylonJS scene.
 * @param {HTMLCanvasElement} canvas - The rendering canvas for camera input binding.
 */
Player = function(game, canvas) {
  this.scene = game.scene;
  this.canvas = canvas;
  this._initCamera(this.scene, canvas);
  this._initTravellingCamera(this.scene);
};

Player.prototype = {
  /**
   * Initializes a BabylonJS ArcRotateCamera with default orbit parameters,
   * records its starting position/angles, and stores it globally.
   * @param {BABYLON.Scene} scene - The BabylonJS scene.
   * @param {HTMLCanvasElement} canvas - The rendering canvas.
   */
  _initCamera: function(scene, canvas) {
    this.camera = new BABYLON.ArcRotateCamera(
      "Camera",
      Math.PI / 2,
      Math.PI / 2,
      -glo.camPose,
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
    glo.orbitCamera = this.camera;
    glo.cameraTarget = this.camera.getTarget();
  },

  /**
   * Initializes a passive {@link BABYLON.TargetCamera} that hosts the cinematic
   * spiral travelling effect. It accepts no user input — its position is fully
   * driven by {@link updateTravellingCamera} while travelling mode is active.
   * Kept inactive until the user presses `c`.
   * @param {BABYLON.Scene} scene - The BabylonJS scene.
   */
  _initTravellingCamera: function(scene) {
    const cam = new BABYLON.TargetCamera(
      "TravellingCamera",
      this.camera.position.clone(),
      scene
    );
    cam.setTarget(this.camera.getTarget().clone());
    cam.minZ = 0.01;

    this.travCamera = cam;
    glo.travCamera  = cam;
  }
};

/**
 * Toggles the cinematic spiral travelling camera. When entering travelling mode,
 * captures the current orbit pose as the spiral baseline (center = current target,
 * baseRadius = current distance) and detaches user input. Pressing `c` again
 * restores the orbit camera at its previous pose.
 */
function toggleTravelling() {
  if (glo.cameraMode === 'travelling') {
    stopTravelling();
  } else {
    startTravelling();
  }
}

/**
 * Activates the travelling camera: snapshots the orbit pose, swaps the active
 * scene camera, and detaches mouse/keyboard input so user gestures don't fight
 * the animation.
 */
function startTravelling() {
  if (!glo.orbitCamera || !glo.travCamera) return;
  if (glo.cameraMode === 'travelling') return;

  const orbit = glo.orbitCamera;
  const trav  = glo.travCamera;
  const t     = glo.travelling;

  t.center     = orbit.getTarget().clone();
  t.baseRadius = orbit.radius;
  t.startAlpha = orbit.alpha;
  t.startBeta  = orbit.beta;
  t.startTime  = performance.now();

  orbit.detachControl(glo.canvas);
  glo.scene.activeCamera = trav;
  glo.camera     = trav;
  glo.cameraMode = 'travelling';
}

/**
 * Stops the travelling camera and restores user-controlled orbit. The orbit
 * camera retains the pose it had before the travelling started, so the view
 * snaps back to a familiar vantage point.
 */
function stopTravelling() {
  if (glo.cameraMode !== 'travelling') return;

  glo.travCamera.detachControl(glo.canvas);
  glo.scene.activeCamera = glo.orbitCamera;
  glo.orbitCamera.attachControl(glo.canvas, true);
  glo.camera       = glo.orbitCamera;
  glo.cameraTarget = glo.orbitCamera.getTarget();
  glo.cameraMode   = 'orbit';
}

/**
 * Per-frame update for the travelling camera. Computes a spiral path around
 * {@link glo.travelling.center}: continuous longitude rotation, sinusoidal
 * radius breathing (so the camera approaches and recedes), and a gentle beta
 * wobble for a 3D feel. Conversion uses the BabylonJS ArcRotate convention
 * (x = r·cosα·sinβ, y = r·cosβ, z = r·sinα·sinβ).
 */
function updateTravellingCamera() {
  const s = glo.travelling;
  const dt = (performance.now() - s.startTime) / 1000;

  const alpha  = s.startAlpha + dt * s.angSpeed;
  const beta   = s.startBeta  + s.betaAmp * Math.sin(dt * s.betaSpeed);
  const radius = s.baseRadius * (1 + s.radAmpRatio * Math.sin(dt * s.radSpeed));

  const sinB = Math.sin(beta);
  const x = s.center.x + radius * Math.cos(alpha) * sinB;
  const y = s.center.y + radius * Math.cos(beta);
  const z = s.center.z + radius * Math.sin(alpha) * sinB;

  glo.travCamera.position.set(x, y, z);
  glo.travCamera.setTarget(s.center);
}

/**
 * Bootstraps the BabylonJS engine, scene, video capture, player, and render loop.
 * Instantiating this constructor starts the application.
 * @constructor
 * @param {string} canvasId - DOM ID of the canvas element (e.g. "renderCanvas").
 */
Game = function(canvasId) {
  var canvas = getById(canvasId);
  
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
    if (glo.cameraMode === 'travelling') {
      updateTravellingCamera();
      return;
    }
    if (glo.rotateType !== 'none') rotateCamera();
  });
};

Game.prototype = {
  /**
   * Creates and configures the BabylonJS scene with the application background color.
   * @param {BABYLON.Engine} engine - The BabylonJS engine instance.
   * @returns {BABYLON.Scene} The initialized scene.
   */
  _initScene: function(engine) {
    var scene = new BABYLON.Scene(engine);
    scene.clearCachedVertexData();
    scene.cleanCachedTextureBuffer();
    scene.clearColor = glo.backgroundColor;

    glo.scene = scene;

    return scene;
  }
};

/** @type {Game} Application entry point — instantiating starts the engine and render loop. */
g = new Game('renderCanvas');

/**
 * Applies automatic camera rotation around the selected axis each frame.
 * Temporarily zeroes inertia offsets so the programmatic rotation does not
 * interfere with the user's mouse-drag inertia, then restores them.
 */
function rotateCamera() {
    const savedAlpha = glo.camera.inertialAlphaOffset;
    const savedBeta  = glo.camera.inertialBetaOffset;
    glo.camera.inertialAlphaOffset = 0;
    glo.camera.inertialBetaOffset  = 0;

    const dt = glo.engine.getDeltaTime() / 1000; // en secondes
    let speed = glo.rotateSpeed * dt * 60; // normalise pour ~60fps

    const axis = glo.rotateType.current;
    const rotates = axis === 'alpha' || axis === 'beta' || axis === 'teta';

    let finishLoop = false;
    if (glo.video.loopActive && rotates) {
        const newAccum = glo.video.loopRotAccum + speed;
        if (glo.video.loopPendingStop) {
            const target = glo.video.loopRotTarget;
            const reached = speed >= 0 ? newAccum >= target : newAccum <= target;
            if (reached) {
                speed = target - glo.video.loopRotAccum;
                glo.video.loopRotAccum = target;
                finishLoop = true;
            } else {
                glo.video.loopRotAccum = newAccum;
            }
        } else {
            glo.video.loopRotAccum = newAccum;
        }
    }

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

    if (finishLoop) finishLoopRecording();
}