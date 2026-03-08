//*****************************************************************************************************//
//**********************************************GLOBAL VAR*********************************************//
//*****************************************************************************************************//
const deepCopy = (inObject) => {
  let outObject, value, ke
  if (typeof inObject !== "object" || inObject === null) {
    return inObject // Return the value if inObject is not an object
  }

  outObject = Array.isArray(inObject) ? [] : {}

  for (key in inObject) {
    value = inObject[key]
    outObject[key] = deepCopy(value)
  }
  return outObject
}

const getById = function (id) { return document.getElementById(id); };

const defaultTheme = {
	pickerColorBackground: new BABYLON.Color3(0.1269, 0.1269, 0.1669),
	pickerColorButton: new BABYLON.Color3(0.1, 0.6, 0.6),
	pickerColorMeshBg: new BABYLON.Color3(0.3379, 0.4685, 0.5605),
	pickerColorLine: new BABYLON.Color3(0.5575, 0.2964, 0)
};

defaultTheme.pickerColorLine = defaultTheme.pickerColorMeshBg.inv();

let shaderModalInstance, fragmentShader, fragmentShaderHeader;

let fragmentShaders = [];

let normalShader, normalShaderHeader, normalShaderFooter;
let normalShaders = [];

let isFullscreen = false;

var num_mesh = 0;
var r = 1;
var glo = {
	canvas: getById('renderCanvas'),
	canvasTest: document.createElement('canvas'),
	formes:{
		selected:['Torus', 'cartesian'],
		select: formsToselect,
		setFormeSelect: async function(txt, coordsType, draw = true){
			for (const sel of this.select) {
				if(sel.text == txt && sel.typeCoords == coordsType){
					sel.check = true;
					glo.uvCoeff = sel.uvCoeff || {x: 1, y: 1};
					if(draw){
						glo.HDstepUV = false;

						var falpha = typeof(sel.alpha) != "undefined" ? falpha = sel.alpha  : falpha = "";
						var fbeta  = typeof(sel.beta)  != "undefined" ? fbeta  = sel.beta   : fbeta  = "";
						var ftheta = typeof(sel.theta) != "undefined" ? ftheta = sel.theta : ftheta = "";

						glo.params.text_input_x = sel.fx;
						glo.params.text_input_y = sel.fy;
						glo.params.text_input_z = sel.fz;

						if(glo.params.updateRots){
							glo.params.text_input_alpha = falpha;
							glo.params.text_input_beta  = fbeta;
							glo.params.text_input_theta = ftheta;
						}
						glo.params.u = sel.udef;
						glo.params.v = sel.vdef;

						if(!glo.normalMode){
							glo.input_x.text = sel.fx;
							glo.input_y.text = sel.fy;
							glo.input_z.text = sel.fz;
							if(glo.params.updateRots){
								glo.input_alpha.text = falpha;
								glo.input_beta.text  = fbeta;
								glo.input_theta.text = ftheta;
							}
						}

						glo.skipRebuild = true;

						glo.slider_nb_steps_u.maximum = sel.nb_steps_u * 2;
						glo.slider_nb_steps_v.maximum = sel.nb_steps_v * 2;
						glo.slider_u.maximum          = sel.udef * 2;
						glo.slider_v.maximum          = sel.vdef * 2;

						if(glo.slider_nb_steps_u.maximum < 256){ glo.slider_nb_steps_u.maximum = 256; }
						if(glo.slider_nb_steps_v.maximum < 256){ glo.slider_nb_steps_v.maximum = 256; }
						if(glo.slider_u.maximum < 2*Math.PI){ glo.slider_u.maximum = 2*Math.PI; }
						if(glo.slider_v.maximum < 2*Math.PI){ glo.slider_v.maximum = 2*Math.PI; }

						glo.params.steps_u = sel.nb_steps_u;
						glo.params.steps_v = sel.nb_steps_v;

						glo.params.steps_u *= glo.resolutionCoeff;
						glo.params.steps_v *= glo.resolutionCoeff;

						glo.slider_nb_steps_u.maximum*=glo.resolutionCoeff;
						glo.slider_nb_steps_v.maximum*=glo.resolutionCoeff;

						glo.slider_nb_steps_u.value = glo.params.steps_u; glo.slider_nb_steps_u.startValue = glo.params.steps_u;
						glo.slider_nb_steps_v.value = glo.params.steps_v; glo.slider_nb_steps_v.startValue = glo.params.steps_v;
						glo.slider_u.value = sel.udef; glo.slider_u.startValue = sel.udef;
						glo.slider_v.value = sel.vdef; glo.slider_v.startValue = sel.vdef;
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

						await make_curves();

						viewOnAxis(sel.orient);
					}
				}
				else{ sel.check = false; }
			}
		},
		setFormSelectByNum: async function(num){
			var coordsType = glo.coordsType;
			var sel = this.select[num];
			await this.setFormeSelect(sel.text, coordsType);
		},
		setStartForm: async function() { 
			const startForm = getStartForm();
			await this.setFormeSelect(startForm.text, startForm.typeCoords); 
		},
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
		getFormByName: function(name, coordsType){
			var selectsLength = this.select.length;
			for(var i = 0; i < selectsLength; i++){
				var sel = this.select[i];
				if(sel.typeCoords == coordsType && sel.text == name){ return sel; }
			}
			return false;
		},
		getNumFormSelectInCoordTypeByTitle: function(titleForm){
			const coordsType    = glo.coordsType;
			const selectsLength = this.select.length;

			for(var i = 0; i < selectsLength; i++){
				if(this.select[i].typeCoords === coordsType && this.select[i].text === titleForm){ return i; }
			}
		},
		getNumFirstFormInCoordType: function(){
			var coordsType = glo.coordsType;
			var selectsLength = this.select.length;
			for(var i = 0; i < selectsLength; i++){
				if(this.select[i].typeCoords == coordsType){ return i; }
			}
		},
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
	uvCoeff: {x: 1, y: 1},
	nbSymIter: 1,
	formule: [],
	controls_grid: [],
	regs: [
		{
			exp: /\(\s*([^()]+?)\s*\)\s*\*\*\*\s*\(\s*([^()]+?)\s*\)/g,
			upd: 'cpow($1,$2)'
		},
		// 2) (gauche) *** droiteSimple (identifiant ou nombre)
		{
			exp: /\(\s*([^()]+?)\s*\)\s*\*\*\*\s*([A-Za-z_$][\w$]*|\d+(?:\.\d+)?)/g,
			upd: 'cpow($1,$2)'
		},
		// 3) identifiant(groupe) ***(identifiant|nombre|groupe)
		{
			exp: /([A-Za-z_$][\w$]*\(\s*[^()]+?\s*\))\s*\*\*\*\s*([A-Za-z_$][\w$]*|\d+(?:\.\d+)?|\(\s*[^()]+?\s*\))/g,
			upd: 'cpow($1,$2)'
		},
		// 4) identifiant ***(groupe)
		{
			exp: /([A-Za-z_$][\w$]*)\s*\*\*\*\s*\(\s*([^()]+?)\s*\)/g,
			upd: 'cpow($1,$2)'
		},
		// 5) identifiant ***(identifiant|nombre)
		{
			exp: /([A-Za-z_$][\w$]*)\s*\*\*\*\s*([A-Za-z_$][\w$]*|\d+(?:\.\d+)?)/g,
			upd: 'cpow($1,$2)'
		},
		{ exp: /\s/g, upd: "" },
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
		{ exp: /m(?![\(xyz])/g, upd: "m()" },
		{ exp: /ù(?![\(])/g, upd: "ù()" },
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
		{ exp: /ca([^t\(auvp]*)t/g, upd: "0.5*cos($1t)+0.5" },
		{ exp: /sa([^t\(auvp]*)t/g, upd: "0.5*sin($1t)+0.5" },
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
		{ exp: /d([^,%*+-/)])/g, upd: "d*$1" },
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
		{ exp: /mx\*/g, upd: "mx" },
		{ exp: /my\*/g, upd: "my" },
		{ exp: /mz\*/g, upd: "mz" },
		{ exp: /e\*x/g, upd: "ex" },
		{ exp: /ex\*/g, upd: "ex" },
		{ exp: /exp\*/g, upd: "exp" },
		{ exp: /p\*i/g, upd: "pi" },
		{ exp: /ep\*i/g, upd: "e*pi" },
		{ exp: /e\*p/g, upd: "ep" },
	],
	coordsType: 'cartesian',
	coordinatesType: function* (){
		const coordinates = ['spheric', 'cylindrical', 'cartesian'];
		while (true) {
			for (const coord of coordinates) {
				this.coordsType = coord;
				yield coord;
			}
		}
	},
	symmetrizeOrder: 'xyz',
	symmetrizeOrders: function* (){
		const symetrizeOrds = ['xzy', 'yxz', 'yzx', 'zxy', 'zyx', 'xyz'];
		while (true) {
			for (const symetrizeOrd of symetrizeOrds) {
				this.symmetrizeOrder = symetrizeOrd;
				yield symetrizeOrd;
			}
		}
	},
	planSelect: 'none',
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
	guiSelect: 'fourth',
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
	numShaderSelect: 0,
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
	cam_pose: 60,
	slidersUVOnOneSign: {u: false, v: false},
	meshChannel: new BroadcastChannel('mesh_channel'),
	params:{
		u: PI,
		v: PI,
		steps_u: 132,
		steps_v: 132,
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
		text_input_x: "u",
		text_input_y: "u*sin(v)",
		text_input_z: "u*cos(v)*sin(u)",
		text_input_alpha: "",
		text_input_beta: "",
		text_input_theta: "",
		text_input_eval_x: "u",
		text_input_eval_y: "v",
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
			height: 27,
		},
	},
	uiThemes: {
		themeSelectIndex: 0,
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
		getCurrentTheme: function(){ return this.themes[this.themeSelectIndex]; },
		getNextTheme: function(next = true) {
			const length = this.themes.length;

			if (next) {
				this.themeSelectIndex = (this.themeSelectIndex + 1) % length;
			} else {
				this.themeSelectIndex = (this.themeSelectIndex - 1 + length) % length;
			}

			return this.getCurrentTheme();
		},
		activateNextTheme: function(next = true) {
			const themeSelect       = this.getNextTheme(next);
			const themeSelectColors = themeSelect.colors;

			glo.allControls.getByName('pickerColorBackground').value = themeSelectColors.pickerColorBackground;
			glo.allControls.getByName('pickerColorButton').value     = themeSelectColors.pickerColorButton;
			glo.allControls.getByName('pickerColorMeshBg').value     = themeSelectColors.pickerColorMeshBg;
			glo.allControls.getByName('pickerColorLine').value       = themeSelectColors.pickerColorLine;

			if(themeSelect.name === 'Default'){
				intiColorUI();
      			styleUI(0);
			}

			return themeSelect.name;
		},
	},
	shaders: {
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
	video:{
		canvas: null,
		stream: null,
		recorder: null,
		meshRecorder: null,
		chunks: [],
		recording: false,
	},
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
	bgActivedButtons: ['GridScale', 'updateRots'],
	cutRibbon: {x: false, y: false, z: false},
	centerSymmetry: {x: 0, y: 0, z: 0},
	rotate_speed: 1/450 * PI,
	ribbon_alpha: 1,
	rotateType: 'none',
	axis_size: 5,
	planSize: 5,
	scaleNorm: 1,
	deformationEnabled: false,
	buttonBottomSize: 90,
	buttonBottomHeight: 30,
	buttonBottomPaddingLeft: 12,
	panelBottomButtonTop: 44.25,
	topRadiosStart: 67,
	topLineDimStart: 3.75,
	mainTopShift: 6.66,
	shiftLineDim: 0.33,
	shiftRadios: 0.88,
	resolutionCoeff: 4,
	buttons_color: "#e1cdb7",
	labelGridColor: "white",
	buttons_radius: 6.33,
	buttons_fontsize: "16px",
	diffuseColor: defaultTheme.pickerColorMeshBg,
	emissiveColor: defaultTheme.pickerColorMeshBg,
	backgroundColor: defaultTheme.pickerColorBackground,
	lineColor: defaultTheme.pickerColorLine,
	color_line_grid: new BABYLON.Color3(0, 0, 0),
	randomizeColorLightLevel: 5,
	firstPoint: new BABYLON.Vector3(1, 0, 0),
	angleToUpdateRibbon: {x: 0, y: 0},
	pickers_size: 107,
	numRibbon: 0,
	scaleVertex: 1,
	fullScreen: false,
	skipRebuild: false,
	gui_visible: true,
	gui_suit_visible: false,
	all_visible: true,
	coloredRibbon: false,
	axis_visible: false,
	grid_visible: false,
	first_axis_visible: true,
	first_grid_visible: true,
	first_rot: true,
	first_radio: true,
	rotate_z: false,
	dim_one: false,
	selection: false,
	negatif: true,
	planes_visible: false,
	planeXYvisible: false,
	planeYZvisible: false,
	planeXZvisible: false,
	viewXpos: true,
	viewYpos: true,
	viewZpos: true,
	anim_construct_mesh: false,
	deg: false,
	switchedSliderNoChange: false,
	voronoiMode: false,
	normalMode: false,
	normalOnNormalMode: false,
	fromSlider: false,
	wireframe: false,
	normalColorMode: true,
	addSymmetry: true,
	savePos: {x: 0, y: 0, z: 0},
	pathsInfos: {u: 0, v: 0},
	equationsParamSliders: [],
	radios_formes: [],
	rightPanelsClasses: ['fourth', 'seventh', 'eighth', 'sixth', 'onlyMainGui', 'second', 'eleventh'],
	controlConfig:{
		background: '#199191',
		backgroundActived: '#196969',
	},
	dblLines: [],
	currentCurveInfos:{
		currentPath: [],
		u: 0,
		v: 0,
		n: 0,
		index_u: 0,
		index_v: 0,
	},
	onePoint: BABYLON.Vector3.Zero(),
	lineStep: {},
	linesStep: [],
};

glo.gl = glo.canvasTest.getContext('webgl2') || glo.canvasTest.getContext('webgl');

glo.meshChannel.onmessage = (event) => {
	const { action, rotType } = event.data;

	if (action === 'setRotateType') {
		glo.rotType.next();
	}
};

function getByName(name){
	var elemToReturn = false;
	this.map(elem => {
		if(typeof(elem) != 'undefined' && typeof(elem.name) != 'undefined' && elem.name == name){ elemToReturn = elem; }
	});
	return elemToReturn;
}
function changeColor(color){
	this.map(elem => {
		elem.color = color;
	});
}
function haveThisClass(className){
	var elemsToReturn = [];
	var reg = new RegExp("\\b" + className + "\\b");
	this.map(elem => {
		if(typeof(elem) != 'undefined' && typeof(elem.class) != 'undefined' && elem.class.match(reg) != null){ elemsToReturn.push(elem); }
	});

	var elemsToReturnLength = elemsToReturn.length;
	if(elemsToReturnLength == 0){ return false; }
	if(elemsToReturnLength == 1){ return elemsToReturn[0]; }
	else{ return elemsToReturn; }
}

glo.radios_formes.getByName = function (name){
	var elemToReturn = false;
	this.map(elem => {
		if(typeof(elem) != 'undefined' && typeof(elem.button.name) != 'undefined' && elem.button.name == name){ elemToReturn = elem; }
	});
	return elemToReturn;
};
glo.radios_formes.getCheck = function (){
	var elemToReturn = false;
	this.map(elem => {
		if(typeof(elem) != 'undefined' && elem.button.isChecked){ elemToReturn = elem; }
	});
	return elemToReturn;
};
glo.radios_formes.setCheckByName = function (name){
	var elemToReturn = false;
	this.map(elem => {
		if(typeof(elem) != 'undefined' && typeof(elem.button.name) != 'undefined' && elem.button.name == name){ elem.button.isChecked = true; elemToReturn = elem; }
		else if(typeof(elem) != 'undefined'){ elem.button.isChecked = false; }
	});
	return elemToReturn;
};
glo.radios_formes.changeColor = function (newColor){
	this.map(elem => {
		elem.header.color = newColor;
	});
};

glo.switchGuiSelect 	= glo.switchGuiSelect();
glo.rotType             = glo.rotateTypeGen();
glo.coordinatesType 	= glo.coordinatesType();
glo.symmetrizeOrders    = glo.symmetrizeOrders();
glo.planSelects         = glo.planSelects();