// PZ II — portage ShaderToy du shader « PZ II » de Surface (js/shaders-frags.js).
//
// Présenté sur le plan par défaut de ShaderToy, avec la position non normalisée (case
// opt1 cochée dans l'app) : p part de vPosition, ici la position du fragment sur le plan
// z = 0, et c'est p.z = hcsS(p - t/12.) qui lui donne sa troisième dimension.
// La lampe est allumée : l'éclairage du pied de page commun de l'app est repris tel quel.
//
// À coller dans l'onglet « Image » de ShaderToy.

#define PI 3.14159265358979
#define E  2.71828182845904

// ---- Cadrage ----------------------------------------------------------------------------
// Demi-hauteur de l'écran, en unités de vPosition. 3π/4 est l'étendue de la forme « Plan »
// de l'app (x = .125u, y = .125v, u et v dans [-6π, 6π]) : le plan remplit la hauteur.
#define SCALE (.75*PI)

// ---- Lampe : valeurs par défaut de l'app (glo.shaders.light) ---------------------------
#define LAMP                1           // 0 : couleur brute du shader, lampe éteinte
#define LAMP_POS            vec3(5.)    // lampPosition
#define LAMP_INTENSITY      60.         // lampIntensity
#define LAMP_RADIUS         100.        // lampRadius
#define LAMP_SPEC_POWER     1.75        // lampSpecularPower
#define LAMP_SPEC_INTENSITY 4.          // lampSpecularIntensity
// Caméra face au plan, du côté de la lampe principale comme dans l'app, à la distance de
// vue de la forme « Plan ». Elle n'intervient que dans le spéculaire.
#define CAM_POS             vec3(0., 0., 10.)

// ---- Utilitaires de l'app, réduits aux surcharges qu'utilise PZ II ---------------------

// Puissance qui conserve le signe : sign(x)·|x|^p.
float cpow(float val, float p){ return sign(val) * pow(abs(val), p); }

// Longueur « signée » : racine signée de la somme des carrés signés.
float lengthS(vec3 vect){
    return cpow(cpow(vect.x, 2.) + cpow(vect.y, 2.) + cpow(vect.z, 2.), .5);
}

float hcsS(vec3 p){ return lengthS(cos(p) + sin(p)); }

float ms(vec3 p){
    return (cos(p.x) + sin(p.x)) * (cos(p.y) + sin(p.y)) * (cos(p.z) + sin(p.z));
}

vec3 la(vec3 v){ return log(abs(v)); }

vec3 absp(vec3 vect, float val){ return val + abs(vect); }

// Variante continue de fract(p*f) - .5 : rampe repliée une cellule sur deux, dans [-.5, .5].
vec3 wrapTri(vec3 p, float f){ return 2.*abs(fract(p*f) - .5) - .5; }

// Axe normalisé, avec plancher sur la longueur : sous minLen, divisé par minLen au lieu
// d'être amplifié.
vec3 axisFloor(vec3 axis, float minLen){
    return length(axis) > minLen ? normalize(axis) : axis / max(minLen, 1e-20);
}

// Rotation d'angle a autour de axis (formule de Rodrigues), avec plancher sur l'axe.
mat3 rotAxis(vec3 axis, float a, float minLen){
    axis = axisFloor(axis, minLen);
    float c = cos(a), s = sin(a);
    float k = 1. - c;
    float x = axis.x, y = axis.y, z = axis.z;
    return mat3(
        k*x*x + c,    k*x*y + s*z,  k*x*z - s*y,
        k*x*y - s*z,  k*y*y + c,    k*y*z + s*x,
        k*x*z + s*y,  k*y*z - s*x,  k*z*z + c
    );
}

vec3 wrotTri(vec3 p, float ofs, float nbWraps, float rotAngle, float minLen){
    return p * rotAxis(wrapTri(p + ofs, nbWraps), rotAngle, minLen);
}

vec3 wrot(vec3 p, float ofs, float nbWraps, float rotAngle, float minLen, float sm1, float sm2){
    p = smoothstep(sm1, sm2, p);
    return wrotTri(p, ofs, nbWraps, rotAngle, minLen);
}

vec2 rotL(vec2 p, float a){
    float c = cos(a*15.83);
    float s = sin(a*15.83);
    return p*mat2(s, c, c, -s);
}

// Liquide : nb1 itérations, la pondération étant calculée sur nb2.
vec3 liq(vec3 p, float kt, float nb1, float nb2){
    vec3 pL = vec3(.125, .75, .5) + (p - vec3(.125, .75, .5)) * .03;
    float T = kt;

    vec3 c = clamp(1. - .7 * vec3(
        length(pL - vec3(.1, 0, .5)),
        length(pL - vec3(.9, 0, .5)),
        length(pL - vec3(.5, 1, .5))
        ), 0., 1.) * 2. - 1.;

    vec3 c0 = vec3(0);
    float w0 = 0.;
    for(float i = 0.; i < nb1; i++){
        float wt = (i * i / nb2 / nb2 - .2) * .3;
        float wp = .5 + (i + 1.) * (i + 1.5) * .001;
        float wb = .05 + i / nb2 * .1;

        // Trois directions tournantes, différentes à chaque itération (angle d'or ~137°).
        float a1 = i * 2.399;
        float a2 = i * 1.733 + 1.;
        float a3 = i * 3.111 + 2.;
        vec3 d1 = vec3(cos(a1), sin(a1) * cos(a2), sin(a1) * sin(a2));
        vec3 d2 = vec3(sin(a2) * cos(a3), cos(a2), sin(a2) * sin(a3));
        vec3 d3 = vec3(sin(a3), sin(a1) * sin(a3), cos(a3));

        float g1 = dot(pL, d1) * 23. * wp;
        float g2 = dot(pL, d2) * 15. * wp;
        float g3 = dot(pL, d3) * 17. * wp;

        c.zx = rotL(c.zx, 1.6 + T * .65 * wt + g1);
        c.xy = rotL(c.xy, c.z * c.x * wb + 1.7 + T * wt + g2);
        c.yz = rotL(c.yz, c.x * c.y * wb + 2.4 - T * .79 * wt + g3);
        c.zx = rotL(c.zx, c.y * c.z * wb + 1.6 - T * .65 * wt + g1);
        c.xy = rotL(c.xy, c.z * c.x * wb + 1.7 - T * wt + g2);

        float w = 1.5 - i / nb2;
        c0 += c * w;
        w0 += w;
    }
    c0 = c0 / w0 * 2. + .5;
    c0 *= .5 + dot(c0, vec3(1)) / sqrt(3.) * .5;
    c0 += .25*pow(length(sin(c0 * PI * 4.)) / sqrt(3.), 20.) * (.3 + .7 * c0);

    return c0;
}

// ---- Lampe du pied de page de l'app ------------------------------------------------------
// Blinn-Phong pour le plan z = 0 vu de face : normale (0, 0, 1), position monde = vPosition.

float calcAttenuation(float dist, float radius, float intensity){
    float d = max(dist, .001);
    float att = intensity / (d * d);
    float falloff = 1. - smoothstep(0., radius, dist);
    return att * falloff;
}

vec3 light(vec3 lampPos, vec3 baseColor, vec3 pos){
    vec3 N = vec3(0., 0., 1.);
    vec3 V = normalize(CAM_POS - pos);

    if(dot(N, V) < 0.){ N = -N; }

    lampPos.z *= 3.;

    vec3 toLight = lampPos - pos;
    float dist = length(toLight);
    vec3 L = normalize(toLight);

    float att = calcAttenuation(dist, LAMP_RADIUS, LAMP_INTENSITY*2.);

    float NdotL = max(dot(N, L), 0.);
    vec3 diffuse = baseColor * NdotL * att;

    vec3 halfDir = normalize(L + V);
    float NdotH = max(dot(N, halfDir), 0.);
    float spec = pow(NdotH, LAMP_SPEC_POWER) * LAMP_SPEC_INTENSITY;
    vec3 specular = baseColor * spec * att;

    return vec3(.05) + diffuse + specular;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    float t = iTime;

    // Plan par défaut : origine au centre de l'écran, y dans [-SCALE, SCALE].
    vec2 uv = (2.*fragCoord - iResolution.xy) / iResolution.y;
    vec3 vPosition = vec3(uv * SCALE, 0.);

    //PZ II
    float n  = 1.125;
    float nb = n*.5;                    // branche opt1 == 1 : position non normalisée
    vec3 p0  = vPosition * nb;
    vec3 p   = abs(p0);

    p.z = hcsS(p - t/12.);

    vec3 p1 = wrot(p, -t/128., 2., PI, 1., -3., 3.);
    vec3 p2 = wrot(p, -t/128., 4., PI, 1., 2., 8.);

    float val = ms(p1*48. + t/3.);
    vec3 vval = vec3(val);

    vec3 col = vval;

    col -= liq(p1, 1., 1., 2.) / 4.;
    col -= liq(p2, 1., 1., 2.) / 4.;

    col += la(col) / 8.;

    col -= E*col/absp(6.*vval, .5);

#if LAMP
    col *= light(LAMP_POS, col, vPosition) + light(-LAMP_POS, col, vPosition);
    col = col / (col + 1.);
    col = pow(col, vec3(1./2.2));
#endif

    fragColor = vec4(col, 1.);
}
