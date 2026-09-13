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
  initWalkRig(this.scene);
};

/**
 * Returns the active camera's position in world space.
 *
 * `camera.position` is expressed in the parent's frame, so it reads (0,0,0) for the
 * walk camera, which hangs under the walk rig. Colour shaders use `cameraPosition` for
 * lighting and view-dependent effects, so they need the world value.
 * @returns {BABYLON.Vector3} World-space position of the active camera.
 */
function cameraWorldPosition() {
  const cam = glo.scene.activeCamera;
  return cam.parent ? cam.globalPosition : cam.position;
}

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

  // Snapshot the orbit pose as a world-space offset + up axis. Working in world
  // vectors (rather than ArcRotate alpha/beta) keeps the spiral consistent
  // regardless of which upVector the user had set (Y-up vs Z-up forms).
  const offset = orbit.position.subtract(orbit.getTarget());
  t.center        = orbit.getTarget().clone();
  t.initialOffset = offset.clone();
  t.baseRadius    = offset.length();
  t.up            = orbit.upVector.clone();
  t.elapsed       = 0;

  trav.upVector = t.up.clone();

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
 * {@link glo.travelling.center} in a frame defined by the captured upVector,
 * so behaviour is identical whether the user navigated with Y-up or Z-up.
 *
 * Steps each frame, starting from the snapshotted offset vector v₀:
 *   1. Rotate v₀ around `up` by angle α(t) = angSpeed · t — the orbital motion.
 *   2. Scale by (1 + radAmpRatio · sin(radSpeed · t)) — the in/out breathing.
 *   3. Tilt around an axis perpendicular to (up, v) by betaAmp · sin(betaSpeed · t)
 *      — a vertical wobble that turns a flat circle into a true 3D spiral.
 * Final camera position = center + v.
 */
function updateTravellingCamera() {
  const s  = glo.travelling;
  s.elapsed += frameDeltaSeconds();
  const dt = s.elapsed;

  const angle = dt * s.angSpeed;
  const rot   = BABYLON.Quaternion.RotationAxis(s.up, angle);
  const v     = s.initialOffset.clone();
  v.rotateByQuaternionToRef(rot, v);

  const rScale = 1 + s.radAmpRatio * Math.sin(dt * s.radSpeed);
  v.scaleInPlace(rScale);

  if (s.betaAmp !== 0) {
    const perp = BABYLON.Vector3.Cross(s.up, v);
    if (perp.lengthSquared() > 1e-8) {
      perp.normalize();
      const wobble = s.betaAmp * Math.sin(dt * s.betaSpeed);
      const wRot   = BABYLON.Quaternion.RotationAxis(perp, wobble);
      v.rotateByQuaternionToRef(wRot, v);
    }
  }

  glo.travCamera.position.copyFrom(s.center).addInPlace(v);
  glo.travCamera.setTarget(s.center);
}

/**
 * Bootstraps the BabylonJS engine, scene, player, and render loop.
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
  glo.canvas = canvas;
  var _this = this;

  this.scene = this._initScene(engine);

  var _player = new Player(_this, canvas);
  _this.scene.executeWhenReady(function() {
    engine.runRenderLoop(function() {
        _this.scene.render();
    });
  });
  _this.scene.registerBeforeRender(() => {
    if (glo.cameraMode === 'walk') {
      walkUpdate();
      return;
    }
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
 * Seconds the simulation advances by this frame.
 *
 * Outside a take this is the engine's measured frame delta. During a take (see
 * createMeshRecorder in ui.js) every captured frame stands for exactly 1/fps s whatever
 * the wall clock says, and on a frame the recorder holds while the encoder catches up it
 * is 0, so nothing moves in a frame that is not recorded. The rotation, the travelling
 * camera and the walk all step through here, which makes a recording a pure function of
 * its frame index: no measured delta, no dropped or late frame can reach the file.
 * @returns {number} Delta time in seconds.
 */
function frameDeltaSeconds() {
  const take = glo.video.take;
  if (take) return take.stepping ? take.dt : 0;
  return glo.engine.getDeltaTime() / 1000;
}

/**
 * Applies automatic camera rotation around the selected axis each frame.
 * Temporarily zeroes inertia offsets so the programmatic rotation does not
 * interfere with the user's mouse-drag inertia, then restores them.
 *
 * The step is `rotateSpeed` per 1/60 s of simulation time, i.e. exactly `rotateSpeed`
 * per frame in a 60 fps take. A perfect-loop take overrides it with the take's own step,
 * fixed at capture start so that a whole turn spans an exact number of frames.
 */
function rotateCamera() {
    const savedAlpha = glo.camera.inertialAlphaOffset;
    const savedBeta  = glo.camera.inertialBetaOffset;
    glo.camera.inertialAlphaOffset = 0;
    glo.camera.inertialBetaOffset  = 0;

    const take = glo.video.take;
    let speed = glo.rotateSpeed * frameDeltaSeconds() * 60;
    if (take && take.loop) speed = take.stepping ? take.rotStep : 0;

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
