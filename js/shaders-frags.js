fragmentShaders = [
`
   //Line
    float coeffLine = C/3.0;

	// Grille
	float gu = fract(vUV.x * A);
	float gv = fract(vUV.y * B * 0.5);
	float line = step(1.0 - (lineWidth*coeffLine) / A, gu) + step(1.0 - (lineWidth*coeffLine*2.0) / B, gv);
	col = mix(col, meshFg, min(line, 1.0));  
`,
`
    //Norm&Pos
    float coeff = 1.0+Ts(0.25);
    float lnpos = coeff*length(vNormal*(npos()));
    
    vec3 col1 = fract(coeff*palette(lnpos));
    vec3 col2 = fract(3.0*rainbow(lnpos));
    vec3 col3 = 1.0 - mix(col1, col2, dot(col1,col2));
    vec3 col4 = 1.0 - mix(col1, col2, cross(col1,col2));

    //col = mix(col3, col4, Ts(0.0666*dot(col3+npos(),col4-npos())));

    if(opt1 == 1.0) col = mix(col3, col4, Ts(1.0));
    else col = mix(col3, col4, Ts(0.0666*dot(col3+npos(),col4-npos())));
`,
`
    //CosPos
    vec3 pos = npos();

    float c     = A / 2.0;
    float val   = opt1 == 1.0 ? m(o(pos, c), m(pos, c), hc(pos, c)) : o(o(pos, c), m(pos, c), hc(pos, c));
    vec3 valCol = cpalette(val, palette(val));

    col = vec3(val > 0.0 ? valCol : 1.0-valCol);

`,
`
    //Simple
    col = vec3(0.125, 0.75, 0.85);
`,
`
    //Position
    col = palette(length(vPosition));
`,
`
    //Normal
    col = vNormal;

    
`,
`   
    //RotTile
    col  = vec3(0.0); 
    vec3 col1 = col;
    vec3 col2 = col;

    vec3 pattern = rotateTilePattern(vUV, 8.0);
    vec2 st = pattern.xy;
    
    col = vec3(step(st.x,st.y));
`,
`   
    //Hexagone
    vec2 hexUV = vec2(vUV.x, vUV.y*0.5) * 24.0;
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
    //Truchet
    vec2 scale  = vec2(48.0, 24.0);
    vec2 cell   = floor(vUV * scale);
    vec2 uv     = fract(vUV*scale)-0.5;
    float d     = length(uv);
    float index = hash21(cell);

    float rad = 0.5;
    float thickness = 0.14;

    col   = vec3(truchet(uv, index, rad, thickness));
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
    vec2 scale = vec2(64., 32.);
    st *= scale;

    vec2 i_st = floor(st);
    vec2 f_st = fract(st);

    float m_dist = 1.0 - voronoi(i_st, f_st, scale);

    float minBrightness = 0.333;
    m_dist = minBrightness + (1.0 - minBrightness) * m_dist;

    col = vec3(m_dist, m_dist*0.35, m_dist*0.07);


`
];



fragmentShaderHeader = `#version 300 es  
precision highp float;

// Varyings reçus du vertex shader
in vec3 vPosition;
in vec3 vWorldPosition;
in vec3 vNormal;
in vec2 vUV;
in vec2 vUVParams;

// Sortie du fragment shader
out vec4 fragColor;

// Uniforms personnalisés
uniform float time;
uniform vec3 cameraPosition;
uniform vec3 minpoint;
uniform vec3 maxpoint;
uniform vec3 msize;
uniform vec2 iResolution;
uniform float gridU;
uniform float gridV;
uniform float A;
uniform float B;
uniform float C;
uniform float D;
uniform float lineWidth;
uniform float invcol;
uniform float islight;
uniform float opt1;
uniform float opt2;
uniform float opt3;
uniform float minU;
uniform float minV;
uniform float stepsU;
uniform float stepsV;
uniform vec2 steps;
uniform vec3 meshBg;
uniform vec3 meshFg;
uniform vec3 lampPosition;
uniform float lampIntensity;
uniform float lampRadius;
uniform float lampSpecularPower;
uniform float lampSpecularIntensity;

vec3 npos(){ return ((vPosition-minpoint)/(maxpoint-minpoint)) - 0.5; }

float Ts(float c){ return 0.4999999*sin(c*time)+0.5; }
float Tc(float c){ return 0.4999999*cos(c*time)+0.5; }

// Couleurs
const vec3 LAMP_COLOR = vec3(0.5, 0.5, 0.5);      // Blanc chaud
const vec3 AMBIENT_COLOR = vec3(0.05, 0.05, 0.08); // Ambient bleuté froid
const vec3 BASE_COLOR = vec3(0.5, 0.5, 0.5);      // Couleur de base du matériau

// Paramètres d'éclairage
const float LAMP_RADIUS = 100.0;        // Distance max d'influence
const float SPECULAR_POWER = 32.0;     // Dureté du spéculaire
const float SPECULAR_INTENSITY = 0.5;

// Atténuation réaliste (loi inverse du carré avec falloff doux)
float calcAttenuation(float dist, float radius, float intensity) {
    float d = max(dist, 0.001);
    // Atténuation physique + falloff doux aux bords
    float att = intensity / (d * d);
    float falloff = 1.0 - smoothstep(0.0, radius, dist);
    return att * falloff;
}

// Calcul Blinn-Phong
vec3 blinnPhong(vec3 normal, vec3 viewDir, vec3 lightDir, vec3 lightColor, float attenuation) {
    // Diffuse (Lambert)
    float NdotL = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = BASE_COLOR * lightColor * NdotL * attenuation;
    
    // Specular (Blinn-Phong)
    vec3 halfDir = normalize(lightDir + viewDir);
    float NdotH = max(dot(normal, halfDir), 0.0);
    float spec = pow(NdotH, SPECULAR_POWER) * SPECULAR_INTENSITY;
    vec3 specular = lightColor * spec * attenuation;
    
    return diffuse + specular;
}

// Optionnel : effet de scintillement subtil (lampe qui "vit")
float flicker(float t) {
    return 1.0 + 0.02 * sin(t * 15.0) * sin(t * 23.0 + 1.5);
}

vec3 lightOld(vec3 lampPos, vec3 albedo) {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorldPosition);
    
    if (dot(N, V) < 0.0) {
        N = -N;
    }
    
    vec3 toLight = lampPos - vWorldPosition;
    float dist = length(toLight);
    vec3 L = normalize(toLight);
    
    float att = calcAttenuation(dist, lampRadius, lampIntensity * 200.0);
    float NdotL = max(dot(N, L), 0.0);
    
    // Éclairage qui ajoute du relief sans assombrir
    float shade = 0.5 + 0.5 * NdotL * att;
    
    vec3 halfDir = normalize(L + V);
    float NdotH = max(dot(N, halfDir), 0.0);
    float spec = pow(NdotH, lampSpecularPower) * lampSpecularIntensity * att;
    
    return albedo * shade + vec3(spec * 0.2);
}

vec3 light(vec3 lampPos, vec3 baseColor) {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorldPosition);
    
    // === FIX : Flip la normale si elle pointe à l'opposé de la caméra ===
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
    //float spec = pow(NdotH, lampSpecularPower) * lampSpecularIntensity;
    float spec = pow(NdotH, 2.0) * 4.0;
    vec3 specular = baseColor * spec * att;
    
    vec3 ambient = vec3(0.05);
    
    return ambient + diffuse + specular;
}

float cpow(float val, float p) {
    return sign(val) * pow(abs(val), p);
}

// Version vec2 avec exposants vec2
vec2 cpow(vec2 val, vec2 p) {
    return sign(val) * pow(abs(val), p);
}

// Version vec2 avec exposant scalaire (bonus)
vec2 cpow(vec2 val, float p) {
    return sign(val) * pow(abs(val), vec2(p));
}

// Version vec3 avec exposants vec3
vec3 cpow(vec3 val, vec3 p) {
    return sign(val) * pow(abs(val), p);
}

// Version vec3 avec exposant scalaire (bonus)
vec3 cpow(vec3 val, float p) {
    return sign(val) * pow(abs(val), vec3(p));
}

// Version vec4 avec exposants vec4
vec4 cpow(vec4 val, vec4 p) {
    return sign(val) * pow(abs(val), p);
}

// Version vec4 avec exposant scalaire (bonus)
vec4 cpow(vec4 val, float p) {
    return sign(val) * pow(abs(val), vec4(p));
}

vec3 rainbow(float t) {
    float r = abs(sin(t * 6.28 + 0.0));
    float g = abs(sin(t * 6.28 + 2.09));
    float b = abs(sin(t * 6.28 + 4.19));
    return vec3(r, g, b);
}

vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);  // Offset
    vec3 b = vec3(0.5, 0.5, 0.5);  // Amplitude
    vec3 c = vec3(1.0, 1.0, 1.0);  // Fréquence
    vec3 d = vec3(0.263, 0.416, 0.557); // Phase
    
    return a + b * cos(6.28318 * (c * t + d));
}

vec3 heatmap(float t) {
    // Bleu → Cyan → Vert → Jaune → Rouge
    vec3 cold = vec3(0.0, 0.0, 1.0);
    vec3 hot = vec3(1.0, 0.0, 0.0);
    return mix(cold, hot, t);
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec2 rotate2D (vec2 _st, float _angle) {
    _st -= 0.5;
    _st =  mat2(cos(_angle),-sin(_angle),
                sin(_angle),cos(_angle)) * _st;
    _st += 0.5;
    return _st;
}

mat2 rot(float _angle){
    return mat2(cos(_angle),-sin(_angle),
                sin(_angle),cos(_angle));
}

vec3 rotateTilePattern(vec2 _st, float coeff){
    float PI = 3.14159265359;

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
vec3 a = vec3(0.5, 0.5, 0.5);  // Offset
vec3 b = vec3(0.5, 0.5, 0.5);  // Amplitude
vec3 c = vec3(1.0, 1.0, 1.0);  // Fréquence

return a + b * cos(6.28318 * (c * t + phase));
}

vec2 random2( vec2 p ) {
    return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
}

float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
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
    
    // Mouvement fluide
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
    
    // Reflets
    color += vec3(pow(n, 4.0) * 2.0);
    
    return color;
}

float sdHexagon(vec2 p, float r) {
    const vec3 k = vec3(-0.866025404, 0.5, 0.577350269); // cos(60°), sin(60°), tan(30°)
    p = abs(p);
    p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
    p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
    return length(p) * sign(p.y);
}

float sdCircle(vec2 p, vec2 center, float r) {
    return length(p-center) - r;
}

vec3 checkerboard(float x, float y, vec3 bg, vec3 fg, float coeff, float offsetX, float offsetY){
    // Calcul de la position dans la grille
    float gridX = floor(mod(coeff * x + offsetX, 0.0));
    float gridY = floor(mod(coeff * y + offsetY, 0.0));
    
    // Pattern de damier : (x + y) % 2 pour alterner
    float pattern = mod(gridX + gridY, 2.0);
    
    // Mix entre bg et fg selon le pattern
    return mix(bg, fg, pattern);
}

float voronoi(vec2 i_st, vec2 f_st, vec2 scale){
    float m_dist = 1.;

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            
            // Position du voisin dans la grille
            vec2 neighborCell = i_st + neighbor;
            
            // WRAPPING sur U (axe X) - périodicité sur 16 cellules
            vec2 wrappedCell = vec2(
                mod(neighborCell.x, scale.x),
                mod(neighborCell.y, scale.y)
            );
            
            // Random basé sur la cellule wrappée
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
float m(float x, float y, float z){
    return cos(x) * cos(y) * cos(z);
}    
float m(float x, float y, float z, float coeff){
    return cos(coeff*x) * cos(coeff*y) * cos(coeff*z);
}

float o(vec3 p){
    return cos(p.x) + cos(p.y) + cos(p.z);
}
float o(vec3 p, float coeff){
    return cos(coeff*p.x) + cos(coeff*p.y) + cos(coeff*p.z);
}
float o(float x, float y, float z){
    return cos(x) + cos(y) + cos(z);
}
float o(float x, float y, float z, float coeff){
    return cos(coeff*x) + cos(coeff*y) + cos(coeff*z);
}

float hc(vec3 p){
    return length(vec3(cos(p.x), cos(p.y), cos(p.z)));
}
float hc(vec3 p, float coeff){
    return length(vec3(cos(coeff*p.x), cos(coeff*p.y), cos(coeff*p.z)));
}
float hc(float x, float y, float z){
    return length(vec3(cos(x), cos(y), cos(z)));
}
float hc(float x, float y, float z, float coeff){
    return length(vec3(cos(coeff*x), cos(coeff*y), cos(coeff*z)));
}


void main(){
    vec3 col = meshBg;
`;

fragmentShaderFooter = `
    // Inversion des couleurs si bouton INV actif
	col = mix(col, vec3(1.0)-col, invcol);

	// Éclairage si bouton avec une lampe actif
	if(islight == 1.0){
		vec3 lamp1 = light(lampPosition, col);
		col*= lamp1;
		col = col / (col + vec3(1.0));
		col = pow(col, vec3(1.0 / 2.2));
	}

	fragColor = vec4(col, 1.0);
}
`;

glo.numShaderMove = glo.numShaderMove();

fragmentShader = fragmentShaderHeader + fragmentShaders[glo.numShaderSelect] + fragmentShaderFooter;

function validateShader(shaderCode) {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

    if (!gl) {
        return { valid: false, error: 'WebGL non supporté' };
    }

    const shader = gl.createShader(gl.FRAGMENT_SHADER);
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
