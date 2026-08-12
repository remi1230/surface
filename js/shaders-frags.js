/**
 * @file shaders-frags.js
 * @description Fragment shader code definitions for the BabylonJS parametric surface application.
 *
 * This file contains GLSL fragment shader source code stored as JavaScript template literals
 * in arrays. It defines:
 * - {@link fragmentShaders} - An array of GLSL fragment shader body snippets (grid, curvature,
 *   Voronoi, Perlin noise, starfield, Truchet patterns, hexagons, etc.).
 * - {@link fragmentShaderHeader} - The common GLSL header (version, precision, uniforms,
 *   varyings, and utility functions) prepended to every fragment shader.
 * - {@link buildEditorShaderSource} - Assembles what the Monaco editor displays, including
 *   the free zone where the user writes their own GLSL functions, just before `main()`.
 * - {@link fragmentShaderFooter} - The common GLSL footer (color inversion, tint, lighting)
 *   appended to every fragment shader.
 * - {@link normalShaders} - An array of GLSL normal-deformation shader body snippets.
 * - {@link normalShaderHeader} / {@link normalShaderFooter} - Header and footer wrapping
 *   normal deformation code into a `computeDeformation` function.
 * - {@link getFragmentUtilsGLSL} - A function returning shared GLSL utility code (color
 *   palettes, noise, lighting, SDF helpers, etc.).
 * - {@link validateShader} - A function that compiles a GLSL shader on the GPU to check
 *   for syntax errors.
 *
 * The final composed shader is assembled as:
 *   `buildEditorShaderSource(fragmentShaders[index])`
 * i.e. header + user functions + `main()` body + footer, the user functions being the
 * part of the entry stored after {@link USER_FUNCTIONS_TAG}.
 */

/**
 * Array of GLSL fragment shader body snippets.
 *
 * Each entry is a template literal string containing GLSL code that computes a `col` (vec3)
 * value. The code is inserted between the header and {@link fragmentShaderFooter} to form
 * a complete fragment shader. An entry may also carry the user's own GLSL functions, after
 * {@link USER_FUNCTIONS_TAG}; those are emitted before `main()` rather than inside it.
 *
 * Available shaders (by index):
 *  0 - Default grid overlay
 *  1 - Grid (discard-based wireframe)
 *  2 - Hexagonal grid
 *  3 - Position-based grid
 *  4 - Curvatures
 *  5 - Normal & Position blend
 *  6 - Normal & Position blend v2
 *  7 - Cosine position pattern
 *  8 - Checkerboard
 *  9 - Simple solid color
 * 10 - Show mesh construction
 * 11 - Lego (quantized position)
 * 12 - Position rainbow
 * 13 - Normal coloring
 * 14 - Atmosphere (Fresnel-like)
 * 15 - Rotating tile pattern
 * 16 - Hexagon cells
 * 17 - Truchet pattern
 * 18 - Fractional UV cells
 * 19 - Voronoi
 * 20 - Random Perlin noise
 * 21 - Starfield
 * 22 - Grid uvParams (heatmap)
 * 23 - Liquid
 * 24 - Porcelain
 *
 * @type {string[]}
 */
fragmentShaders = [
`
   //Default
    float coeffLine = S/3.0;

	// Grid
	float gu = fract(vUV.x * P * uvCoeff.x);
	float gv = fract(vUV.y * Q * uvCoeff.y);

	float edgeU = 1.0 - (lineWidth * coeffLine * ((S-2.0)/6.0)) / P;
    float edgeV = 1.0 - (lineWidth * coeffLine * ((S-2.0)/6.0)) / Q;
    float fw = fwidth(vUV.x * P); // width of one pixel in UV space
    float fh = fwidth(vUV.y * Q);
    float lineU = smoothstep(edgeU - fw, edgeU + fw, gu);
    float lineV = smoothstep(edgeV - fh, edgeV + fh, gv);
    float line = min(lineU + lineV, 1.0);

	col = mix(col, meshFg, min(line, 1.0));  
`,
`   
    //Drawing
    vec3 p = 1. + abs(npos()*PI);

    float pm = acosh(p.x) * acosh(p.y) * acosh(p.z);

    col *= la(.25*pm-E*col);
    col -= cos(col*8.);
    

    col += .125-tube(col*p, PI/4.);
    col += .125*rainbop(length(p/PI), p*col*2.);
    col /= 1.+ .0625*edge(col, PI/10.);

`,
`   
    //FBM 3D Base
    vec3 p0 = npos() * (opt1 == 0. ? 1. : .5);

    p0 = (normalize(vWorldPosition));

    vec3 p = abs(p0);

    col /= la(o(36.*p*fbm(p0+t/64.)));


    col = abs(col);

`,
`   
    //PN Base
    float nb = 1.;
    vec3 p0 = npos(-1.) * nb * (opt1 == 0. ? 1. : .5); 
    vec3 p  = abs(p0);

    vec3 n  = abs(vNormal);
    vec3 pn = p*n;

    float val1 = o(oi(pn+t/16., 4., 2.)*9.);
    float val2 = m(mi(pn+t/16., 4., 2.)*9.);

    float val = max(val2, val2);

    col = vec3(.5);

    col *= val;

`,
`   
    //PN Ink
    float nb = 1.;
    vec3 p0 = npos(-1.) * nb * (opt1 == 0. ? 1. : .5); 
    vec3 p  = abs(p0);

    vec3 n  = abs(vNormal);
    vec3 pn = p*n;

    float val1 = o(oi(pn+t/16., 4., 2.)*9.);
    float val2 = m(mi(pn-t/16., 4., 2.)*9.);

    float val = max(val2, val2);

    col = vec3(.5);

    col *= val;

    col /= inkBleed(p, 12., 12.);
    col /= inkPigment(.5);
    col *= inkPigment(val*.5);

`,
`   
    //PN Ink Color
    float nb = 1.;
    vec3 p0 = npos(-1.) * nb * (opt1 == 0. ? 1. : .5); 
    vec3 p  = abs(p0);

    vec3 n  = abs(vNormal);
    vec3 pn = p*n;

    float val1 = o(.5*oi(pn-t/16., 4., 2.)*9.);
    float val2 = m(.5*oi(pn+t/16., 4., 2.)*9.);

    float val = val1*absp(val2, 1./6.);

    col = vec3(.5);

    col *= val;

    col /= inkBleed(p, 128., 12.);
    col /= inkPigment(.5);
    col -= inkAbsorb(p/val, col, 1.)/3.;

`,
`   
    //PN Chenese Ink
    float nb = 1.;
    vec3 p0 = npos(-1.) * nb * (opt1 == 0. ? 1. : .5); 
    vec3 p  = abs(p0);

    vec3 n  = abs(vNormal);
    vec3 pn = p*n;

    float val1 = ms(.5*msi(pn-t/16., 4., 2.)*9.);
    float val2 = os(.5*osi(pn-t/16., 4., 2.)*9.);

    float val = val1*absp(val2, 1./6.);

    col = vec3(.5);

    col += val;

    col /= inkBleed(p, 64., 12.);
    col /= inkPigment(val);

    col /= ea(col);

    if(length(col) > 1.){ col.x *= Z; }

`,
`   
    //Sky
    vec3 p0 = npos() * (opt1 == 0. ? 1. : .5);

    p0 = (normalize(vWorldPosition));

    vec3 p = abs(p0);

    col = fbmLiquidEffect(p0);


    col = abs(col);

`,
`   
    //Chenese ink
    float nb = 1.;

    vec3 p0 = nb * (opt1 == 0. ? (normalize(vWorldPosition)) : vWorldPosition * .5);

    vec3 p = abs(p0);

    float val1 = o(p*8.+t/3.);
    float val2 = o(p*7.7725+t/3.);

    vec3 c1 = fbmLiquidEffect(p + val1);
    vec3 c2 = fbmLiquidEffect(p + val2);

    col = vec3(c1/c2);
    col *= min(m(c1), m(c2));
    col += max(m(c1), m(c2));

`,
`   
    //Chenese ink II
    float nb = 1.;

    vec3 p0 = nb * (opt1 == 0. ? (normalize(vWorldPosition)) : vWorldPosition * .5);

    vec3 p = abs(p0);

    float val = os(8.*p+t/32.);

    float val1 = o(p+.125*val, 8., t/3.);
    float val2 = o(p+.125*val, 7.7725, t/3.);

    vec3 c1 = fbmLiquidEffect(p + val1);
    vec3 c2 = fbmLiquidEffect(p + val2);

    col = vec3(c1/c2);
    col *= min(m(c1), m(c2));
    col += 1./3.*max(m(c1), m(c2));

`,
`   
    //Chenese ink III
    float nb = 1.;

    vec3 p0 = nb * (opt1 == 0. ? (normalize(vWorldPosition)) : vWorldPosition * .5);

    vec3 p = abs(p0);

    float val = os(p*2.+t/64.);

    float val1 = o(val*p*8.+t/3.);
    float val2 = o(val*p*7.7725+t/3.);

    vec3 c1 = fbmLiquidEffect(p + val1);
    vec3 c2 = fbmLiquidEffect(p + val2);

    col = vec3(c1/c2);
    col *= min(m(c1), m(c2));
    col += max(m(c1), m(c2));

    col -= 4./3.*inkBleed(col, 8., 0.);

`,
`   
    //Ink functions
    vec3 p = npos() * (opt1 == 0. ? 1. : .5);
    vec3 p0 = p;
    p = abs(p);

    float t = t*PI/5.;
    
    col = vec3(.5);

    float v1 = o(p*6.+.5*t);
    float v2 = o(p*12.+.5*t);

    float vv = v1*v2;

    float val1 = inkTurbulence(p+t/32., 12.);
    float val2 = inkContrast(vv, .125);
    float val3 = inkFbm(p*vv, 3.);
    float val4 = inkBleed(p*vv, 3., 3.);
    float val5 = inkStroke(vv, 1., 1., 1., 1.);
    float val6 = inkTones(vv, 1., 1., val5);
    float val7 = inkFlyingWhite(vv, 1., 1., 3.);
    float val8 = inkPaperGrain(p*vv, 1.);
    vec3  val9 = inkPigment(val2);
    vec3 val10 = inkAbsorb(val9/absp(p, 1./16.), val9*p, 1./3.);
    float val11 = inkCurvature(mp(p*vv*2.), mp(p*vv));

    
    col *= o(p*12.);

    float lcol = length(col);

    //col = inkAbsorb(col, col, 1./6.);
    //col = inkPigment(lcol);
    //col += inkPaperGrain(col, lcol);
    //col += inkFlyingWhite(lcol, 1., 1., 7./12.);
    //col += inkFbm(col, 3.);
    //col -= inkBleed(col, 3., 3.);
    //col -= inkStroke(lcol, 1., 1., 1.333, 6.);
    //col -= inkTones(lcol, 1., 1./32., val5);
    //col *= absp(inkTurbulence(col, 16.*val5), 1./2.);
    //col /= absp(inkContrast(lcol, lcol));
    //col += inkCurvature(col, s(col*2.))/3.;
    

    //col /= absp(palette(lcol*c(lcol*E)) / 4., 1./3.);

`,
`   
    //InkDeco Patter
    vec3 p = npos() * (opt1 == 0. ? 1. : .5);
    vec3 p0 = p;
    p = abs(p);

    float t = t*PI/5.;
    float val = oe(p*3., o(p*12.+t/3.), t);

    col = hueRotateYIQ(col*val, val);
    col -= inkDeco(col*m(col*8.));

    col -= 1. + edge(col, val*E)/64.;

`,
`   
    //PWO
    vec3 p = npos() * (opt1 == 0. ? 1. : .5);

    p = abs(p);

    vec3 pw  = wrap(p, 1.);
    vec3 pwo = wrot(pw, 0., 1., PI);

    float pm = oah(p/absp(pwo, 2./3.));

    col.yz *= hce(p*pm*4./3., 1., -(t+0.*p.x));
    col.xz /= 1.+.1875*hce(p*pm*3./3., 1., t);
    col /= Z/PI/mp(col);

    col += normalize(col);

    col = la(col*1.125);
    col = inkDeco(col, col*p, 2./3.);

    col *= absp(ccol(col*(1.+.1*pw)), -1./3.);

    col = abs(col);

`,
`   
    //PWO Art
    vec3 p = npos() * (opt1 == 0. ? 1. : .5);

    p = abs(p);

    float t = t*PI/5.;

    vec3 pw  = wrap(p, 5./3.);
    vec3 pwo = wrot(pw, 0., 1., PI);

    float pm = oah(2.*p/absp(pwo, 2./3.));
    vec3 ppm = p*pm;

    col.xy += m(ppm+t*1.2);
    col.xz += o(ppm*2.+t*.8);
    col.yz += os(ppm*2.+t*.7);
    
    col -= inkBleed(ppm, 12., 12.);
    col /= 1./6. + inkBleed(col, 12., 12.);

    col *= absp(sdec(vec3(6.666), 2./12., 2./3.), -.5);

    col -= inkDeco(col);

    col = hueRotateYIQ(col, radians(E*96.*absp(v/6.)));

`,
`   
    //PWO Art II
    vec3 p = npos() * (opt1 == 0. ? 1. : .5);
    vec3 p0 = p;
    p = abs(p);

    float t = t*PI/5.;

    vec3 pw  = wrap(p, 5./3.);
    vec3 pwo = wrot(pw, 0., 1., PI);

    float pm   = oah(2.*p/absp(pwo, 2./3.));
    vec3 ppm   = p*pm;

    col.xy += m(ppm+t*1.2);
    col.xz += o(ppm*2.-t*.8);
    col.yz += os(ppm*2.+t*.7);

    float vor = voronoiPos(p*48., 1.);
    
    col -= inkBleed(col, vor*16., vor*12.);
    col += inkBleed(col*pm, vor*6., vor*12.);

    col = hueRotateYIQ(c(col*E), E*vor*vor);

    col = abs(col);

`,
`   
    //PWO Art III
    vec3 p = npos() * (opt1 == 0. ? 1. : .5);
    vec3 p0 = p;
    p = abs(p);

    float t = t*PI/5.;

    vec3 pw  = wrap(p, 5./3.);
    vec3 pwo = wrot(pw, 0., 1., PI);

    float pm   = m(p/absp(pwo, .25)/E);
    vec3 ppm   = p*pm;

    col = fi(p*12.+t, o, col, 1.);

    float v1 = o(p*6.+.5*t);
    float v2 = o(p*12.+.5*t);

    float val1 = inkTurbulence(p*v2*v1, 12.);
    float val2 = inkContrast(v2*v1, .125);
    float val3 = inkFbm(p*v2*v1, 3.);

    col *= val3;

    col /= absp(rainbop(length(col), p), 1./3.);

`,
`   
    //PWO Art IV
    vec3 p = npos() * (opt1 == 0. ? 1. : .5);

    p = abs(p);

    float ti = t;

    if(ti < 1e3){ ti += 1e3; }

    float t = ti/E;

    vec3 pw  = wrap(p+t/64., 2.);
    vec3 pwo = wrot(pw+t/64., 0., 2., PI);

    float pm = oah(p*absp(pwo, 3./3.));
    vec3 ppm = p*absp(pm, -1./3.);

    col.xy += 2.*m(ppm*.5+t*1.2);
    col.xz += o(ppm*2.+t*.8);
    col.yz += .5*os(ppm*2.+t*.7);
    
    col -= inkBleed(ppm, 12., 12.);
    col /= 1. + inkBleed(col, 12., 12.);

    col *= absp(sdec(vec3(6.666), 2./12., 2./3.), -.5);

    col -= .25*min(col, .25*ea(col));

    col *= absp(E*inkDeco(p));

    col = hueRotateYIQ(col, radians(E*96.*absp(v/6.)));

`,
`   
    //PWO Art BLA
    vec3 p = npos() * (opt1 == 0. ? 1. : .5);

    p = abs(p);

    float ti = t;

    if(ti < 1e3){ ti += 1e3; }

    float t = ti/E;

    vec3 pw  = wrap(p+t/64., 1.);
    vec3 pwo = 8.*wrot(pw+t/64., 0., 2., PI);

    float pm = oah(p*absp(pwo, 3./3.));
    vec3 ppm = p*absp(pm, -1./3.);

    vec3 paint = col;
    float scale = 1.;
    float coverage = 1./5.;
    vec3 geoTint = vNormal;
    float warpAmp = 1.;
    float speed  = 1.;

    paint = brushLayerAnim(paint, ppm, scale, coverage,
                    geoTint, warpAmp, speed);

    paint = inkDeco(paint, ppm, 1.);

    col.xy += 2.*m(paint*.5+t*1.2);
    col.xz += o(paint*2.+t*.8);
    col.yz += .5*os(paint*2.+t*.7);

`,
`   
    //PWO Art BLA II
    vec3 p = npos() * (opt1 == 0. ? 1. : .5);

    p = abs(p);

    float ti = t;

    if(ti < 1e3){ ti += 1e3; }

    float t = ti/E;

    vec3 pw  = wrap(p+t/64., 1.);
    vec3 pwo = 8.*wrot(pw+t/64., 0., 2., PI);

    float pm = oah(p*absp(pwo, 3./3.));
    vec3 ppm = p*absp(pm, -1./3.);

    vec3 paint = col;
    float scale = 1./3.;
    float coverage = 1./5.;
    vec3 geoTint = .1*mp(p*8.);
    float warpAmp = 24.;
    float speed  = 1.;

    paint = brushLayerAnim(paint, ppm, scale, coverage, geoTint, warpAmp, speed);
    paint = brushLayerAnim(paint, ppm, scale, coverage*5., geoTint, warpAmp/24., speed);

    paint = inkDeco(paint, ppm, 1.);

    col.xy += 2.*m(paint*.5+t*1.2);
    col.xz += o(paint*2.+t*.8);
    col.yz += .5*os(paint*2.+t*.7);

`,
`   
    //PWO Art BLA III
    vec3 p = npos() * (opt1 == 0. ? 1. : .5);

    p = abs(p);

    float ti = t;

    if(ti < 1e3){ ti += 1e3; }

    float t = -ti/E;

    vec3 pw  = wrap(p+t/64., 1.);
    vec3 pwo = 8.*wrot(pw+t/64., 0., 2., PI);

    float pm = oah(p*absp(pwo, 3./3.));
    vec3 ppm = p*absp(pm, -1./3.);

    vec3 paint = col;
    float scale = 1./3.;
    float coverage = 1./5.;
    vec3 geoTint = .1*mp(p*8.);
    float warpAmp = 24.;
    float speed  = 1.;

    paint = brushLayerAnim(paint, ppm, scale, coverage, geoTint, warpAmp, speed);
    paint = brushLayerAnim(paint, ppm, scale*3., coverage*2., geoTint, warpAmp/24., speed);

    float vor = voronoiPos(ppm, 1.);

    paint = inkDeco(paint+vor/6., ppm, 1.);

    col.xy += 2.*m(paint*.5+t*1.2);
    col.xz += o(paint*2.+t*.8);
    col.yz += .5*os(paint*2.+t*.7);

`,
`   
    //PWO Art BLA IV
    vec3 p = npos() * (opt1 == 0. ? 1. : .5);

    p = abs(p);

    float ti = t;

    ti += 1e3;

    float t = ti/E;

    vec3 pw  = wrap(p+t/64., 2.);
    vec3 pwo = wrot(pw+t/64., 0., 2., PI);

    float pm = oah(p*absp(pwo, 3./3.));
    vec3 ppm = p*absp(pm, -1./3.);

    col.xy += 2.*m(ppm*.5+t*1.2);
    col.xz += o(ppm*2.+t*.8);
    col.yz += .5*os(ppm*2.+t*.7);
    
    col -= inkBleed(ppm, 12., 12.);
    col /= 1. + inkBleed(col, 12., 12.);

    col *= absp(sdec(vec3(6.666), 2./12., 2./3.), -.5);

    col -= .25*min(col, .25*ea(col));

    col *= absp(E*inkDeco(p));

    col = hueRotateYIQ(col, radians(E*96.*absp(v/6.)));

`,
`   
    //PWO II
    vec3 p = npos() * (opt1 == 0. ? 1. : .5);

    p = abs(p);

    vec3 pw  = wrap(p, 1.);
    vec3 pwo = wrot(pw, 0., 1., PI);

    float pm = oah(p/absp(pwo, 2./3.));

    col.yz *= hce(p*pm*4./3., 1., -(t+8.*p.x));
    col.xz /= 1.+.1875*hce(p*pm*3./3., 1., t);
    col /= Z/PI/mp(col);

    col += normalize(col);

    col = la(col*1.125);

    col *= absp(ccol(col*(1.+.1*pw)), -1./3.);

    col = abs(col);

`,
`   
    //PWO III
    vec3 p = npos() * (opt1 == 0. ? 1. : .5);

    p = abs(p);

    vec3 pw  = wrap(p, 5./3.);
    vec3 pwo = wrot(pw, 0., 1., PI);

    float pm = oah(2.*p/absp(pwo, 2./3.));

    col.xy += m(pm);
    col.xz += o(pm*2.);
    col.yz += os(pm*2.);

`,
`   
    //PWO IV
    vec3 p = npos() * (opt1 == 0. ? 1. : .5);

    p = abs(p);

    vec3 pw  = wrap(p, 8./3.);
    vec3 pwo = wrot(pw, 0., 2., PI);

    float pm = oah(2.*p/absp(pwo, 2./3.));

    col /= la(oe(p-pm*2./3., 5./3., -1.));

    col = abs(col);

`,
`   
    //PWO V
    vec3 p = npos() * (opt1 == 0. ? 1. : .5);

    p = abs(p);

    vec3 pw  = wrap(p, 1.);
    vec3 pwo = wrot(pw, 0., 1., PI);

    float pm = oah(p/absp(pwo, 2./3.));

    col.yz *= min(m(p*8.), o(p*8.));
    col.xy *= min(m(p*8.), o(p*8.));

    col *= la(col-8.*fract(col*col));
    col /= normalize(ea(col));


    //col = abs(col);

`,
`   
    //PWO V bis
    vec3 p = npos() * (opt1 == 0. ? 1. : .5);

    p = abs(p);

    vec3 pw  = wrap(p, 1.);
    vec3 pwo = wrot(pw, 0., 1., PI);

    float pm = oah(p/absp(pwo, 2./3.));

    col.yz *= min(m(pwo*8.), 1./3.*o(p*8.+t));
    col.xy /= absp(.5*min(m(p*8.), o(p*8.-t)), .5);

    col *= la(col-8.*fract(col*col));
    col /= normalize(ea(col));


    //col = abs(col);

`,
`   
    //PWO V ter
    vec3 p = npos() * (opt1 == 0. ? 1. : .5);

    p = abs(p);

    vec3 pw  = wrap(p, 1.);
    vec3 pwo = wrot(pw, 0., 1., PI);

    float pm = oah(p/absp(pwo, 2./3.));

    col.yz *= min(m(pwo*8.), 1./3.*o(p*8.+t));
    col.xy /= absp(.5*min(m(p*8.), o(p*8.-t)), .5);

    col *= la(col+8.*fract(col*col));
    col /= normalize(ea(col));

`,
`   
    //PWO VI
    vec3 p = npos() * (opt1 == 0. ? 1. : .5);

    p = abs(p);

    vec3 pw  = wrap(p, 1.);
    vec3 pwo = wrot(pw, 0., 1., PI);

    float pm = oah(p/absp(pwo, 2./3.));

    col.yz *= min(m(pwo*8.), 1./3.*o(p*8.+t));
    col.xy /= absp(.5*min(m(p*8.), o(p*8.-t)), .5);

    col *= la(col+8.*fract(col*col));
    col /= normalize(ea(col));

`,
`   
    //Pencil
    col = .5*vec3(.1875, .25, .333);
    float n = 16.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 p0 = ((npos()) * nb);
    vec3 p  = abs(p0);

    float ti = t * .5;



    float vor = voronoiPos(p*12., .5);
    float vor2 = voronoiPos(p*4., .5);
    col += o(p+ti)+vor+vor2;

    col -= pm(.5*tube(col, 2.125));
    col /= pm(spec(col, 8.*vor));

`,
`   
    //Pencil II
    float n = 2.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 nrm = normalize(vNormal);
    vec3 geoTint = vec3(0.6) + 0.4 * nrm;
    vec3 p0 = ((npos()) * nb);
    vec3 p  = abs(p0);

    float ti = t * .5;

    p *= absp(.125*o(p*8.));

    vec3 paint = baseColor(p);
    
    for(float i = 1.; i < 4.; i+=1.){
        paint = brushLayerAnim(paint, p, 4.*i, 0.60, geoTint, 0.2*i*8., 0.);
    }
    

    col *= E*paint;

    col /= absp(tube(paint, E), 2./3.);
    col /= pm(1./96.*edge(paint, 16.));

    col = 1. - col;

`,
`   
    //Pencil Base
    float n = 2.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 nrm = normalize(vNormal);
    vec3 geoTint = vec3(0.6) + 0.4 * nrm;
    vec3 p0 = ((npos()) * nb);
    vec3 p  = abs(p0);

    float ti = t * .5;

    //p *= absp(.125*o(p*8.));

    vec3 paint = baseColor(p);
    
    for(float i = 1.; i < 4.; i+=1.){
        paint = brushLayerAnim(paint, p, 4.*i, 0.60, geoTint, 0.2*i*8., 0.);
    }
    

    col *= E*paint;

    col /= absp(tube(paint, E), 2./3.);
    col /= pm(1./96.*edge(paint, 16.));

    col = 1. - col;

`,
`   
    //Pencil Base II
    float n = 2.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 nrm = normalize(vNormal);
    vec3 geoTint = vec3(0.6) + 0.4 * nrm;
    vec3 p0 = ((npos()) * nb);
    vec3 p  = abs(p0);

    float ti = t * .5;

    p *= absp(.125*o(p*8.+0.*t/3.));

    vec3 paint = baseColor(p);
    
    for(float i = 1.; i < 6.; i+=1.){
        paint = brushLayerAnim(paint, p, i*(1.+.025*i), W, geoTint, 0.2*i*12., 0.);
        col /= absp(tube(paint, 1.+i*.05), i/PI);
    }
    

    col *= E*paint;

    
    col /= pm(1./96.*edge(paint, 16.));

    col = 1. - col;

`,
`   
    //Pencil Base III
    float n = 2.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 nrm = normalize(vNormal);
    vec3 geoTint = vec3(0.6) + 0.4 * nrm;
    vec3 p0 = ((npos()) * nb);
    vec3 p  = abs(p0);

    float ti = t * .5;

    p *= absp(.125*o(p*8.+1.*t/3.));

    vec3 paint = baseColor(p);
    
    for(float i = 1.; i < 6.; i+=1.){
        paint = brushLayerAnim(paint, p, i*(1.+.025*i), W, geoTint, 0.2*i*12., 1.);
        col /= absp(.75*tube(paint, 1.+i*.125), i/PI);
    }
    

    col *= E*paint;

    col /= pm(1./96.*edge(paint, 16.));

    col = hueRotateYIQ(col, radians(212.));

    col = 1. - col;

`,
`   
    //Pencil Base IV
    float n = 2.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 nrm = normalize(vNormal);
    vec3 geoTint = vec3(0.6) + 0.4 * nrm;
    vec3 p0 = ((npos()) * nb);
    vec3 p  = abs(p0);

    float ti = t * .5;

    p *= absp(.125*o(p*8.+1.*t/3.));

    vec3 paint = baseColor(p*10.);
    
    for(float i = 1.; i < 6.; i+=1.){
        paint = brushLayerAnim(paint, p, i*(1.+.025*i), W, geoTint, 0.2*i*12., 1.);
        col /= absp(.75*tube(paint, 1.+i*.125), i/PI);
    }
    

    col *= E*paint;

    col /= pm(1./96.*edge(paint, 16.));

    col = hueRotateYIQ(col, radians(212.));

    col = 1. - col;

`,
`   
    //Pencil III
    vec3 p  = vWorldPosition;
    vec3 nrm = normalize(vNormal);
    vec3 geoTint = vec3(0.6) + 0.4 * nrm;

    vec3 pt = p * tanh(4.*p);

    mat3 rot = rotAxis(vec3(0., 0., 1.), t*.125);

    // vitesses = 2π·m/T pour boucle parfaite ; ici T = 2π → m = 1, 2, 3
    vec3 paint = vec3(.5);
    paint = brushLayerAnim(paint, p, 16.0, 0.60, geoTint, 0.2, 3.0);

    col *= E*paint;

    col /= absp(tube(paint, E), 2./3.);
    col /= pm(.025*edge(paint, 16.));

`,
`   
    //Clean
    float n = 1.;
    float nb = opt1 == 0. ? n*.5 : n*1.;
    vec3 p0 = ((npos(-1.)) * nb);
    vec3 p  = abs(p0);

    col *= log(absp(m(p*8.)*8., .5));

`,
`   
    //Gems
    float nb = 20.;
    vec3 p = npos(-1.) * (opt1 == 1. ? nb : nb*.5);

    vec3 pv = p*(tanh(4.*p));

    float speed = 1.;

    float vorS = voronoiPos(p*4., speed);
    vec4 vorC  = voronoiCellAnim(p, speed);

    float vor = vorC.w;
    vec3 vorv = vorC.xyz;

    vec3 brush = brushLayerAnim(vec3(0.), vorv, 1., c(vor), vec3(6.), 0., speed);

    col = brush;

    col += 1./16.*o(8.*pv+t*.5);

    col /= 1.25+tube(col*vorS*2., 1./vorS);

    col = 1. - col;

`,
`   
    //RotP
    col = vec3(.125, .5, .5);
    float nb = PI;
    vec3 p  = nb * npos() / (opt1 == 1. ? 2. : 1.);
    vec3 n  = vNormal / (opt1 == 1. ? .25 : .125);

    float arc = PI/nb;
    for(float i = 0.; i < PI; i+=arc){
        p *= rotAxis(vec3(0., 0., 1.), arc);
        col += .3*ins(m, p, 8.);
    }

    col /= 1.+8.*tube(col, 8.);
    
`,
`   
    //Vertexs
    float nb = 12.;
    vec3 p = npos() * (opt1 == 0. ? nb : nb*.29) + t*.0;

    float v1 = length((p*.125));
    float v2 = length(s(vec3(p.x+t*.33, p.y-t*.25, p.z+.16*t)))*s(v*2.)*c(u*2.);
    float tmix = Ts(.25);

    col *= 1.+.125*o(p*v1*p*(.1875+abs(v2*.1875)));

    col *= 1. + .25*mix(v1, v2, tmix);
    col -= .25*mix(v1, v2, 1.-tmix);

    col *= 1.+tube(col, 8.);
    col = spec(col, 1.);
    
`,
`   
    //Fluide
    float nb = E;
    vec3 p = npos() * (opt1 == 0. ? nb : nb*.5);

    col *= o(cpow(p*p*.5, 3.)-t);
    col /= 8.-m(cpow(p, 3.)+t);

    //col += tube(col, 1.);
    col -= tube(col, 2.);
    col -= spec(col, .125);

    col *= 1.+.666*palette(length(col*c(p*1.)*2.));
    col *= 1.+.666*rainbow(length(col*c(p*1.)*2.));
    
`,
`   
    //Fluide II
    float nb = 8.;
    vec3 p = npos(-1.) * (opt1 == 1. ? nb : nb*.35);

    col *= o(cpow(p, 1.+abs(hc(p))));
    col *= o(cpow(p*(1.+.1*c(t*.25)), 1.+abs(hc(p))));

    col *= 1.+palette(length(col));
    col += .25*rainbow(length(col));
    
`,
`   
    //Fluide III
    float nb = .5;
    vec3 p = npos() * (opt1 == 0. ? nb : nb*.35);

    p = pm(p);
    for(float i = 0.; i < 3.; i +=1.){
        col *= pp(
            o(p)-o,
            o(p)*o, 
            p,
            .125,
            .25
        );
        p *= W;
        col += .25*eqPos(col.x, col.y);
        col = .5-pm(col);
    }

    col += tube(col, 4.);
    
`,
`   
    //UVP
    col *= vec3(.8, .9, .87);
    vec3 p = npos(-1.) * 8.;
    u *= 8.;
    v *= 8.;

    vec3 uvp = vec3(u, v, m(p)); 

    for(float i = 0.; i < 8.; i+=4.){
        col += .125*o(uvp*(2.-i*.5))*(1.+m(p));
    }

    col += 4.*tube(col, 4.);
    
    
    col = 1. - col;
    
`,
`   
    //Manufacturing
    float d   = 1e9;
    float dom = uMaxV - uMinV;
    float vt  = mod(t*dom*0.125 - uMinV, dom) + uMinV;   // iso-ligne mobile, reste dans le domaine
    const float N = 48.0;                                 // nb d'échantillons par courbe
    for(float k = 0.0; k <= N; k += 1.0){
        float p = mix(uMinU, uMaxU, k / N);               // points régulièrement espacés
        d = min(d, distance(vPosition, eqPos(p,  vt)));   // courbe iso-v (u varie)
        d = min(d, distance(vPosition, eqPos(vt, p )));   // courbe iso-u (v varie)
    }

    float sz = 0.02 * S / 12.;
    col += 1.-vec3(smoothstep(sz, sz + .01, d));
    col /= 1.+vec3(smoothstep(sz + .02, sz + .03, d));
    
`,
`
    //Skeleton
    col = palette(length(vNormal*normalize(vPosition)));
    float thickness = 0.0625; // à ajuster selon le rendu voulu

    // distance aux deux plans x=y et x=-y
    vec3 pos   = vPosition * Ts(1.0);
    float pos1 = opt1 == 0.0 ? (opt2 == 0.0 ? pos.y : pos.z) : pos.x;
    float pos2 = opt1 == 0.0 ? (opt2 == 0.0 ? pos.x : pos.y) : pos.z;

    float d1 = abs(pos1 - pos2);
    float d2 = abs(pos1 + pos2);
    float d = min(d1, d2);

    // bande lissée autour des ellipses
    float line = 1.0 - smoothstep(0.0, thickness, d);

    // discard tout ce qui n'est pas sur les ellipses
    if (line < 0.05) discard;

`,
`   
    //EQN
    float hu = (uMaxU - uMinU) / gridU;   // pas en u  (= uStepU)
    float hv = (uMaxV - uMinV) / gridV;   // pas en v  (= uStepV)

    // Dérivées partielles (différence avant, comme ton exemple)
    vec3 dPdu = (eqPos(u + hu, v) - eqPos(u, v)) / hu;   // ∂P/∂u  (tangente en u)
    vec3 dPdv = (eqPos(u, v + hv) - eqPos(u, v)) / hv;   // ∂P/∂v  (tangente en v)

    // Normale analytique de la surface
    vec3 N = normalize(cross(dPdu, dPdv));
    col = N * 0.5 + 0.5;                                  // visualise la normale
    
`,
`   
    //Pavage
    col = vec3(.02, .5, .5);
    vec3 p = npos(-1.) / (opt1 == 1. ? 1. : 2.);

    // va-et-vient à vitesse constante : 0 -> 1 -> 0
    float phase = .025 * time;          // vitesse globale (÷2 car aller + retour)
    float tri   = abs(fract(phase) * 2. - 1.); // triangle 0..1..0

    float nb  = nbTrajectory(time, .0125, .05);
    float arc = PI / nb;
    for(float k = 0.; k < 8.; k += 1.){   // borne >= max(keys) = 8
        if(k >= nb) break;
        p *= rotAxis(vec3(0., 0., 1.), arc);
        float w = clamp(nb - k, 0., 1.);   // fondu fractionnaire : pas de pop
        col += w * m(p*38.);
    }

    col *= 0.333 - 1. * tube(col, .5833);
    
    col /= 1.+.667*spec(col, .333);
    col = W*bright(col);

    col *= 1. + .1*edge(col, 1.);
    
`,
`   
    //CE
    float n = 2.125;
    float k = .5;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 p  = abs(npos()) * nb;
    col = vec3(k, k, k);

    col += se(p-W*m(p));
    col *= 1.+tube(col, 1.);
    col *= 1.+.5*spec(col, 1.);

    col = 1. - col;
    
`,
`   
    //DiscoKube II
    float n = .5;
    float k = .5;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 p  = abs(npos()) * nb;
    col = vec3(k, k, k);

    //col += c(64.*exp(p.x)*exp(p.y)*exp(p.z));
    col += se(ce(p)*p,44., t*8.);
    col += spec(p*col, .25);
    
`,
`   
    //LogKube
    float n = .5;
    float k = .5;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 p  = abs(npos()) * nb;
    col = vec3(k, k, k);

    //col += c(64.*exp(p.x)*exp(p.y)*exp(p.z));
    col += ol((p)*p, 4.256, t*1., 0.)+m(p*8.*col);
    col += spec(p*col, .64);
    col = 1.-col;
    
`,
`   
    //LogKube II
    float n = .5;
    float k = .5;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 p  = abs(npos()) * nb;
    col = vec3(k, k, k);

    //col += c(64.*exp(p.x)*exp(p.y)*exp(p.z));
    col += ol((p)*p, 4.256, t*1., 0.)+m(p*8.*col);
    col += spec(p*col, .64);
    col = 1.-col;
    
`,
`   
    //LiquidLog
    float n = .5;
    float k = .5;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 p  = abs(npos()) * nb;
    col = vec3(k, k, k);

    //col += c(64.*exp(p.x)*exp(p.y)*exp(p.z));
    col *= 1.+ol((p)*p, 4.256, t, 0.0001)+hce(p*13.*col);
    col += spec(p*col, .64);
    col += tube(p*col, 5.64);
    col = 1.-col;
    
`,
`   
    //LiquidLog II
    float n = .5;
    float k = .5;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 p  = abs(npos()) * nb;
    vec3 ps = abs(nspos()) * nb;
    vec3 pps = p*ps;
    col = vec3(k, k, k);

    //col += c(64.*exp(p.x)*exp(p.y)*exp(p.z));
    col *= 1.+ol((pps)*p*t, 4.256, .0001*t, .0667)+hce(p*13.*col);
    col += spec(p+pps*col, .64);
    col += tube(pps*col, 5.64);
    col = 1.-col;
    
`,
`   
    //Big lines
    vec3 p = abs(npos());

    col = vec3(E/PI);
    col *= 1.+p*m(p*8.)*o(p*8.+t);

    col *= 1.+E*tube(cpow(p, 8.)*col*4., 4.);

    col = 1. - col;

    col /= 1.+.25*c(col*E);
    
`,
`   
    //Orange
    float n = 8.;
    n *= opt1 == 0.0 ? 1. : .5;
    vec3 p = abs(npos()) * n;
    col = vec3(E/PI);

    float val = o(p*.6667)*hce(p*.375);
    
    col *= 1.+val;

    col += 1.*tube(col, 1.);
    col = palette(length(col));
    col -= tube(col, .5);
    
`,
`   
    //MUV
    float nb = 3.;
    float n = 8.;
    n *= opt1 == 0.0 ? 1. : .5;
    vec3 p = abs(npos()) * n;
    col = vec3(E/PI);

    float val = c(nb*vUVParams.x)*c(nb*vUVParams.y);
    
    col *= 1.+val;

    col += 1.*tube(col, 1.);
    col = palette(length(col));
    col -= tube(col, .5);
    
`,
`   
    //Classic
    float nb = 12.;
    float n = 8.;
    n *= opt1 == 0.0 ? .707 : .707*.707;
    vec3 p = abs(npos()) * n;
    col = vec3(E/PI);

    float val = m(p);
    
    col *= 1.+val;


    col += 1.*tube(col, 1.);
    col = palette(length(col));
    col *= 1.+.5*tube(col, 1.);
    col *= 1.+.5*pulse(col, 5./12.);

    col = hueRotateYIQ(col, radians(202.));
    
`,
`   
    //StreetArt
    vec3 pos  = npos(-1.);
    vec3 posN = vec3(m(
        cos(8.*pos),
        o(pos, 1., .25*time),
        2.* m(2.*pos)
    )) * 115. * P / (64.*64.);

    col = rainbop(.25*length(posN), pos);

    col += tube(col, 2.);
    col += post(col, 8., .7);

    col = 1.0 - col;
    col = hueRotateYIQ(col, radians(180.));
    
`,
`   
    //MOH
    vec3 p  = npos() / (opt1 == 1. ? .25 : .09375);
    col = vec3(0.);

    vec3 moh = vec3(m(p), o(p), hc(p));

    col = rainbop(length(moh), moh-time);

    col += .5*tube(col, 2.);

    col = hueRotateYIQ(col, radians(144.));

    col -= edge(cos(col), 5./12.);
    
`,
`   
    //Smoky
    vec3 p  = npos() / (opt1 == 1. ? 2.72 : .707);
    col *= .25*ec(8.*p-o(p, 8., time));
    
`,
`   
    //2Work
    vec3 p = npos() * (opt1 == 0. ? 1. : .25);
    float pl = length(p);
    for (float i = 14.; i < 20.; i+=2.) {
        p = fract(p*1.0)-.5;
        col *= -1.+m(p*i*2.);
        col *= 1.+.5*tube(col, 1.);
    }

    col += E*tube(col, .5);
    col += .75*spec(col, .707);
    
    
`,
`   
    //2Work II
    vec3 p = npos() * (opt1 == 0. ? .5 : .25);
    float pl = length(p);
    for (float i = 14.; i < 18.; i+=1.) {
        p = fract(p*.5*pl*pl*6.)-.5;
        col *= -1.+m(p*i*2.);
    }

    col = rainbop(length(col), col*m(col));

    //col += E*tube(col, .5);
    col += .5*spec(col, .407);
    
    
`,
`   
    //Art
    float t = t * PI / 6.;
    vec3 p = npos();
    float pl = length(p);
    for (float i = 70.; i < 120.; i+=25.) {
        p = fract(p*1.067)-.5;
        col *= .333-oe(.29*c(p*.58333)*p*i*.25, 1., -t);
        col += .1875*spec(cos(p), 1.);
        col += W*tube(col, W);
    }

    col = hueRotateYIQ(col, radians(72.));
    
`,
`   
    //Art II
    vec3 p = npos()*8.;
    float pl = length(p);
    
    float val = length(tube(p+o(p), 1.));

    col *= 1.+E*eqPos(
        1., 
        W*log(.5/val)
    );
    
`,
`   
    //Art III
    vec3 p  = npos() / (opt1 == 1. ? 2. : 1.);
    vec3 n  = vNormal / (opt1 == 1. ? .25 : .125);

    col = 1.+1./3.*(c(p*8.));
    for(float i = 1.; i < 3.; i+=.75){
		p *= rotAxis(wrap(p, 2.-i), -t/(i+4.));
		col += m(2.*p*p);
	}

    col = 1. - col;
    
`,
`   
    //Art IV
    col = vec3(.125, .5, .5);
    vec3 p  = npos() / (opt1 == 1. ? .5 : 1.);
    vec3 n  = vNormal / (opt1 == 1. ? .25 : .125);

    for(float i = 0.; i < 2.; i+=PI/6.){
		p *= rotAxis(p*c(p*Z*i), .125*t+i);
		col += .333*m(8.*p*p, PI/4., .125*t-i);
	}

    col /= 1.+12.*tube(col, 1.);
    
    
`,
`   
    //Art V
    col = E*vec3(2./3., 1./6., 1./4.);
    float n = 8.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 p  = ((npos()) * nb);

    p = abs(p);

    float ti = t * .125;

    p  = go(p, pm(m(p+t*.125)), .125);

    col *= .25*o(.5*p*pm(o(p*2.)));

    float vor = voronoiPos(.2*col+p*4., 2.);
    col *= pm(1.*spec(pm(col), pm(vor)));
    col -= .5*(tube((col), (vor*.25)));
    
    
`,
`   
    //Art VI
    float n = 2.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 nrm = normalize(vNormal);
    vec3 geoTint = vec3(0.6) + 0.4 * nrm;
    vec3 p0 = ((npos()) * nb);
    vec3 p  = abs(p0);

    float ti = t * .5;

    p *= absp(1./10.*o(p*6.+t/E));

    vec3 paint = baseColor(p);
    float vor = voronoiPos(p*1., .0);

    for(float i = 1.; i < 6.; i+=1.){
        paint = brushLayerAnim(paint/(1.+.0125*i), p, 6.6666*i*absp(.1, vor*i/5.), 1.90, geoTint, .2, 0.);
    }
    
    col = paint*E;
    col /= absp(oe(p*5./3.), 3./5.);

    col = 1. - col;
    
    
`,
`   
    //Art VII
    float n = 2.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 nrm = normalize(vNormal);
    vec3 geoTint = vec3(0.6) + 0.4 * nrm;
    vec3 p0 = ((npos()) * nb);
    vec3 p  = .5-abs(p0);

    float ti = t * .5;

    p *= absp(1./10.*o(p*6.+t/E));

    vec3 paint = baseColor(p);
    float vor = voronoiPos(p*1., .125);

    for(float i = 1.; i < 6.; i+=1.){
        paint = brushLayerAnim(paint/(1.+.0125*i), p/absp(.5*i, .5), i*absp(8.*vor, .125*vor*i/5.), 1.90, geoTint, .2, 0.);
    }
    
    col = paint*5./3.;

    col = 1. - col;
    
    
`,
`   
    //Wrot base
    vec3 p  = npos() / (opt1 == 1. ? 2. : 1.);
    p = abs(p);
    
    for(float i = 0.; i < TWO_PI; i+=TWO_PI/2.){
        p = wrot(p, -t/64., 2., PI);
		col += m(p*2.);
	}
    
`,
`   
    //Wrot II
    vec3 p  = npos() / (opt1 == 1. ? 2. : 1.);

    p = abs(p);

    col = vec3(E/PI);
    for(float i = 1.; i < TWO_PI; i+=TWO_PI/2.166667){
        p = wrot(p, t/64., i*i/3., PI);
		col += 1.125/3.+abs(m(p*5.));
        col /= absp(.075*i*spec(col, 2.), 5./3.);
	}

    col *= absp(tube(col, .0));

    col = 1. - col;
    
`,
`   
    //Wrap double
    vec3 p  = npos() / (opt1 == 1. ? 2. : 1.);
    p = abs(p);

    float val = m(p+2.*c(p*8.+t/3.) - o(p*6.));
    
    col *= .6667 + wrap(val, 2.);

    col /= absp(la(col), .0);
    col *= absp(la(col), .0);
    col -= 1./3.*absp(la(col), .0);
    
`,`   
    //FBM-things
    vec3 p = npos() * (opt1 == 0. ? 1. : .5);

    col *= o(48.*p*fbm(vec2(me(p), oe(p))));
    
`,
`   
    //8 Poles
    vec3 p = npos() * (opt1 == 0. ? 8. : 4.);
    
    for (float i = 1.; i < 18.; i+=1.) {
        col += m(p*i);
    }
    
`,
`   
    //Go func
    col = vec3(1.6667);
    float nb = 1.;
    vec3 p = npos() * (opt1 == 0. ? 1. : .5) * nb;

    p = pm(p);
    p = go(p, .5, .125);

    col *= .1+.75*tube(p, oi(p*tube(p, 1.), 2., 2.));

    col += .1875*tube(col, 8.);

    col *= .5 + .41667*eqPos(
        c(3.*col.y + 4.*col.x + col.z*8.),
        c(-2.*col.x - col.y*2. + col.z*8.)
    );

    col *= W;

    col = hueRotateYIQ(col, radians(180.));
    
`,
`   
    //1 code line
    col = vec3(1.6667);
    float nb = 4.;
    vec3 p = npos() * (opt1 == 0. ? 1. : .5) * nb;

    col *= tube(p, length(c(pm(p)+t*.125)));
    
`,
`   
    //8 Poles II
    vec3 p = npos() * (opt1 == 0. ? 8. : 4.);
    
    for (float i = 1.; i < 18.; i+=.75) {
        col += m(p*i);
    }
    
`,
`   
    //Blackboard
    float nb = 2.;
    vec3 p = npos(-1.) * (opt1 == 0. ? nb : nb*2.);
    
    p = pm(p*ol(p*.125, 1., 0.01875));
    
    col *= 1.0125 - pm(tube(p*p*.5, mi(p+t*.125, 2., 1.667)));

    col *= 1. + 2.*tube(col*m(col*8.), 1.);

    col *= 1.+.5*palette(length(col));
    col /= 1. + .125*eqPos(mi(col*.5, 3., 2.), oi(col*.5, 3., 5.));
    
`,
`   
    //Sweet light
    vec3 p = npos(-1.) * (opt1 == 0. ? 4. : 8.);
    
    for (float i = 0.; i < 6.; i+=.75) {
        col /= 1.+m(p*i);
        //col += .0125*palette(hc(col));
    }

    col = 1.-col;
    col = hueRotateYIQ(col, radians(189.));
    
`,
`   
    //Sweet light II
    vec3 p = npos(-1.) * (opt1 == 0. ? 4. : 8.);
    
    for (float i = 0.; i < 6.; i+=.888) {
        col /= (1.+o(p*i))*1.25;
        col += .03125*palette(hc(col));
        col *= 1.+.2*spec(col, 1.);
    }

    //col = 1.-col;
    col = hueRotateYIQ(col, radians(189.));
    
`,
`   
    //Pinky
    vec3 p = npos();

    col -= o(p*16.*cos(p*5.));

    col += ea(2.*p);
    col -= la(.25*p);

    col = vec3(m(col), o(col), hc(col));

    col += tube(col, m(col*2.));

    col = hueRotateYIQ(col, radians(180.));
    
`,
`   
    //Jupiter
    float n = 1.;
    float nb = opt1 == 1. ? n : n*2.;
    vec3 p  = npos() * nb;
    col = vec3(0.58333, .5, 0.41667);

    // ---------- BANDES ----------
    col += c(p.z*E);
    col *= c(p.z*4.);

    // circulation alternée : deux motifs de sens opposés, crossfade doux par bande
    float sel = .5 + .5*c(p.z*4.);
    col += mix(.066*s( p.z + p.y*6.666 + t),
            .066*s(-p.z - p.y*4.333 + t),
            sel);

    col *= c(p.z*8.);          // frontières nettes (touche zéro)

    // ---------- VORTEX LOCALISÉ ----------
    vec3 pn = normalize(p);

    // centre qui dérive le long de sa bande (orbite autour de Z)
    float a = t*.1;
    vec3 center = normalize(vec3(cos(a), sin(a), -.25));   // .4 = latitude du vortex

    // enveloppe gaussienne de la tache
    float dist = distance(pn, center);
    float blob = exp(-dist*dist*8.);                     // 8. = taille (plus grand = plus petit)

    // repère tangent local au centre -> rotation interne sûre (pas de moiré polaire)
    vec3 up = vec3(0.,0.,1.);
    vec3 tx = normalize(cross(up, center));
    vec3 ty = cross(center, tx);
    float lx = dot(pn - center, tx);
    float ly = dot(pn - center, ty);

    float ang = atan(ly, lx);
    float rad = length(vec2(lx, ly));
    float swirl = blob * s(ang*2. - rad*40. + t*3.);     // spirale à 2 bras, tournante

    // couleur du vortex (rouge-orangé) + volutes internes
    vec3 spotColor = vec3(.7, .25, .15);
    col = mix(col, spotColor, blob*.8);
    col += .18*swirl;

    // ---------- FINITION ----------
    col += .1*tube(col, 12.);
    
`,
`   
    //GoodView
    col = .5*vec3(.1875, .25, .333);
    float n = 6.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 p  = abs((npos()) * nb);
    
    col += m(p);

    col = est(col, PI, W*E, E);

    
`,
`   
    //Nice crosses
    float n = .25;
    float nb = opt1 == 1. ? n : n*2.;
    vec3 p  = npos() * nb;
    col = vec3(.75, .75, .75);

    for(float i = 0.; i < 4.; i+=1.){
        p = fract(p*col)-.5;
        col += m(col*p*i);
    }

    col *= .125+tube(col, 1.775);

    col += palette(m(col));

    col = 1.-col;
    
`,
`   
    //Damier
    float n = .25;
    float k = .0125;
    float nb = opt1 == 1. ? n*1. : n*2.;
    vec3 p  = npos() * nb;
    col = vec3(k, k, k);

    
    col -= mix(0.2, 8.*m(p*8.), .0 > 1.*m(p*8.));
    
`,
`   
    //Damier II
    float n = 1.;
    float k = .0;
    float nb = opt1 == 1. ? n*1. : n*2.;
    vec3 p  = npos() * nb;
    col = vec3(k, k, k);

    col += mix(0.0, 1.0, length(fract(p*2.)-.5) < .5);
    
`,
`   
    //Jungle II
    float n = 1.0333;
    float k = .0;
    float nb = opt1 == 1. ? n*1. : n*2.;
    vec3 p  = npos() * nb;
    col = vec3(k, k, k);

    float val = hce(hce(p*.75)+c(p*PI*.5));

    col += val;
    col += exp(-1./col);

    col *= tube(col, 4.);

    col *= 1.+ spec(.1*c(p*12.)+col+vec3(.4, .5, 1.), .75);
    
`,
`   
    //Power
    float n = 1.;
    float k = .5;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 p  = npos() * nb;
    col = vec3(k, k, k);

    float val = hce(p+ml(p, 1., .1)*col*p);

    col += val;
    col *= 1.+exp(-1./col);

    col *= tube(col, 4.);

    col *= 1.+ spec(.1*c(p*12.)+col+vec3(.4, .5, 1.), .75);
    
`,
`   
    //Power II
    float n = 1.;
    float k = .5;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 p  = npos() * nb;
    col = vec3(k, k, k);

    float val = hce(p+ml(p*c(p*PI), 1., .1)*col*p);

    col += val;
    col *= 1.+exp(-1./col);

    col *= tube(col, 4.);

    col *= 1.+ spec(.1*c(p*12.)+col+vec3(.4, .5, 1.), .75);
    
`,
`   
    //Glitter
    vec3 p  = npos(-1.);
    col *= p/(8.*o(p*(16.), 1., 1.*ec(2.5*p)+time*3.));

    col += tube(col, 2.);

    col = hueRotateYIQ(col, radians(212.));
    
`,
`   
    //Modern
    vec3 p  = npos() / (opt1 == 1. ? 5. : 5.);

    col = .25*ea(p*P/8.);
    col += 2.*o(p/col*Q);
    col -= 8.*m(8.*p);
    col *= tan(.3*col);

    col += .667*tube(col, 2.);

    col = hueRotateYIQ(col, radians(144.));
    
`,
`   
    //Palace
    float t = time*.1875;
    vec3 p = npos()*PI/3.;

    float c = 1./2.125;

    for (float i = 0.; i < 4.; i++) {
        col += Z*o(p*col*i*Z*.25);
    }

    col += 1.25*tube(col, 1.);
    col = palette(m(col));
    col = hueRotateYIQ(col, radians(180.));
    
`,
`   
    //White glow
    vec3 p  = npos(-1.) / (opt1 == 1. ? 1. : 2.72);
    col += o(16.*p);
    col += 2.72*m(24.*p);
    col *= (1.*o(p, 8., time));

    col = rainbop(m(col*.5), col*p);



    col += tube(col, 2.);
    col  = 1. - col;
    
`,
`   
    //Lucky
    float n = 8.;
    float k = .5;
    float nb = opt1 == 1. ? n*1. : n*1.;
    vec3 p  = abs(npos()) * nb;
    col = vec3(k, k, k);

    for(float i = 0.; i < 1.; i+=.25){
        p += i;
        col *= 1.+m(p+i);
    }
    
    col += .25*hdr(col, 1.);
    col += .25*spec(col, 1.);
    col += tube(col, 3.);
    col *= 1.1125+.046875*edge(col, 1.);

    col = hueRotateYIQ(col, radians(48.));
    col = 1.-col;
    
`,
`   
    //Disco
    vec3 p = npos();

    vec3 p0  = p;
    col = vec3(0);
    for (float i = 0.0; i < 4.0; i++) {
        p = fract(p * 1.5) - 0.5;

        float d = length(p) * .667*ea(-.000125*length(p0));

        vec3 color = palette(length(p0) + i*.4 + time*.4);

        d = sin(d*8. + time)/8.;
        d = abs(d);

        d = pow(0.01 / d, 1.2);

        col += color * d;
    }
    
`,
`   
    //Disco II
    vec3 p0 = npos() * (opt1 == 0. ? 1. : .5);

    vec3 p = abs(p0);

    vec3 pb = p / baseColor(p);

    col -= baseColor(c(col*p*8.));
    col *= ms(p*8.+t);
    col /= absp(ms(pb*8.+t), .125);


    col = abs(col);
    
`,
`   
    //Disco III
    vec3 p0 = npos() * (opt1 == 0. ? 1. : .5);

    vec3 p = abs(p0);

    vec3 pb0 = p0 / baseColor(p0);
    vec3 pb = p / baseColor(p);

    float vor = voronoiPos(os(pb0)*pb0*12., 1.);

    col = vor-baseColor(pb*E*vor);
    col += inkPigment(1.);
    
`,
`
   //Grid
    col = meshFg;
    float coeffLine = S/3.0;

	// Grid
	float gu = fract(vUV.x * P * uvCoeff.x);
	float gv = fract(vUV.y * Q * uvCoeff.y);

	float edgeU = 1.0 - (lineWidth * coeffLine * ((S-2.0)/6.0)) / P;
    float edgeV = 1.0 - (lineWidth * coeffLine * ((S-2.0)/6.0)) / Q;
    float fw = fwidth(vUV.x * P); // width of one pixel in UV space
    float fh = fwidth(vUV.y * Q);
    float lineU = smoothstep(edgeU - fw, edgeU + fw, gu);
    float lineV = smoothstep(edgeV - fh, edgeV + fh, gv);
    float line = min(lineU + lineV, 1.0);

    if(line < 0.5) discard;  
`,
`
    // Hexagonal grid
    vec2 hexUV = vec2(vUV.x * uvCoeff.x, vUV.y * uvCoeff.y) * P;
    float row = floor(hexUV.y);
    if(mod(row, 2.0) > 0.5) hexUV.x += 1.0;
    vec2 cell = fract(hexUV) - 0.5;
    float d = sdHexagon(cell, 5.666/12.0);
    // Only display the edges (d close to 0)
    if(abs(d) > T + 0.05) discard;
    col = 1.0-backgroundColor;
`,
`
    // Position-based grid
    float epaisseur = S/200.0;
    vec3 pos = fract(npos(-1.) * P/8.0) - 0.5;
    float tub = min(abs(pos.x*2.0), min(abs(pos.y), abs(pos.z)));
    if(tub > epaisseur) discard;
    col = 1.0-backgroundColor;
`,
`
    //Curvatures
    vec3 pos = opt1 == 1.0 ? vPosition : npos();
    float lnpos = length(vNormal * pos);

    // Isocourbes
    float freq = S-.5; // nombre de bandes
    float phase = fract(lnpos * freq);
    float fw = fwidth(lnpos * freq);

    // Ligne nette
    float line = 1.0 - smoothstep(0.0, fw * 2.0, min(phase, 1.0 - phase));

    // Glow autour des isocourbes
    float glowSize = P/8.0;
    float glow = 1.0 - smoothstep(0.0, fw * glowSize, min(phase, 1.0 - phase));

    col = vec3(lnpos);

    // Composition
    vec3 glowColor = palette(lnpos) * (T+1.5); // surexposé pour l'effet lumineux
    col = mix(col, glowColor, glow * 0.5);
    col = mix(col, vec3(1.0), line * Q/64.0);

    col = 1. - col;

`,
`
    //Stained glass
    col = vec3(1.6667);
    float nb = 4.;
    vec3 p = npos() * (opt1 == 0. ? 1. : .5) * nb;

    col *= .05 + tube(p, 1.667*length(c(pm(p*1.667)+t*.125)));

    col *= rainbop(length(col), c(p*8.)*p*.5);

    col *= pm(3.*col);

`,
`
    //Stained glass II
    col = vec3(1.6667);
    float nb = 6.666667;
    vec3 p = npos() * (opt1 == 0. ? 1. : .5) * nb;

    p = pm(p);
    col *= tube(p, m(p*.25+g(p*.33)+t*.125));

    col /= pm(rainbop(length(col), c(p*8.)*p*.5));

    col *= 1.25-pm(eqPos(o(col*p*.25), m(col*p*.125)));

    col *= pm(3.*col);

`,
`
    //Stained glass III
    float n = 2.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 nrm = normalize(vNormal);
    vec3 geoTint = vec3(0.6) + 0.4 * nrm;
    vec3 p0 = ((npos()) * nb);
    vec3 p  = abs(p0);

    float ti = t * .5;

    p *= absp(1./10.*o(p*14.+t*.25));

    vec3 paint = baseColor(p+0.*o(abs(p)*8.));
    float vor = voronoiPos(p*1., .0);

    for(float i = 1.; i < 6.; i+=1.){
        paint = brushLayerAnim(paint/(1.+.0125*i), p, 2.*i*absp(.1, vor*i/5.), 1.90, geoTint, .2, 0.);
    }
    
    col = paint;
    col *= absp(m(p*8.), .03125);

`,
`
    //Checkerboard
    float val   = 0.1667 * m(6. * vPosition * (opt1 == 0.0 ? vec3(1.0) : vNormal), P/32.0, time);
    float c     = S/2.0;
    vec3 valCol = cpalette(val*c, cpalette(1.0/(c/2.0), heatmap(val*c)));

    col = vec3(val > 0.0 ? valCol : vec3(1.0)-valCol);


`,
`
    //Simple

`,
`
    //Rosette
    vec3 p  = npos(-1.);
    vec3 ps = nspos(-1.);

    col += .5-o(ps*16.);

`,
`
    //FBM
    float nb = 1. * (opt1 == 0. ? 1. : .5);
    vec3 p = abs(npos()) * nb;

    float ti = t/3.;

    float fb = fbm(vec2(o(p*8.)));

    col = vec3(0.5);
    col -= o(8.*p*wrap(fb, 7./12.*fb));

    col -= smoothstep(.5, .5, col);

`,
`
    //FBM guess
    float nb = 1. * (opt1 == 0. ? 1. : .5);
    vec3 p = abs(npos()) * nb;

    float ti = t/3.;

    float fb = fbm(vec2(o(p*8.), t+c(t)));

    col = vec3(0.5);
    col -= o(8.*p*wrap(fb, 7./12.*fb));

    col -= smoothstep(.5, .5, col);
    col -= max(smoothstep(.2, .6, col), smoothstep(.8, 1.125, col));
    col *= 1.+max(smoothstep(.2, .6, col), smoothstep(.8, 1.125, col));

`,
`
    //FBM target
    float nb = 1. * (opt1 == 0. ? 1. : .5);
    vec3 p = abs(npos()) * nb;

    float ti = t/3.;

    float val = length(c(p*8.));
    vec3 valv = vec3(val);

    float fb = fbm(vec2(val, tube(valv, W)));

    col = vec3(0.5);
    col -= os(8.*p*fb);

    col -= smoothstep(.5, .5, col);
    col -= max(smoothstep(.2, .6, col), smoothstep(.8, 1.125, col));

`,
`
    //FBM wrot
    float nb = 1. * (opt1 == 0. ? 1. : .5);
    vec3 p = abs(npos()) * nb;

    float ti = t/3.;

    float val = length(c(p*8.));
    vec3 valv = vec3(val);

    float fb = fbm(vec2(val, tube(valv, W)));

    vec3 pw = wrot(p, 0., 1., PI/2.);

    col = vec3(0.5);
    col -= os(8.*pw*fb);

    col -= smoothstep(.5, .5, col);
    col -= max(smoothstep(.2, .6, col), smoothstep(.8, 1.125, col));

`,
`
    //FBM wrot II
    float nb = 1. * (opt1 == 0. ? 1. : .5);
    vec3 p = abs(npos()) * nb;

    float ti = t/3.;

    vec3 pw  = wrot(p, 0., 1., -t/3.);
    float fb = fbm(vec2(tube(pw, 4.), tube(pw, 4.)));

    float vcol1 = m(16.*pw*fb-t/3.);
    float vcol2 = o(16.*pw*fb-t/3.);

    col = vec3(.45, .52, .55);
    col -= min(vcol1, vcol2);

    col -= smoothstep(.5, .5, col);
    col -= max(smoothstep(.2, .6, col), smoothstep(.8, 1.125, col));

`,
`
    //Lines
    float nb = opt1 == 0.0 ? 16. : 8.;

    vec3 n  = vNormal * nb;
    vec3 p  = npos() * nb;
    vec3 ps = nspos() * nb;

    vec3 na  = abs(n) + 1.;
    vec3 pa  = abs(p) + 8.;
    vec3 psa = abs(ps) + 8.;
    
    //col *= 24.*tube(col*p*2., o(p*.125));
    col /= 2.*cos(8.*cpow(na.x/pa.z, na.y/pa.z));
    col /= o(col, 8.);

`,
`
    //No pole
    float nb = opt1 == 0.0 ? 16. : 8.;

    vec3 n  = vNormal * nb;
    vec3 p  = npos() * nb;
    vec3 ps = nspos() * nb;

    vec3 na  = abs(cos(2.*n)) + 5.;
    vec3 pa  = abs(p*8.) + 10.;
    vec3 psa = abs(ps) + 1.;
    
    //col -= 1.;
    col *= E*cos(36.*cpow(cos(.5*na.x)/pa.z, na.y/pa.z));
    col *= E*sin(6.*cpow(na.x/pa.z, na.y/pa.z));

    col += 3.*tube(col, 1.);

    col = 1. - col;

`,
`
    //Ghost
    vec3 posN = normalize(vPosition);
    if(length(posN) > length(vNormal)){ discard; }  
`,
`
    //Mother-of-pearl
    vec3 pos  = npos() / (opt1 == 1.0 ? 8. : 1.);
    col -= cos(2.*o(la(pos), length(ea(pos)), time));

    col += tube(col, 2.);
    col = 1.0 - col;   
`,
`
    //Log-Exp
    vec3 pos  = npos() / (opt1 == 1.0 ? 8. : 1.);
    col -= cos(2.*o(la(.000333+pos*vNormal), length(ea(pos)), time));
    col += abs(cos(3.*vNormal*pos));

    col += tube(col, 2.);
    col = 1.0 - col;
     
`,
`
    //Butterfly
    vec3 pos = npos() * P / (opt1 == 0. ? 32. : 96.);
    col -= m(ea(pos*vNormal), 4., time);
    col *= o(la(pos), 4., time);
    col -= .5*cos(3.*col*vNormal*pos);

    col += 2.*tube(col, 2.);
     
`,
`
    //Sweet
    vec3 pos   = normalize(vPosition);
    vec3 posN  = cross(vNormal, pos);
    float posL = length(vPosition);
    vec3 col1  = rainbop(posL, pos); 
    vec3 col2  = cpalette(posL, pos); 

    col = mix(col1, col2, pos);

    col += tube(col, 2.);

    col = 1.0 - col;
     
`,
`
    //Lego
    float nb = P/4.0;
    vec3 pos = Q*floor(vPosition * nb)/(16.0*32.0);

    pos = vec3(m(pos), o(pos), hc(pos));

    vec3 col1 = rainbop(pos.x, pos);
    vec3 col2 = cpalette(pos.y, pos);
    vec3 col3 = rainbop(pos.z, pos);

    col = 1.0-mix(col1, col2, Ts(0.5)*col3);
`,
`
    //Position
    col = 1.0-rainbow(length(vPosition));
    col += 2.*tube(vPosition*col, 1.);

`,
`
    //Normal
    col = vNormal;

    
`,
`
    //Smooth
    vec3 p  = npos() / (opt1 == 1. ? .25 : .125);
    vec3 n  = vNormal / (opt1 == 1. ? .25 : .125);

    col /= 1.+(m(p)+m(n));

    col -= .375+spec(col*1., 1.);

    
`,
`
    //HDR
    vec3 p  = npos() / (opt1 == 1. ? .25 : .125);
    vec3 n  = vNormal / (opt1 == 1. ? .25 : .125);

    col /= 1.+(m(p*2.)+o(n*2.));

    col += tube(col, 2.);
    col *= hdr(col, 1.);
    
`,
`
    //Atmosphere
    vec3 col1 = palette(1.0 - abs(dot(normalize(vNormal), normalize(cameraPosition - vWorldPosition)))); 
    vec3 col2 = rainbow(1.0 - abs(dot(normalize(vNormal), normalize(cameraPosition - vWorldPosition))));

    col = mix(fract(col1*col2), col2, vPosition);

    
`,
`   
    //RotTile
    col  = vec3(0.0); 
    vec3 col1 = col;
    vec3 col2 = col;

    vec3 pattern = rotateTilePattern(vUV, S);
    vec2 st = pattern.xy;
    
    col = vec3(step(st.x,st.y));
`,
`   
    //Hexagon
    vec2 hexUV = vec2(vUV.x * uvCoeff.x, vUV.y*uvCoeff.y) * P * 0.5;
    float row = floor(hexUV.y);

    vec2 cell = fract(hexUV) - 0.5;
    col = vec3(0.0);

    float d = sdHexagon(cell, 5.666/12.0);
    col = vec3(smoothstep(0.042, 0.0, abs(d))); // contour
    
    if(col == vec3(0.0)){
        col = palette(d+time*0.125);
    }
`,
`   
    //Carpet
    vec3 p  = npos(-1.);
    col += .0625*ec(-time+abs(p*8.), 1., 8.*m(p));
    col -= .5*o(-time+abs(p*8.), 1., 8.*m(p));

    col += .5*tube(col, 2.);
    col  = 1. - col;

    col = hueRotateYIQ(col, radians(212.));

`,
`   
    //Carpet II
    vec3 p  = npos(-1.);
    col -= cos(8.*o(p*2.));
    col -= sin(8.*m(p*2.));
    col -= lc(col);
    col += .125*ec(1.25*cos(col*1.25));

    col  = 1. - col;

    col = hueRotateYIQ(col, radians(212.));

`,
`   
    //Tubes
    vec3 p  = npos(-1.);
    col *= (8.*o(p*(3.+2.*abs(cos(.25*time))), 1., 0.*m(1.*p)));

    col += tube(col, 2.);
    //col  = 1. - col;

    col = hueRotateYIQ(col, radians(212.));

`,
`   
    //Ara
    vec3 pos  = npos();

    float c = 2.72;
    float k = 2.;
    float w = 2.;

    vec3 posN = vec3(
        ol(w*la(pos) * cos(c*pos.z), k, time), 
        ol(w*la(pos) * cos(c*pos.z), k, time), 
        ml(w*la(pos) * cos(c*pos.z), k, time)
    ) * P / 64.;

    col = cos(1.618*posN)*sin(8.*pos);

    col += tube(col, 1.);
    col = hueRotateYIQ(col, radians(180.));

`,
`   
    //Ara II
    float n = 2.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 nrm = normalize(vNormal);
    vec3 geoTint = vec3(0.6) + 0.4 * nrm;
    vec3 p0 = ((npos()) * nb);
    vec3 p  = abs(p0);

    col = vec3(.5);

    float ti = .5*PI + t * PI / 50.;

    col *= mc(p, ms(p+ti)*2., oe(p*.5)*8., .0);

    col /= absp(est(col, E, 1.), .075);
    col -= .5*cpalette(m(col), p);

`,
`   
    //MSC
    float n = 2.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 nrm = normalize(vNormal);
    vec3 geoTint = vec3(0.6) + 0.4 * nrm;
    vec3 p0 = ((npos()) * nb);
    vec3 p  = abs(p0);

    col = vec3(.5);

    col *= 2./3. + msc(p, o(p*absp(c(p*2.)), 2./3.)*2., ms(p*c(p*.5))*8., .125);

    col /= absp(est(exp(col*.03125), 2.76667, PI), .075);
    col *= absp(cpalette(m(col*4.), p), 2./3.);

    col = hueRotateYIQ(col, radians(333.));

    col = (col - 0.5) * 1.25 + 0.5;

`,
`   
    //Ccol
    float n = 1.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 nrm = normalize(vNormal);
    vec3 geoTint = vec3(0.6) + 0.4 * nrm;
    vec3 p0 = ((npos()) * nb);
    vec3 p  = 1.-abs(p0);

    col = vec3(.5);

    float val = oe(p*10./3., 1., 0.);

    col *= val;

    col = log(absp(ccol(
        col,
        c(col*4.),
        ms(val*c(p*8.))*col
    ), 2./3.));

    col = 1. - col;

`,
`   
    //Ccol II
    float n = 1.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 nrm = normalize(vNormal);
    vec3 geoTint = vec3(0.6) + 0.4 * nrm;
    vec3 p0 = ((npos()) * nb);
    vec3 p  = 1.-abs(p0);

    col = vec3(.5);

    vec3 val = (1.*mp(p * 8. * o(p*8.)));

    col = val;

    col = log(absp(ccol(
        col,
        col,
        col*.125
    ), 2./3.));

    col = 1. - col;

`,
`   
    //Ccol III
    float n = 1.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 p0 = ((npos()) * nb);
    vec3 p  = 1.-abs(p0);

    col *= o(p*4.)*soi(p*4., 2., 2.);

    col /= 1./6.+ccol(
        col*2./3.,
        48.*mp(col*tube(col, 8.)),
        col*col
    );

`,
`   
    //Glowy
    vec3 pos = .42 * npos() * (1.5*P+2.) / (opt1 == 0.0 ? 2.0 : 6.0);

    float val1 = m(pos*.41667, .5, .125*time);
    float val2 = o(pos*.41667, .5, -.125*time);
    float val3 = hc(pos*.41667, 2., .125*time);

    vec3 val   = vec3(val1, val2, val3);
    float valL = length(val);

    col = 1.0 - cpalette(2.*cos(2.*valL), rainbop(valL, val));

    col = hueRotateYIQ(col, radians(92.));
`,
`   
    //Glowy II
    vec3 pos   = npos() * P / (opt1 == 0.0 ? 32.0 : 64.0);
    float val1 = m(m(pos*12.), o(pos*16.), .5*ec(pos*.75));
    float val2 = length(pos);
    float val3 = o(pos*val2);

    vec3 vCol   = vec3(val1, val2, val3);
    float vColL = length(vCol);

    col = rainbop(vColL, .5*cos(pos)*vCol+time*.33);

    col += tube(col, 2.);

    col = hueRotateYIQ(col, radians(128.));
    col = 1.0 - col;
    
`,
`   
    //Glowy III
    vec3 p = npos() / P;
    vec3 n = vNormal;
    vec3 pn = p*n;
    vec3 pdn = 8.*rainbop(dot(p, n), pn);

    col /= 8.*(m(pdn, 5.*o(pdn*.5), time));
    
`,
`   
    //Glowy IV
    float n = 2.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 nrm = normalize(vNormal);
    vec3 geoTint = vec3(0.6) + 0.4 * nrm;
    vec3 p0 = ((npos()) * nb);
    vec3 p  = abs(p0);

    float ti = t * .5;

    p *= absp(.125*o(p*8.+t*.25));

    vec3 paint = baseColor(p+0.*o(abs(p)*8.));
    float vor = voronoiPos(p*16., .0);

    for(float i = 1.; i < 6.; i+=1.){
        paint = brushLayerAnim(paint/(1.+.0125*i), p, 2.*i*absp(.1, 0.), 1.90, geoTint, 0.2, 0.);
    }
    
    col = paint;
    
    col *= .125+pm(1./48.*edge(paint, 16.));
    
`,
`   
    //Brush pattern
    float n = 1.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 p0 = ((npos()) * nb);
    vec3 p  = 1.+abs(p0);

    float val = o(p*12.+t/3.);

    col += val;

    vec3 brush = 1./3.*brushLayerAnim(col-2.*tube(col, 1.), p0*val, 6., E, 3.*col, .2, 3.);
    brush /= brushLayerAnim(col-1.*tube(col, 12.), p*val, 2., E, 3.*col, .2, 3.);

    col = ccol(
        brush*2.,
        1./6.*c(brush*6.),
        brush
    );
    
`,
`   
    //Brush pattern II
    float n = 1.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 p0 = ((npos()) * nb);
    vec3 p  = 1.+abs(p0);
                         // position monde
    vec3 tint = mix(vec3(1.0), col, 0.8);        // ex. dérivé de K ou de N

    p0 *= o(p*8.+t/3.);

    col = baseColor(p0);                                      // imprimatura
    col = brushLayerAnim(col, p0,  2.0, 0.95, tint, 0.40, 0.50);  // masses
    col = brushLayerAnim(col, p0,  5.0, 0.80, tint, 0.16, 0.75);  // modelé
    col = brushLayerAnim(col, p0, 12.0, 0.55, tint, 0.07, 1.10);  // touches fines


    col *= .125+edge(col, .5);
    col -= 1.+tube(col, 4.);
    
`,
`   
    //Brush pattern III
    float n = 1.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 p0 = ((npos()) * nb);
    vec3 p  = 1.+abs(p0);
                         
    vec3 tint = mix(vec3(1.0), col, 0.8);

    p0 *= o(p*8.+1.*t/3.);

    col = .05*baseColor(p0);
    
    float cf = 3./6.*absp(la(ol(col*2.)));
    
    col = brushLayerAnim(col, p0, 24., .125, tint-cf, E, .0);
    col = brushLayerAnim(col, p0,  6., .5, tint-cf, .0, 0.5);
    col = brushLayerAnim(col, p0,  2., .5, tint-cf, .0, 0.5);
    col *= brushLayerAnim(col, p0, 4., .5, tint-cf, .0, .0);
    
    col *= .125+edge(col, .5);
    col = ccol(col);
    
`,
`   
    //Fract pattern
    float n = 1.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 p0 = ((npos()) * nb);
    vec3 p  = 1.+abs(p0);
                         
    vec3 tint = mix(vec3(1.0), col, 0.8);

    float val1 = wrap(o(p), W);
    float val2 = 3.6667*ms(p*3.);

    float val = mix(val1, val2, o(p*8.+t/3.));

    p0 *= val;

    col += m(p0*8.);


    if(fract(val/12.) > fract(length(col))){ col.x = 12.; }
    
`,
`   
    //Fract pattern II
    float n = 5./3.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 p0 = ((npos()) * nb);
    vec3 p  = 1.+abs(p0);

    p = wrap(p, .75*maxv(p));

    float val = oe(p*5., 1., t);
                         
    col *= val;

    col -= .5*absp(palette(length(col)), 2./3.);
    
`,
`   
    //Fract pattern III
    float n = 5./3.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 p0 = ((npos()) * nb);
    vec3 p  = 1.+abs(p0);

    p = wrap(p, absp(.75*maxv(p), -.75));
                         
    col /= 2./3./m(p*8.+t);

    col *= .5 + cpalette(0., p);

    col += la(col)/E;
    
`,
`   
    //Harlequin
    float nb = 16.;
    vec3 p = npos(-1.) * (opt1 == 1. ? nb : nb*.5);

    vec3 pv = abs(p);

    vec4 vorC = voronoiCellAnim(p, 2.);

    float vor = vorC.w;
    vec3 vorv = vorC.xyz;

    vec3 brush = brushLayerAnim(vec3(0.), vorv, 1., vor, vec3(E), 1., 2.);

    col = vec3(1.);
    col *= brush;

`,
`   
    //Harlequin II
    float nb = 16.;
    vec3 p = npos(-1.) * (opt1 == 1. ? nb : nb*.5);

    vec3 pv = abs(p);

    float vorS = voronoiPos(p, 1.);

    vec4 vorC = voronoiCellAnim(p, 2.);

    float vor = vorC.w-vorS;
    vec3 vorv = vorC.xyz;

    vec3 brush = brushLayerAnim(vec3(0.), vorv, 1., vor, vec3(6.), 0., 2.);

    col = vec3(1.);
    col *= brush;

`,
`   
    //Harlequin III
    float nb = 16.;
    vec3 p = npos(-1.) * (opt1 == 1. ? nb : nb*.5);

    vec3 pv = abs(p);

    float vorS = voronoiPos(p, 1.);
    vec4 vorC  = voronoiCellAnim(p, 2.);

    float vor = vorC.w-.5*c(vorS);
    vec3 vorv = vorC.xyz;

    vec3 brush = brushLayerAnim(vec3(0.), vorv, 1., vor, vec3(6.), 0., 2.);

    col = vec3(1.);
    col *= brush;

`,
`   
    //Harlequin IV
    vec3 p = npos()*PI;

    col += .333*exp(PI*c(p));
    col += o(2.*PI*s(p), .6667, 0.);
    

    col *= .125-tube(col*p, PI/4.);

    col += rainbop(length(p/PI), p*col*2.);
    
`,
`   
    //Truchet
    vec2 scale  = vec2(P*uvCoeff.x, P*uvCoeff.y);
    vec2 cell   = floor(vUV * scale);
    vec2 uv     = fract(vUV * scale)-0.5;
    float d     = length(uv);
    float index = hash21(cell);

    float rad = 0.5;
    float thickness = 0.1;

    col   = vec3(truchet(uv, index, rad, thickness));
    float lCol = length(col);

    if(lCol < 0.125){ discard; }

    col = meshFg;


`,
`
    // FractUV
    float scale = 24.0;
    float ratio = 2.0;

    vec2 uv     = vec2(vUV.x*ratio,vUV.y)*scale; 
    vec2 cellUv = fract(uv)-0.5;
    vec2 cellId = floor(uv);
    float d     = length(cellUv);
    float index = hash21(cellId);
    
    float valCol = d+0.125*time;

    vec3 col1 = palette(valCol-index);
    vec3 col2 = rainbow(valCol+index);

    col = mix((0.66+Tc(0.33))*col1, (0.33+Ts(0.42))*col2, cross(col1, col2));
    
    if(length(col) > 1.0){
        col /= 1.414;
    }
    
    
    
    
`,
`
    //Voronoi
    float nb = 8.;
    vec3 p   = npos(-1.) * (opt1 == 0. ? nb : nb*2.);

    col *= voronoiPos(p , 0.6);

`,
`
    //Voronoi Orange
    float n = 1.;
    float nb = opt1 == 0. ? n*.5 : n*1.;
    vec3 nrm = normalize(vNormal);
    vec3 geoTint = vec3(0.6) + 0.4 * nrm;
    vec3 p0 = ((npos(-1.)) * nb);
    vec3 p  = abs(p0);

    vec3 pw = wrap(p-t*.0125, 6.);

    float vor = 1.;
    for(float i = 1.; i <= 4.; i++){
        vor *= (2./(3.+i*.5))*log(4.*i*voronoiPos(p0*i*5., 1.));
    }

    col += 1./2.25*spec(col, 3.*cos(2./3.*vor+PI*log(col*12.+vor*E)), 5./3.);

`,
`
    //Voronoi Harlequin
    float nb = 32.;
    vec3 p = npos(-1.) * (opt1 == 1. ? nb : nb*.5);

    vec3 pv = p*(tanh(4.*p));

    //float vorS = voronoiPos(p, 1.);
    vec4 vorC  = voronoiCellAnim(p, 2.);

    float vor = vorC.w;
    vec3 vorv = vorC.xyz;

    vec3 brush = brushLayerAnim(vec3(0.), vorv, 1., c(vor), vec3(6.), 0., 2.);

    col = brush;

    col += o(pv*.5+t*.5);

    col = 1. - col;

`,
`
    //Voronoi Harl Wavy
    float nb = 12.;
    vec3 p = npos(-1.) * (opt1 == 1. ? nb : nb*.5);

    vec3 pv = p*(tanh(4.*p));

    float speed = 1.;

    float vorS = voronoiPos(p*4., speed);
    vec4 vorC  = voronoiCellAnim(p, speed);

    float vor = vorC.w;
    vec3 vorv = vorC.xyz;

    vec3 brush = brushLayerAnim(vec3(0.), vorv, 1., c(vor), vec3(6.), 0., speed);

    col = brush;

    col += .1*o(8.*pv+t*.5);

    col /= 1.25+tube(col*vorS*2., 1./vorS);

    col = 1. - col;

`,
`
    //VorInVor
    float nb = 6.;
    vec3 p = npos(-1.) * (opt1 == 1. ? nb : nb*.5);

    vec3 pv = p*(tanh(4.*p));

    float speed = .75;

    float vorS = voronoiPos(p*8., speed);
    vec4 vorC  = voronoiCellAnim(p, speed);

    float vor = vorC.w;
    vec3 vorv = vorC.xyz;
    float lv  = length(vorv);

    vec3 brush = brushLayerAnim(vec3(vorS, vorS, vorS), vorv, 1., vor*lv*.333, vec3(5., 5., 5.), 0., speed);

    col = brush;

    col /= 1.+tube(col, lv);
    col *= 1.+1./300.*edge(col, lv);

    col = 1. - col;

`,
`
    //Voronoi II
    float nb = 8.;
    vec3 p   = npos(-1.) * (opt1 == 0. ? nb : nb*2.);

    p = pm(p);
    col *= voronoiPos(p , 0.6) + o(p+t);


`,
`
    //Voronoi III
    col = .5*vec3(.1875, .25, .333);
    float n = 24.;
    float nb = opt1 == 0. ? n*.5 : n*1.;
    vec3 p0 = ((npos(-1.)) * nb);
    vec3 p  = abs(p0);

    float vor =  voronoiPos(p0, 1.);

    col += (cpalette(vor, col*col*3.));


`,
`
    //Voronoi IV
    col = .5*vec3(.1875, .25, .333);
    float n = 3.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 p  = abs((npos()) * nb);

    for(float i =1.; i < 5.; i+=1.){
        float vor = voronoiPos(p*(pm(msi(p+t/(4.*i), 2., 2.))), .5);
        col *= c(.5*vor/i);
        col *= .888+tube(col, i*.111);
        col *= rainbop(vor, col*c(col*4.));
        float lcol = length(col);
        col *= 1.+.888*eqPos(c(lcol*i*.5), i*.33);
    }


`,
`
    //Voronoi V
    col = .5*vec3(.1875, .25, .333);
    float n = 12.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 p  = abs((npos()) * nb);

    float vorE = exp(voronoiPos(p, .5));
    float vorL = log(voronoiPos(p, .5)); 

    col /= (o(p*pm(mix(vorE*.5, vorL*.5, Ts(.5)))));


`,
`
    //Voronoi VI
    col = .5*vec3(.1875, .25, .333);
    float n = 24.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 p  = abs((npos()) * nb);

    float vor = voronoiPos(p+o(p), .5);

    col *= -8.*c(vor*3.6667);


`,
`
    //Voronoi Sun
    col = vec3(.5, .0888, .41667);
    float nb = 1.;
    vec3 p   = npos(-1.) * (opt1 == 0. ? nb : nb*2.);
    vec3 ps  = nspos(-1.) * (opt1 == 0. ? nb : nb*2.);

    vec3 pa = pm(p);

    for(float i = 1.; i < 5.; i+=1.){
        col /= .5 + voronoiPos(p, .5);
        
        p*=PI;
    }

    col *= pm(cpow(col, PI*1.));
    col = hueRotateYIQ(col, radians(312.));
    col = (col - 0.5) * 1.12 + 0.5;


`,
`
    //P, pa , po
    col = .5*vec3(.1875, .25, .333);
    float n = 8.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 p  = abs((npos()) * nb);

    float ti = t * .125;

    vec3 pa = abs(p);
    vec3 po = pm(p);

    col += m(p);
    col += m(pa);
    col += m(po);


`,
`
    //P, pa , po II
    col = .5*vec3(.1875, .25, .333);
    float n = 12.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 p  = abs((npos()) * nb);

    float ti = t * .125;

    vec3 pa = abs(p);
    vec3 po = pm(p);

    col += m(go(p, .1667, .333)+ti);
    col *= o(go(pa, .5, .25)+ti);
    col -= m(go(po, .333, .666)+ti);

    col += .01*edge(col, .5);


`,
`
    //P, pa , po III
    col = E*vec3(1./2., 1./4., 1./3.);
    float n = 12.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 p  = abs((npos()) * nb);

    float ti = t * .125;

    vec3 pa = abs(p);
    vec3 po = pm(p);

    col += m(p+t*.5);
    col += m(2.*p+t*.75);
    col += m(p+t*.25);

    col -= tube(col, .5);
    col += .01*edge(col, .5);
    col += tube(col, 1.5);


`,
`
    //Pinkclass
    col = E*vec3(1./2., 1./4., 1./3.);
    float n = 8.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 p  = abs((npos()) * nb);

    float ti = t * .125;

    vec3 pa = abs(p);
    vec3 po = pm(p);

    float vor = voronoiPos(p, .5);

    col += m(p);

    col -= tube(col, 1.);
    col += .01*edge(col, 1.5);
    col += tube(col, 1.5);


`,
`
    //Pinkclass-GoM
    col = E*vec3(2./3., 1./6., 1./4.);
    float n = 8.;
    float nb = opt1 == 1. ? n*.5 : n*1.;
    vec3 p  = abs((npos()) * nb);

    float ti = t * .125;

    p = go(p, m(p+t*.125), .125);

    col *= o(p);

    float vor = voronoiPos(p*5., 2.);
    col *= pm(1.*tube(col, 6.*vor));
    col *= pm(1.*spec(col, E*vor));


`,
`
    //Random Perlin
    float c = noise_perlin(S/12.0*2.7*vPosition+time*0.25);
    float k = S/4.0;
    vec3 col1 = rainbow(c*k*0.75);
    vec3 col2 = palette(c*k*0.5);

    col = cross(col1, col2);
`,
`
    //Starfield
    vec3 p = npos(-1.) * (opt1 == 0.0 ? 1. : 2.);
    vec3 blend = abs(normalize(vNormal));
    blend = pow(blend, vec3(8.0));
    blend /= (blend.x + blend.y + blend.z);

    float NUM_LAYERS = 3.0;
    float t = time*0.005;

    vec3 colXY = vec3(0.0);
    vec3 colXZ = vec3(0.0);
    vec3 colYZ = vec3(0.0);
    for(float i=0.; i<1.; i+=1./NUM_LAYERS){
        float depth = fract(i+t);
        float scale = mix(20., .5, depth);
        float fade = depth*smoothstep(1.,.9,depth);
        float off = i*453.2-time*.05;
        if(blend.z > 0.05) colXY += StarLayer(p.xy*scale+off)*fade;
        if(blend.y > 0.05) colXZ += StarLayer(p.xz*scale+off)*fade;
        if(blend.x > 0.05) colYZ += StarLayer(p.yz*scale+off)*fade;
    }

    col = (colXY*blend.z + colXZ*blend.y + colYZ*blend.x) * 1.37 * (6.0/NUM_LAYERS);
    col += tube(col, 1.618);

`,
`
    //Grid uvParams
    vec2 uv = vUVParams * uvParamsCoeff;
    vec3 val1 = heatmap(cos(uv.x*P/2.0));
    vec3 val2 = heatmap(cos(uv.y*P/2.0));

    col = val1 + val2;
    col += .5*tube(col, 0.5);

`,
`
    //Liquid
    vec3 pL = vec3(.125, .75, .5) + (vPosition - vec3(.125, .75, .5)) * .03;
    float T = time * .25;

    vec3 c = clamp(1. - .7 * vec3(
        length(pL - vec3(.1, 0, .5)),
        length(pL - vec3(.9, 0, .5)),
        length(pL - vec3(.5, 1, .5))
        ), 0., 1.) * 2. - 1.;

    vec3 c0 = vec3(0);
    float w0 = 0.;
    const float N = 16.;
    for (float i = 0.; i < N; i++)
    {
        float wt = (i * i / N / N - .2) * .3;
        float wp = 0.5 + (i + 1.) * (i + 1.5) * 0.001;
        float wb = .05 + i / N * 0.1;

        // Trois directions tournantes dans l'espace 3D, différentes par itération
        float a1 = i * 2.399;          // angle 1 (~137°, golden angle pour décorréler)
        float a2 = i * 1.733 + 1.0;    // angle 2
        float a3 = i * 3.111 + 2.0;    // angle 3
        vec3 d1 = vec3(cos(a1), sin(a1) * cos(a2), sin(a1) * sin(a2));
        vec3 d2 = vec3(sin(a2) * cos(a3), cos(a2), sin(a2) * sin(a3));
        vec3 d3 = vec3(sin(a3), sin(a1) * sin(a3), cos(a3));

        float g1 = dot(pL, d1) * 23. * wp;
        float g2 = dot(pL, d2) * 15. * wp;
        float g3 = dot(pL, d3) * 17. * wp;

        c.zx = rotL(c.zx, 1.6 + T * 0.65 * wt + g1);
        c.xy = rotL(c.xy, c.z * c.x * wb + 1.7 + T * wt + g2);
        c.yz = rotL(c.yz, c.x * c.y * wb + 2.4 - T * 0.79 * wt + g3);
        c.zx = rotL(c.zx, c.y * c.z * wb + 1.6 - T * 0.65 * wt + g1);
        c.xy = rotL(c.xy, c.z * c.x * wb + 1.7 - T * wt + g2);

        float w = (1.5 - i / N);
        c0 += c * w;
        w0 += w;
    }
    c0 = c0 / w0 * 2. + .5;
    c0 *= .5 + dot(c0, vec3(1, 1, 1)) / sqrt(3.) * .5;
    c0 += pow(length(sin(c0 * PI * 4.)) / sqrt(3.) * 1.0, 20.) * (.3 + .7 * c0);

    col = c0;

`,
`
    //Porcelain
    // =======================================================
    // 1. Vecteurs de base
    // =======================================================
    vec3 V = normalize(cameraPosition - vWorldPosition);
    vec3 L = normalize(lampPosition - vWorldPosition);

    // Normale screen-space (fidèle à la géométrie GPU)
    vec3 dpdx = dFdx(vWorldPosition);
    vec3 dpdy = dFdy(vWorldPosition);
    vec3 N = normalize(cross(dpdx, dpdy));
    if (dot(N, V) < 0.0) N = -N;

    // =======================================================
    // 2. Courbure gaussienne & moyenne (screen-space)
    // =======================================================
    vec3 d2pdx2  = dFdx(dpdx);
    vec3 d2pdy2  = dFdy(dpdy);
    vec3 d2pdxdy = dFdx(dpdy);

    float D = dot(dpdx, dpdx);
    float F = dot(dpdx, dpdy);
    float G = dot(dpdy, dpdy);

    float e = dot(N, d2pdx2);
    float f = dot(N, d2pdxdy);
    float g = dot(N, d2pdy2);

    float denom = D * G - F * F;
    float gaussK = (denom != 0.0) ? (e * g - f * f) / denom : 0.0;
    float meanH  = (denom != 0.0) ? (e * G - 2.0 * f * F + g * E) / (2.0 * denom) : 0.0;

    // =======================================================
    // 3. AO depuis la courbure
    // =======================================================
    float aoLoGauss = (P != 0.0) ? P : -2.0;
    float aoHiGauss = (Q != 0.0) ? Q : 0.5;

    float aoFromGauss = smoothstep(aoLoGauss, aoHiGauss, gaussK);
    float aoFromMean  = smoothstep(-3.0, 1.0, meanH);
    float aoStrength  = (opt3 != 0.0) ? opt3 : 0.6;
    float ao = mix(1.0, aoFromGauss * aoFromMean, aoStrength);

    // =======================================================
    // 4. Éclairage
    // =======================================================

    // Wrap diffuse (faux SSS)
    float wrap = (opt2 != 0.0) ? opt2 : 0.3;
    float NdotL = dot(N, L);
    float diffuse = max(0.0, (NdotL + wrap) / (1.0 + wrap));

    // Atténuation distance lampe
    float dist = length(lampPosition - vWorldPosition);
    float atten = lampIntensity / (1.0 + dist * dist / (lampRadius * lampRadius));

    // Blinn-Phong spéculaire
    vec3 H = normalize(L + V);
    float NdotH = max(0.0, dot(N, H));
    float spec = pow(NdotH, lampSpecularPower) * lampSpecularIntensity;

    // Fresnel rim
    float fresnelPow = (opt1 != 0.0) ? opt1 : 3.0;
    float NdotV = max(0.0, dot(N, V));
    float fresnel = pow(1.0 - NdotV, fresnelPow);

    // =======================================================
    // 5. Composition
    // =======================================================
    vec3 rimColor = meshFg;
    vec3 specColor = mix(vec3(0.9, 0.95, 1.0), meshFg, 0.3);

    // Ambient
    col = meshBg * 0.12;

    // Diffuse + AO + atténuation lampe
    col += meshBg * diffuse * ao * atten;

    // Spéculaire
    col += specColor * spec * atten;

    // Fresnel rim
    col += rimColor * fresnel;

    // Teinte chaude dans les creux
    float cavity = 1.0 - aoFromGauss;
    col += vec3(0.05, 0.03, 0.01) * cavity;

    // Contraste
    col = (col - 0.5) * colorContrast + 0.5;

    // Tone mapping + gamma
    col = col / (col + vec3(1.0));
    col = pow(col, vec3(1.0 / 2.2));

`,
`
    //Chenese ink Claude
    // Encre de Chine (水墨). Le principe : la forme ne fabrique pas des ombres, elle
    // réclame de l'encre ; le pinceau la pose en traits, le papier la boit.
    //   opt1 : domaine du geste — sphère unité (défaut) ou espace objet, traits plus serrés
    //   opt2 : pinceau sec 枯筆 au lieu du lavis mouillé 濕筆
    //   opt3 : encre fraîche — la diffusion continue de travailler
    //   S : échelle du geste | T : charge d'encre | P : grain du papier | Q : nombre de tons

    // ---------- 1. Repère ----------
    vec3 Vw = normalize(cameraPosition - vWorldPosition);
    vec3 Nw = normalize(vNormal);
    if (dot(Nw, Vw) < 0.0) Nw = -Nw;
    vec3 Lw = normalize(lampPosition - vWorldPosition);

    vec3 p = npos();

    float gesture   = max(abs(S), 1.0) * 0.17;   // échelle des lavis
    float brushFreq = gesture * 9.0;             // largeur des traits
    float grainFreq = max(abs(P), 8.0);          // finesse du papier
    float tones     = clamp(floor(abs(Q) / 12.0), 3.0, 8.0);

    // ---------- 2. Diffusion capillaire ----------
    // Le domaine est déplacé par un bruit : toute frontière d'encre se digite au lieu de
    // rester nette, comme un trait qui remonte dans les fibres du papier.
    float flow = t * (opt3 == 1.0 ? 0.05 : 0.0);
    vec3  bled = p + 0.24 * (vec3(inkTurbulence(p * 2.6 + flow,       3.0),
                                  inkTurbulence(p * 2.6 + 7.1 + flow, 3.0),
                                  inkTurbulence(p * 2.6 + 3.3 + flow, 3.0)) - 0.4);

    // ---------- 3. La carte du geste ----------
    // Deux coordonnées orthogonales dont l'orientation dérive lentement : leurs lignes de
    // niveau restent localement parallèles, comme des passages de pinceau. Elles sont
    // prises sur p et non sur bled — déformer la carte elle-même ferait tourner les traits
    // sur eux-mêmes et marbrerait tout. La bavure n'intervient qu'à l'échelle du bord.
    float ang = 1.3 * (inkFbm(p * 0.28, 2.0) - 0.5);
    vec3  q   = rotAxis(vec3(0.35, 1.0, 0.20), ang) * p;

    // Une ondulation large — plus large qu'un trait, sinon on marbre — courbe toute la
    // famille de traits d'un seul mouvement.
    float across = q.y + 0.30 * inkFbm(p * 0.55,        2.0) + 0.72 * (bled.y - p.y);
    float along  = q.x + 0.30 * inkFbm(p * 0.55 + 41.7, 2.0) + 0.72 * (bled.x - p.x);

    // ---------- 4. Ce que la forme réclame ----------
    // Le peintre ne dégrade pas la lumière : il charge le cœur de l'ombre, les replis et
    // le contour, et laisse respirer tout le reste (留白).
    float shade   = 1.0 - clamp(0.5 + 0.5 * dot(Nw, Lw), 0.0, 1.0);
    float core    = smoothstep(0.42, 1.0, shade);
    float cavity  = smoothstep(0.05, -0.4, inkCurvature(vWorldPosition, Nw));
    float contour = pow(1.0 - max(dot(Nw, Vw), 0.0), 4.0);              // 骨法用筆, le trait d'ossature

    // Le lavis porte la composition : c'est lui qui décide des grandes réserves de papier.
    float wash   = inkContrast(inkBleed(bled * gesture, 1.6, 3.0), 1.8);
    float weight = 0.62 * wash * (0.35 + 0.50 * core + 0.90 * cavity);
    weight = clamp(weight + 0.55 * T, 0.0, 1.0);

    // ---------- 5. Le geste ----------
    // Le pinceau ne dilue pas son encre : pour foncer, le peintre pose PLUS de traits,
    // plus serrés. C'est donc le seuil qui descend quand la forme réclame, et les traits
    // se rejoignent d'eux-mêmes en masse noire — sans jamais devenir un dégradé.
    float band = inkContrast(inkStroke(across, along, 6.0, brushFreq, 3.0), 2.3);

    // Pression du poignet : elle varie vite LE LONG du trait et lentement en travers, donc
    // chaque trait enfle, s'amincit, puis se lève du papier. C'est l'attaque et la sortie
    // du geste, au lieu d'un ruban d'épaisseur constante.
    float press = inkFbm(vec2(across * brushFreq * 0.30, along * brushFreq * 1.10), 2.0);
    float load  = clamp(weight * (0.40 + 1.30 * press), 0.0, 1.0);

    // En vue rasante la période d'un trait tombe sous le pixel. Plutôt que de laisser le
    // motif grésiller, on le fond vers son propre taux de couverture : c'est ce que voit
    // l'œil qui recule devant une peinture.
    float crisp = 1.0 - smoothstep(0.35, 1.0, fwidth(across) * brushFreq);
    float thr   = mix(0.97, 0.26, load);
    float touch = mix(load, smoothstep(thr, thr + 0.18, band), crisp);

    float density = touch * (0.30 + 0.80 * load);
    density += 0.30 * weight * wash;                    // le lavis dormant sous les traits

    // 焦墨, l'encre brûlée : quelques traits partent au noir franc. Sans eux tout reste en
    // demi-teinte et le dessin perd son ossature.
    density += 0.60 * smoothstep(0.86, 0.98, band) * smoothstep(0.12, 0.50, load);
    density += 0.85 * contour * (0.30 + 0.70 * band);   // le contour est peint, pas calculé
    density += 0.14 * (inkTurbulence(bled * gesture * 2.6, 3.0) - 0.4);

    // ---------- 6. Les cinq tons et les auréoles de séchage ----------
    // Quantifier à fond donnerait une sérigraphie : on mélange le lavis continu et sa
    // version en paliers, juste assez pour que les bords de ton existent.
    float raw = clamp(density, 0.0, 1.0);
    float rim;
    float tone = mix(raw, inkTones(raw, tones, 0.17, rim), 0.42);
    tone += 0.20 * rim * smoothstep(0.05, 0.30, raw);    // pas d'auréole sur le papier nu

    // ---------- 7. Le blanc volant ----------
    float dryness = opt2 == 1.0 ? 0.90 : 0.38;
    float white   = inkFlyingWhite(across, along, dryness, brushFreq * 2.2) * crisp;
    tone *= 1.0 - white * smoothstep(0.02, 0.45, tone) * (opt2 == 1.0 ? 0.85 : 0.45);

    // ---------- 8. Le papier xuan ----------
    float grain = inkPaperGrain(p, grainFreq);
    vec3  paper = mix(vec3(0.960, 0.936, 0.870), meshBg, 0.26);
    paper *= 0.96 + 0.08 * grain;
    paper  = mix(paper, paper * vec3(1.03, 0.99, 0.93), inkFbm(p * 0.6, 3.0));  // plages jaunies
    tone  *= 0.93 + 0.14 * grain;                                               // la fibre boit inégalement

    // ---------- 9. Le pigment ----------
    // stick garde sa composante maximale à 1 : la couleur choisie teinte le bâton d'encre
    // sans l'éclaircir. L'absorption, elle, fait le reste.
    vec3 stick   = meshFg / max(max(meshFg.r, max(meshFg.g, meshFg.b)), 1e-3);
    vec3 pigment = inkPigment(tone) * mix(vec3(1.0), stick, 0.28);

    col = inkAbsorb(paper, pigment, clamp(tone, 0.0, 1.3));

`,

];



/**
 * Returns the shared GLSL utility functions used by both GPUShaderMesh.js
 * (createFragmentShader) and the fragment shader header (Monaco editor).
 *
 * Includes: normalized position helper, time-based sine/cosine oscillators,
 * lighting constants and Blinn-Phong shading, Perlin noise, color palettes
 * (rainbow, heatmap, HSV), 2D rotation, tile rotation patterns, SDF primitives
 * (hexagon, circle), Voronoi, Truchet arcs, Fractal Brownian Motion (FBM),
 * starfield layers, checkerboard, and various math shorthands (m, o, f, hc, cpow).
 *
 * The `ink*` family (used by the "Chenese ink Claude" shader) models Chinese ink wash:
 * capillary bleeding, brush strokes laid out in a gesture chart, the five ink tones and
 * their drying halos, dry-brush reserves, xuan paper grain, ink pigment colour and
 * Beer-Lambert absorption into the paper.
 *
 * @returns {string} A GLSL source code string containing all shared utility functions.
 */
function getFragmentUtilsGLSL() {
return `
vec3 npos(){ return opt1 == 0.0 ? normalize(vPosition) : vPosition; }
vec3 npos(float inv){ return opt1+inv == 0.0 ? normalize(vPosition) : vPosition; }

vec2 nuv(float u, float v, float uMinU, float uMaxU, float uMinV, float uMaxV){ 
    return vec2(u / ((uMaxU - uMinU) / 2.), v / ((uMaxV - uMinV) / 2.));
}

vec3 nspos(){ return opt1 == 1.0 ? normalize(vec3(vSpherePos.x, vSpherePos.y, vSpherePos.z)) : vec3(vSpherePos.x, vSpherePos.y, vSpherePos.z); }
vec3 nspos(float n){ return opt1 == 1.0 ? normalize(vec3(vSpherePos.x, vSpherePos.y, vSpherePos.z)) : vec3(vSpherePos.x, vSpherePos.y, vSpherePos.z); }

float Ts(float c){ return 0.49999*sin(c*time)+0.5; }
float Tc(float c){ return 0.49999*cos(c*time)+0.5; }

vec3 absp(vec3 vect){
    return 1.0 + abs(vect);
}
vec3 absp(vec3 vect, float val){
    return val + abs(vect);
}
float absp(float val){
    return 1.0 + abs(val);
}
float absp(float val1, float val2){
    return val2 + abs(val1);
}

// k = raideur du palier : 1. = linéaire (aucun palier), grand = paliers longs
float plateau(float s, float k){
    float i = floor(s);
    float f = fract(s);
    // sigmoïde centrée, normalisée pour rester dans [0,1] et passer par 0.5 au milieu
    float a = 0.5 * (1. + tanh(k * (f - 0.5)) / tanh(k * 0.5));
    return i + a;
}

float nbTrajectory(float tm, float spd, float hld){
    const int NK = 5;
    const float keys[NK] = float[](2., 3., 4., 5., 8.);

    float speed = spd;   // tempo global du cycle
    float hold  = hld;     // 0..1 : fraction de chaque palier passée à l'arrêt
    float u = fract(speed * tm) * float(NK);
    int   i = int(floor(u));
    int   j = (i + 1) % NK;        // boucle : dernier -> premier = "reset" rapide
    float f = fract(u);
    float t = smoothstep(0., 1., clamp((f - hold) / (1. - hold), 0., 1.));
    return mix(keys[i], keys[j], t);
}

float hash31(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}
float hash312(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.x + p.y) * p.z);
}

// Hash 3D → 3D, déterministe par cellule
vec3 hash33(vec3 pt) {
    pt = vec3(dot(pt, vec3(127.1, 311.7,  74.7)),
              dot(pt, vec3(269.5, 183.3, 246.1)),
              dot(pt, vec3(113.5, 271.9, 124.6)));
    return fract(sin(pt) * 43758.5453123);
}

// Voronoï 3D : renvoie .xyz = centre (seed) de la cellule gagnante
// dans le MÊME espace que pt, .w = distance F1.
// jit ∈ [0,1] : 0 = grille régulière, 1 = jitter maximal.
vec4 voronoiCell(vec3 pt, float jit) {
    vec3 base = floor(pt);
    vec3 frc  = fract(pt);

    float dMin = 8.0;
    vec3 seedWin = vec3(0.0);

    for (int k = -1; k <= 1; k++)
    for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++) {
        vec3 nb   = vec3(float(i), float(j), float(k));      // cellule voisine
        vec3 offs = nb + jit * hash33(base + nb);            // seed en espace cellule
        vec3 diff = offs - frc;
        float d2  = dot(diff, diff);                          // dist² (évite 27 sqrt)
        if (d2 < dMin) {
            dMin = d2;
            seedWin = base + offs;                            // seed en espace domaine
        }
    }
    return vec4(seedWin, sqrt(dMin));
}

// Palette cosinus (iq) : t ∈ ℝ → couleur, continue, cyclique
vec3 paletteIQ(float tt, vec3 aa, vec3 bb, vec3 cc, vec3 dd) {
    return aa + bb * cos(6.28318530718 * (cc * tt + dd));
}

// baseColor : "l'image vraie" — fonction PURE de la position monde.
// Doit être évaluable n'importe où (centres de cellules inclus).
vec3 baseColor(vec3 pt) {
    // champ scalaire directeur : ici une ondulation douce multi-axes
    float fld = 0.5 * sin(pt.x * 1.7)
              + 0.3 * sin(pt.y * 2.3 + 1.0)
              + 0.2 * sin(pt.z * 3.1 + 2.0);

    // rampe entre tes deux couleurs d'interface, cohérent avec ton pipeline
    vec3 ramp = mix(meshBg, meshFg, fld * 0.5 + 0.5);

    // enrichissement chromatique optionnel : palette cyclique superposée
    vec3 tint = paletteIQ(fld,
        vec3(0.5), vec3(0.35),
        vec3(1.0, 1.0, 0.8), vec3(0.0, 0.15, 0.25));

    return mix(ramp, tint, 0.35);
}

// ---- Une couche de touches
vec3 brushLayer(vec3 paint, vec3 pt, float scale, float coverage, vec3 geoTint) {
    vec4 cell = voronoiCell(pt * scale, 0.9);
    vec3 strokeColor = baseColor(cell.xyz / scale);

    // grain : chaque touche dévie légèrement
    strokeColor += (hash33(floor(cell.xyz)) - 0.5) * 0.12;

    // modelé géométrique léger sous la peinture
    strokeColor = mix(strokeColor, strokeColor * geoTint, 0.5);

    float mask = smoothstep(0.45, 0.25, cell.w) * coverage;
    return mix(paint, strokeColor, mask);
}

// Voronoï 3D ANIMÉ : .xyz = seed gagnant (même espace que x), .w = F1
vec4 voronoiCellAnim(vec3 x, float speed) {
    vec3 n = floor(x), f = fract(x);
    float md = 8.0;
    vec3 seedWin = vec3(0.0);

    for (int kk=-1; kk<=1; kk++)
    for (int jj=-1; jj<=1; jj++)
    for (int ii=-1; ii<=1; ii++) {
        vec3 g    = vec3(float(ii), float(jj), float(kk));
        vec3 cell = n + g;
        vec3 rnd  = vec3(hash31(cell), hash31(cell+19.1), hash31(cell+37.7));
        vec3 seed = 0.5 + 0.35*sin(speed*time + 6.2831853*rnd + vec3(0.0, 2.094, 4.189));
        vec3 r    = g + seed - f;
        float dSqr = dot(r, r);
        if (dSqr < md) {
            md = dSqr;
            seedWin = cell + seed;    // position absolue du seed animé
        }
    }
    return vec4(seedWin, sqrt(md));
}

vec3 brushLayerWarped(vec3 paint, vec3 pt, float scale, float coverage,
                      vec3 geoTint, float warpAmp) {
    // warp centré : la couleur du fond déplace le domaine, sans biais
    vec3 warp = (baseColor(pt) - 0.5) * warpAmp;
    vec4 cell = voronoiCellAnim((pt + warp) * scale, 0.9);

    vec3 strokeColor = baseColor(cell.xyz / scale - warp);  // désindexer le warp
    strokeColor += (hash33(floor(cell.xyz)) - 0.5) * 0.12;
    strokeColor = mix(strokeColor, strokeColor * geoTint, 0.5);

    float mask = smoothstep(0.45, 0.25, cell.w) * coverage;
    return mix(paint, strokeColor, mask);
}

float tube(vec3 col, float nb){
    vec3 po = fract(col * nb) - 0.5;
    return min(abs(po.x), min(abs(po.y), abs(po.z)));
}

vec3 brushLayerAnim(vec3 paint, vec3 pt, float scale, float coverage,
                    vec3 geoTint, float warpAmp, float speed) {
    vec3 warp = (baseColor(pt) - 0.5) * warpAmp;
    vec4 cell = voronoiCellAnim((pt + warp) * scale, speed);

    vec3 strokeColor = baseColor(cell.xyz / scale - warp);
    strokeColor += (hash33(floor(cell.xyz)) - 0.5) * 0.12;
    strokeColor = mix(strokeColor, strokeColor * geoTint, 0.5);

    float mask = smoothstep(0.45, 0.25, cell.w) * coverage;
    return mix(paint, strokeColor, mask);
}

float tubeRel(vec3 pt, float nb, float cWidthPx){
    vec3 q = pt * nb;
    vec3 w = max(vec3(fwidth(q.x), fwidth(q.y), fwidth(q.z)), vec3(1e-6));
    vec3 d = abs(fract(q) - 0.5) / w;                     // distance en pixels, par axe
    float wmax = max(w.x, max(w.y, w.z));
    float fade = 1.0 - smoothstep(0.30, 0.55, cWidthPx * wmax);
    return min(d.x, min(d.y, d.z)) / max(fade, 1e-3);
}

float tubeR(vec3 pt, float nb){
    vec3 q = pt * nb;
    vec3 w = max(vec3(fwidth(q.x), fwidth(q.y), fwidth(q.z)), vec3(1e-6));
    vec3 d = abs(fract(q) - 0.5) / w;                     // distance en pixels, par axe
    float wmax = max(w.x, max(w.y, w.z));
    float fade = 1.0 - smoothstep(0.30, 0.55, 0.);
    return min(d.x, min(d.y, d.z)) / max(fade, 1e-3);
}

vec3 spec(vec3 col, float coeff){
    return sin(col * PI * 6.0) * 0.1 + vec3(sin(col.r * 10.0), sin(col.g * 10.0 + 2.0), sin(col.b * 10.0 + 4.0)) * coeff;
}
vec3 spec(vec3 col, vec3 scoeff, float coeff){
    return sin(col * PI * 6.0) * 0.1 + vec3(sin(col.r * scoeff.x), sin(col.g * scoeff.y + 2.0), sin(col.b * scoeff.z + 4.0)) * coeff;
}

vec3 post(vec3 col, float levels, float coeff){
    return mix(col, floor(col * levels) / levels, coeff);
}

float edge(vec3 col){
    return pow(length(fract(col * 3.0) - 0.5) * 2.0, 8.0);
}
float edge(vec3 col, float coeffCol){
    return pow(length(fract(col * coeffCol) - 0.5) * 2.0, 8.0);
}
float edge(vec3 col, float coeffCol, float powEdge){
    return pow(length(fract(col * coeffCol) - 0.5) * 2.0, powEdge);
}

vec3 bright(vec3 col){
    float b = max(0.0, dot(col, vec3(0.333)) - 0.7);
    col /= 1.+(vec3(b * b) * vec3(1.0, 0.8, 0.6) * 2.0);

    return col;
}

// Colors
const vec3 LAMP_COLOR = vec3(0.5, 0.5, 0.5);
const vec3 AMBIENT_COLOR = vec3(0.05, 0.05, 0.08);
const vec3 BASE_COLOR = vec3(0.5, 0.5, 0.5);

// Lighting parameters
const float LAMP_RADIUS = 100.0;
const float SPECULAR_POWER = 32.0;
const float SPECULAR_INTENSITY = 0.5;

float calcAttenuation(float dist, float radius, float intensity) {
    float d = max(dist, 0.001);
    float att = intensity / (d * d);
    float falloff = 1.0 - smoothstep(0.0, radius, dist);
    return att * falloff;
}

vec3 blinnPhong(vec3 normal, vec3 viewDir, vec3 lightDir, vec3 lightColor, float attenuation) {
    float NdotL = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = BASE_COLOR * lightColor * NdotL * attenuation;

    vec3 halfDir = normalize(lightDir + viewDir);
    float NdotH = max(dot(normal, halfDir), 0.0);
    float spec = pow(NdotH, SPECULAR_POWER) * SPECULAR_INTENSITY;
    vec3 specular = lightColor * spec * attenuation;

    return diffuse + specular;
}

float flicker(float t) {
    return 1.0 + 0.02 * sin(t * 15.0) * sin(t * 23.0 + 1.5);
}

vec3 light(vec3 lampPos, vec3 baseColor) {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorldPosition);

    if (dot(N, V) < 0.0) {
        N = -N;
    }

    lampPos = vec3(lampPos.x, lampPos.y, lampPos.z * 3.0);

    vec3 toLight = lampPos - vWorldPosition;
    float dist = length(toLight);
    vec3 L = normalize(toLight);

    float att = calcAttenuation(dist, lampRadius, lampIntensity*2.0);

    float NdotL = max(dot(N, L), 0.0);
    vec3 diffuse = baseColor * NdotL * att;

    vec3 halfDir = normalize(L + V);
    float NdotH = max(dot(N, halfDir), 0.0);
    float spec = pow(NdotH, lampSpecularPower) * lampSpecularIntensity;
    vec3 specular = baseColor * spec * att;

    vec3 ambient = vec3(0.05);

    return ambient + diffuse + specular;
}

vec3 random_perlin( vec3 p ) {
    p = vec3(
            dot(p,vec3(127.1,311.7,69.5)),
            dot(p,vec3(269.5,183.3,132.7)), 
            dot(p,vec3(247.3,108.5,96.5)) 
            );
    return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}

float noise_perlin (vec3 p) {
    vec3 i = floor(p);
    vec3 s = fract(p);

    float a = dot(random_perlin(i),s);
    float b = dot(random_perlin(i + vec3(1, 0, 0)),s - vec3(1, 0, 0));
    float c = dot(random_perlin(i + vec3(0, 1, 0)),s - vec3(0, 1, 0));
    float d = dot(random_perlin(i + vec3(0, 0, 1)),s - vec3(0, 0, 1));
    float e = dot(random_perlin(i + vec3(1, 1, 0)),s - vec3(1, 1, 0));
    float f = dot(random_perlin(i + vec3(1, 0, 1)),s - vec3(1, 0, 1));
    float g = dot(random_perlin(i + vec3(0, 1, 1)),s - vec3(0, 1, 1));
    float h = dot(random_perlin(i + vec3(1, 1, 1)),s - vec3(1, 1, 1));

    // Smooth Interpolation
    vec3 u = smoothstep(0.,1.,s);

    return mix(mix(mix( a, b, u.x),
                mix( c, e, u.x), u.y),
            mix(mix( d, f, u.x),
                mix( g, h, u.x), u.y), u.z);
}

float cpow(float val, float p) {
    return sign(val) * pow(abs(val), p);
}
vec2 cpow(vec2 val, vec2 p) {
    return sign(val) * pow(abs(val), p);
}
vec2 cpow(vec2 val, float p) {
    return sign(val) * pow(abs(val), vec2(p));
}
vec3 cpow(vec3 val, vec3 p) {
    return sign(val) * pow(abs(val), p);
}
vec3 cpow(vec3 val, float p) {
    return sign(val) * pow(abs(val), vec3(p));
}
vec4 cpow(vec4 val, vec4 p) {
    return sign(val) * pow(abs(val), p);
}
vec4 cpow(vec4 val, float p) {
    return sign(val) * pow(abs(val), vec4(p));
}

vec3 rainbow(float t) {
    float r = abs(sin(t * 6.28 + 0.0));
    float g = abs(sin(t * 6.28 + 2.09));
    float b = abs(sin(t * 6.28 + 4.19));
    return vec3(r, g, b);
}

vec3 rainbop(float t, vec3 p) {
    float r = abs(sin(t * 6.28 + p.x));
    float g = abs(sin(t * 6.28 + p.y));
    float b = abs(sin(t * 6.28 + p.z));
    return vec3(r, g, b);
}

vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.263, 0.416, 0.557);

    return a + b * cos(6.28318 * (c * t + d));
}

vec3 heatmap(float t) {
    vec3 cold = vec3(0.0, 0.0, 1.0);
    vec3 hot = vec3(1.0, 0.0, 0.0);
    return mix(cold, hot, t);
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 hueRotateYIQ(vec3 col, float angleRad) {
    float c = cos(angleRad);
    float s = sin(angleRad);
    mat3 m = mat3(
        0.299 + 0.701 * c + 0.168 * s,
        0.299 - 0.299 * c - 0.328 * s,
        0.299 - 0.300 * c + 1.250 * s,
        0.587 - 0.587 * c + 0.330 * s,
        0.587 + 0.413 * c + 0.035 * s,
        0.587 - 0.588 * c - 1.050 * s,
        0.114 - 0.114 * c - 0.497 * s,
        0.114 - 0.114 * c + 0.292 * s,
        0.114 + 0.886 * c - 0.203 * s
    );
    return m * col;
}

vec2 rotate2D (vec2 _st, float _angle) {
    _st -= 0.5;
    _st =  mat2(cos(_angle),-sin(_angle),
                sin(_angle),cos(_angle)) * _st;
    _st += 0.5;
    return _st;
}

vec2 rotL(vec2 p,float a)
{
    float c=cos(a*15.83);
    float s=sin(a*15.83);
    return p*mat2(s,c,c,-s);
}

mat2 rot(float _angle){
    return mat2(cos(_angle),-sin(_angle),
                sin(_angle),cos(_angle));
}

vec3 rotateTilePattern(vec2 _st, float coeff){
    _st *= coeff;

    float index = 0.0;
    index += step(1.0, mod(_st.x, 2.0));
    index += step(1.0, mod(_st.y, 2.0)) * 2.0;

    _st = fract(_st);

    float baseAngle = PI/2.0;

    float angle = 0.0;
    angle += baseAngle * float(index == 1.0);
    angle += -baseAngle * float(index == 2.0);
    angle += 2.0 * baseAngle * float(index == 3.0);

    _st = rotate2D(_st, angle);

    return vec3(_st, index);
}

vec3 cpalette(float t, vec3 phase) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);

    return a + b * cos(6.28318 * (c * t + phase));
}

vec2 random2( vec2 p ) {
    return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
}

float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float Star(vec2 uv, float flare){
    float d = length(uv);
  	float m = sin(0.025*1.2)/d;  
    float rays = max(0., .5-abs(uv.x*uv.y*1000.)); 
    m += (rays*flare)*2.;
    m *= smoothstep(1., .1, d);
    return m;
}

vec3 StarLayer(vec2 uv){
    float TAU = 6.28318;
    vec3 col = vec3(0);
    vec2 gv = fract(uv);
    vec2 id = floor(uv);
    for(int y=-1;y<=1;y++){
        for(int x=-1; x<=1; x++){
            vec2 offs = vec2(x,y);
            float n = hash21(id+offs);
            float size = fract(n);
            float star = Star(gv-offs-vec2(n, fract(n*34.))+.5, smoothstep(.1,.9,size)*.46);
            vec3 color = sin(vec3(.2,.3,.9)*fract(n*2345.2)*TAU)*.25+.75;
            color = color*vec3(.9,.59,.9+size);
            star *= sin(time*.6+n*TAU)*.5+.5;
            col += star*size*color;
        }
    }
    return col;
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for(int i = 0; i < 5; i++) {
        value += amplitude * noise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

vec3 fbmLiquidEffect(vec2 uv) {
    float t = time * 0.3;

    vec2 flow = vec2(
        fbm(uv * 2.0 + vec2(t, 0.0)),
        fbm(uv * 2.0 + vec2(0.0, t))
    );

    vec2 distorted = uv + flow * 0.3;
    float n = fbm(distorted * 3.0 + time * 0.2);

    float liquid = smoothstep(0.4, 0.6, n);

    vec3 color = mix(
        vec3(0.0, 0.3, 0.6),
        vec3(0.2, 0.8, 1.0),
        liquid
    );

    color += vec3(pow(n, 4.0) * 2.0);

    return color;
}

float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float c000 = hash31(i + vec3(0.0, 0.0, 0.0));
    float c100 = hash31(i + vec3(1.0, 0.0, 0.0));
    float c010 = hash31(i + vec3(0.0, 1.0, 0.0));
    float c110 = hash31(i + vec3(1.0, 1.0, 0.0));
    float c001 = hash31(i + vec3(0.0, 0.0, 1.0));
    float c101 = hash31(i + vec3(1.0, 0.0, 1.0));
    float c011 = hash31(i + vec3(0.0, 1.0, 1.0));
    float c111 = hash31(i + vec3(1.0, 1.0, 1.0));

    return mix(
        mix(mix(c000, c100, f.x), mix(c010, c110, f.x), f.y),
        mix(mix(c001, c101, f.x), mix(c011, c111, f.x), f.y),
        f.z
    );
}

float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

vec3 fbmLiquidEffect(vec3 p) {
    float t = time * 0.3;

    vec3 flow = vec3(
        fbm(p * 2.0 + vec3(t, 0.0, 0.0)),
        fbm(p * 2.0 + vec3(0.0, t, 0.0) + 5.2),
        fbm(p * 2.0 + vec3(0.0, 0.0, t) + 11.7)
    );

    vec3 distorted = p + flow * 0.3;
    float n = fbm(distorted * 3.0 + time * 0.2);

    float liquid = smoothstep(0.4, 0.6, n);

    vec3 color = mix(
        vec3(0.0, 0.3, 0.6),
        vec3(0.2, 0.8, 1.0),
        liquid
    );

    color += vec3(pow(n, 4.0) * 2.0);

    return color;
}

float sdHexagon(vec2 p, float r) {
    const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
    p = abs(p);
    p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
    p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
    return length(p) * sign(p.y);
}

float sdCircle(vec2 p, vec2 center, float r) {
    return length(p-center) - r;
}

vec3 checkerboard(float x, float y, vec3 bg, vec3 fg, float coeff, float offsetX, float offsetY){
    float gridX = floor(mod(coeff * x + offsetX, 0.0));
    float gridY = floor(mod(coeff * y + offsetY, 0.0));

    float pattern = mod(gridX + gridY, 2.0);

    return mix(bg, fg, pattern);
}

float voronoi(vec2 i_st, vec2 f_st, vec2 scale){
    float m_dist = 1.;

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));

            vec2 neighborCell = i_st + neighbor;

            vec2 wrappedCell = vec2(
                mod(neighborCell.x, scale.x),
                mod(neighborCell.y, scale.y)
            );

            vec2 point = random2(wrappedCell);

            point = 0.5 + 0.5 * sin(time + 6.2831 * point);

            vec2 diff = neighbor + point - f_st;

            float dist = length(diff);
            m_dist = min(m_dist, dist);
        }
    }
    return m_dist;
}

float voronoiPos(vec3 x, float speed){
    vec3 n = floor(x), f = fract(x);
    float md = 8.0;
    for (int k=-1;k<=1;k++)
    for (int j=-1;j<=1;j++)
    for (int i=-1;i<=1;i++){
        vec3 g    = vec3(float(i),float(j),float(k));
        vec3 cell = n + g;
        vec3 rnd  = vec3(hash31(cell), hash31(cell+19.1), hash31(cell+37.7));
        vec3 seed = 0.5 + 0.5*sin(speed*time + 6.2831*rnd);
        vec3 r    = g + seed - f;
        md = min(md, dot(r,r));
    }
    return sqrt(md);
}
float voronoiPos(vec3 x){
    float speed = 0.;
    vec3 n = floor(x), f = fract(x);
    float md = 8.0;
    for (int k=-1;k<=1;k++)
    for (int j=-1;j<=1;j++)
    for (int i=-1;i<=1;i++){
        vec3 g    = vec3(float(i),float(j),float(k));
        vec3 cell = n + g;
        vec3 rnd  = vec3(hash31(cell), hash31(cell+19.1), hash31(cell+37.7));
        vec3 seed = 0.5 + 0.5*sin(speed*time + 6.2831*rnd);
        vec3 r    = g + seed - f;
        md = min(md, dot(r,r));
    }
    return sqrt(md);
}

float truchet(vec2 uv, float index, float rad, float thickness){
    vec2 center1, center2;
    if (index < 0.5) {
        center1 = vec2(-0.5, -0.5);
        center2 = vec2( 0.5,  0.5);
    } else {
        center1 = vec2( 0.5, -0.5);
        center2 = vec2(-0.5,  0.5);
    }

    float dist1 = sdCircle(uv, center1, rad);
    float dist2 = sdCircle(uv, center2, rad);

    float arc1 = 1.0 - smoothstep(0.0, 0.02, abs(dist1) - thickness);
    float arc2 = 1.0 - smoothstep(0.0, 0.02, abs(dist2) - thickness);
    float pattern = max(arc1, arc2);

    return pattern;
}

vec3 h3(vec3 v1, vec3 v2){
    return sqrt(v1*v1 + v2*v2);
}

float maxv(vec3 p){
    return max(p.x, max(p.y, p.z));
}
float minv(vec3 p){
    return min(p.x, max(p.y, p.z));
}

vec3 est(vec3 col){
    col /= pm(edge(col, PI));
    col *= pm(spec(col, W*E));
    return col *= pm(tube(col, E));
}
vec3 est(vec3 col, float e){
    col /= pm(edge(col, e));
    col *= pm(spec(col, W*E));
    return col *= pm(tube(col, E));
}
vec3 est(vec3 col, float e, float s){
    col /= pm(edge(col, e));
    col *= pm(spec(col, s));
    return col *= pm(tube(col, E));
}
vec3 est(vec3 col, float e, float s, float t){
    col /= pm(edge(col, e));
    col *= pm(spec(col, s));
    return col *= pm(tube(col, t));
}

float m(){
    vec3 p = opt1 == 0. ? normalize(vPosition) : vPosition;
    p = abs(p);
    return cos(p.x) * cos(p.y) * cos(p.z);
}
float m(float coeff){
    vec3 p = opt1 == 0. ? normalize(vPosition) : vPosition;
    p = abs(p) * coeff;
    return cos(p.x) * cos(p.y) * cos(p.z);
}
float m(float coeff, float phase){
    vec3 p = opt1 == 0. ? normalize(vPosition) : vPosition;
    p = abs(p) * coeff + phase;
    return cos(p.x) * cos(p.y) * cos(p.z);
}

vec3 mcol(vec3 val, float nb){
    return vec3(
        mix(0., val.x, val.x > nb),
        mix(0., val.x, val.y > val.x),
        mix(0., val.z, val.z > val.y)
    );
}
vec3 mcol(vec3 val, float nb, vec3 bg){
    vec3 res = vec3(
        mix(0., val.x, val.x > nb),
        mix(0., val.x, val.y > val.x),
        mix(0., val.z, val.z > val.y)
    );
    if(res == vec3(0.)){ return bg; }

    return res;
}

float o(){
    vec3 p = opt1 == 0. ? normalize(vPosition) : vPosition;
    p = abs(p);
    return cos(p.x) + cos(p.y) + cos(p.z);
}
float o(float coeff){
    vec3 p = opt1 == 0. ? normalize(vPosition) : vPosition;
    p = abs(p) * coeff;
    return cos(p.x) + cos(p.y) + cos(p.z);
}
float o(float coeff, float phase){
    vec3 p = opt1 == 0. ? normalize(vPosition) : vPosition;
    p = abs(p) * coeff + phase;
    return cos(p.x) + cos(p.y) + cos(p.z);
}

float ms(){
    vec3 p = opt1 == 0. ? normalize(vPosition) : vPosition;
    p = abs(p);
    return (cos(p.x) + sin(p.x)) * (cos(p.y) + sin(p.y)) * (cos(p.z) + sin(p.z));
}
float os(){
    vec3 p = opt1 == 0. ? normalize(vPosition) : vPosition;
    p = abs(p);
    return (cos(p.x) * sin(p.x)) + (cos(p.y) * sin(p.y)) + (cos(p.z) * sin(p.z));
}
float ms(float coeff){
    vec3 p = opt1 == 0. ? normalize(vPosition) : vPosition;
    p = abs(p) * coeff;
    return (cos(p.x) + sin(p.x)) * (cos(p.y) + sin(p.y)) * (cos(p.z) + sin(p.z));
}
float os(float coeff){
    vec3 p = opt1 == 0. ? normalize(vPosition) : vPosition;
    p = abs(p) * coeff;
    return (cos(p.x) * sin(p.x)) + (cos(p.y) * sin(p.y)) + (cos(p.z) * sin(p.z));
}
float ms(float coeff, float phase){
    vec3 p = opt1 == 0. ? normalize(vPosition) : vPosition;
    p = abs(p) * coeff + phase;
    return (cos(p.x) + sin(p.x)) * (cos(p.y) + sin(p.y)) * (cos(p.z) + sin(p.z));
}
float os(float coeff, float phase){
    vec3 p = opt1 == 0. ? normalize(vPosition) : vPosition;
    p = abs(p) * coeff + phase;
    return (cos(p.x) * sin(p.x)) + (cos(p.y) * sin(p.y)) + (cos(p.z) * sin(p.z));
}

float m(vec3 p){
    return cos(p.x) * cos(p.y) * cos(p.z);
}
float m(vec3 p, float coeff){
    p*=coeff;
    return cos(p.x) * cos(p.y) * cos(p.z);
}
float m(vec3 p, float coeff, float phase){
    return cos(coeff*p.x + phase) * cos(coeff*p.y + phase) * cos(coeff*p.z + phase);
}
float m(vec3 p, float coeff, vec3 phase){
    return cos(coeff*p.x + phase.x) * cos(coeff*p.y + phase.y) * cos(coeff*p.z + phase.z);
}
float m(float x, float y, float z){
    return cos(x) * cos(y) * cos(z);
}
float m(float x, float y, float z, float coeff){
    return cos(coeff*x) * cos(coeff*y) * cos(coeff*z);
}

float ms(vec3 p){
    return (cos(p.x) + sin(p.x)) * (cos(p.y) + sin(p.y)) * (cos(p.z) + sin(p.z));
}
float os(vec3 p){
    return (cos(p.x) * sin(p.x)) + (cos(p.y) * sin(p.y)) + (cos(p.z) * sin(p.z));
}

float mi(vec3 p, float it, float np){
    float res = 0.;
    for(float i = 0.; i < it; i += 1.){
        res += m(p);
        p *= np;
    }
    return res;
}
float msi(vec3 p, float it, float np){
    float res = 0.;
    for(float i = 0.; i < it; i += 1.){
        res += ms(p);
        p *= np;
    }
    return res;
}
float osi(vec3 p, float it, float np){
    float res = 0.;
    for(float i = 0.; i < it; i += 1.){
        res += os(p);
        p *= np;
    }
    return res;
}


float mac(vec3 p){
    return acos(p.x) * acos(p.y) * acos(p.z);
}
float mac(vec3 p, float coeff){
    return acos(coeff*p.x) * acos(coeff*p.y) * acos(coeff*p.z);
}
float mac(vec3 p, float coeff, float phase){
    return acos(coeff*p.x + phase) * acos(coeff*p.y + phase) * acos(coeff*p.z + phase);
}
float mac(vec3 p, float coeff, vec3 phase){
    return acos(coeff*p.x + phase.x) * acos(coeff*p.y + phase.y) * acos(coeff*p.z + phase.z);
}

float mah(vec3 p){
    p = 1. + abs(p);
    return acosh(p.x) * acosh(p.y) * acosh(p.z);
}
float mah(vec3 p, float coeff){
    p = 1. + abs(p);
    return acosh(coeff*p.x) * acosh(coeff*p.y) * acosh(coeff*p.z);
}
float mah(vec3 p, float coeff, float phase){
    p = 1. + abs(p);
    return acosh(coeff*p.x + phase) * acosh(coeff*p.y + phase) * acosh(coeff*p.z + phase);
}
float mah(vec3 p, float coeff, vec3 phase){
    p = 1. + abs(p);
    return acosh(coeff*p.x + phase.x) * acosh(coeff*p.y + phase.y) * acosh(coeff*p.z + phase.z);
}

float oac(vec3 p){
    return acos(p.x) + acos(p.y) + acos(p.z);
}
float oac(vec3 p, float coeff){
    return acos(coeff*p.x) + acos(coeff*p.y) + acos(coeff*p.z);
}
float oac(vec3 p, float coeff, float phase){
    return acos(coeff*p.x + phase) + acos(coeff*p.y + phase) + acos(coeff*p.z + phase);
}
float oac(vec3 p, float coeff, vec3 phase){
    return acos(coeff*p.x + phase.x) + acos(coeff*p.y + phase.y) + acos(coeff*p.z + phase.z);
}
float oah(vec3 p){
    p = 1. + abs(p);
    return acosh(p.x) + acosh(p.y) + acosh(p.z);
}
float oah(vec3 p, float coeff){
    p = 1. + abs(p);
    return acosh(coeff*p.x) + acosh(coeff*p.y) + acosh(coeff*p.z);
}
float oah(vec3 p, float coeff, float phase){
    p = 1. + abs(p);
    return acosh(coeff*p.x + phase) + acosh(coeff*p.y + phase) + acosh(coeff*p.z + phase);
}
float oah(vec3 p, float coeff, vec3 phase){
    p = 1. + abs(p);
    return acosh(coeff*p.x + phase.x) + acosh(coeff*p.y + phase.y) + acosh(coeff*p.z + phase.z);
}
float hcac(vec3 p){
    return length(vec3(acos(p.x), acos(p.y), acos(p.z)));
}
float hcac(vec3 p, float coeff){
    return length(vec3(acos(coeff*p.x), acos(coeff*p.y), acos(coeff*p.z)));
}
float hcac(vec3 p, float coeff, float phase){
    return length(vec3(acos(coeff*p.x + phase), acos(coeff*p.y + phase), acos(coeff*p.z + phase)));
}
float hcac(vec3 p, float coeff, vec3 phase){
    return length(vec3(acos(coeff*p.x + phase.x), acos(coeff*p.y + phase.y), acos(coeff*p.z + phase.z)));
}


float me(vec3 p){
    return cos(exp(abs(p.x))) * cos(exp(abs(p.y))) * cos(exp(abs(p.z)));
}
float me(vec3 p, float coeff){
    return cos(coeff*exp(abs(p.x))) * cos(coeff*exp(abs(p.y))) * cos(coeff*exp(abs(p.z)));
}
float me(vec3 p, float coeff, float phase){
    return cos(coeff*exp(abs(p.x + phase))) * cos(coeff*exp(abs(p.y + phase))) * cos(coeff*exp(abs(p.z + phase)));
}
float me(vec3 p, float coeff, vec3 phase){
    return cos(coeff*exp(abs(p.x + phase.x))) * cos(coeff*exp(abs(p.y + phase.y))) * cos(coeff*exp(abs(p.z + phase.z)));
}
float me(float x, float y, float z){
    return cos(exp(abs(x))) * cos(exp(abs(y))) * cos(exp(abs(z)));
}
float me(float x, float y, float z, float coeff){
    return cos(coeff*exp(abs(x))) * cos(coeff*exp(abs(y))) * cos(coeff*exp(abs(z)));
}

float mse(vec3 p){
    return (cos(exp(abs(p.x))) + sin(exp(abs(p.x)))) * (cos(exp(abs(p.y))) + sin(exp(abs(p.y)))) * (cos(exp(abs(p.z))) + sin(exp(abs(p.z))));
}
float msl(vec3 p){
    return (cos(log(abs(p.x))) + sin(log(abs(p.x)))) * (cos(log(abs(p.y))) + sin(log(abs(p.y)))) * (cos(log(abs(p.z))) + sin(log(abs(p.z))));
}

float ml(vec3 p){
    return cos(log(abs(p.x))) * cos(log(abs(p.y))) * cos(log(abs(p.z)));
}
float ml(vec3 p, float coeff){
    return cos(coeff*log(abs(p.x))) * cos(coeff*log(abs(p.y))) * cos(coeff*log(abs(p.z)));
}
float ml(vec3 p, float coeff, float phase){
    return cos(coeff*log(phase + abs(p.x))) * cos(coeff*log(phase + abs(p.y))) * cos(coeff*log(phase + abs(p.z)));
}
float ml(vec3 p, float coeff, vec3 phase){
    return cos(coeff*log(phase.x + abs(p.x))) * cos(coeff*log(phase.y + abs(p.y))) * cos(coeff*log(phase.z + abs(p.z)));
}
float ml(float x, float y, float z){
    return cos(log(abs(x))) * cos(log(abs(y))) * cos(log(abs(z)));
}
float ml(float x, float y, float z, float coeff){
    return cos(coeff*log(abs(x))) * cos(coeff*log(abs(y))) * cos(coeff*log(abs(z)));
}


float mh(vec3 p){
    return cosh(p.x) * cosh(p.y) * cosh(p.z);
}
float mh(vec3 p, float coeff){
    return cosh(coeff*p.x) * cosh(coeff*p.y) * cosh(coeff*p.z);
}
float mh(vec3 p, float coeff, float phase){
    return cosh(abs(coeff*p.x + phase)) * cosh(abs(coeff*p.y + phase)) * cosh(abs(coeff*p.z + phase));
}
float mh(vec3 p, float coeff, vec3 phase){
    return cosh(coeff*p.x + phase.x) * cosh(coeff*p.y + phase.y) * cosh(coeff*p.z + phase.z);
}
float mh(float x, float y, float z){
    return cosh(x) * cosh(y) * cosh(z);
}
float mh(float x, float y, float z, float coeff){
    return cosh(coeff*x) * cosh(coeff*y) * cosh(coeff*z);
}

float f(vec3 p){
	return cos(p.x + p.y + p.z);
}
float f(vec3 p, float coeff){
	return cos(coeff * (p.x + p.y + p.z));
}
float f(vec3 p, float coeff, float phase){
	return cos(coeff * (p.x + p.y + p.z) + phase);
}

float o(vec3 p){
    return cos(p.x) + cos(p.y) + cos(p.z);
}
float o(vec3 p, float coeff){
    return cos(coeff*p.x) + cos(coeff*p.y) + cos(coeff*p.z);
}
float o(vec3 p, float coeff, float phase){
    return cos(coeff*p.x + phase) + cos(coeff*p.y + phase) + cos(coeff*p.z + phase);
}
float o(vec3 p, float coeff, vec3 phase){
    return cos(coeff*p.x + phase.x) + cos(coeff*p.y + phase.y) + cos(coeff*p.z + phase.z);
}
float o(float x, float y, float z){
    return cos(x) + cos(y) + cos(z);
}
float o(float x, float y, float z, float coeff){
    return cos(coeff*x) + cos(coeff*y) + cos(coeff*z);
}

vec3 wrap(vec3 p){
    return fract(p)-.5;
}
vec3 wrap(vec3 p, float f){
    return fract(p*f)-.5;
}
vec3 wrap(vec3 p, vec3 f){
    return fract(p*f)-.5;
}
vec2 wrap(vec2 p){
    return fract(p)-.5;
}
vec2 wrap(vec2 p, float f){
    return fract(p*f)-.5;
}
vec2 wrap(vec2 p, vec2 f){
    return fract(p*f)-.5;
}
float wrap(float p){
    return fract(p)-.5;
}
float wrap(float p, float f){
    return fract(p*f)-.5;
}

vec3 wrap2(vec3 p, float f){
    return .5 * sin(6.2831853 * f * p);
}

vec3 go(vec3 p, float delta, float ct){
    return p * (1. + delta*(.5*cos(t*ct)+.5));
}

float oe(vec3 p){
    return cos(exp(abs(p.x))) + cos(exp(abs(p.y))) + cos(exp(abs(p.z)));
}
float oe(vec3 p, float coeff){
    return cos(coeff * exp(abs(p.x))) + cos(coeff * exp(abs(p.y))) + cos(coeff * exp(abs(p.z)));
}
float oe(vec3 p, float coeff, float phase){
    return cos(coeff * exp(abs(p.x)) + phase) + cos(coeff * exp(abs(p.y)) + phase) + cos(coeff * exp(abs(p.z)) + phase);
}

float ose(vec3 p){
    return (cos(exp(abs(p.x)))*sin(exp(abs(p.x)))) + (cos(exp(abs(p.y)))*sin(exp(abs(p.y)))) + (cos(exp(abs(p.z)))*sin(exp(abs(p.z))));
}
float osl(vec3 p){
    return (cos(log(abs(p.x)))*sin(log(abs(p.x)))) + (cos(log(abs(p.y)))*sin(log(abs(p.y)))) + (cos(log(abs(p.z)))*sin(log(abs(p.z))));
}

float ol(vec3 p){
    return cos(log(abs(p.x))) + cos(log(abs(p.y))) + cos(log(abs(p.z)));
}
float ol(vec3 p, float coeff){
    return cos(coeff * log(abs(p.x))) + cos(coeff * log(abs(p.y))) + cos(coeff * log(abs(p.z)));
}
float ol(vec3 p, float coeff, float phase){
    return cos(coeff * log(abs(p.x) + phase)) + cos(coeff * log(abs(p.y) + phase)) + cos(coeff * log(abs(p.z) + phase));
}
float ol(vec3 p, float coeff, float phcos, float phlog){
    return cos(coeff * log(abs(p.x + phlog)) + phcos) + cos(coeff * log(abs(p.y + phlog)) + phcos) + cos(coeff * log(abs(p.z + phlog)) + phcos);
}

float oh(vec3 p){
    return cosh(p.x) + cosh(p.y) + cosh(p.z);
}
float oh(vec3 p, float coeff){
    return cosh(coeff*p.x) + cosh(coeff*p.y) + cosh(coeff*p.z);
}
float oh(vec3 p, float coeff, float phase){
    return cosh(coeff*p.x + phase) + cosh(coeff*p.y + phase) + cosh(coeff*p.z + phase);
}
float oh(vec3 p, float coeff, vec3 phase){
    return cosh(coeff*p.x + phase.x) + cosh(coeff*p.y + phase.y) + cosh(coeff*p.z + phase.z);
}
float oh(float x, float y, float z){
    return cosh(x) + cosh(y) + cosh(z);
}
float oh(float x, float y, float z, float coeff){
    return cosh(coeff*x) + cosh(coeff*y) + cosh(coeff*z);
}

float hc(vec3 p){
    return length(cos(p));
}
float hc(vec3 p, float coeff){
    return length(vec3(cos(coeff*p.x), cos(coeff*p.y), cos(coeff*p.z)));
}
float hc(vec3 p, float coeff, float phase){
    return length(vec3(cos(coeff*p.x + phase), cos(coeff*p.y + phase), cos(coeff*p.z + phase)));
}
float hc(vec3 p, float coeff, vec3 phase){
    return length(vec3(cos(coeff*p.x + phase.x), cos(coeff*p.y + phase.y), cos(coeff*p.z + phase.z)));
}
float hc(float x, float y, float z){
    return length(vec3(cos(x), cos(y), cos(z)));
}
float hc(float x, float y, float z, float coeff){
    return length(vec3(cos(coeff*x), cos(coeff*y), cos(coeff*z)));
}

float hcs(vec3 p){
    return length(cos(p)+sin(p));
}
float hce(vec3 p){
    return length(cos(abs(exp(p))));
}
float hces(vec3 p){
    return length(cos(abs(exp(p))) + sin(abs(exp(p))));
}

float hcl(vec3 p){
    return length(cos(log(pm(p))));
}
float hcls(vec3 p){
    return length(cos(log(pm(p))) + sin(log(pm(p))));
}


float hce(vec3 p, float coeff, float ph){
    return length(vec3(cos(exp(abs(p.x)) * coeff + ph), cos(exp(abs(p.y)) * coeff + ph), cos(exp(abs(p.z)) * coeff + ph)));
}

float hch(vec3 p){
    return length(vec3(cosh(p.x), cosh(p.y), cosh(p.z)));
}
float hch(vec3 p, float coeff){
    return length(vec3(cosh(coeff*p.x), cosh(coeff*p.y), cosh(coeff*p.z)));
}
float hch(vec3 p, float coeff, float phase){
    return length(vec3(cosh(coeff*p.x + phase), cosh(coeff*p.y + phase), cosh(coeff*p.z + phase)));
}
float hch(vec3 p, float coeff, vec3 phase){
    return length(vec3(cosh(coeff*p.x + phase.x), cosh(coeff*p.y + phase.y), cosh(coeff*p.z + phase.z)));
}
float hch(float x, float y, float z){
    return length(vec3(cosh(x), cosh(y), cosh(z)));
}
float hch(float x, float y, float z, float coeff){
    return length(vec3(cosh(coeff*x), cosh(coeff*y), cosh(coeff*z)));
}

float ce(vec3 p){
    return cos(exp(p.x)*exp(p.y)*exp(p.z));
}
float ce(vec3 p, float c, float ph){
    return sin(exp(p.x)*exp(p.y)*exp(p.z) * c + ph);
}
float se(vec3 p){
    return sin(exp(p.x)*exp(p.y)*exp(p.z));
}
float se(vec3 p, float c, float ph){
    return sin(exp(p.x)*exp(p.y)*exp(p.z) * c + ph);
}

float ec(vec3 p){
    return exp(cos(p.x)) * exp(cos(p.y)) * exp(cos(p.z));
}
float ec(vec3 p, float c){
    return exp(cos(c*p.x)) * exp(cos(c*p.y)) * exp(cos(c*p.z));
}
float ec(vec3 p, float c, float ph){
    return exp(cos(c*p.x + ph)) * exp(cos(c*p.y + ph)) * exp(cos(c*p.z + ph));
}

float eca(vec3 p){
    return exp(abs(cos(p.x))) * exp(abs(cos(p.y))) * exp(abs(cos(p.z)));
}
float eca(vec3 p, float c){
    return exp(abs(cos(c*p.x))) * exp(abs(cos(c*p.y))) * exp(abs(cos(c*p.z)));
}
float eca(vec3 p, float c, float ph){
    return exp(abs(cos(c*p.x + ph))) * exp(abs(cos(c*p.y + ph))) * exp(abs(cos(c*p.z + ph)));
}

float lc(vec3 p){
    return log(abs(cos(p.x))) * log(abs(cos(p.y))) * log(abs(cos(p.z)));
}
float lc(vec3 p, float c){
    return log(abs(cos(c*p.x))) * log(abs(cos(c*p.y))) * log(abs(cos(c*p.z)));
}
float lc(vec3 p, float c, float ph){
    return log(abs(cos(c*p.x + ph))) * log(abs(cos(c*p.y + ph))) * log(abs(cos(c*p.z + ph)));
}

float g(vec3 p){
    return cos(p.x * p.y * p.z);
}
float g(vec3 p, float coeff){
    return cos(p.x * p.y * p.z * coeff);
}
float g(vec3 p, float coeff, float phase){
    return cos(p.x * p.y * p.z * coeff + phase);
}

float gp(vec3 p){
    return cos(p.x + p.y + p.z);
}
float gp(vec3 p, float phase){
    return cos((p.x + p.y + p.z) + phase);
}
float gs(vec3 p){
    return sin(p.x * p.y * p.z);
}
float gs(vec3 p, float coeff){
    return sin(p.x * p.y * p.z * coeff);
}
float gs(vec3 p, float coeff, float phase){
    return sin(p.x * p.y * p.z * coeff + phase);
}

float gps(vec3 p){
    return sin(p.x + p.y + p.z);
}
float gps(vec3 p, float phase){
    return sin((p.x + p.y + p.z) + phase);
}

float h(float x, float y){
    return length(vec2(x, y));
}
float h(float x, float y, float z){
    return length(vec3(x, y, z));
}
float h(float x, float y, float z, float w){
    return length(vec4(x, y, z, w));
}

float ea(float v){return exp(abs(v));}
vec2  ea(vec2  v){return exp(abs(v));}
vec3  ea(vec3  v){return exp(abs(v));}
vec4  ea(vec4  v){return exp(abs(v));}
float la(float v){return log(abs(v));}
vec2  la(vec2  v){return log(abs(v));}
vec3  la(vec3  v){return log(abs(v));}
vec4  la(vec4  v){return log(abs(v));}

float la(float v, float phase){return log(phase + abs(v));}
vec2  la(vec2  v, float phase){return log(phase + abs(v));}
vec3  la(vec3  v, float phase){return log(phase + abs(v));}
vec4  la(vec4  v, float phase){return log(phase + abs(v));}

float oi(vec3 p, float it, float np){
    float res = 0.;
    for(float i = 0.; i < it; i += 1.){
        res += o(p);
        p *= np;
    }
    return res;
}

float oei(vec3 p, float it, float np){
    float res = 0.;
    for(float i = 0.; i < it; i += 1.){
        res += oe(p);
        p *= np;
    }
    return res;
}

float oli(vec3 p, float it, float np){
    float res = 0.;
    for(float i = 0.; i < it; i += 1.){
        res += ol(p);
        p *= np;
    }
    return res;
}

float hci(vec3 p, float it, float np){
    float res = 0.;
    for(float i = 0.; i < it; i += 1.){
        res += hc(p);
        p *= np;
    }
    return res;
}

float hcei(vec3 p, float it, float np){
    float res = 0.;
    for(float i = 0.; i < it; i += 1.){
        res += hce(p);
        p *= np;
    }
    return res;
}

float hcli(vec3 p, float it, float np){
    float res = 0.;
    for(float i = 0.; i < it; i += 1.){
        res += hcl(p);
        p *= np;
    }
    return res;
}

float mei(vec3 p, float it, float np){
    float res = 0.;
    for(float i = 0.; i < it; i += 1.){
        res += me(p);
        p *= np;
    }
    return res;
}

float mli(vec3 p, float it, float np){
    float res = 0.;
    for(float i = 0.; i < it; i += 1.){
        res += ml(p);
        p *= np;
    }
    return res;
}

float mc(vec3 p, float coeffP, float coeffC){
   return m(cos(p*coeffP) * coeffC);
}
float mc(vec3 p, float coeffP, float coeffC, float coeffT){
   return m(cos(p*coeffP + t * coeffT) * coeffC);
}
float oc(vec3 p, float coeffP, float coeffC){
   return o(cos(p*coeffP) * coeffC);
}
float oc(vec3 p, float coeffP, float coeffC, float coeffT){
   return o(cos(p*coeffP + t * coeffT) * coeffC);
}
float msc(vec3 p, float coeffP, float coeffC){
   return ms(cos(p*coeffP) * coeffC);
}
float msc(vec3 p, float coeffP, float coeffC, float coeffT){
   return ms(cos(p*coeffP + t * coeffT) * coeffC);
}
float osc(vec3 p, float coeffP, float coeffC){
   return os(cos(p*coeffP) * coeffC);
}
float osc(vec3 p, float coeffP, float coeffC, float coeffT){
   return os(cos(p*coeffP + t * coeffT) * coeffC);
}

float lac(vec3 p){
    return absp(la(cos(p.x))) * absp(la(cos(p.y))) * absp(la(cos(p.z)));
}
float lac(vec3 p, float k){
    return absp(la(cos(p.x)), k) * absp(la(cos(p.y)), k) * absp(la(cos(p.z)), k);
}
float lac(vec3 p, float k, float coeff){
    return absp(la(cos(p.x * coeff)), k) * absp(la(cos(p.y * coeff)), k) * absp(la(cos(p.z * coeff)), k);
}
float lac(vec3 p, float k, float coeff, float phase){
    return absp(la(cos(p.x * coeff + phase)), k) * absp(la(cos(p.y * coeff + phase)), k) * absp(la(cos(p.z * coeff + phase)), k);
}

float lacp(vec3 p){
    return absp(la(cos(p.x))) + absp(la(cos(p.y))) + absp(la(cos(p.z)));
}
float lacp(vec3 p, float k){
    return absp(la(cos(p.x)), k) + absp(la(cos(p.y)), k) + absp(la(cos(p.z)), k);
}
float lacp(vec3 p, float k, float coeff){
    return absp(la(cos(p.x * coeff)), k) + absp(la(cos(p.y * coeff)), k) + absp(la(cos(p.z * coeff)), k);
}
float lacp(vec3 p, float k, float coeff, float phase){
    return absp(la(cos(p.x * coeff + phase)), k) + absp(la(cos(p.y * coeff + phase)), k) + absp(la(cos(p.z * coeff + phase)), k);
}

float cla(vec3 p){
    return cos(la(p.x)*la(p.y)*la(p.z));
}
float cla(vec3 p, float coeff){
    return cos(la(p.x)*la(p.y)*la(p.z) * coeff);
}
float cla(vec3 p, float coeff, float phase){
    return cos(la(p.x)*la(p.y)*la(p.z) * coeff + phase);
}

float cea(vec3 p){
    p = 1. - abs(p);
    return cos(ea(p.x)*ea(p.y)*ea(p.z));
}
float cea(vec3 p, float coeff){
    p = 1. - abs(p);
    return cos(ea(p.x)*ea(p.y)*ea(p.z) * coeff);
}
float cea(vec3 p, float coeff, float phase){
    p = 1. - abs(p);
    return cos(ea(p.x)*ea(p.y)*ea(p.z) * coeff + phase);
}

vec3 mp(vec3 p){
    return cpow(p, m(p));
}
vec3 op(vec3 p){
    return cpow(p, o(p));
}
vec3 mp(vec3 p, float coeff){
    return cpow(p, m(p, coeff));
}
vec3 op(vec3 p, float coeff){
    return cpow(p, o(p, coeff));
}
vec3 mp(vec3 p, float coeff, float phase){
    return cpow(p, m(p, coeff, phase));
}
vec3 op(vec3 p, float coeff, float phase){
    return cpow(p, o(p, coeff, phase));
}

vec3 mpi(vec3 p, float nbIt, float coeffIt){
    return cpow(p, mi(p, nbIt, coeffIt));
}
vec3 opi(vec3 p, float nbIt, float coeffIt){
    return cpow(p, oi(p, nbIt, coeffIt));
}

vec3 ccol(vec3 col, vec3 c1, vec3 c2){
    col.xy *= absp(c1.x*m(col*c2.x));
    col.xz += (c1.y*m(la(col*c2.y)));
    col.yz *= absp(c1.z*m(col*c2.z));

    return col;
}

vec3 ccol(vec3 col){
    col.xy *= absp(col.x*m(col*col.x));
    col.xz += (col.y*m(la(col*col.y)));
    col.yz *= absp(col.z*m(col*col.z));

    return col;
}

float sm(vec3 p){
    return sin(p.x) * sin(p.y) * sin(p.z);
}
float so(vec3 p){
    return sin(p.x) + sin(p.y) + sin(p.z);
}

float smi(vec3 p, float it, float np){
    float res = 0.;
    for(float i = 0.; i < it; i += 1.){
        res += sm(p);
        p *= np;
    }
    return res;
}
float soi(vec3 p, float it, float np){
    float res = 0.;
    for(float i = 0.; i < it; i += 1.){
        res += so(p);
        p *= np;
    }
    return res;
}

float pulse(vec3 col){
    return pow(length(sin(col * PI * 3.0)) / sqrt(3.0), 8.0);
}
float pulse(vec3 col, float size){
    return pow(length(sin(col * PI * size)) / sqrt(3.0), 8.0);
}
float pulse(vec3 col, float size, float intensity){
    return pow(length(sin(col * PI * size)) / sqrt(intensity), 8.0);
}
float pulse(vec3 col, float size, float intensity, float po){
    return pow(length(sin(col * PI * size)) / sqrt(intensity), po);
}

float rim(){
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float ri = 1.0 - max(dot(viewDir, normalize(vNormal)), 0.0);
    return ri = pow(ri, 2.0);
}
float rim(float po){
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float ri = 1.0 - max(dot(viewDir, normalize(vNormal)), 0.0);
    return ri = pow(ri, po);
}

vec3 hot(vec3 col){
    vec3 h = max(col - 0.7, 0.0);
    return h * h * 4.0;
}
vec3 hot(vec3 col, float n){
    vec3 h = max(col - n, 0.0);
    return h * h * 4.0;
}
vec3 hot(vec3 col, float n, float po){
    vec3 h = max(col - n, 0.0);
    return h * h * po;
}
    
vec3 hdr(vec3 col, float val){
    return pow(col, vec3(val));
}

mat3 rotAxis(vec3 axis, float a) {
    axis = normalize(axis);
    float c = cos(a), s = sin(a);
    float t = 1.0 - c;
    float x = axis.x, y = axis.y, z = axis.z;
    return mat3(
        t*x*x + c,    t*x*y + s*z,  t*x*z - s*y,
        t*x*y - s*z,  t*y*y + c,    t*y*z + s*x,
        t*x*z + s*y,  t*y*z - s*x,  t*z*z + c
    );
}

vec3 wrot(vec3 p, float ofs, float nbWraps, float rotAngle){
  return p * rotAxis(wrap(p + ofs, nbWraps), rotAngle);
}

mat3 rotX(float a) {
    float c = cos(a), s = sin(a);
    return mat3(
        1.0, 0.0, 0.0,
        0.0,   c,   s,
        0.0,  -s,   c
    );
}

mat3 rotY(float a) {
    float c = cos(a), s = sin(a);
    return mat3(
          c, 0.0,  -s,
        0.0, 1.0, 0.0,
          s, 0.0,   c
    );
}

mat3 rotZ(float a) {
    float c = cos(a), s = sin(a);
    return mat3(
          c,   s, 0.0,
         -s,   c, 0.0,
        0.0, 0.0, 1.0
    );
}

float relief(float dLin, float cWidthPx){        // dLin : distance écran en PIXELS (sortie de tube ou de lin)
    const float cAspect = 0.55;
    const float cRelief = 1.0;

    float qNorm = abs(dLin) / cWidthPx;      // seule conversion restante : px → [0,1]
    float dome  = max(1.0 - qNorm*qNorm, 0.0);
    float hgt   = dome * dome;

    float wWorld = cWidthPx * length(dFdx(vWorldPosition));
    float ampH   = cRelief * cAspect * wWorld;

    vec3 nrm  = normalize(vNormal);
    vec3 vdir = normalize(cameraPosition - vWorldPosition);
    if (dot(nrm, vdir) < 0.0) nrm = -nrm;

    vec3  dpx = dFdx(vWorldPosition), dpy = dFdy(vWorldPosition);
    float dhx = dFdx(hgt),            dhy = dFdy(hgt);
    vec3  r1  = cross(dpy, nrm),      r2  = cross(nrm, dpx);
    float dnm = dot(dpx, r1);
    vec3  grd = (abs(dnm) > 1e-12) ? (r1*dhx + r2*dhy) / dnm : vec3(0.0);
    vec3  nBump = normalize(nrm - ampH * grd);

    vec3  ldir = normalize(vec3(0.5, 0.9, 0.35));
    float dif  = 0.35 + 0.65 * max(dot(nBump, ldir), 0.0);
    float spc  = pow(max(dot(nBump, normalize(ldir + vdir)), 0.0), 64.0);

    float onBead = smoothstep(0.0, 0.15, hgt);
    float aoRing = 1.0 - 0.30 * ((1.0 - smoothstep(1.0, 1.7, qNorm)) - onBead);

    return mix(aoRing, dif, onBead) + spc * onBead * 0.9;   // avec l'ombre de contact
    //return mix(1.0, dif, onBead) + spc * onBead * 0.9;   // ta version, sans
}

float lin(float fld){         // adaptateur pour les champs LISSES — pas pour tube
    return fld / max(fwidth(fld), 1e-6);
}

float rel(vec3 col, float w){
    return relief(tubeRel(col, w, w), w);
}

vec2 iSphere(vec3 ro, vec3 rd, vec3 center, float radius) {
    vec3 oc = ro - center;
    float b = dot(oc, rd);
    float c = dot(oc, oc) - radius * radius;
    float h = b * b - c;
    if (h < 0.0) return vec2(-1.0);
    h = sqrt(h);
    return vec2(-b - h, -b + h);
}

vec3 sdec(vec3 col, float val){
    return la(E*hueRotateYIQ(col*val, val*12.));
}
vec3 sdec(vec3 col, float val, float k){
    return la(E*hueRotateYIQ(col*val, val*k));
}
vec3 sdec(vec3 col, float val, float k, float n){
    return la(n*hueRotateYIQ(col*val, val*k));
}

vec3 calculateLighting(vec3 pos, vec3 normal, vec3 baseColor) {
    vec3 N = normalize(normal);
    vec3 V = normalize(cameraPosition - pos);

    if (dot(N, V) < 0.0) {
        N = -N;
    }

    vec3 lampPos = vec3(lampPosition.x, lampPosition.y, lampPosition.z * 32.0);

    vec3 L = normalize(lampPos - pos);
    float dist = length(lampPos - pos);
    float att = calcAttenuation(dist, lampRadius, lampIntensity * 200.0);

    float diff = max(dot(N, L), 0.0);

    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 32.0) * 0.5;

    vec3 ambient = 0.1 * baseColor;
    vec3 diffuse = diff * baseColor * att;
    vec3 specular = spec * vec3(0.3) * att;

    return ambient + diffuse + specular;
}



// ============================================================
//  Encre de Chine (水墨) — briques de rendu
//  Utilisées par le shader "Chenese ink Claude".
// ============================================================

// FBM à nombre d'octaves libre : base commune de tous les champs d'encre.
// La lacunarité non entière évite que les octaves ne se réalignent sur la grille du bruit.
float inkFbm(vec3 p, float oct){
    float v = 0.0, amp = 0.5, nrm = 0.0;
    for (float i = 0.0; i < oct; i += 1.0){
        v   += amp * noise(p);
        nrm += amp;
        p   *= 2.03;
        amp *= 0.5;
    }
    return v / max(nrm, 1e-5);
}
float inkFbm(vec2 p, float oct){
    float v = 0.0, amp = 0.5, nrm = 0.0;
    for (float i = 0.0; i < oct; i += 1.0){
        v   += amp * noise(p);
        nrm += amp;
        p   *= 2.03;
        amp *= 0.5;
    }
    return v / max(nrm, 1e-5);
}

// FBM turbulent : les plis restent nets là où le FBM lisse s'arrondit.
// Sert aux nervures du papier et aux franges laissées par le pinceau.
float inkTurbulence(vec3 p, float oct){
    float v = 0.0, amp = 0.5, nrm = 0.0;
    for (float i = 0.0; i < oct; i += 1.0){
        v   += amp * abs(2.0 * noise(p) - 1.0);
        nrm += amp;
        p   *= 2.03;
        amp *= 0.5;
    }
    return v / max(nrm, 1e-5);
}

// Un FBM se tasse autour de 0.5 : ses octaves s'additionnent et la somme se concentre
// sur sa moyenne. On rouvre la dynamique avant de seuiller, sinon le seuil ne mord
// que sur une frange étroite du bruit et le trait ne sort pas.
float inkContrast(float v, float k){
    return clamp((v - 0.5) * k + 0.5, 0.0, 1.0);
}

// Diffusion capillaire (渗化) : le domaine est déformé par lui-même, si bien que la
// frontière du lavis se digite au lieu de rester lisse — c'est l'encre qui remonte
// dans les fibres du papier. amp règle la violence de la bavure.
float inkBleed(vec3 p, float amp, float oct){
    vec3 q = vec3(inkFbm(p,                       oct),
                  inkFbm(p + vec3(4.7, 1.3, 8.2), oct),
                  inkFbm(p + vec3(9.4, 6.1, 2.5), oct));
    return inkFbm(p + amp * (q - 0.5), oct + 1.0);
}

// Trace de pinceau : bruit étiré dans le sens du geste.
//
// Sur une surface, étirer directement l'espace 3D le long d'une direction tangente ne
// donne rien : cette direction est perpendiculaire au rayon, donc dot(p, dir) reste
// quasi constant et l'étirement s'annule. On travaille donc dans une carte du geste,
// portée par deux champs scalaires lisses : "across" varie en travers du trait,
// "along" le suit. Les lignes de niveau de "across" sont les trajectoires du pinceau,
// et elles restent cohérentes sur toute la longueur d'un trait.
// elong = 1 -> isotrope ; elong grand -> longues traînées.
float inkStroke(float across, float along, float elong, float freq, float oct){
    return inkFbm(vec2(across * freq, along * freq / max(elong, 1.0)), oct);
}

// Les cinq tons de l'encre (焦濃重淡清) : quantification douce du lavis.
// rim culmine sur la frontière entre deux tons : c'est l'auréole plus sombre
// que laisse un lavis en séchant (水痕).
float inkTones(float v, float levels, float soft, out float rim){
    float s = v * levels;
    float i = floor(s);
    float f = fract(s);
    float w = clamp(soft, 0.02, 0.5);
    float d = (f - 0.5) / w;
    rim = exp(-d * d);
    return (i + smoothstep(0.5 - w, 0.5 + w, f)) / levels;
}

// 飛白 « blanc volant » : réserves de papier laissées par un pinceau presque sec.
// Très étirées dans le sens du geste, ce sont les poils du pinceau qui se séparent.
// dryness = 0 pinceau chargé, 1 pinceau sec.
float inkFlyingWhite(float across, float along, float dryness, float freq){
    float s   = inkContrast(inkStroke(across, along, 26.0, freq, 3.0), 2.4);
    float thr = mix(0.80, 0.30, clamp(dryness, 0.0, 1.0));
    return smoothstep(thr, thr + 0.12, s);
}

// Grain du papier xuan : un feutrage (fibres emmêlées, sans trame) plus une moucheture.
// Le grain s'éteint quand il descend sous la taille du pixel, sinon il fourmille.
float inkPaperGrain(vec3 p, float freq){
    float f1 = noise(p * freq);
    float f2 = noise(p * freq * 1.9 + 31.7);
    float sp = noise(p * freq * 4.3 + 11.3);
    float g  = 0.50 * f1 + 0.34 * f2 + 0.16 * sp;
    float px = length(fwidth(p)) * freq;
    return mix(g, 0.5, smoothstep(0.4, 1.2, px));
}

// L'encre n'est pas un noir neutre : diluée elle tire vers le sépia chaud,
// concentrée elle vire au bleu-noir du bâton de suie de pin (松烟墨).
vec3 inkPigment(float d){
    vec3 pale = vec3(0.740, 0.710, 0.660);
    vec3 mid  = vec3(0.330, 0.330, 0.345);
    vec3 deep = vec3(0.045, 0.052, 0.078);
    d = clamp(d, 0.0, 1.0);
    return d < 0.5 ? mix(pale, mid, d * 2.0) : mix(mid, deep, (d - 0.5) * 2.0);
}

// Beer–Lambert : l'encre est bue par le papier, elle ne le recouvre pas.
// À densité 1 on retrouve exactement pigment * papier ; en dessous la décroissance
// est exponentielle, ce qui donne aux lavis leur transparence.
vec3 inkAbsorb(vec3 paper, vec3 pigment, float density){
    vec3 od = -log(max(pigment, vec3(0.002)));
    return paper * exp(-od * max(density, 0.0));
}

// Courbure moyenne approchée en espace écran, signée : négative dans les creux.
// Sert à faire stagner l'encre là où la forme se replie.
float inkCurvature(vec3 P, vec3 N){
    vec3 dPx = dFdx(P), dPy = dFdy(P);
    vec3 dNx = dFdx(N), dNy = dFdy(N);
    float kx = dot(dNx, dPx) / max(dot(dPx, dPx), 1e-9);
    float ky = dot(dNy, dPy) / max(dot(dPy, dPy), 1e-9);
    return -0.5 * (kx + ky);
}

vec3 inkDeco(vec3 col){
    vec3 p = npos();
    col *= 1./3. + inkPigment(length(col));
    col *= 1./3. + inkAbsorb(p, col, length(col));
    return col / inkContrast(length(col), length(col));
}

vec3 inkDeco(vec3 col, vec3 p){
    col *= 1./3. + inkPigment(length(col));
    col *= 1./3. + inkAbsorb(p, col, length(col));
    return col / inkContrast(length(col), length(col));
}

vec3 inkDeco(vec3 col, vec3 p, float k){
    col *= k + inkPigment(length(col));
    col *= k + inkAbsorb(p, col, length(col));
    return col / inkContrast(length(col), length(col));
}



`;
}

/**
 * Marker separating the `main()` body from the user's own GLSL functions inside a
 * stored shader entry.
 *
 * A shader is persisted, exported, merged and undone as a *single string*
 * (`fragmentShaders[i]`), everywhere in the application. Custom functions cannot live
 * in that string as-is — GLSL has no nested functions, so they must be emitted before
 * `main()`, not inside it — but giving them their own array would mean teaching
 * localStorage, the server merge, the .js export, the scene JSON and the undo history
 * about a second field. Keeping them in the same string behind a marker leaves all of
 * that untouched: only the two ends care, the composer that splits it and the editor
 * that shows it.
 *
 * The block is appended *after* the body so that {@link ShaderCRUD.getShaderName} still
 * finds the shader's name in the first `//` comment, and the marker is written only when
 * there is something to write — a shader without custom functions stays byte-identical
 * to what the server serves, so it is not mistaken for a local edit by the merge.
 *
 * @type {string}
 */
const USER_FUNCTIONS_TAG = '// __USER_FUNCTIONS__';

/** @type {string} Opening marker of the editable custom-function zone in the editor. */
const USER_FUNCTIONS_START = '// __USER_FUNCTIONS_START__';

/** @type {string} Closing marker of the editable custom-function zone in the editor. */
const USER_FUNCTIONS_END = '// __USER_FUNCTIONS_END__';

/** @type {string} Marker where the read-only footer begins in the editor. */
const FRAGMENT_FOOTER_TAG = '// __FOOTER_START__';

/** @type {string} Statement the editable `main()` body starts after, in the editor. */
const FRAGMENT_BODY_TAG = 'vec3 col = meshBg;';

/**
 * Splits a stored shader entry into its `main()` body and its custom-function block.
 * An entry written before this feature (no marker) is all body, no functions.
 *
 * @param {string} entry - A `fragmentShaders[i]` entry.
 * @returns {{body: string, funcs: string}} The two halves.
 */
function splitShaderUserFunctions(entry) {
    const src = entry || '';
    const pos = src.indexOf(USER_FUNCTIONS_TAG);

    if (pos === -1) { return { body: src, funcs: '' }; }

    return {
        // The newline {@link joinShaderUserFunctions} inserted to put the marker on its
        // own line belongs to the marker, not to the body: dropping it here makes the two
        // functions exact inverses of each other.
        body:  src.slice(0, pos).replace(/\n$/, ''),
        funcs: src.slice(pos + USER_FUNCTIONS_TAG.length).trim()
    };
}

/**
 * Rebuilds a stored shader entry from a `main()` body and a custom-function block.
 * Without functions the entry is the body alone — no marker is added.
 *
 * @param {string} body - The `main()` body code.
 * @param {string} [funcs=''] - The user's own GLSL functions.
 * @returns {string} The entry to store in `fragmentShaders`.
 */
function joinShaderUserFunctions(body, funcs = '') {
    const trimmedFuncs = (funcs || '').trim();

    if (!trimmedFuncs) { return body || ''; }

    return (body || '') + '\n' + USER_FUNCTIONS_TAG + '\n' + trimmedFuncs + '\n';
}

/**
 * Builds the custom-function zone shown in the editor: an explanatory banner, then the
 * user's functions between the two markers.
 *
 * The banner sits *outside* the markers on purpose — only what lies between them is kept
 * with the shader, so an untouched zone extracts as the empty string rather than as a
 * block of comments.
 *
 * @param {string} [funcs=''] - The user's own GLSL functions.
 * @returns {string} The GLSL block to insert just before `main()`.
 */
function buildUserFunctionsZone(funcs = '') {
    return `
// ============================================================
// VOS FONCTIONS — zone libre, compilée avec le shader (Ctrl+S).
// Tout ce qui est écrit entre les deux repères ci-dessous est conservé avec le
// shader (sauvegarde, export, historique, annulation) et appelable depuis main()
// comme depuis les autres fonctions de la zone. Exemple :
//     float ring(float d, float w){ return smoothstep(w, 0.0, abs(d)); }
// Les uniforms, les macros et les utilitaires ci-dessus y sont disponibles.
// ============================================================
${USER_FUNCTIONS_START}
${(funcs || '').trim()}
${USER_FUNCTIONS_END}
`;
}

/**
 * Reads back the two editable regions from the full text of the Monaco editor:
 * the custom-function zone and the `main()` body.
 *
 * The body is searched *after* the closing function marker, so a custom function that
 * happens to contain `vec3 col = meshBg;` cannot be taken for the start of `main()`.
 *
 * The newline and indentation the footer opens with are given back to the footer rather
 * than kept in the body: an entry displayed and read back unchanged then comes out
 * byte-for-byte identical, so merely opening and compiling a shader never rewrites it —
 * which would otherwise make the server merge take it for a local edit and freeze it.
 *
 * @param {string} fullText - The complete editor content.
 * @returns {{body: string, funcs: string, ok: boolean}} The regions, `ok` being `false`
 *   when the body markers are missing (header damaged beyond recovery).
 */
function extractEditorShaderParts(fullText) {
    const src = fullText || '';

    let funcs = '';
    const funcsStart = src.indexOf(USER_FUNCTIONS_START);
    const funcsEnd   = src.indexOf(USER_FUNCTIONS_END);
    if (funcsStart !== -1 && funcsEnd > funcsStart) {
        funcs = src.slice(funcsStart + USER_FUNCTIONS_START.length, funcsEnd).trim();
    }

    const bodyStart = src.indexOf(FRAGMENT_BODY_TAG, funcsEnd !== -1 ? funcsEnd : 0);
    const bodyEnd   = bodyStart === -1 ? -1 : src.indexOf(FRAGMENT_FOOTER_TAG, bodyStart);
    const ok        = bodyStart !== -1 && bodyEnd > bodyStart;

    return {
        funcs: funcs,
        body:  ok ? src.slice(bodyStart + FRAGMENT_BODY_TAG.length, bodyEnd).replace(/\n[ \t]*$/, '') : '',
        ok:    ok
    };
}

/**
 * Assembles the text shown in the Monaco editor for a stored shader entry:
 * read-only header, the user's function zone, `main()` opening, the body, footer.
 *
 * @param {string} entry - A `fragmentShaders[i]` entry.
 * @returns {string} The full GLSL source to display.
 */
function buildEditorShaderSource(entry) {
    const { body, funcs } = splitShaderUserFunctions(entry);

    return fragmentShaderHeaderTop
         + buildUserFunctionsZone(funcs)
         + fragmentShaderMainOpen
         + body
         + fragmentShaderFooter;
}

/**
 * Common GLSL header prepended to every fragment shader, up to (but excluding) the
 * custom-function zone and the opening of `main()`.
 *
 * Declares the GLSL ES 3.0 version, precision, all varyings received from the
 * vertex shader (position, world position, normal, UVs), the fragment output,
 * all custom uniforms (time, camera, grid parameters, colors, lighting), and
 * inlines the shared utility functions from {@link getFragmentUtilsGLSL}.
 *
 * @type {string}
 */
fragmentShaderHeaderTop = `#version 300 es
precision highp float;

#define PI       3.14159265358979
#define TWO_PI   6.28318530717958
#define HALF_PI  1.57079632679490
#define E        2.71828182845904
#define Z        1.61803398874989
#define W        1.41421356237309

#define t time

#define c(x) (cos (x))
#define s(x) (sin (x))
#define pit(x, c, p) (cpow (x,x*c+p))
#define ins(func, x, y) (func (x) * (1.+func(x*y)))
#define rec(func1, func2, x, y) (func1 (x * func2(x*y)))
#define pp(f1, f2, p, t1, t2) (f1(cpow(p, 1.+abs(o(p)))) * f2(cpow(p*(1.+ t1*c(t*t2)), 1.+abs(o(p)))))
#define pm(val) (1. + abs(val))
#define pmRel(x) (1. + sqrt(x*x + 0.02))
#define minf(f1, f2, p, nb) (min(f1(p*nb), f2(p*nb)))
#define maxf(f1, f2, p, nb) (max(f1(p*nb), f2(p*nb)))
#define minft(f1, p, t) (min(f1(p), f1(p+t)))
#define maxft(f1, p, t) (max(f1(p), f1(p+t)))
#define ptmt(p, f, c1, c2) (f(p*c1 + t*c2)*f(p*c1 - t*c2))
#define fi(p, f, v, t) (vec3(f(p*v.x + t), f(p*v.y + t), f(p*v.z + t)))


// Varyings received from the vertex shader
in vec3 vPosition;
in vec3 vWorldPosition;
in vec3 vNormal;
in vec2 vUV;
in vec2 vUVParams;

// Coordonnées sphériques du fragment courant (calculées une seule fois en début de main()).
// Convention y-up : x = rayon R, y = latitude (angle / plan xz, [-PI/2, PI/2]),
// z = azimut autour de y ([-PI, PI]). Coût : 2 length + 2 atan par fragment, et 0 si inutilisé
// (dead-code elimination du compilateur GLSL).
vec3 vSpherePos;

// Fragment shader output
out vec4 fragColor;

// Custom uniforms
uniform float time;
uniform vec3 cameraPosition;
uniform float gridU;
uniform float gridV;
uniform float P;
uniform float Q;
uniform float S;
uniform float T;
uniform float U;
uniform float lineWidth;
uniform vec2 uvCoeff;
uniform vec2 uvParamsCoeff;
// Bornes du domaine paramétrique (min/max de u et v), disponibles dans le code couleur.
uniform float uMinU, uMaxU, uMinV, uMaxV;
uniform float invcol;
uniform float islight;
uniform float opt1;
uniform float opt2;
uniform float opt3;
uniform vec3 meshBg;
uniform vec3 meshFg;
uniform vec3 lampPosition;
uniform float colorContrast;
uniform vec3 backgroundColor;
uniform float colorRotation;
uniform float lampIntensity;
uniform float lampRadius;
uniform float lampSpecularIntensity;
uniform float lampSpecularPower;

${getFragmentUtilsGLSL()}

// Accès à l'équation du maillage. Stub neutre pour la validation dans l'éditeur :
// les vraies valeurs (eqPos/eqX/eqY/eqZ et eqx/eqy/eqz) sont injectées à la
// compilation par createFragmentShader(), à partir de l'équation paramétrique courante.
float eqx, eqy, eqz;
vec3 eqPos(float u, float v) { return vec3(0.0); }
float eqX(float u, float v) { return 0.0; }
float eqY(float u, float v) { return 0.0; }
float eqZ(float u, float v) { return 0.0; }
`;

/**
 * Opening of `main()`, inserted after the custom-function zone: spherical coordinates,
 * parametric coordinates and the `col` initialization the editable body starts from.
 *
 * @type {string}
 */
fragmentShaderMainOpen = `
void main(){
    vSpherePos = vec3(length(vPosition), atan(vPosition.y, length(vPosition.xz)), atan(vPosition.z, vPosition.x));
    // Coordonnées paramétriques du fragment courant, exposées au code couleur.
    float u = vUVParams.x;
    float v = vUVParams.y;

    ${FRAGMENT_BODY_TAG}`;

/**
 * Common GLSL header prepended to every fragment shader, with an empty custom-function
 * zone. Kept for callers that compose a shader without a stored entry to read functions
 * from; the editor itself goes through {@link buildEditorShaderSource}.
 *
 * @type {string}
 */
fragmentShaderHeader = fragmentShaderHeaderTop + buildUserFunctionsZone('') + fragmentShaderMainOpen;

/**
 * Common GLSL footer appended to every fragment shader.
 *
 * Handles discard based on brightness threshold (U uniform), color inversion
 * (controlled by the INV button), hue rotation via a YIQ luma-chroma matrix,
 * contrast adjustment, and optional Blinn-Phong lighting (controlled by
 * the lamp button).
 * Applies tone mapping and gamma correction when lighting is active.
 * Outputs the final color to `fragColor`.
 *
 * @type {string}
 */
fragmentShaderFooter = `
    ${FRAGMENT_FOOTER_TAG}
    //Checkerboard
    if(U < 2.0 && length(col) > U){ discard; }

    // Color inversion when INV button is active
	col = mix(col, vec3(1.0)-col, invcol);

    // Hue rotation (degrees, cycle 0..360) via YIQ luma-chroma matrix
    col = hueRotateYIQ(col, radians(colorRotation));

    col = (col - 0.5) * colorContrast + 0.5;

	// Lighting when the lamp button is active
	if(islight == 1.0){
		col*= (light(lampPosition, col) + light(-lampPosition, col));
		col = col / (col + vec3(1.0));
		col = pow(col, vec3(1.0 / 2.2));
	}

	fragColor = vec4(col, 1.0);
}
`;

glo.numShaderMove = glo.numShaderMove();

/**
 * The fully composed GLSL fragment shader source shown in the editor, assembled by
 * {@link buildEditorShaderSource} from the currently selected entry in
 * {@link fragmentShaders}.
 *
 * @type {string}
 */
fragmentShader = buildEditorShaderSource(fragmentShaders[glo.numShaderSelect]);

// ==================== NORMAL DEFORMATION SHADERS ====================
// The editable code is injected into computeDeformation() and must assign to float result.
// result is then applied as: finalPosition = pos + normal * result * scaleNorm

/**
 * Array of GLSL normal-deformation shader body snippets.
 *
 * Each entry is a template literal containing GLSL code that computes a `result` (float)
 * value. The code is inserted between {@link normalShaderHeader} and
 * {@link normalShaderFooter} to form the body of the `computeDeformation` function.
 *
 * @type {string[]}
 */
normalShaders = [
`
	// Default - deformation along the normal
	// Variables: x, y, z, xN, yN, zN, u, v, R, O, i, j, n, k, d, p, t, g
	// Functions: m(), o(p), b(p,q), a(p,q), sin, cos, length...
	result = 0.0;
`,
`
	// Loop
	// Variables: x, y, z, xN, yN, zN, u, v, R, O, i, j, n, k, d, p, t, g
	// Functions: m(), o(p), b(p,q), a(p,q), sin, cos, length...

	for(float i = 0.; i < 4.; i+=1.){
		pos*=1.+result;
		result += m(pos);
	}

`,
];

/**
 * Array of built-in custom mesh (geometry) GLSL body snippets.
 *
 * Each entry is a template literal containing GLSL code that writes the vertex
 * position into `outPos` (a pre-declared `vec3`). The code is inserted between
 * the mesh editor markers to form the body of `computePosition()`. A first-line
 * `// Name` comment is used as the display name in the mesh editor dropdown.
 *
 * These are the defaults loaded when no saved meshes exist in localStorage; the
 * mesh editor's storage indicator (💾) reloads them. Add your own here to ship
 * meshes hard-coded with the app — same pattern as {@link normalShaders} above.
 *
 * Available variables: u, v (parameters), i, j (grid indices), d, k, p, w, n
 * (auxiliaries), t (time), A..U (coeffs/macros), uStepsU, uStepsV, uFirstPoint.
 * Functions: rotateAxis(axis, angle), sin, cos, pow, length...
 *
 * @type {string[]}
 */
geometryShaders = [
`
	// Sphère
	float lat = v * 0.5;
	outPos = 2.0 * vec3(cos(u) * cos(lat), sin(u) * cos(lat), sin(lat));
`,
`
	// Tore
	float R = 2.0, r = 0.8;
	outPos = vec3((R + r * cos(v)) * cos(u), (R + r * cos(v)) * sin(u), r * sin(v));
`,
`
	// Vague animée
	outPos = vec3(u, v, 0.6 * sin(u + t) * cos(v + t));
`,
`
	// Fleur
	float rr = 1.4 + 0.35 * sin(6.0 * u);
	float lat = v * 0.5;
	outPos = rr * vec3(cos(u) * cos(lat), sin(u) * cos(lat), sin(lat));
`,
`
	// Real Saddle
	float px = v;
    float py = u;
    float pz = 0.;

    float px2 = u;
    float py2 = v;
    float pz2 = 3.14159;

    vec3 p1 = vec3(px, py, pz);
    vec3 p2 = vec3(px2, py2, pz2);
    vec3 p3 = cross(p1, p2);

    outPos = p3*.25;
`,
];

/**
 * GLSL header for normal-deformation shaders.
 *
 * Declares the `computeDeformation` function signature and sets up local
 * variables (position components, normal components, UV, radial distance,
 * grid indices, parity flags) before the user-editable shader body.
 *
 * @type {string}
 */
normalShaderHeader = `float computeDeformation(float u, float v, vec3 pos, vec3 norm) {
	float x = pos.x;
	float y = pos.y;
	float z = pos.z;
	float xN = norm.x;
	float yN = norm.y;
	float zN = norm.z;

	gx = x; gy = y; gz = z;
	gu = u; gv = v;

	float R = length(pos);
	float xzLen = length(pos.xz);
	float O = atan(pos.y, xzLen);

	float i = aIndex.x;
	float j = aIndex.y;
	float n = i * uStepsV + j;
	float k = mod(i, 2.0) < 1.0 ? -1.0 : 1.0;
	float d = mod(j, 2.0) < 1.0 ? -1.0 : 1.0;
	float p = k < 0.0 ? -u : u;
	float w = d < 0.0 ? -v : v;

	float result = 0.0;
`;

/**
 * GLSL footer for normal-deformation shaders.
 *
 * Closes the `computeDeformation` function by returning the computed `result`.
 *
 * @type {string}
 */
normalShaderFooter = `
	return result;
}`;

/**
 * The fully composed GLSL normal-deformation shader source, assembled from
 * {@link normalShaderHeader}, the currently selected entry in
 * {@link normalShaders}, and {@link normalShaderFooter}.
 *
 * @type {string}
 */
normalShader = normalShaderHeader + normalShaders[glo.numNormalShaderSelect] + normalShaderFooter;

/**
 * Validates a GLSL shader (vertex or fragment) by compiling it on the GPU.
 *
 * @param {string} shaderCode - GLSL source code to validate.
 * @param {string} [type='fragment'] - Shader type: 'vertex' or 'fragment'.
 * @returns {{valid: boolean, error: string|null}} Compilation result with any error message.
 */
function validateShader(shaderCode, type = 'fragment') {
    const gl = glo.gl;

    if (!gl) {
        return { valid: false, error: 'WebGL not supported' };
    }

    const glType = type === 'vertex' ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER;
    const shader = gl.createShader(glType);
    gl.shaderSource(shader, shaderCode);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        return { valid: false, error };
    }

    gl.deleteShader(shader);
    return { valid: true };
}