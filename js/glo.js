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

let shaderModalInstance, editor;

let g     = 0;
let w     = 0;
let wstep = 0.001;

const editorWindow = document.getElementById('shaderEditor');
let isFullscreen = false;

var num_mesh = 0;
var r = 1;
const PI = Math.PI;
const e  = Math.E;
const Z = (1+Math.sqrt(5))*0.5;
const Q = Math.SQRT2;
var glo = {
	formes:{
		selected:['Torus', 'cartesian'],
		select:[
			{text: "Catenoïd", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 96, nb_steps_v: 48,  fx: "7cosh(v/2)cu", fy: "3.5v", fz: "7cosh(v/2)su", check: false, orient: {axis: "X", direction: 1, alpha: 0, beta: -PI/8}},
			{text: "Catenoïd loop", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 96, nb_steps_v: 48,  fx: "6cosh(v/2)cu", fy: "piv", fz: "6cosh(v/2)su", beta:"cusu", theta: "cu", check: false, orient: {axis: "X", direction: 1, alpha: -PI/8, beta: PI}},
			{text: "Catenoïd twisted", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 96, nb_steps_v: 96,  fx: "6cosh(v/2)cu", fy: "piv", fz: "6cosh(v/2)su", alpha: "", theta:"G(cv + 1)", check: false, orient: {axis: "X", direction: 1, alpha: PI/4, beta: -PI/8}},
			{text: "CosSin", typeCoords: 'cartesian', udef: 6*PI, vdef: 6*PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "u", fy: "v", fz: "sucv", check: false, orient: {axis: "X", direction: -1, alpha: PI/4, beta: -PI/4, distance: 60}},
			{text: "Curve tetra", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 132, nb_steps_v: 132,  fx: "7cu", fy: "7cv", fz: "7cupv", check: false, orient: {axis: "X", direction: -1, alpha: PI/4, beta: -PI/4, distance: 100} },
			{text: "Helix", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 32, fx: "sinh(v)su", fy: "3u", fz: "-sinh(v)cu", check: false, orient: {axis: "X", direction: 1, alpha: -PI/4, beta: -PI/4}},
			{text: "Hourglass", typeCoords: 'cartesian', udef: 4*PI, vdef: PI, nb_steps_u: 132, nb_steps_v: 132,  fx: "u", fy: "usv", fz: "ucvsu", check: false, orient: {axis: "X", direction: -1, alpha: PI/4, beta: -PI/4, distance: 60}},
			{text: "Hypotenuse", typeCoords: 'cartesian', udef: 4*PI, vdef: PI, nb_steps_u: 512, nb_steps_v: 32,  fx: "uc(0.5v)/2", fy: "h(u,v)+sv - 3", fz: "h(u,v)u/12", beta: "h(u,v)/G", check: false, orient: {axis: "X", direction: 1, alpha: 0, beta: 0}},
			{text: "Moebius", typeCoords: 'cartesian', udef: PI, vdef: 1, nb_steps_u: 256, nb_steps_v: 12, fx: "7(1+ 0.5vc(0.5u))cu", fy: "7(1+ 0.5vc(0.5u))su", fz: "3.5vs(0.5u)", check: false, orient:{distance: 50}},
			{text: "Plan", typeCoords: 'cartesian', udef: 6*PI, vdef: 6*PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "u", fy: "v", fz: "", check: false, orient: {axis: "X", direction: -1, alpha: PI/4, beta: -PI/4, distance: 60}},
			{text: "Saddle", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 16, nb_steps_v: 64,  fx: "2u", fy: "2v", fz: "2uv", check: false, orient:{distance: 40}},
			{text: "Sphere", typeCoords: 'cartesian', udef: PI, vdef: PI/2, nb_steps_u: 132, nb_steps_v: 132,  fx: "7cucv", fy: "7sucv", fz: "7sv", check: false, orient:{distance: 60}},
			{text: "Torus", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 132, nb_steps_v: 32,  fx: "3(cv + e)cu", fy: "3(cv + e)su", fz: "3sv", check: true, orient: {axis: "X", direction: -1, alpha: PI/4, beta: -PI/4, distance: 60}},
			{text: "Torus square", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 132, nb_steps_v: 64,  fx: "3(cv + e)(cu)***2", fy: "3(cv + e)(su)***2", fz: "3(sv)***2", check: false, orient: {axis: "X", direction: -1, alpha: PI/4, beta: -PI/4, distance: 60}},
			{text: "Torus Meta", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 164, nb_steps_v: 32,  fx: "(cv + 10)cu", fy: "(cv + 10)su", fz: "sv", beta: "u", check: false, orient: {axis: "X", direction: -1, alpha: 0, beta: PI/8}},
			{text: "Twisted Torus", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 132, nb_steps_v: 132,  fx: "3(cv + 2)cu", fy: "3(cv + 2)su", fz: "3sv", alpha: "G(cv + Q)", beta:"G(cv + Q)", theta: "", check: false, orient: {axis: "Y", direction: 1, alpha: PI/4, beta: 0, distance: 60}},
			{text: "Waves", typeCoords: 'cartesian', udef: 9*PI, vdef: 9*PI, nb_steps_u: 512, nb_steps_v: 512,  fx: "u", fy: "v", fz: "-0.5sh(u,v)+cusvmz(1,1)0.1", beta: "h(u,v)/20", check: false, orient: {axis: "Z", direction: 1, alpha: -PI/8, beta: -PI/8}},
			{text: "Waves square", typeCoords: 'cartesian', udef: 9*PI, vdef: 9*PI, nb_steps_u: 512, nb_steps_v: 512,  fx: "u", fy: "v", fz: "0.5ch(uxT,vyT)+cusvmz(1,1)0.1", beta: "h(u,v)/20", check: false, orient: {axis: "Z", direction: 1, alpha: -PI/8, beta: -PI/8}},
			{text: "Bicylinder S", typeCoords: 'cartesian', udef: PI, vdef: PI/2, nb_steps_u: 132, nb_steps_v: 132,  fx: "7(cucv)***2", fy: "7(svcu)***2", fz: "7Q/2s(u)", alpha: "", beta: "", check: false, suit: true, orient: {axis: "X", direction: -1, alpha: 5*PI/8, beta: -PI/8, distance: 80}},
			{text: "Cube", typeCoords: 'cartesian', udef: PI, vdef: PI/2, nb_steps_u: 132, nb_steps_v: 132,  fx: "7(cucv)***2", fy: "7(sucv)***2", fz: "7Q/2(sv)***0", alpha: "", theta: "pi/4", check: false, suit: true, orient: {axis: "X", direction: -1, alpha: 3*PI/4, beta: -7*PI/6, distance: 80}},
			{text: "Egg", typeCoords: 'cartesian', udef: PI, vdef: PI/2, nb_steps_u: 133, nb_steps_v: 133,  fx: "", fy: "(pow(36 - su², 0.5) + cu)cu", fz: "4su", beta: "v", check: false, suit: true, orient: {axis: "X", direction: 1, alpha: 0, beta: -PI/8, distance: 80}},
			{text: "Glass", typeCoords: 'cartesian', udef: PI, vdef: 3*PI/8, nb_steps_u: 255, nb_steps_v: 255,  fx: "7c(u+1)c(v+1.2)", fy: "7s(u+1)c(v+1.2)", fz: "9sv", alpha: "", check: false, suit: true, orient: {axis: "X", direction: -1, alpha: 3*PI/4, beta: -7*PI/6, distance: 80}},
			{text: "Heart", typeCoords: 'cartesian', udef: 2*PI, vdef: PI, nb_steps_u: 132, nb_steps_v: 132,  fx: "16sv**3", fy: "13cv-5c(2v)-2c(3v)-c(4v)", fz: "u/8", alpha: "", check: false, suit: true, orient: {axis: "X", direction: -1, alpha: 3*PI/4, beta: -7*PI/6, distance: 40}},
			{text: "Horn", typeCoords: 'cartesian', udef: PI/2, vdef: PI/2, nb_steps_u: 132, nb_steps_v: 132,  fx: "4usv", fy: "4ucv", fz: "4(2u²-3)", beta: "u²", check: false, suit: true, orient: {axis: "X", direction: -1, alpha: 3*PI/4, beta: -7*PI/6, distance: 80}},
			{text: "Knot torus", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 256,  fx: "(cu + 10)cv", fy: "(cu + 10)sv", fz: "su", alpha: "v", beta: "v", check: false, suit: true, orient: {axis: "Z", direction: -1, alpha: PI/2.5, beta: 0, distance: 60}},
			{text: "Pseudosphere", typeCoords: 'cartesian', udef: 1.24, vdef: PI, nb_steps_u: 256, nb_steps_v: 92,  fx: "7cvcu**pi", fy: "7svcu**pi", fz: "7cpow(sinh(u), e)", alpha: "", beta: "", check: false, suit: true, orient: {axis: "X", direction: -1, alpha: 0, beta: 0, distance: 45}},
			{text: "CircleSpi", typeCoords: 'spheric', udef: 1.5*PI, vdef: PI/2, nb_steps_u: 256, nb_steps_v: 256,  fx: "u", fy: "v", fz: "exp(1/l(2a(u)))", check: false, orient: {axis: "Z", direction: 1, alpha: PI/2, beta: -PI/8}},
			{text: "Dbl tongue", typeCoords: 'spheric', udef: PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "u", fy: "v", fz: "cupvcv", check: false, orient: {axis: "X", direction: -1, alpha: -PI/8, beta: 0}},
			{text: "Dbl drop", typeCoords: 'spheric', udef: PI/2, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "cusv", fy: "ucusv", fz: "vcusv", check: false, orient: {axis: "X", direction: -1, alpha: -PI/4, beta: 0}},
			{text: "Flower", typeCoords: 'spheric', udef: PI, vdef: PI/2, nb_steps_u: 256, nb_steps_v: 256,  fx: "vh(c(u8),s(12v))", fy: "v+pi/4", fz: "u", check: false, orient: {axis: "X", direction: 1, alpha: 0, beta: -PI/4}},
			{text: "Hyperbola", typeCoords: 'spheric', udef: PI, vdef: PI, nb_steps_u: 96, nb_steps_v: 3,  fx: "1", fy: "2v", fz: "pi/8", alpha: "u", check: false, orient: {axis: "X", direction: -1, alpha: 0, beta: -PI/6}},
			{text: "Interrogation", typeCoords: 'spheric', udef: PI/2, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "u", fy: "u", fz: "v/2", alpha: "", beta: "", theta: "(cu**8)8", check: false, orient: {axis: "X", direction: 1, alpha: -3*PI/2, beta: PI}},
			{text: "Heart", typeCoords: 'spheric', udef: PI/2, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "u", fy: "u", fz: "v/2", alpha: "", beta: "", theta: "(cu**8)8suv", check: false, orient: {axis: "X", direction: 1, alpha: 0, beta: PI}},
			{text: "Nautile", typeCoords: 'spheric', udef: PI/2, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "cu", fy: "u", fz: "v", alpha: "", beta: "cv", theta: "cusu", check: false, orient: {axis: "Y", direction: -1, alpha: -5*PI/4, beta: 0} },
			{text: "Pen mine", typeCoords: 'spheric', udef: PI/2, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "(u+c(u+c(v+vsu)))", fy: "u+cu", fz: "v", check: false, orient: {axis: "Z", direction: 1, alpha: -2*PI/3, beta: -9*PI/8}},
			{text: "Propeller", typeCoords: 'spheric', udef: 4*PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "u", fy: "s(.2v)", fz: "vc(.2v)s(.2u)", check: false, orient: {axis: "X", direction: 1, alpha: 0, beta: PI, distance: 37}},
			{text: "Seashell heart", typeCoords: 'spheric', udef: PI/2, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "u(cv+1)", fy: "usv", fz: "ucv", check: false, orient: {axis: "Y", direction: -1, alpha: -5*PI/4, beta: -PI/4}},
			{text: "Sphere meridians", typeCoords: 'spheric', udef: PI, vdef: PI/2, nb_steps_u: 132, nb_steps_v: 132,  fx: "1", fy: "v", fz: "u", check: false, orient: {axis: "X", direction: 1, alpha: -PI/8, beta: -PI/8} },
			{text: "Sphere parallels", typeCoords: 'spheric', udef: PI/2, vdef: PI, nb_steps_u: 132, nb_steps_v: 132,  fx: "1", fy: "u", fz: "v", check: false, orient: {axis: "X", direction: 1, alpha: -PI/8, beta: -PI/8}},
			{text: "Sphere rosette", typeCoords: 'spheric', udef: PI, vdef: PI/2, nb_steps_u: 128, nb_steps_v: 128,  fx: "1", fy: "u-v", fz: "u+v", check: false, orient: {axis: "X", direction: 1, alpha: -PI/8, beta: -PI/8}},
			{text: "Spiral triple", typeCoords: 'spheric', udef: PI, vdef: PI, nb_steps_u: 96, nb_steps_v: 3,  fx: "u", fy: "pi/4", fz: "u+v", check: false, orient: {axis: "X", direction: 1, alpha: PI/4, beta: -PI/8}},
			{text: "Spiral penta curve", typeCoords: 'spheric', udef: PI, vdef: PI, nb_steps_u: 256, nb_steps_v: 5,  fx: "u", fy: "pi/4", fz: "2(u+v)", beta: "a(u/(3+2/3))+pi/(2**0.5)", check: false, orient: {axis: "X", direction: 1, alpha: 3.5*PI/4, beta: 0}},
			{text: "Twisted weathercock", typeCoords: 'spheric', udef: PI/2, vdef: PI, nb_steps_u: 128, nb_steps_v: 256, fx: "pi+c(12(u+v))", fy: "u", fz: "v", alpha: "", beta: "", theta: "u/1.1", check: false, orient: {axis: "X", direction: -1, alpha: PI, beta: -PI/12, distance: 20}},
			{text: "Ouroboros", typeCoords: 'spheric', udef: PI, vdef: PI/2, nb_steps_u: 256, nb_steps_v: 256, fx: "u", fy: "v", fz:"2picv²su²", alpha: "0.707cv", beta: "0.707cv", check: false, suit: true, orient: {axis: "X", direction: -1, alpha: 0, beta: 0}},
			{text: "Rosette", typeCoords: 'spheric', udef: PI/2, vdef: PI, nb_steps_u: 128, nb_steps_v: 256, fx: "c(12(u+v))", fy: "u", fz: "v", alpha: "", beta: "", check: false, suit: true,  orient: {axis: "X", direction: 1, alpha: 0, beta: -PI/4}},
			{text: "Cylinder", typeCoords: 'cylindrical', udef: PI, vdef: PI, nb_steps_u: 88, nb_steps_v: 88,  fx: "1", fy: "v", fz: "u", check: false, orient: {axis: "X", direction: 1, alpha: PI/4, beta: -PI/12}},
			{text: "Egyptian tiara", typeCoords: 'cylindrical', udef: PI/2, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "6uv²-v**3", fy: "us(fact(v))", fz: "6ucvs(60u)", check: false, orient: {axis: "Z", direction: -1, alpha: PI/8, beta: -PI/16, distance: 300}},
			{text: "Heart", typeCoords: 'cylindrical', udef: PI/2, vdef: PI*1.5, nb_steps_u: 256, nb_steps_v: 96,  fx: "uv", fy: "usv", fz: "cvs(60u)", beta: "u", check: false, orient: {axis: "X", direction: 1, alpha: PI/6, beta: -PI/12}},
			{text: "Jewel", typeCoords: 'cylindrical', udef: PI/2, vdef: PI*1.5, nb_steps_u: 256, nb_steps_v: 256,  fx: "uv", fy: "usv", fz: "cvs(60u)", beta: "v-u", check: false, orient: {axis: "X", direction: 1, alpha: 6*PI/5, beta: -PI/12}},
			{text: "Hyperbola", typeCoords: 'cylindrical', udef: PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "v²", fy: "u", fz: "v", check: false, orient: {axis: "X", direction: -1, alpha: 0, beta: -PI/12}},
			{text: "Inverse hyperbola", typeCoords: 'cylindrical', udef: PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 127,  fx: "1/(4v)", fy: "u", fz: "4v", check: false, orient: {axis: "X", direction: -1, alpha: 0, beta: -PI/12}},
			{text: "Invsin hyperbola", typeCoords: 'cylindrical', udef: PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 127,  fx: "1/(4v)", fy: "u", fz: "4v+s(6Gu)", check: false, orient: {axis: "X", direction: -1, alpha: 0, beta: -PI/12}},
			{text: "Invspin hyperbola", typeCoords: 'cylindrical', udef: PI, vdef: PI, nb_steps_u: 63, nb_steps_v: 161,  fx: "1/(12v)", fy: "u", fz: "(8+2/3)v", beta: "3vsi(v)/2", check: false, orient: {axis: "X", direction: -1, alpha: PI/4, beta: -PI/12}},
			{text: "Moebius", typeCoords: 'cylindrical', udef: PI, vdef: 1, nb_steps_u: 132, nb_steps_v: 132,  fx: "(1+ 0.5vc(0.5u))cu", fy: "(1+ 0.5vc(0.5u))su", fz: "0.5vs(0.5u)", check: false, orient: {axis: "X", direction: -1, alpha: PI/3, beta: -PI/12, distance: 5}},
			{text: "Spiral 1", typeCoords: 'cylindrical', udef: PI, vdef: PI, nb_steps_u: 32, nb_steps_v: 64,  fx: "u", fy: "v", fz: "v", check: false, orient: {axis: "X", direction: -1, alpha: PI/4, beta: -PI/4, distance: 60}},
			{text: "Spiral 2", typeCoords: 'cylindrical', udef: 6*PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "u", fy: "v", fz: "3v+sufv", beta: "c(60u)/12", check: false, orient: {axis: "X", direction: -1, alpha: PI/4, beta: -PI/4, distance: 60}},
			{text: "Spiral 3", typeCoords: 'cylindrical', udef: 6*PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "uc(0.5v)/2", fy: "u+v", fz: "abs(u)u/12", check: false, orient: {axis: "X", direction: 1, alpha: PI/4, beta: -PI/8, distance: 80}},
			{text: "Spiral 4", typeCoords: 'cylindrical', udef: PI/2, vdef: PI/2, nb_steps_u: 256, nb_steps_v: 256,  fx: "4uv", fy: "pi", fz: "u", alpha: "", beta: "ch(u,v)pi", theta: "v", check: false, orient: {axis: "X", direction: 1, alpha: PI/4, beta: -PI/8, distance: 80}},
			{text: "Loop spiral", typeCoords: 'curvature', udef: PI, vdef: PI, nb_steps_u: 528, nb_steps_v: 92,  fx: "1", fy: "u+v²", fz: "u-v²", alpha: "", beta: "", check: false, orient: {axis: "Y", direction: 1, alpha: PI/4, beta: -PI/8, distance: 80}},
			{text: "Ashtray", typeCoords: 'quaternion', udef: 4*PI, vdef: PI, nb_steps_u: 266, nb_steps_v: 264,  fx: "u", fy: "usv", fz: "ucvsu", alpha: "u", beta: "pi", check: false, orient: {axis: "X", direction: 1, alpha: PI/4, beta: -PI/6}},
			{text: "Curve", typeCoords: 'quaternion', udef: PI/2, vdef: PI/2, nb_steps_u: 256, nb_steps_v: 256,  fx: "ch(u,v)12", fy: "ch(u,v)", fz: "sh(u,v)", alpha: "ch(u,v)", beta: "pih(u,v)12", check: false, orient: {axis: "X", direction: -1, alpha: 0, beta: PI/6}},
			{text: "Helix", typeCoords: 'quaternion', udef: PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "v", fy: "u", fz: "v", alpha: "G", beta: "pi", check: false, orient: {axis: "X", direction: -1, alpha: PI/4, beta: -PI/4, distance: 60}},
			{text: "Helix II", typeCoords: 'quaternion', udef: 2*PI, vdef: PI/2, nb_steps_u: 528, nb_steps_v: 64,  fx: "u", fy: "v", fz: "cu", alpha: "su", beta: "v", check: false, orient: {axis: "X", direction: -1, alpha: PI/4, beta: -PI/4, distance: 60}},
			{text: "Horn", typeCoords: 'quaternion', udef: PI, vdef: PI, nb_steps_u: 256, nb_steps_v: 256,  fx: "v", fy: "u²+v²", fz: "u²-v²", alpha: "h(u,v)", beta: "u", check: false, orient: {axis: "X", direction: -1, alpha: PI/4, beta: -PI/4, distance: 60}},
			{text: "Line", typeCoords: 'quaternion', udef: 6*PI, vdef: 6*PI, nb_steps_u: 512, nb_steps_v: 512,  fx: "u", fy: "u", fz: "v", alpha: "", beta: "vcu/8", check: false, orient: {axis: "X", direction: -1, alpha: PI/4, beta: -PI/4, distance: 60}},
			{text: "Moebius", typeCoords: 'quaternion', udef: 6*PI, vdef: PI, nb_steps_u: 256, nb_steps_v: 64,  fx: "h(u, v)", fy: "h(u, v)", fz: "v²", alpha: "h(O, u)", beta: "h(O, u)", check: false, orient: {axis: "X", direction: -1, alpha: PI/4, beta: -PI/4, distance: 60}},
			{text: "Ribbon", typeCoords: 'quaternion', udef: 0, vdef: PI/2, nb_steps_u: 1, nb_steps_v: 512,  fx: "hc(u,v)", fy: "u***0", fz: "", alpha: "hc(u,v)", beta: "pihc(u,v)", check: false, orient: {axis: "Z", direction: 1, alpha: PI/16, beta: -PI/16}},
			{text: "Shell", typeCoords: 'quaternion', udef: 6*PI, vdef: 6*PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "u", fy: "u", fz: "v", alpha: "", beta: "u", check: false, orient: {axis: "Z", direction: -1, alpha: PI/8, beta: -PI/12}},
			{text: "Spaceship", typeCoords: 'quaternion', udef: 2*PI, vdef: 2*PI, nb_steps_u: 132, nb_steps_v: 132,  fx: "h(u+v, u-v)", fy: "u", fz: "v", alpha: "uv", beta: "piG", check: false, orient: {axis: "X", direction: 1, alpha: PI/8, beta: -PI/6}},
			{text: "Sphere", typeCoords: 'quaternion', udef: PI/2, vdef: PI/2, nb_steps_u: 128, nb_steps_v: 128,  fx: "1", fy: "cucv", fz: "sucv", alpha: "7sv", beta: "pi", check: false, orient: {axis: "X", direction: -1, alpha: 9*PI/8, beta: -PI/8}},
			{text: "Sphere tetra", typeCoords: 'quaternion', udef: PI, vdef: PI/2, nb_steps_u: 264, nb_steps_v: 264,  fx: "1", fy: "cu", fz: "cv", alpha: "cupv", beta: "pi", check: false, orient: {axis: "X", direction: -1, alpha: PI, beta: -PI/8}},
			{text: "Spiral", typeCoords: 'quaternion', udef: 2*PI, vdef: 2*PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "uv", fy: "v", fz: "h(u,v)", alpha: "h(u,v)", beta: "h(u,v)", check: false, orient: {axis: "X", direction: -1, alpha: PI/2, beta: 0, distance: 120}},
			{text: "Ying-Yang", typeCoords: 'quaternion', udef: 2*PI, vdef: (11/6)*PI, nb_steps_u: 128, nb_steps_v: 128,  fx: "u", fy: "v", fz: "h(u,v)", alpha: "h(u,v)", beta: "h(u,v)", check: false, orient: {axis: "X", direction: -1, alpha: PI/2, beta: PI/12, distance: 30}},
			{text: "Jewel", typeCoords: 'quaternionRotAxis', udef: PI/2, vdef: PI/2, nb_steps_u: 132, nb_steps_v: 132,  fx: "1u²", fy: "u", fz: "v", alpha: "pi", beta: "cusv", check: false, orient: {axis: "Y", direction: -1, alpha: PI/6, beta: 0, distance: 80}},
			{text: "Flower", typeCoords: 'quaternionRotAxis', udef: PI/2, vdef: PI/2, nb_steps_u: 128, nb_steps_v: 128,  fx: "h(u,v)", fy: "sh(u,v)u", fz: "sh(u,v)v", alpha: "sh(u,v)vu", beta: "", check: false, orient: {axis: "Y", direction: -1, alpha: PI/4, beta: PI}},
			{text: "Flower2", typeCoords: 'quaternionRotAxis', udef: PI/2, vdef: PI/2, nb_steps_u: 264, nb_steps_v: 264,  fx: "sh(c(0.5u)G,c(0.5v)G)", fy: "sh(cu,cv)v", fz: "sh(u,v)u", alpha: "sh(u,v)vu", beta: "", check: false, orient: {axis: "Y", direction: -1, alpha: PI/4, beta: 0, distance: 30}},
			{text: "Shell", typeCoords: 'quaternionRotAxis', udef: 4.5*PI, vdef: PI/2, nb_steps_u: 256, nb_steps_v: 256,  fx: "u", fy: "u", fz: "v", alpha: "1", beta: "", check: false, orient: {axis: "Y", direction: -1, alpha: PI/6, beta: 0}},
			{text: "Sphere", typeCoords: 'quaternionRotAxis', udef: PI/2, vdef: PI/2, nb_steps_u: 128, nb_steps_v: 128,  fx: "1", fy: "u", fz: "v", alpha: "pi", beta: "", check: false, orient: {axis: "X", direction: 1, alpha: 8*PI/7, beta: -PI/12}},
		],
		setFormeSelect: async function(txt, coordsType, draw = true){
			for (const sel of this.select) {
				if(sel.text == txt && sel.typeCoords == coordsType){
					sel.check = true;
					glo.nameRadioToHisto = 'Radio ' + sel.text;
					if(draw){
						glo.HDstepUV = false;
						if(glo.normalMode){ resetInputsRibbonEquations(); }

						var falpha = typeof(sel.alpha) != "undefined" ? falpha = sel.alpha  : falpha = "";
						var fbeta  = typeof(sel.beta)  != "undefined" ? fbeta  = sel.beta   : fbeta  = "";
						var ftheta = typeof(sel.theta) != "undefined" ? ftheta = sel.theta : ftheta = "";

						glo.fromHisto = true;
						glo.params.text_input_x = sel.fx;
						glo.params.text_input_y = sel.fy;
						glo.params.text_input_z = sel.fz;

						if(glo.params.updateRots){
							glo.params.text_input_suit_alpha = falpha;
							glo.params.text_input_suit_beta  = fbeta;
							glo.params.text_input_suit_theta = ftheta;
						}
						glo.params.u = sel.udef;
						glo.params.v = sel.vdef;

						if(!glo.normalMode){
							glo.input_x.text = sel.fx;
							glo.input_y.text = sel.fy;
							glo.input_z.text = sel.fz;
							if(glo.params.updateRots){
								glo.input_suit_alpha.text = falpha;
								glo.input_suit_beta.text  = fbeta;
								glo.input_suit_theta.text = ftheta;
							}
						}

						glo.slider_nb_steps_u.maximum = sel.nb_steps_u * 2;
						glo.slider_nb_steps_v.maximum = sel.nb_steps_v * 2;
						glo.slider_u.maximum          = sel.udef * 2;
						glo.slider_v.maximum          = sel.vdef * 2;

						if(glo.slider_nb_steps_u.maximum < 256){ glo.slider_nb_steps_u.maximum = 256; }
						if(glo.slider_nb_steps_v.maximum < 256){ glo.slider_nb_steps_v.maximum = 256; }
						if(glo.slider_u.maximum < 2*Math.PI){ glo.slider_u.maximum = 2*Math.PI; }
						if(glo.slider_v.maximum < 2*Math.PI){ glo.slider_v.maximum = 2*Math.PI; }

						glo.params.steps_u = !glo.meshWithTubes ? sel.nb_steps_u : round(sel.nb_steps_u/4, 0);
						glo.params.steps_v = !glo.meshWithTubes ? sel.nb_steps_v : round(sel.nb_steps_v/4, 0);

						glo.slider_nb_steps_u.value = glo.params.steps_u; glo.slider_nb_steps_u.startValue = glo.params.steps_u;
						glo.slider_nb_steps_v.value = glo.params.steps_v; glo.slider_nb_steps_v.startValue = glo.params.steps_v;
						glo.slider_u.value = sel.udef; glo.slider_u.startValue = sel.udef;
						glo.slider_v.value = sel.vdef; glo.slider_v.startValue = sel.vdef;
						glo.fromHisto = false;

						glo.toHisto = true;
						if(!glo.dim_one){
							if(glo.params.uvToXy){ uvToXy(false); }
							const fractalize = glo.params.fractalize;
							if(!glo.normalMode){ await make_curves(undefined, undefined, undefined, undefined, fractalize.actived); }
							else{
								glo.fromSlider = true; await make_curves(undefined, undefined, undefined, undefined, fractalize.actived);
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
		{ exp: /à(?![\(])/g, upd: "à()" },
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
		{ exp: /c([^u\(v]*)u/g, upd: "cos($1u)" },
		{ exp: /c([^v\(u]*)v/g, upd: "cos($1v)" },
		{ exp: /s([^u\(v]*)u/g, upd: "sin($1u)" },
		{ exp: /s([^v\(u]*)v/g, upd: "sin($1v)" },
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
		{ exp: /g([^,%*+-/)])/g, upd: "g*$1" },
		{ exp: /w([^,%*+-/)])/g, upd: "w*$1" },
		{ exp: /µP([^,%*+-/)])/g, upd: "µP*$1" },
		{ exp: /µN([^,%*+-/)])/g, upd: "µN*$1" },
		{ exp: /\$N([^,%*+-/)])/g, upd: "$N*$1" },
		{ exp: /\$P([^,%*+-/)])/g, upd: "$P*$1" },
		{ exp: /x([^,%*+-/NPT)])/g, upd: "x*$1" },
		{ exp: /y([^,%*+-/NPT)])/g, upd: "y*$1" },
		{ exp: /z([^,%*+-/NPT)])/g, upd: "z*$1" },
		{ exp: /n([^,%*+-/d)])/g, upd: "n*$1" },
		{ exp: /r([^,%*+-/nmC)])/g, upd: "r*$1" },
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
		const coordinates = ['spheric', 'cylindrical', 'curvature', 'cartesian'];
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
	guiSelect: 'fourth',
	switchGuiSelect: function* (){
	  var index = 0;
	  var tab = ['fourth', 'seventh', 'eighth', 'nineth', 'fifth', 'sixth', 'onlyMainGui', 'second', 'third', 'tenth', 'eleventh'];
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
	histo: {
		init: function(){ this.content[0].params = deepCopy(glo.params); },
		content: [],
		index_go: 0,
		save: function(){
			if(glo.toHisto && !glo.fromHisto){
				var prs = deepCopy(glo.params);
				var f = {
					x: glo.input_x.text,
					y: glo.input_y.text,
					z: glo.input_z.text,
					alpha: glo.input_alpha.text,
					beta: glo.input_beta.text,
				};
				var toInsert = {
					params: prs,
					f: f,
					coordsType: glo.coordsType,
					u: glo.params.u,
					v: glo.params.v,
					steps_u: glo.params.steps_u,
					steps_v: glo.params.steps_v,
					steps_umax: glo.slider_nb_steps_u.maximum,
					steps_vmax: glo.slider_nb_steps_v.maximum,
					umax: glo.slider_u.maximum,
					vmax: glo.slider_v.maximum,
					nameRadioToHisto: glo.nameRadioToHisto,
				};

				const contentLength = this.content.length;

				if(contentLength){
					var lastContent = this.content[contentLength - 1 - this.index_go];
					var toHisto     = false;
					for(var prop in f){
						if(f[prop] != lastContent.f[prop]){ toHisto = true; }
					}
					for(var prop in toInsert){
						if(prop != "f" && prop != "nameRadioToHisto"){
							if(toInsert[prop] != lastContent[prop]){ toHisto = true; }
						}
					}
					if(toInsert.nameRadioToHisto != lastContent["nameRadioToHisto"] && toInsert.nameRadioToHisto != ""){ toHisto = true; }
					if(toHisto){
						this.content.splice(contentLength - this.index_go, 0, toInsert);
						glo.nameRadioToHisto == '';
					}
				}
				else{
					this.content.push(toInsert);
				}
			}
		},
		go: function(direction){
			var contentLength = this.content.length;
			var good = true;

			if(!isNaN(direction)){
				if(direction == -1){
					this.index_go++;
					if(this.index_go > contentLength - 1){ this.index_go = contentLength - 1; good = false; }
				}
				else{
					this.index_go--;
					if(this.index_go < 0){ this.index_go = 0; good = false; }
				}
			}
			else{
				this.index_go = direction === 'start' ? contentLength - 1 : 0;
			}

			if(good){
				var fromHistoSave = glo.fromHisto;
				var toHistoSave = glo.toHisto;
				glo.fromHisto = true;
				glo.toHisto = false;
				var content = this.content[contentLength - 1 - this.index_go];
				var x = content.f.x;
				var y = content.f.y;
				var z = content.f.z;
				var alpha = content.f.alpha;
				var beta = content.f.beta;

				glo.params = deepCopy(content.params);

				glo.input_x.text = x;
				glo.input_y.text = y;
				glo.input_z.text = z;
				glo.input_alpha.text = alpha;
				glo.input_beta.text = beta;
				glo.slider_nb_steps_u.maximum = content.steps_umax;
				glo.slider_nb_steps_v.maximum = content.steps_vmax;
				glo.slider_u.maximum = content.umax;
				glo.slider_v.maximum = content.vmax;
				glo.slider_u.value = content.u;
				glo.slider_v.value = content.v;
				glo.slider_nb_steps_u.value = content.steps_u;
				glo.slider_nb_steps_v.value = content.steps_v;

				if(glo.coordsType != content.coordsType){
					glo.coordsType = content.coordsType;
					this.setGoodCoords(glo.coordsType);
				}

				if(content.nameRadioToHisto != ''){ glo.radios_formes.setCheckByName(content.nameRadioToHisto); }

				glo.fromHisto = fromHistoSave;
				glo.toHisto   = toHistoSave;

				remakeRibbon(glo.params.fractalize.actived, false);
			}
		},
		goBack: function(){
			if(this.content.length > 0){
				this.go(-1);
			}
		},
		goTo: function(){
			if(this.content.length > 0){
				this.go(1);
			}
		},
		make: function(number){
			var content = this.content[number];
			var x = content.f.x;
			var y = content.f.y;
			var z = content.f.z;
			var alpha = content.f.alpha;
			var beta = content.f.beta;

			glo.input_x.text = x; glo.input_y.text = y; glo.input_z.text = z;
			glo.params.text_input_x = x; glo.params.text_input_y = y; glo.params.text_input_z = z;
			glo.input_alpha = alpha; glo.input_beta = beta;
			glo.params.text_input_alpha = alpha; glo.params.text_input_beta = beta;

			if(glo.coordsType != content.coordsType){
				glo.coordsType = content.coordsType;
				this.setGoodCoords(glo.coordsType);
			}

			glo.slider_nb_steps_u.maximum = content.steps_umax;
			glo.slider_nb_steps_v.maximum = content.steps_vmax;
			glo.slider_u.maximum = content.umax;
			glo.slider_v.maximum = content.vmax;
			glo.slider_u.value = content.u;
			glo.slider_v.value = content.v;
			glo.slider_nb_steps_u.value = content.steps_u;
			glo.slider_nb_steps_v.value = content.steps_v;
			
			make_curves();
		},
		setGoodCoords: function(coordsType){
			while(coordsType != glo.coordinatesType.next().value){}
			switchDrawCoordsType(false);
      add_radios();
		},
	},
	histoColo: {
		content: [],
		index_go: 0,
		save: function(){
			if(glo.toHisto && !glo.fromHisto){
				var toHisto = true;
				var content = this.content;
				var contentLength = content.length;
				if(contentLength > 0){
					toHisto = false;
					var lastContent = content[contentLength - 1];
					for(var prop in lastContent){
						if(lastContent[prop] != glo.params[prop]){ toHisto = true; }
					}
				}
				if(toHisto){
					var toInsert = {};
					var toInsert = deepCopy(glo.params);
					content.splice(contentLength - this.index_go, 0, toInsert);
				}
			}
		},
		go: function(direction){
			var contentLength = this.content.length;
			var good = true;
			if(direction == -1){
				this.index_go++;
				if(this.index_go > contentLength - 1){ this.index_go = contentLength - 1; good = false; }
			}
			else{
				this.index_go--;
				if(this.index_go < 0){ this.index_go = 0; good = false; }
			}
			if(good){
				var fromHistoSave = glo.fromHisto;
				var toHistoSave = glo.toHisto;
				glo.fromHisto = true;
				glo.toHisto = false;
				var content = this.content[contentLength - 1 - this.index_go];

				var cts = glo.allControls;
				var prs = glo.params;

				prs.saturation = content.saturation;
				prs.tint = content.tint;
				prs.rotAlpha = content.rotAlpha;
				prs.rotBeta = content.rotBeta;
				prs.rColor = content.rColor;
				prs.gColor = content.gColor;
				prs.bColor = content.bColor;
				prs.itColors = content.itColors;
				prs.text_input_color_x = content.text_input_color_x;
				prs.text_input_color_y = content.text_input_color_y;
				prs.text_input_color_z = content.text_input_color_z;
				prs.text_input_color_alpha = content.text_input_color_alpha;
				prs.text_input_color_beta = content.text_input_color_beta;
				if(typeof(glo.playWithColMode) == "undefined"){ glo.playWithColMode = playWithColNextMode(); }
				var playWithColorMode = content.playWithColorMode;
				while(playWithColorMode != glo.playWithColMode.next().value){}
				prs.playWithColors = content.playWithColors;
				prs.playWithColorsAll = content.playWithColorsAll;
				prs.colors2 = content.colors2;
				prs.colorsByRotate = content.colorsByRotate;

				cts.getByName("saturationSlider").value = prs.saturation;
				cts.getByName("tintSlider").value = prs.tint;
				cts.getByName("rotAlphaSlider").value = prs.rotAlpha;
				cts.getByName("rotBetaSlider").value = prs.rotBeta;
				cts.getByName("rColorSlider").value = prs.rColor;
				cts.getByName("gColorSlider").value = prs.gColor;
				cts.getByName("bColorSlider").value = prs.bColor;
				cts.getByName("itColorsSlider").value = prs.itColors;
				cts.getByName("inputColorX").text = prs.text_input_color_x;
				cts.getByName("inputColorY").text = prs.text_input_color_y;
				cts.getByName("inputColorZ").text = prs.text_input_color_z;
				cts.getByName("inputColorAlpha").text = prs.text_input_color_alpha;
				cts.getByName("inputColorBeta").text = prs.text_input_color_beta;

				for(let prop in content){
					const val = content[prop];
					let ctrl  = glo.allControls.getByName(prop);
					if(typeof val !== 'object' && typeof val !== 'function' && typeof val !== 'boolean' && ctrl){
						ctrl.value = val;
						prs[prop]  = val;
					}	
				}

				make_ribbon();

				glo.fromHisto = fromHistoSave;
				glo.toHisto = toHistoSave;
			}
		},
		goBack: function(){
			if(this.content.length > 0){
				this.go(-1);
			}
		},
		goTo: function(){
			if(this.content.length > 0){
				this.go(1);
			}
		},
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
	sliderGainSign: 0,
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
		M: 1,
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
		text_input_color_x: "cu",
		text_input_color_y: "cv",
		text_input_color_z: "",
		text_input_color_alpha: "",
		text_input_color_beta: "",
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
				nx: 1,
				y:  0,
				ny: 1,
				z:  0,
				nz: 1,
			}
		},
		fractalize:{
			actived: false,
			refractalize: false,
			scaleToDistPath: false,
			lineOnNewMeshes: true,
			scale: {
				all: 1,
				x: 1,
				y: 1,
				z: 1,
			},
			scalePow: 2,
			steps:{
				u: 12,
				v: 12,
			},
			rot:{
				x: 0,
				y: 0,
				z: 0,
			},
			scalePart:{
				successive: 1,
				ortho: 1,
			},
			fractalized:{
				steps:{
					u: 12,
					v: 12,
				}
			}
		},
		invPos: {x: false, y: false, z: false},
		quaternionByRotR: false,
		wOnXYZ: true,
		gridScale: true,
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
				color : '#eee',
			},
			button:{
				width      : '9px',
				height     : '9px',
				background : '#41a69a',
				color      : '#f5e7cb',
			},
		},
	},
	tubes: {
		radius: 0.05,
		coeffRadiusVariation: Math.pow(2, 1/3),
	},
	bgActivedButtons: ['GridScale', 'updateRots'],
	cutRibbon: {x: false, y: false, z: false},
	centerSymmetry: {x: 0, y: 0, z: 0},
	rotate_speed: 0.5/180 * PI,
	ribbon_alpha: 1,
	rot_z: 0,
	rotateType: 'none',
	nameRadioToHisto: '',
	axis_size: 30,
	planSize: 40,
	scaleNorm: 1,
	buttonBottomSize: 90,
	buttonBottomHeight: 30,
	buttonBottomPaddingLeft: 12,
	panelBottomButtonTop: 44.25,
	topRadiosStart: 67,
	topLineDimStart: 3.75,
	mainTopShift: 6.66,
	shiftLineDim: 0.33,
	shiftRadios: 0.88,
	color_text_input: "rgb(255,255,245)",
	buttons_background: "#199191",
	buttons_color: "rgb(255,255,225)",
	labelGridColor: "black",
	buttons_radius: 10,
	buttons_fontsize: "16px",
	diffuseColor: new BABYLON.Color3(0.6, 0.5, 0.5),
	emissiveColor: new BABYLON.Color3(0.3, 0.5, 0.5),
	backgroundColor: new BABYLON.Color3(0, 77/2048, 77/4096),
	lineColor: new BABYLON.Color3(1, 1, 1),
	color_line_grid: new BABYLON.Color3(0, 0, 0),
	firstPoint: new BABYLON.Vector3(1, 0, 0),
	angleToUpdateRibbon: {x: 0, y: 0},
	pickers_size: 107,
	numRibbon: 0,
	scaleVertex: 1,
	fullScreen: false,
	gui_visible: true,
	gui_suit_visible: false,
	fromHisto: false,
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
	rightPanelsClasses: ['fourth', 'seventh', 'eighth', 'nineth', 'fifth', 'sixth', 'onlyMainGui', 'second', 'third', 'tenth', 'eleventh'],
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

let dataTableBody = document.getElementById('dataTableBody');

glosSave = [];