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
    //Work 0
    float nb = .5;
    vec3 p = npos() * nb;  
    vec3 n = vNormal * nb;

    vec3 p0 = p;
    vec3 pc = p*col;

    float r,k;

    for(float i = 0.; i < 20.; i+=10.){
        k += m(p*Z);
        r = m(p*k);
        p = fract(p*k) * (2.0*r) - r;
        col -= m(8.*c(.25*p*i), .888888, .5*PI*Ts(.0625));
        col *= 1.+.5*tube(col, E*Ts(.125));
        col *= 1.+.333333*spec(col, Z);
    }

    col *= 1.+spec(col, Z);
    col += .25*tube(col, 1.);

    col = hueRotateYIQ(col, PI/4.);
`,
`   
    //Work I
    vec3 p  = npos(-1.);
    vec3 p0 = p;

    p.x *= -.777+p.z;

    float ti = time * .125;

    for(float i = 1.; i <= 4.; i+=.33333){
        col += palette(i*i+.5*m((p+col+ti)) + .25*o((p-col-ti)));
    }

    col *= Z*tube(col, .08);
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
    //Work IV
    float nb = .5-.0325*Ts(.125);
    vec3 p = npos() * nb;  
    vec3 n = vNormal * nb;

    vec3 p0 = p;
    vec3 pc = p*col;

    float r,k;

    float ti = time * .005;

    p0.z += cpow(1.+p.x, 1.+p.y);

    for(float i = 1.; i < 16.; i+=8.){
        p = p0+E;
        p += cos(p*5.14159);
        col *= 1.+7.*p/12.;

        col *= rainbow(m(col+ti)*o(col-ti));
        col *= 1.-heatmap(m(col*W-ti));
    }

    col = col - .25;

    col *= 1.-2.*tube(col, 1.);

    col *= 1.+.00625*edge(col, 8.);

    col = hueRotateYIQ(col, PI/1.);

    col = hueRotateYIQ(col, radians(312.));
    
`,
`   
    //Good I
    float nb = .375;
    vec3 p = npos(-1.) * nb;  
    vec3 n = vNormal * nb;

    vec3 p0 = p;
    vec3 pc = p*col;

    float r,k;

    for(float i = 0.; i < 20.; i+=10.){
        k += m(p*Z);
        r = m(p*k*n);
        p = fract(p*k) * (2.0*r) - r;
        col -= ml(PI*c(.5*p*i), 1., 0.);
    }

    col += tube(col, 1.);
    col += spec(col, 1.);
    col *= 1.-tube(col, 1.);
    
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
    //Disco
    float nb = .5;
    vec3 p = npos() * nb;  
    vec3 n = vNormal * nb;

    vec3 p0 = p;
    vec3 pc = p*col;

    float r,k;

    for(float i = 0.; i < 20.; i+=10.){
        k += m(p*Z);
        r = m(p*k);
        p = fract(p*k) * (2.0*r) - r;
        col -= m(8.*c(.25*p*i), .888888, .5*PI*Ts(.0625));
        col *= 1.+.5*tube(col, E*Ts(.125));
        col *= 1.+.333333*spec(col, Z);
    }

    col *= 1.+spec(col, Z);
    col += .25*tube(col, 1.);

    col = hueRotateYIQ(col, PI/4.);
    
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
`   
    //Jupiter
    float nb = .5-.0325*Ts(.125);
    vec3 p = npos() * nb;  
    vec3 n = vNormal * nb;

    vec3 p0 = p;
    vec3 pc = p*col;

    float r,k;

    float ti = time * .005;

    p0.z += cpow(1.+p.x, 1.+p.y);

    for(float i = 1.; i < 16.; i+=8.){
        p = p0+E;
        p += cos(p*5.14159);
        col *= 1.+7.*p/12.;

        col *= rainbow(m(col+ti)*o(col-ti));
        col *= 1.-heatmap(m(col*W-ti));
    }

    col = col - .25;

    col *= 1.-2.*tube(col, 1.);

    col *= 1.+.00625*edge(col, 8.);

    col = hueRotateYIQ(col, PI/1.);

    col = hueRotateYIQ(col, radians(312.));


    
`,
`   
    //Triketra
    vec3 p = 1. + abs(npos()*12.);

    float pm = acosh(p.x) * acosh(p.y) * acosh(p.z);

    for(float i = 0.; i < 4.; i+=1.){
        p*=1.5;
        col *= ml(.25*pm-E*col);
        col -= cos(col*2.);
    }
    col *= .1875+cos(col*8.);

    col += hdr(col, .0);
    

    col += .125-tube(col*p, PI/4.);
    
    
    
    col = 1. -col;


    
`,
`   
    //Triketra W
    vec3 p = 1. + abs(npos()*12.);

    float pm = acosh(p.x) * acosh(p.y) * acosh(p.z);

    for(float i = 0.; i < 4.; i+=1.){
        p*=1.5;
        col *= ml(.25*pm-E*col);
        col -= cos(col*2.);
    }
    col *= .1875+cos(col*8.);

    col += hdr(col, .0);
    

    col += .125-tube(col*p, PI/4.);
    
    
    
    col = 1. -col;


    
`,
`   
    //Triketra W II
    vec3 p = 1. + .8888*abs(npos()*(14.+2.*Ts(.25)));

    float pm = acosh(p.x) * acosh(p.y) * acosh(p.z);

    for(float i = 0.; i < 4.; i+=1.5){
        p *= 1.125;
        col *= ml(.25*pm-E*col, 1., W);
        col -= 1.;
    }
    col *= .1875+cos(col*8.);

    col += hdr(col, .0);
    

    col += .125-c(8.*tube(p*col*c(1./p)+time*.125, W));

    col *= .6667+cpalette(24.*m(col*.125), p/24.);


    
`,
`   
    //Jupiter
    ffloat n = 1.;
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

];