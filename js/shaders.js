const vertexShader = `#version 300 es
    precision highp float;

    // Attributes → "in" en WebGL 2
    in vec3 position;
    in vec3 normal;
    in vec2 uv;
    in vec2 uv_params;

    // Uniforms
    uniform mat4 worldViewProjection;
    uniform mat4 world;

    // Varyings → "out" en WebGL 2
    out vec3 vPosition;
    out vec3 vWorldPosition;
    out vec3 vNormal;
    out vec2 vUV;
    out vec2 vUVParams;

    void main() {
        gl_Position = worldViewProjection * vec4(position, 1.0);
        vWorldPosition = (world * vec4(position, 1.0)).xyz;
        vPosition = position;
        vNormal = normalize((world * vec4(normal, 0.0)).xyz);
        vUV = uv;
        vUVParams = uv_params;
    }
`;

const combinedVertexShader = `#version 300 es
    precision highp float;

    // Attributes
    in vec3 position;
    in vec3 normal;
    in vec2 uv;
    in vec2 uv_params;

    // Uniforms
    uniform mat4 worldViewProjection;
    uniform mat4 world;
    uniform float scaleNorm;
    uniform float w;
    uniform float stepU;
    uniform float stepV;
    uniform float minU;
    uniform float minV;
    uniform float stepsU;
    uniform float stepsV;
    uniform int deformationEnabled;

    // Varyings
    out vec3 vPosition;
    out vec3 vWorldPosition;
    out vec3 vNormal;
    out vec2 vUV;
    out vec2 vUVParams;

    // Variables globales pour accès dans les fonctions
    float gx, gy, gz, gu, gv;

    // Fonction mathématique pour puissance signée
    float cpow(float val, float p) {
        return sign(val) * pow(abs(val), p);
    }

    float q(float a, float b, float t) { return mix(a, b, t); }
    vec2  q(vec2 a, vec2 b, float t)   { return mix(a, b, t); }
    vec3  q(vec3 a, vec3 b, float t)   { return mix(a, b, t); }
    vec4  q(vec4 a, vec4 b, float t)   { return mix(a, b, t); }

    float r(float e0, float e1, float x) { return smoothstep(e0, e1, x); }
    vec2  r(float e0, float e1, vec2 x)  { return smoothstep(vec2(e0), vec2(e1), x); }
    vec3  r(float e0, float e1, vec3 x)  { return smoothstep(vec3(e0), vec3(e1), x); }
    vec4  r(float e0, float e1, vec4 x)  { return smoothstep(vec4(e0), vec4(e1), x); }

    float g(float edge, float x) { return step(edge, x); }
    vec2  g(vec2 edge, vec2 x)   { return step(edge, x); }
    vec3  g(vec3 edge, vec3 x)   { return step(edge, x); }
    vec4  g(vec4 edge, vec4 x)   { return step(edge, x); }
    vec2  g(float edge, vec2 x)  { return step(edge, x); }
    vec3  g(float edge, vec3 x)  { return step(edge, x); }
    vec4  g(float edge, vec4 x)  { return step(edge, x); }



    // Fonction m() avec 4 signatures différentes
    // m(ncx, ncy, ncz) - utilise les 3 coefficients spécifiés
    float m(float ncx, float ncy, float ncz) {
        return cos(ncx * gx) * cos(ncy * gy) * cos(ncz * gz);
    }

    // m(ncx, ncy) - utilise ncx pour x, ncy pour y et z
    float m(float ncx, float ncy) {
        return cos(ncx * gx) * cos(ncy * gy) * cos(ncy * gz);
    }

    // m(ncx) - utilise ncx pour les 3 axes
    float m(float ncx) {
        return cos(ncx * gx) * cos(ncx * gy) * cos(ncx * gz);
    }

    // m() - utilise 1.0 pour les 3 axes
    float m() {
        return cos(gx) * cos(gy) * cos(gz);
    }

    float ce(){
        return cos(exp(abs(gx))) * exp(cos(abs(gy))) * exp(cos(abs(gz)));
    }

    float ce(float coeff){
        return cos(exp(coeff*abs(gx))) * cos(exp(coeff*abs(gy))) * cos(exp(coeff*abs(gz)));
    }

    float hce(float coeff){
        return length(
            vec3(
                exp(
                    coeff*cos(abs(gx))
                ),
                exp(
                    coeff*cos(abs(gy))
                ),
                exp(
                    coeff*cos(abs(gz))
                )
            )
        );
    }

    // Fonction o() avec 4 signatures différentes
    // o(ncx, ncy, ncz) - utilise les 3 coefficients spécifiés
    float o(float ncx, float ncy, float ncz) {
        return cos(ncx * gx) + cos(ncy * gy) + cos(ncz * gz);
    }

    // o(ncx, ncy) - utilise ncx pour x, ncy pour y et z
    float o(float ncx, float ncy) {
        return cos(ncx * gx) + cos(ncy * gy) + cos(ncy * gz);
    }

    // o(ncx) - utilise ncx pour les 3 axes
    float o(float ncx) {
        return cos(ncx * gx) + cos(ncx * gy) + cos(ncx * gz);
    }

    // o() - utilise 1.0 pour les 3 axes
    float o() {
        return cos(gx) + cos(gy) + cos(gz);
    }

    // b() - utilise 1.0 pour les 3 axes
    float b(){
		return length(vec3(cos(gx), cos(gy), cos(gz)));
	}

    float b(float ncx){
		return length(vec3(cos(ncx * gx), cos(ncx * gy), cos(ncx * gz)));
	}

    float b(float ncx, float ncy){
		return length(vec3(cos(ncx * gx), cos(ncy * gy), cos(ncy * gz)));
	}

    float b(float ncx, float ncy, float ncz){
		return length(vec3(cos(ncx * gx), cos(ncy * gy), cos(ncz * gz)));
	}

    float a(float nbU, float nbV){
		return cos(nbU * gu) * sin(nbV * gv);
	}

    float a(float nbU){
		return cos(nbU * gu) * sin(nbU * gv);
	}

    float a(){
		return cos(8.0 * gu) * sin(8.0 * gv);
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

    float h(float x, float y, float z, float w, float coeff){
        return length(vec4(x*coeff, y*coeff, z*coeff, w*coeff));
    }

    float lcr(float x1, float y1, float z1, float x2, float y2, float z2){
        return length(cross(vec3(x1, y1, z1), vec3(x2, y2, z2)));
    }

    mat3 rotateAxis(vec3 axis, float angle) {
        vec3 a = normalize(axis);
        float c = cos(angle);
        float s = sin(angle);
        float t = 1.0 - c;
        return mat3(
            t*a.x*a.x + c,      t*a.x*a.y - s*a.z,  t*a.x*a.z + s*a.y,
            t*a.x*a.y + s*a.z,  t*a.y*a.y + c,      t*a.y*a.z - s*a.x,
            t*a.x*a.z - s*a.y,  t*a.y*a.z + s*a.x,  t*a.z*a.z + c
        );
    }

    // DEFORMATION_EXPRESSION sera remplacé dynamiquement
    float computeDeformation(float u, float v, float x, float y, float z,
                             float xN, float yN, float zN, float O, float T,
                             float d, float k, float p, float t, float n, float i, float j) {
        float g = xN * yN * zN;
        return DEFORMATION_EXPRESSION;
    }

    void main() {
        // Calculer u et v à partir des UV params
        float u = uv_params.x;
        float v = uv_params.y;

        // Position et normale originales
        float x = position.x;
        float y = position.y;
        float z = position.z;

        // Initialiser les variables globales pour les fonctions de déformation
        gx = x;
        gy = y;
        gz = z;
        gu = u;
        gv = v;

        vec3 norm = normalize(normal);
        float xN = norm.x;
        float yN = norm.y;
        float zN = norm.z;

        // Angles sphériques
        float R = length(position);
        float O = R > 0.0001 ? asin(y / R) : 0.0;
        float T = atan(z, x);

        // Variables d'index (approximation basée sur UV)
        float i = floor(uv.x * stepsU);
        float j = floor(uv.y * stepsV);
        float n = i * stepsV + j;

        // Variables de signe alterné
        float k = mod(i, 2.0) < 1.0 ? -1.0 : 1.0;
        float d = mod(j, 2.0) < 1.0 ? -1.0 : 1.0;
        float p = k < 0.0 ? -u : u;
        float t = d < 0.0 ? -v : v;

        // Calculer la position (avec ou sans déformation)
        vec3 finalPosition = position;
        if (deformationEnabled == 1) {
            float r = computeDeformation(u, v, x, y, z, xN, yN, zN, O, T, d, k, p, t, n, i, j) * scaleNorm;
            finalPosition = position + norm * r;
        }

        gl_Position = worldViewProjection * vec4(finalPosition, 1.0);
        vWorldPosition = (world * vec4(finalPosition, 1.0)).xyz;
        vPosition = finalPosition;
        vNormal = normalize((world * vec4(normal, 0.0)).xyz);
        vUV = uv;
        vUVParams = uv_params;
    }
`;

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

const glslRegs = [
    {
        exp: /\(\s*([^()]+?)\s*\)\s*\*\*\*\s*\(\s*([^()]+?)\s*\)/g,
        upd: 'cpow($1,$2)'
    },
    // 2) (gauche) *** droiteSimple (identifiant ou nombre)
    {
        exp: /\(\s*([^()]+?)\s*\)\s*\*\*\*\s*([A-Za-z_$][\w$]*|\d+(?:\.\d+)?)/g,
        upd: 'cpow($1,$2)'
    },
    // 3) identifiant(groupe) ***(identifiant|nombre|groupe)
    {
        exp: /([A-Za-z_$][\w$]*\(\s*[^()]+?\s*\))\s*\*\*\*\s*([A-Za-z_$][\w$]*|\d+(?:\.\d+)?|\(\s*[^()]+?\s*\))/g,
        upd: 'cpow($1,$2)'
    },
    // 4) identifiant ***(groupe)
    {
        exp: /([A-Za-z_$][\w$]*)\s*\*\*\*\s*\(\s*([^()]+?)\s*\)/g,
        upd: 'cpow($1,$2)'
    },
    // 5) identifiant ***(identifiant|nombre)
    {
        exp: /([A-Za-z_$][\w$]*)\s*\*\*\*\s*([A-Za-z_$][\w$]*|\d+(?:\.\d+)?)/g,
        upd: 'cpow($1,$2)'
    },
    {
        exp: /\(\s*([^()]+?)\s*\)\s*\*\*\s*\(\s*([^()]+?)\s*\)/g,
        upd: 'pow($1,$2)'
    },
    // 2) (gauche) *** droiteSimple (identifiant ou nombre)
    {
        exp: /\(\s*([^()]+?)\s*\)\s*\*\*\s*([A-Za-z_$][\w$]*|\d+(?:\.\d+)?)/g,
        upd: 'pow($1,$2)'
    },
    // 3) identifiant(groupe) ***(identifiant|nombre|groupe)
    {
        exp: /([A-Za-z_$][\w$]*\(\s*[^()]+?\s*\))\s*\*\*\s*([A-Za-z_$][\w$]*|\d+(?:\.\d+)?|\(\s*[^()]+?\s*\))/g,
        upd: 'pow($1,$2)'
    },
    // 4) identifiant ***(groupe)
    {
        exp: /([A-Za-z_$][\w$]*)\s*\*\*\s*\(\s*([^()]+?)\s*\)/g,
        upd: 'pow($1,$2)'
    },
    // 5) identifiant ***(identifiant|nombre)
    {
        exp: /([A-Za-z_$][\w$]*)\s*\*\*\s*([A-Za-z_$][\w$]*|\d+(?:\.\d+)?)/g,
        upd: 'pow($1,$2)'
    },
    { exp: /\s/g, upd: "" },
    { exp: /a(?![\(bs])/g, upd: "a()" },
    { exp: /b(?![\(s])/g, upd: "b()" },
    { exp: /aa(?![\(])/g, upd: "aa()" },
    { exp: /bb(?![\(])/g, upd: "bb()" },
    { exp: /ce(?![\(])/g, upd: "ce()" },
    { exp: /(?<!d|l|p|cr|c)o(?!\()|(?<=d)o(?!t|\()|(?<=l)o(?!g|\()|(?<=c)o(?!s|\()|(?<=p)o(?!w|\()|(?<=cr)o(?!ss|\()/g, upd: "o()" },
    { exp: /c([^*\(R\)]*)R/g, upd: "cos($1R)" },
    { exp: /s([^*\(R\)]*)R/g, upd: "sin($1R)" },
    { exp: /c([^*\(X\)]*)X/g, upd: "cos($1X)" },
    { exp: /s([^*\(X\)]*)X/g, upd: "sin($1X)" },
    { exp: /c([^*\(Y\)]*)Y/g, upd: "cos($1Y)" },
    { exp: /s([^*\(Y\)]*)Y/g, upd: "sin($1Y)" },
    { exp: /m(?![\(xyz])/g, upd: "m()" },
    { exp: /cc(?![\(])/g, upd: "cc()" },
    { exp: /ù(?![\(])/g, upd: "ù()" },
    { exp: /cudv|cvdu/g, upd: "cos(u/v)" },
    { exp: /cufv|cvfu/g, upd: "cos(uv)" },
    { exp: /sudv|svdu/g, upd: "sin(u/v)" },
    { exp: /sufv|svfu/g, upd: "sin(u*v)" },
    { exp: /cupv|cvpu/g, upd: "cos(u+v)" },
    { exp: /cumv/g, upd: "cos(u-v)" },
    { exp: /cvmu/g, upd: "cos(v-u)" },
    { exp: /supv|svpu/g, upd: "sin(u+v)" },
    { exp: /sumv/g, upd: "sin(u-v)" },
    { exp: /svmu/g, upd: "sin(v-u)" },
    { exp: /c([^u\(vw]*)u/g, upd: "cos($1u)" },
    { exp: /c([^v\(uw]*)v/g, upd: "cos($1v)" },
    { exp: /c([^w\(uvp]*)w/g, upd: "cos($1w)" },
    { exp: /s([^u\(vw]*)u/g, upd: "sin($1u)" },
    { exp: /s([^v\(uw]*)v/g, upd: "sin($1v)" },
    { exp: /s([^w\(uv]*)w/g, upd: "sin($1w)" },
    { exp: /c([^*\(v]*)O/g, upd: "cos($1O)" },
    { exp: /s([^*\(v]*)O/g, upd: "sin($1O)" },
    { exp: /c([^x\(]*)x/g, upd: "cos($1x)" },
    { exp: /c([^y\(]*)y/g, upd: "cos($1y)" },
    { exp: /c([^z\(]*)z/g, upd: "cos($1z)" },
    { exp: /s([^x\(]*)x/g, upd: "sin($1x)" },
    { exp: /s([^y\(]*)y/g, upd: "sin($1y)" },
    { exp: /s([^z\(]*)z/g, upd: "sin($1z)" },
    { exp: /²/g, upd: "**2" },
    { exp: /³/g, upd: "**3" },
    { exp: /uu([^,%*+-/)])/g, upd: "uu*$1" },
    { exp: /vv([^,%*+-/)])/g, upd: "vv*$1" },
    { exp: /u([^,%*+-/)])/g, upd: "u*$1" },
    { exp: /v([^e,%*+-/)])/g, upd: "v*$1" },
    { exp: /(?<!cpo)w([^\(),%*+\-\/)])/g, upd: "w*$1" },
    { exp: /µP([^,%*+-/)])/g, upd: "µP*$1" },
    { exp: /µN([^,%*+-/)])/g, upd: "µN*$1" },
    { exp: /\$N([^,%*+-/)])/g, upd: "$N*$1" },
    { exp: /\$P([^,%*+-/)])/g, upd: "$P*$1" },
    { exp: /x([^,%*+-/NPT)])/g, upd: "x*$1" },
    { exp: /y([^,%*+-/NPT)])/g, upd: "y*$1" },
    { exp: /z([^,%*+-/NPT)])/g, upd: "z*$1" },
    { exp: /n([^,%*+-/d)])/g, upd: "n*$1" },
    { exp: /(?<!s)i([^,%*+\-\/)])/g, upd: "i*$1" },
    { exp: /j([^,%*+-/)])/g, upd: "j*$1" },
    { exp: /xN([^,%*+-/)])/g, upd: "xN*$1" },
    { exp: /yN([^,%*+-/)])/g, upd: "yN*$1" },
    { exp: /zN([^,%*+-/)])/g, upd: "zN*$1" },
    { exp: /xP([^,%*+-/)])/g, upd: "xP*$1" },
    { exp: /yP([^,%*+-/)])/g, upd: "yP*$1" },
    { exp: /zP([^,%*+-/)])/g, upd: "zP*$1" },
    { exp: /pi([^,%*+-/)])/g, upd: "pi*$1" },
    { exp: /ep([^,%*+-/)])/g, upd: "ep*$1" },
    { exp: /g([^,%*+-/)])/g, upd: "g*$1" },
    { exp: /([A-MXYk])([^,%*+\-\/)])/g, upd: "$1*$2" },
    { exp: /d(?!ot)([^,%*+\-\/)])/g, upd: "d*$1" },
    { exp: /p([^,%*+-/)])/g, upd: "p*$1" },
    { exp: /O([^,%*+-/)])/g, upd: "O*$1" },
    { exp: /T([^,%*+-/)])/g, upd: "T*$1" },
    { exp: /(?<!c)e([^c,%*+-/)pi])/g, upd: "e*$1" },
    { exp: /\)([^,%*+-/)'])/g, upd: ")*$1" },
    { exp: /(?<!c)(\d+)([^,%*+-/.\d)])/g, upd: "$1*$2" },
    { exp: /sin\*/g, upd: "sin" },
    { exp: /tan\*/g, upd: "tan" },
    { exp: /(?<!do)t\*an/g, upd: "tan" },
    { exp: /tan\*\(/g, upd: "tan(" },
    { exp: /sign\*/g, upd: "sign" },
    { exp: /fact_de\*c/g, upd: "fact_dec" },
    { exp: /p\*o/g, upd: "po" },
    { exp: /cp\*/g, upd: "cp" },
    { exp: /p\*c/g, upd: "pc" },
    { exp: /e\*x/g, upd: "ex" },
    { exp: /ex\*/g, upd: "ex" },
    { exp: /exp\*/g, upd: "exp" },
    { exp: /p\*i/g, upd: "pi" },
    { exp: /ep\*i/g, upd: "e*pi" },
    { exp: /e\*p/g, upd: "ep" },
    { exp: /se\*/g, upd: "se" },
    { exp: /mod\*/g, upd: "mod" },
    { exp: /dot\*/g, upd: "dot" },

    { exp: /R/g, upd: "length(vec3(x,y,z))" },

    // Raccourcis pour q = h(u,v)
    { exp: /h(?![\(ce])/g, upd: "length(vec2(u,v))" },
    { exp: /s([^h\(]*)h/g, upd: "sin($1length(vec2(u,v)))" },
    { exp: /c([^h\(]*)h/g, upd: "cos($1length(vec2(u,v)))" },
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
    result = result.replace(/(?<!\.\d*)(\b\d+\b)(?!\.)/g, '$1.0');
    // Éviter les doubles points (ex: 3.0.0)
    //result = result.replace(/\.0\.0/g, '.0');

    return result;
}

// Applique une déformation via shader au mesh (version combinée avec shader de couleur)
async function applyDeformationShader(mesh = glo.ribbon, deformExpression = null) {
    if (!mesh) return;

    // Si c'est un GPUShaderMesh, utiliser sa déformation native (recompile le shader)
    if (mesh.shaderMeshInstance) {
        const text = deformExpression || (glo.input_sym_r ? glo.input_sym_r.text : null);
        mesh.shaderMeshInstance.updateDeformationExpression(text);
        return;
    }

    // Vérifier que c'est un vrai mesh Babylon.js avec les méthodes nécessaires
    if (typeof mesh.isVerticesDataPresent !== 'function') {
        console.warn('applyDeformationShader: mesh invalide, ignoré');
        return;
    }

    // Récupérer l'expression de déformation
    const text = deformExpression || (glo.input_sym_r ? glo.input_sym_r.text : null);
    /*if (!text || !text.trim()) {
        // Si pas d'expression, désactiver la déformation
        glo.deformationEnabled = false;
        giveMaterialToMesh(mesh, glo.emissiveColor, glo.diffuseColor);
        return;
    }*/

    // Valider l'expression GLSL avant d'appliquer
    const glslExpression = regForGLSL(text);
    const testVertexShader = combinedVertexShader.replace(/DEFORMATION_EXPRESSION/g, glslExpression);
    const validation = validateVertexShader(testVertexShader);

    if (!validation.valid) {
        console.error('Shader de déformation invalide:', validation.error);
        console.log('Expression GLSL générée:', glslExpression);
        glo.deformationEnabled = false;
        return;
    }

    // S'assurer que le mesh a les données UV params
    if (!mesh.isVerticesDataPresent('uv_params')) {
        setUVParamsToMesh(mesh);
    }

    // Activer la déformation et appliquer le shader combiné
    glo.deformationEnabled = true;
    giveMaterialToMesh(mesh, glo.emissiveColor, glo.diffuseColor);

    applyTransformations();

    console.log('Shader combiné (couleur + déformation) appliqué avec expression:', glslExpression);
}

// Active ou désactive la déformation
function toggleDeformation(enabled = true) {
    // Si c'est un GPUShaderMesh, utiliser sa méthode native
    if (glo.ribbon && glo.ribbon.shaderMeshInstance) {
        glo.ribbon.shaderMeshInstance.setDeformation(enabled, glo.scaleNorm || 1.0);
        return;
    }

    glo.deformationEnabled = enabled;
    giveMaterialToMesh(glo.ribbon, glo.emissiveColor, glo.diffuseColor);
}

// Définit les UV params (u, v) comme attribut custom du mesh
function setUVParamsToMesh(mesh = glo.ribbon) {
    if (!mesh) return;

    // GPUShaderMesh n'a pas besoin de cette fonction (UV calculés dans le shader)
    if (mesh.shaderMeshInstance) return;

    const positions = mesh.savedRibbon ? mesh.savedRibbon.getVerticesData(BABYLON.VertexBuffer.PositionKind) : mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
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

    // Créer un VertexBuffer personnalisé pour uv_params
    const buffer = new BABYLON.Buffer(glo.scene.getEngine(), uvParams, false, 2);
    const vertexBuffer = new BABYLON.VertexBuffer(glo.scene.getEngine(), buffer, 'uv_params', false, false, 2, false, 0, 2);
    mesh.setVerticesBuffer(vertexBuffer);
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
        const error = gl.getShaderInfoLog(shader); //console.log(error);
        gl.deleteShader(shader);
        return { valid: false, error };
    }

    gl.deleteShader(shader);
    return { valid: true };
}

// Supprime le shader de déformation et restaure le shader de couleur seul
function removeDeformationShader(mesh = glo.ribbon) {
    if (!mesh) return;

    // Désactiver la déformation et réappliquer le shader
    glo.deformationEnabled = false;
    giveMaterialToMesh(mesh, glo.emissiveColor, glo.diffuseColor);
}