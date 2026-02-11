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

let shaderModalInstance, fragmentShader, fragmentShaderHeader;

let fragmentShaders = [];

let normalShader, normalShaderHeader, normalShaderFooter;
let normalShaders = [];

let g     = 0;
let w     = 0;
let wstep = 0.008;

let isFullscreen = false;

var num_mesh = 0;
var r = 1;
const PI = Math.PI;
const e  = Math.E;
const Z = (1+Math.sqrt(5))*0.5;
const Q = Math.SQRT2;
var glo = {
	canvas: getById('renderCanvas'),
	canvasTest: document.createElement('canvas'),
	formes:{
		selected:['Torus', 'cartesian'],
		select:[
			{text: "Catenoïd", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 96, nb_steps_v: 48,  fx: "cosh(v/2)cu", fy: ".5v", fz: "cosh(v/2)su", check: false, orient: {distance: 12.5, axis: "X", direction: 1, alpha: 0, beta: -PI/8}},
			{text: "Catenoïd loop", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 96, nb_steps_v: 48,  fx: "cosh(v/2)cu", fy: "(1/6)piv", fz: "cosh(v/2)su", alpha: "cu", beta:"cusu", theta: "", check: false, orient: {distance: 12.5, axis: "X", direction: 1, alpha: -PI/8, beta: PI}},
			{text: "Catenoïd twisted", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 96, nb_steps_v: 96,  fx: "cosh(v/2)cu", fy: "(1/6)piv", fz: "cosh(v/2)su", alpha: "G(c(vct)+1)", beta:"t", theta: "t", check: false, orient: {distance: 12.5, axis: "X", direction: 1, alpha: PI/2, beta: -PI/6}},
			{text: "CosSin", typeCoords: 'cartesian', udef: 6*PI, vdef: 6*PI, nb_steps_u: 128, nb_steps_v: 128,  fx: ".125u", fy: ".125v", fz: ".125sucv", check: false, orient: {axis: "X", direction: -1, alpha: PI/4, beta: -PI/4, distance: 10}},
			{text: "Curve tetra", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "c(u+.001)", fy: "cv", fz: "cupv", check: false, orient: {axis: "X", direction: -1, alpha: PI/3, beta: -PI/4, distance: 8} },
			{text: "Helix", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 32, fx: "(1/3)sinh(v)su", fy: "u", fz: "-(1/3)sinh(v)cu", check: false, orient: {distance: 20, axis: "X", direction: 1, alpha: -PI/4, beta: -PI/4}},
			{text: "Hourglass", typeCoords: 'cartesian', udef: 4*PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: ".3u", fy: ".3usv", fz: ".3ucvsu", check: false, orient: {axis: "X", direction: -1, alpha: PI/4, beta: -PI/4, distance: 20}},
			{text: "Hypotenuse", typeCoords: 'cartesian', udef: 4*PI, vdef: PI, nb_steps_u: 512, nb_steps_v: 32,  fx: ".125uc(0.5v)/2", fy: "-(.125(h(u,v)+sv - 3)-0.66)", fz: ".125h(u,v)u/12", beta: "h(u,v)/G", check: false, orient: {distance: 7, axis: "X", direction: 1, alpha: 0, beta: -PI/8}},
			{text: "Moebius", typeCoords: 'cartesian', udef: PI, vdef: 1, nb_steps_u: 256, nb_steps_v: 12, fx: "(1+ 0.5vc(0.5u))cu", fy: "(1+ 0.5vc(0.5u))su", fz: ".5vs(0.5u)", check: false, orient:{distance: 6, beta: -PI/6}},
			{text: "Plan", typeCoords: 'cartesian', udef: 6*PI, vdef: 6*PI, nb_steps_u: 128, nb_steps_v: 128,  fx: ".125u", fy: ".125v", fz: "", check: false, orient: {axis: "X", direction: -1, alpha: PI/4, beta: -PI/4, distance: 10}},
			{text: "Saddle", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 16, nb_steps_v: 64,  fx: "u", fy: "v", fz: "uv", check: false, orient:{distance: 30, alpha: PI/2, beta: -PI/4}},
			{text: "Sphere", typeCoords: 'cartesian', udef: PI, vdef: PI/2, nb_steps_u: 128, nb_steps_v: 128,  fx: "2cucv", fy: "2sucv", fz: "2sv", check: false, orient:{distance: 10}},
			{text: "Torus", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 32,  fx: "(cv + e)cu", fy: "(cv + e)su", fz: "sv", check: true, orient: {axis: "X", direction: -1, alpha: PI/4, beta: -PI/4, distance: 16.66}},
			{text: "Torus square", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 64,  fx: "(cv + e)(cu)***2", fy: "(cv + e)(su)***2", fz: "(sv)***2", check: false, orient: {axis: "X", direction: -1, alpha: PI/4, beta: -PI/4, distance: 16.66}},
			{text: "Torus Meta", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 164, nb_steps_v: 32,  fx: ".125(cv + 10)cu", fy: ".125(cv + 10)su", fz: ".125sv", beta: "u", check: false, orient: {axis: "X", direction: -1, alpha: 0, beta: PI/8, distance: 6}},
			{text: "Twisted Torus", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "(cv + 2)cu", fy: "(cv + 2)su", fz: "sv", alpha: "G(cv)", beta:"G(cv)", theta: "", check: false, orient: {axis: "X", direction: 1, alpha: PI/2, beta: 0, distance: 15}},
			{text: "Waves", typeCoords: 'cartesian', udef: 9*PI, vdef: 9*PI, nb_steps_u: 128, nb_steps_v: 128,  fx: ".125u", fy: ".125v", fz: ".125(2s(h(u,v)))", beta: "h(u,v)/20", check: false, orient: {distance: 15, axis: "Z", direction: 1, alpha: PI/8, beta: -PI/6}},
			{text: "Bicylinder S", typeCoords: 'cartesian', udef: PI, vdef: PI/2, nb_steps_u: 128, nb_steps_v: 128,  fx: "(cucv)***2", fy: "(svcu)***2", fz: "Q/2s(u)", alpha: "", beta: "", check: false, suit: true, orient: {axis: "X", direction: -1, alpha: 5*PI/8, beta: -PI/8, distance: 6}},
			{text: "Cube", typeCoords: 'cartesian', udef: PI, vdef: PI/2, nb_steps_u: 128, nb_steps_v: 128,  fx: "(cucv)***2", fy: "(sucv)***2", fz: "Q/2(sv)***0", alpha: "", check: false, suit: true, orient: {axis: "X", direction: -1, alpha: 3*PI/4, beta: -7*PI/6, distance: 6}},
			{text: "Egg", typeCoords: 'cartesian', udef: PI, vdef: PI/2, nb_steps_u: 128, nb_steps_v: 128,  fx: "", fy: "((pow(36 - su², 0.5) + cu)cu)/4-0.225", fz: "su", beta: "v", check: false, suit: true, orient: {axis: "X", direction: 1, alpha: 0, beta: -PI/8, distance: 7}},
			{text: "Glass", typeCoords: 'cartesian', udef: PI, vdef: 3*PI/8, nb_steps_u: 128, nb_steps_v: 128,  fx: "c(u+1)c(v+1.2)", fy: "s(u+1)c(v+1.2)", fz: "(9/7)sv", alpha: "", check: false, suit: true, orient: {axis: "X", direction: -1, alpha: 3*PI/4, beta: -7*PI/6, distance: 8}},
			{text: "Heart", typeCoords: 'cartesian', udef: 2*PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "sv**3", fy: "-(13cv-5c(2v)-2c(3v)-c(4v))/16", fz: "u/128", alpha: "", check: false, suit: true, orient: {axis: "Z", direction: -1, alpha: 3*PI/4, beta: -7*PI/6, distance: 5}},
			{text: "Horn", typeCoords: 'cartesian', udef: PI/2, vdef: PI/2, nb_steps_u: 128, nb_steps_v: 128,  fx: "usv", fy: "ucv", fz: "(2u²-3)-0.5", beta: "u²", check: false, suit: true, orient: {axis: "X", direction: -1, alpha: 3*PI/4, beta: -7*PI/6, distance: 10}},
			{text: "Knot torus", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 256,  fx: ".25(cu + 10)cv", fy: ".25(cu + 10)sv", fz: ".25su", alpha: "v", beta: "v", check: false, suit: true, orient: {axis: "Z", direction: -1, alpha: PI/2.5, beta: 0, distance: 10}},
			{text: "Pseudosphere", typeCoords: 'cartesian', udef: 1.24, vdef: PI, nb_steps_u: 256, nb_steps_v: 92,  fx: "cvcu**pi", fy: "svcu**pi", fz: "cpow(sinh(u), e)", alpha: "", beta: "", check: false, suit: true, orient: {axis: "X", direction: -1, alpha: 0, beta: -PI/8, distance: 10}},
			{text: "CircleSpi", typeCoords: 'spheric', udef: 1.5*PI, vdef: PI/2, nb_steps_u: 128, nb_steps_v: 128,  fx: "u", fy: "v", fz: "exp(1/l(2abs(u)))", check: false, orient: {distance: 20, axis: "Z", direction: 1, alpha: 0, beta: -PI/8}},
			{text: "Dbl tongue", typeCoords: 'spheric', udef: PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "u", fy: "v", fz: "cupvcv", check: false, orient: {distance: 15, axis: "X", direction: 1, alpha: -PI/8, beta: 0}},
			{text: "Dbl drop", typeCoords: 'spheric', udef: PI/2, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "cusv", fy: "ucusv", fz: "vcusv", check: false, orient: {distance: 4, axis: "X", direction: 1, alpha: -PI/4, beta: 0}},
			{text: "Flower", typeCoords: 'spheric', udef: PI, vdef: PI/2, nb_steps_u: 128, nb_steps_v: 128,  fx: "vh(c(u8),s(12v))", fy: "v+pi/4", fz: "u", check: false, orient: {distance: 7, axis: "X", direction: -1, alpha: 0, beta: -PI/4, offset:{z:-0.805}}},
			{text: "Interrogation", typeCoords: 'spheric', udef: PI/2, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "u", fy: "-u", fz: "v/2", alpha: "", beta: "(cu**8)8", theta: "", check: false, orient: {distance: 6, axis: "X", direction: -1, alpha: -7*PI/8, beta: 0, offset:{z:0.5}}},
			{text: "Heart", typeCoords: 'spheric', udef: PI/2, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "u", fy: "u", fz: "v/2", alpha: "", beta: "(cu**8)8suv", theta: "", check: false, orient: {distance: 6, axis: "X", direction: -1, alpha: 0, beta: PI, offset:{z:-0.5}}},
			{text: "Nautile", typeCoords: 'spheric', udef: PI/2, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "cu", fy: "-u", fz: "v", alpha: "cv", beta: "cusu", theta: "", check: false, orient: {distance: 7, axis: "Y", direction: -1, alpha: -5*PI/4, beta: 0} },
			{text: "Pen mine", typeCoords: 'spheric', udef: PI/2, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "(u+c(u+c(v+vsu)))", fy: "u+cu", fz: "v", check: false, orient: {distance: 7, axis: "Z", direction: 1, alpha: -2*PI/3, beta: -9*PI/8}},
			{text: "Propeller", typeCoords: 'spheric', udef: 4*PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "u", fy: "s(.2v)", fz: "vc(.2v)s(.2u)", check: false, orient: {distance: 7, axis: "X", direction: 1, alpha: 0, beta: PI}},
			{text: "Seashell heart", typeCoords: 'spheric', udef: PI/2, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "u(cv+1)", fy: "usv", fz: "ucv", check: false, orient: {distance: 7, axis: "Y", direction: -1, alpha: -5*PI/4, beta: -PI/4}},
			{text: "Sphere meridians", typeCoords: 'spheric', udef: PI, vdef: PI/2, nb_steps_u: 128, nb_steps_v: 128,  fx: "1", fy: "v", fz: "u", check: false, orient: {distance: 7, axis: "X", direction: 1, alpha: -PI/8, beta: -PI/8} },
			{text: "Sphere parallels", typeCoords: 'spheric', udef: PI/2, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "1", fy: "u", fz: "v", check: false, orient: {distance: 7, axis: "X", direction: 1, alpha: -PI/8, beta: -PI/8}},
			{text: "Sphere rosette", typeCoords: 'spheric', udef: PI, vdef: PI/2, nb_steps_u: 128, nb_steps_v: 128,  fx: "1", fy: "u-v", fz: "u+v", check: false, orient: {distance: 7, axis:"X", direction : 1 , alpha : -PI/8 , beta : -PI/8}},
			{text: "Spiral triple", typeCoords: 'spheric', udef: PI, vdef: PI, nb_steps_u: 96, nb_steps_v: 3,  fx:"u" , fy:"pi/4" , fz:"u+v" , check:false , orient:{distance :7 , axis :"X" , direction :1 , alpha :PI/4 , beta :-PI/8}},
			{text:"Spiral penta curve" , typeCoords :"spheric" , udef :PI , vdef :PI , nb_steps_u :256 , nb_steps_v :5 , fx :"u" , fy :"pi/4" , fz :"2(u+v)" , alpha :"a(u/(3+2/3))+pi/(2**0.5)" , check:false , orient:{distance :7,axis :"X" , direction :1,alpha :3.5*PI/4,beta :0}},
			{text:"Twisted weathercock" , typeCoords :"spheric" , udef :PI/2,vdef :PI,nb_steps_u :128,nb_steps_v :256, fx :"pi+c(12(u+v))", fy :"u", fz :"v", alpha :"", beta :"u/1.1", theta:"", check:false, orient:{distance :7,axis :"X",direction :-1,alpha :PI,beta :-PI/12}},
			{text: "Ouroboros", typeCoords: 'spheric', udef: PI, vdef: PI/2, nb_steps_u: 128, nb_steps_v: 128, fx: "u", fy: "v", fz:"2picv²su²", alpha: "0.707cv", beta: "0.707cv", check: false, orient: {distance: 7, axis: "X", direction: -1, alpha: 0, beta: 0}},
			{text: "Rosette", typeCoords: 'spheric', udef: PI/2, vdef: PI, nb_steps_u: 128, nb_steps_v: 256, fx: "c(12(u+v))", fy: "u", fz: "v", alpha: "", beta: "", check: false, suit: true,  orient: {distance: 7, axis: "X", direction: 1, alpha: 0, beta: -PI/4}},
			{text: "Cylinder", typeCoords: 'cylindrical', udef: PI, vdef: PI, nb_steps_u: 88, nb_steps_v: 88,  fx: "1", fy: "v", fz: "u", check: false, orient: {distance: 7, axis: "X", direction: 1, alpha: PI/4, beta: -PI/12}},
			{text: "Egyptian tiara", typeCoords: 'cylindrical', udef: PI/2, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "6uv²-v**3", fy: "us(fact(v))", fz: "6ucvs(60u)", check: false, orient: {distance :7,axis :"Z" , direction :-1,alpha :PI/8,beta :-PI/16}},
			{text: "Hyperbola", typeCoords: 'cylindrical', udef: PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "v²", fy: "u", fz: "v", check: false, orient: {distance: 7, axis: "X", direction: -1, alpha: 0, beta: -PI/12}},
			{text: "Inverse hyperbola", typeCoords: 'cylindrical', udef: PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 124,  fx: "1/(4v)", fy: "u", fz: "4v", check: false, orient: {distance: 7, axis: "X", direction: -1, alpha: 0, beta: -PI/12}},
			{text: "Invsin hyperbola", typeCoords: 'cylindrical', udef: PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 124,  fx: "1/(4v)", fy: "u", fz: "4v+s(6Gu)", check: false, orient: {distance :7,axis :"X" , direction :-1,alpha :0,beta :-PI/12}},
			{text:"Invspin hyperbola" , typeCoords :"cylindrical" , udef :PI,vdef :PI,nb_steps_u :64,nb_steps_v :164 , fx :"1/(12v)", fy :"u", fz :"(8+2/3)v", beta :"3vsi(v)/2", check:false , orient:{distance :7,axis :"X" , direction :-1,alpha :PI/4,beta :-PI/12}},
			{text:"Moebius" , typeCoords :"cylindrical" , udef :PI,vdef :1,nb_steps_u :128,nb_steps_v :128 , fx :"(1+ 0.5vc(0.5u))cu", fy :"(1+ 0.5vc(0.5u))su", fz :"0.5vs(0.5u)", check:false , orient:{distance :7,axis :"X" , direction :-1,alpha :PI/3,beta :-PI/12}},
			{text: "Spiral 1", typeCoords: 'cylindrical', udef: PI, vdef: PI, nb_steps_u: 32, nb_steps_v: 64,  fx: "u", fy: "v", fz: "v", check: false, orient: {distance: 7, axis: "X", direction: -1, alpha: PI/4, beta: -PI/4}},
			{text: "Spiral 2", typeCoords: 'cylindrical', udef: 6*PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "u", fy: "v", fz: "3v+sufv", beta: "c(60u)/12", check: false, orient: {distance: 7, axis: "X", direction: -1, alpha: PI/4, beta: -PI/4}},
			{text: "Spiral 3", typeCoords: 'cylindrical', udef: 6*PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "uc(0.5v)/2", fy: "u+v", fz: "abs(u)u/12", check: false, orient: {distance :7,axis :"X" , direction :1,alpha :PI/4,beta :-PI/8}},
			{text:"Spiral 4" , typeCoords :"cylindrical" , udef :PI/2,vdef :PI/2,nb_steps_u :128,nb_steps_v :128 , fx :"4uv", fy :"pi", fz :"u", alpha :"v", beta :"ch(u,v)pi", theta:"", check:false , orient:{distance :7,axis :"X" , direction :1,alpha :PI/4,beta :-PI/8}},
		],
		setFormeSelect: async function(txt, coordsType, draw = true){
			for (const sel of this.select) {
				if(sel.text == txt && sel.typeCoords == coordsType){
					sel.check = true;
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

						if(!glo.dim_one){
							if(glo.params.uvToXy){ uvToXy(false); }
							if(!glo.normalMode){
								await make_curves();
							}
							else{
								glo.fromSlider = true; await make_curves();
								glo.fromSlider = false; drawNormalEquations();
							}
						}
						else{
							dimension(true);
						}
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
		{ exp: /a(?![\(bs])/g, upd: "a()" },
		{ exp: /b(?![\(s])/g, upd: "b()" },
		{ exp: /ç(?![\(])/g, upd: "ç()" },
		{ exp: /aa(?![\(])/g, upd: "aa()" },
		{ exp: /bb(?![\(])/g, upd: "bb()" },
		{ exp: /(?<![cp])o(?![\(])/g, upd: "o()" },
		{ exp: /c([^*\(R\)]*)R/g, upd: "cos($1R)" },
		{ exp: /s([^*\(R\)]*)R/g, upd: "sin($1R)" },
		{ exp: /c([^*\(X\)]*)X/g, upd: "cos($1X)" },
		{ exp: /s([^*\(X\)]*)X/g, upd: "sin($1X)" },
		{ exp: /c([^*\(Y\)]*)Y/g, upd: "cos($1Y)" },
		{ exp: /s([^*\(Y\)]*)Y/g, upd: "sin($1Y)" },
		{ exp: /R/g, upd: "h(x,y,z)" },
		{ exp: /q(?![\(])/g, upd: "h(u,v)" },
		{ exp: /m(?![\(xyz])/g, upd: "m()" },
		{ exp: /cc(?![\(])/g, upd: "cc()" },
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
		{ exp: /c([^t\(uvp]*)t/g, upd: "cos($1t)" },
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
		{ exp: /s([^q\(]*)q/g, upd: "sin($1h(u,v))" },
		{ exp: /c([^q\(]*)q/g, upd: "cos($1h(u,v))" },
		{ exp: /²/g, upd: "**2" },
		{ exp: /³/g, upd: "**3" },
		{ exp: /uu([^,%*+-/)])/g, upd: "uu*$1" },
		{ exp: /vv([^,%*+-/)])/g, upd: "vv*$1" },
		{ exp: /u([^,%*+-/)])/g, upd: "u*$1" },
		{ exp: /v([^,%*+-/)])/g, upd: "v*$1" },
		{ exp: /(?<!cpo)w([^\(),%*+\-\/)])/g, upd: "w*$1" },
		{ exp: /µP([^,%*+-/)])/g, upd: "µP*$1" },
		{ exp: /µN([^,%*+-/)])/g, upd: "µN*$1" },
		{ exp: /\$N([^,%*+-/)])/g, upd: "$N*$1" },
		{ exp: /\$P([^,%*+-/)])/g, upd: "$P*$1" },
		{ exp: /x([^,%*+-/NPT)])/g, upd: "x*$1" },
		{ exp: /y([^,%*+-/NPT)])/g, upd: "y*$1" },
		{ exp: /z([^,%*+-/NPT)])/g, upd: "z*$1" },
		{ exp: /n([^,%*+-/d)])/g, upd: "n*$1" },
		{ exp: /r([^,%*+-/nmC\())])/g, upd: "r*$1" },
		{ exp: /alpha([^,%*+-/nt)])/g, upd: "alpha*$1" },
		{ exp: /beta([^,%*+-/nt)])/g, upd: "beta*$1" },
		{ exp: /(?<!s)i([^,%*+\-\/)])/g, upd: "i*$1" },
		{ exp: /j([^,%*+-/)])/g, upd: "j*$1" },
		{ exp: /xN([^,%*+-/)])/g, upd: "xN*$1" },
		{ exp: /yN([^,%*+-/)])/g, upd: "yN*$1" },
		{ exp: /zN([^,%*+-/)])/g, upd: "zN*$1" },
		{ exp: /xP([^,%*+-/)])/g, upd: "xP*$1" },
		{ exp: /yP([^,%*+-/)])/g, upd: "yP*$1" },
		{ exp: /zP([^,%*+-/)])/g, upd: "zP*$1" },
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
		{ exp: /rCol([^,%*+-/)])/g, upd: "rCol*$1" },
		{ exp: /gCol([^,%*+-/)])/g, upd: "gCol*$1" },
		{ exp: /bCol([^,%*+-/)])/g, upd: "bCol*$1" },
		{ exp: /mCol([^,%*+-/)])/g, upd: "mCol*$1" },
		{ exp: /O([^,%*+-/)])/g, upd: "O*$1" },
		{ exp: /T([^,%*+-/)])/g, upd: "T*$1" },
		{ exp: /e([^,%*+-/)pi])/g, upd: "e*$1" },
		{ exp: /Q([^,%*+-/)])/g, upd: "Q*$1" },
		{ exp: /Z([^,%*+-/)])/g, upd: "Z*$1" },
		{ exp: /\)([^,%*+-/)'])/g, upd: ")*$1" },
		{ exp: /(\d+)([^,%*+-/.\d)])/g, upd: "$1*$2" },
		{ exp: /l/g, upd: "log" },
		{ exp: /u\*_mod/g, upd: "u_mod" },
		{ exp: /v\*_mod/g, upd: "v_mod" },
		{ exp: /be\*ta/g, upd: "beta" },
		{ exp: /sin\*/g, upd: "sin" },
		{ exp: /tan\*/g, upd: "tan" },
		{ exp: /t\*an/g, upd: "tan" },
		{ exp: /tan\*\(/g, upd: "tan(" },
		{ exp: /sign\*/g, upd: "sign" },
		{ exp: /logte\*n\*/g, upd: "logten" },
		{ exp: /hy\*pot/g, upd: "hypot" },
		{ exp: /fact_de\*c/g, upd: "fact_dec" },
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
		{ exp: /se\*/g, upd: "se" },
		{ exp: /mod\*/g, upd: "mod" },
	],
	draw_type: function* (){
	  var index = 0;
	  var tab = ['LINES', 'CLEAN', 'NONE', 'FULL'];
	  while(true){
			switch (tab[index]) {
				case 'LINES':
					this.lines_visible = true;
					this.ribbon_visible = false;
					break;
				case 'CLEAN':
					this.lines_visible = false;
					this.ribbon_visible = true;
					break;
				case 'NONE':
					this.lines_visible = false;
					this.ribbon_visible = false;
					break;
				case 'FULL':
					this.lines_visible = true;
					this.ribbon_visible = true;
					break;
			}
			index++;
			if(index == tab.length){ index = 0; }
	    yield tab[index];
	  }
	},
	vertexsType: 'normal',
	vertexsTypes: function* (){
		const vertexs = ['uv', 'position', 'normal'];
		while (true) {
			for (const vertex of vertexs) {
				this.vertexsType = vertex;
				yield vertex;
			}
		}
	},
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
	coordsNomrType: 'cartesian',
	coordinatesNomrType: function* (){
		const coordinates = ['spheric', 'cylindrical', 'cartesian'];
		while (true) {
			for (const coord of coordinates) {
				this.coordsNomrType = coord;
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
	permutSign: '',
	permutSigns: function* (){
		const permutsigns = ['xy', 'xz', 'yz', ''];
		while (true) {
			for (const permutsign of permutsigns) {
				this.permutSign = permutsign;
				yield permutsign;
			}
		}
	},
	invPosIf: '',
	invPosIfs: function* (){
		const invposifs = ['xy', 'yx', 'xz', 'zx', 'yz', 'zy', ''];
		while (true) {
			for (const invposif of invposifs) {
				this.invPosIf = invposif;
				yield invposif;
			}
		}
	},
	fractalizeOrient: '',
	fractalizeOrients: function* (){
		const orients = [new BABYLON.Vector3(1, 0, 0), new BABYLON.Vector3(0, 1, 0), new BABYLON.Vector3(0, 0, 1), ''];
		while (true) {
			for (const orient of orients) {
				this.fractalizeOrient = orient;
				yield orient;
			}
		}
	},
	colorByCurve: '',
	colorByCurves: function* (){
		//const curveKinds = ['azit', 'elev', 'elevMoy', 'color', ''];
		const curveKinds = ['phi', ''];
		while (true) {
			for (const curveKind of curveKinds) {
				this.colorByCurve = curveKind;
				yield curveKind;
			}
		}
	},
	colorsType: 'none',
	colorType: function* (){
	  var index = 0;
	  var tab = ['none', 'edge'];
	  while(true){
			index++;
			if(index == tab.length){ index = 0; }
			this.colorsType = tab[index];
	    yield tab[index];
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
	fontUI: 'none',
	fontUIs: function* (){
	  var index = 0;
	  var tab = ["Manrope", "Poppins"];
	  while(true){
			index++;
			if(index == tab.length){ index = 0; }
			this.fontUI = tab[index];
	    yield tab[index];
	  }
	},
	guiSelect: 'fourth',
	switchGuiSelect: function* (){
	  var index = 0;
	  var tab = ['fourth', 'seventh', 'eighth', 'sixth', 'onlyMainGui', 'second', 'eleventh'];
	  //var tab = ['fourth', 'seventh', 'eighth', 'nineth', 'fifth', 'sixth', 'onlyMainGui', 'second', 'third', 'tenth', 'eleventh'];
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
	coeff_gui_resize: {
		width_1920: 1.125,
		width_1600: 1,
		width_1366: 0.9,
	},
	guiAnims: {
		sliderU: false,
		sliderV: false,
		sliderStepU: false,
		sliderStepV: false,
	},
	voronoi:{
		nbPoints: 256,
	},
	cam_pose: 60,
	sliderGain: 0,
	is_sliderGainPos: false,
	slidersUVOnOneSign: {u: false, v: false},
	meshChannel: new BroadcastChannel('mesh_channel'),
	params:{
		u: 4*PI,
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
		invPtsPowCoeff: 0.00,
		saturation: 0,
		tint: 0,
		rotAlpha: 0,
		rotBeta: 0,
		rColor: 0,
		gColor: 0,
		bColor: 0,
		itColors: 1,
		toColR: 0,
		text_input_x: "u",
		text_input_y: "u*sin(v)",
		text_input_z: "u*cos(v)*sin(u)",
		text_input_alpha: "",
		text_input_beta: "",
		text_input_suit_x: "",
		text_input_suit_y: "",
		text_input_suit_z: "",
		text_input_suit_alpha: "",
		text_input_suit_beta: "",
		text_input_suit_theta: "",
		text_input_x: "u",
		text_input_y: "u*sin(v)",
		text_input_z: "u*cos(v)*sin(u)",
		text_input_alpha: "",
		text_input_beta: "",
		text_input_theta: "",
		text_input_color_x: "cu",
		text_input_color_y: "cv",
		text_input_color_z: "",
		text_input_color_alpha: "",
		text_input_color_beta: "",
		text_input_eval_x: "",
		text_input_eval_y: "",
		symmetrizeX: 0,
		symmetrizeY: 0,
		symmetrizeZ: 0,
		symmetrizeAngle: PI,
		checkerboard: 0,
		checkerboardNbSteps: 2,
		playWithColorMode: "xyz",
		playWithColors: false,
		playWithColorsAll: false,
		colors2: false,
		colorsByRotate: false,
		invCol: false,
		transCol: false,
		isTimeVariable: false,
		normale:{
			text_input_x: "",
			text_input_y: "",
			text_input_z: "",
			text_input_alpha: "",
			text_input_beta: "",
		},
		blender: {
			force: 1,
			u:{
				x: 0, y: 0, z: 0,
			},
			v:{
				x: 0, y: 0, z: 0,
			},
			O:{
				x: 0, y: 0, z: 0,
			},
			cu:{
				x: 0, y: 0, z: 0,
			},
			cv:{
				x: 0, y: 0, z: 0,
			},
		},
		functionIt:{
			cpow:{x: 1, y: 1, z: 1, toZero: {x: false, y: false, z: false}},
			sin:{x: 0, y: 0, z: 0, nx: 1, ny: 1, nz: 1, toZero: {x: false, y: false, z: false}},
			rotLine: {alpha: 0, beta: 0, theta: 0},
			expend: 0,
			flat: {x: {up: 100, bottom: 100}, y: {up: 100, bottom: 100}, z: {up: 100, bottom: 100}},
			rotatePaths:{centerOffset: {x: 1, y: 1, z: 1}},
			r: 
				{
					u: 
						{
							sin: {val:0, nb: 1},
						},
					$T: 
						{
							cos: {val:0, nb: 1},
						},
				},
			norm:{
				x:  0,
				nx: 0.3,
				y:  0,
				ny: 0.3,
				z:  0,
				nz: 0.3,
			}
		},
		invPos: {x: false, y: false, z: false},
		quaternionByRotR: false,
		wOnXYZ: true,
		gridScale: true,
		gridScaleValue: 4,
		curvaturetoZero: true,
		updateRots: true,
		centerIsLocal: false,
		scalingX: 1,
		scalingY: 1,
		scalingZ: 1,
		lastPathEqualFirstPath: false,
		normByFace: true,
		coeffPhi: 10,
		symmAngle: {x: 0, y: 0},
		distDel: 5,
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
				color      : '#f5e7cb',
			},
		},
		button: {
			height: 30,
		},
	},
	tubes: {
		radius: 0.05,
		coeffRadiusVariation: Math.pow(2, 1/3),
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
		},
		light:{
			direction: {x: -0.4, y: -0.4, z: 0.8},
			intensity: 1.0,
			radius: 100.0,
			specular: {power: 2.0, intensity: 4.0},
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
	rotate_speed: 0.5/180 * PI,
	ribbon_alpha: 1,
	rot_z: 0,
	rotateType: 'none',
	axis_size: 6,
	planSize: 8,
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
	color_text_input: "rgb(255,255,245)",
	buttons_background: "#199191",
	buttons_color: "#e1cdb7",
	labelGridColor: "white",
	buttons_radius: 6.33,
	buttons_fontsize: "16px",
	diffuseColor: new BABYLON.Color3(0.6, 0.5, 0.5),
	emissiveColor: new BABYLON.Color3(0.7782, 0.8, 0.7),
	backgroundColor: new BABYLON.Color3(0.1, 0.1, 0.133),
	lineColor: new BABYLON.Color3(0.0944, 0.09535, 0.31383),
	initialColor:{
		diffuseColor: new BABYLON.Color3(0.6, 0.5, 0.5),
		emissiveColor: new BABYLON.Color3(0.7782, 0.8, 0.7),
		backgroundColor: new BABYLON.Color3(0.1, 0.1, 0.133),
		lineColor: new BABYLON.Color3(0.1, 0.1, 0.133),
	},
	color_line_grid: new BABYLON.Color3(0, 0, 0),
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
	ribbon_visible: true,
	coloredRibbon: false,
	lines_visible: true,
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
	//rightPanelsClasses: ['fourth', 'seventh', 'eighth', 'nineth', 'fifth', 'sixth', 'onlyMainGui', 'second', 'third', 'tenth', 'eleventh'],
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

glo.params.isTimeVar = function(varName = 'w'){
	const timeVars = [this.text_input_x, this.text_input_y,
		              this.text_input_z, this.text_input_alpha, this.text_input_beta, this.text_input_suit_x,
		              this.text_input_suit_y, this.text_input_suit_z, this.text_input_suit_alpha,
		              this.text_input_suit_beta, this.text_input_suit_theta];
	this.isTimeVariable = timeVars.some(timeVar => timeVar.includes(varName));
}

glo.switchGuiSelect 	= glo.switchGuiSelect();
glo.colorType 			= glo.colorType();
glo.drawType 		    = glo.draw_type();
glo.vertexsTypes 	    = glo.vertexsTypes();
glo.coordinatesType 	= glo.coordinatesType();
glo.coordinatesNomrType = glo.coordinatesNomrType();
glo.rotType             = glo.rotateTypeGen();
glo.symmetrizeOrders    = glo.symmetrizeOrders();
glo.permutSigns         = glo.permutSigns();
glo.invPositionIfs      = glo.invPosIfs();
glo.fractalizeOrients   = glo.fractalizeOrients();
glo.colorByCurves       = glo.colorByCurves();
glo.planSelects         = glo.planSelects();
glo.fontUIs       		= glo.fontUIs();

let dataTableBody = document.getElementById('dataTableBody');

glosSave = [];