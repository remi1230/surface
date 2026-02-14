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

		// Substituer X et Y par les expressions Eval X et Eval Y
		const evalX = glo.params.text_input_eval_x;
		const evalY = glo.params.text_input_eval_y;
		if (evalX && evalX.trim() !== '') {
			result = result.replace(/X/g, evalX);
		}
		if (evalY && evalY.trim() !== '') {
			result = result.replace(/Y/g, evalY);
		}

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
		const additive = glo.addSymmetry;

		// Générer la liste des copies de symétrie (sx, sy, sz)
		let symCopies;
		if (additive) {
			// Mode additif : axes indépendants
			// Copie originale (0,0,0) + copies pures sur chaque axe
			symCopies = [[0, 0, 0]];
			for (let sx = 1; sx < symX; sx++) symCopies.push([sx, 0, 0]);
			for (let sy = 1; sy < symY; sy++) symCopies.push([0, sy, 0]);
			for (let sz = 1; sz < symZ; sz++) symCopies.push([0, 0, sz]);
		} else {
			// Mode multiplicatif : produit cartésien
			symCopies = [];
			for (let sx = 0; sx < symX; sx++)
				for (let sy = 0; sy < symY; sy++)
					for (let sz = 0; sz < symZ; sz++)
						symCopies.push([sx, sy, sz]);
		}

		const symCount = symCopies.length;
		const baseVertices = (stepsU + 1) * (stepsV + 1);
		const totalVertices = baseVertices * symCount;

		// Créer les indices (i, j) et positions (sx, sy, sz) pour chaque vertex
		const indices2D = new Float32Array(totalVertices * 2);
		const positions = new Float32Array(totalVertices * 3);

		let idxA = 0;
		let idxP = 0;

		for (let c = 0; c < symCount; c++) {
			const [sx, sy, sz] = symCopies[c];
			for (let i = 0; i <= stepsU; i++) {
				for (let j = 0; j <= stepsV; j++) {
					indices2D[idxA++] = i;
					indices2D[idxA++] = j;
					positions[idxP++] = sx;
					positions[idxP++] = sy;
					positions[idxP++] = sz;
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

		// Forcer la bounding box centrée à l'origine (le buffer position
		// contient des indices de symétrie, pas des positions réelles)
		const big = 1000;
		mesh.setBoundingInfo(new BABYLON.BoundingInfo(
			new BABYLON.Vector3(-big, -big, -big),
			new BABYLON.Vector3(big, big, big)
		));

		return mesh;
	}

	/**
	 * Valide un shader GLSL (délègue à la fonction globale validateShader)
	 * @param {string} shaderSource
	 * @param {string} type - 'vertex' ou 'fragment' (défaut: 'vertex')
	 * @returns {{valid: boolean, error: string|null}}
	 */
	validateShader(shaderSource, type = 'vertex') {
		return validateShader(shaderSource, type);
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
		this._importedMode = false;
		this._normEditorCode = null;

		// Traiter les équations
		this.equa = equa;
		this.equa2 = equa2;
		//this.processEquations(this.equa);
		//this.processEquations(this.equa2);

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
		this.A = glo.params.A; this.B = glo.params.B;
		this.C = glo.params.C; this.D = glo.params.D;
		this.E = glo.params.E; this.F = glo.params.F;
		this.G = glo.params.G; this.H = glo.params.H;
		this.I = glo.params.I; this.J = glo.params.J;
		this.K = glo.params.K; this.L = glo.params.L;
		this.M = glo.params.M;

		this.P = glo.shaders.uservars.P; this.Q = glo.shaders.uservars.Q;
		this.S = glo.shaders.uservars.S; this.T = glo.shaders.uservars.T;

		this.opt1 = glo.shaderOpt.opt1 ? 1.0 : 0.0;
		this.opt2 = glo.shaderOpt.opt2 ? 1.0 : 0.0;
		this.opt3 = glo.shaderOpt.opt3 ? 1.0 : 0.0;

		this.t = performance.now() * 0.001;

		// Blender
		this.blenderInfos = glo.params.blender;

		// Transformations additionnelles (uniforms)
		this.flatAmount = 0.0;      // 0 = normal, 1 = complètement plat
		this.twistAmount = 0.0;     // Angle de twist par unité de hauteur
		this.spherifyAmount = 0.0;  // 0 = normal, 1 = sphère parfaite
		// Norm deformation parameters (read from glo.params.functionIt.norm)
		const norm = glo.params.functionIt.norm;
		this.normValX = norm.x;
		this.normCoeffX = norm.nx;
		this.normValY = norm.y;
		this.normCoeffY = norm.ny;
		this.normValZ = norm.z;
		this.normCoeffZ = norm.nz;

		// Observer pour la caméra
		this.cameraObserver = null;
	}

	/**
 * Applique les transformations regex de glo.regs à une expression
 */
	applyGloRegsGPU(expr) {
		if (!expr || expr.trim() === '') return '0';

		let result = expr;

		for (const reg of glo.regs) {
			result = result.replace(reg.exp, reg.upd);
		}

		return result;
	}

	/**
	 * Applique les transformations regex (glo.regs) aux équations
	 */
	processEquations(equa) {
		if (!equa) return;
		for (let prop in equa) {
			if (typeof equa[prop] === 'string') {
				equa[prop] = this.applyGloRegsGPU(equa[prop]);
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
vec3 m(vec3 pos) {
	return vec3(m(pos.x), m(pos.y), m(pos.z));
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

float f(float n){
	if (n < 0.5) return 1.0;
    return sqrt(6.2831853 * n) * pow(n / 2.7182818, n);	
}
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
		let glslDeformBlock;
		if (this._normEditorCode) {
			glslDeformBlock = `float result = 0.0;\n${this._normEditorCode}\nreturn result;`;
		} else if (deformExpression) {
			glslDeformBlock = `return ${this.computer.transformExpressionToGLSL(deformExpression)};`;
		} else {
			glslDeformBlock = 'return 0.0;';
		}

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
uniform float A, B, C, D, E, F, G, H, I, J, K, L, M, P, Q, S, T;
uniform float t;
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
// Norm deformation uniforms
uniform float normValX, normCoeffX;
uniform float normValY, normCoeffY;
uniform float normValZ, normCoeffZ;

// Uniforms firstPoint (pour systèmes sphérique/cylindrique)
uniform vec3 uFirstPoint;

// Uniforms symétrie
uniform float uSymX, uSymY, uSymZ;
uniform float uSymAngle;
uniform vec3 uSymOrder;
uniform vec3 uSymCenter;

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
	float w = mod(j, 2.0) == 0.0 ? -v : v;
	float n = i * (uStepsV + 1.0) + j;

	vec3 outPos;

	${this.getPositionGLSL()}

	// Appliquer le blender
	float xzLen = length(outPos.xz);
    float O = atan(outPos.y, xzLen);

	outPos = rotateAxis(vec3(1.0, 0.0, 0.0), blendU.x * u) * outPos;
	outPos = rotateAxis(vec3(0.0, 1.0, 0.0), blendU.y * u) * outPos;
	outPos = rotateAxis(vec3(0.0, 0.0, 1.0), blendU.z * u) * outPos;
	outPos = rotateAxis(vec3(1.0, 0.0, 0.0), blendO.x * O) * outPos;
	outPos = rotateAxis(vec3(0.0, 1.0, 0.0), blendO.y * O) * outPos;
	outPos = rotateAxis(vec3(0.0, 0.0, 1.0), blendO.z * O) * outPos;

	//outPos.x = mix(outPos.x, 0.0, outPos.x > 50.0 || outPos.x < -50.0);
	//outPos.y = mix(outPos.y, 0.0, outPos.y > 50.0 || outPos.y < -50.0);
	//outPos.z = mix(outPos.z, 0.0, outPos.z > 50.0 || outPos.z < -50.0);

	return outPos;
}

// ============================================================
// SYMÉTRISATION : rotation des copies selon les axes
// En mode additif, les copies sont générées indépendamment par axe
// (géré par createIndexMesh), mais la rotation est la même.
// ============================================================
vec3 applySymmetry(vec3 pos) {
	float sx = position.x;
	float sy = position.y;
	float sz = position.z;

	// Angles de décalage pour chaque axe (0 si sx/sy/sz = 0)
	float angleX = (uSymX > 1.0) ? sx * (uSymAngle / uSymX) : 0.0;
	float angleY = (uSymY > 1.0) ? sy * (uSymAngle / uSymY) : 0.0;
	float angleZ = (uSymZ > 1.0) ? sz * (uSymAngle / uSymZ) : 0.0;

	pos -= uSymCenter;

	// Appliquer les rotations dans l'ordre défini par uSymOrder
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

	pos += uSymCenter;

	return pos;
}

// ============================================================
// DÉFORMATION PAR NORMALES (ondes de surface via sliders Norm/n)
// ============================================================
vec3 applyNormDeformation(vec3 pos, vec3 normal) {
	float xN = normal.x;
	float yN = normal.y;
	float zN = normal.z;

	vec3 displacement = vec3(0.0);

	if (normValX != 0.0) {
		float cosToAdd = cos(normValX * xN) * normCoeffX;
		displacement += cosToAdd * normal;
	}
	if (normValY != 0.0) {
		float cosToAdd = cos(normValY * yN) * normCoeffY;
		displacement += cosToAdd * normal;
	}
	if (normValZ != 0.0) {
		float cosToAdd = cos(normValZ * zN) * normCoeffZ;
		displacement += cosToAdd * normal;
	}

	return pos + displacement;
}

// ============================================================
// FONCTION DE DÉFORMATION (éditable via l'éditeur de shader normal)
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
	float xzLen = length(pos.xz);
    float O = atan(pos.y, xzLen);

	float i = aIndex.x;
	float j = aIndex.y;
	float n = i * uStepsV + j;
	float k = mod(i, 2.0) < 1.0 ? -1.0 : 1.0;
	float d = mod(j, 2.0) < 1.0 ? -1.0 : 1.0;
	float p = k < 0.0 ? -u : u;
	float w = d < 0.0 ? -v : v;

	${glslDeformBlock}
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
	// ETAPE 2 : Appliquer la symétrisation (rotation des copies)
	// ============================================================
	pos = applySymmetry(pos);

	// ============================================================
	// ETAPE 3 : Calculer la normale par différences finies
	// ============================================================
	vec3 posU = applySymmetry(computePosition(u + eps, v, i, j));
	vec3 posV = applySymmetry(computePosition(u, v + eps, i, j));

	vec3 tangentU = (posU - pos) / eps;
	vec3 tangentV = (posV - pos) / eps;

	vec3 normal = normalize(cross(tangentU, tangentV));

	if (any(isnan(normal)) || any(isinf(normal))) {
		float posLen = length(pos);
		normal = posLen > 0.001 ? pos / posLen : vec3(0.0, 1.0, 0.0);
	}

	// ============================================================
	// ETAPE 3b : Déformation par normales (ondes de surface via sliders)
	// ============================================================
	pos = applyNormDeformation(pos, normal);

	// ============================================================
	// ETAPE 4 : Appliquer la déformation le long de la normale (si activée)
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
uniform float lampSpecularIntensity;
uniform float lampSpecularPower;
uniform float invcol;
uniform float gridU;
uniform float gridV;
uniform float lineWidth;
uniform float t;
uniform float islight;
uniform float opt1;
uniform float opt2;
uniform float opt3;
uniform float P;
uniform float Q;
uniform float S;
uniform float T;

#define time t

${getFragmentUtilsGLSL()}

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
	 * Crée un ShaderMaterial avec les sources vertex/fragment données
	 * Méthode interne partagée par create() et updateDeformationExpression()
	 */
	_createShaderMaterial(vertexShader, fragmentShader) {
		return new BABYLON.ShaderMaterial(
			"shaderMeshMaterial",
			this.computer.scene,
			{
				vertexSource: vertexShader,
				fragmentSource: fragmentShader
			},
			{
				attributes: ["position", "normal", "aIndex"],
				uniforms: [
					"worldViewProjection", "world",
					"uMinU", "uMaxU", "uStepU",
					"uMinV", "uMaxV", "uStepV",
					"uStepsU", "uStepsV",
					"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "P", "Q", "S", "T",
					"t", "eps", "scaleNorm", "deformationEnabled",
					"blendU", "blendO", "uFirstPoint",
					"flatAmount", "twistAmount", "spherifyAmount",
					"normValX", "normCoeffX", "normValY", "normCoeffY", "normValZ", "normCoeffZ",
					"uSymX", "uSymY", "uSymZ", "uSymAngle", "uSymOrder", "uSymCenter",
					"cameraPosition", "meshBg", "meshFg",
					"lampPosition", "lampIntensity", "lampRadius", 'lampSpecularIntensity', 'lampSpecularPower',
					"gridU", "gridV", "lineWidth", "invcol", "islight"
				]
			}
		);
	}

	/**
	 * Crée le mesh et applique le shader
	 * 100% GPU - aucun calcul CPU de paths
	 */
	create() {
		// Obtenir l'expression de déformation
		const deformText = glo.input_sym_r ? glo.input_sym_r.text : null;
		const hasDeformation = deformText && deformText.trim() && glo.deformationEnabled;

		// Sauvegarder l'état de déformation sur l'instance pour l'export
		this._lastDeformExpression = hasDeformation ? deformText : null;
		this._deformationActive = !!hasDeformation;

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

		if (glo.ribbon) { ribbonDispose(); }

		const stepsU = this.uvInfos.isU ? this.nb_steps_u : 0;
		const stepsV = this.uvInfos.isV ? this.nb_steps_v : 0;

		// Créer le mesh avec positions vides (shader calcule tout)
		this.mesh = this.computer.createIndexMesh(stepsU, stepsV);

		// Attacher l'instance shaderMesh au mesh pour accès ultérieur
		this.mesh.shaderMeshInstance = this;

		// Créer le ShaderMaterial
		this.shaderMaterial = this._createShaderMaterial(vertexShader, fragmentShader);

		glo.shaderRenderObserver = glo.scene.onBeforeRenderObservable.add(() => {
				this.shaderMaterial.setFloat("time", performance.now() * 0.001);
				this.shaderMaterial.setFloat("t", performance.now() * 0.001);
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
		mat.setFloat("M", this.M);
		mat.setFloat("P", this.P);
		mat.setFloat("Q", this.Q);
		mat.setFloat("S", this.S);
		mat.setFloat("T", this.T);
		mat.setFloat("t", this.t);
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
		mat.setFloat("normValX", this.normValX);
		mat.setFloat("normCoeffX", this.normCoeffX);
		mat.setFloat("normValY", this.normValY);
		mat.setFloat("normCoeffY", this.normCoeffY);
		mat.setFloat("normValZ", this.normValZ);
		mat.setFloat("normCoeffZ", this.normCoeffZ);

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
		mat.setVector3("uSymCenter", new BABYLON.Vector3(
			glo.centerSymmetry.x || 0,
			glo.centerSymmetry.y || 0,
			glo.centerSymmetry.z || 0
		));

		// Temps
		mat.setFloat("t", performance.now() * 0.001);

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
		mat.setFloat("lampSpecularIntensity", glo.shaders.light.specular.intensity);
		mat.setFloat("lampSpecularPower", glo.shaders.light.specular.power);

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
		this.K = glo.params.K; this.M = glo.params.M;
		//this.w = performance.now() * 0.01;

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
		this.shaderMaterial.setFloat("M", this.M);
		this.shaderMaterial.setFloat("t", this.t);
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
		this.shaderMaterial.setFloat("lampSpecularIntensity", glo.shaders.light.specular.intensity);
		this.shaderMaterial.setFloat("lampSpecularPower", glo.shaders.light.specular.power);
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
	 * Met à jour le centre de symétrie
	 */
	updateSymmetryCenter() {
		if (!this.shaderMaterial) return;

		this.shaderMaterial.setVector3("uSymCenter", new BABYLON.Vector3(
			glo.centerSymmetry.x || 0,
			glo.centerSymmetry.y || 0,
			glo.centerSymmetry.z || 0
		));
	}

	/**
	 * Met à jour un paramètre float
	 */
	updateFloatParam(param, value) {
		if (!this.shaderMaterial) return;

		if(typeof this[param] !== 'undefined'){ this[param] = value; }

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
		this._deformationActive = enabled;
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

		// L'input Equation écrase le code éditeur
		this._normEditorCode = null;

		// En mode importé, déléguer au vertex shader import
		if (this._importedMode) {
			return this.updateImportDeformationExpression(expression);
		}

		// Récupérer l'expression
		const deformText     = expression || (glo.input_sym_r ? glo.input_sym_r.text : null);
		const hasDeformation = deformText && deformText.trim();

		// Sauvegarder l'état de déformation sur l'instance pour l'export
		this._lastDeformExpression = hasDeformation ? deformText : null;
		this._deformationActive = !!hasDeformation;

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
		this.shaderMaterial = this._createShaderMaterial(vertexShader, fragmentShader);

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
	 * Met à jour uniquement le fragment shader (couleur) sans reconstruire le mesh ni le vertex shader.
	 * Réutilise le vertex shader courant, le mesh d'indices, et les observers existants.
	 * @param {string} mainFrag - Le corps du fragment shader (contenu de fragmentShaders[n])
	 * @returns {boolean} true si succès
	 */
	updateFragmentShader(mainFrag = fragmentShaders[glo.numShaderSelect]) {
		if (!this.mesh || !this.shaderMaterial) return false;

		// Reconstruire le vertex shader identique (même expression de déformation)
		// Utiliser le vertex shader import si on est en mode importé
		const deformText = this._lastDeformExpression;
		const vertexShader = this._importedMode
			? this.createImportVertexShader(deformText || null)
			: this.createVertexShader(deformText || null);

		// Construire le nouveau fragment shader
		const fragmentShader = this.createFragmentShader(mainFrag);

		// Disposer de l'ancien matériau
		this.shaderMaterial.dispose();

		// Créer le nouveau ShaderMaterial (WebGL exige de re-linker vertex+fragment)
		this.shaderMaterial = this._createShaderMaterial(vertexShader, fragmentShader);

		// Reconfigurer tous les uniforms sur le nouveau matériau
		this.updateAllUniforms(this._deformationActive);

		// Propriétés de rendu
		this.shaderMaterial.backFaceCulling = false;
		this.shaderMaterial.sideOrientation = BABYLON.Material.DoubleSide;
		this.mesh.material = this.shaderMaterial;

		return true;
	}

	/**
	 * Met à jour la déformation par GLSL brut (depuis l'éditeur normal).
	 * Le code est injecté dans computeDeformation et doit affecter float result.
	 * @param {string} glslCode - Code GLSL (ex: "result = sin(x*5.0)*0.3;")
	 * @returns {boolean} true si succès
	 */
	updateNormDeformGLSL(glslCode) {
		if (!this.mesh || !this.shaderMaterial) return false;

		// Stocker le code éditeur (écrase l'expression Equation)
		this._normEditorCode = glslCode;
		this._lastDeformExpression = null;
		this._deformationActive = true;

		// Reconstruire le vertex shader avec le code éditeur
		const vertexShader = this._importedMode
			? this.createImportVertexShader(null)
			: this.createVertexShader(null);

		const fragmentShader = this.createFragmentShader();

		// Valider le vertex shader
		const validation = this.computer.validateShader(vertexShader);
		if (!validation.valid) {
			return { success: false, error: validation.error };
		}

		// Disposer de l'ancien matériau et recréer
		this.shaderMaterial.dispose();
		this.shaderMaterial = this._createShaderMaterial(vertexShader, fragmentShader);
		this.updateAllUniforms(true);

		this.shaderMaterial.backFaceCulling = false;
		this.shaderMaterial.sideOrientation = BABYLON.Material.DoubleSide;
		this.mesh.material = this.shaderMaterial;

		return { success: true };
	}

	/**
	 * Met à jour les transformations additionnelles
	 */
	updateTransformations(flat = null, twist = null, spherify = null) {
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
	}

	/**
	 * Met à jour un uniform de déformation par normale
	 * @param {string} uniformName - ex: "normValX", "normCoeffX"
	 * @param {number} value
	 */
	setNormUniform(uniformName, value) {
		if (!this.shaderMaterial) return;
		this[uniformName] = value;
		this.shaderMaterial.setFloat(uniformName, value);
	}

	// ==================== IMPORT : MESH OBJ AVEC SHADERS DE COULEUR ET DÉFORMATION ====================

	/**
	 * Génère un vertex shader adapté à un mesh importé (positions réelles en attribut).
	 * La géométrie est fixe : pas de computePosition, pas de blender, pas de symétrie.
	 * Applique : normales par attribut, applyNormDeformation, computeDeformation, fragment shaders.
	 */
	createImportVertexShader(deformExpression = null) {
		let glslDeformBlock;
		if (this._normEditorCode) {
			glslDeformBlock = `float result = 0.0;\n${this._normEditorCode}\nreturn result;`;
		} else if (deformExpression) {
			glslDeformBlock = `return ${this.computer.transformExpressionToGLSL(deformExpression)};`;
		} else {
			glslDeformBlock = 'return 0.0;';
		}

		return `#version 300 es
precision highp float;

// Attributs : positions et normales réelles du mesh importé
in vec3 position;
in vec3 normal;
in vec2 aIndex;

// Uniforms matrices
uniform mat4 worldViewProjection;
uniform mat4 world;

// Uniforms paramètres
uniform float uMinU, uMaxU, uStepU;
uniform float uMinV, uMaxV, uStepV;
uniform float uStepsU, uStepsV;
uniform float A, B, C, D, E, F, G, H, I, J, K, L, M;
uniform float t;
uniform float eps;
uniform float scaleNorm;
uniform int deformationEnabled;

// Uniforms blender (déclarés pour compatibilité mais non utilisés en mode import)
uniform vec4 blendU;
uniform vec3 blendO;

// Uniforms transformations additionnelles
uniform float flatAmount;
uniform float twistAmount;
uniform float spherifyAmount;
// Norm deformation uniforms
uniform float normValX, normCoeffX;
uniform float normValY, normCoeffY;
uniform float normValZ, normCoeffZ;

// Uniforms firstPoint (déclaré pour compatibilité)
uniform vec3 uFirstPoint;

// Uniforms symétrie (déclarés pour compatibilité)
uniform float uSymX, uSymY, uSymZ;
uniform float uSymAngle;
uniform vec3 uSymOrder;
uniform vec3 uSymCenter;

// Varyings vers le fragment shader
out vec3 vPosition;
out vec3 vWorldPosition;
out vec3 vNormal;
out vec2 vUV;
out vec2 vUVParams;

${this.getUtilityFunctionsGLSL()}

// ============================================================
// DÉFORMATION PAR NORMALES (ondes de surface via sliders Norm/n)
// ============================================================
vec3 applyNormDeformation(vec3 pos, vec3 norm) {
	float xN = norm.x;
	float yN = norm.y;
	float zN = norm.z;

	vec3 displacement = vec3(0.0);

	if (normValX != 0.0) {
		displacement += cos(normValX * xN) * normCoeffX * norm;
	}
	if (normValY != 0.0) {
		displacement += cos(normValY * yN) * normCoeffY * norm;
	}
	if (normValZ != 0.0) {
		displacement += cos(normValZ * zN) * normCoeffZ * norm;
	}

	return pos + displacement;
}

// ============================================================
// FONCTION DE DÉFORMATION (éditable via l'éditeur de shader normal)
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
	float xzLen = length(pos.xz);
	float O = atan(pos.y, xzLen);

	float i = aIndex.x;
	float j = aIndex.y;
	float n = i * uStepsV + j;
	float k = mod(i, 2.0) < 1.0 ? -1.0 : 1.0;
	float d = mod(j, 2.0) < 1.0 ? -1.0 : 1.0;
	float p = k < 0.0 ? -u : u;
	float w = d < 0.0 ? -v : v;

	${glslDeformBlock}
}

void main() {
	float i = aIndex.x;
	float j = aIndex.y;

	// Dériver u, v à partir des indices de grille
	float u = uMinU + i * uStepU;
	float v = uMinV + j * uStepV;

	// Position et normale directement depuis les attributs
	vec3 pos = position;
	vec3 norm = normalize(normal);

	if (any(isnan(norm)) || any(isinf(norm))) {
		float posLen = length(pos);
		norm = posLen > 0.001 ? pos / posLen : vec3(0.0, 1.0, 0.0);
	}

	// Déformation par normales (ondes de surface via sliders)
	pos = applyNormDeformation(pos, norm);

	// Déformation le long de la normale (si activée)
	vec3 finalPosition = pos;
	if (deformationEnabled == 1) {
		float deform = computeDeformation(u, v, pos, norm) * scaleNorm;
		finalPosition = pos + norm * deform;
	}

	// Sorties
	gl_Position = worldViewProjection * vec4(finalPosition, 1.0);
	vWorldPosition = (world * vec4(finalPosition, 1.0)).xyz;
	vPosition = finalPosition;
	vNormal = normalize((world * vec4(norm, 0.0)).xyz);
	vUV = vec2(i / max(uStepsU, 1.0), j / max(uStepsV, 1.0));
	vUVParams = vec2(u, v);
}`;
	}

	/**
	 * Crée un shader mesh à partir d'un mesh importé (OBJ).
	 * Le mesh importé fournit les positions/normales/indices réels.
	 * Les shaders de couleur (fragment) et de déformation s'appliquent dessus.
	 *
	 * @param {Float32Array} positions - Positions des vertices (x,y,z,x,y,z,...)
	 * @param {Float32Array} normals - Normales des vertices
	 * @param {Uint32Array|Int32Array|Array} indices - Indices de triangulation
	 * @param {number} stepsU - Nombre de pas en U (colonnes de la grille)
	 * @param {number} stepsV - Nombre de pas en V (lignes de la grille)
	 * @returns {BABYLON.Mesh|null}
	 */
	createFromImportedMesh(positions, normals, indices, stepsU, stepsV) {
		// Sauvegarder l'état importé
		this._importedMode = true;

		// Obtenir l'expression de déformation éventuelle
		const deformText = glo.input_sym_r ? glo.input_sym_r.text : null;
		const hasDeformation = deformText && deformText.trim() && glo.deformationEnabled;
		this._lastDeformExpression = hasDeformation ? deformText : null;
		this._deformationActive = !!hasDeformation;

		// Générer les shaders (vertex adapté import + fragment normal)
		const vertexShader = this.createImportVertexShader(hasDeformation ? deformText : null);
		const fragmentShader = this.createFragmentShader();

		// Valider le vertex shader
		const validation = this.computer.validateShader(vertexShader);
		if (!validation.valid) {
			console.error('[Import] Vertex shader invalide:', validation.error);
			return null;
		}

		if (glo.ribbon) { ribbonDispose(); }

		// Mettre à jour les paramètres de grille
		this.nb_steps_u = stepsU;
		this.nb_steps_v = stepsV;
		this.step_u = (this.max_u - this.min_u) / Math.max(this.nb_steps_u, 1);
		this.step_v = (this.max_v - this.min_v) / Math.max(this.nb_steps_v, 1);

		// Créer le mesh Babylon avec les vraies positions
		this.mesh = new BABYLON.Mesh("importedShaderMesh", this.computer.scene);

		const vertexData = new BABYLON.VertexData();
		vertexData.positions = positions;
		vertexData.normals = normals;
		vertexData.indices = indices;
		vertexData.applyToMesh(this.mesh, true);

		// Ajouter l'attribut aIndex (indices de grille i,j) pour les fonctions de déformation
		const numVertices = positions.length / 3;
		const aIndexData = new Float32Array(numVertices * 2);
		for (let idx = 0; idx < numVertices; idx++) {
			const i = Math.floor(idx / (stepsV + 1));
			const j = idx % (stepsV + 1);
			aIndexData[idx * 2] = i;
			aIndexData[idx * 2 + 1] = j;
		}
		this.mesh.setVerticesData("aIndex", aIndexData, false, 2);

		// Attacher l'instance
		this.mesh.shaderMeshInstance = this;

		// Créer le ShaderMaterial
		this.shaderMaterial = this._createShaderMaterial(vertexShader, fragmentShader);

		glo.shaderRenderObserver = glo.scene.onBeforeRenderObservable.add(() => {
			this.shaderMaterial.setFloat("time", performance.now() * 0.001);
			this.shaderMaterial.setFloat("t", performance.now() * 0.001);
			this.shaderMaterial.setVector3("cameraPosition", glo.scene.activeCamera.position);
		});

		// Configurer les uniforms
		this.updateAllUniforms(hasDeformation);

		// Propriétés de rendu
		this.shaderMaterial.backFaceCulling = false;
		this.shaderMaterial.sideOrientation = BABYLON.Material.DoubleSide;
		this.mesh.material = this.shaderMaterial;

		// Observer caméra
		this.cameraObserver = this.computer.scene.onBeforeRenderObservable.add(() => {
			this.updateCamera();
		});

		return this.mesh;
	}

	/**
	 * Met à jour l'expression de déformation pour un mesh importé.
	 * Recompile le vertex shader import (pas le vertex shader paramétrique).
	 */
	updateImportDeformationExpression(expression = null) {
		if (!this.mesh || !this._importedMode) return false;

		const deformText = expression || (glo.input_sym_r ? glo.input_sym_r.text : null);
		const hasDeformation = deformText && deformText.trim();

		this._lastDeformExpression = hasDeformation ? deformText : null;
		this._deformationActive = !!hasDeformation;

		const vertexShader = this.createImportVertexShader(hasDeformation ? deformText : null);
		const fragmentShader = this.createFragmentShader();

		const validation = this.computer.validateShader(vertexShader);
		if (!validation.valid) return false;

		if (this.shaderMaterial) {
			this.shaderMaterial.dispose();
		}

		this.shaderMaterial = this._createShaderMaterial(vertexShader, fragmentShader);
		this.updateAllUniforms(hasDeformation);

		this.shaderMaterial.backFaceCulling = false;
		this.shaderMaterial.sideOrientation = 1;
		this.mesh.material = this.shaderMaterial;

		return true;
	}

	// ==================== EXPORT : EXTRACTION DES POSITIONS VIA TRANSFORM FEEDBACK ====================

	/**
	 * Extrait les positions et normales des vertices depuis le GPU via Transform Feedback.
	 * Opération ponctuelle pour l'export (STL, OBJ…) — ne modifie pas le pipeline de rendu normal.
	 * Utilise le contexte WebGL2 séparé (this.computer.gl) pour ne pas interférer avec Babylon.
	 *
	 * @returns {{positions: Float32Array, normals: Float32Array, indices: Uint32Array}|null}
	 */
	extractPositionsForExport() {
		if (!this.mesh || !this.shaderMaterial) return null;

		const gl = this.computer.gl;
		if (!gl) return null;

		// --- 1. Générer les sources shader ---
		// Utiliser l'état de déformation stocké sur l'instance (fiable)
		// plutôt que glo.deformationEnabled (peut être désynchronisé)
		const deformText = this._lastDeformExpression
			|| (glo.input_sym_r ? glo.input_sym_r.text : null);
		const hasDeformation = deformText && deformText.trim() && this._deformationActive;
		const vertexSource = this._importedMode
			? this.createImportVertexShader(hasDeformation ? deformText : null)
			: this.createVertexShader(hasDeformation ? deformText : null);

		// Fragment shader minimal (requis par WebGL2 même avec RASTERIZER_DISCARD)
		const fragmentSource = `#version 300 es
precision highp float;
out vec4 fragColor;
void main() { fragColor = vec4(0.0); }`;

		// --- 2. Compiler les shaders ---
		const vs = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vs, vertexSource);
		gl.compileShader(vs);
		if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
			console.error('[Export] Vertex shader compilation error:', gl.getShaderInfoLog(vs));
			gl.deleteShader(vs);
			return null;
		}

		const fs = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fs, fragmentSource);
		gl.compileShader(fs);
		if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
			console.error('[Export] Fragment shader compilation error:', gl.getShaderInfoLog(fs));
			gl.deleteShader(vs);
			gl.deleteShader(fs);
			return null;
		}

		// --- 3. Créer le programme avec Transform Feedback ---
		const program = gl.createProgram();
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.transformFeedbackVaryings(program, ['vPosition', 'vNormal'], gl.SEPARATE_ATTRIBS);
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error('[Export] Program link error:', gl.getProgramInfoLog(program));
			gl.deleteShader(vs);
			gl.deleteShader(fs);
			gl.deleteProgram(program);
			return null;
		}

		gl.useProgram(program);

		// --- 4. Récupérer les données d'attributs depuis le mesh Babylon ---
		const aIndexData = new Float32Array(this.mesh.getVerticesData('aIndex'));
		const positionData = new Float32Array(this.mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind));
		const indexData = this.mesh.getIndices();
		const numVertices = aIndexData.length / 2;

		// --- 5. Créer un VAO et les buffers d'attributs ---
		const vao = gl.createVertexArray();
		gl.bindVertexArray(vao);

		const aIndexBuf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, aIndexBuf);
		gl.bufferData(gl.ARRAY_BUFFER, aIndexData, gl.STATIC_DRAW);
		const aIndexLoc = gl.getAttribLocation(program, 'aIndex');
		if (aIndexLoc >= 0) {
			gl.enableVertexAttribArray(aIndexLoc);
			gl.vertexAttribPointer(aIndexLoc, 2, gl.FLOAT, false, 0, 0);
		}

		const posBuf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
		gl.bufferData(gl.ARRAY_BUFFER, positionData, gl.STATIC_DRAW);
		const posLoc = gl.getAttribLocation(program, 'position');
		if (posLoc >= 0) {
			gl.enableVertexAttribArray(posLoc);
			gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
		}

		// Buffer normal (nécessaire en mode import, ignoré sinon via getAttribLocation = -1)
		let normalBuf = null;
		const normalData = this.mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind);
		if (normalData) {
			normalBuf = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, normalBuf);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalData), gl.STATIC_DRAW);
			const normalLoc = gl.getAttribLocation(program, 'normal');
			if (normalLoc >= 0) {
				gl.enableVertexAttribArray(normalLoc);
				gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
			}
		}

		// --- 6. Configurer les uniforms ---
		this._setTFUniforms(gl, program, hasDeformation);

		// --- 7. Créer les buffers de Transform Feedback ---
		const tfPosBuf = gl.createBuffer();
		gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, tfPosBuf);
		gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, numVertices * 3 * 4, gl.STATIC_READ);

		const tfNormBuf = gl.createBuffer();
		gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, tfNormBuf);
		gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, numVertices * 3 * 4, gl.STATIC_READ);

		// --- 8. Exécuter le Transform Feedback ---
		const tf = gl.createTransformFeedback();
		gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
		gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, tfPosBuf);
		gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, tfNormBuf);

		gl.enable(gl.RASTERIZER_DISCARD);
		gl.beginTransformFeedback(gl.POINTS);
		gl.drawArrays(gl.POINTS, 0, numVertices);
		gl.endTransformFeedback();
		gl.disable(gl.RASTERIZER_DISCARD);

		// --- 9. Lire les résultats ---
		const positions = new Float32Array(numVertices * 3);
		gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, tfPosBuf);
		gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER, 0, positions);

		const normals = new Float32Array(numVertices * 3);
		gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, tfNormBuf);
		gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER, 0, normals);

		// --- 10. Nettoyage complet ---
		gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
		gl.bindVertexArray(null);
		gl.useProgram(null);
		gl.deleteTransformFeedback(tf);
		gl.deleteBuffer(tfPosBuf);
		gl.deleteBuffer(tfNormBuf);
		gl.deleteBuffer(aIndexBuf);
		gl.deleteBuffer(posBuf);
		if (normalBuf) gl.deleteBuffer(normalBuf);
		gl.deleteVertexArray(vao);
		gl.deleteShader(vs);
		gl.deleteShader(fs);
		gl.deleteProgram(program);

		return { positions, normals, indices: new Uint32Array(indexData) };
	}

	/**
	 * Configure tous les uniforms pour le programme Transform Feedback.
	 * Réplique updateAllUniforms() avec des appels WebGL2 bruts.
	 * @private
	 */
	_setTFUniforms(gl, program, deformationEnabled) {
		const loc = (name) => gl.getUniformLocation(program, name);

		const setF = (name, v) => { const l = loc(name); if (l) gl.uniform1f(l, v); };
		const setI = (name, v) => { const l = loc(name); if (l) gl.uniform1i(l, v); };
		const setV3 = (name, x, y, z) => { const l = loc(name); if (l) gl.uniform3f(l, x, y, z); };
		const setV4 = (name, x, y, z, w) => { const l = loc(name); if (l) gl.uniform4f(l, x, y, z, w); };
		const setM4 = (name, vals) => { const l = loc(name); if (l) gl.uniformMatrix4fv(l, false, vals); };

		// Matrices identité (on veut les positions en espace objet)
		const identity = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
		setM4('worldViewProjection', identity);
		setM4('world', identity);

		// Paramètres de grille
		setF('uMinU', this.min_u);
		setF('uMaxU', this.max_u);
		setF('uStepU', this.step_u);
		setF('uMinV', this.min_v);
		setF('uMaxV', this.max_v);
		setF('uStepV', this.step_v);
		setF('uStepsU', this.nb_steps_u);
		setF('uStepsV', this.nb_steps_v);

		// Variables utilisateur
		setF('A', glo.params.A);
		setF('B', glo.params.B);
		setF('C', glo.params.C);
		setF('D', glo.params.D);
		setF('E', glo.params.E);
		setF('F', glo.params.F);
		setF('G', glo.params.G);
		setF('H', glo.params.H);
		setF('I', glo.params.I);
		setF('J', glo.params.J);
		setF('K', glo.params.K);
		setF('L', glo.params.L);
		setF('M', glo.params.M);

		// Temps et epsilon
		setF('t', performance.now() * 0.001);
		setF('eps', 0.001);
		setF('scaleNorm', glo.scaleNorm || 1.0);
		setI('deformationEnabled', deformationEnabled ? 1 : 0);

		// Blender
		const bl = glo.params.blender;
		setV4('blendU', bl.u.x, bl.u.y, bl.u.z, 0);
		setV3('blendO', bl.O.x, bl.O.y, bl.O.z);

		// Transformations additionnelles
		setF('flatAmount', this.flatAmount);
		setF('twistAmount', this.twistAmount);
		setF('spherifyAmount', this.spherifyAmount);
		setF('normValX', this.normValX);
		setF('normCoeffX', this.normCoeffX);
		setF('normValY', this.normValY);
		setF('normCoeffY', this.normCoeffY);
		setF('normValZ', this.normValZ);
		setF('normCoeffZ', this.normCoeffZ);

		// Symétrie
		setF('uSymX', glo.params.symmetrizeX || 1);
		setF('uSymY', glo.params.symmetrizeY || 1);
		setF('uSymZ', glo.params.symmetrizeZ || 1);
		setF('uSymAngle', glo.params.symmetrizeAngle || Math.PI);
		const orderStr = (glo.symmetrizeOrder || 'xyz').toLowerCase();
		const axisMap = { x: 0.0, y: 1.0, z: 2.0 };
		setV3('uSymOrder',
			axisMap[orderStr[0]] ?? 0.0,
			axisMap[orderStr[1]] ?? 1.0,
			axisMap[orderStr[2]] ?? 2.0
		);
		setV3('uSymCenter',
			glo.centerSymmetry.x || 0,
			glo.centerSymmetry.y || 0,
			glo.centerSymmetry.z || 0
		);

		// FirstPoint
		setV3('uFirstPoint',
			glo.firstPoint?.x || 1,
			glo.firstPoint?.y || 0,
			glo.firstPoint?.z || 0
		);
	}

	/**
	 * Crée un mesh Babylon.js temporaire avec les positions réelles calculées par le GPU.
	 * Utilisé pour l'export (STL, OBJ, etc.).
	 * @returns {BABYLON.Mesh|null}
	 */
	createExportMesh() {
		const data = this.extractPositionsForExport();
		if (!data) return null;

		const mesh = new BABYLON.Mesh('exportMesh', this.computer.scene);
		const vertexData = new BABYLON.VertexData();
		vertexData.positions = data.positions;
		vertexData.normals = data.normals;
		vertexData.indices = data.indices;
		vertexData.applyToMesh(mesh);

		return mesh;
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
		theta: glo.params.text_input_theta,    // ROT X
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
		
		// Assignation correcte des axes
		const glslTheta = this.computer.transformExpressionToGLSL(this.equa.theta || '0.0'); // ROT X
		const glslBeta  = this.computer.transformExpressionToGLSL(this.equa.beta || '0.0');  // ROT Y
		const glslAlpha = this.computer.transformExpressionToGLSL(this.equa.alpha || '0.0'); // ROT Z

		return `
		// 1. Définition explicite des coordonnées (comme dans votre original)
		float px = ${glslX};
		float py = ${glslY};
		float pz = ${glslZ};

		float theta = ${glslTheta};
		float beta  = ${glslBeta};
		float alpha = ${glslAlpha};

		// 2. Rotation X (Theta) -> Modifie Y et Z
		if (theta != 0.0) {
			float c = cos(theta);
			float s = sin(theta);
			float tempY = py * c - pz * s;
			float tempZ = py * s + pz * c;
			py = tempY;
			pz = tempZ;
		}

		// 3. Rotation Y (Beta) -> Modifie X et Z
		if (beta != 0.0) {
			float c = cos(beta);
			float s = sin(beta);
			float tempX = px * c + pz * s;
			float tempZ = -px * s + pz * c; // Notez le signe inversé classique en Y
			px = tempX;
			pz = tempZ;
		}

		// 4. Rotation Z (Alpha) -> Modifie X et Y
		if (alpha != 0.0) {
			float c = cos(alpha);
			float s = sin(alpha);
			float tempX = px * c - py * s;
			float tempY = px * s + py * c;
			px = tempX;
			py = tempY;
		}

		// Sortie finale
		outPos = vec3(px, py, pz);
	`;
	}
}

// ==================== SYSTEME SPHERIQUE (à implémenter) ====================

class ShaderMeshSpherical extends ShaderMeshBase {
	/**
	 * Coordonnées sphériques : R = rayon, ROT Z = alpha, ROT Y = beta
	 * Avec rotations secondaires ROT Z (alpha2) et ROT Y (beta2)
	 */
	constructor(parametres = {
		u: { min: -glo.params.u, max: glo.params.u, nb_steps: glo.params.steps_u },
		v: { min: -glo.params.v, max: glo.params.v, nb_steps: glo.params.steps_v },
	}, equa = {
		r: glo.params.text_input_x,         // R
		alpha: glo.params.text_input_y,      // ROT Z
		beta: glo.params.text_input_z,       // ROT Y
		alpha2: glo.params.text_input_alpha,  // ROT Z secondaire
		beta2: glo.params.text_input_beta,   // ROT Y secondaire
		theta: glo.params.text_input_theta,   // ROT Y secondaire
	}, equa2, dimOne, fractalize) {
		super(parametres, equa, equa2, dimOne, fractalize);
		this.coordSystem = 'spheric';
	}

	/**
	 * @override
	 */
	getPositionGLSL() {
		const glslR = this.computer.transformExpressionToGLSL(this.equa.r || '1.0');
		const glslAlpha = this.computer.transformExpressionToGLSL(this.equa.beta || '0.0');
		const glslBeta = this.computer.transformExpressionToGLSL(this.equa.alpha || '0.0');
		const glslAlpha2 = this.computer.transformExpressionToGLSL(this.equa.alpha2 || '0.0');
		const glslBeta2 = this.computer.transformExpressionToGLSL(this.equa.beta2 || '0.0');
		const glslTheta = this.computer.transformExpressionToGLSL(this.equa.theta || '0.0');

		return `
	// Coordonnées sphériques
	float sphR = ${glslR};
	float sphAlpha = ${glslAlpha};
	float sphBeta = ${glslBeta};

	// Point de départ : uFirstPoint * R
	vec3 pt = uFirstPoint * sphR;

	// Rotation Y (beta) puis Z (alpha)
	pt = rotateAxis(vec3(0.0, 1.0, 0.0), sphBeta) * pt;
	pt = rotateAxis(vec3(0.0, 0.0, 1.0), sphAlpha) * pt;

	float px = pt.x;
	float py = pt.y;
	float pz = pt.z;

	// Rotations secondaires
	float alpha = ${glslAlpha2};
	float beta  = ${glslBeta2};
	float theta = ${glslTheta};

	// 2. Rotation X (Theta) -> Modifie Y et Z
	if (theta != 0.0) {
		float c = cos(theta);
		float s = sin(theta);
		float tempY = py * c - pz * s;
		float tempZ = py * s + pz * c;
		py = tempY;
		pz = tempZ;
	}

	// 3. Rotation Y (Beta) -> Modifie X et Z
	if (beta != 0.0) {
		float c = cos(beta);
		float s = sin(beta);
		float tempX = px * c + pz * s;
		float tempZ = -px * s + pz * c; // Notez le signe inversé classique en Y
		px = tempX;
		pz = tempZ;
	}

	// 4. Rotation Z (Alpha) -> Modifie X et Y
	if (alpha != 0.0) {
		float c = cos(alpha);
		float s = sin(alpha);
		float tempX = px * c - py * s;
		float tempY = px * s + py * c;
		px = tempX;
		py = tempY;
	}

	outPos = vec3(px, py, pz);
`;
	}
}

// ==================== SYSTEME CYLINDRIQUE (à implémenter) ====================

class ShaderMeshCylindrical extends ShaderMeshBase {
	/**
	 * Coordonnées cylindriques : R = rayon, ROT Z = alpha, Z = hauteur (beta)
	 * Avec rotations secondaires ROT Z (alpha2) et ROT Y (beta2)
	 */
	constructor(parametres = {
		u: { min: -glo.params.u, max: glo.params.u, nb_steps: glo.params.steps_u },
		v: { min: -glo.params.v, max: glo.params.v, nb_steps: glo.params.steps_v },
	}, equa = {
		r: glo.params.text_input_x,         // R
		alpha: glo.params.text_input_y,      // ROT Z
		beta: glo.params.text_input_z,       // Z (hauteur)
		alpha2: glo.params.text_input_alpha,  // ROT Z secondaire
		beta2: glo.params.text_input_beta,    // ROT Y secondaire
		theta: glo.params.text_input_theta,    // ROT Y secondaire
	}, equa2, dimOne, fractalize) {
		super(parametres, equa, equa2, dimOne, fractalize);
		this.coordSystem = 'cylindrical';
	}

	/**
	 * @override
	 */
	getPositionGLSL() {
		const glslR      = this.computer.transformExpressionToGLSL(this.equa.r || '1.0');
		const glslAlpha  = this.computer.transformExpressionToGLSL(this.equa.alpha || '0.0');
		const glslBeta   = this.computer.transformExpressionToGLSL(this.equa.beta || '0.0');
		const glslAlpha2 = this.computer.transformExpressionToGLSL(this.equa.alpha2 || '0.0');
		const glslBeta2  = this.computer.transformExpressionToGLSL(this.equa.beta2 || '0.0');
		const glslTheta  = this.computer.transformExpressionToGLSL(this.equa.theta || '0.0');

		return `
			// Coordonnées cylindriques
			float cylR = ${glslR};
			float cylAlpha = ${glslAlpha};
			float cylHeight = ${glslBeta};

			// Point de départ : uFirstPoint * R
			vec3 pt = uFirstPoint * cylR;

			// Rotation Z (alpha) uniquement
			pt = rotateAxis(vec3(0.0, 0.0, 1.0), cylAlpha) * pt;

			// Hauteur = beta
			float px = pt.x;
			float py = pt.y;
			float pz = cylHeight;

			// Rotations secondaires
			float alpha = ${glslAlpha2};
			float beta  = ${glslBeta2};
			float theta = ${glslTheta};

			// 2. Rotation X (Theta) -> Modifie Y et Z
			if (theta != 0.0) {
				float c = cos(theta);
				float s = sin(theta);
				float tempY = py * c - pz * s;
				float tempZ = py * s + pz * c;
				py = tempY;
				pz = tempZ;
			}

			// 3. Rotation Y (Beta) -> Modifie X et Z
			if (beta != 0.0) {
				float c = cos(beta);
				float s = sin(beta);
				float tempX = px * c + pz * s;
				float tempZ = -px * s + pz * c; // Notez le signe inversé classique en Y
				px = tempX;
				pz = tempZ;
			}

			// 4. Rotation Z (Alpha) -> Modifie X et Y
			if (alpha != 0.0) {
				float c = cos(alpha);
				float s = sin(alpha);
				float tempX = px * c - py * s;
				float tempY = px * s + py * c;
				px = tempX;
				py = tempY;
			}

			outPos = vec3(px, py, pz);
		`;
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