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
 *   `fragmentShaderHeader + fragmentShaders[index] + fragmentShaderFooter`
 */

/**
 * Array of GLSL fragment shader body snippets.
 *
 * Each entry is a template literal string containing GLSL code that computes a `col` (vec3)
 * value. The code is inserted between {@link fragmentShaderHeader} and
 * {@link fragmentShaderFooter} to form a complete fragment shader.
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
    //StreetArt
    vec3 pos   = .42 * npos() * (P+2.) / (opt1 == 0.0 ? 2.0 : 6.0);
    float val1 = m(pos*0.125)*mh(pos*.25);
    float val2 = oh(pos*0.1875)-o(pos, 0.333, .5*time);
    float val3 = hch(pos*0.125);

    float val4 = .125*o(.5*pos, hc(val1,val2,val3));
    col = 1.0 - cpalette(val4, rainbow(val4));

    col = hueRotateYIQ(col, radians(92.));
    
`,
`   
    //StreetArt II
    vec3 pos  = npos(-1.);
    vec3 posN = vec3(m(
        pos,
        o(pos, 1., .25*time),
        2.* m(2.*pos)
    )) * 115. * P / (64.*64.);

    col = rainbop(.25*length(posN), pos);

    col += tube(col, 2.);

    col = 1.0 - col;
    col = hueRotateYIQ(col, radians(180.));
    
`,
`   
    //StreetArt III
    vec3 pos  = npos(-1.);
    vec3 posN = vec3(m(
        cos(8.*pos),
        o(pos, 1., .25*time),
        2.* m(2.*pos)
    )) * 115. * P / (64.*64.);

    col = rainbop(.25*length(posN), pos);

    col += tube(col, 2.);

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
    vec3 p = npos();

    col.rb += m(p*8., 1., 0.);
    col.bg += o(ec(p)*ea(p*.7), 1., 0.);
    
    col *= m(p);
    col -= hc(p);

    col += 8.*tube(col+time*.0333, 5.);
    
`,
`   
    //Pinky
    vec3 p = npos();

    col -= o(p*16.*cos(p*5.));

    col += ea(2.*p);
    col -= la(.25*p);

    col = vec3(m(col), o(col), hc(col));

    col += tube(col, 2.);

    col = hueRotateYIQ(col, radians(180.));
    
`,
`   
    //Scribble
    vec3 p = npos() * (opt1 == 0.0 ? 1. : .375);

    col -= m(p);

    col -= .75*ea(2.*p);
    col -= la(.25*p+2.72)-.33*ec(p*col+2.);

    col *= .25*3.14159*vec3(m(col), hc(col), o(col, 2., time));

    vec3 po = fract(col * Q/32.0) - 0.5;
    float tube = min(abs(po.x), min(abs(po.y), abs(po.z)));

    col *= .5 - (tube + .25*cos(8.*tube - 1.5));

    col = hueRotateYIQ(col, radians(140.));
    
`,
`   
    //Scribble II
    vec3 p = npos()*.618;

    col -= hc(p*5., 1., 0.);

    col -= .75*ea(2.71828*p);
    col -= la(.25*p+2.72)-.33*ec(col);

    col *= .25*3.14159*vec3(m(col), hc(col), o(col, 2., .25*time));

    vec3 po = fract(col * Q/32.0) - 0.5;
    float tube = min(abs(po.x), min(abs(po.y), abs(po.z)));

    col *= .58333-(tube + .25*cos(8.*tube - 1.5));

    col = hueRotateYIQ(col, radians(100.));
    
`,
`   
    //Lines
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
    //Exp-Abs
    vec3 p  = npos() * .25;

    col += o(P/ea(p));

    col -= .0707*edge(col, 2.);
    col += .0707*spec(col, 1.618);
    col += .067*tube(col, 4.);
`,
`   
    //Sweet puzzle
    vec3 p  = npos(-1.) / (opt1 == 1. ? 1. : 2.72);
    col += o(16.*p);
    col += 2.72*m(24.*p);
    col += cpalette(lc(p), .25*col*p);



    col += tube(col, 2.);
    col  = 1. - col;
    
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

    vec3 col1 = palette(lnpos);
    vec3 col2 = rainbow(lnpos);
    col = mix(col1, col2, 0.5);

    // Composition
    vec3 glowColor = rainbow(lnpos) * (T+1.5); // surexposé pour l'effet lumineux
    col = mix(col, glowColor, glow * 0.4);
    col = mix(col, vec3(1.0), line * Q/80.0);

`,
`
    //Norm&Pos
    float coeff = 1.0+Ts(0.25);
    float lnpos = coeff*length(vNormal*(npos()));
    
    vec3 col1 = fract(coeff*palette(lnpos));
    vec3 col2 = fract(3.0*rainbow(lnpos));
    vec3 col3 = 1.0 - mix(col1, col2, dot(col1,col2));
    vec3 col4 = 1.0 - mix(col1, col2, cross(col1,col2));

    if(opt1 == 0.0) col = mix(col3, col4, Ts(1.0));
    else col = mix(col3, col4, Ts(0.0666*dot(col3+npos(),col4-npos())));
`,
`
    //Norm&Pos2
    float lnpos = length(vNormal*(npos()));
    
    vec3 col1 = palette(3.0*lnpos+time*0.125);
    vec3 col2 = rainbow(8.0*lnpos+time*0.25);

    col = 1.0 - mix(col1, col2, 0.5);
    col = hueRotateYIQ(col, radians(180.));
`,
`
    //Butterfly
    vec3 pos    = (opt1 == 0.0 ? vPosition*5./12. : npos()) * P / 24.0;
    float c     = P/4.0;
    float val   = hc(pos, o(pos, c, -time), 0.25*time);
    vec3 valCol = rainbop(val*(0.5*Ts(-0.0625)), rainbop(.5+Ts(0.0625), 0.25*pos)*val+time*0.0625);

    col = 1.0 - vec3(val > 0.0 ? valCol : 1.0-valCol);

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
    //Simple II
    vec3 p  = npos(-1.) / (opt1 == 1. ? 1. : 2.72);
    col -= cos(64.*m(p));

`,
`
    //Nice colors
    vec3 p  = npos() / (opt1 == 1. ? 2.72 : .707);
    col -= cos(6.*o(o(8.*p), 1., 0.));

    col -= .72*cos(1.4142*col+.125);
    col -= 1.44*sin(1.4142*col+.125);

    col = rainbop(m(col*.725), col);
    
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
    col -= cos(2.*o(la(pos*vNormal), length(ea(pos)), time));
    col += abs(cos(3.*vNormal*pos));

    col += tube(col, 2.);
    col = 1.0 - col;
     
`,
`
    //Stained glass
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
    //Jungle
    vec3 pos   = .42 * npos() * (P+2.) / (opt1 == 0.0 ? 2.0 : 6.0);
    float val1 = m(pos*0.125)*mh(pos*.25);
    float val2 = oh(pos*0.1875)-o(pos, 0.333, .25*time);
    float val3 = hch(pos*0.125);

    float val4 = .125*hc(.5*pos, h(val1,val2,val3));
    col = 1.0 - cpalette(val4, rainbow(val4-.2*val1));

    col = hueRotateYIQ(col, radians(92.));

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
        hc(w*la(pos) * cos(c*pos.z), k, time), 
        o(w*la(pos) * cos(c*pos.z), k, time), 
        m(w*la(pos) * cos(c*pos.z), k, time)
    ) * P / 64.;

    col = cos(1.618*posN)*sin(8.*pos);

    col += tube(col, 1.);
    col = hueRotateYIQ(col, radians(180.));

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
    //Harlequin
    vec3 pos = opt1 == 0.0 ? vPosition * P / 8.0 : .42 * npos() * P;
    
    float coeff = opt2 == 0.0 ? 1.0 : .125;
    float phase = time;
    float val1 = m(pos, coeff, phase);
    float val2 = o(pos, coeff, phase);
    float val3 = hc(pos, coeff, phase);
    float val4 = m(val1, cos(.5*val2), 1.4142*val3);
    
    col = 1.0 - rainbop(val4, -cos(val4*pos));

`,
`   
    //Harlequin II
    vec3 pos   = .42 * npos() * (P+2.) / (opt1 == 0.0 ? 2.0 : 4.0);
    float val1 = mh(pos*0.125);
    float val2 = oh(pos*0.125);
    float val3 = hch(pos*0.125);

    float val4 = .00125*mh(val1, val2, val3);
    
    col = 1.0 - cpalette(val4, rainbow(val4));
    
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
    vec2 st = vUV;
    vec3 color = vec3(.0);

    // Scale
    vec2 scale = vec2(P, P*0.5);
    st *= scale;

    vec2 i_st = floor(st);
    vec2 f_st = fract(st);

    float m_dist = 1.0 - voronoi(i_st, f_st, scale);

    float minBrightness = 0.333;
    m_dist = minBrightness + (1.0 - minBrightness) * m_dist;

    col = vec3(m_dist, m_dist*0.35, m_dist*0.07);

    if(length(col) > T+0.85){ discard; }

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

    float E = dot(dpdx, dpdx);
    float F = dot(dpdx, dpdy);
    float G = dot(dpdy, dpdy);

    float e = dot(N, d2pdx2);
    float f = dot(N, d2pdxdy);
    float g = dot(N, d2pdy2);

    float denom = E * G - F * F;
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
 * @returns {string} A GLSL source code string containing all shared utility functions.
 */
function getFragmentUtilsGLSL() {
return `
vec3 npos(){ return opt1 == 0.0 ? normalize(vPosition) : vPosition; }
vec3 npos(float inv){ return opt1+inv == 0.0 ? normalize(vPosition) : vPosition; }

float Ts(float c){ return 0.49999*sin(c*time)+0.5; }
float Tc(float c){ return 0.49999*cos(c*time)+0.5; }

float tube(vec3 col, float nb){
    vec3 po = fract(col * nb) - 0.5;
    return min(abs(po.x), min(abs(po.y), abs(po.z)));
}

vec3 spec(vec3 col, float coeff){
    return sin(col * 3.14159 * 6.0) * 0.1 + vec3(sin(col.r * 10.0), sin(col.g * 10.0 + 2.0), sin(col.b * 10.0 + 4.0)) * coeff;
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

float hash31(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
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

float m(vec3 p){
    return cos(p.x) * cos(p.y) * cos(p.z);
}
float m(vec3 p, float coeff){
    return cos(coeff*p.x) * cos(coeff*p.y) * cos(coeff*p.z);
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
    return length(vec3(cos(p.x), cos(p.y), cos(p.z)));
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

float ec(vec3 p){
    return exp(abs(cos(p.x))) * exp(abs(cos(p.y))) * exp(abs(cos(p.z)));
}
float ec(vec3 p, float c){
    return exp(abs(cos(c*p.x))) * exp(abs(cos(c*p.y))) * exp(abs(cos(c*p.z)));
}
float ec(vec3 p, float c, float ph){
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


float pulse(vec3 col){
    return pow(length(sin(col * 3.14159 * 3.0)) / sqrt(3.0), 8.0);
}
float pulse(vec3 col, float size){
    return pow(length(sin(col * 3.14159 * size)) / sqrt(3.0), 8.0);
}
float pulse(vec3 col, float size, float intensity){
    return pow(length(sin(col * 3.14159 * size)) / sqrt(intensity), 8.0);
}
float pulse(vec3 col, float size, float intensity, float po){
    return pow(length(sin(col * 3.14159 * size)) / sqrt(intensity), po);
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
`;
}

/**
 * Common GLSL header prepended to every fragment shader.
 *
 * Declares the GLSL ES 3.0 version, precision, all varyings received from the
 * vertex shader (position, world position, normal, UVs), the fragment output,
 * all custom uniforms (time, camera, grid parameters, colors, lighting), and
 * inlines the shared utility functions from {@link getFragmentUtilsGLSL}.
 * Opens the `main()` function and initializes `col` to `meshBg`.
 *
 * @type {string}
 */
fragmentShaderHeader = `#version 300 es
precision highp float;

#define PI       3.14159265358979
#define TWO_PI   6.28318530717958
#define HALF_PI  1.57079632679490

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

void main(){
    vSpherePos = vec3(length(vPosition), atan(vPosition.y, length(vPosition.xz)), atan(vPosition.z, vPosition.x));
    vec3 col = meshBg;
`;

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
    // __FOOTER_START__
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
 * The fully composed GLSL fragment shader source, assembled from
 * {@link fragmentShaderHeader}, the currently selected entry in
 * {@link fragmentShaders}, and {@link fragmentShaderFooter}.
 *
 * @type {string}
 */
fragmentShader = fragmentShaderHeader + fragmentShaders[glo.numShaderSelect] + fragmentShaderFooter;

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
`
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