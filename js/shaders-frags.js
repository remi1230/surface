fragmentShaders = [
`
    float coeff = 1.0+Ts(0.25);
    float lnpos = coeff*length(vNormal*(npos()));
    vec3 col1   = fract(coeff*palette(lnpos));
    vec3 col2   = fract(3.0*rainbow(lnpos));

    vec3 col = 1.0 - mix(col1, col2, dot(col1,col2));
`,
`
    vec3 col = palette(2.0*length(npos()));
`,
`
    vec3 col = vNormal;
`,
`
    float val = mix(vCurvatures.x, vCurvatures.y, length(npos()));
    vec3 col  = 1.0 - rainbow(val);
`,
`   
    vec3 col  = vec3(0.0); 
    vec3 col1 = col;
    vec3 col2 = col;

    vec3 pattern = rotateTilePattern(vUV, 8.0);
    vec2 st = pattern.xy;
    
    col = vec3(step(st.x,st.y));
`,
`   
    vec2 hexUV = vec2(vUV.x*0.5, vUV.y) * 24.0;
    float row = floor(hexUV.y);

    vec2 cell = fract(hexUV) - 0.5;
    vec3 col = vec3(0.0);

    float d = sdHexagon(cell, 5.0/12.0);
    col = vec3(smoothstep(0.042, 0.0, abs(d))); // contour
    
    if(col == vec3(0.0)){
        col = palette(d+time*0.125);
    }
`,
`   
    float scale = 32.0;
    vec2 cell   = floor(vUV * scale);
    vec2 uv     = fract(vUV*scale)-0.5;
    float d     = length(uv);
    float index = hash21(cell);

    vec2 center1, center2;
    if (index < 0.5) {
        center1 = vec2(-0.5, -0.5);
        center2 = vec2( 0.5,  0.5);
    } else {
        center1 = vec2( 0.5, -0.5);
        center2 = vec2(-0.5,  0.5);
    }

    float rad = 0.5;
    float dist1 = sdCircle(uv, center1, rad);
    float dist2 = sdCircle(uv, center2, rad);
    
    float thickness = 0.05;
    float arc1 = 1.0 - smoothstep(0.0, 0.02, abs(dist1) - thickness);
    float arc2 = 1.0 - smoothstep(0.0, 0.02, abs(dist2) - thickness);
    float pattern = max(arc1, arc2);

    vec3 col = vec3(pattern);

    vec3 valCol = palette(time);
    float lCol  = length(col);

    if(d > 0.4){
        col += 0.66*palette(d+0.125*time);
    }
    else if(d < 0.3){ col += palette(0.125*time+d); }
    col = 1.0 - col;
`,
];