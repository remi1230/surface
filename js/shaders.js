const vertexShader = `
    precision highp float;
    
    // Attributes
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;
    attribute vec2 uv_params;
    attribute vec2 curvatures;
    
    // Uniforms
    uniform mat4 worldViewProjection;
    uniform mat4 world;
    
    // Varyings (transmis au fragment shader)
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec2 vUV;
    varying vec2 vUVParams;
    varying vec2 vCurvatures;
    
    void main() {
        gl_Position = worldViewProjection * vec4(position, 1.0);
        vWorldPosition = (world * vec4(position, 1.0)).xyz;
        vPosition = position;
        vNormal = normalize((world * vec4(normal, 0.0)).xyz);
        vUV = uv;
        vCurvatures = curvatures;
        vUVParams = uv_params;
    }
`;

const lamp = `
        col*=light(vec3(lampPosition.x*20.0, lampPosition.y*20.0, lampPosition.z*30.0));
        col = col / (col + vec3(1.0));
        col = pow(col, vec3(1.0 / 2.2));
`;

fragmentShaderHeader = `#version 300 es  
precision highp float;

// Varyings reçus du vertex shader
in vec3 vPosition;
in vec3 vWorldPosition;
in vec3 vNormal;
in vec2 vUV;
in vec2 vCurvatures;
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
uniform float lineWidth;
uniform int invcol;
uniform int islight;
uniform vec3 lampPosition;
uniform float lampIntensity;
uniform float lampRadius;
uniform float lampSpecularPower;
uniform float lampSpecularIntensity;

vec3 npos(){ return ((vPosition-minpoint)/(maxpoint-minpoint)) - 0.5; }

float Ts(float c){ return 0.4999999*sin(c*time)+0.5; }
float Tc(float c){ return 0.4999999*cos(c*time)+0.5; }

// Couleurs
const vec3 LAMP_COLOR = vec3(1.0, 0.9, 0.7);      // Blanc chaud
const vec3 AMBIENT_COLOR = vec3(0.05, 0.05, 0.08); // Ambient bleuté froid
const vec3 BASE_COLOR = vec3(0.8, 0.75, 0.7);      // Couleur de base du matériau

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

vec3 light(vec3 lampPos) {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorldPosition);
    
    // === FIX : Flip la normale si elle pointe à l'opposé de la caméra ===
    if (dot(N, V) < 0.0) {
        N = -N;
    }
    
    vec3 toLight = lampPos - vWorldPosition;
    float dist = length(toLight);
    vec3 L = normalize(toLight);
    
    float att = calcAttenuation(dist, lampRadius, lampIntensity*200.0);
    
    float NdotL = max(dot(N, L), 0.0);
    vec3 diffuse = LAMP_COLOR * NdotL * att;
    
    vec3 halfDir = normalize(L + V);
    float NdotH = max(dot(N, halfDir), 0.0);
    float spec = pow(NdotH, lampSpecularPower) * lampSpecularIntensity;
    vec3 specular = LAMP_COLOR * spec * att;
    
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


void main(){`;



fragmentShaderFooter = `
    if(invcol == 1){ col = vec3(1.0)-col; }

    if(islight == 1){ ` + lamp + `    }
    
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

// Regex pour transformer les expressions mathématiques en GLSL
const glslRegs = [
    // Puissance signée avec *** -> cpow()
    { exp: /\(\s*([^()]+?)\s*\)\s*\*\*\*\s*\(\s*([^()]+?)\s*\)/g, upd: 'cpow($1,$2)' },
    { exp: /\(\s*([^()]+?)\s*\)\s*\*\*\*\s*([A-Za-z_$][\w$]*|\d+(?:\.\d+)?)/g, upd: 'cpow($1,$2)' },
    { exp: /([A-Za-z_$][\w$]*\(\s*[^()]+?\s*\))\s*\*\*\*\s*([A-Za-z_$][\w$]*|\d+(?:\.\d+)?|\(\s*[^()]+?\s*\))/g, upd: 'cpow($1,$2)' },
    { exp: /([A-Za-z_$][\w$]*)\s*\*\*\*\s*\(\s*([^()]+?)\s*\)/g, upd: 'cpow($1,$2)' },
    { exp: /([A-Za-z_$][\w$]*)\s*\*\*\*\s*([A-Za-z_$][\w$]*|\d+(?:\.\d+)?)/g, upd: 'cpow($1,$2)' },

    // Puissance standard ** -> pow()
    { exp: /\(\s*([^()]+?)\s*\)\s*\*\*\s*\(\s*([^()]+?)\s*\)/g, upd: 'pow($1,$2)' },
    { exp: /\(\s*([^()]+?)\s*\)\s*\*\*\s*([A-Za-z_$][\w$]*|\d+(?:\.\d+)?)/g, upd: 'pow($1,$2)' },
    { exp: /([A-Za-z_$][\w$]*)\s*\*\*\s*\(\s*([^()]+?)\s*\)/g, upd: 'pow($1,$2)' },
    { exp: /([A-Za-z_$][\w$]*)\s*\*\*\s*([A-Za-z_$][\w$]*|\d+(?:\.\d+)?)/g, upd: 'pow($1,$2)' },

    // Supprimer les espaces
    { exp: /\s/g, upd: "" },

    // Raccourcis trigonométriques pour R = h(x,y,z)
    { exp: /c([^*\(R\)]*)R/g, upd: "cos($1R)" },
    { exp: /s([^*\(R\)]*)R/g, upd: "sin($1R)" },
    { exp: /R/g, upd: "length(vec3(x,y,z))" },

    // Raccourcis pour q = h(u,v)
    { exp: /q(?![\(])/g, upd: "length(vec2(u,v))" },
    { exp: /s([^q\(]*)q/g, upd: "sin($1length(vec2(u,v)))" },
    { exp: /c([^q\(]*)q/g, upd: "cos($1length(vec2(u,v)))" },

    // Raccourcis trigonométriques combinés u/v
    { exp: /cudv|cvdu/g, upd: "cos(u/v)" },
    { exp: /cufv|cvfu/g, upd: "cos(u*v)" },
    { exp: /sudv|svdu/g, upd: "sin(u/v)" },
    { exp: /sufv|svfu/g, upd: "sin(u*v)" },
    { exp: /cupv|cvpu/g, upd: "cos(u+v)" },
    { exp: /cumv/g, upd: "cos(u-v)" },
    { exp: /cvmu/g, upd: "cos(v-u)" },
    { exp: /supv|svpu/g, upd: "sin(u+v)" },
    { exp: /sumv/g, upd: "sin(u-v)" },
    { exp: /svmu/g, upd: "sin(v-u)" },

    // Raccourcis trigonométriques simples
    { exp: /c([^u\(vw]*)u/g, upd: "cos($1u)" },
    { exp: /c([^v\(uw]*)v/g, upd: "cos($1v)" },
    { exp: /s([^u\(vw]*)u/g, upd: "sin($1u)" },
    { exp: /s([^v\(uw]*)v/g, upd: "sin($1v)" },
    { exp: /c([^*\(v]*)O/g, upd: "cos($1O)" },
    { exp: /s([^*\(v]*)O/g, upd: "sin($1O)" },
    { exp: /c([^x\(]*)x/g, upd: "cos($1x)" },
    { exp: /c([^y\(]*)y/g, upd: "cos($1y)" },
    { exp: /c([^z\(]*)z/g, upd: "cos($1z)" },
    { exp: /s([^x\(]*)x/g, upd: "sin($1x)" },
    { exp: /s([^y\(]*)y/g, upd: "sin($1y)" },
    { exp: /s([^z\(]*)z/g, upd: "sin($1z)" },

    // Puissances Unicode
    { exp: /²/g, upd: "*$0*$0" }, // sera remplacé après
    { exp: /³/g, upd: "*$0*$0*$0" },

    // Multiplications implicites
    { exp: /u([^,%*+\-\/\)])/g, upd: "u*$1" },
    { exp: /v([^,%*+\-\/\)])/g, upd: "v*$1" },
    { exp: /x([^,%*+\-\/NPT\)])/g, upd: "x*$1" },
    { exp: /y([^,%*+\-\/NPT\)])/g, upd: "y*$1" },
    { exp: /z([^,%*+\-\/NPT\)])/g, upd: "z*$1" },
    { exp: /xN([^,%*+\-\/\)])/g, upd: "xN*$1" },
    { exp: /yN([^,%*+\-\/\)])/g, upd: "yN*$1" },
    { exp: /zN([^,%*+\-\/\)])/g, upd: "zN*$1" },

    // Variables spéciales ($ n'est pas valide en GLSL)
    { exp: /\$N/g, upd: "avgN" },
    { exp: /\$T/g, upd: "avgT" },
    { exp: /\$P/g, upd: "avgP" },

    // Constantes
    { exp: /\bpi\b/g, upd: "3.14159265359" },
    { exp: /\bep\b/g, upd: "0.0001" },
];

// Transforme une expression mathématique JavaScript en GLSL
function regForGLSL(expr) {
    if (!expr || expr === "'") return "0.0";

    let result = expr.toString();

    for (let i = 0; i < glslRegs.length; i++) {
        result = result.replace(glslRegs[i].exp, glslRegs[i].upd);
    }

    // Post-traitement pour ² et ³
    result = result.replace(/(\w+)\*\$0\*\$0\*\$0/g, '($1*$1*$1)');
    result = result.replace(/(\w+)\*\$0\*\$0/g, '($1*$1)');

    // Assurer que les nombres ont un point décimal pour GLSL
    result = result.replace(/\b(\d+)(?!\.)\b/g, '$1.0');
    // Éviter les doubles points (ex: 3.0.0)
    result = result.replace(/\.0\.0/g, '.0');

    return result;
}

// Vertex shader pour la déformation par normale
const deformationVertexShader = `
    precision highp float;

    // Attributes
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;
    attribute vec2 uv_params;

    // Uniforms
    uniform mat4 worldViewProjection;
    uniform mat4 world;
    uniform float scaleNorm;
    uniform float time;
    uniform float stepU;
    uniform float stepV;
    uniform float minU;
    uniform float minV;
    uniform int stepsU;
    uniform int stepsV;

    // Varyings
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec2 vUV;
    varying vec2 vUVParams;

    // Fonctions mathématiques GLSL
    float cpow(float val, float p) {
        return sign(val) * pow(abs(val), p);
    }

    // DEFORMATION_EXPRESSION sera remplacé dynamiquement
    float computeDeformation(float u, float v, float x, float y, float z,
                             float xN, float yN, float zN, float O, float T,
                             float d, float k, float p, float t, float n, float i, float j) {
        float avgN = (xN + yN + zN) / 3.0;
        return DEFORMATION_EXPRESSION;
    }

    void main() {
        // Calculer u et v à partir des UV params ou de l'indice du vertex
        float u = uv_params.x;
        float v = uv_params.y;

        // Position et normale
        float x = position.x;
        float y = position.y;
        float z = position.z;

        vec3 norm = normalize(normal);
        float xN = norm.x;
        float yN = norm.y;
        float zN = norm.z;

        // Angles sphériques
        float R = length(position);
        float O = R > 0.0001 ? asin(y / R) : 0.0;
        float T = atan(z, x);

        // Variables d'index (approximation basée sur UV)
        float i = floor(uv.x * float(stepsU));
        float j = floor(uv.y * float(stepsV));
        float n = i * float(stepsV) + j;

        // Variables de signe alterné
        float k = mod(i, 2.0) < 1.0 ? -1.0 : 1.0;
        float d = mod(j, 2.0) < 1.0 ? -1.0 : 1.0;
        float p = k < 0.0 ? -u : u;
        float t = d < 0.0 ? -v : v;

        // Calculer la déformation
        float r = computeDeformation(u, v, x, y, z, xN, yN, zN, O, T, d, k, p, t, n, i, j) * scaleNorm;

        // Appliquer la déformation le long de la normale
        vec3 deformedPosition = position + norm * r;

        gl_Position = worldViewProjection * vec4(deformedPosition, 1.0);
        vWorldPosition = (world * vec4(deformedPosition, 1.0)).xyz;
        vPosition = deformedPosition;
        vNormal = normalize((world * vec4(normal, 0.0)).xyz);
        vUV = uv;
        vUVParams = uv_params;
    }
`;

// Fragment shader simple pour la déformation (peut être combiné avec les shaders existants)
const deformationFragmentShader = `
    precision highp float;

    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec2 vUV;

    uniform vec3 cameraPosition;
    uniform vec3 emissiveColor;
    uniform vec3 diffuseColor;

    void main() {
        vec3 N = normalize(vNormal);
        vec3 V = normalize(cameraPosition - vWorldPosition);

        // Flip normale si nécessaire
        if (dot(N, V) < 0.0) {
            N = -N;
        }

        // Éclairage simple
        vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
        float diff = max(dot(N, lightDir), 0.0);

        vec3 color = emissiveColor + diffuseColor * diff;

        gl_FragColor = vec4(color, 1.0);
    }
`;

// Applique une déformation via shader au mesh
async function applyDeformationShader(mesh = glo.ribbon, deformExpression = null) {
    if (!mesh) return;

    // Récupérer l'expression de déformation
    const text = deformExpression || (glo.input_sym_r ? glo.input_sym_r.text : null);
    if (!text || !text.trim()) return;

    // Transformer l'expression pour GLSL
    const glslExpression = regForGLSL(text);

    // Créer le vertex shader avec l'expression injectée
    const customVertexShader = deformationVertexShader.replace('DEFORMATION_EXPRESSION', glslExpression);

    // Valider le shader généré
    const validation = validateVertexShader(customVertexShader);
    if (!validation.valid) {
        console.error('Shader de déformation invalide:', validation.error);
        console.log('Expression GLSL générée:', glslExpression);
        return;
    }

    // S'assurer que le mesh a les données UV params
    if (!mesh.isVerticesDataPresent('uv_params')) {
        setUVParamsToMesh(mesh);
    }

    // Créer le ShaderMaterial
    const shaderMaterial = new BABYLON.ShaderMaterial(
        "deformationShader",
        glo.scene,
        {
            vertexSource: customVertexShader,
            fragmentSource: deformationFragmentShader
        },
        {
            attributes: ["position", "normal", "uv", "uv_params"],
            uniforms: [
                "world", "worldView", "worldViewProjection", "view", "projection",
                "time", "scaleNorm", "cameraPosition",
                "stepU", "stepV", "minU", "minV", "stepsU", "stepsV",
                "emissiveColor", "diffuseColor"
            ],
            needAlphaBlending: false
        }
    );

    // Configuration
    shaderMaterial.backFaceCulling = false;

    // Définir les uniforms
    shaderMaterial.setFloat("scaleNorm", glo.scaleNorm || 1.0);
    shaderMaterial.setFloat("time", 0);
    shaderMaterial.setVector3("cameraPosition", glo.scene.activeCamera.position);

    // Paramètres UV
    const stepU = 2 * glo.params.u / glo.params.steps_u;
    const stepV = 2 * glo.params.v / glo.params.steps_v;
    shaderMaterial.setFloat("stepU", stepU);
    shaderMaterial.setFloat("stepV", stepV);
    shaderMaterial.setFloat("minU", -glo.params.u);
    shaderMaterial.setFloat("minV", -glo.params.v);
    shaderMaterial.setInt("stepsU", glo.params.steps_u);
    shaderMaterial.setInt("stepsV", glo.params.steps_v);

    // Couleurs
    const emissive = glo.emissiveColor || new BABYLON.Color3(0.3, 0.5, 0.5);
    const diffuse = glo.diffuseColor || new BABYLON.Color3(0.6, 0.5, 0.5);
    shaderMaterial.setVector3("emissiveColor", { x: emissive.r, y: emissive.g, z: emissive.b });
    shaderMaterial.setVector3("diffuseColor", { x: diffuse.r, y: diffuse.g, z: diffuse.b });

    // Appliquer le matériau
    mesh.material = shaderMaterial;

    // Animation pour le temps
    const renderObserver = glo.scene.registerBeforeRender(() => {
        shaderMaterial.setFloat("time", performance.now() * 0.001);
        shaderMaterial.setVector3("cameraPosition", glo.scene.activeCamera.position);
    });

    // Stocker la référence pour pouvoir la supprimer plus tard
    mesh._deformationShaderObserver = renderObserver;
    mesh._deformationShaderMaterial = shaderMaterial;

    console.log('Shader de déformation appliqué avec expression:', glslExpression);
}

// Définit les UV params (u, v) comme attribut custom du mesh
function setUVParamsToMesh(mesh = glo.ribbon) {
    if (!mesh) return;

    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    if (!positions) return;

    const vertexCount = positions.length / 3;
    const uvParams = new Float32Array(vertexCount * 2);

    const stepsU = glo.params.steps_u;
    const stepsV = glo.params.steps_v;
    const minU = -glo.params.u;
    const minV = -glo.params.v;
    const stepU = 2 * glo.params.u / stepsU;
    const stepV = 2 * glo.params.v / stepsV;

    let n = 0;
    for (let i = 0; i <= stepsU; i++) {
        const u = minU + i * stepU;
        for (let j = 0; j <= stepsV; j++) {
            const v = minV + j * stepV;
            if (n < vertexCount) {
                uvParams[n * 2] = u;
                uvParams[n * 2 + 1] = v;
                n++;
            }
        }
    }

    mesh.setVerticesData('uv_params', uvParams, true);
}

// Valide un vertex shader
function validateVertexShader(shaderCode) {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

    if (!gl) {
        return { valid: false, error: 'WebGL non supporté' };
    }

    const shader = gl.createShader(gl.VERTEX_SHADER);
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

// Supprime le shader de déformation et restaure le matériau standard
function removeDeformationShader(mesh = glo.ribbon) {
    if (!mesh) return;

    if (mesh._deformationShaderObserver) {
        glo.scene.unregisterBeforeRender(mesh._deformationShaderObserver);
        mesh._deformationShaderObserver = null;
    }

    if (mesh._deformationShaderMaterial) {
        mesh._deformationShaderMaterial.dispose();
        mesh._deformationShaderMaterial = null;
    }

    // Restaurer le matériau standard
    giveMaterialToMesh(mesh, glo.emissiveColor, glo.diffuseColor);
}
