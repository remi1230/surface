fragmentShaders = [
`
    //Norm&Pos
    float coeff = 1.0+Ts(0.25);
    float lnpos = coeff*length(vNormal*(npos()));
    
    vec3 col1 = fract(coeff*palette(lnpos));
    vec3 col2 = fract(3.0*rainbow(lnpos));
    vec3 col3 = 1.0 - mix(col1, col2, dot(col1,col2));
    vec3 col4 = 1.0 - mix(col1, col2, cross(col1,col2));

    vec3 col = mix(col3, col4, Ts(1.0));
`,
`
    //Npos
    vec3 col = 1.0 - palette(8.0*length(npos()));
`,
`
    //Normal
    vec3 col = vNormal;

    
`,
`   
    //RotTile
    vec3 col  = vec3(0.0); 
    vec3 col1 = col;
    vec3 col2 = col;

    vec3 pattern = rotateTilePattern(vUV, 8.0);
    vec2 st = pattern.xy;
    
    col = vec3(step(st.x,st.y));
`,
`   
    //Hexagone
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
    //Truchet
    vec2 scale  = vec2(16.0, 32.0);
    vec2 cell   = floor(vUV * scale);
    vec2 uv     = fract(vUV*scale)-0.5;
    float d     = length(uv);
    float index = hash21(cell);

    float rad = 0.5;
    float thickness = 0.14;

    vec3 col   = vec3(truchet(uv, index, rad, thickness));
    float lCol = length(col);

    float c      = 0.0625*time+4.0*length(npos());
    vec3 valCol  = palette(c);
    vec3 valCol2 = rainbow(c);
    vec3 valCol3 = mix(valCol, valCol2, Ts(1.0));

    col *= valCol3;

    if(lCol == 0.0) col = 1.0-valCol3;
    else{
        col = smoothstep(0.833, 1.166-0.166*Ts(1.0), valCol3); 
    }


`,
`
    // FractUV
    float scale = 24.0;
    float ratio = 0.5;

    vec2 uv     = vec2(vUV.x*ratio,vUV.y)*scale; 
    vec2 cellUv = fract(uv)-0.5;
    vec2 cellId = floor(uv);
    float d     = length(cellUv);
    float index = hash21(cellId);
    
    float valCol = d+0.125*time;

    vec3 col1 = palette(valCol-index);
    vec3 col2 = rainbow(valCol+index);

    vec3 col = mix((0.66+Tc(0.33))*col1, (0.33+Ts(0.42))*col2, cross(col1, col2));
    
    if(length(col) > 1.0){
        col /= 1.414;
    }
    
    
    
    
    `,
`
    //Voronoi
    vec2 st = vUV;
    vec3 color = vec3(.0);

    // Scale
    vec2 scale = vec2(32., 64.);
    st *= scale;

    vec2 i_st = floor(st);
    vec2 f_st = fract(st);

    float m_dist = 1.0 - voronoi(i_st, f_st, scale);

    float minBrightness = 0.333;
    m_dist = minBrightness + (1.0 - minBrightness) * m_dist;

    vec3 col = vec3(m_dist, m_dist*0.35, m_dist*0.07);


`
];
