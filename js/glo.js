//*****************************************************************************************************//
//**********************************************GLOBAL VAR*********************************************//
//*****************************************************************************************************//

/**
 * Shorthand for document.getElementById.
 * @param {string} id - DOM element ID.
 * @returns {HTMLElement|null}
 */
const getById = function (id) { return document.getElementById(id); };

/**
 * Default color theme used at application startup.
 * Each property maps to a BabylonJS GUI color picker control by name.
 * @type {{pickerColorBackground: BABYLON.Color3, pickerColorButton: BABYLON.Color3, pickerColorMeshBg: BABYLON.Color3}}
 */
const defaultTheme = {
	pickerColorBackground: new BABYLON.Color3(0.1269, 0.1269, 0.1669),
	pickerColorButton: new BABYLON.Color3(0.1, 0.6, 0.6),
	pickerColorMeshBg: new BABYLON.Color3(0.3379, 0.4685, 0.5605)
};

defaultTheme.pickerColorLine = defaultTheme.pickerColorMeshBg.inv();

/**
 * Resets all color picker controls to the default theme values.
 */
defaultTheme.apply = function() {
    for (let themeName in this) {
        if (typeof this[themeName] !== 'function') {
            glo.allControls.getByName(themeName).value = defaultTheme[themeName];
        }
    }
};

/** @type {M.Modal} Materialize modal instance for the shader editor. */
let shaderModalInstance, fragmentShader, fragmentShaderHeader;

/** @type {string[]} Array of fragment shader source code snippets (one per color shader). */
let fragmentShaders = [];

/** @type {string} Compiled normal shader, header, and footer parts. */
let normalShader, normalShaderHeader, normalShaderFooter;
/** @type {string[]} Array of normal shader source code snippets. */
let normalShaders = [];

/** @type {boolean} Whether the canvas is currently in fullscreen mode. */
let isFullscreen = false;

/** @type {number} Running counter of created meshes. */
var meshCount = 0;
/** @type {number} Radius parameter (legacy). */
var r = 1;
/**
 * Global application state object.
 * Holds all runtime configuration, UI references, parametric surface parameters,
 * shader settings, theme definitions, and generator-based state machines.
 * @global
 */
var glo = {
	/** @type {HTMLCanvasElement} Main BabylonJS rendering canvas. */
	canvas: getById('renderCanvas'),
	/** @type {HTMLCanvasElement} Off-screen canvas used for WebGL capability detection. */
	canvasTest: document.createElement('canvas'),
	/**
	 * Surface form catalog and selection management.
	 * @type {Object}
	 */
	formes:{
		/** @type {string[]} Currently selected form [name, coordsType]. */
		selected:['Torus', 'cartesian'],
		/** @type {Object[]} Array of all available form definitions (from forms.js). */
		select: formsToselect,
		/**
		 * Selects a form by name and coordinate system, optionally loading its equations and rendering it.
		 * When {@link draw} is true, populates equation inputs, configures sliders, applies uvToXy conversion
		 * if active, restores or resets lighting, and triggers a mesh rebuild.
		 * @async
		 * @param {string} txt - Form display name (e.g. "Torus", "Sphere").
		 * @param {string} coordsType - Coordinate system ("cartesian", "spheric", "cylindrical").
		 * @param {boolean} [draw=true] - If true, load form equations into inputs and rebuild the mesh.
		 *   Pass false to only mark the form as selected without changing equations or rendering.
		 * @param {{u: number, v: number}|null} [overrideSteps=null] - When provided, use these step counts
		 *   instead of the form defaults (used during JSON import to preserve imported resolution).
		 */
		setFormeSelect: async function(txt, coordsType, draw = true, overrideSteps = null){
			for (const sel of this.select) {
				if(sel.text == txt && sel.typeCoords == coordsType){
					sel.check = true;
					glo.uvCoeff       = sel.uvCoeff || {x: 1, y: 1};
					glo.uvParamsCoeff = sel.uvParamsCoeff || sel.uvCoeff || {x: 1, y: 1};
					if(draw){
						glo.HDstepUV = false;

						var falpha = typeof(sel.alpha) != "undefined" ? falpha = sel.alpha  : falpha = "";
						var fbeta  = typeof(sel.beta)  != "undefined" ? fbeta  = sel.beta   : fbeta  = "";
						var ftheta = typeof(sel.theta) != "undefined" ? ftheta = sel.theta : ftheta = "";

						glo.params.textInputX = sel.fx;
						glo.params.textInputY = sel.fy;
						glo.params.textInputZ = sel.fz;

						if(glo.params.updateRots){
							glo.params.textInputAlpha = falpha;
							glo.params.textInputBeta  = fbeta;
							glo.params.textInputTheta = ftheta;
						}
						glo.params.u = sel.udef;
						glo.params.v = sel.vdef;

						glo.inputX.text = sel.fx;
						glo.inputY.text = sel.fy;
						glo.inputZ.text = sel.fz;
						if(glo.params.updateRots){
							glo.inputAlpha.text = falpha;
							glo.inputBeta.text  = fbeta;
							glo.inputTheta.text = ftheta;
						}

						glo.skipRebuild = true;

						var baseStepsU = overrideSteps ? overrideSteps.u : sel.stepsU;
						var baseStepsV = overrideSteps ? overrideSteps.v : sel.stepsV;

						glo.sliderStepsU.maximum = baseStepsU * 2;
						glo.sliderStepsV.maximum = baseStepsV * 2;
						glo.sliderU.maximum          = sel.udef * 2;
						glo.sliderV.maximum          = sel.vdef * 2;

						if(glo.sliderStepsU.maximum < 256){ glo.sliderStepsU.maximum = 256; }
						if(glo.sliderStepsV.maximum < 256){ glo.sliderStepsV.maximum = 256; }
						if(glo.sliderU.maximum < 2*Math.PI){ glo.sliderU.maximum = 2*Math.PI; }
						if(glo.sliderV.maximum < 2*Math.PI){ glo.sliderV.maximum = 2*Math.PI; }

						glo.params.stepsU = baseStepsU;
						glo.params.stepsV = baseStepsV;

						if(!overrideSteps){
							glo.params.stepsU *= glo.resolutionCoeff;
							glo.params.stepsV *= glo.resolutionCoeff;
							glo.sliderStepsU.maximum*=glo.resolutionCoeff;
						    glo.sliderStepsV.maximum*=glo.resolutionCoeff;
						}

						glo.sliderStepsU.value = glo.params.stepsU; glo.sliderStepsU.startValue = glo.params.stepsU;
						glo.sliderStepsV.value = glo.params.stepsV; glo.sliderStepsV.startValue = glo.params.stepsV;
						glo.sliderU.value = sel.udef; glo.sliderU.startValue = sel.udef;
						glo.sliderV.value = sel.vdef; glo.sliderV.startValue = sel.vdef;
						glo.skipRebuild = false;

						if(glo.params.uvToXy){ uvToXy(false); }

						if(sel.lighting){
							const lighting = sel.lighting;
							if(lighting.pos){
								const lightPos = lighting.pos;
								if(lightPos.x || lightPos.x === 0) glo.allControls.getByName('lightDirectionX').value = lightPos.x;
								if(lightPos.y || lightPos.y === 0) glo.allControls.getByName('lightDirectionY').value = lightPos.y;
								if(lightPos.z || lightPos.z === 0) glo.allControls.getByName('lightDirectionZ').value = lightPos.z;
							}
							if(lighting.intensity){
								const lightIntensity = lighting.intensity;

								while(glo.allControls.getByName('lightIntensity').maximum < lightIntensity){
									glo.allControls.getByName('lightIntensity').maximum *= 2;
								}

								glo.allControls.getByName('lightIntensity').value = lightIntensity;
							}	
							if(lighting.specular){
								const specular = lighting.specular;
								if(specular.intensity || specular.intensity === 0) glo.allControls.getByName('lightSpecularIntensity').value = specular.intensity;
								if(specular.power || specular.power === 0) glo.allControls.getByName('lightSpecularPower').value = specular.power;
							}
						}
						else{
							if(glo.shaders.light.direction.x !== glo.shaders.lightOrigin.direction.x){
								glo.allControls.getByName('lightDirectionX').value = glo.shaders.lightOrigin.direction.x;
							}
							if(glo.shaders.light.direction.y !== glo.shaders.lightOrigin.direction.y){
								glo.allControls.getByName('lightDirectionY').value = glo.shaders.lightOrigin.direction.y;
							}
							if(glo.shaders.light.direction.z !== glo.shaders.lightOrigin.direction.z){
								glo.allControls.getByName('lightDirectionZ').value = glo.shaders.lightOrigin.direction.z;
							}
							if(glo.shaders.light.intensity !== glo.shaders.lightOrigin.intensity){
								const lightIntensity = glo.shaders.lightOrigin.intensity;

								while(glo.allControls.getByName('lightIntensity').maximum < lightIntensity){
									glo.allControls.getByName('lightIntensity').maximum *= 2;
								}
								glo.allControls.getByName('lightIntensity').value = lightIntensity;
							}
							if(glo.shaders.light.specular.intensity !== glo.shaders.lightOrigin.specular.intensity){
								glo.allControls.getByName('lightSpecularIntensity').value = glo.shaders.lightOrigin.specular.intensity;
							}
							if(glo.shaders.light.specular.power !== glo.shaders.lightOrigin.specular.power){
								glo.allControls.getByName('lightSpecularPower').value = glo.shaders.lightOrigin.specular.power;
							}
						}

						await makeCurves();

						viewOnAxis(sel.orient);
					}
				}
				else{ sel.check = false; }
			}
		},
		/**
		 * Selects a form by its index in the catalog array.
		 * @async
		 * @param {number} num - Index into {@link glo.formes.select}.
		 */
		setFormSelectByNum: async function(num){
			var coordsType = glo.coordsType;
			var sel = this.select[num];
			await this.setFormeSelect(sel.text, coordsType);
		},
		/**
		 * Returns the form definition flagged as the startup default.
		 * @returns {Object} Form definition with `start: true`.
		 */
		getStartForm: function(){
			return this.select.find(form => form.start);
		},
		/**
		 * Loads and renders the startup default form.
		 * @async
		 */
		setStartForm: async function() {
			const startForm = this.getStartForm();
			await this.setFormeSelect(startForm.text, startForm.typeCoords);
		},
		/**
		 * Returns the currently selected (checked) form.
		 * @returns {{num: number, numFormInCoorType: number, form: Object}|false}
		 *   Object containing the global index, the index within the current coordinate type,
		 *   and the form definition, or false if none is selected.
		 */
		getFormSelect: function(){
			var coordsType = glo.coordsType;
			var selectsLength = this.select.length;
			var n = 0;
			for(var i = 0; i < selectsLength; i++){
				var sel = this.select[i];
				if(sel.check){ return {num: i, numFormInCoorType: n, form: sel}; }
				else if(sel.typeCoords == coordsType){ n++; }
			}
			return false;
		},
		/**
		 * Looks up a form definition by name and coordinate system.
		 * @param {string} name - Form display name.
		 * @param {string} coordsType - Coordinate system identifier.
		 * @returns {Object|false} The matching form definition, or false if not found.
		 */
		getFormByName: function(name, coordsType){
			var selectsLength = this.select.length;
			for(var i = 0; i < selectsLength; i++){
				var sel = this.select[i];
				if(sel.typeCoords == coordsType && sel.text == name){ return sel; }
			}
			return false;
		},
		/**
		 * Returns the global index of a form identified by its title within the current coordinate type.
		 * @param {string} titleForm - Form display name.
		 * @returns {number|undefined} Global index in {@link glo.formes.select}.
		 */
		getNumFormSelectInCoordTypeByTitle: function(titleForm){
			const coordsType    = glo.coordsType;
			const selectsLength = this.select.length;

			for(var i = 0; i < selectsLength; i++){
				if(this.select[i].typeCoords === coordsType && this.select[i].text === titleForm){ return i; }
			}
		},
		/**
		 * Returns the global index of the first form in the current coordinate type.
		 * @returns {number|undefined}
		 */
		getNumFirstFormInCoordType: function(){
			var coordsType = glo.coordsType;
			var selectsLength = this.select.length;
			for(var i = 0; i < selectsLength; i++){
				if(this.select[i].typeCoords == coordsType){ return i; }
			}
		},
		/**
		 * Returns the global index of the last form in the current coordinate type.
		 * @returns {number}
		 */
		getNumLastFormInCoordType: function(){
			var coordsType = glo.coordsType;
			var selectsLength = this.select.length;
			var inCoordType = false;
			for(var i = 0; i < selectsLength; i++){
				if(this.select[i].typeCoords == coordsType){ var inCoordType = true; }
				else if(inCoordType){ return i-1; }
			}
			return selectsLength - 1;
		},
		/**
		 * Counts the number of forms available in the current coordinate type.
		 * @returns {number}
		 */
		getNbFormsInThisCoordtype: function(){
			var coordsType = glo.coordsType;
			var selectsLength = this.select.length;
			var n = 0;
			for(var i = 0; i < selectsLength; i++){
				if(this.select[i].typeCoords == coordsType){ n++; }
			}
			return n;
		},
	},
	/** @type {number} Index of the currently focused equation input field (0-based cycle through X/Y/Z/Alpha/Beta). */
	inputsEquationsIndex: 0,
	/** @type {{x: number, y: number}} UV domain scaling coefficients applied to the mesh grid. */
	uvCoeff: {x: 1, y: 1},
	/** @type {{x: number, y: number}} UV domain scaling coefficients applied to slider parameters. */
	uvParamsCoeff: {x: 1, y: 1},
	/** @type {Array} Grid of GUI controls for the panel layout. */
	controlsGrid: [],
	/**
	 * Ordered array of regex substitution rules that transform compact math notation
	 * (e.g. "2cucv") into standard JavaScript math expressions (e.g. "2*cos(u)*cos(v)").
	 * Each entry has an `exp` (RegExp) and `upd` (replacement string).
	 * Order matters: earlier rules may produce tokens consumed by later ones.
	 * @type {{exp: RegExp, upd: string}[]}
	 */
	regs: [
		{ exp: /\s/g, upd: "" },
		{ exp: /(.+)ù(.+)/g, upd: "$1*3mct*$2" },
		{ exp: /(.+)ù/g, upd: "$1*3mct" },
		{ exp: /ù(.+)/g, upd: "3mct*$1" },
		{ exp: /ù/g, upd: "3mct" },
		{ exp: /(?<![cs])a(?![\(bs])/g, upd: "a()" },
		{ exp: /b(?![\(s])/g, upd: "b()" },
		{ exp: /(?<![cp])o(?![\(])/g, upd: "o()" },
		{ exp: /c([^*\(R\)]*)R/g, upd: "cos($1R)" },
		{ exp: /s([^*\(R\)]*)R/g, upd: "sin($1R)" },
		{ exp: /c([^*\(X\)]*)X/g, upd: "cos($1X)" },
		{ exp: /s([^*\(X\)]*)X/g, upd: "sin($1X)" },
		{ exp: /c([^*\(Y\)]*)Y/g, upd: "cos($1Y)" },
		{ exp: /s([^*\(Y\)]*)Y/g, upd: "sin($1Y)" },
		{ exp: /R/g, upd: "h(x,y,z)" },
		{ exp: /m(?!od|\()/g, upd: "m()" },
		{ exp: /cudv|cvdu/g, upd: "cos(u/v)" },
		{ exp: /cufv|cvfu/g, upd: "cos(uv)" },
		{ exp: /sudv|svdu/g, upd: "sin(u/v)" },
		{ exp: /sufv|svfu/g, upd: "sin(u*v)" },
		{ exp: /cupv|cvpu/g, upd: "cos(u+v)" },
		{ exp: /cumv/g, upd: "cos(u-v)" },
		{ exp: /cvmu/g, upd: "cos(v-u)" },
		{ exp: /supv|svpu/g, upd: "sin(u+v)" },
		{ exp: /sumv/g, upd: "sin(u-v)" },
		{ exp: /svmu/g, upd: "sin(v-u)" },
		{ exp: /c([^u\(vw]*)u/g, upd: "cos($1u)" },
		{ exp: /c([^v\(uw]*)v/g, upd: "cos($1v)" },
		{ exp: /c([^t\(auvp]*)t/g, upd: "cos($1t)" },
		{ exp: /ca([^t\(auvp]*)t/g, upd: "(0.5*cos($1t)+0.5)" },
		{ exp: /sa([^t\(auvp]*)t/g, upd: "(0.5*sin($1t)+0.5)" },
		{ exp: /s([^u\(vw]*)u/g, upd: "sin($1u)" },
		{ exp: /s([^v\(uw]*)v/g, upd: "sin($1v)" },
		{ exp: /s([^t\(uv]*)t/g, upd: "sin($1t)" },
		{ exp: /c([^*\(v]*)O/g, upd: "cos($1O)" },
		{ exp: /s([^*\(v]*)O/g, upd: "sin($1O)" },
		{ exp: /c([^x\(]*)x/g, upd: "cos($1x)" },
		{ exp: /c([^y\(]*)y/g, upd: "cos($1y)" },
		{ exp: /c([^z\(]*)z/g, upd: "cos($1z)" },
		{ exp: /s([^x\(]*)x/g, upd: "sin($1x)" },
		{ exp: /s([^y\(]*)y/g, upd: "sin($1y)" },
		{ exp: /s([^z\(]*)z/g, upd: "sin($1z)" },
		{ exp: /²/g, upd: "**2" },
		{ exp: /³/g, upd: "**3" },
		{ exp: /uu([^,%*+-/)])/g, upd: "uu*$1" },
		{ exp: /vv([^,%*+-/)])/g, upd: "vv*$1" },
		{ exp: /u([^,%*+-/)])/g, upd: "u*$1" },
		{ exp: /v([^,%*+-/)])/g, upd: "v*$1" },
		{ exp: /(?<!cpo)w([^\(),%*+\-\/)])/g, upd: "w*$1" },
		{ exp: /\$N([^,%*+-/)])/g, upd: "$N*$1" },
		{ exp: /\$P([^,%*+-/)])/g, upd: "$P*$1" },
		{ exp: /x([^,%*+-/NPT)])/g, upd: "x*$1" },
		{ exp: /y([^,%*+-/NPT)])/g, upd: "y*$1" },
		{ exp: /z([^,%*+-/NPT)])/g, upd: "z*$1" },
		{ exp: /n([^,%*+-/d)])/g, upd: "n*$1" },
		{ exp: /(?<!s)i([^,%*+\-\/)])/g, upd: "i*$1" },
		{ exp: /j([^,%*+-/)])/g, upd: "j*$1" },
		{ exp: /xN([^,%*+-/)])/g, upd: "xN*$1" },
		{ exp: /yN([^,%*+-/)])/g, upd: "yN*$1" },
		{ exp: /zN([^,%*+-/)])/g, upd: "zN*$1" },
		{ exp: /pi([^,%*+-/)])/g, upd: "pi*$1" },
		{ exp: /ep([^,%*+-/)])/g, upd: "ep*$1" },
		{ exp: /A([^,%*+-/)])/g, upd: "A*$1" },
		{ exp: /B([^,%*+-/)])/g, upd: "B*$1" },
		{ exp: /C([^,%*+-/o)])/g, upd: "C*$1" },
		{ exp: /D([^,%*+-/)])/g, upd: "D*$1" },
		{ exp: /(?<!mo)d([^,%*+-/)])/g, upd: "d*$1" },
		{ exp: /E([^,%*+-/)])/g, upd: "E*$1" },
		{ exp: /F([^,%*+-/)])/g, upd: "F*$1" },
		{ exp: /G([^,%*+-/)])/g, upd: "G*$1" },
		{ exp: /H([^,%*+-/)])/g, upd: "H*$1" },
		{ exp: /I([^,%*+-/)])/g, upd: "I*$1" },
		{ exp: /J([^,%*+-/)])/g, upd: "J*$1" },
		{ exp: /K([^,%*+-/)])/g, upd: "K*$1" },
		{ exp: /k([^,%*+-/)])/g, upd: "k*$1" },
		{ exp: /L([^,%*+-/)])/g, upd: "L*$1" },
		{ exp: /M([^,%*+-/)])/g, upd: "M*$1" },
		{ exp: /X([^,%*+-/)])/g, upd: "X*$1" },
		{ exp: /Y([^,%*+-/)])/g, upd: "Y*$1" },
		{ exp: /S([^,%*+-/\())])/g, upd: "S($1)" },
		{ exp: /p([^,%*+-/)])/g, upd: "p*$1" },
		{ exp: /(?<!fac)t([^,%*+\-/)])/g, upd: "t*$1" },
		{ exp: /O([^,%*+-/)])/g, upd: "O*$1" },
		{ exp: /T([^,%*+-/)])/g, upd: "T*$1" },
		{ exp: /e([^,%*+-/)pi])/g, upd: "e*$1" },
		{ exp: /Q([^,%*+-/)])/g, upd: "Q*$1" },
		{ exp: /Z([^,%*+-/)])/g, upd: "Z*$1" },
		{ exp: /\)([^,%*+-/)'])/g, upd: ")*$1" },
		{ exp: /(\d+)([^,%*+-/.\d)])/g, upd: "$1*$2" },
		{ exp: /(?<!cr)l/g, upd: "log" },
		{ exp: /sin\*/g, upd: "sin" },
		{ exp: /tan\*/g, upd: "tan" },
		{ exp: /t\*an/g, upd: "tan" },
		{ exp: /tan\*\(/g, upd: "tan(" },
		{ exp: /sign\*/g, upd: "sign" },
		{ exp: /p\*o/g, upd: "po" },
		{ exp: /cp\*/g, upd: "cp" },
		{ exp: /p\*c/g, upd: "pc" },
		{ exp: /e\*x/g, upd: "ex" },
		{ exp: /ex\*/g, upd: "ex" },
		{ exp: /exp\*/g, upd: "exp" },
		{ exp: /p\*i/g, upd: "pi" },
		{ exp: /ep\*i/g, upd: "e*pi" },
		{ exp: /e\*p/g, upd: "ep" },
		{ exp: /m\(\)\*o\(\)\*d/g, upd: "mod" },
		{ exp: /mod\*\(/g, upd: "mod(" },
		{ exp: /\(\*/g, upd: "(" },
		{ exp: /\)\*\)/g, upd: "))" },
		{ exp: /\*=/g, upd: "=" },
		{ exp: /\*</g, upd: "<" },
		{ exp: /ce\*\(/g, upd: "ce(" },
		{ exp: /se\*\(/g, upd: "se(" },
		{ exp: /fra\(\)\*cos\(t\)\*\(/g, upd: "fract(" },
		{ exp: /flogo\(\)\*o\(\)\*r/g, upd: "floor" },
		{ exp: /t\*a\(\)\*n\*\(/g, upd: "tan(" },
		{ exp: /t\*a\(\)\*n\*h\(/g, upd: "tanh(" },
	],
	/** @type {string} Active coordinate system ("cartesian", "spheric", or "cylindrical"). */
	coordsType: 'cartesian',
	/**
	 * Generator that cycles through available coordinate systems in order.
	 * Call `.next()` to advance to the next coordinate type and update {@link glo.coordsType}.
	 * @yields {string} The new coordinate system name.
	 */
	coordinatesType: function* (){
		const coordinates = ['spheric', 'cylindrical', 'cartesian'];
		while (true) {
			for (const coord of coordinates) {
				this.coordsType = coord;
				yield coord;
			}
		}
	},
	/** @type {string} Current axis order used for symmetry operations (e.g. "xyz", "zyx"). */
	symmetrizeOrder: 'xyz',
	/**
	 * Generator that cycles through all six axis permutations for symmetry.
	 * @yields {string} The new axis order (e.g. "xzy", "yxz").
	 */
	symmetrizeOrders: function* (){
		const symetrizeOrds = ['xzy', 'yxz', 'yzx', 'zxy', 'zyx', 'xyz'];
		while (true) {
			for (const symetrizeOrd of symetrizeOrds) {
				this.symmetrizeOrder = symetrizeOrd;
				yield symetrizeOrd;
			}
		}
	},
	/** @type {string} Currently active clipping plane ("none", "x", "y", or "z"). */
	planSelect: 'none',
	/**
	 * Generator that cycles through clipping plane selections.
	 * @yields {string} The new plane axis or "none".
	 */
	planSelects: function* (){
	  var index = 0;
	  var tab = ['none', 'x', 'y', 'z'];
	  while(true){
			index++;
			if(index == tab.length){ index = 0; }
			this.planSelect = tab[index];
	    yield tab[index];
	  }
	},
	/** @type {string} CSS class name of the currently visible right-side GUI panel. */
	guiSelect: 'fourth',
	/**
	 * Generator that cycles through right-side GUI panel tabs.
	 * @yields {string} CSS class name of the newly active panel.
	 */
	switchGuiSelect: function* (){
	  var index = 0;
	  var tab = ['fourth', 'seventh', 'eighth', 'sixth', 'onlyMainGui', 'second', 'eleventh'];
	  while(true){
			index++;
			if(index == tab.length){ index = 0; }
			this.guiSelect = tab[index];
	    yield tab[index];
	  }
	},
	/**
	 * Generator that cycles through automatic rotation modes (alpha, beta, theta, none).
	 * @yields {{current: string, next: string}} Current and upcoming rotation axis.
	 */
	rotateTypeGen: function* (){
		const rotType = [
			{current: 'alpha', next: 'beta'},
			{current: 'beta', next: 'teta'},
			{current: 'teta', next: 'none'},
			{current: 'none', next: 'alpha'},
		];
		while (true) {
			for (const rot of rotType) {
				this.rotateType = rot;
				yield rot;
			}
		}
	},
	/** @type {number} Index of the currently active fragment shader in {@link fragmentShaders}. */
	numShaderSelect: 0,
	/**
	 * Generator that cycles forward through available fragment shaders.
	 * @yields {number} The new shader index.
	 */
	numShaderMove: function* (){
	  var index = 0;
	  var tab = fragmentShaders;
	  while(true){
			index++;
			if(index == tab.length){ index = 0; }
			this.numShaderSelect = index;
	    yield index;
	  }
	},
	/** @type {number} Initial camera distance from the origin. */
	camPose: 60,
	/** @type {{u: boolean, v: boolean}} Whether each UV slider is restricted to positive values only. */
	slidersUVOnOneSign: {u: false, v: false},
	/** @type {BroadcastChannel} Cross-tab communication channel for mesh synchronization. */
	meshChannel: new BroadcastChannel('mesh_channel'),
	/**
	 * Serializable surface parameters. This object is exported/imported as JSON and
	 * drives the entire parametric surface computation. It stores equation text,
	 * slider values (u, v, steps, A-M), symmetry flags, blending, deformation,
	 * mesh transformations, and display options.
	 * @type {Object}
	 */
	params:{
		u: PI,
		v: PI,
		stepsU: 132,
		stepsV: 132,
		A: 0,
		B: 0,
		C: 0,
		D: 0,
		E: 0,
		F: 0,
		G: 1,
		H: 1,
		I: 1,
		J: 1,
		K: 1,
		L: 1,
		M: 64,
		textInputX: "u",
		textInputY: "u*sin(v)",
		textInputZ: "u*cos(v)*sin(u)",
		textInputAlpha: "",
		textInputBeta: "",
		textInputTheta: "",
		textInputEvalX: "u",
		textInputEvalY: "v",
		symmetrizeX: 0,
		symmetrizeY: 0,
		symmetrizeZ: 0,
		symmetrizeAngle: PI,
		checkerboard: 0,
		checkerboardNbSteps: 2,
		blender: {
			u:{
				x: 0, y: 0, z: 0,
			},
			O:{
				x: 0, y: 0, z: 0,
			},
		},
		functionIt:{
			norm:{
				x:  0,
				nx: 0.3,
				y:  0,
				ny: 0.3,
				z:  0,
				nz: 0.3,
			}
		},
		/**
		 * Post-computation mesh transformations (scaling, rotation, position, central symmetry).
		 * Values are cumulative offsets applied after the parametric surface is built.
		 * @type {Object}
		 */
		meshTransformations:{
			scaling:{
				x: 0, y:0, z: 0
			},
			rotation:{
				x: 0, y:0, z: 0
			},
			position:{
				x: 0, y:0, z: 0
			},
			cSymmetry:{
				x: 0, y:0, z: 0
			},
			/**
			 * Applies all non-zero transformations (except cSymmetry) by calling
			 * {@link transformMesh} for each axis.
			 */
			run: function() {
				for(let prop in this){
					if(typeof this[prop] === 'object' && prop !== 'cSymmetry'){
						for(let sprop in this[prop]){
							const val = this[prop][sprop];

							if(val){ transformMesh(prop, sprop, val); }
						}
					}
				}
			},
		},
		gridScaleValue: 5,
		gridScaleValueOrigin: 4,
		updateRots: true,
	},
	/**
	 * BabylonJS GUI styling constants for headers, sliders, inputs, radio buttons, and buttons.
	 * @type {Object}
	 */
	theme:{
		header:{
			title:{
				color: '#e6ebf6',
			},
			text:{
				color: '#dce3f2',
			},
		},
		slider:{
			height        : '16px',
			color         : 'grey',
			background    : '#aaa',
			thumbColor    : '#aaa',
			borderColor   : '#333',
			isThumbCircle : true,
			thumbWidth    : '24px',
		},
		input:{
			onFocus:{
				color      : '#f5f0df',
				background : '#aaa',
			},
			onBlur:{
				color      : '#2b0c82',
				background : '#aaa',
			}
		},
		radio:{
			text:{
				color : '#dce3f2',
			},
			button:{
				width      : '9px',
				height     : '9px',
				background : '#41a69a',
				color      : '#d99a85',
			},
		},
		button: {
			height: 25,
		},
	},
	/**
	 * Application color theme catalog and selection logic.
	 * Contains a list of named themes, each providing four BABYLON.Color3 values
	 * (background, button, mesh background, line), plus methods to cycle and apply them.
	 * @type {Object}
	 */
	uiThemes: {
		/** @type {number} Index of the currently active theme. */
		themeSelectIndex: 0,
		/** @type {{name: string, colors: Object}[]} Available theme definitions. */
		themes:[
			{name: "Default", colors: defaultTheme},
			{name: "Redwine", colors: 
				{
					pickerColorBackground: new BABYLON.Color3(0.2092, 0.0524, 0.1147),
					pickerColorButton: new BABYLON.Color3(0.8173, 0.8802, 0.8497),
					pickerColorMeshBg: new BABYLON.Color3(0.7908, 0.9476, 0.8853),
					pickerColorLine: new BABYLON.Color3(0.2092, 0.0524, 0.1147),
				}
			},
			{name: "Darkwood", colors: 
				{
					pickerColorBackground: new BABYLON.Color3(0.1704, 0.1415, 0.1106),
					pickerColorButton: new BABYLON.Color3(0.8057, 0.7967, 0.7474),
					pickerColorMeshBg: new BABYLON.Color3(0.8296, 0.8584, 0.8894),
					pickerColorLine: new BABYLON.Color3(0.1704, 0.1415, 0.1106),
				}
			},
			{name: "Army", colors: 
				{
					pickerColorBackground: new BABYLON.Color3(0.1269, 0.1269, 0.1616),
					pickerColorButton: new BABYLON.Color3(0.3262, 0.5246, 0.5246),
					pickerColorMeshBg: new BABYLON.Color3(0.1321, 0.1358, 0.176),
					pickerColorLine: new BABYLON.Color3(0.4996, 0.3091, 0),
				}
			},
			{name: "Makeup", colors: 
				{
					pickerColorBackground: new BABYLON.Color3(0.5103, 0.9105, 0.7561),
					pickerColorButton: new BABYLON.Color3(0.7648, 0.1676, 0.4823),
					pickerColorMeshBg: new BABYLON.Color3(0.2531, 0.1416, 0.8328),
					pickerColorLine: new BABYLON.Color3(0.4319, 0.4239, 0.2233),
				}
			},
			{name: "Indigo", colors: 
				{
					pickerColorBackground: new BABYLON.Color3(0.1321, 0.1421, 0.2281),
					pickerColorButton: new BABYLON.Color3(0.7801, 0.8860, 0.7704),
					pickerColorMeshBg: new BABYLON.Color3(0.8678, 0.8579, 0.7719),
					pickerColorLine: new BABYLON.Color3(0.1321, 0.1421, 0.2281),
				}
			},
			{name: "Bluesky", colors: 
				{
					pickerColorBackground: new BABYLON.Color3(0.7319, 0.8057, 0.7784),
					pickerColorButton: new BABYLON.Color3(0.098, 0.5686, 0.5686),
					pickerColorMeshBg: new BABYLON.Color3(0.7782, 0.8, 0.7),
					pickerColorLine: new BABYLON.Color3(0.1, 0.1, 0.133),
				}
			},
			{name: "Vermillon", colors: 
				{
					pickerColorBackground: new BABYLON.Color3(0.885, 0.2556, 0),
					pickerColorButton: new BABYLON.Color3(0.7051, 0.7564, 0.7931),
					pickerColorMeshBg: new BABYLON.Color3(0.0716, 0.2165, 0.3661),
					pickerColorLine: new BABYLON.Color3(0.4332, 0.3575, 0.3268),
				}
			},
			{name: "Gray", colors: 
				{
					pickerColorBackground: new BABYLON.Color3(0.7619, 0.7639, 0.7626),
					pickerColorButton: new BABYLON.Color3(0.246, 0.3749, 0.3932),
					pickerColorMeshBg: new BABYLON.Color3(0.2381, 0.2361, 0.2374),
					pickerColorLine: new BABYLON.Color3(0.7619, 0.7639, 0.7626),
				}
			},
			{name: "Mint", colors: 
				{
					pickerColorBackground: new BABYLON.Color3(0.1872, 0.2047, 0.2728),
					pickerColorButton: new BABYLON.Color3(0.6421, 0.8191, 0.7335),
					pickerColorMeshBg: new BABYLON.Color3(0.3364, 0.8608, 0.7901),
					pickerColorLine: new BABYLON.Color3(0.3446, 0.3591, 0.4154),
				}
			},
			{name: "SweetMint", colors: 
				{
					pickerColorBackground: new BABYLON.Color3(0.2515, 0.3574, 0.3585),
					pickerColorButton: new BABYLON.Color3(0.6885, 0.7041, 0.9234),
					pickerColorMeshBg: new BABYLON.Color3(0.9377, 0.4685, 0.4943),
					pickerColorLine: new BABYLON.Color3(0.4151, 0.4941, 0.4949),
				}
			},
			{name: "Bisk", colors: 
				{
					pickerColorBackground: new BABYLON.Color3(0.8298, 0.79, 0.7502),
					pickerColorButton: new BABYLON.Color3(0.2555, 0.2305, 0.2194),
					pickerColorMeshBg: new BABYLON.Color3(0.1702, 0.21, 0.2498),
					pickerColorLine: new BABYLON.Color3(0.8298, 0.79, 0.7502),
				}
			},
			{name: "Pink", colors: 
				{
					pickerColorBackground: new BABYLON.Color3(0.851, 0.7103, 0.679),
					pickerColorButton: new BABYLON.Color3(0.3038, 0.1202, 0.3044),
					pickerColorMeshBg: new BABYLON.Color3(0.149, 0.2897, 0.321),
					pickerColorLine: new BABYLON.Color3(0.851, 0.7103, 0.679),
				}
			},
			{name: "LightPink", colors: 
				{
					pickerColorBackground: new BABYLON.Color3(0.8345, 0.7029, 0.6755),
					pickerColorButton: new BABYLON.Color3(0.9002, 0.6681, 0.6681),
					pickerColorMeshBg: new BABYLON.Color3(0.11, 0.5095, 0.4574),
					pickerColorLine: new BABYLON.Color3(0.6691, 0.563, 0.5409),
				}
			},
			{name: "LightGreen", colors: 
				{
					pickerColorBackground: new BABYLON.Color3(0.6386, 0.766, 0.6193),
					pickerColorButton: new BABYLON.Color3(0.3673, 0.111, 0.1532),
					pickerColorMeshBg: new BABYLON.Color3(0.3614, 0.234, 0.3807),
					pickerColorLine: new BABYLON.Color3(0.6386, 0.766, 0.6193),
				}
			},
			{name: "Golf", colors: 
				{
					pickerColorBackground: new BABYLON.Color3(0, 0.183, 0.1454),
					pickerColorButton: new BABYLON.Color3(0.2935, 0.3149, 0.3128),
					pickerColorMeshBg: new BABYLON.Color3(0.9015, 0.8019, 0.7661),
					pickerColorLine: new BABYLON.Color3(0.1846, 0.2241, 0.2349),
				}
			},
			{name: "Land", colors: 
				{
					pickerColorBackground: new BABYLON.Color3(0.3436, 0.1748, 0.0452),
					pickerColorButton: new BABYLON.Color3(0.6304, 0.7189, 0.4101),
					pickerColorMeshBg: new BABYLON.Color3(0.1338, 0.0612, 0),
					pickerColorLine: new BABYLON.Color3(0.3589, 0.2979, 0.2511),
				}
			},
			{name: "Sienna", colors: 
				{
					pickerColorBackground: new BABYLON.Color3(0.1073, 0.0527, 0.0573),
					pickerColorButton: new BABYLON.Color3(0.7842, 0.5451, 0.2274),
					pickerColorMeshBg: new BABYLON.Color3(0.4258, 0.665, 0.5812),
					pickerColorLine: new BABYLON.Color3(0.2692, 0.1908, 0.1974),
				}
			},
			{name: "Black&White", colors: 
				{
					pickerColorBackground: new BABYLON.Color3(1, 1, 1),
					pickerColorButton: new BABYLON.Color3(0, 0, 0),
					pickerColorMeshBg: new BABYLON.Color3(0, 0, 0),
					pickerColorLine: new BABYLON.Color3(1, 1, 1),
				}
			},
			{name: "White&Black", colors: 
				{
					pickerColorBackground: new BABYLON.Color3(0, 0, 0),
					pickerColorButton: new BABYLON.Color3(1, 1, 1),
					pickerColorMeshBg: new BABYLON.Color3(1, 1, 1),
					pickerColorLine: new BABYLON.Color3(0, 0, 0),
				}
			},
		],
		/** @type {string[]} Suffix names matching color picker control IDs (e.g. "pickerColorBackground"). */
		pickerColorsEndNames: ['Background', 'Button', 'MeshBg', 'Line'],
		/**
		 * Returns the currently active theme definition.
		 * @returns {{name: string, colors: Object}}
		 */
		getCurrentTheme: function(){ return this.themes[this.themeSelectIndex]; },
		/**
		 * Advances to the next (or previous) theme and returns it.
		 * @param {boolean} [next=true] - If true, moves forward; if false, moves backward.
		 * @returns {{name: string, colors: Object}}
		 */
		getNextTheme: function(next = true) {
			const length = this.themes.length;

			if (next) {
				this.themeSelectIndex = (this.themeSelectIndex + 1) % length;
			} else {
				this.themeSelectIndex = (this.themeSelectIndex - 1 + length) % length;
			}

			return this.getCurrentTheme();
		},
		/**
		 * Applies a theme's colors to all color picker controls.
		 * @param {Object} theme - Color map keyed by "pickerColor" + suffix.
		 */
		applyTheme: function(theme){
			this.pickerColorsEndNames.forEach(pickerColorEndName => {
				glo.allControls.getByName('pickerColor' + pickerColorEndName).value = theme['pickerColor' + pickerColorEndName];
			});
		},
		/**
		 * Cycles to the next (or previous) theme, applies it, and returns the theme name.
		 * Resets the UI style when cycling back to the default theme.
		 * @param {boolean} [next=true] - Direction of cycling.
		 * @returns {string} Name of the newly applied theme.
		 */
		activateNextTheme: function(next = true) {
			const themeSelect       = this.getNextTheme(next);
			const themeSelectColors = themeSelect.colors;

			this.applyTheme(themeSelectColors);

			if(themeSelect.name === 'Default'){
				intiColorUI();
      			styleUI(0);
			}

			return themeSelect.name;
		},
	},
	/**
	 * GPU shader runtime state: uniform parameters, user variables (P-U),
	 * light configuration, and color adjustments.
	 * @type {Object}
	 */
	shaders: {
		/** @type {Object} Shader uniform flags (inversion, lighting toggle, active shader index). */
		params:{
			invcol: 0,
			islight: 1,
			numshader: 0,
		},
		uservars: {
			P: 64,
			Q: 64,
			S: 12,
			T: 0,
			U: 2,
		},
		light:{
			direction: {x: 5, y: 5, z: 5},
			intensity: 60,
			radius: 100.0,
			specular: {power: 1.75, intensity: 4.0},
		},
		lightOrigin:{
			direction: {x: 5, y: 5, z: 5},
			intensity: 60,
			radius: 100.0,
			specular: {power: 1.75, intensity: 4.0},
		},
		colors:{
			toAdd:{r: 0, g: 0, b: 0},
			tint: 1,
		}
	},
	/** @type {Object} Video recording state (canvas, stream, MediaRecorder, chunks). */
	video:{
		canvas: null,
		stream: null,
		recorder: null,
		meshRecorder: null,
		chunks: [],
		recording: false,
	},
	/** @type {Object} Optional shader feature toggles (opt1, opt2, opt3). */
	shaderOpt: {
		opt1: false,
		opt2: false,
		opt3: false,
	},
	timeCoeff: 0.001,
	shaderMaterial: true,
    shaderColor:true,
	editorWindow: getById('shaderEditor'),
	editorWindowNormal: getById('shaderEditorNormal'),
	editorWindowGeometry: getById('shaderEditorGeometry'),
	editor: null,
	editorNormal: null,
	editorNormalIsOpened: false,
	numNormalShaderSelect: 0,
	videoBoxRange: 1.414,
	bgActivedButtons: ['updateRots'],
	centerSymmetry: {x: 0, y: 0, z: 0},
	rotateSpeed: 1/450 * PI,
	rotateType: 'none',
	axisSize: 5,
	planSize: 5,
	scaleNorm: 1,
	deformationEnabled: false,
	buttonBottomSize: 90,
	buttonBottomHeight: 30,
	buttonBottomPaddingLeft: 12,
	panelBottomButtonTop: 44.25,
	mainTopShift: 6.66,
	shiftLineDim: 0.33,
	shiftRadios: 0.88,
	resolutionCoeff: 4,
	buttonsColor: "#e1cdb7",
	labelGridColor: "white",
	buttonsRadius: 6.33,
	buttonsFontsize: "16px",
	diffuseColor: defaultTheme.pickerColorMeshBg,
	emissiveColor: defaultTheme.pickerColorMeshBg,
	backgroundColor: defaultTheme.pickerColorBackground,
	lineColor: defaultTheme.pickerColorLine,
	colorLineGrid: new BABYLON.Color3(0, 0, 0),
	randomizeColorLightLevel: 5,
	firstPoint: new BABYLON.Vector3(1, 0, 0),
	pickersSize: 107,
	fullScreen: false,
	skipRebuild: false,
	guiVisible: true,
	guiSuitVisible: false,
	axisVisible: false,
	gridVisible: false,
	firstAxisVisible: true,
	firstGridVisible: true,
	firstRadio: true,
	negatif: true,
	planesVisible: false,
	viewXpos: true,
	viewYpos: true,
	viewZpos: true,
	wireframe: false,
	addSymmetry: true,
	pathsInfos: {u: 0, v: 0},
	radiosFormes: [],
	rightPanelsClasses: ['fourth', 'seventh', 'eighth', 'sixth', 'onlyMainGui', 'second', 'eleventh'],
	controlConfig:{
		background: '#199191',
		backgroundActived: '#196969',
	},
};

/** @type {WebGLRenderingContext|WebGL2RenderingContext} WebGL context used for capability detection. */
glo.gl = glo.canvasTest.getContext('webgl2') || glo.canvasTest.getContext('webgl');

/**
 * Handles incoming messages from other tabs via BroadcastChannel.
 * Currently supports the "setRotateType" action to synchronize rotation mode.
 * @param {MessageEvent} event - Message event with `data.action` and `data.rotType`.
 */
glo.meshChannel.onmessage = (event) => {
	const { action, rotType } = event.data;

	if (action === 'setRotateType') {
        glo.rotateType = rotType;
    }
};

/**
 * Finds a form radio button entry by its name.
 * @param {string} name - Radio button name (e.g. "Radio-Torus").
 * @returns {Object|false} The matching radio entry, or false.
 */
glo.radiosFormes.getByName = function (name){
	return this.find(elem => elem?.button?.name === name) ?? false;
};

/**
 * Returns the currently checked form radio button entry.
 * @returns {Object|false} The checked radio entry, or false.
 */
glo.radiosFormes.getCheck = function (){
	return this.find(elem => elem?.button?.isChecked) ?? false;
};

/**
 * Checks a radio button by name and unchecks all others.
 * @param {string} name - Radio button name to check.
 * @returns {Object|false} The newly checked entry, or false if not found.
 */
glo.radiosFormes.setCheckByName = function (name){
	var found = false;
	this.forEach(elem => {
		if(!elem) return;
		if(elem.button?.name === name){ elem.button.isChecked = true; found = elem; }
		else{ elem.button.isChecked = false; }
	});
	return found;
};
/**
 * Updates the header color of all form radio buttons.
 * @param {string} newColor - New CSS color value.
 */
glo.radiosFormes.changeColor = function (newColor){
	this.forEach(elem => { elem.header.color = newColor; });
};

// Initialize generators by calling the factory functions.
// Each call returns an iterator whose .next() advances the corresponding state.
glo.switchGuiSelect  = glo.switchGuiSelect();
glo.rotType          = glo.rotateTypeGen();
glo.coordinatesType  = glo.coordinatesType();
glo.symmetrizeOrders = glo.symmetrizeOrders();
glo.planSelects      = glo.planSelects();