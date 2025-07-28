async function makeSymmetrize(){
	const isFirstX    = glo.params.symmetrizeX ? false : true;
	const isFirstXorY = (glo.params.symmetrizeX || glo.params.symmetrizeY) ? false : true;

	switch(glo.symmetrizeOrder){
		case 'xyz':
			if(glo.params.symmetrizeX){ await symmetrizeRibbon("symmetrizeX", glo.params.symmetrizeX); }
			if(glo.params.symmetrizeY){ await symmetrizeRibbon("symmetrizeY", (glo.params.symmetrizeX ? glo.params.symmetrizeX : 1) * glo.params.symmetrizeY, isFirstX); }
			if(glo.params.symmetrizeZ){ await symmetrizeRibbon("symmetrizeZ", (glo.params.symmetrizeX ? glo.params.symmetrizeX : 1) *
	                                                                  (glo.params.symmetrizeY ? glo.params.symmetrizeY : 1) * glo.params.symmetrizeZ, isFirstXorY); }
		break;
		case 'xzy':
			if(glo.params.symmetrizeX){ await symmetrizeRibbon("symmetrizeX", glo.params.symmetrizeX); }
			if(glo.params.symmetrizeZ){ await symmetrizeRibbon("symmetrizeZ", (glo.params.symmetrizeX ? glo.params.symmetrizeX : 1) * glo.params.symmetrizeZ, isFirstX); }
			if(glo.params.symmetrizeY){ await symmetrizeRibbon("symmetrizeY", (glo.params.symmetrizeX ? glo.params.symmetrizeX : 1) *
	                                                                  (glo.params.symmetrizeZ ? glo.params.symmetrizeZ : 1) * glo.params.symmetrizeY, isFirstXorY); }
		break;
		case 'yxz':
			if(glo.params.symmetrizeY){ await symmetrizeRibbon("symmetrizeY", glo.params.symmetrizeY); }
			if(glo.params.symmetrizeX){ await symmetrizeRibbon("symmetrizeX", (glo.params.symmetrizeY ? glo.params.symmetrizeY : 1) * glo.params.symmetrizeX, isFirstX); }
			if(glo.params.symmetrizeZ){ await symmetrizeRibbon("symmetrizeZ", (glo.params.symmetrizeY ? glo.params.symmetrizeY : 1) *
	                                                                  (glo.params.symmetrizeX ? glo.params.symmetrizeX : 1) * glo.params.symmetrizeZ, isFirstXorY); }
		break;
		case 'yzx':
			if(glo.params.symmetrizeY){ await symmetrizeRibbon("symmetrizeY", glo.params.symmetrizeY); }
			if(glo.params.symmetrizeZ){ await symmetrizeRibbon("symmetrizeZ", (glo.params.symmetrizeY ? glo.params.symmetrizeY : 1) * glo.params.symmetrizeZ, isFirstX); }
			if(glo.params.symmetrizeX){ await symmetrizeRibbon("symmetrizeX", (glo.params.symmetrizeY ? glo.params.symmetrizeY : 1) *
	                                                                  (glo.params.symmetrizeZ ? glo.params.symmetrizeZ : 1) * glo.params.symmetrizeX, isFirstXorY); }
		break;
		case 'zxy':
			if(glo.params.symmetrizeZ){ await symmetrizeRibbon("symmetrizeZ", glo.params.symmetrizeZ); }
			if(glo.params.symmetrizeX){ await symmetrizeRibbon("symmetrizeX", (glo.params.symmetrizeZ ? glo.params.symmetrizeZ : 1) * glo.params.symmetrizeX, isFirstX); }
			if(glo.params.symmetrizeY){ await symmetrizeRibbon("symmetrizeY", (glo.params.symmetrizeZ ? glo.params.symmetrizeZ : 1) *
	                                                                  (glo.params.symmetrizeX ? glo.params.symmetrizeX : 1) * glo.params.symmetrizeY, isFirstXorY); }
		break;
		case 'zyx':
			if(glo.params.symmetrizeZ){ await symmetrizeRibbon("symmetrizeZ", glo.params.symmetrizeZ); }
			if(glo.params.symmetrizeY){ await symmetrizeRibbon("symmetrizeY", (glo.params.symmetrizeZ ? glo.params.symmetrizeZ : 1) * glo.params.symmetrizeY, isFirstX); }
			if(glo.params.symmetrizeX){ await symmetrizeRibbon("symmetrizeX", (glo.params.symmetrizeZ ? glo.params.symmetrizeZ : 1) *
	                                                                  (glo.params.symmetrizeY ? glo.params.symmetrizeY : 1) * glo.params.symmetrizeX, isFirstXorY); }
		break;
	}
}

/*async function symmetrizeRibbon(axisVarName, coeff = 1, first = true){
	let curvesPathsSave = [...glo.curves.pathsSave];

	const nbSyms    = glo.params[axisVarName];
	const axis      = axisVarName.slice(-1);
	const stepAngle = glo.params.symmetrizeAngle/nbSyms;

	var A = glo.params.A; var B = glo.params.B; var C = glo.params.C; var D = glo.params.D; var E = glo.params.E; var F = glo.params.F; var G = glo.params.G; var H = glo.params.H;
	var I = glo.params.I; var J = glo.params.J; var K = glo.params.K; var L = glo.params.L; var M = glo.params.M;

	if(glo.curves.linesSystems){ glo.curves.linesSystems.forEach(lineSystem => { lineSystem.dispose(true); lineSystem = null; }); }

	const stepU = 2*glo.params.u / glo.params.steps_u;
	const stepV = 2*glo.params.v / glo.params.steps_v;

	let inputSymREq = {fx: glo.input_sym_r.text};

	let u,v,d,k,n,p,t;
	let X = 0 ;
	let Y = 0 ;

	let f3;

	if(glo.input_sym_r.text){
		reg(inputSymREq, glo.dim_one);
	}
	const goodR = glo.input_sym_r.text ? test_equations(inputSymREq, glo.dim_one) : false;
	if(goodR){
		f3 = {evalX: false, evalY: false};
		if(glo.input_eval_x.text && glo.input_eval_y.text){
			f3 = {evalX: glo.input_eval_x.text, evalY: glo.input_eval_y.text};
			reg(f3);
		}
		else if(glo.input_eval_x.text){
			f3 = {evalX: glo.input_eval_x.text, evalY: false};
			reg(f3);
		}
		else if(glo.input_eval_x.text){
			f3 = {evalX: false, evalY: glo.input_eval_y.text};
			reg(f3);
		}
	}

	const savedIndices = glo.ribbon.getIndices().slice();

	const isCenterOffset = (glo.centerSymmetry.x || glo.centerSymmetry.y || glo.centerSymmetry.z) ? true : false;

	glo.ribbon.computeWorldMatrix(true);
	glo.ribbon.refreshBoundingInfo();
	glo.ribbon.boundingInfos = glo.ribbon.getBoundingInfo();
	const centerLocal        = glo.params.centerIsLocal ? glo.ribbon.boundingInfos.boundingBox.center : {x:0,y:0,z:0};
	const center             = new BABYLON.Vector3(glo.centerSymmetry.x + centerLocal.x, glo.centerSymmetry.y + centerLocal.y, glo.centerSymmetry.z + centerLocal.z);
	const rotate             = isCenterOffset? rotateOnCenterByBabylonMatrix : rotateByMatrix;

	let evalR = false;

	let verticesNormals;
	if(goodR){
		evalR           = new Function("u", "v", "x", "y", "z", "d", "k", "p", "t", "n", "i", "j", "O", "T", "xN", "yN", "zN", "$N", "xT", "yT", "zT", "$T", "return " + inputSymREq.fx);
		verticesNormals = glo.ribbon.getVerticesData(BABYLON.VertexBuffer.NormalKind);
	}

	let index_u = 0, index_v = 0;
	let newRibbons             = [];
	let newCurves              = [];
	glo.curves.linesSystems    = [];
	glo.currentCurveInfos.path = [];
	for(let indk = 1; indk <= nbSyms; indk++){
		n = 0;
		const angle = indk * stepAngle;
		index_u = 0;
		newCurves[indk] = [];
		glo.currentCurveInfos.path = [];

		if((goodR || isCenterOffset) && first){
			curvesPathsSave.forEach((line, i) => {
				k = !(i%2) ? -1 : 1;
				index_v = 0;
				u = i * stepU;
				glo.currentCurveInfos.u = u;
				p = !(i%2) ? -u : u;
				newCurves[indk][i] = [];
				glo.currentCurveInfos.path = [];
				line.forEach((vect, j) => {
					d = !(j%2) ? -1 : 1;
					v = j * stepV;
					t = !(j%2) ? -v : v;

					glo.currentCurveInfos.v = v;

					let newPt = vect;

					if(goodR){
						let r = 0;
						
						var x = newPt.x; var y = newPt.y; var z = newPt.z;
						const vect3 = new BABYLON.Vector3(x,y,z);

						const xN = verticesNormals[n*3]; const yN = verticesNormals[n*3 + 1]; const zN = verticesNormals[n*3 + 2];

						let normalVector = new BABYLON.Vector3(xN, yN, zN);
						
						if(nbSyms > 1){ 
							switch(axis){
								case 'X':
									normalVector = rotate(normalVector, angle, 0, 0, center);
								break;
								case 'Y':
									normalVector = rotate(normalVector, 0, angle, 0, center);
								break;
								case 'Z':
									normalVector = rotate(normalVector, 0, 0, angle, center);
								break;
							}
						}

						const µN = xN*yN*zN;
						const $N = (xN+yN+zN)/3;
						const µ$N = µN*$N; var $µN = µN+$N;
						const µµN = µ$N*$µN;

						const O = Math.acos(y/(h(x,y,z)));
						const T = Math.atan2(z, x) ;

						const vectT = BABYLON.Vector3.Normalize(vect3);
						const xT = vectT.x; const yT = vectT.y; const zT = vectT.z;
						const µT = xT*yT*zT;
						const $T = (xT+yT+zT)/3;
						const µ$T = µT*$T; var $µT = µT+$T;
						const µµT = µ$T*$µT;

						glo.currentCurveInfos.vect = vect3;

						if(f3.evalX){ X = eval(f3.evalX); }
						if(f3.evalY){ Y = eval(f3.evalY); }

						r = evalR(u, v, x, y, z, D, K, p, t, n, i, j, O, T, xN, yN, zN, $N, xT, yT, zT, $T) * glo.scaleNorm;

						let symmAngle = {equations : {x: glo.input_symmAngleX.text, y: glo.input_symmAngleY.text},
						                 vals      : {x: glo.params.symmAngle.x, y: glo.params.symmAngle.y} };

						if(symmAngle.equations.x || symmAngle.equations.y){
							if(test_equations({fx: symmAngle.equations.x})){
								let f4 = {symmX: symmAngle.equations.x};
								reg(f4);
								symmAngle.vals.x = eval(f4.symmX);
							}
							if(test_equations({fy: symmAngle.equations.y})){
								let f4 = {symmY: symmAngle.equations.y};
								reg(f4);
								symmAngle.vals.y = eval(f4.symmY);
							}
							if(symmAngle.vals.x === undefined){ symmAngle.vals.x = 0; }
							if(symmAngle.vals.y === undefined){ symmAngle.vals.y = 0; }

							symmAngle.vals.x += glo.params.symmAngle.x;
							symmAngle.vals.y += glo.params.symmAngle.y;
						}

						if(symmAngle.vals.x || symmAngle.vals.y){
							normalVector = rotate(normalVector, symmAngle.vals.x, symmAngle.vals.y, 0, center);
						}

						const angleXY = getAzimuthElevationAngles(glo.params.normByFace ? normalVector : vectT, center);
						const dirXY   = directionXY(angleXY, r);
						
						newPt = !glo.addSymmetry ? dirXY : {x: newPt.x + dirXY.x, y: newPt.y + dirXY.y, z: newPt.z + dirXY.z };
					}


					newPt = isCenterOffset ? new BABYLON.Vector3(newPt.x, newPt.y, newPt.z) : newPt;
					
					if(nbSyms > 1){ 
						switch(axis){
							case 'X':
								newPt = rotate(newPt, angle, 0, 0, center);
							break;
							case 'Y':
								newPt = rotate(newPt, 0, angle, 0, center);
							break;
							case 'Z':
								newPt = rotate(newPt, 0, 0, angle, center);
							break;
						}
					}

					const newVect = new BABYLON.Vector3(newPt.x, newPt.y, newPt.z);

					newCurves[indk][i].push(newVect);
					glo.currentCurveInfos.path.push(newVect);
					index_v++;
					n++;
				});
				index_u++;
			});

			const closedThenOpened = glo.params.lastPathEqualFirstPath && isClosedPaths(newCurves[indk]);

			newCurves[indk].pop();
			let newRibbon = await BABYLON.MeshBuilder.CreateRibbon(
				"newRibbon_" + indk, {pathArray: newCurves[indk], sideOrientation:1, updatable: true, closeArray: closedThenOpened}, glo.scene
			);
			newRibbons.push(newRibbon);
		}
		else{
			let newRibbon = await glo.ribbon.clone();
			if(nbSyms > 1){
				newRibbon.setPivotPoint(centerLocal);
				newRibbon.rotation[axis.toLowerCase()] = angle;
			}
			newRibbons.push(newRibbon);
		}
	}

	newRibbons.forEach(async newRibbon => { await newRibbon.updateIndices(newRibbon.getIndices()); await newRibbon.computeWorldMatrix(true); });

	ribbonDispose(false);
	if(!glo.mergeMeshesByIntersect){ glo.ribbon = newRibbons.length > 1 ? await BABYLON.Mesh.MergeMeshes(newRibbons, true, true, undefined, false, false) : newRibbons[0]; }
	else{
		glo.ribbon = await mergeManyMeshesByIntersects(newRibbons);
	}

	initRibbon(coeff);
}*/

function buildUserFunction(exprText, argNames, defaultValue = 0) {
    if (!exprText || !exprText.trim()) return () => defaultValue;
    let exprObj = { fx: exprText };
    reg(exprObj);
    if (!test_equations(exprObj)) {
        // console.warn("Expression invalide :", exprText);
        return () => defaultValue;
    }
    try {
        return new Function(...argNames, `return ${exprObj.fx}`);
    } catch (e) {
        // console.warn("Erreur compilation JS dans l'expression :", exprObj.fx);
        return () => defaultValue;
    }
}

async function symmetrizeRibbon(axisVarName, coeff = 1, first = true) {
    let curvesPathsSave = [...glo.curves.pathsSave];

    const nbSyms    = glo.params[axisVarName];
    const axis      = axisVarName.slice(-1);
    const stepAngle = glo.params.symmetrizeAngle / nbSyms;

    if (glo.curves.linesSystems) {
        glo.curves.linesSystems.forEach(lineSystem => { lineSystem.dispose(true); });
    }

    const stepU = 2 * glo.params.u / glo.params.steps_u;
    const stepV = 2 * glo.params.v / glo.params.steps_v;

    // ---- PRÉPARATION HORS BOUCLE DES EXPRESSIONS ET FONCTIONS ----

    const argNames = [
        "u", "v", "x", "y", "z", "d", "k", "p", "t", "n", "i", "j",
        "O", "T", "xN", "yN", "zN", "$N", "xT", "yT", "zT", "$T"
    ];

    // sym_r (rayon radial de déplacement)
    const evalR = buildUserFunction(glo.input_sym_r.text, argNames);

    // Entrées optionnelles pour les calculs de coordonnées dynamiques
    const evalX = buildUserFunction(glo.input_eval_x?.text, argNames, false);
    const evalY = buildUserFunction(glo.input_eval_y?.text, argNames, false);

    // Angles de symétrie éventuels
    const evalSymAngleX = buildUserFunction(glo.input_symmAngleX?.text, argNames, glo.params.symmAngle.x);
    const evalSymAngleY = buildUserFunction(glo.input_symmAngleY?.text, argNames, glo.params.symmAngle.y);

    // ---- PRÉPARATION AUTRES INFOS ----

    const savedIndices = glo.ribbon.getIndices().slice();

    const isCenterOffset = (glo.centerSymmetry.x || glo.centerSymmetry.y || glo.centerSymmetry.z);

    glo.ribbon.computeWorldMatrix(true);
    glo.ribbon.refreshBoundingInfo();
    glo.ribbon.boundingInfos = glo.ribbon.getBoundingInfo();
    const centerLocal = glo.params.centerIsLocal ? glo.ribbon.boundingInfos.boundingBox.center : { x: 0, y: 0, z: 0 };
    const center = new BABYLON.Vector3(
        glo.centerSymmetry.x + centerLocal.x,
        glo.centerSymmetry.y + centerLocal.y,
        glo.centerSymmetry.z + centerLocal.z
    );
    const rotate = isCenterOffset ? rotateOnCenterByBabylonMatrix : rotateByMatrix;

    let verticesNormals = glo.ribbon.getVerticesData(BABYLON.VertexBuffer.NormalKind);

    // ---- DÉBUT DE LA BOUCLE PRINCIPALE ----

    let newRibbons = [];
    let newCurves = [];
    glo.curves.linesSystems = [];
    glo.currentCurveInfos.path = [];

    for (let indk = 1; indk <= nbSyms; indk++) {
        let n = 0;
        const angle = indk * stepAngle;
        let index_u = 0;
        newCurves[indk] = [];
        glo.currentCurveInfos.path = [];

        if ((glo.input_sym_r.text || isCenterOffset) && first) {
            curvesPathsSave.forEach((line, i) => {
                let k = !(i % 2) ? -1 : 1;
                let index_v = 0;
                let u = i * stepU;
                glo.currentCurveInfos.u = u;
                let p = !(i % 2) ? -u : u;
                newCurves[indk][i] = [];
                glo.currentCurveInfos.path = [];
                line.forEach((vect, j) => {
                    let d = !(j % 2) ? -1 : 1;
                    let v = j * stepV;
                    let t = !(j % 2) ? -v : v;

                    glo.currentCurveInfos.v = v;

                    let newPt = vect;

                    // ---------------------- CALCUL PRINCIPAL ---------------------------
                    let x = newPt.x, y = newPt.y, z = newPt.z;
                    const vect3 = new BABYLON.Vector3(x, y, z);

                    // Normales
                    const xN = verticesNormals[n * 3]     ?? 0;
                    const yN = verticesNormals[n * 3 + 1] ?? 0;
                    const zN = verticesNormals[n * 3 + 2] ?? 0;

                    let normalVector = new BABYLON.Vector3(xN, yN, zN);

                    if (nbSyms > 1) {
                        switch (axis) {
                            case 'X': normalVector = rotate(normalVector, angle, 0, 0, center); break;
                            case 'Y': normalVector = rotate(normalVector, 0, angle, 0, center); break;
                            case 'Z': normalVector = rotate(normalVector, 0, 0, angle, center); break;
                        }
                    }

                    const µN = xN * yN * zN;
                    const $N = (xN + yN + zN) / 3;
                    const µ$N = µN * $N;
                    const $µN = µN + $N;
                    const µµN = µ$N * $µN;

                    const O = h(x, y, z) ? Math.acos(y / h(x, y, z)) : 0;
                    const T = Math.atan2(z, x);

                    const vectT = BABYLON.Vector3.Normalize(vect3);
                    const xT = vectT.x, yT = vectT.y, zT = vectT.z;
                    const µT = xT * yT * zT;
                    const $T = (xT + yT + zT) / 3;
                    const µ$T = µT * $T;
                    const $µT = µT + $T;
                    const µµT = µ$T * $µT;

                    glo.currentCurveInfos.vect = vect3;

                    // Valeurs dynamiques X et Y (si présentes)
                    let X = evalX(u, v, x, y, z, d, k, p, t, n, i, j, O, T, xN, yN, zN, $N, xT, yT, zT, $T) || 0;
                    let Y = evalY(u, v, x, y, z, d, k, p, t, n, i, j, O, T, xN, yN, zN, $N, xT, yT, zT, $T) || 0;

                    // Calcul du déplacement radial R (fonction utilisateur)
                    let r = evalR(u, v, x, y, z, d, k, p, t, n, i, j, O, T, xN, yN, zN, $N, xT, yT, zT, $T) * (glo.scaleNorm || 1);

                    // Angles de symétrie dynamiques
                    let symmAngle = {
                        vals: {
                            x: evalSymAngleX(u, v, x, y, z, d, k, p, t, n, i, j, O, T, xN, yN, zN, $N, xT, yT, zT, $T) || 0,
                            y: evalSymAngleY(u, v, x, y, z, d, k, p, t, n, i, j, O, T, xN, yN, zN, $N, xT, yT, zT, $T) || 0,
                        }
                    };

                    // Décalage d'angle global
                    symmAngle.vals.x += glo.params.symmAngle.x;
                    symmAngle.vals.y += glo.params.symmAngle.y;

                    if (symmAngle.vals.x || symmAngle.vals.y) {
                        normalVector = rotate(normalVector, symmAngle.vals.x, symmAngle.vals.y, 0, center);
                    }

                    // Application du déplacement sur le plan XY
                    const angleXY = getAzimuthElevationAngles(glo.params.normByFace ? normalVector : vectT, center);
                    const dirXY   = directionXY(angleXY, r);

                    newPt = !glo.addSymmetry
                        ? dirXY
                        : {
                            x: newPt.x + dirXY.x,
                            y: newPt.y + dirXY.y,
                            z: newPt.z + dirXY.z
                        };

                    // Recentrage éventuel
                    newPt = isCenterOffset
                        ? new BABYLON.Vector3(newPt.x, newPt.y, newPt.z)
                        : newPt;

                    // Rotation par symétrie sur l’axe choisi
                    if (nbSyms > 1) {
                        switch (axis) {
                            case 'X': newPt = rotate(newPt, angle, 0, 0, center); break;
                            case 'Y': newPt = rotate(newPt, 0, angle, 0, center); break;
                            case 'Z': newPt = rotate(newPt, 0, 0, angle, center); break;
                        }
                    }

                    const newVect = new BABYLON.Vector3(newPt.x, newPt.y, newPt.z);

                    newCurves[indk][i].push(newVect);
                    glo.currentCurveInfos.path.push(newVect);
                    index_v++;
                    n++;
                });
                index_u++;
            });

            const closedThenOpened = glo.params.lastPathEqualFirstPath && isClosedPaths(newCurves[indk]);
            newCurves[indk].pop();
            let newRibbon = await BABYLON.MeshBuilder.CreateRibbon(
                "newRibbon_" + indk, { pathArray: newCurves[indk], sideOrientation: 1, updatable: true, closeArray: closedThenOpened }, glo.scene
            );
            newRibbons.push(newRibbon);
        } else {
            let newRibbon = await glo.ribbon.clone();
            if (nbSyms > 1) {
                newRibbon.setPivotPoint(centerLocal);
                newRibbon.rotation[axis.toLowerCase()] = angle;
            }
            newRibbons.push(newRibbon);
        }
    }

    newRibbons.forEach(async newRibbon => {
        await newRibbon.updateIndices(newRibbon.getIndices());
        await newRibbon.computeWorldMatrix(true);
    });

    ribbonDispose(false);
    if (!glo.mergeMeshesByIntersect) {
        glo.ribbon = newRibbons.length > 1
            ? await BABYLON.Mesh.MergeMeshes(newRibbons, true, true, undefined, false, false)
            : newRibbons[0];
    } else {
        glo.ribbon = await mergeManyMeshesByIntersects(newRibbons);
    }

    initRibbon(coeff);
}

async function delInRibbon(){
	const curvesPathsSave = glo.curves.paths.slice();

	let f = {
		delX: glo.input_delX.text,
		delY: glo.input_delY.text,
		delZ: glo.input_delZ.text,
	};
	if(test_equations(f)){
		reg(f);

		glo.curves.linesSystems    = [];
		glo.currentCurveInfos.path = [];
		glo.curves.paths           = [];

		const positions = await glo.ribbon.getVerticesData(BABYLON.VertexBuffer.PositionKind);

		var {q, m, mx, my, mz, P, v_mod, N} = makeCommonCurveFunctions();
		var {
				x, y, z, xN, yN, zN, µN, $N, µ$N, $µN, µµN, O, T, xT, yT, zT, µT, $T, µ$T,
				$µT, µµT, rCol, gCol, bCol, mCol, A, B, C, D, E, F, G, H, I, K, L, M, alpha,
				beta, theta, alpha2, beta2, alpha3, beta3

		} = makeCommonCurveVariables();

		const uvInfos = isUV();
		let path = [];

		initVarsInObj(f, "", 0);

		const ribbonPaths = glo.ribbon.getPaths();

		let d,k,p,t;

		let X, Y;

		let n = 0;
		let index_u = 0, ind_u = 0;

		const curvesInfos = glo.curves;

		const stepsU = uvInfos.isU ? curvesInfos.nb_steps_u : 0;
		const stepsV = uvInfos.isV ? curvesInfos.nb_steps_v : 0;
		let u = curvesInfos.min_u - curvesInfos.step_u, v = curvesInfos.min_v - curvesInfos.step_v, ind_v = 0;
		for (let i = 0; i <= stepsU; i++) {
			k = !(i%2) ? -1 : 1;
			u += curvesInfos.step_u;
			p = !(i%2) ? -u : u;
			glo.currentCurveInfos.u = u;
			path = [];
			let index_v = 0; ind_u = u; v = curvesInfos.min_v - curvesInfos.step_v;
			for (let j = 0; j <= stepsV; j++) {
				let {x, y, z} = ribbonPaths[i][j];

				v += curvesInfos.step_v;
				ind_v = v;
				glo.currentCurveInfos.v = v;

				d = !(j%2) ? -1 : 1;
				t = !(j%2) ? -v : v;

				x = eval(f.delX);
				y = eval(f.delY);
				z = eval(f.delZ);

				const vect3 = new BABYLON.Vector3(x,y,z);

				if(curvesPathsSave && curvesPathsSave[i] && curvesPathsSave[i][j] && BABYLON.Vector3.Distance(vect3, curvesPathsSave[i][j]) < glo.params.distDel){
					path.push(!glo.delOrKeep ? curvesPathsSave[i][j] : vect3);
				}
			}
			if(path.length){ glo.curves.paths.push(path); }
		}

		if(glo.curves.paths.length){
			ribbonDispose(false);

			glo.ribbon = await BABYLON.MeshBuilder.CreateRibbon("delRibbon", {pathArray: glo.curves.paths, sideOrientation:1, updatable: true, closeArray: glo.params.lastPathEqualFirstPath}, glo.scene, );

			await glo.ribbon.setVerticesData(BABYLON.VertexBuffer.PositionKind, glo.ribbon.getPositionData(), true);
			await glo.ribbon.updateIndices(glo.ribbon.getIndices());
			await glo.ribbon.computeWorldMatrix(true);
			await glo.ribbon.refreshBoundingInfo();
			glo.lines          = glo.curves.paths;
			glo.ribbon.savePos = positions.slice();
		}
		else{
			glo.curves.paths = curvesPathsSave.slice();
		}
	}
}

async function invPointsByDistToOrigin(){
	const curvesPathsSave = glo.curves.paths.slice();

	const ptMax    = glo.ribbon.getBoundingInfo().boundingBox.extendSizeWorld;
	const DistMax  = h(ptMax.x, ptMax.y, ptMax.z);
	const powCoeff = glo.params.invPtsPowCoeff;

	let paths = [], path = [];
	curvesPathsSave.forEach(line => {
		path = [];
		line.forEach(vect => {
			const distVect  = h(vect.x, vect.y, vect.z);
			const coeff     = (1 - (distVect/DistMax))**powCoeff;
			const newVect   = new BABYLON.Vector3(vect.x * coeff, vect.y * coeff, vect.z * coeff);

			path.push(newVect);
		});
		paths.push(path);
	});

	glo.curves.paths = paths;

	if(glo.curves.paths.length){
		ribbonDispose(false);

		glo.ribbon = await BABYLON.MeshBuilder.CreateRibbon("delRibbon", {pathArray: glo.curves.paths, sideOrientation:1, updatable: true, closeArray: glo.params.lastPathEqualFirstPath}, glo.scene, );

		await glo.ribbon.setVerticesData(BABYLON.VertexBuffer.PositionKind, glo.ribbon.getPositionData(), true);
		await glo.ribbon.updateIndices(glo.ribbon.getIndices());
		await glo.ribbon.computeWorldMatrix(true);
		await glo.ribbon.refreshBoundingInfo();

		glo.lines = glo.curves.paths;
	}
	else{
		glo.curves.paths = curvesPathsSave.slice();
	}
}

function initRibbon(coeff){
	const positions = glo.ribbon.getPositionData();
	glo.ribbon.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions, true);
	glo.ribbon.updateIndices(glo.ribbon.getIndices());
	glo.ribbon.computeWorldMatrix(true);
	glo.ribbon.refreshBoundingInfo();

	glo.curves.paths   = glo.ribbon.getPaths(positions, coeff);
	glo.lines          = glo.curves.paths;
	glo.ribbon.savePos = positions.slice();
}

function showRibonFacets(){
	glo.flatMesh = !glo.flatMesh;
	if(glo.flatMesh){ glo.ribbon.convertToFlatShadedMesh(); }
	else{ remakeRibbon(); }
}

async function doubleResolution() {
	meshLines = glo.curves.paths.slice();

	// Étape 1 : Interpolation horizontale
	const horizontalRows = meshLines.map(row => {
	  const newRow = [];
	  for (let j = 0; j < row.length; j++) {
		// On ajoute le point original
		newRow.push(row[j]);
		// Entre chaque point (sauf le dernier), on insère son milieu
		if (j < row.length - 1) {
		  const nextPoint = row[j + 1];
		  const midPoint = new BABYLON.Vector3(
			(row[j].x + nextPoint.x) / 2,
			(row[j].y + nextPoint.y) / 2,
			(row[j].z + nextPoint.z) / 2
		  );
		  newRow.push(midPoint);
		}
	  }
	  return newRow;
	});
  
	// Étape 2 : Interpolation verticale
	const finalGrid = [];
	for (let i = 0; i < horizontalRows.length; i++) {
	  // Ajout de la ligne déjà interpolée horizontalement
	  finalGrid.push(horizontalRows[i]);
	  // S'il y a une ligne suivante, on calcule la ligne intermédiaire
	  if (i < horizontalRows.length - 1) {
		const newRow = [];
		const rowA = horizontalRows[i];
		const rowB = horizontalRows[i + 1];
		for (let j = 0; j < rowA.length; j++) {
		  const midPoint = new BABYLON.Vector3(
			(rowA[j].x + rowB[j].x) / 2,
			(rowA[j].y + rowB[j].y) / 2,
			(rowA[j].z + rowB[j].z) / 2
		  );
		  newRow.push(midPoint);
		}
		finalGrid.push(newRow);
	  }
	}
	
	glo.curves.paths = finalGrid;

	await make_ribbon();
	//initRibbon();
  }
  

function functionIt(x, y, z){
	const cpowX  = glo.params.functionIt.cpow.x;
	const cpowY  = glo.params.functionIt.cpow.y;
	const cpowZ  = glo.params.functionIt.cpow.z;
	const sinX   = glo.params.functionIt.sin.x;
	const sinnX  = glo.params.functionIt.sin.nx;
	const sinY   = glo.params.functionIt.sin.y;
	const sinnY  = glo.params.functionIt.sin.ny;
	const sinZ   = glo.params.functionIt.sin.z;
	const sinnZ  = glo.params.functionIt.sin.nz;            

	x = cpowX != 1 ? cpow(x, cpowX) : x;
	y = cpowY != 1 ? cpow(y, cpowY) : y;
	z = cpowZ != 1 ? cpow(z, cpowZ) : z;

	x = sinX > ep || sinX < -ep ? x + sin(sinnX * x) * sinX : x;
	y = sinY > ep || sinY < -ep ? y + sin(sinnY * y) * sinY : y;
	z = sinZ > ep || sinZ < -ep ? z + sin(sinnZ * z) * sinZ : z;
	
	return {x, y, z};
}

function flatRibbon(){
	function flatPos(axis, extremePos, newPositions = false){
		let positions = newPositions;

		if(glo.params.functionIt.flat[axis].bottom < 100){
			const axisBottom = glo.params.functionIt.flat[axis].bottom;
			const axisNum    = axis.charCodeAt() - 120;
			positions        = !newPositions ? extremePos.positions : newPositions;

			const minPos     = extremePos[axis].min;
			const dist       = extremePos[axis].dist;
			const distReduce = dist*(1 - 0.01*axisBottom);
			const maxHeight  = minPos + distReduce;

			for (var i = 0; i < positions.length; i += 3) {
				const newPosOnAxis = positions[i+axisNum];

				if(newPosOnAxis < maxHeight){
					positions[i+axisNum] = maxHeight;
				}
			}
		}
		return positions;
	}
	
	if(glo.params.functionIt.flat['x'].bottom < 100 || glo.params.functionIt.flat['y'].bottom < 100 || glo.params.functionIt.flat['z'].bottom < 100){
		let mesh         = glo.ribbon;
		const extremePos = mesh.extremePos();
		let positions    = extremePos.positions;

		['x', 'y', 'z'].forEach(axis => { positions = flatPos(axis, extremePos, positions); });

		//mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
		mesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions, true);
		
		// Optionnel : Recalculer les normales si nécessaire
		//mesh.updateIndices(mesh.getIndices());
		mesh.setIndices(mesh.getIndices());
		mesh.computeWorldMatrix(true);
		mesh.refreshBoundingInfo();
		var normals = [];
		BABYLON.VertexData.ComputeNormals(positions, mesh.getIndices(), normals);
		//mesh.updateVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
		mesh.setVerticesData(BABYLON.VertexBuffer.NormalKind, normals, true);

		mesh.markAsDirtyAll();

		glo.curves.paths = glo.ribbon.getPaths();
		glo.lines = glo.curves.paths;
		makeLineSystem();
	}
}

function blendPos(x, y, z, variable, val, coeff = 0.01){
	val*=coeff*glo.params.blender.force;
	if(glo.params.blender[variable].x || glo.params.blender[variable].y || glo.params.blender[variable].z){
		var {x, y, z} = rotateByBabylonMatrix({x, y, z}, val * glo.params.blender[variable].x, val * glo.params.blender[variable].y, val * glo.params.blender[variable].z);
	}

	return {x, y, z};
}

function blendPosAll(x, y, z, u, v, O, cosu, cosv){
	var {x, y, z} = blendPos(x, y, z, 'u', u);
	var {x, y, z} = blendPos(x, y, z, 'v', v);
	var {x, y, z} = blendPos(x, y, z, 'O', O, 0.1);
	var {x, y, z} = blendPos(x, y, z, 'cu', cosu, 0.1);
	var {x, y, z} = blendPos(x, y, z, 'cv', cosv, 0.1);

	return {x, y, z};
}

function invPos(x, y, z){
	const invpos = glo.params.invPos;

	if(invpos.x || invpos.y || invpos.z){
		x = !invpos.x ? x : -x;
		y = !invpos.y ? y : -y;
		z = !invpos.z ? z : -z;
	}

	return {x, y, z};
}

function invPosIf(x, y, z){
	if(!glo.invPosIf){ return {x, y, z}; }

	const invposif = glo.invPosIf;
	switch(invposif){
		case 'xy': x = y < 0 ? -x : x; break;
		case 'yx': y = x < 0 ? -y : y; break;
		case 'xz': x = z < 0 ? -x : x; break;
		case 'zx': z = x < 0 ? -z : z; break;
		case 'yz': y = z < 0 ? -y : y; break;
		case 'zy': z = y < 0 ? -z : z; break;
	}

	return {x, y, z};
}

function permutSign(x, y, z){
	if(!glo.permutSign){ return {x, y, z}; }

	const permutsign = glo.permutSign;

	let xTmp = x, yTmp = y, zTmp = z;
	if(permutsign == 'xy'){
		xTmp = y;
	}
	else if(permutsign == 'xz'){
		xTmp = z;
	}
	else if(permutsign == 'yz'){
		yTmp = z;
	}

	return {x: xTmp, y: yTmp, z: zTmp};
}

function NaNToZero(){
	glo.curves.paths = glo.curves.paths.map(path => path.map(point => 
		       point = {x: isNaN(point.x) ? 0 : point.x, y: isNaN(point.y) ? 0 : point.y, z: isNaN(point.z) ? 0 : point.z}));
}

function morphMesh(pathsToMorph = glo.ribbon.getPaths(), coeff = 0.5, f = {
	x: "cucv",
	y: "sucv",
	z: "sv",
	alpha: "",
	beta: "",
}, f2 = {
	x: "",
	y: "",
	z: "",
	alpha: "",
	beta: "",
	theta: "",
})
{	
	const curvesForMorph = new Curves({
		u: {min: -glo.params.u, max: glo.params.u, nb_steps: glo.params.steps_u, },
		v: {min: -glo.params.v, max: glo.params.v, nb_steps: glo.params.steps_v, },
	}, f, f2, false);
	const pathsForMorph  = curvesForMorph.paths;

	glo.curves.paths = [];
	pathsToMorph.forEach((pathToMorph, i) => {
		glo.curves.paths[i] = [];
		pathToMorph.forEach((vectToMorph, j) => {
			const vectForMorph = pathsForMorph[i][j];

			const vectMorphed = new BABYLON.Vector3(vectForMorph.x + ((vectForMorph.x - vectToMorph.x) * coeff), 
			                                        vectForMorph.y + ((vectForMorph.y - vectToMorph.y) * coeff),
													vectForMorph.z + ((vectForMorph.z - vectToMorph.z) * coeff));

			glo.curves.paths[i].push(vectMorphed);

		});
	});

	make_ribbon();
}

async function cutsRibbon(){
	glo.scene.clipPlane  = await new BABYLON.Plane(-glo.cutRibbon.x, 0, 0, 0);
	glo.scene.clipPlane2 = await new BABYLON.Plane(0, -glo.cutRibbon.y, 0, 0);
	glo.scene.clipPlane3 = await new BABYLON.Plane(0, 0, -glo.cutRibbon.z, 0);
}

function cutRibbonWithCSG(){
	var plane         = BABYLON.MeshBuilder.CreateBox("plane", {width: 50, height: 100, depth: 50}, glo.scene);
	var planeCSG      = BABYLON.CSG.FromMesh(plane);
	var ribbonCSG     = BABYLON.CSG.FromMesh(glo.ribbon);
	var subtractedCSG = ribbonCSG.subtract(planeCSG);

	// Convertir le résultat en maillage BabylonJS
	glo.ribbon = subtractedCSG.toMesh("cutRibbon", glo.ribbon.material, glo.scene);

	plane.dispose();
}

async function cutRibbon(axis, altitude = 0){
	let curvesPathsSave = [...glo.curves.paths];

	if(glo.curves.linesSystems){ glo.curves.linesSystems.forEach(lineSystem => { lineSystem.dispose(true); lineSystem = null; }); }

	let newCurves           = [];
	glo.curves.linesSystems = [];
	curvesPathsSave.forEach((line, i) => {
		line.forEach(path => {
			switch(axis){
				case 'X':
					if(path.x > altitude){ if(!newCurves[i]){newCurves[i] = [];} newCurves[i].push(path); }
				break;
				case 'Y':
					if(path.y > altitude){ if(!newCurves[i]){newCurves[i] = [];} newCurves[i].push(path); }
				break;
				case 'Z':
					if(path.z > altitude){ if(!newCurves[i]){newCurves[i] = [];} newCurves[i].push(path); }
				break;
			}
		});
	});

	let newCurvesGoodIndexes = [];
	newCurves.forEach(newCurve => {
		newCurvesGoodIndexes.push(newCurve);
	});

	ribbonDispose(false);
	const nameRibbon = "cutRibbon_" + glo.numRibbon;
	glo.numRibbon++;
	glo.ribbon = BABYLON.MeshBuilder.CreateRibbon(nameRibbon, {pathArray: newCurvesGoodIndexes, sideOrientation:1, updatable: true, }, glo.scene);
	giveMaterialToMesh();
	
	glo.curves.paths = newCurvesGoodIndexes;
	glo.lines        = glo.curves.paths;
}

function updateRibbonByR(newPt, val){
	r = val;
	const angleXY = getAzimuthElevationAngles(newPt);
	const dirXY   = directionXY(angleXY, r);
	
	newPt = !glo.addSymmetry ? dirXY : {x: newPt.x + dirXY.x, y: newPt.y + dirXY.y, z: newPt.z + dirXY.z };

	return newPt;
}

function symmetrizeByR(pos, r){
	let inputSymREq = {fx: glo.input_sym_r.text};
	const goodR     = glo.input_sym_r.text ? test_equations(inputSymREq, glo.dim_one) : false;

	if(goodR){
		reg(inputSymREq, glo.dim_one);
		const angleXY = getAzimuthElevationAngles(pos);
		const dirXY   = directionXY(angleXY, r);
		
		pos = !glo.addSymmetry ? dirXY : {x: pos.x + dirXY.x, y: pos.y + dirXY.y, z: pos.z + dirXY.z };
	}

	return pos;
}

function expanseRibbonSave(){
	const expansion = glo.params.expansion;

	glo.curves.paths.forEach((line, i) => {
		line.forEach((path, j) => {
			if(h(path.x, path.y, path.z) > ep/10000){
				let angleXY = getAzimuthElevationAngles(glo.curves.paths[i][j]);
				let dist    = 1 + 0.001*BABYLON.Vector3.Distance(path, BABYLON.Vector3.Zero())**-1;

				angleXY.x += glo.angleToUpdateRibbon.x;
				angleXY.y += glo.angleToUpdateRibbon.y;

				const dirXY = directionXY(angleXY, dist, expansion);

				glo.curves.paths[i][j].x += dirXY.x;
				glo.curves.paths[i][j].y += dirXY.y;
				glo.curves.paths[i][j].z += dirXY.z;
			}
		});
	});
}

async function expanseRibbon(){
	const expansion       = glo.params.expansion;
	const centerLocal     = glo.params.centerIsLocal ? glo.ribbon.boundingInfos.boundingBox.center : {x:0,y:0,z:0};
    const center          = new BABYLON.Vector3(glo.centerSymmetry.x + centerLocal.x, glo.centerSymmetry.y + centerLocal.y, glo.centerSymmetry.z + centerLocal.z);
    const verticesNormals = await glo.ribbon.getVerticesData(BABYLON.VertexBuffer.NormalKind);

	let n = 0;
	glo.curves.paths.forEach((line, i) => {
		line.forEach((path, j) => {
				const xN = verticesNormals[n*3]; const yN = verticesNormals[n*3 + 1]; const zN = verticesNormals[n*3 + 2];
				const normalVector = new BABYLON.Vector3(xN, yN, zN);

				const angleXY = getAzimuthElevationAngles(normalVector, center);
				const dist    = BABYLON.Vector3.Distance(path, BABYLON.Vector3.Zero());

				angleXY.x += glo.angleToUpdateRibbon.x;
				angleXY.y += glo.angleToUpdateRibbon.y;

				const dirXY = directionXY(angleXY, dist, expansion);

				glo.curves.paths[i][j].x += dirXY.x;
				glo.curves.paths[i][j].y += dirXY.y;
				glo.curves.paths[i][j].z += dirXY.z;

				n++;
		});
	});
}

async function inverseMeshGeometry(){
	let curvesPathsSave = [...glo.curves.paths];

	if(glo.curves.linesSystems){ glo.curves.linesSystems.forEach(lineSystem => { lineSystem.dispose(true); lineSystem = null; }); }

	let newCurves           = [];
	glo.curves.linesSystems = [];
	newCurves = [];
	curvesPathsSave.forEach((line, i) => {
		newCurves[i] = [];
		line.forEach(path => {
			newCurves[i].push(new BABYLON.Vector3(-path.x, -path.y, -path.z));
		});
	});
	
	glo.curves.paths = newCurves;
	glo.lines = glo.curves.paths;

	if(!glo.normalMode){ make_ribbon(); }
    else{ drawNormalEquations(); }
	makeLineSystem();
}

async function negativeMeshGeometry(axis){
	let curvesPathsSave = [...glo.curves.paths];

	if(glo.curves.linesSystems){ glo.curves.linesSystems.forEach(lineSystem => { lineSystem.dispose(true); lineSystem = null; }); }

	let newCurves           = [];
	glo.curves.linesSystems = [];
	newCurves = [];
	curvesPathsSave.forEach((line, i) => {
		newCurves[i] = [];
		line.forEach(path => {
			switch(axis){
				case "x":
					newCurves[i].push(new BABYLON.Vector3(-path.x, -path.y, path.z));
				break;
				case "y":
					newCurves[i].push(new BABYLON.Vector3(path.x, -path.y, -path.z));
				break;
				case "z":
					newCurves[i].push(new BABYLON.Vector3(-path.x, path.y, -path.z));
				break;
			}
		});
	});
	
	glo.curves.paths = newCurves;
	glo.lines = glo.curves.paths;

	if(!glo.normalMode){ make_ribbon(); }
    else{ drawNormalEquations(); }
	makeLineSystem();
}

async function rotatePathsByEachCenter(alpha = glo.params.functionIt.rotLine.alpha, beta = glo.params.functionIt.rotLine.beta, theta = glo.params.functionIt.rotLine.theta){
	if(alpha || beta || theta){
		let curvesPathsSave = [...glo.curves.paths];

		if(glo.curves.linesSystems){ glo.curves.linesSystems.forEach(lineSystem => { lineSystem.dispose(true); lineSystem = null; }); }

		let newCurves           = [];
		glo.curves.linesSystems = [];
		newCurves = [];
		curvesPathsSave.forEach((line, i) => {
			const center = getCenterOfPaths(line);
			line.forEach((path, i) => {
				path    = rotateOnCenterByBabylonMatrix(path, alpha, beta, theta, center);
				line[i] = path;
			});
			newCurves[i] = line;
		});
		
		glo.curves.paths = newCurves;
		glo.lines        = glo.curves.paths;
	}
}

async function expendPathsByEachCenter(expend = glo.params.functionIt.expend){
	if(expend){
		let curvesPathsSave = [...glo.curves.paths];

		if(glo.curves.linesSystems){ glo.curves.linesSystems.forEach(lineSystem => { lineSystem.dispose(true); lineSystem = null; }); }

		let newCurves           = [];
		glo.curves.linesSystems = [];
		newCurves = [];
		curvesPathsSave.forEach((line, i) => {
			const center = getCenterOfPaths(line);
			line.forEach((path, i) => {
				if(h(path.x, path.y, path.z) > ep/10000){
					let angleXY = getAzimuthElevationAngles(center.subtract(path));
					let dist    = BABYLON.Vector3.Distance(path, center);
	
					const dirXY = directionXY(angleXY, dist, expend);
	
					path.x -= dirXY.x;
					path.y -= dirXY.y;
					path.z -= dirXY.z;
				}

				line[i] = path;
			});
			newCurves[i] = line;
		});
		
		glo.curves.paths = newCurves;
		glo.lines        = glo.curves.paths;
	}
}

function getCenterOfPaths(paths){
	const pathsLength  = paths.length;
	const centerOffset = glo.params.functionIt.rotatePaths.centerOffset;

	let center = {x: 0, y: 0, z: 0};
	paths.forEach(path => {
		center.x += path.x;
		center.y += path.y;
		center.z += path.z;
	});

	center.x/=pathsLength;
	center.y/=pathsLength;
	center.z/=pathsLength;

	return new BABYLON.Vector3(center.x * centerOffset.x, center.y * centerOffset.y, center.z * centerOffset.z);
}

function scaleVertexsDist(scale = 0.5) {
	if(scale !== 1){
		let curvesPathsTmp = [];
		const cTmp         = glo.curves.paths.slice();

		cTmp.forEach((paths, i) => {
			curvesPathsTmp[i] = [];
			paths.forEach((path, j) => {
				curvesPathsTmp[i][j] = path.clone();
			});
		});

		curvesPathsTmp.forEach((paths, n) => {
			for (let i = 1; i < paths.length; i++) {
				const v1 = paths[i - 1], v2 = paths[i];

				// Calculer le vecteur directionnel de v1 à v2
				const direction = v2.subtract(v1);
				// Normaliser le vecteur directionnel
				direction.normalize();
				// Calculer la nouvelle distance souhaitée (par exemple, réduire de 50%)
				const newDist = BABYLON.Vector3.Distance(v1, v2) * scale;
				// Ajuster v2 vers v1 en utilisant le vecteur directionnel et la nouvelle distance
				glo.curves.paths[n][i] = v1.add(direction.scale(newDist));
				if(scale < 1){ curvesPathsTmp[n][i] = v1.add(direction.scale(newDist)); }
			}
		});
	}
}

function transformMesh(transformKind = 'scaling', axis = 'x', value = 2, mesh = glo.ribbon, lines = glo.curves.lineSystem, dblLines = glo.curves.lineSystemDouble){
	mesh[transformKind][axis] = value;
	if(lines){ lines[transformKind][axis] = value; }
	if(dblLines){ dblLines[transformKind][axis] = value; }
}

function isTransformation(){
	const transformations = ['scalingX', 'scalingY', 'scalingZ', 'rotationX', 'rotationY', 'rotationZ', 'positionX', 'positionY', 'positionZ'];

	for(let i = 0; i < transformations.length; i++){
		if(glo.params[transformations[i]]){ return true; }
	}

	return false;
}

function applyTransformations(mesh = glo.ribbon) {
    const transformations = [
        'scalingX', 'scalingY', 'scalingZ',
        'rotationX', 'rotationY', 'rotationZ',
        'positionX', 'positionY', 'positionZ'
    ];

    // Extraire les transformations et les axes
    const transformationsAxis = transformations.map(trans => { 
        return { 
            name: trans, 
            trans: trans.slice(0, trans.length - 1), 
            axis: trans.slice(-1).toLowerCase() 
        }; 
    });

    // Appliquer les transformations (scaling, rotation, position)
	const scale = glo.params.gridScale ? mesh.gridScale() : 1;
	mesh.gridScaleValue = scale;
    transformationsAxis.forEach(transformationsAxis => {
        if (glo.params[transformationsAxis.name]) {
			if(transformationsAxis.trans === 'scaling'){
				transformMesh(transformationsAxis.trans, transformationsAxis.axis, glo.params[transformationsAxis.name] * scale);
			}
			else{ transformMesh(transformationsAxis.trans, transformationsAxis.axis, glo.params[transformationsAxis.name]); } 
        }
    });

	mesh.computeWorldMatrix(true);
	mesh.refreshBoundingInfo();
}

function reformatPaths(originalPaths = glo.curves.paths) {
    // Déterminer le nombre de chemins et la longueur du chemin le plus long
    const numPaths = originalPaths.length;
    let maxPathLength = 0;
    originalPaths.forEach(path => {
        if (path.length > maxPathLength) {
            maxPathLength = path.length;
        }
    });

    // Initialiser le nouveau tableau de chemins
    const newPaths = [];

    // Construire chaque nouveau chemin en prenant le nième point de chaque chemin original
    for (let i = 0; i < maxPathLength; i++) {
        const newPath = [];
        for (let j = 0; j < numPaths; j++) {
            if (i < originalPaths[j].length) { // Vérifie si le point existe
                newPath.push(originalPaths[j][i]);
            }
        }
        newPaths.push(newPath);
    }

	glo.curves.doublePaths = newPaths;

    return newPaths;
}

async function mergeManyMeshesByIntersects(meshes) {
    let finalMesh = meshes[0];

    for (let i = 1; i < meshes.length; i++) {
       finalMesh = await mergeMeshesByIntersects(finalMesh, meshes[i]);
    }

    return finalMesh;
}
async function mergeMeshesByIntersects(mesh1, mesh2) {
    mesh1.computeWorldMatrix(true);
    mesh2.computeWorldMatrix(true);
    var csg1 = BABYLON.CSG.FromMesh(mesh1);
    var csg2 = BABYLON.CSG.FromMesh(mesh2);
    var csg3 = csg2.intersect(csg1); 
    
    let finalMesh = csg3.toMesh('section');
    finalMesh.computeWorldMatrix(true);

	mesh1.dispose();
	mesh2.dispose();

    return finalMesh;
}

function turnVerticesDatasToPaths(verticesDatas = glo.ribbon.getVerticesData(BABYLON.VertexBuffer.PositionKind), coeff){
	let paths = [];
	let n = 0;

	const stepsU = coeff ? ((glo.params.steps_u + 1) * coeff) : glo.pathsInfos.u;
	for(let i = 0; i <= stepsU - 1; i++){
		paths[i] = [];
		for(let j = 0; j <= glo.params.steps_v; j++){
			const v = { x: verticesDatas[n*3], y: verticesDatas[n*3 + 1], z: verticesDatas[n*3 + 2] };
			paths[i].push(new BABYLON.Vector3(v.x, v.y, v.z));

			n++;
		}
	}
	return paths;
}

function paramsOrFractNbPaths(uOrV, paramsNBPaths, fractalizeKind){
	return glo.params.fractalize.actived && fractalizeKind ?
	       (fractalizeKind === 'fractalize' ? glo.params.fractalize.steps[uOrV] : glo.params.fractalize.fractalized.steps[uOrV]) :
		   paramsNBPaths;
}

function countSyms(){
	return (glo.params.symmetrizeX ? glo.params.symmetrizeX : 1) *
	(glo.params.symmetrizeY ? glo.params.symmetrizeY : 1) *
	(glo.params.symmetrizeZ ? glo.params.symmetrizeZ : 1);
}

function isSym(){
	return (glo.params.symmetrizeX + glo.params.symmetrizeY + glo.params.symmetrizeZ) ? true : false;
}