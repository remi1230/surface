fragmentShaders = [
`
   //Line
    float coeffLine = S/3.0;

	// Grille
	float gu = fract(vUV.x * P);
	float gv = fract(vUV.y * Q * 0.5);

	float edgeU = 1.0 - (lineWidth * coeffLine) / P;
    float edgeV = 1.0 - (lineWidth * coeffLine * 2.0) / Q;
    float fw = fwidth(vUV.x * P); // largeur d'un pixel en espace UV
    float fh = fwidth(vUV.y * Q * 0.5);
    float lineU = smoothstep(edgeU - fw, edgeU + fw, gu);
    float lineV = smoothstep(edgeV - fh, edgeV + fh, gv);
    float line = min(lineU + lineV, 1.0);

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

    float c     = P / 2.0;
    float val   = opt1 == 1.0 ? m(o(pos, c), o(pos, c), hc(pos, c)) : o(o(pos, c), m(pos, c), hc(pos, c));
    vec3 valCol = cpalette(val, palette(val));

    col = vec3(val > 0.0 ? valCol : 1.0-valCol);

`,
`
    //Simple
    col = vec3(0.125, 0.75, 0.85);
`,
`
    //Lego
    float nb = P/4.0;
    vec3 pos = Q*floor(vPosition * nb)/(16.0*32.0);

    pos = vec3(m(pos), o(pos), hc(pos));

    vec3 col1 = rainbop(pos.x, pos);
    vec3 col2 = rainbop(pos.y, pos);
    vec3 col3 = rainbop(pos.z, pos);

    col = mix(col1, col2, Ts(2.0)*col3);
`,
`
    //Position
    col = 1.0-rainbow(length(vPosition));
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



/**
 * Source unique des fonctions utilitaires GLSL partagées
 * entre GPUShaderMesh.js (createFragmentShader) et fragmentShaderHeader (éditeur Monaco).
 */
function getFragmentUtilsGLSL() {
return `
vec3 npos(){ return normalize(vPosition); }

float Ts(float c){ return 0.4999999*sin(c*time)+0.5; }
float Tc(float c){ return 0.4999999*cos(c*time)+0.5; }

// Couleurs
const vec3 LAMP_COLOR = vec3(0.5, 0.5, 0.5);
const vec3 AMBIENT_COLOR = vec3(0.05, 0.05, 0.08);
const vec3 BASE_COLOR = vec3(0.5, 0.5, 0.5);

// Paramètres d'éclairage
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
uniform float gridU;
uniform float gridV;
uniform float P;
uniform float Q;
uniform float S;
uniform float T;
uniform float lineWidth;
uniform float invcol;
uniform float islight;
uniform float opt1;
uniform float opt2;
uniform float opt3;
uniform vec3 meshBg;
uniform vec3 meshFg;
uniform vec3 lampPosition;
uniform float lampIntensity;
uniform float lampRadius;
uniform float lampSpecularIntensity;
uniform float lampSpecularPower;

${getFragmentUtilsGLSL()}

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

// ==================== NORMAL DEFORMATION SHADERS ====================
// Le code éditable est injecté dans computeDeformation() et doit affecter float result.
// result est ensuite appliqué comme : finalPosition = pos + normal * result * scaleNorm

normalShaders = [
`
	// Default - déformation le long de la normale
	// Variables : x, y, z, xN, yN, zN, u, v, R, O, i, j, n, k, d, p, t, g
	// Fonctions : m(), o(p), b(p,q), a(p,q), sin, cos, length...
	result = 0.0;
`
];

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
	float t = d < 0.0 ? -v : v;

	float g = xN * yN * zN;

	float result = 0.0;
`;

normalShaderFooter = `
	return result;
}`;

normalShader = normalShaderHeader + normalShaders[glo.numNormalShaderSelect] + normalShaderFooter;

/**
 * Valide un shader GLSL (vertex ou fragment)
 * @param {string} shaderCode - Code source GLSL
 * @param {string} type - 'vertex' ou 'fragment' (défaut: 'fragment')
 * @returns {{valid: boolean, error: string|null}}
 */
function validateShader(shaderCode, type = 'fragment') {
    const gl = glo.gl;

    if (!gl) {
        return { valid: false, error: 'WebGL non supporté' };
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