const vertexShader = `
    precision highp float;
    
    // Attributes
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;
    
    // Uniforms
    uniform mat4 worldViewProjection;
    uniform mat4 world;
    
    // Varyings (transmis au fragment shader)
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec2 vUV;
    
    void main() {
        gl_Position = worldViewProjection * vec4(position, 1.0);
        vWorldPosition = (world * vec4(position, 1.0)).xyz;
        vPosition = position;
        vNormal = normalize((world * vec4(normal, 0.0)).xyz);
        vUV = uv;
    }
`;

let fragmentShader = `
    
precision highp float;

// Varyings reçus du vertex shader
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec2 vUV;

// Uniforms personnalisés
uniform float time;
uniform vec3 cameraPosition;
uniform vec2 iResolution;

float Ts(float c){ return 0.4999999*sin(c*time)+0.5; }
float Tc(float c){ return 0.4999999*cos(c*time)+0.5; }

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

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 cpalette(float t, vec3 phase) {
vec3 a = vec3(0.5, 0.5, 0.5);  // Offset
vec3 b = vec3(0.5, 0.5, 0.5);  // Amplitude
vec3 c = vec3(1.0, 1.0, 1.0);  // Fréquence

return a + b * cos(6.28318 * (c * t + phase));
}

void main() {
    vec3 col = cpalette(length(vPosition), normalize(vPosition)+time*0.5);

    gl_FragColor = vec4(col, 1.0);
}
`;

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
