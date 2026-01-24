/**
 * Classes GPU pour le calcul des paths du ribbon selon différents systèmes de coordonnées
 *
 * APPROCHE : Utilisation de WebGL2 Transform Feedback pour calculer les positions sur le GPU
 * L'expression mathématique est injectée directement dans le code GLSL (concaténation de strings)
 * AUCUN eval() ni new Function() - le navigateur compile le GLSL nativement.
 *
 * Le GPU calcule TOUS les points en parallèle, puis on récupère les résultats via Transform Feedback.
 */

// ==================== GESTIONNAIRE WebGL2 ====================

class WebGL2MeshComputer {
	constructor() {
		// Créer un canvas offscreen pour WebGL2
		this.canvas = document.createElement('canvas');
		this.gl = this.canvas.getContext('webgl2');

		if (!this.gl) {
			console.error('WebGL2 non supporté');
			this.supported = false;
			return;
		}

		this.supported = true;
		this.programs = new Map(); // Cache des programmes compilés
	}

	/**
	 * Transforme une expression mathématique en GLSL valide
	 */
	transformExpressionToGLSL(expr) {
		if (!expr || expr.trim() === '') return '0.0';

		let result = expr;

		// Remplacer les constantes
		result = result.replace(/\bPI\b/g, '3.14159265358979');
		result = result.replace(/\bpi\b/g, '3.14159265358979');
		result = result.replace(/\bep\b/g, '2.71828182845905');
		result = result.replace(/\be\b(?![xp])/g, '2.71828182845905');
		result = result.replace(/\bQ\b/g, '1.41421356237310');
		result = result.replace(/\bZ\b/g, '1.61803398874989');

		// GLSL utilise les mêmes noms de fonctions que JavaScript
		// sin, cos, tan, asin, acos, atan, sqrt, pow, exp, log, abs, sign, floor, ceil, min, max
		// sinh, cosh, tanh sont aussi supportés en GLSL

		// Fonction hypot -> length pour 2 args, ou calcul manuel
		result = result.replace(/\bhypot\s*\(\s*([^,]+)\s*,\s*([^,)]+)\s*\)/g, 'length(vec2($1, $2))');
		result = result.replace(/\bh\s*\(\s*([^,]+)\s*,\s*([^,)]+)\s*\)/g, 'length(vec2($1, $2))');
		result = result.replace(/\bhypot\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/g, 'length(vec3($1, $2, $3))');
		result = result.replace(/\bh\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/g, 'length(vec3($1, $2, $3))');

		// ** en GLSL c'est pow()
		//result = result.replace(/\*\*/g, '^POW^');
		//result = result.replace(/([a-zA-Z0-9_.()]+)\s*\^POW\^\s*([a-zA-Z0-9_.()]+)/g, 'pow($1, $2)');

		result = this.replacePow(result);

		// S'assurer que les nombres ont un point décimal pour GLSL
		//result = result.replace(/\b(\d+)(?![\d.])/g, '$1.0');
		result = result.replace(/(?<!\.\d*)(\b\d+\b)(?!\.)/g, '$1.0');

		// Corriger les doubles points
		//result = result.replace(/\.0\.0/g, '.0');
		//result = result.replace(/(\d+)\.0\.0/g, '$1.0');

		return result;
	}

	replacePow(expr) {
		let result = expr.replace(/\*\*/g, '^POW^');
		
		const powIndex = result.indexOf('^POW^');
		if (powIndex === -1) return result;
		
		// Trouver l'opérande gauche (remonter les parenthèses)
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
		
		// Trouver l'opérande droit
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
	 * Crée le vertex shader GLSL avec les expressions injectées
	 */
	createVertexShader(exprX, exprY, exprZ, exprAlpha, exprBeta, coordSystem = 'cartesian') {
		const glslX = this.transformExpressionToGLSL(exprX);
		const glslY = this.transformExpressionToGLSL(exprY);
		const glslZ = this.transformExpressionToGLSL(exprZ);
		const glslAlpha = this.transformExpressionToGLSL(exprAlpha || '0.0');
		const glslBeta = this.transformExpressionToGLSL(exprBeta || '0.0');

		let positionCalculation;

		if (coordSystem === 'cartesian') {
			positionCalculation = `
				// Coordonnées cartésiennes
				float px = ${glslX};
				float py = ${glslY};
				float pz = ${glslZ};

				// Rotation si alpha et beta définis
				float alpha = ${glslAlpha};
				float beta = ${glslBeta};

				if (alpha != 0.0 || beta != 0.0) {
					float cosA = cos(alpha);
					float sinA = sin(alpha);
					float cosB = cos(beta);
					float sinB = sin(beta);

					// Rotation Y puis Z
					float x1 = px * cosB - pz * sinB;
					float z1 = px * sinB + pz * cosB;
					float x2 = x1 * cosA - py * sinA;
					float y2 = x1 * sinA + py * cosA;

					px = x2;
					py = y2;
					pz = z1;
				}

				outPosition = vec3(px, py, pz);
			`;
		} else if (coordSystem === 'spheric') {
			positionCalculation = `
				// Coordonnées sphériques
				float r = ${glslX};
				float alpha = ${glslY};
				float beta = ${glslZ};

				if (isinf(r) || isnan(r)) r = 0.0;

				// Point initial * r
				vec3 sp = uFirstPoint * r;

				// Rotation sphérique
				float cosAlpha = cos(alpha);
				float sinAlpha = sin(alpha);
				float cosBeta = cos(beta);
				float sinBeta = sin(beta);

				

				// Rotation Y (beta)
				float x1 = sp.x * cosAlpha - sp.y * sinAlpha;
				float y1 = sp.x * sinAlpha + sp.y * cosAlpha;
				float z1 = sp.z;

				// Rotation Z (alpha)
				float px = x1 * cosBeta + z1 * sinBeta;
				float py = y1;
				float pz = -x1 * sinBeta + z1 * cosBeta;



				// Rotation secondaire
				float alpha2 = ${glslAlpha};
				float beta2 = ${glslBeta};

				if (alpha2 != 0.0 || beta2 != 0.0) {
					float cosA2 = cos(alpha2);
					float sinA2 = sin(alpha2);
					float cosB2 = cos(beta2);
					float sinB2 = sin(beta2);

					float x2 = px * cosB2 - pz * sinB2;
					float z2 = px * sinB2 + pz * cosB2;
					float x3 = x2 * cosA2 - py * sinA2;
					float y3 = x2 * sinA2 + py * cosA2;

					px = x3;
					py = y3;
					pz = z2;
				}

				outPosition = vec3(px, py, pz);
			`;
		} else if (coordSystem === 'cylindrical') {
			positionCalculation = `
				// Coordonnées cylindriques
				float r = ${glslX};
				float alpha = ${glslY};
				float height = ${glslZ};

				if (isinf(r) || isnan(r)) r = 0.0;

				// Rotation autour de Z
				float cosAlpha = cos(alpha);
				float sinAlpha = sin(alpha);

				float px = uFirstPoint.x * r * cosAlpha - uFirstPoint.y * r * sinAlpha;
				float py = uFirstPoint.x * r * sinAlpha + uFirstPoint.y * r * cosAlpha;
				float pz = height;

				// Rotation secondaire
				float alpha2 = ${glslAlpha};
				float beta2 = ${glslBeta};

				if (alpha2 != 0.0 || beta2 != 0.0) {
					float cosA2 = cos(alpha2);
					float sinA2 = sin(alpha2);
					float cosB2 = cos(beta2);
					float sinB2 = sin(beta2);

					float x2 = px * cosB2 - pz * sinB2;
					float z2 = px * sinB2 + pz * cosB2;
					float x3 = x2 * cosA2 - py * sinA2;
					float y3 = x2 * sinA2 + py * cosA2;

					px = x3;
					py = y3;
					pz = z2;
				}

				outPosition = vec3(px, py, pz);
			`;
		} else if (coordSystem === 'curvature') {
			// Pour la courbure, on calcule les deltas
			positionCalculation = `
				// Système par courbure - calcul des deltas
				float r = ${glslX};
				float alpha = ${glslY};
				float beta = ${glslZ};

				if (isinf(r) || isnan(r)) r = 0.0;

				float cosAlpha = cos(alpha);
				float sinAlpha = sin(alpha);
				float cosBeta = cos(beta);
				float sinBeta = sin(beta);

				// Delta de déplacement
				float dx = r * cosAlpha * cosBeta;
				float dy = r * sinAlpha * cosBeta;
				float dz = r * sinBeta;

				outPosition = vec3(dx, dy, dz);
			`;
		}

		return `#version 300 es
			precision highp float;

			// Attributs d'entrée (indices i, j)
			in vec2 aIndex;

			float cpow(float val, float exp){
				return sign(val) * pow(abs(val), exp);
			}

			float c(float val){ return cos(val); }
			float s(float val){ return sin(val); }

			// Uniforms
			uniform float uMinU;
			uniform float uStepU;
			uniform float uMinV;
			uniform float uStepV;
			uniform float uStepsV;
			uniform float A, B, C, D, E, F, G, H, I, J, K, L;
			uniform float w;
			uniform vec3 uFirstPoint;
			uniform vec4 blendU;
			uniform vec3 blendO;
			uniform int isBlend;

			// Sortie pour Transform Feedback
			out vec3 outPosition;

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

			void main() {
				float i = aIndex.x;
				float j = aIndex.y;

				float u = uMinU + i * uStepU;
				float v = uMinV + j * uStepV;

				// Variables auxiliaires
				float d = mod(j, 2.0) == 0.0 ? -1.0 : 1.0;
				float k = mod(i, 2.0) == 0.0 ? -1.0 : 1.0;
				float p = mod(i, 2.0) == 0.0 ? -u : u;
				float t = mod(j, 2.0) == 0.0 ? -v : v;
				float n = i * (uStepsV + 1.0) + j;

				${positionCalculation}

				float R = length(outPosition);
                float O = R > 0.0001 ? asin(outPosition.y / R) : 0.0;

				// Application du blender si activé
				outPosition = rotateAxis(vec3(1.0, 0.0, 0.0), blendU.x * u) * outPosition;
				outPosition = rotateAxis(vec3(0.0, 1.0, 0.0), blendU.y * u) * outPosition;
				outPosition = rotateAxis(vec3(0.0, 0.0, 1.0), blendU.z * u) * outPosition;
				outPosition = rotateAxis(vec3(1.0, 0.0, 0.0), blendO.x * O) * outPosition;
				outPosition = rotateAxis(vec3(0.0, 1.0, 0.0), blendO.y * O) * outPosition;
				outPosition = rotateAxis(vec3(0.0, 0.0, 1.0), blendO.z * O) * outPosition;

				// Position factice pour le vertex shader (non utilisée)
				gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
			}
		`;
	}

	/**
	 * Compile un programme shader
	 */
	compileProgram(vertexSource) {
		const gl = this.gl;

		// Vertex shader
		const vertexShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertexShader, vertexSource);
		gl.compileShader(vertexShader);

		if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
			console.error('Erreur compilation vertex shader:', gl.getShaderInfoLog(vertexShader));
			console.error('Source:', vertexSource);
			gl.deleteShader(vertexShader);
			return null;
		}

		// Fragment shader minimal (requis mais non utilisé avec Transform Feedback)
		const fragmentSource = `#version 300 es
			precision highp float;
			out vec4 fragColor;
			void main() {
				fragColor = vec4(0.0);
			}
		`;

		const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragmentShader, fragmentSource);
		gl.compileShader(fragmentShader);

		if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
			console.error('Erreur compilation fragment shader:', gl.getShaderInfoLog(fragmentShader));
			gl.deleteShader(vertexShader);
			gl.deleteShader(fragmentShader);
			return null;
		}

		// Programme
		const program = gl.createProgram();
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);

		// Configurer Transform Feedback AVANT le linkage
		gl.transformFeedbackVaryings(program, ['outPosition'], gl.SEPARATE_ATTRIBS);

		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error('Erreur linkage programme:', gl.getProgramInfoLog(program));
			gl.deleteProgram(program);
			gl.deleteShader(vertexShader);
			gl.deleteShader(fragmentShader);
			return null;
		}

		// Cleanup shaders (attachés au programme)
		gl.deleteShader(vertexShader);
		gl.deleteShader(fragmentShader);

		return program;
	}

	/**
	 * Calcule les positions sur le GPU
	 * @returns {Float32Array} Positions [x,y,z,x,y,z,...]
	 */
	compute(options) {
		if (!this.supported) return null;

		const {
			stepsU, stepsV,
			minU, stepU, minV, stepV,
			exprX, exprY, exprZ, exprAlpha, exprBeta,
			A, B, C, D, E, F, G, H, I, J, K, L,
			w,
			firstPoint,
			coordSystem
		} = options;

		const gl = this.gl;
		const totalPoints = (stepsU + 1) * (stepsV + 1);

		// Créer le vertex shader avec les expressions injectées
		const vertexSource = this.createVertexShader(exprX, exprY, exprZ, exprAlpha, exprBeta, coordSystem);

		// Compiler le programme
		const program = this.compileProgram(vertexSource);
		if (!program) return null;

		gl.useProgram(program);

		// Créer le buffer d'indices (i, j)
		const indices = new Float32Array(totalPoints * 2);
		let idx = 0;
		for (let i = 0; i <= stepsU; i++) {
			for (let j = 0; j <= stepsV; j++) {
				indices[idx++] = i;
				indices[idx++] = j;
			}
		}

		// Buffer d'entrée
		const indexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, indexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, indices, gl.STATIC_DRAW);

		// Configurer l'attribut
		const aIndexLoc = gl.getAttribLocation(program, 'aIndex');
		gl.enableVertexAttribArray(aIndexLoc);
		gl.vertexAttribPointer(aIndexLoc, 2, gl.FLOAT, false, 0, 0);

		const isBlend = isBlender();
		const blenderInfos = glo.params.blender;

		// Uniforms
		gl.uniform1f(gl.getUniformLocation(program, 'uMinU'), minU);
		gl.uniform1f(gl.getUniformLocation(program, 'uStepU'), stepU);
		gl.uniform1f(gl.getUniformLocation(program, 'uMinV'), minV);
		gl.uniform1f(gl.getUniformLocation(program, 'uStepV'), stepV);
		gl.uniform1f(gl.getUniformLocation(program, 'uStepsV'), stepsV);
		gl.uniform1f(gl.getUniformLocation(program, 'isBlend'), isBlend ? 1.0 : 0.0);
		gl.uniform4f(gl.getUniformLocation(program, 'blendU'), blenderInfos.u.x, blenderInfos.u.y, blenderInfos.u.z, blenderInfos.u.x + blenderInfos.u.y + blenderInfos.u.z);
		gl.uniform3f(gl.getUniformLocation(program, 'blendO'), blenderInfos.O.x, blenderInfos.O.y, blenderInfos.O.z);
		gl.uniform1f(gl.getUniformLocation(program, 'A'), A || 0);
		gl.uniform1f(gl.getUniformLocation(program, 'B'), B || 0);
		gl.uniform1f(gl.getUniformLocation(program, 'C'), C || 0);
		gl.uniform1f(gl.getUniformLocation(program, 'D'), D || 0);
		gl.uniform1f(gl.getUniformLocation(program, 'E'), E || 0);
		gl.uniform1f(gl.getUniformLocation(program, 'F'), F || 0);
		gl.uniform1f(gl.getUniformLocation(program, 'G'), G || 1);
		gl.uniform1f(gl.getUniformLocation(program, 'H'), H || 1);
		gl.uniform1f(gl.getUniformLocation(program, 'I'), I || 1);
		gl.uniform1f(gl.getUniformLocation(program, 'J'), J || 1);
		gl.uniform1f(gl.getUniformLocation(program, 'K'), K || 1);
		gl.uniform1f(gl.getUniformLocation(program, 'L'), L || 1);
		gl.uniform1f(gl.getUniformLocation(program, 'w'), w || 0);
		gl.uniform3f(gl.getUniformLocation(program, 'uFirstPoint'),
			firstPoint?.x || 1, firstPoint?.y || 0, firstPoint?.z || 0);

		// Buffer de sortie pour Transform Feedback
		const outputBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, outputBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, totalPoints * 3 * 4, gl.STREAM_READ); // 3 floats * 4 bytes
		// IMPORTANT: Délier de ARRAY_BUFFER avant d'utiliser comme Transform Feedback target
		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		// Configurer Transform Feedback
		const transformFeedback = gl.createTransformFeedback();
		gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, transformFeedback);
		gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, outputBuffer);

		// Désactiver le rasterizer (on ne veut que le Transform Feedback)
		gl.enable(gl.RASTERIZER_DISCARD);

		// Exécuter le calcul GPU
		gl.beginTransformFeedback(gl.POINTS);
		gl.drawArrays(gl.POINTS, 0, totalPoints);
		gl.endTransformFeedback();

		// Réactiver le rasterizer
		gl.disable(gl.RASTERIZER_DISCARD);

		// Délier le buffer du Transform Feedback
		gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
		gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

		// Attendre que le GPU ait terminé (gl.finish est le plus fiable en WebGL)
		gl.finish();

		// Lire les résultats via COPY_READ_BUFFER (recommandé pour les lectures)
		const positions = new Float32Array(totalPoints * 3);
		gl.bindBuffer(gl.COPY_READ_BUFFER, outputBuffer);
		gl.getBufferSubData(gl.COPY_READ_BUFFER, 0, positions);
		gl.bindBuffer(gl.COPY_READ_BUFFER, null);

		// Cleanup
		gl.deleteTransformFeedback(transformFeedback);
		gl.deleteBuffer(indexBuffer);
		gl.deleteBuffer(outputBuffer);
		gl.deleteProgram(program);

		return positions;
	}

	/**
	 * Convertit les positions en paths de BABYLON.Vector3
	 */
	positionsToPaths(positions, stepsU, stepsV) {
		const paths = [];
		let idx = 0;

		for (let i = 0; i <= stepsU; i++) {
			const path = [];
			for (let j = 0; j <= stepsV; j++) {
				let x = positions[idx];
				let y = positions[idx + 1];
				let z = positions[idx + 2];

				// Gestion des valeurs invalides
				if (!isFinite(x) || isNaN(x)) x = 0;
				if (!isFinite(y) || isNaN(y)) y = 0;
				if (!isFinite(z) || isNaN(z)) z = 0;

				path.push(new BABYLON.Vector3(x, y, z));
				idx += 3;
			}
			paths.push(path);
		}

		return paths;
	}

	destroy() {
		if (this.gl) {
			const ext = this.gl.getExtension('WEBGL_lose_context');
			if (ext) ext.loseContext();
		}
	}
}

// Instance globale du computer WebGL2
let webgl2Computer = null;

function getWebGL2Computer() {
	if (!webgl2Computer) {
		webgl2Computer = new WebGL2MeshComputer();
	}
	return webgl2Computer;
}

// ==================== TRANSFORMATION D'EXPRESSION ====================

/**
 * Applique les transformations regex de glo.regs à une expression
 */
function applyGloRegsGPU(expr) {
	if (!expr || expr.trim() === '') return '0';

	let result = expr;

	for (const reg of glo.regs) {
		result = result.replace(reg.exp, reg.upd);
	}

	return result;
}

// ==================== CLASSE GPU BASE ====================

class CurveBaseGPU {
	constructor(parametres = {
		u: { min: -glo.params.u, max: glo.params.u, nb_steps: glo.params.steps_u },
		v: { min: -glo.params.v, max: glo.params.v, nb_steps: glo.params.steps_v },
	}, equa, equa2 = {
		x: glo.params.text_input_suit_x,
		y: glo.params.text_input_suit_y,
		z: glo.params.text_input_suit_z,
		alpha: glo.params.text_input_suit_alpha,
		beta: glo.params.text_input_suit_beta,
		theta: glo.params.text_input_suit_theta,
	}, dim_one = glo.dim_one, fractalize = false, onePoint = false) {

		// Appliquer les transformations regex aux équations
		this.processEquations(equa);
		this.processEquations(equa2);

		// Initialisation des paramètres u
		this.min_u = !glo.slidersUVOnOneSign.u ? parametres.u.min : 0;
		this.max_u = parametres.u.max;
		this.nb_steps_u = paramsOrFractNbPaths('u', parametres.u.nb_steps, fractalize);
		this.step_u = (this.max_u - this.min_u) / this.nb_steps_u;

		// Initialisation des paramètres v
		this.min_v = !glo.slidersUVOnOneSign.v ? parametres.v.min : 0;
		this.max_v = parametres.v.max;
		this.nb_steps_v = paramsOrFractNbPaths('v', parametres.v.nb_steps, fractalize);
		this.step_v = (this.max_v - this.min_v) / this.nb_steps_v;

		this.paths = [];
		this.uvInfos = isUV();

		this.equa = equa;
		this.equa2 = equa2;

		// Computer WebGL2
		this.computer = getWebGL2Computer();

		// Paramètres UI
		this.A = glo.params.A; this.B = glo.params.B;
		this.C = glo.params.C; this.D = glo.params.D;
		this.E = glo.params.E; this.F = glo.params.F;
		this.G = glo.params.G; this.H = glo.params.H;
		this.I = glo.params.I; this.J = glo.params.J;
		this.K = glo.params.K; this.L = glo.params.L;
		this.w = w;

		// Exécution
		if (onePoint) {
			return this.computeOnePoint();
		} else {
			this.compute();
			this.finalize();
		}
	}

	processEquations(equa) {
		if (!equa) return;
		for (let prop in equa) {
			if (typeof equa[prop] === 'string') {
				equa[prop] = applyGloRegsGPU(equa[prop]);
			}
		}
	}

	// À surcharger
	compute() {}

	computeOnePoint() {
		this.compute();
		return this.paths[0] && this.paths[0][1] ? this.paths[0][1] : BABYLON.Vector3.Zero();
	}

	finalize() {
		if (glo.closeFirstWithLastPath && this.paths.length > 0) {
			this.paths.push(this.paths[0]);
		}
		glo.lines = this.paths;
		this.pathsSave = this.paths.slice();
		this.onFinalize();
	}

	onFinalize() {}
}

// ==================== SYSTÈME CARTÉSIEN GPU ====================

class CurvesCartesianGPU extends CurveBaseGPU {
	constructor(parametres = {
		u: { min: -glo.params.u, max: glo.params.u, nb_steps: glo.params.steps_u },
		v: { min: -glo.params.v, max: glo.params.v, nb_steps: glo.params.steps_v },
	}, equa = {
		x: glo.params.text_input_x,
		y: glo.params.text_input_y,
		z: glo.params.text_input_z,
		alpha: glo.params.text_input_alpha,
		beta: glo.params.text_input_beta,
	}, equa2, dim_one, fractalize, onePoint) {
		super(parametres, equa, equa2, dim_one, fractalize, onePoint);
	}

	compute() {
		const stepsU = this.uvInfos.isU ? this.nb_steps_u : 0;
		const stepsV = this.uvInfos.isV ? this.nb_steps_v : 0;

		const positions = this.computer.compute({
			stepsU, stepsV,
			minU: this.min_u, stepU: this.step_u,
			minV: this.min_v, stepV: this.step_v,
			exprX: this.equa.x || 'u',
			exprY: this.equa.y || 'v',
			exprZ: this.equa.z || '0',
			exprAlpha: this.equa.alpha || '0',
			exprBeta: this.equa.beta || '0',
			A: this.A, B: this.B, C: this.C, D: this.D,
			E: this.E, F: this.F, G: this.G, H: this.H,
			I: this.I, J: this.J, K: this.K, L: this.L,
			w: this.w,
			firstPoint: glo.firstPoint,
			coordSystem: 'cartesian'
		});

		if (positions) {
			this.paths = this.computer.positionsToPaths(positions, stepsU, stepsV);
		}

		if (!this.uvInfos.isV && this.paths.length > 0) {
			this.paths[0] = this.paths.flat();
		}
	}
}

// ==================== SYSTÈME SPHÉRIQUE GPU ====================

class CurvesSphericalGPU extends CurveBaseGPU {
	constructor(parametres = {
		u: { min: -glo.params.u, max: glo.params.u, nb_steps: glo.params.steps_u },
		v: { min: -glo.params.v, max: glo.params.v, nb_steps: glo.params.steps_v },
	}, equa = {
		r: glo.params.text_input_x,
		alpha: glo.params.text_input_y,
		beta: glo.params.text_input_z,
		alpha2: glo.params.text_input_alpha,
		beta2: glo.params.text_input_beta,
	}, equa2, dim_one, fractalize, onePoint) {
		super(parametres, equa, equa2, dim_one, fractalize, onePoint);
	}

	compute() {
		const stepsU = this.uvInfos.isU ? this.nb_steps_u : 0;
		const stepsV = this.uvInfos.isV ? this.nb_steps_v : 0;

		const positions = this.computer.compute({
			stepsU, stepsV,
			minU: this.min_u, stepU: this.step_u,
			minV: this.min_v, stepV: this.step_v,
			exprX: this.equa.r || '1',
			exprY: this.equa.alpha || 'u',
			exprZ: this.equa.beta || 'v',
			exprAlpha: this.equa.alpha2 || '0',
			exprBeta: this.equa.beta2 || '0',
			A: this.A, B: this.B, C: this.C, D: this.D,
			E: this.E, F: this.F, G: this.G, H: this.H,
			I: this.I, J: this.J, K: this.K, L: this.L,
			w: this.w,
			firstPoint: glo.firstPoint,
			coordSystem: 'spheric'
		});

		if (positions) {
			this.paths = this.computer.positionsToPaths(positions, stepsU, stepsV);
		}

		if (!this.uvInfos.isV && this.paths.length > 0) {
			this.paths[0] = this.paths.flat();
		}
	}
}

// ==================== SYSTÈME CYLINDRIQUE GPU ====================

class CurvesCylindricalGPU extends CurveBaseGPU {
	constructor(parametres = {
		u: { min: -glo.params.u, max: glo.params.u, nb_steps: glo.params.steps_u },
		v: { min: -glo.params.v, max: glo.params.v, nb_steps: glo.params.steps_v },
	}, equa = {
		r: glo.params.text_input_x,
		alpha: glo.params.text_input_y,
		beta: glo.params.text_input_z,
		alpha2: glo.params.text_input_alpha,
		beta2: glo.params.text_input_beta,
	}, equa2, dim_one, fractalize, onePoint) {
		super(parametres, equa, equa2, dim_one, fractalize, onePoint);
	}

	compute() {
		const stepsU = this.uvInfos.isU ? this.nb_steps_u : 0;
		const stepsV = this.uvInfos.isV ? this.nb_steps_v : 0;

		const positions = this.computer.compute({
			stepsU, stepsV,
			minU: this.min_u, stepU: this.step_u,
			minV: this.min_v, stepV: this.step_v,
			exprX: this.equa.r || '1',
			exprY: this.equa.alpha || 'u',
			exprZ: this.equa.beta || 'v',
			exprAlpha: this.equa.alpha2 || '0',
			exprBeta: this.equa.beta2 || '0',
			A: this.A, B: this.B, C: this.C, D: this.D,
			E: this.E, F: this.F, G: this.G, H: this.H,
			I: this.I, J: this.J, K: this.K, L: this.L,
			w: this.w,
			firstPoint: glo.firstPoint,
			coordSystem: 'cylindrical'
		});

		if (positions) {
			this.paths = this.computer.positionsToPaths(positions, stepsU, stepsV);
		}

		if (!this.uvInfos.isV && this.paths.length > 0) {
			this.paths[0] = this.paths.flat();
		}
	}

	onFinalize() {
		this.paths = this.uvInfos.isV ? closedPaths(this.paths) : this.paths;
	}
}

// ==================== SYSTÈME PAR COURBURE GPU ====================

class CurvesByCurvatureGPU extends CurveBaseGPU {
	constructor(parametres = {
		u: { min: -glo.params.u, max: glo.params.u, nb_steps: glo.params.steps_u },
		v: { min: -glo.params.v, max: glo.params.v, nb_steps: glo.params.steps_v },
	}, equa = {
		r: glo.params.text_input_x,
		alpha: glo.params.text_input_y,
		beta: glo.params.text_input_z,
		alpha2: glo.params.text_input_alpha,
		beta2: glo.params.text_input_beta,
	}, equa2, dim_one, fractalize, onePoint) {
		super(parametres, equa, equa2, dim_one, fractalize, onePoint);
	}

	compute() {
		const stepsU = this.uvInfos.isU ? this.nb_steps_u : 0;
		const stepsV = this.uvInfos.isV ? this.nb_steps_v : 0;

		// Étape 1: GPU calcule les deltas
		const deltas = this.computer.compute({
			stepsU, stepsV,
			minU: this.min_u, stepU: this.step_u,
			minV: this.min_v, stepV: this.step_v,
			exprX: this.equa.r || '1',
			exprY: this.equa.alpha || 'u',
			exprZ: this.equa.beta || 'v',
			exprAlpha: '0',
			exprBeta: '0',
			A: this.A, B: this.B, C: this.C, D: this.D,
			E: this.E, F: this.F, G: this.G, H: this.H,
			I: this.I, J: this.J, K: this.K, L: this.L,
			w: this.w,
			firstPoint: glo.firstPoint,
			coordSystem: 'curvature'
		});

		if (!deltas) return;

		// Étape 2: Prefix sum (accumulation) - séquentiel par ligne
		this.paths = [];
		this.moyPos = { x: 0, y: 0, z: 0 };
		let pointCount = 0;
		let idx = 0;

		for (let i = 0; i <= stepsU; i++) {
			const path = [];
			let x = 0, y = 0, z = 0;

			if (glo.params.curvaturetoZero) {
				path.push(BABYLON.Vector3.Zero());
			}

			for (let j = 0; j <= stepsV; j++) {
				x += deltas[idx];
				y += deltas[idx + 1];
				z += deltas[idx + 2];
				idx += 3;

				if (!isFinite(x)) x = 0;
				if (!isFinite(y)) y = 0;
				if (!isFinite(z)) z = 0;

				path.push(new BABYLON.Vector3(x, y, z));

				this.moyPos.x += x;
				this.moyPos.y += y;
				this.moyPos.z += z;
				pointCount++;
			}
			this.paths.push(path);
		}

		// Centrer
		if (pointCount > 1) {
			this.moyPos.x /= pointCount;
			this.moyPos.y /= pointCount;
			this.moyPos.z /= pointCount;
			offsetPathsByMoyPos(this.paths, this.moyPos);
		}

		if (!this.uvInfos.isV && this.paths.length > 0) {
			this.paths[0] = this.paths.flat();
		}
	}

	onFinalize() {
		this.paths = this.uvInfos.isV ? closedPaths(this.paths) : this.paths;
	}
}

// ==================== FACTORY ET UTILITAIRES ====================

function getCurveClassGPU(coordsType) {
	const classes = {
		'cartesian': CurvesCartesianGPU,
		'spheric': CurvesSphericalGPU,
		'cylindrical': CurvesCylindricalGPU,
		'curvature': CurvesByCurvatureGPU,
	};
	return classes[coordsType] || CurvesCartesianGPU;
}

function createCurvesGPU(coordsType, parametres, equa, equa2, dim_one, fractalize, onePoint) {
	const CurveClass = getCurveClassGPU(coordsType);
	return new CurveClass(parametres, equa, equa2, dim_one, fractalize, onePoint);
}

function getPositionsFromCurvesGPU(curves) {
	const paths = curves.paths;
	const totalPoints = paths.reduce((sum, path) => sum + path.length, 0);
	const positions = new Float32Array(totalPoints * 3);

	let idx = 0;
	for (const path of paths) {
		for (const point of path) {
			positions[idx++] = point.x;
			positions[idx++] = point.y;
			positions[idx++] = point.z;
		}
	}

	return positions;
}

function createVertexDataFromCurvesGPU(curves) {
	const vertexData = new BABYLON.VertexData();
	const paths = curves.paths;
	const positions = [];
	const indices = [];
	const normals = [];

	for (const path of paths) {
		for (const point of path) {
			positions.push(point.x, point.y, point.z);
		}
	}

	const pathLength = paths[0]?.length || 0;
	for (let i = 0; i < paths.length - 1; i++) {
		for (let j = 0; j < pathLength - 1; j++) {
			const idx = i * pathLength + j;
			indices.push(idx, idx + pathLength, idx + 1);
			indices.push(idx + 1, idx + pathLength, idx + pathLength + 1);
		}
	}

	vertexData.positions = positions;
	vertexData.indices = indices;

	BABYLON.VertexData.ComputeNormals(positions, indices, normals);
	vertexData.normals = normals;

	return vertexData;
}

// ==================== CLASSE UTILITAIRE SIMPLE ====================

/**
 * Classe simple pour calculer des positions avec des expressions personnalisées
 * AUCUN eval() ni new Function() - utilise WebGL2 Transform Feedback natif
 */
class GPUMeshComputer {
	constructor(options = {}) {
		this.computer = getWebGL2Computer();
		this.options = Object.assign({
			minU: -Math.PI,
			maxU: Math.PI,
			minV: -Math.PI,
			maxV: Math.PI,
			stepsU: 64,
			stepsV: 64,
		}, options);
	}

	/**
	 * Calcule les positions sur le GPU
	 * @param {string} exprX - Expression pour X (ex: "cos(u)*sin(v)")
	 * @param {string} exprY - Expression pour Y
	 * @param {string} exprZ - Expression pour Z
	 * @param {object} params - Paramètres (A, B, C, etc.)
	 * @returns {Float32Array} Positions [x,y,z,x,y,z,...]
	 */
	compute(exprX, exprY, exprZ, params = {}) {
		const { minU, maxU, minV, maxV, stepsU, stepsV } = this.options;

		return this.computer.compute({
			stepsU, stepsV,
			minU,
			stepU: (maxU - minU) / stepsU,
			minV,
			stepV: (maxV - minV) / stepsV,
			exprX: exprX || 'u',
			exprY: exprY || 'v',
			exprZ: exprZ || '0',
			exprAlpha: '0',
			exprBeta: '0',
			A: params.A || 0, B: params.B || 0, C: params.C || 0, D: params.D || 0,
			E: params.E || 0, F: params.F || 0, G: params.G || 1, H: params.H || 1,
			I: params.I || 1, J: params.J || 1, K: params.K || 1, L: params.L || 1,
			w: params.w,
			firstPoint: { x: 1, y: 0, z: 0 },
			coordSystem: 'cartesian'
		});
	}

	/**
	 * Retourne des paths de BABYLON.Vector3
	 */
	computePaths(exprX, exprY, exprZ, params = {}) {
		const positions = this.compute(exprX, exprY, exprZ, params);
		if (!positions) return [];

		const { stepsU, stepsV } = this.options;
		return this.computer.positionsToPaths(positions, stepsU, stepsV);
	}
}