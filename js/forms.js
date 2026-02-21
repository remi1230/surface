const PI = Math.PI;
const e  = Math.E;
const Z  = (1+Math.sqrt(5))*0.5;
const Q  = Math.SQRT2;

const formsToselect = [
    {text: "Catenoïd", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 96, nb_steps_v: 48,
        fx: "cosh(v/2)cu", fy: ".5v", fz: "cosh(v/2)su", check: false,
        orient: {distance: 12.5, axis: "X", direction: 1, alpha: 0, beta: -PI/8},
        lighting: {pos:{x: 2.5, y: -0.25, z: 1}, intensity: 2.5, specular: {intensity: 4, power: 1.75}}
    },
    {text: "Catenoïd loop", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 96, nb_steps_v: 48,
        fx: "cosh(v/2)cu", fy: "(1/6)piv", fz: "cosh(v/2)su", alpha: "cu", beta:"cusu", theta: "", check: false,
        orient: {distance: 12.5, axis: "X", direction: 1, alpha: -PI/8, beta: PI},
        lighting: {pos:{x: 0, y: -1, z: 0.33}, intensity: 1.5, specular: {intensity: 4, power: 1.75}}
    },
    {text: "Catenoïd twisted", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 96, nb_steps_v: 96,
        fx: "cosh(v/2)cu", fy: "(1/6)piv", fz: "cosh(v/2)su", alpha: "G(c(vct)+1)", beta:"t", theta: "t", check: false,
        orient: {distance: 12.5, axis: "X", direction: 1, alpha: PI/2, beta: -PI/6}},
    {text: "CosSin", typeCoords: 'cartesian', udef: 6*PI, vdef: 6*PI, nb_steps_u: 128, nb_steps_v: 128,
        fx: ".125u", fy: ".125v", fz: ".125s(u+t)c(v+t)", check: false,
        orient: {axis: "X", direction: -1, alpha: PI/4, beta: -PI/4, distance: 10},
        lighting: {pos:{x: 0, y: 0, z: 1}, intensity: 1.75, specular: {intensity: 4, power: 1.75}}
    },
    {text: "Curve tetra", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,
        fx: "c(u+.001)", fy: "cv", fz: "cupv", check: false,
        orient: {axis: "X", direction: -1, alpha: PI/3, beta: -PI/4, distance: 8} },
    {text: "Helix", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 32,
        fx: "(1/3)sinh(v)su", fy: "u", fz: "-(1/3)sinh(v)cu", check: false,
        orient: {distance: 20, axis: "X", direction: 1, alpha: -PI/4, beta: -PI/4},
        lighting: {pos:{x: 1, y: 3.5, z: 0}, intensity: 2.5, specular: {intensity: 4, power: 1.75}}
    },
    {text: "Hourglass", typeCoords: 'cartesian', udef: 4*PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,
        fx: ".3u", fy: ".3usv", fz: ".3ucvsu", check: false,
        orient: {axis: "X", direction: -1, alpha: PI/4, beta: -PI/4, distance: 20},
        lighting: {pos:{x: 3.5, y: -3.5, z: 2}, intensity: 5, specular: {intensity: 4, power: 1.75}}
    },
    {text: "Hypotenuse", typeCoords: 'cartesian', udef: 4*PI, vdef: PI, nb_steps_u: 512, nb_steps_v: 32,
        fx: ".125uc(0.5v)/2", fy: "-(.125(h(u,v)+sv - 3)-0.66)", fz: ".125h(u,v)u/12", beta: "h(u,v)/G", check: false,
        orient: {distance: 7, axis: "X", direction: 1, alpha: 0, beta: -PI/8},
        lighting: {pos:{x: 0, y: 1.75, z: 0}, intensity: 1.33, specular: {intensity: 4, power: 1.75}}
    },
    {text: "Moebius", typeCoords: 'cartesian', udef: PI, vdef: 1, nb_steps_u: 256, nb_steps_v: 12,
        fx: "(1+ 0.5vc(0.5u))cu", fy: "(1+ 0.5vc(0.5u))su", fz: ".5vs(0.5u)", check: false,
        orient:{distance: 6, beta: -PI/6}},
    {text: "Plan", typeCoords: 'cartesian', udef: 6*PI, vdef: 6*PI, nb_steps_u: 128, nb_steps_v: 128,
        fx: ".125u", fy: ".125v", fz: "", check: false,
        orient: {axis: "X", direction: -1, alpha: PI/4, beta: -PI/4, distance: 10},
        lighting: {pos:{x: 0, y: 0, z: 1}, intensity: 1.75, specular: {intensity: 4, power: 1.75}}
    },
    {text: "Saddle", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 16, nb_steps_v: 64,
        fx: ".25u", fy: ".25v", fz: ".25uv", check: false, orient:{distance: 8, alpha: 9*PI/16, beta: -2*PI/7},
        lighting: {pos:{x: 0, y: 0, z: 0.8}, intensity: 1.5, specular: {intensity: 4, power: 1.75}}
    },
    {text: "Sphere", typeCoords: 'cartesian', udef: PI, vdef: PI/2, nb_steps_u: 128, nb_steps_v: 128,
        fx: "2cucv", fy: "2sucv", fz: "2sv", check: false,
        orient:{distance: 10},
        lighting: {pos:{x: 0, y: 0, z: 1.33}, intensity: 2, specular: {intensity: 4, power: 1.75}}
    },
    {text: "Torus", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 32,
        fx: "(cv + e)cu", fy: "(cv + e)su", fz: "sv", check: true,
        orient: {axis: "X", direction: -1, alpha: PI/4, beta: -PI/5, distance: 16.66},
        lighting: {pos:{x: 0, y: 0, z: 0.8}, intensity: 1.5, specular: {intensity: 4, power: 1.75}}
    },
    {text: "Torus square", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 64,
        fx: "(cv + e)(cu)***2", fy: "(cv + e)(su)***2", fz: "(sv)***2", check: false,
        orient: {axis: "X", direction: -1, alpha: PI/4, beta: -PI/4, distance: 16.66},
        lighting: {pos:{x: 0, y: 0, z: 0.8}, intensity: 1.5, specular: {intensity: 4, power: 1.75}}
    },
    {text: "Torus Meta", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 164, nb_steps_v: 32,
        fx: ".125(cv + 10)cu", fy: ".125(cv + 10)su", fz: ".125sv", beta: "u", check: false,
        orient: {axis: "X", direction: -1, alpha: 0, beta: PI/8, distance: 6},
        lighting: {pos:{x: 3, y: 0, z: 0}, intensity: 1, specular: {intensity: 4, power: 1.75}}
    },
    {text: "Twisted Torus", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,
        fx: "(cv + 2)cu", fy: "(cv + 2)su", fz: "sv", alpha: "G(cv)", beta:"G(cv)", theta: "", check: false,
        orient: {axis: "X", direction: 1, alpha: PI/2, beta: 0, distance: 15},
        lighting: {pos:{x: 0, y: 3.5, z: 0.75}, intensity: 2, specular: {intensity: 4, power: 1.75}}
    },
    {text: "Waves", typeCoords: 'cartesian', udef: 9*PI, vdef: 9*PI, nb_steps_u: 128, nb_steps_v: 128,
        fx: ".125u", fy: ".125v", fz: ".375(s(h(u,v)))c.5t", theta: "xc.5t", check: false,
        orient: {distance: 15, axis: "Y", direction: 1, alpha: 0, beta: -PI/4},
        lighting: {pos:{x: 0, y: 0, z: 1}, intensity: 1.5, specular: {intensity: 4, power: 1.75}}
    },
    {text: "Bicylinder S", typeCoords: 'cartesian', udef: PI, vdef: PI/2, nb_steps_u: 128, nb_steps_v: 128,
        fx: "(cucv)***2", fy: "(svcu)***2", fz: "Q/2s(u)", alpha: "", beta: "", check: false, suit: true,
        orient: {axis: "X", direction: -1, alpha: 5*PI/8, beta: -PI/8, distance: 6},
        lighting: {pos:{x: 0, y: 0, z: 1.5}, intensity: 3, specular: {intensity: 4, power: 1.75}}
    },
    {text: "Cube", typeCoords: 'cartesian', udef: PI, vdef: PI/2, nb_steps_u: 128, nb_steps_v: 128,
        fx: "(cucv)***2", fy: "(sucv)***2", fz: "Q/2(sv)***0", alpha: "", check: false, suit: true,
        orient: {axis: "X", direction: -1, alpha: 5*PI/8, beta: -PI/8, distance: 6},
        lighting: {pos:{x: 0, y: 0, z: 1.5}, intensity: 3, specular: {intensity: 4, power: 1.75}}
    },
    {text: "Egg", typeCoords: 'cartesian', udef: PI, vdef: PI/2, nb_steps_u: 128, nb_steps_v: 128,
        fx: "", fy: "((pow(36 - su², 0.5) + cu)cu)/4-0.225", fz: "su", beta: "v", check: false, suit: true,
        orient: {axis: "X", direction: 1, alpha: 0, beta: -PI/8, distance: 15},
        lighting: {pos:{x: 0, y: 2.5, z: 0}, intensity: 1.5, specular: {intensity: 4, power: 1.75}}
    },
    {text: "Glass", typeCoords: 'cartesian', udef: PI, vdef: 3*PI/8, nb_steps_u: 128, nb_steps_v: 128,
        fx: "c(u+1)c(v+1.2)", fy: "s(u+1)c(v+1.2)", fz: "(9/7)sv", alpha: "", check: false, suit: true,
        orient: {axis: "X", direction: -1, alpha: 3*PI/4, beta: -7*PI/6, distance: 8},
        lighting: {pos:{x: 3, y: 0, z: 0}, intensity: 1.75, specular: {intensity: 4, power: 1.75}}
    },
    {text: "Heart", typeCoords: 'cartesian', udef: 2*PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,
        fx: "sv**3", fy: "-(13cv-5c(2v)-2c(3v)-c(4v))/16", fz: "u/128", alpha: "", check: false, suit: true,
        orient: {axis: "Z", direction: -1, alpha: 3*PI/4, beta: -7*PI/6, distance: 5},
        lighting: {pos:{x: 1.5, y: -2.5, z: 0}, intensity: 5, specular: {intensity: 4, power: 2}}
    },
    {text: "Horn", typeCoords: 'cartesian', udef: PI/2, vdef: PI/2, nb_steps_u: 128, nb_steps_v: 128,
        fx: "usv", fy: "ucv", fz: "(2u²-3)-0.5", beta: "u²", check: false, suit: true,
        orient: {axis: "X", direction: -1, alpha: 3*PI/4, beta: -7*PI/6, distance: 10},
        lighting: {pos:{x: 0, y: 0, z: -1.5}, intensity: 5, specular: {intensity: 4, power: 2}}
    },
    {text: "Knot torus", typeCoords: 'cartesian', udef: PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 256,
        fx: ".25(cu + 10)cv", fy: ".25(cu + 10)sv", fz: ".25su", alpha: "v", beta: "v", check: false, suit: true,
        orient: {axis: "Z", direction: -1, alpha: PI/2.5, beta: 0, distance: 10},
        lighting: {pos:{x: -5, y: -0.5, z: 0}, intensity: 3, specular: {intensity: 4, power: 2}}
    },
    {text: "Pseudosphere", typeCoords: 'cartesian', udef: 1.24, vdef: PI, nb_steps_u: 256, nb_steps_v: 92,
        fx: "cvcu**pi", fy: "svcu**pi", fz: "cpow(sinh(u), e)", alpha: "", beta: "", check: false, suit: true,
        orient: {axis: "X", direction: -1, alpha: 0, beta: -PI/8, distance: 10},
        lighting: {pos:{x: 0, y: 0, z: 1.5}, intensity: 5, specular: {intensity: 4, power: 2}}
    },
    {text: "CircleSpi", typeCoords: 'spheric', udef: 1.5*PI, vdef: PI/2, nb_steps_u: 128, nb_steps_v: 128,
        fx: "u", fy: "v", fz: "exp(1/l(2abs(u)))", check: false,
        orient: {distance: 20, axis: "Z", direction: 1, alpha: -PI/3, beta: -PI/6},
        lighting: {pos:{x: 2.5, y: -0.5, z: 0}, intensity: 2.5, specular: {intensity: 4, power: 2}}
    },
    {text: "Dbl tongue", typeCoords: 'spheric', udef: PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,
        fx: "u", fy: "v", fz: "Qcupvcv", check: false,
        orient: {distance: 15, axis: "X", direction: 1, alpha: 3*PI/4, beta: -PI/8},
        lighting: {pos:{x: 0, y: 5, z: 0}, intensity: 3, specular: {intensity: 4, power: 2}}
    },
    {text: "Dbl drop", typeCoords: 'spheric', udef: PI/2, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,
        fx: "cusv", fy: "ucusv", fz: "vcusv", check: false,
        orient: {distance: 4, axis: "X", direction: 1, alpha: -PI/4, beta: 0},
        lighting: {pos:{x: 0, y: 2, z: 0}, intensity: 1, specular: {intensity: 4, power: 2}}
    },
    {text: "Flower", typeCoords: 'spheric', udef: PI, vdef: PI/2, nb_steps_u: 128, nb_steps_v: 128,
        fx: "vh(c(u8),s(12v))", fy: "v+pi/4", fz: "u", check: false,
        orient: {distance: 7, axis: "X", direction: -1, alpha: 0, beta: -PI/4},
        lighting: {pos:{x: 0, y: 0, z: 1.75}, intensity: 3, specular: {intensity: 4, power: 2}}
    },
    {text: "Interrogation", typeCoords: 'spheric', udef: PI/2, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,
        fx: "u", fy: "-u", fz: "v/2", alpha: "", beta: "(cu**8)8", theta: "", check: false,
        orient: {distance: 6, axis: "X", direction: -1, alpha: PI/8, beta: 0},
        lighting: {pos:{x: 0, y: 0, z: 1.5}, intensity: 5, specular: {intensity: 4, power: 2}}
    },
    {text: "Heart", typeCoords: 'spheric', udef: PI/2, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,
        fx: "u", fy: "u", fz: "v/2", alpha: "", beta: "(cu**8ct)8suv", theta: "", check: false,
        orient: {distance: 6, axis: "X", direction: -1, alpha: 0, beta: PI},
        lighting: {pos:{x: 0, y: 0, z: -1}, intensity: 3, specular: {intensity: 4, power: 1.75}}
    },
    {text: "Nautile", typeCoords: 'spheric', udef: PI/2, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,
        fx: "cu", fy: "-u", fz: "v", alpha: "cv", beta: "cusu", theta: "", check: false,
        orient: {distance: 7, axis: "Y", direction: -1, alpha: PI/6, beta: 0},
        lighting: {pos:{x: 3, y: 0, z: 0}, intensity: 3, specular: {intensity: 4, power: 1.75}}
    },
    {text: "Pen mine", typeCoords: 'spheric', udef: PI/2, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,
        fx: "(u+c(u+c(v+vsu)))", fy: "u+cu", fz: "v", check: false,
        orient: {distance: 6, axis: "Z", direction: 1, alpha: -2*PI/2.5, beta: -9*PI/8},
        lighting: {pos:{x: 0, y: 0, z: 1}, intensity: 1.5, specular: {intensity: 4, power: 1.75}}
    },
    {text: "Propeller", typeCoords: 'spheric', udef: 4*PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,
        fx: ".2u", fy: "s(.2v)", fz: "vc(.2v)s(.2u)", check: false,
        orient: {distance: 10, axis: "Y", direction: 1, alpha: PI/4, beta: 0},
        lighting: {pos:{x: 0, y: 0, z: 1.5}, intensity: 3, specular: {intensity: 4, power: 1.75}}
    },
    {text: "Seashell heart", typeCoords: 'spheric', udef: PI/2, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,
        fx: "u(cv+1)", fy: "usv", fz: "ucv", check: false,
        orient: {distance: 15, axis: "Y", direction: -1, alpha: 5*PI/4, beta: -PI/4},
        lighting: {pos:{x: 3, y: 0, z: 0}, intensity: 2, specular: {intensity: 4, power: 1.75}}
    },
    {text: "Sphere meridians", typeCoords: 'spheric', udef: PI, vdef: PI/2, nb_steps_u: 128, nb_steps_v: 128,
        fx: "1", fy: "v", fz: "u", check: false,
        orient: {distance: 7, axis: "Y", direction: 1, alpha: -PI/8, beta: -PI/8},
        lighting: {pos:{x: 0, y: 0, z: 1.5}, intensity: 3, specular: {intensity: 4, power: 1.75}}
    },
    {text: "Sphere parallels", typeCoords: 'spheric', udef: PI/2, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,
        fx: "1", fy: "u", fz: "v", check: false,
        orient: {distance: 7, axis: "Y", direction: 1, alpha: -PI/8, beta: -PI/8},
        lighting: {pos:{x: 0, y: 0, z: 1.5}, intensity: 3, specular: {intensity: 4, power: 1.75}}
    },
    {text: "Sphere rosette", typeCoords: 'spheric', udef: PI, vdef: PI/2, nb_steps_u: 128, nb_steps_v: 128,
        fx: "1", fy: "u-v", fz: "u+v", check: false,
        orient: {distance: 7, axis:"Y", direction : 1 , alpha : -PI/8 , beta : -PI/8},
        lighting: {pos:{x: 0, y: 0, z: 1.5}, intensity: 3, specular: {intensity: 4, power: 1.75}}
    },
    {text: "Spiral triple", typeCoords: 'spheric', udef: PI, vdef: PI, nb_steps_u: 96, nb_steps_v: 3/4,
        fx:"u" , fy:"pi/4" , fz:"u+v" , check:false ,
        orient:{distance :15 , axis :"Y" , direction :1, alpha :PI/4 , beta :-PI/8},
        lighting: {pos:{x: 0, y: 0, z: 2}, intensity: 5, specular: {intensity: 4, power: 1.75}}
    },
    {text:"Spiral penta curve" , typeCoords :"spheric" , udef :PI , vdef :PI , nb_steps_u :256 , nb_steps_v :5/4 ,
        fx :"u" , fy :"pi/4" , fz :"2(u+v)" , alpha :"a(u/(3+2/3))+pi/(2**0.5)" , check:false,
        orient:{distance :15,axis :"Y" , direction :1, alpha :PI/4 , beta :-PI/8},
        lighting: {pos:{x: 0, y: 0, z: 2}, intensity: 5, specular: {intensity: 4, power: 1.75}}
    },
    {text:"Twisted weathercock" , typeCoords :"spheric" , udef :PI/2,vdef :PI,nb_steps_u :128,nb_steps_v :256,
        fx :".2pi+c(12(u+v))", fy :"u", fz :"v", alpha :"", beta :"u/1.1", theta:"", check:false,
        orient:{distance :10,axis :"X",direction :1,alpha :PI/16,beta :-PI/16},
        lighting: {pos:{x: 0, y: 3, z: 0}, intensity: 4, specular: {intensity: 4, power: 1.75}}
    },
    {text: "Ouroboros", typeCoords: 'spheric', udef: PI, vdef: PI/2, nb_steps_u: 128, nb_steps_v: 128,
        fx: "u", fy: "v", fz:"2picv²su²", alpha: "0.707cv", beta: "0.707cv", check: false,
        orient: {distance: 15, axis: "X", direction: 1, alpha: PI/2, beta: -PI/12},
        lighting: {pos:{x: 0, y: 3, z: 0}, intensity: 4, specular: {intensity: 4, power: 1.75}}
    },
    {text: "Rosette", typeCoords: 'spheric', udef: PI/2, vdef: PI, nb_steps_u: 128, nb_steps_v: 256,
        fx: "c(12(u+v))", fy: "u", fz: "v", alpha: "", beta: "", check: false, suit: true,
        orient: {distance: 7, axis: "X", direction: -1, alpha: 0, beta: -PI/4},
        lighting: {pos:{x: 0, y: 0, z: 1.5}, intensity: 3, specular: {intensity: 4, power: 1.75}}
    },
    {text: "Cylinder", typeCoords: 'cylindrical', udef: PI, vdef: PI, nb_steps_u: 88, nb_steps_v: 88,  
        fx: "1", fy: "v", fz: "u", check: false,
        orient: {distance: 15, axis: "X", direction: 1, alpha: PI/4, beta: -PI/12},
        lighting: {pos:{x: 2.5, y: 1, z: 0.15}, intensity: 2.5, specular: {intensity: 4, power: 2}}
    },
    {text: "Hyperbola", typeCoords: 'cylindrical', udef: PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,
        fx: ".33v²", fy: "u", fz: "v", check: false,
        orient: {distance: 37.5, axis: "X", direction: -1, alpha: 0, beta: -PI/12},
        lighting: {pos:{x: 2.5, y: 1, z: 0.15}, intensity: 2.5, specular: {intensity: 4, power: 2}}
    },
    {text:"Moebius" , typeCoords :"cylindrical" , udef :PI,vdef :1,nb_steps_u :128,nb_steps_v :128 ,
        fx :"(1+ 0.5vc(0.5u))cu", fy :"(1+ 0.5vc(0.5u))su", fz :"0.5vs(0.5u)", check:false ,
        orient:{distance :5,axis :"X" , direction :-1,alpha :PI/3,beta :-PI/12},
        lighting: {pos:{x: 0, y: 0, z: 0.8}, intensity: 1.5, specular: {intensity: 4, power: 2}}
    },
    {text: "Spiral 1", typeCoords: 'cylindrical', udef: PI, vdef: PI, nb_steps_u: 32, nb_steps_v: 64,
        fx: "u", fy: "v", fz: "v", check: false,
        orient: {distance: 15, axis: "X", direction: -1, alpha: PI/4, beta: -PI/4},
        lighting: {pos:{x: -0.4, y: -0.4, z: 2}, intensity: 5, specular: {intensity: 4, power: 2}}
    },
    {text: "Spiral 2", typeCoords: 'cylindrical', udef: PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,
        fx: "u", fy: "v", fz: "v", beta: "", theta: ".1c(8u+2t)", check: false,
        orient: {distance: 15, axis: "X", direction: -1, alpha: PI/4, beta: -PI/4},
        lighting: {pos:{x: -0.4, y: -0.4, z: 2}, intensity: 5, specular: {intensity: 4, power: 2}}
    },
    {text: "Spiral 3", typeCoords: 'cylindrical', udef: 6*PI, vdef: PI, nb_steps_u: 128, nb_steps_v: 128,
        fx: "uc(0.5v)/20", fy: "u+v", fz: "abs(u)u/120", check: false,
        orient: {distance :10, axis :"X" , direction :1,alpha :PI/4,beta :-PI/8},
        lighting: {pos:{x: 0, y: 2, z: 0}, intensity: 1.5, specular: {intensity: 4, power: 2}}
    },
    {text:"Spiral 4" , typeCoords :"cylindrical" , udef :PI/2,vdef :PI/2,nb_steps_u :128,nb_steps_v :128 ,
        fx :"2uv", fy :"pi", fz :".5u", alpha :"c(pih(u,v))pi", beta :"v", theta:"", check:false ,
        orient:{distance :15,axis :"X" , direction :1,alpha :PI/4,beta :-PI/8},
        lighting: {pos:{x: 0, y: 2, z: 0}, intensity: 1.5, specular: {intensity: 4, power: 2}}
    },
];