/**
 * classesGPUTest.js - Test d'un shader unifié pour calcul positions + normales + déformation + couleur
 *
 * APPROCHE : Tout se fait dans le shader Babylon.js, sans aller-retour CPU
 * - Le mesh contient uniquement les indices (i, j) comme attributs
 * - Le vertex shader calcule : positions paramétriques, normales (différences finies), déformation
 * - Le fragment shader calcule : couleur et éclairage
 *
 * AVANTAGE : ~100x plus rapide car pas de getBufferSubData (transfert GPU → CPU)
 */

class GPUUnifiedMeshComputer {
    constructor() {
        this.scene = glo.scene;
        this.engine = glo.engine;
        this.mesh = null;
        this.shaderMaterial = null;
    }

    /**
     * Transforme une expression mathématique en GLSL valide
     */
    transformExpressionToGLSL(expr) {
        if (!expr || expr.trim() === '') return '0.0';

        let result = expr;

        // Appliquer d'abord les regex de glo.regs
        for (const reg of glo.regs) {
            result = result.replace(reg.exp, reg.upd);
        }

        // Remplacer les constantes
        result = result.replace(/\bPI\b/g, '3.14159265358979');
        result = result.replace(/\bpi\b/g, '3.14159265358979');
        result = result.replace(/\bep\b/g, '2.71828182845905');
        result = result.replace(/\be\b(?![xp])/g, '2.71828182845905');
        result = result.replace(/\bQ\b/g, '1.41421356237310');
        result = result.replace(/\bZ\b/g, '1.61803398874989');

        // hypot -> length
        result = result.replace(/\bhypot\s*\(\s*([^,]+)\s*,\s*([^,)]+)\s*\)/g, 'length(vec2($1, $2))');
        result = result.replace(/\bh\s*\(\s*([^,]+)\s*,\s*([^,)]+)\s*\)/g, 'length(vec2($1, $2))');

        // ** -> pow()
        result = this.replacePow(result);

        // S'assurer que les nombres ont un point décimal pour GLSL
        result = result.replace(/(?<!\.\d*)(\b\d+\b)(?!\.)/g, '$1.0');

        return result;
    }

    replacePow(expr) {
        let result = expr.replace(/\*\*/g, '^POW^');

        const powIndex = result.indexOf('^POW^');
        if (powIndex === -1) return result;

        let left = '', i = powIndex - 1;
        let depth = 0;
        while (i >= 0) {
            const c = result[i];
            if (c === ')') depth++;
            else if (c === '(') {
                if (depth === 0) break;
                depth--;
            }
            if (depth === 0 && /[\s,+\-*\/]/.test(c)) break;
            left = c + left;
            i--;
        }

        let right = '', j = powIndex + 5;
        depth = 0;
        while (j < result.length) {
            const c = result[j];
            if (c === '(') depth++;
            else if (c === ')') {
                if (depth === 0) break;
                depth--;
            }
            if (depth === 0 && /[\s,+\-*\/]/.test(c)) break;
            right += c;
            j++;
        }

        const before = result.slice(0, i + 1);
        const after = result.slice(j);
        return this.replacePow(before + `pow(${left.trim()}, ${right.trim()})` + after);
    }

    /**
     * Crée le vertex shader unifié
     */
    createVertexShader(exprX, exprY, exprZ, exprDeform) {
        const glslX = this.transformExpressionToGLSL(exprX);
        const glslY = this.transformExpressionToGLSL(exprY);
        const glslZ = this.transformExpressionToGLSL(exprZ);
        const glslDeform = exprDeform ? this.transformExpressionToGLSL(exprDeform) : '0.0';

        return `#version 300 es
precision highp float;

// Attribut d'entrée : indices (i, j) du point dans la grille
in vec2 aIndex;

// Uniforms
uniform mat4 worldViewProjection;
uniform mat4 world;
uniform float uMinU, uMaxU, uStepU;
uniform float uMinV, uMaxV, uStepV;
uniform float uStepsU, uStepsV;
uniform float A, B, C, D, E, F, G, H, I, J, K, L;
uniform float w;
uniform float scaleNorm;
uniform float eps;  // Epsilon pour les différences finies
uniform int deformationEnabled;

// Varyings vers le fragment shader
out vec3 vPosition;
out vec3 vWorldPosition;
out vec3 vNormal;
out vec2 vUV;
out vec2 vUVParams;

// Fonctions utilitaires
float cpow(float val, float p) {
    return sign(val) * pow(abs(val), p);
}

float c(float val) { return cos(val); }
float s(float val) { return sin(val); }

// Variables globales pour les fonctions de déformation (comme dans shaders.js)
float gx, gy, gz, gu, gv;

// Fonctions de déformation (reprises de shaders.js)
float m(float ncx, float ncy, float ncz) {
    return cos(ncx * gx) * cos(ncy * gy) * cos(ncz * gz);
}
float m(float ncx, float ncy) {
    return cos(ncx * gx) * cos(ncy * gy) * cos(ncy * gz);
}
float m(float ncx) {
    return cos(ncx * gx) * cos(ncx * gy) * cos(ncx * gz);
}
float m() {
    return cos(gx) * cos(gy) * cos(gz);
}

float o(float ncx, float ncy, float ncz) {
    return cos(ncx * gx) + cos(ncy * gy) + cos(ncz * gz);
}
float o(float ncx, float ncy) {
    return cos(ncx * gx) + cos(ncy * gy) + cos(ncy * gz);
}
float o(float ncx) {
    return cos(ncx * gx) + cos(ncx * gy) + cos(ncx * gz);
}
float o() {
    return cos(gx) + cos(gy) + cos(gz);
}

float b(float ncx, float ncy, float ncz) {
    return length(vec3(cos(ncx * gx), cos(ncy * gy), cos(ncz * gz)));
}
float b(float ncx, float ncy) {
    return length(vec3(cos(ncx * gx), cos(ncy * gy), cos(ncy * gz)));
}
float b(float ncx) {
    return length(vec3(cos(ncx * gx), cos(ncx * gy), cos(ncx * gz)));
}
float b() {
    return length(vec3(cos(gx), cos(gy), cos(gz)));
}

float a(float nbU, float nbV) {
    return cos(nbU * gu) * sin(nbV * gv);
}
float a(float nbU) {
    return cos(nbU * gu) * sin(nbU * gv);
}
float a() {
    return cos(8.0 * gu) * sin(8.0 * gv);
}

float h(float x, float y) {
    return length(vec2(x, y));
}
float h(float x, float y, float z) {
    return length(vec3(x, y, z));
}

// ============================================================
// FONCTION QUI CALCULE LA POSITION POUR UN (u, v) DONNE
// Les expressions sont injectées ici
// ============================================================
vec3 computePosition(float u, float v) {
    // Variables auxiliaires
    float i = aIndex.x;
    float j = aIndex.y;
    float d = mod(j, 2.0) == 0.0 ? -1.0 : 1.0;
    float k = mod(i, 2.0) == 0.0 ? -1.0 : 1.0;
    float p = mod(i, 2.0) == 0.0 ? -u : u;
    float t = mod(j, 2.0) == 0.0 ? -v : v;
    float n = i * (uStepsV + 1.0) + j;

    // Calcul des coordonnées cartésiennes
    float px = ${glslX};
    float py = ${glslY};
    float pz = ${glslZ};

    return vec3(px, py, pz);
}

// ============================================================
// FONCTION QUI CALCULE LA DEFORMATION
// ============================================================
float computeDeformation(float u, float v, vec3 pos, vec3 norm) {
    float x = pos.x;
    float y = pos.y;
    float z = pos.z;
    float xN = norm.x;
    float yN = norm.y;
    float zN = norm.z;

    // Mettre à jour les variables globales
    gx = x;
    gy = y;
    gz = z;
    gu = u;
    gv = v;

    // Angles sphériques
    float R = length(pos);
    float O = R > 0.0001 ? asin(y / R) : 0.0;
    float T = atan(z, x);

    // Variables d'index
    float i = aIndex.x;
    float j = aIndex.y;
    float n = i * uStepsV + j;
    float k = mod(i, 2.0) < 1.0 ? -1.0 : 1.0;
    float d = mod(j, 2.0) < 1.0 ? -1.0 : 1.0;
    float p = k < 0.0 ? -u : u;
    float t = d < 0.0 ? -v : v;

    float g = xN * yN * zN;

    return ${glslDeform};
}

void main() {
    float i = aIndex.x;
    float j = aIndex.y;

    // Calculer u et v
    float u = uMinU + i * uStepU;
    float v = uMinV + j * uStepV;

    // ============================================================
    // ETAPE 1 : Calculer la position au point (u, v)
    // ============================================================
    vec3 pos = computePosition(u, v);

    // ============================================================
    // ETAPE 2 : Calculer la normale par différences finies
    // On calcule les positions aux points voisins (u+eps, v) et (u, v+eps)
    // Puis on fait le produit vectoriel des tangentes
    // ============================================================
    vec3 posU = computePosition(u + eps, v);
    vec3 posV = computePosition(u, v + eps);

    vec3 tangentU = (posU - pos) / eps;
    vec3 tangentV = (posV - pos) / eps;

    vec3 normal = normalize(cross(tangentU, tangentV));

    // Gérer le cas où la normale est invalide (surface dégénérée)
    if (length(normal) < 0.001 || any(isnan(normal)) || any(isinf(normal))) {
        normal = vec3(0.0, 1.0, 0.0);
    }

    // ============================================================
    // ETAPE 3 : Appliquer la déformation (si activée)
    // ============================================================
    vec3 finalPosition = pos;
    if (deformationEnabled == 1) {
        float deform = computeDeformation(u, v, pos, normal) * scaleNorm;
        finalPosition = pos + normal * deform;

        // Recalculer la normale après déformation (optionnel, plus coûteux)
        // Pour l'instant on garde la normale originale
    }

    // ============================================================
    // ETAPE 4 : Transformer et envoyer au fragment shader
    // ============================================================
    gl_Position = worldViewProjection * vec4(finalPosition, 1.0);
    vWorldPosition = (world * vec4(finalPosition, 1.0)).xyz;
    vPosition = finalPosition;
    vNormal = normalize((world * vec4(normal, 0.0)).xyz);

    // UV pour le fragment shader
    vUV = vec2(i / uStepsU, j / uStepsV);
    vUVParams = vec2(u, v);
}`;
    }

    /**
     * Crée le fragment shader
     */
    createFragmentShader() {
        return `#version 300 es
precision highp float;

in vec3 vPosition;
in vec3 vWorldPosition;
in vec3 vNormal;
in vec2 vUV;
in vec2 vUVParams;

out vec4 fragColor;

uniform vec3 cameraPosition;
uniform vec3 meshBg;
uniform vec3 meshFg;
uniform vec3 lampPosition;
uniform float lampIntensity;

// Eclairage simple
vec3 calculateLighting(vec3 pos, vec3 normal, vec3 baseColor) {
    vec3 N = normalize(normal);
    vec3 V = normalize(cameraPosition - pos);

    // Retourner la normale si on voit le dos
    if (dot(N, V) < 0.0) {
        N = -N;
    }

    vec3 L = normalize(lampPosition - pos);

    // Diffuse
    float diff = max(dot(N, L), 0.0);

    // Specular (Blinn-Phong)
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 32.0);

    // Ambient
    vec3 ambient = 0.15 * baseColor;
    vec3 diffuse = diff * baseColor * lampIntensity;
    vec3 specular = spec * vec3(0.3) * lampIntensity;

    return ambient + diffuse + specular;
}

void main() {
    // Couleur basée sur la position normalisée
    vec3 color = meshBg;

    // Grille simple basée sur UV
    float gridU = fract(vUV.x * 10.0);
    float gridV = fract(vUV.y * 10.0);
    float line = step(0.95, gridU) + step(0.95, gridV);
    color = mix(color, meshFg, min(line, 1.0));

    // Appliquer l'éclairage
    vec3 litColor = calculateLighting(vWorldPosition, vNormal, color);

    fragColor = vec4(litColor, 1.0);
}`;
    }

    /**
     * Crée un mesh avec uniquement les indices comme attributs
     */
    createIndexMesh(stepsU, stepsV) {
        const totalVertices = (stepsU + 1) * (stepsV + 1);

        // Créer les indices (i, j) pour chaque vertex
        const indices2D = new Float32Array(totalVertices * 2);
        let idx = 0;
        for (let i = 0; i <= stepsU; i++) {
            for (let j = 0; j <= stepsV; j++) {
                indices2D[idx++] = i;
                indices2D[idx++] = j;
            }
        }

        // Créer les positions (factices, seront recalculées dans le shader)
        const positions = new Float32Array(totalVertices * 3);

        // Créer les indices de triangulation
        const triangleIndices = [];
        for (let i = 0; i < stepsU; i++) {
            for (let j = 0; j < stepsV; j++) {
                const idx00 = i * (stepsV + 1) + j;
                const idx10 = (i + 1) * (stepsV + 1) + j;
                const idx01 = i * (stepsV + 1) + (j + 1);
                const idx11 = (i + 1) * (stepsV + 1) + (j + 1);

                // Premier triangle
                triangleIndices.push(idx00, idx10, idx01);
                // Second triangle
                triangleIndices.push(idx01, idx10, idx11);
            }
        }

        // Créer le mesh Babylon.js
        const mesh = new BABYLON.Mesh("gpuUnifiedMesh", this.scene);

        // Appliquer les données
        const vertexData = new BABYLON.VertexData();
        vertexData.positions = positions;
        vertexData.indices = triangleIndices;
        vertexData.applyToMesh(mesh, true);

        // Ajouter l'attribut personnalisé aIndex
        mesh.setVerticesData("aIndex", indices2D, false, 2);

        return mesh;
    }

    /**
     * Crée et applique le shader unifié au mesh
     */
    createAndApplyShader(mesh, options) {
        const {
            exprX, exprY, exprZ,
            exprDeform,
            minU, maxU, stepsU,
            minV, maxV, stepsV,
            A, B, C, D, E, F, G, H, I, J, K, L,
            w, scaleNorm, eps
        } = options;

        const stepU = (maxU - minU) / stepsU;
        const stepV = (maxV - minV) / stepsV;

        const vertexShader = this.createVertexShader(exprX, exprY, exprZ, exprDeform);
        const fragmentShader = this.createFragmentShader();

        // Créer le ShaderMaterial
        const shaderMaterial = new BABYLON.ShaderMaterial(
            "gpuUnifiedShader",
            this.scene,
            {
                vertexSource: vertexShader,
                fragmentSource: fragmentShader
            },
            {
                attributes: ["position", "aIndex"],
                uniforms: [
                    "worldViewProjection", "world",
                    "uMinU", "uMaxU", "uStepU",
                    "uMinV", "uMaxV", "uStepV",
                    "uStepsU", "uStepsV",
                    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
                    "w", "scaleNorm", "eps", "deformationEnabled",
                    "cameraPosition", "meshBg", "meshFg", "lampPosition", "lampIntensity"
                ]
            }
        );

        // Configurer les uniforms
        shaderMaterial.setFloat("uMinU", minU);
        shaderMaterial.setFloat("uMaxU", maxU);
        shaderMaterial.setFloat("uStepU", stepU);
        shaderMaterial.setFloat("uMinV", minV);
        shaderMaterial.setFloat("uMaxV", maxV);
        shaderMaterial.setFloat("uStepV", stepV);
        shaderMaterial.setFloat("uStepsU", stepsU);
        shaderMaterial.setFloat("uStepsV", stepsV);

        shaderMaterial.setFloat("A", A || 0);
        shaderMaterial.setFloat("B", B || 0);
        shaderMaterial.setFloat("C", C || 0);
        shaderMaterial.setFloat("D", D || 0);
        shaderMaterial.setFloat("E", E || 0);
        shaderMaterial.setFloat("F", F || 0);
        shaderMaterial.setFloat("G", G || 1);
        shaderMaterial.setFloat("H", H || 1);
        shaderMaterial.setFloat("I", I || 1);
        shaderMaterial.setFloat("J", J || 1);
        shaderMaterial.setFloat("K", K || 1);
        shaderMaterial.setFloat("L", L || 1);
        shaderMaterial.setFloat("w", w || 0);

        shaderMaterial.setFloat("scaleNorm", scaleNorm || 1.0);
        shaderMaterial.setFloat("eps", eps || 0.001);
        shaderMaterial.setInt("deformationEnabled", exprDeform ? 1 : 0);

        shaderMaterial.setVector3("cameraPosition", this.scene.activeCamera.position);
        shaderMaterial.setVector3("meshBg", new BABYLON.Vector3(0.2, 0.6, 0.6));
        shaderMaterial.setVector3("meshFg", new BABYLON.Vector3(0.1, 0.3, 0.3));
        shaderMaterial.setVector3("lampPosition", new BABYLON.Vector3(10, 10, 10));
        shaderMaterial.setFloat("lampIntensity", 1.0);

        shaderMaterial.backFaceCulling = false;

        mesh.material = shaderMaterial;
        this.shaderMaterial = shaderMaterial;

        return shaderMaterial;
    }

    /**
     * Méthode principale : crée le mesh et applique le shader
     */
    create(options) {
        const defaults = {
            exprX: 'cos(u) * (3.0 + cos(v))',
            exprY: 'sin(u) * (3.0 + cos(v))',
            exprZ: 'sin(v)',
            exprDeform: null,
            minU: -Math.PI,
            maxU: Math.PI,
            minV: -Math.PI,
            maxV: Math.PI,
            stepsU: 64,
            stepsV: 64,
            A: 0, B: 0, C: 0, D: 0, E: 0, F: 0,
            G: 1, H: 1, I: 1, J: 1, K: 1, L: 1,
            w: 0,
            scaleNorm: 1.0,
            eps: 0.001
        };

        const opts = { ...defaults, ...options };

        // Supprimer l'ancien mesh si existant
        if (this.mesh) {
            this.mesh.dispose();
        }

        // Créer le mesh avec les indices
        this.mesh = this.createIndexMesh(opts.stepsU, opts.stepsV);

        // Créer et appliquer le shader
        this.createAndApplyShader(this.mesh, opts);

        return this.mesh;
    }

    /**
     * Met à jour les paramètres du shader sans recréer le mesh
     */
    updateParams(params) {
        if (!this.shaderMaterial) return;

        for (const [key, value] of Object.entries(params)) {
            if (typeof value === 'number') {
                this.shaderMaterial.setFloat(key, value);
            } else if (value instanceof BABYLON.Vector3) {
                this.shaderMaterial.setVector3(key, value);
            }
        }
    }

    /**
     * Met à jour la position de la caméra (pour l'éclairage)
     */
    updateCamera() {
        if (this.shaderMaterial) {
            this.shaderMaterial.setVector3("cameraPosition", this.scene.activeCamera.position);
        }
    }

    /**
     * Supprime le mesh et le matériau
     */
    dispose() {
        if (this.shaderMaterial) {
            this.shaderMaterial.dispose();
            this.shaderMaterial = null;
        }
        if (this.mesh) {
            this.mesh.dispose();
            this.mesh = null;
        }
    }
}

// ==================== FONCTION DE TEST ====================

/**
 * Fonction de test pour comparer les performances
 */
function testGPUUnifiedMesh() {
    const computer = new GPUUnifiedMeshComputer();

    // Créer un tore comme exemple
    const mesh = computer.create({
        exprX: 'cos(u) * (3.0 + cos(v))',
        exprY: 'sin(u) * (3.0 + cos(v))',
        exprZ: 'sin(v)',
        exprDeform: 'm(8.0) * 0.3',  // Déformation avec la fonction m()
        minU: -Math.PI,
        maxU: Math.PI,
        minV: -Math.PI,
        maxV: Math.PI,
        stepsU: 128,
        stepsV: 64,
        scaleNorm: 1.0
    });

    // Mettre à jour la caméra dans la boucle de rendu
    glo.scene.onBeforeRenderObservable.add(() => {
        computer.updateCamera();
    });

    console.log('GPUUnifiedMesh créé avec succès !');
    console.log('Mesh:', mesh);

    return computer;
}

/**
 * Fonction pour créer un mesh à partir des paramètres actuels de glo
 */
function createGPUUnifiedMeshFromGlo() {
    const computer = new GPUUnifiedMeshComputer();

    const mesh = computer.create({
        exprX: glo.params.text_input_x || 'u',
        exprY: glo.params.text_input_y || 'v',
        exprZ: glo.params.text_input_z || '0',
        exprDeform: glo.input_sym_r ? glo.input_sym_r.text : null,
        minU: -glo.params.u,
        maxU: glo.params.u,
        minV: -glo.params.v,
        maxV: glo.params.v,
        stepsU: glo.params.steps_u,
        stepsV: glo.params.steps_v,
        A: glo.params.A,
        B: glo.params.B,
        C: glo.params.C,
        D: glo.params.D,
        E: glo.params.E,
        F: glo.params.F,
        G: glo.params.G,
        H: glo.params.H,
        I: glo.params.I,
        J: glo.params.J,
        K: glo.params.K,
        L: glo.params.L,
        w: w,
        scaleNorm: glo.scaleNorm || 1.0
    });

    // Mettre à jour la caméra dans la boucle de rendu
    glo.scene.onBeforeRenderObservable.add(() => {
        computer.updateCamera();
    });

    return { computer, mesh };
}

// Export pour utilisation globale
window.GPUUnifiedMeshComputer = GPUUnifiedMeshComputer;
window.testGPUUnifiedMesh = testGPUUnifiedMesh;
window.createGPUUnifiedMeshFromGlo = createGPUUnifiedMeshFromGlo;