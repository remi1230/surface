/**
 * GPUShaderMesh.js - Calcul de mesh 100% GPU (positions, normales, déformation, couleur)
 *
 * ARCHITECTURE :
 * - Le mesh ne contient que les indices (i, j) comme attributs
 * - Le vertex shader calcule : positions paramétriques + normales (différences finies) + déformation
 * - Le fragment shader calcule : couleur + éclairage
 * - AUCUN transfert GPU → CPU (pas de getBufferSubData, pas de getPaths)
 *
 * GAIN DE PERFORMANCE : ~100x par rapport à l'approche Transform Feedback
 */

// ==================== GESTIONNAIRE PRINCIPAL ====================

class GPUShaderMeshComputer {
	constructor() {
		this.scene  = glo.scene;
		this.engine = glo.engine;
		this.canvas = document.createElement('canvas');
		this.gl     = this.canvas.getContext('webgl2');
	}

	/**
	 * Transforme une expression mathématique en GLSL valide
	 * @param {string} expr - Expression (ex: "cos(u)*sin(v)")
	 * @returns {string} Expression GLSL
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
		result = result.replace(/\bhypot\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/g, 'length(vec3($1, $2, $3))');
		result = result.replace(/\bh\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/g, 'length(vec3($1, $2, $3))');

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
	 * Crée un mesh avec uniquement les indices (i, j) comme attributs
	 * Les positions sont calculées entièrement dans le shader
	 * @param {number} stepsU
	 * @param {number} stepsV
	 * @returns {BABYLON.Mesh}
	 */
	createIndexMesh(stepsU, stepsV) {
		// Paramètres de symétrie
		const symX = glo.params.symmetrizeX || 1;
		const symY = glo.params.symmetrizeY || 1;
		const symZ = glo.params.symmetrizeZ || 1;
		const symCount = symX * symY * symZ;

		const baseVertices = (stepsU + 1) * (stepsV + 1);
		const totalVertices = baseVertices * symCount;

		// Créer les indices (i, j) et positions (sx, sy, sz) pour chaque vertex
		const indices2D = new Float32Array(totalVertices * 2);
		const positions = new Float32Array(totalVertices * 3);

		let idxA = 0;
		let idxP = 0;
		let vertexOffset = 0;

		for (let sx = 0; sx < symX; sx++) {
			for (let sy = 0; sy < symY; sy++) {
				for (let sz = 0; sz < symZ; sz++) {
					for (let i = 0; i <= stepsU; i++) {
						for (let j = 0; j <= stepsV; j++) {
							// aIndex : mêmes (i, j) pour chaque copie
							indices2D[idxA++] = i;
							indices2D[idxA++] = j;
							// position : encode l'opération de symétrie (sx, sy, sz)
							positions[idxP++] = sx;
							positions[idxP++] = sy;
							positions[idxP++] = sz;
						}
					}
					vertexOffset++;
				}
			}
		}

		// Indices de triangulation (dupliqués pour chaque copie de symétrie)
		const triangleIndices = [];
		for (let copy = 0; copy < symCount; copy++) {
			const offset = copy * baseVertices;
			for (let i = 0; i < stepsU; i++) {
				for (let j = 0; j < stepsV; j++) {
					const idx00 = offset + i * (stepsV + 1) + j;
					const idx10 = offset + (i + 1) * (stepsV + 1) + j;
					const idx01 = offset + i * (stepsV + 1) + (j + 1);
					const idx11 = offset + (i + 1) * (stepsV + 1) + (j + 1);

					triangleIndices.push(idx00, idx10, idx01);
					triangleIndices.push(idx01, idx10, idx11);
				}
			}
		}

		// Créer le mesh Babylon.js
		const mesh = new BABYLON.Mesh("shaderMesh", this.scene);

		const vertexData = new BABYLON.VertexData();
		vertexData.positions = positions;
		vertexData.indices = triangleIndices;
		vertexData.applyToMesh(mesh, true);

		// Ajouter l'attribut personnalisé aIndex
		mesh.setVerticesData("aIndex", indices2D, false, 2);

		return mesh;
	}

	/**
	 * Valide un shader GLSL
	 * @param {string} shaderSource
	 * @returns {{valid: boolean, error: string|null}}
	 */
	validateShader(shaderSource) {
		//const canvas = document.createElement('canvas');
		//const gl = canvas.getContext('webgl2');
		if (!this.gl) return { valid: false, error: 'WebGL2 non supporté' };

		const shader = this.gl.createShader(this.gl.VERTEX_SHADER);
		this.gl.shaderSource(shader, shaderSource);
		this.gl.compileShader(shader);
		const success = this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS);
		const error = success ? null : this.gl.getShaderInfoLog(shader);

		this.gl.deleteShader(shader);
		return { valid: success, error };
	}
}

// ==================== CLASSE DE BASE ====================

class ShaderMeshBase {
	/**
	 * @param {object} parametres - {u: {min, max, nb_steps}, v: {min, max, nb_steps}}
	 * @param {object} equa - Équations {x, y, z, alpha, beta}
	 * @param {object} equa2 - Équations secondaires (pour suit)
	 * @param {boolean} dimOne - Mode 1D
	 * @param {boolean} fractalize - Mode fractal
	 */
	constructor(parametres = {
		u: { min: -glo.params.u, max: glo.params.u, nb_steps: glo.params.steps_u },
		v: { min: -glo.params.v, max: glo.params.v, nb_steps: glo.params.steps_v },
	}, equa = {}, equa2 = {}, dimOne = glo.dim_one, fractalize = false) {

		this.computer = getShaderMeshComputer();
		this.mesh = null;
		this.shaderMaterial = null;
		this.coordSystem = 'cartesian';

		// Traiter les équations
		this.equa = equa;
		this.equa2 = equa2;
		this.processEquations(this.equa);
		this.processEquations(this.equa2);

		// Initialiser les paramètres U
		this.min_u = !glo.slidersUVOnOneSign.u ? parametres.u.min : 0;
		this.max_u = parametres.u.max;
		this.nb_steps_u = parametres.u.nb_steps;
		this.step_u = (this.max_u - this.min_u) / this.nb_steps_u;

		// Initialiser les paramètres V
		this.min_v = !glo.slidersUVOnOneSign.v ? parametres.v.min : 0;
		this.max_v = parametres.v.max;
		this.nb_steps_v = parametres.v.nb_steps;
		this.step_v = (this.max_v - this.min_v) / this.nb_steps_v;

		// Détection U/V dans les équations
		this.uvInfos = isUV();

		// Flags
		this.invcol  = glo.shaders.params.invcol ? 1.0 : 0.0;
		this.islight = glo.shaders.params.islight ? 1.0 : 0.0;

		// Paramètres UI
		this.A = glo.shaders.uservars.A; this.B = glo.shaders.uservars.B;
		this.C = glo.shaders.uservars.C; this.D = glo.shaders.uservars.D;
		this.E = glo.params.E; this.F = glo.params.F;
		this.G = glo.params.G; this.H = glo.params.H;
		this.I = glo.params.I; this.J = glo.params.J;
		this.K = glo.params.K; this.L = glo.params.L;

		this.opt1 = glo.shaderOpt.opt1 ? 1.0 : 0;
		this.opt2 = glo.shaderOpt.opt2 ? 1.0 : 0;
		this.opt3 = glo.shaderOpt.opt3 ? 1.0 : 0;

		this.w = performance.now() / 1000.0;

		// Blender
		this.blenderInfos = glo.params.blender;

		// Transformations additionnelles (uniforms)
		this.flatAmount = 0.0;      // 0 = normal, 1 = complètement plat
		this.twistAmount = 0.0;     // Angle de twist par unité de hauteur
		this.spherifyAmount = 0.0;  // 0 = normal, 1 = sphère parfaite
		this.waveAmplitude = 0.0;   // Amplitude des ondes
		this.waveFrequency = 1.0;   // Fréquence des ondes

		// Observer pour la caméra
		this.cameraObserver = null;
	}

	/**
	 * Applique les transformations regex (glo.regs) aux équations
	 */
	processEquations(equa) {
		if (!equa) return;
		for (let prop in equa) {
			if (typeof equa[prop] === 'string') {
				equa[prop] = applyGloRegsGPU(equa[prop]);
			}
		}
	}

	/**
	 * Retourne le code GLSL pour les fonctions utilitaires
	 */
	getUtilityFunctionsGLSL() {
		return `
// Fonctions mathématiques
float cpow(float val, float p) {
	return sign(val) * pow(abs(val), p);
}

float c(float val) { return cos(val); }
float s(float val) { return sin(val); }

// Rotation autour d'un axe arbitraire
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

// Variables globales pour les fonctions de déformation
float gx, gy, gz, gu, gv;


// Fonctions de déformation m()
float m(float ncx, float ncy, float ncz) {
	float deformCoeff1 = 6.0;
	float deformCoeff2 = 1.0/deformCoeff1;
	return deformCoeff2*cos(ncx * gx * deformCoeff1) * cos(ncy * gy * deformCoeff1) * cos(ncz * gz * deformCoeff1);
}
float m(float ncx, float ncy) {
	float deformCoeff1 = 6.0;
	float deformCoeff2 = 1.0/deformCoeff1;
	return deformCoeff2*cos(ncx * gx * deformCoeff1) * cos(ncy * gy * deformCoeff1) * cos(ncy * gz * deformCoeff1);
}
float m(float ncx) {
	float deformCoeff1 = 6.0;
	float deformCoeff2 = 1.0/deformCoeff1;
	return deformCoeff2*cos(ncx * gx * deformCoeff1) * cos(ncx * gy * deformCoeff1) * cos(ncx * gz * deformCoeff1);
}
float m() {
	float deformCoeff1 = 6.0;
	float deformCoeff2 = 1.0/deformCoeff1;
	return deformCoeff2*cos(gx * deformCoeff1) * cos(gy * deformCoeff1) * cos(gz * deformCoeff1);
}

// Fonctions de déformation o()
float o(float ncx, float ncy, float ncz) {
	float deformCoeff1 = 6.0;
	float deformCoeff2 = 1.0/deformCoeff1;
	return deformCoeff2*(cos(ncx * gx * deformCoeff1) + cos(ncy * gy * deformCoeff1) + cos(ncz * gz * deformCoeff1));
}
float o(float ncx, float ncy) {
	float deformCoeff1 = 6.0;
	float deformCoeff2 = 1.0/deformCoeff1;
	return cos(ncx * gx * deformCoeff1) + cos(ncy * gy * deformCoeff1) + cos(ncy * gz * deformCoeff1);
}
float o(float ncx) {
	float deformCoeff1 = 6.0;
	float deformCoeff2 = 1.0/deformCoeff1;
	return deformCoeff2*(cos(ncx * gx * deformCoeff1) + cos(ncx * gy * deformCoeff1) + cos(ncx * gz * deformCoeff1));
}
float o() {
	float deformCoeff1 = 6.0;
	float deformCoeff2 = 1.0/deformCoeff1;
	return deformCoeff2*(cos(gx * deformCoeff1) + cos(gy * deformCoeff1) + cos(gz * deformCoeff1));
}

// Fonctions de déformation b()
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

// Fonctions de déformation a()
float a(float nbU, float nbV) {
	return cos(nbU * gu) * sin(nbV * gv);
}
float a(float nbU) {
	return cos(nbU * gu) * sin(nbU * gv);
}
float a() {
	return cos(8.0 * gu) * sin(8.0 * gv);
}

// Fonction h() - hypot
float h(float x, float y) {
	return length(vec2(x, y));
}
float h(float x, float y, float z) {
	return length(vec3(x, y, z));
}
float h(float x, float y, float z, float ww) {
	return length(vec4(x, y, z, ww));
}

// Fonctions q, r, g (interpolation, smoothstep, step)
float q(float aa, float bb, float t) { return mix(aa, bb, t); }
vec2  q(vec2 aa, vec2 bb, float t)   { return mix(aa, bb, t); }
vec3  q(vec3 aa, vec3 bb, float t)   { return mix(aa, bb, t); }

float r(float e0, float e1, float x) { return smoothstep(e0, e1, x); }

float g(float edge, float x) { return step(edge, x); }
`;
	}

	/**
	 * Retourne le code GLSL spécifique au système de coordonnées
	 * À surcharger dans les classes filles
	 */
	getPositionGLSL() {
		return 'outPos = vec3(0.0);';
	}

	/**
	 * Génère le vertex shader complet
	 */
	createVertexShader(deformExpression = null) {
		const glslDeform = deformExpression
			? this.computer.transformExpressionToGLSL(deformExpression)
			: '0.0';

		return `#version 300 es
precision highp float;

// Attribut d'entrée : indices (i, j) du point dans la grille
in vec2 aIndex;
in vec3 position;

// Uniforms matrices
uniform mat4 worldViewProjection;
uniform mat4 world;

// Uniforms paramètres
uniform float uMinU, uMaxU, uStepU;
uniform float uMinV, uMaxV, uStepV;
uniform float uStepsU, uStepsV;
uniform float A, B, C, D, E, F, G, H, I, J, K, L;
uniform float w;
uniform float eps;
uniform float scaleNorm;
uniform int deformationEnabled;

// Uniforms blender
uniform vec4 blendU;
uniform vec3 blendO;

// Uniforms transformations additionnelles
uniform float flatAmount;
uniform float twistAmount;
uniform float spherifyAmount;
uniform float waveAmplitude;
uniform float waveFrequency;

// Uniforms firstPoint (pour systèmes sphérique/cylindrique)
uniform vec3 uFirstPoint;

// Uniforms symétrie
uniform float uSymX, uSymY, uSymZ;
uniform float uSymAngle;
uniform vec3 uSymOrder;

// Varyings vers le fragment shader
out vec3 vPosition;
out vec3 vWorldPosition;
out vec3 vNormal;
out vec2 vUV;
out vec2 vUVParams;

${this.getUtilityFunctionsGLSL()}

// ============================================================
// FONCTION QUI CALCULE LA POSITION POUR UN (u, v) DONNÉ
// ============================================================
vec3 computePosition(float u, float v, float i, float j) {
	// Variables auxiliaires
	float d = mod(j, 2.0) == 0.0 ? -1.0 : 1.0;
	float k = mod(i, 2.0) == 0.0 ? -1.0 : 1.0;
	float p = mod(i, 2.0) == 0.0 ? -u : u;
	float t = mod(j, 2.0) == 0.0 ? -v : v;
	float n = i * (uStepsV + 1.0) + j;

	vec3 outPos;

	${this.getPositionGLSL()}

	// Appliquer le blender
	float R = length(outPos);
	float O = R > 0.0001 ? asin(outPos.y / R) : 0.0;

	outPos = rotateAxis(vec3(1.0, 0.0, 0.0), blendU.x * u) * outPos;
	outPos = rotateAxis(vec3(0.0, 1.0, 0.0), blendU.y * u) * outPos;
	outPos = rotateAxis(vec3(0.0, 0.0, 1.0), blendU.z * u) * outPos;
	outPos = rotateAxis(vec3(1.0, 0.0, 0.0), blendO.x * O) * outPos;
	outPos = rotateAxis(vec3(0.0, 1.0, 0.0), blendO.y * O) * outPos;
	outPos = rotateAxis(vec3(0.0, 0.0, 1.0), blendO.z * O) * outPos;

	return outPos;
}

// ============================================================
// SYMÉTRISATION : rotation des copies selon les axes
// ============================================================
vec3 applySymmetry(vec3 pos) {
	float sx = position.x;
	float sy = position.y;
	float sz = position.z;

	// Angles de décalage pour chaque axe
	float angleX = (uSymX > 1.0) ? sx * (uSymAngle / uSymX) : 0.0;
	float angleY = (uSymY > 1.0) ? sy * (uSymAngle / uSymY) : 0.0;
	float angleZ = (uSymZ > 1.0) ? sz * (uSymAngle / uSymZ) : 0.0;

	// Appliquer les rotations dans l'ordre défini par uSymOrder
	// uSymOrder.xyz encode l'ordre : 0.0=X, 1.0=Y, 2.0=Z
	for (int step = 0; step < 3; step++) {
		float axis = (step == 0) ? uSymOrder.x : (step == 1) ? uSymOrder.y : uSymOrder.z;
		if (axis < 0.5) {
			pos = rotateAxis(vec3(1.0, 0.0, 0.0), angleX) * pos;
		} else if (axis < 1.5) {
			pos = rotateAxis(vec3(0.0, 1.0, 0.0), angleY) * pos;
		} else {
			pos = rotateAxis(vec3(0.0, 0.0, 1.0), angleZ) * pos;
		}
	}

	return pos;
}

// ============================================================
// TRANSFORMATIONS ADDITIONNELLES (flat, twist, spherify, wave)
// ============================================================
vec3 applyTransformations(vec3 pos, float u, float v) {
	vec3 result = pos;

	// FLAT : Aplatir vers Y = 0
	if (flatAmount > 0.0) {
		result.y = mix(result.y, 0.0, flatAmount);
	}

	// TWIST : Rotation autour de Y proportionnelle à Y
	if (twistAmount != 0.0) {
		float angle = result.y * twistAmount;
		float c = cos(angle);
		float s = sin(angle);
		float newX = result.x * c - result.z * s;
		float newZ = result.x * s + result.z * c;
		result.x = newX;
		result.z = newZ;
	}

	// SPHERIFY : Interpolation vers une sphère
	if (spherifyAmount > 0.0) {
		float radius = length(result);
		if (radius > 0.001) {
			vec3 spherePos = normalize(result) * radius;
			result = mix(result, spherePos, spherifyAmount);
		}
	}

	// WAVE : Ondulation
	if (waveAmplitude != 0.0) {
		float wave = sin(u * waveFrequency) * cos(v * waveFrequency) * waveAmplitude;
		result += normalize(result) * wave;
	}

	return result;
}

// ============================================================
// FONCTION DE DÉFORMATION
// ============================================================
float computeDeformation(float u, float v, vec3 pos, vec3 norm) {
	float x = pos.x;
	float y = pos.y;
	float z = pos.z;
	float xN = norm.x;
	float yN = norm.y;
	float zN = norm.z;

	gx = x; gy = y; gz = z;
	gu = u; gv = v;

	float R = length(pos);
	float O = R > 0.0001 ? asin(y / R) : 0.0;
	float T = atan(z, x);

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

	float u = uMinU + i * uStepU;
	float v = uMinV + j * uStepV;

	// ============================================================
	// ETAPE 1 : Calculer la position au point (u, v)
	// ============================================================
	vec3 pos = computePosition(u, v, i, j);

	// ============================================================
	// ETAPE 2 : Appliquer les transformations additionnelles
	// ============================================================
	pos = applyTransformations(pos, u, v);

	// ============================================================
	// ETAPE 2b : Appliquer la symétrisation (rotation des copies)
	// ============================================================
	pos = applySymmetry(pos);

	// ============================================================
	// ETAPE 3 : Calculer la normale par différences finies
	// ============================================================
	vec3 posU = applySymmetry(applyTransformations(computePosition(u + eps, v, i, j), u + eps, v));
	vec3 posV = applySymmetry(applyTransformations(computePosition(u, v + eps, i, j), u, v + eps));

	vec3 tangentU = (posU - pos) / eps;
	vec3 tangentV = (posV - pos) / eps;

	vec3 normal = normalize(cross(tangentU, tangentV));

	if (length(normal) < 0.001 || any(isnan(normal)) || any(isinf(normal))) {
		normal = vec3(0.0, 1.0, 0.0);
	}

	// ============================================================
	// ETAPE 4 : Appliquer la déformation (si activée)
	// ============================================================
	vec3 finalPosition = pos;
	if (deformationEnabled == 1) {
		float deform = computeDeformation(u, v, pos, normal) * scaleNorm;
		finalPosition = pos + normal * deform;
	}

	// ============================================================
	// ETAPE 5 : Sorties
	// ============================================================
	gl_Position = worldViewProjection * vec4(finalPosition, 1.0);
	vWorldPosition = (world * vec4(finalPosition, 1.0)).xyz;
	vPosition = finalPosition;
	vNormal = normalize((world * vec4(normal, 0.0)).xyz);
	vUV = vec2(i / uStepsU, j / uStepsV);
	vUVParams = vec2(u, v);
}`;
	}

	/**
	 * Génère le fragment shader
	 */
	createFragmentShader(mainFrag = fragmentShaders[glo.numShaderSelect]) {
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
uniform float lampRadius;
uniform float invcol;
uniform float gridU;
uniform float gridV;
uniform float lineWidth;
uniform float w;
uniform float islight;
uniform float opt1;
uniform float opt2;
uniform float opt3;
uniform float A;
uniform float B;
uniform float C;
uniform float D;

#define time w

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
    float spec = pow(NdotH, SPECULAR_POWER) * SPECULAR_INTENSITY;
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

	// Diffuse
	float diff = max(dot(N, L), 0.0);

	// Specular (Blinn-Phong)
	vec3 H = normalize(L + V);
	float spec = pow(max(dot(N, H), 0.0), 32.0) * 0.5;

	// Ambient
	vec3 ambient = 0.1 * baseColor;
	vec3 diffuse = diff * baseColor * att;
	vec3 specular = spec * vec3(0.3) * att;

	return ambient + diffuse + specular;
}

vec3 npos(){ return normalize(vPosition); }

void main() {
	vec3 col = meshBg;

	${mainFrag}

	// Inversion des couleurs si bouton INV actif
	col = mix(col, vec3(1.0)-col, invcol);

	// Éclairage
	if(islight == 1.0){
		vec3 lamp1 = light(lampPosition, col);
		col*= lamp1;
		col = col / (col + vec3(1.0));
		col = pow(col, vec3(1.0 / 2.2));
	}

	fragColor = vec4(col, 1.0);
}`;
}

	/**
	 * Crée le mesh et applique le shader
	 * 100% GPU - aucun calcul CPU de paths
	 */
	create() {
		const stepsU = this.uvInfos.isU ? this.nb_steps_u : 0;
		const stepsV = this.uvInfos.isV ? this.nb_steps_v : 0;

		// Créer le mesh avec positions vides (shader calcule tout)
		this.mesh = this.computer.createIndexMesh(stepsU, stepsV);

		// Attacher l'instance shaderMesh au mesh pour accès ultérieur
		this.mesh.shaderMeshInstance = this;

		// Obtenir l'expression de déformation
		const deformText = glo.input_sym_r ? glo.input_sym_r.text : null;
		const hasDeformation = deformText && deformText.trim() && glo.deformationEnabled;

		// Créer les shaders
		const vertexShader = this.createVertexShader(hasDeformation ? deformText : null);
		const fragmentShader = this.createFragmentShader();

		// Valider le shader
		const validation = this.computer.validateShader(vertexShader);
		if (!validation.valid) {
			//console.error('Shader invalide:', validation.error);
			//console.error('Source:', vertexShader);
			return null;
		}

		// Créer le ShaderMaterial
		this.shaderMaterial = new BABYLON.ShaderMaterial(
			"shaderMeshMaterial",
			this.computer.scene,
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
					"w", "eps", "scaleNorm", "deformationEnabled",
					"blendU", "blendO", "uFirstPoint",
					"flatAmount", "twistAmount", "spherifyAmount",
					"waveAmplitude", "waveFrequency",
					"uSymX", "uSymY", "uSymZ", "uSymAngle", "uSymOrder",
					"cameraPosition", "meshBg", "meshFg",
					"lampPosition", "lampIntensity", "lampRadius",
					"gridU", "gridV", "lineWidth", "invcol", "islight"
				]
			}
		);

		glo.shaderRenderObserver = glo.scene.onBeforeRenderObservable.add(() => {
				this.shaderMaterial.setFloat("time", performance.now() * 0.001);
				this.shaderMaterial.setFloat("w", performance.now() * 0.001);
				this.shaderMaterial.setVector3("cameraPosition", glo.scene.activeCamera.position);
		});

		// Configurer les uniforms
		this.updateAllUniforms(hasDeformation);

		// Rendre les deux côtés du mesh
		this.shaderMaterial.backFaceCulling = false;
		this.shaderMaterial.sideOrientation = BABYLON.Material.DoubleSide;
		this.mesh.material = this.shaderMaterial;

		// Observer pour mettre à jour la caméra
		this.cameraObserver = this.computer.scene.onBeforeRenderObservable.add(() => {
			this.updateCamera();
		});

		return this.mesh;
	}

	/**
	 * Met à jour tous les uniforms
	 */
	updateAllUniforms(deformationEnabled = false) {
		const mat = this.shaderMaterial;
		if (!mat) return;

		mat.setFloat("uMinU", this.min_u);
		mat.setFloat("uMaxU", this.max_u);
		mat.setFloat("uStepU", this.step_u);
		mat.setFloat("uMinV", this.min_v);
		mat.setFloat("uMaxV", this.max_v);
		mat.setFloat("uStepV", this.step_v);
		mat.setFloat("uStepsU", this.nb_steps_u);
		mat.setFloat("uStepsV", this.nb_steps_v);

		mat.setFloat("invcol", this.invcol ? 1.0 : 0.0);
		mat.setFloat("islight", this.islight ? 1.0 : 0.0);

		mat.setFloat("A", this.A);
		mat.setFloat("B", this.B);
		mat.setFloat("C", this.C);
		mat.setFloat("D", this.D);
		mat.setFloat("E", this.E);
		mat.setFloat("F", this.F);
		mat.setFloat("G", this.G);
		mat.setFloat("H", this.H);
		mat.setFloat("I", this.I);
		mat.setFloat("J", this.J);
		mat.setFloat("K", this.K);
		mat.setFloat("L", this.L);
		mat.setFloat("w", this.w);
		mat.setFloat("opt1", this.opt1);
		mat.setFloat("opt2", this.opt2);
		mat.setFloat("opt3", this.opt3);

		mat.setFloat("eps", 0.001);
		mat.setFloat("scaleNorm", glo.scaleNorm || 1.0);
		mat.setInt("deformationEnabled", deformationEnabled ? 1 : 0);

		// Blender
		mat.setVector4("blendU", new BABYLON.Vector4(
			this.blenderInfos.u.x,
			this.blenderInfos.u.y,
			this.blenderInfos.u.z,
			0
		));
		mat.setVector3("blendO", new BABYLON.Vector3(
			this.blenderInfos.O.x,
			this.blenderInfos.O.y,
			this.blenderInfos.O.z
		));

		// Transformations additionnelles
		mat.setFloat("flatAmount", this.flatAmount);
		mat.setFloat("twistAmount", this.twistAmount);
		mat.setFloat("spherifyAmount", this.spherifyAmount);
		mat.setFloat("waveAmplitude", this.waveAmplitude);
		mat.setFloat("waveFrequency", this.waveFrequency);

		// Symétrie
		mat.setFloat("uSymX", glo.params.symmetrizeX || 1);
		mat.setFloat("uSymY", glo.params.symmetrizeY || 1);
		mat.setFloat("uSymZ", glo.params.symmetrizeZ || 1);
		mat.setFloat("uSymAngle", glo.params.symmetrizeAngle || Math.PI);
		const orderStr = (glo.symmetrizeOrder || 'xyz').toLowerCase();
		const axisMap = { x: 0.0, y: 1.0, z: 2.0 };
		mat.setVector3("uSymOrder", new BABYLON.Vector3(
			axisMap[orderStr[0]] ?? 0.0,
			axisMap[orderStr[1]] ?? 1.0,
			axisMap[orderStr[2]] ?? 2.0
		));

		// Temps
		mat.setFloat("w", performance.now() / 1000.0);

		// FirstPoint
		mat.setVector3("uFirstPoint", new BABYLON.Vector3(
			glo.firstPoint?.x || 1,
			glo.firstPoint?.y || 0,
			glo.firstPoint?.z || 0
		));

		// Éclairage et couleurs
		mat.setVector3("cameraPosition", this.computer.scene.activeCamera.position);
		mat.setVector3("meshBg", new BABYLON.Vector3(
			glo.emissiveColor.r,
			glo.emissiveColor.g,
			glo.emissiveColor.b
		));
		mat.setVector3("meshFg", new BABYLON.Vector3(
			glo.lineColor.r,
			glo.lineColor.g,
			glo.lineColor.b
		));
		mat.setVector3("lampPosition", new BABYLON.Vector3(
			glo.shaders.light.direction.x,
			glo.shaders.light.direction.y,
			glo.shaders.light.direction.z
		));
		mat.setFloat("lampIntensity", glo.shaders.light.intensity);
		mat.setFloat("lampRadius", glo.shaders.light.radius);

		// Grille
		mat.setFloat("gridU", glo.params.steps_u);
		mat.setFloat("gridV", glo.params.steps_v);
		mat.setFloat("lineWidth", 1.0);
	}

	/**
	 * Met à jour la position de la caméra
	 */
	updateCamera() {
		if (this.shaderMaterial) {
			this.shaderMaterial.setVector3("cameraPosition", this.computer.scene.activeCamera.position);
		}
	}

	/**
	 * Met à jour les paramètres (A, B, C, etc.)
	 */
	updateParams() {
		if (!this.shaderMaterial) return;

		this.A = glo.params.A; this.B = glo.params.B;
		this.C = glo.params.C; this.D = glo.params.D;
		this.E = glo.params.E; this.F = glo.params.F;
		this.G = glo.params.G; this.H = glo.params.H;
		this.I = glo.params.I; this.J = glo.params.J;
		this.K = glo.params.K; this.L = glo.params.L;
		this.w = performance.now() / 1000.0;

		this.shaderMaterial.setFloat("A", this.A);
		this.shaderMaterial.setFloat("B", this.B);
		this.shaderMaterial.setFloat("C", this.C);
		this.shaderMaterial.setFloat("D", this.D);
		this.shaderMaterial.setFloat("E", this.E);
		this.shaderMaterial.setFloat("F", this.F);
		this.shaderMaterial.setFloat("G", this.G);
		this.shaderMaterial.setFloat("H", this.H);
		this.shaderMaterial.setFloat("I", this.I);
		this.shaderMaterial.setFloat("J", this.J);
		this.shaderMaterial.setFloat("K", this.K);
		this.shaderMaterial.setFloat("L", this.L);
		this.shaderMaterial.setFloat("w", this.w);
	}

	/**
	 * Met à jour le blender
	 */
	updateBlender() {
		if (!this.shaderMaterial) return;

		this.blenderInfos = glo.params.blender;

		this.shaderMaterial.setVector4("blendU", new BABYLON.Vector4(
			this.blenderInfos.u.x,
			this.blenderInfos.u.y,
			this.blenderInfos.u.z,
			0
		));
		this.shaderMaterial.setVector3("blendO", new BABYLON.Vector3(
			this.blenderInfos.O.x,
			this.blenderInfos.O.y,
			this.blenderInfos.O.z
		));
	}

	/**
	 * Met à jour les couleurs du mesh (background, lignes, éclairage)
	 */
	updateColors() {
		if (!this.shaderMaterial) return;

		this.shaderMaterial.setVector3("meshBg", new BABYLON.Vector3(
			glo.emissiveColor.r,
			glo.emissiveColor.g,
			glo.emissiveColor.b
		));
		this.shaderMaterial.setVector3("meshFg", new BABYLON.Vector3(
			glo.lineColor.r,
			glo.lineColor.g,
			glo.lineColor.b
		));
	}

	/**
	 * Met à jour l'éclairage (lampe)
	 */
	updateLighting() {
		if (!this.shaderMaterial) return;

		this.shaderMaterial.setVector3("lampPosition", new BABYLON.Vector3(
			glo.shaders.light.direction.x,
			glo.shaders.light.direction.y,
			glo.shaders.light.direction.z
		));
		this.shaderMaterial.setFloat("lampIntensity", glo.shaders.light.intensity);
		this.shaderMaterial.setFloat("lampRadius", glo.shaders.light.radius);
	}

	/**
	 * Met à jour la grille (nombre de lignes)
	 */
	updateGrid() {
		if (!this.shaderMaterial) return;

		this.shaderMaterial.setFloat("gridU", glo.params.steps_u);
		this.shaderMaterial.setFloat("gridV", glo.params.steps_v);
	}

	/**
	 * Met à jour un paramètre float
	 */
	updateFloatParam(param, value) {
		if (!this.shaderMaterial) return;

		this.shaderMaterial.setFloat(param, value);
	}

	/**
	 * Active/désactive la déformation et met à jour le scale
	 * @param {boolean} enabled - Activer la déformation
	 * @param {number} scale - Échelle de la déformation (optionnel)
	 */
	setDeformation(enabled, scale = null) {
		if (!this.shaderMaterial) return;

		glo.deformationEnabled = enabled;
		this.shaderMaterial.setInt("deformationEnabled", enabled ? 1 : 0);

		if (scale !== null) {
			glo.scaleNorm = scale;
			this.shaderMaterial.setFloat("scaleNorm", scale);
		}
	}

	/**
	 * Met à jour uniquement le scale de déformation
	 * @param {number} scale - Échelle de la déformation
	 */
	setDeformationScale(scale) {
		if (!this.shaderMaterial) return;

		glo.scaleNorm = scale;
		this.shaderMaterial.setFloat("scaleNorm", scale);
	}

	/**
	 * Met à jour l'expression de déformation (recompile le shader)
	 * @param {string} expression - Nouvelle expression (ex: "m()", "o(2)", "a(8,8)")
	 * @returns {boolean} true si succès, false si erreur
	 */
	updateDeformationExpression(expression = null) {
		if (!this.mesh) return false;

		// Récupérer l'expression
		const deformText     = expression || (glo.input_sym_r ? glo.input_sym_r.text : null);
		const hasDeformation = deformText && deformText.trim();

		// Créer les nouveaux shaders
		const vertexShader   = this.createVertexShader(hasDeformation ? deformText : null);
		const fragmentShader = this.createFragmentShader();

		// Valider le nouveau shader
		const validation = this.computer.validateShader(vertexShader);
		if (!validation.valid) {
			//console.error('Shader de déformation invalide:', validation.error);
			return false;
		}

		// Disposer de l'ancien matériau
		if (this.shaderMaterial) {
			this.shaderMaterial.dispose();
		}

		// Créer le nouveau ShaderMaterial
		this.shaderMaterial = new BABYLON.ShaderMaterial(
			"shaderMeshMaterial",
			this.computer.scene,
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
					"w", "eps", "scaleNorm", "deformationEnabled",
					"blendU", "blendO", "uFirstPoint",
					"flatAmount", "twistAmount", "spherifyAmount",
					"waveAmplitude", "waveFrequency",
					"cameraPosition", "meshBg", "meshFg",
					"lampPosition", "lampIntensity", "lampRadius",
					"gridU", "gridV", "lineWidth", "w"
				]
			}
		);

		// Reconfigurer les uniforms
		this.updateAllUniforms(hasDeformation);

		// Rendre les deux côtés du mesh
		this.shaderMaterial.backFaceCulling = false;
		this.shaderMaterial.sideOrientation = 1;
		this.mesh.material                  = this.shaderMaterial;

		//console.log('[GPUShaderMesh] Shader de déformation mis à jour:', deformText || '(désactivé)');
		return true;
	}

	/**
	 * Met à jour les transformations additionnelles
	 */
	updateTransformations(flat = null, twist = null, spherify = null, waveAmp = null, waveFreq = null) {
		if (!this.shaderMaterial) return;

		if (flat !== null) {
			this.flatAmount = flat;
			this.shaderMaterial.setFloat("flatAmount", flat);
		}
		if (twist !== null) {
			this.twistAmount = twist;
			this.shaderMaterial.setFloat("twistAmount", twist);
		}
		if (spherify !== null) {
			this.spherifyAmount = spherify;
			this.shaderMaterial.setFloat("spherifyAmount", spherify);
		}
		if (waveAmp !== null) {
			this.waveAmplitude = waveAmp;
			this.shaderMaterial.setFloat("waveAmplitude", waveAmp);
		}
		if (waveFreq !== null) {
			this.waveFrequency = waveFreq;
			this.shaderMaterial.setFloat("waveFrequency", waveFreq);
		}
	}

	/**
	 * Libère les ressources
	 */
	dispose() {
		if (this.cameraObserver) {
			this.computer.scene.onBeforeRenderObservable.remove(this.cameraObserver);
			this.cameraObserver = null;
		}
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

// ==================== SYSTEME CARTESIEN ====================

class ShaderMeshCartesian extends ShaderMeshBase {
	/**
	 * Coordonnées cartésiennes : x = f(u,v), y = g(u,v), z = h(u,v)
	 * Avec rotations ROT Z (alpha) et ROT Y (beta)
	 */
	constructor(parametres = {
		u: { min: -glo.params.u, max: glo.params.u, nb_steps: glo.params.steps_u },
		v: { min: -glo.params.v, max: glo.params.v, nb_steps: glo.params.steps_v },
	}, equa = {
		x: glo.params.text_input_x,
		y: glo.params.text_input_y,
		z: glo.params.text_input_z,
		alpha: glo.params.text_input_alpha,  // ROT Z
		beta: glo.params.text_input_beta,    // ROT Y
	}, equa2, dimOne, fractalize) {
		super(parametres, equa, equa2, dimOne, fractalize);
		this.coordSystem = 'cartesian';
	}

	/**
	 * @override
	 */
	getPositionGLSL() {
		const glslX = this.computer.transformExpressionToGLSL(this.equa.x || 'u');
		const glslY = this.computer.transformExpressionToGLSL(this.equa.y || 'v');
		const glslZ = this.computer.transformExpressionToGLSL(this.equa.z || '0.0');
		const glslAlpha = this.computer.transformExpressionToGLSL(this.equa.alpha || '0.0');
		const glslBeta = this.computer.transformExpressionToGLSL(this.equa.beta || '0.0');

		return `
	// Coordonnées cartésiennes
	float px = ${glslX};
	float py = ${glslY};
	float pz = ${glslZ};

	// Rotations ROT Z (alpha) et ROT Y (beta)
	float alpha = ${glslAlpha};
	float beta = ${glslBeta};

	if (alpha != 0.0 || beta != 0.0) {
		float cosA = cos(alpha);
		float sinA = sin(alpha);
		float cosB = cos(beta);
		float sinB = sin(beta);

		// Rotation Y (beta) puis Z (alpha)
		float x1 = px * cosB - pz * sinB;
		float z1 = px * sinB + pz * cosB;
		float x2 = x1 * cosA - py * sinA;
		float y2 = x1 * sinA + py * cosA;

		px = x2;
		py = y2;
		pz = z1;
	}

	outPos = vec3(px, py, pz);
`;
	}
}

// ==================== SYSTEME SPHERIQUE (à implémenter) ====================

class ShaderMeshSpherical extends ShaderMeshBase {
	constructor(parametres, equa, equa2, dimOne, fractalize) {
		super(parametres, equa, equa2, dimOne, fractalize);
		this.coordSystem = 'spheric';
	}

	getPositionGLSL() {
		// TODO: Implémenter le système sphérique
		return 'outPos = vec3(0.0);';
	}
}

// ==================== SYSTEME CYLINDRIQUE (à implémenter) ====================

class ShaderMeshCylindrical extends ShaderMeshBase {
	constructor(parametres, equa, equa2, dimOne, fractalize) {
		super(parametres, equa, equa2, dimOne, fractalize);
		this.coordSystem = 'cylindrical';
	}

	getPositionGLSL() {
		// TODO: Implémenter le système cylindrique
		return 'outPos = vec3(0.0);';
	}
}

// ==================== FACTORY ET UTILITAIRES ====================

/**
 * Retourne la classe appropriée selon le type de coordonnées
 */
function getShaderMeshClass(coordsType) {
	const classes = {
		'cartesian': ShaderMeshCartesian,
		'spheric': ShaderMeshSpherical,
		'cylindrical': ShaderMeshCylindrical,
	};
	return classes[coordsType] || ShaderMeshCartesian;
}

/**
 * Crée un ShaderMesh selon le type de coordonnées
 */
function createShaderMesh(coordsType, parametres, equa, equa2, dimOne, fractalize) {
	const MeshClass = getShaderMeshClass(coordsType);
	return new MeshClass(parametres, equa, equa2, dimOne, fractalize);
}

/**
 * Crée un ShaderMesh à partir des paramètres globaux (glo)
 * @returns {BABYLON.Mesh} Le mesh créé (avec shaderMeshInstance attaché)
 */
function createShaderMeshFromGlo() {
	const coordsType = glo.coordsType || 'cartesian';
	const MeshClass = getShaderMeshClass(coordsType);

	const shaderMesh = new MeshClass();
	const mesh = shaderMesh.create();

	// Le mesh retourné a shaderMeshInstance attaché pour accéder à l'instance ShaderMesh
	return mesh;
}

// ==================== INSTANCE GLOBALE ====================

let shaderMeshComputer = null;

function getShaderMeshComputer() {
	if (!shaderMeshComputer) {
		shaderMeshComputer = new GPUShaderMeshComputer();
	}
	return shaderMeshComputer;
}

// ==================== EXPORTS ====================

window.GPUShaderMeshComputer = GPUShaderMeshComputer;
window.ShaderMeshBase = ShaderMeshBase;
window.ShaderMeshCartesian = ShaderMeshCartesian;
window.ShaderMeshSpherical = ShaderMeshSpherical;
window.ShaderMeshCylindrical = ShaderMeshCylindrical;

window.getShaderMeshClass = getShaderMeshClass;
window.createShaderMesh = createShaderMesh;
window.createShaderMeshFromGlo = createShaderMeshFromGlo;
window.getShaderMeshComputer = getShaderMeshComputer;