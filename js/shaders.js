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

    // Convert 3D position to spherical coordinates (adapté pour surfaces)
    vec2 posToSpherical(vec3 pos) {
        vec3 normalized = normalize(pos);
        float theta = atan(normalized.z, normalized.x);
        float phi = acos(clamp(normalized.y, -1.0, 1.0));
        return vec2(theta, phi);
    }

    // Function to draw a square on the surface
    vec3 drawSquaresOnSurface(vec2 cellUV, vec3 normal, vec3 cellCol, float sizeVariation) {
        const float PI = 3.14159265359;
        float sphereRadius = 1.0;
        float squareSize = sizeVariation * sphereRadius / 2.0;
        
        // Normalized cell center
        vec2 cellCenter = vec2(0.5);
        
        // Distance to cell center (square for drawing squares)
        vec2 distToCenter = abs(cellUV - cellCenter);
        float squareThreshold = squareSize / sphereRadius;
        
        // Draw the square if we're in the zone
        if (max(distToCenter.x, distToCenter.y) < squareThreshold) {
            // Simple lighting
            vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
            float diff = max(dot(normal, lightDir), 0.0);
            float amb = 0.3;
            
            // Light applied to cell color
            cellCol *= (amb + diff * 0.7);
            
            // Add edges for 3D effect
            float edge = min(distToCenter.x, distToCenter.y) / squareThreshold;
            cellCol *= (1.25 + sin(time * 2.0) * 0.5) + 0.5 * step(0.5 + sin(time * 0.5) * 0.5, edge);
            
            return cellCol;
        }
        
        return vec3(0.0);
    }
    
    void main() {
        const float PI  = 3.14159265359;
        const float TAU = 6.28318530718;
        const float E   = 2.718281828459045;
        
        vec3 col = vec3(0.0);

        float coeff1 = 0.125 + Ts(0.125);
        float numMeridians = 64.0 * coeff1;
        float numParallels = 32.0 * coeff1;
        
        // Au lieu de ray marching, on utilise directement la position du mesh
        vec3 normal = normalize(vNormal);
        
        // Option 1: Utiliser les UVs du ribbon directement
        float u = vUV.x;
        float v = vUV.y;
        
        // Option 2: Calculer des coordonnées sphériques depuis la position
        // vec2 sphericalCoord = posToSpherical(vWorldPosition);
        // float theta = sphericalCoord.x;
        // float phi = sphericalCoord.y;
        // float u = (theta + PI) / (2.0 * PI);
        // float v = phi / PI;

        // Grid coordinates
        float gridU = (u - v) * numMeridians;
        float gridV = (u + v) * numParallels;
        
        // Find the closest cell
        vec2 cellId = floor(vec2(gridU, gridV));
        
        // Fractional position in the cell
        vec2 cellUV = fract(vec2(gridU, gridV));

        float hue = fract((cellId.x / numMeridians) + (cellId.y / numParallels) - time * (2.0 / 3.0));

        // CENTER: distance to cell center
        vec2 centeredUV = cellUV - vec2(0.5); // from -0.5 to +0.5
        float distFromCenter = length(centeredUV); // radial distance to center (0 to ~0.707)
        
        // Normalize so max distance is 1.0
        distFromCenter = distFromCenter / 0.707; // 0.707 = max distance from center to corner
        
        // Cell color based on distance to center
        vec3 cellCol1 = rainbow(sin(time + distFromCenter * 6.28318) * distFromCenter - hue * 2.0);
        vec3 cellCol2 = palette(sin(time + distFromCenter * 6.28318) * distFromCenter - hue * 2.0);

        vec3 cellCol = mix(cellCol1, cellCol2, 0.5 + 0.5 * sin(time + distFromCenter * 6.28318));

        float sizeVariation = (4.5 - 0.4166*Ts(1.0)) / E * distFromCenter - (0.0125 * sin(time));
        
        // Draw the squares on the surface
        col = drawSquaresOnSurface(cellUV, normal, cellCol, sizeVariation);

        // If no square hit, gradient background based on position
        if (length(col) < 0.01) {
            col += vec3(0.05, 0.05, 0.1) + vec3(0.1, 0.1, 0.2) * (0.5 + 0.5 * vUV.y);
        }
        
        gl_FragColor = vec4(col, 1.0);
    }
`;
