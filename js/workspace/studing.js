fragmentShaders = [
`
   //Default
    float nb = .375;
    vec3 p = npos() * nb;  
    vec3 n = vNormal * nb;

    vec3 p0 = p;
    vec3 pc = p*col;

    float r,k;

    for(float i = 0.; i < 20.; i+=10.){
        k += m(p*Z);
        r = m(p*k);
        p = fract(p*k) * (2.0*r) - r;
        col -= m(8.*c(.25*p*i), .888888, 0.);
        col += .1*tube(col, .1);
        col *= 1.+.333*spec(col, Z);
    }

    //col *= 1.+spec(col, Z);
    col += .25*tube(col, 1.);
        
    
`,
`   
    //Work I
    vec3 p  = npos(-1.);
    vec3 p0 = p;

    p.x += p.z;

    float ti = time * .125;

    for(float i = 1.; i <= 4.; i+=.33333){
        col += palette(.5*m((p+col+ti)) + .25*o((p-col-ti)));
    }

    col *= tube(col, .08);
    
`,
`   
    //Work II
    float nb = .375;
    vec3 p = npos() * nb;  
    vec3 n = vNormal * nb;

    vec3 p0 = p;
    vec3 pc = p*col;

    float r,k;

    for(float i = 0.; i < 21.; i+=4.){
        k += m(p*Z);
        r = m(p*k);
        p = fract(p*k) * (2.0*r) - r;
        col -= m(p+k*r);
        col *= 1.+.01*spec(col, Z);
    }

    col *= 1.+spec(col, Z);
    //col *= tube(col, .06667);
    //col /= tube(col, .06667);


    col = hueRotateYIQ(col, radians(272.));
    
`,
`   
    //Work III
    float nb = .375;
    vec3 p = (opt2 == 0.0 ? npos() : nspos()) * nb;  
    vec3 n = vNormal * nb;

    vec3 p0 = p;
    vec3 pc = p*col;

    float r,k;

    for(float i = 0.; i < 21.; i+=4.){
        k += m(p*Z);
        r = m(p*k);
        p = fract(p*k) * (2.0*r) - r;
        p = -.125+abs(p);
        col -= m(p+k*r);
        col *= 1.+.01*spec(col, Z);
    }

    col *= 1.+spec(col, Z);
    //col *= tube(col, .06667);
    //col /= tube(col, .06667);


    col = hueRotateYIQ(col, radians(272.));
    
`,
`   
    //Good I
    float nb = 1.;
    vec3 p = npos(-1.) * nb;  
    vec3 n = vNormal * nb;

    for(float i = 0.; i < 5.; i+=1.){
        col *= -.25+m(col*p)+o(col*p);
    }
    
`,
`   
    //Good II
    float nb = 1.;
    vec3 p = npos(-1.) * nb;  
    vec3 n = vNormal * nb;

    for(float i = 1.; i < 6.; i+=2.){
        col *= m(col*p*i)+o(col*p*i);
    }
    
`,
`   
    //Good III
    float nb = .375;
    vec3 p = npos(-1.) * nb;  
    vec3 n = vNormal * nb;

    for(float i = 1.; i < 6.; i+=1.25){
        col *= m(col*p*i+i*.5)+o(col*p*i+i*1.25);
    }

    col *= 1.+.25*post(col, 2., .7);
    
`,
`   
    //Good IV
    float nb = .375;
    vec3 p = npos(-1.) * nb;  
    vec3 n = vNormal * nb;

    vec3 p0 = p;
    vec3 pc = p*col;

    for(float i = 0.; i < 1.; i+=.25){
        p = fract(p*1.0833)*.5-.25;
        col += .41667*m(p*32.);
    }

    col *= 1.+.25*spec(col, 1.);
    col += tube(col, 12.);
    
`,
`   
    //Good V
    float nb = .375;
    vec3 p = npos() * nb;  
    vec3 n = vNormal * nb;

    vec3 p0 = p;
    vec3 pc = p*col;

    float r,k;

    for(float i = 0.; i < 20.; i+=5.){
        k += m(p*Z);
        r = m(p*k);
        p = fract(p*k) * (2.0*r) - r;
        col -= m(8.*c(.25*p*i));
    }

    col *= 1.+spec(col, Z);
    col += tube(col, 4.);

    col = hueRotateYIQ(col, radians(132.));
    col = 1. - col;
    
`,
`   
    //Good VI
    vec3 p  = npos(-1.);
    vec3 p0 = p;

    p.x += p.z;

    float ti = time * .125;

    for(float i = 1.; i <= 4.; i+=.33333){
        col += palette(.5*m((p+col+ti)) + .25*o((p-col-ti)));
    }

    col *= tube(col, .08);
    
`,
`   
    //Hearts
    float nb = .375;
    vec3 p = npos() * nb;  
    vec3 n = vNormal * nb;

    vec3 p0 = p;
    vec3 pc = p*col;

    float k = .49;
    float r = 1.0125;
    for(float i = 0.; i < 20.; i+=5.){
        //p = fract(p*1.0612)*.4 - .25;
        p = fract(p*k) * (2.0*r) - r;
        col -= .5*m(p*16.*o(p0*p));
    }

    col *= 1.+spec(col, Z);
    col += tube(col, 4.);

    col = -.5+col;
    
`,
`   
    //Nice colors
    float nb = .375;
    vec3 p = npos() * nb;  
    vec3 n = vNormal * nb;

    vec3 p0 = p;
    vec3 pc = p*col;

    float r,k;

    for(float i = 0.; i < 20.; i+=10.){
        k += m(p*Z);
        r = m(p*k);
        p = fract(p*k) * (2.0*r) - r;
        col -= m(8.*c(.25*p*i), .888888, 0.);
        col += .1*tube(col, .1);
        col *= 1.+.333*spec(col, Z);
    }

    //col *= 1.+spec(col, Z);
    col += .25*tube(col, 1.);
    
`,
`   
    //Nice colors II
    float nb = .375;
    vec3 p = npos() * nb;  
    vec3 n = vNormal * nb;

    vec3 p0 = p;
    vec3 pc = p*col;

    float r,k;

    for(float i = 0.; i < 20.; i+=10.){
        k += m(p*Z);
        r = m(p*k);
        p = fract(p*k) * (2.0*r) - r;
        col -= m(8.*c(.25*p*i), .888888, 0.);
        col += .1*tube(col, .1);
        col *= 1.+.333*spec(col, Z);
    }

    col *= 1.+spec(col, Z);
    col += .25*tube(col, 1.);
    
`,
`   
    //Something
    float nb = .375;
    vec3 p = (opt2 == 0.0 ? npos() : nspos()) * nb;  
    vec3 n = vNormal * nb;

    vec3 p0 = p;
    vec3 pc = p*col;

    float r,k;

    for(float i = 0.; i < 20.; i+=9.){
        k += m(p*Z);
        r = m(p*k);
        p = fract(p*k) * (2.0*r) - r;
        col -= m(8.*c(.25*p*i), .888888, 0.);
        col += .1*tube(col, .1);
        col *= 1.+1.333*spec(col, Z);
    }

    col *= 1.+.125*spec(col, Z);
    col += .25*tube(col, 1.);

    col = hueRotateYIQ(col, radians(127.));


    
`,
`   
    //Something II
    float nb = .375;
    vec3 p = (opt2 == 0.0 ? npos() : nspos()) * nb;  
    vec3 n = vNormal * nb;

    vec3 p0 = p;
    vec3 pc = p*col;

    float r,k;

    for(float i = 0.; i < 20.; i+=19.){
        k += m(p*Z);
        r = m(p*k);
        p = fract(p*k) * (2.0*r) - r;
        col -= m(8.*c(.25*p*i), .888888, 0.);
        col += .1*tube(col, .1);
        col *= 1.+1.333*spec(col, Z);
    }

    col *= 1.+.125*spec(col, Z);
    col += .25*tube(col, 1.);

    col = hueRotateYIQ(col, radians(127.));


    
`,
`   
    //Art I
    float nb = .375;
    vec3 p = npos() * nb;  
    vec3 n = vNormal * nb;

    vec3 p0 = p;
    vec3 pc = p*col;

    float r,k;

    for(float i = 0.; i < 21.; i+=4.){
        k += m(p*Z);
        r = m(p*k);
        p = fract(p*k) * (2.0*r) - r;
        col -= m(p+k*r);
        col *= 1.+.01*spec(col, Z);
    }

    col *= 1.+spec(col, Z);
    //col *= tube(col, .06667);
    //col /= tube(col, .06667);


    col = hueRotateYIQ(col, radians(272.));


    
`,

];