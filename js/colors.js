/**
 * Génère un thème coloré cohérent à partir d'un lightLevel (0-10).
 * 
 * Principe : on travaille en HSL pour contrôler indépendamment
 * la teinte (aléatoire), la saturation, et la luminosité (pilotée par lightLevel).
 */
function generateColorTheme(lightLevel = glo.randomizeColorLightLevel) {
    const t = clamp01(lightLevel / 10); // 0 = très sombre, 1 = très clair

    // Teinte aléatoire partagée (cohérence visuelle)
    const baseHue = Math.random() * 360;

    // --- Fond ---
    // Luminosité directement liée au lightLevel
    const bgLightness = 0.08 + t * 0.75; // de 0.08 (quasi noir) à 0.83 (très clair)
    const bgSaturation = 0.15 + Math.random() * 0.25; // sobre, pas criard
    const bgColor = hslToBabylonColor3(baseHue, bgSaturation, bgLightness);

    // --- Boutons : contraste fort garanti ---
    // Si fond clair → boutons sombres, et inversement
    const btnLightness = t > 0.5
        ? bgLightness - 0.4 - Math.random() * 0.15  // fond clair → boutons sombres
        : bgLightness + 0.4 + Math.random() * 0.15; // fond sombre → boutons clairs
    const btnHueShift = 20 + Math.random() * 40; // légère variation de teinte
    const btnColor = hslToBabylonColor3(
        baseHue + btnHueShift,
        0.3 + Math.random() * 0.4,
        clamp01(btnLightness)
    );

    // --- Mesh : complémentaire au fond ---
    const meshLightness = t > 0.5
        ? bgLightness - 0.25 - Math.random() * 0.2
        : bgLightness + 0.25 + Math.random() * 0.2;
    const meshColor = hslToBabylonColor3(
        baseHue + 180 + (Math.random() - 0.5) * 40, // complémentaire ± variation
        0.4 + Math.random() * 0.4,
        clamp01(meshLightness)
    );

    // --- Lignes : proche du fond mais visible ---
    const lineLightnessOffset = t > 0.5 ? -0.15 : 0.15;
    const lineColor = hslToBabylonColor3(
        baseHue,
        bgSaturation * 0.5,
        clamp01(bgLightness + lineLightnessOffset)
    );

    return { bgColor, btnColor, meshColor, lineColor };
}

/**
 * Conversion HSL → BABYLON.Color3
 * h: 0-360, s: 0-1, l: 0-1
 */
function hslToBabylonColor3(h, s, l) {
    h = ((h % 360) + 360) % 360; // normaliser la teinte
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;

    let r, g, b;
    if      (h < 60)  { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else              { r = c; g = 0; b = x; }

    return new BABYLON.Color3(
        clamp01(r + m),
        clamp01(g + m),
        clamp01(b + m)
    );
}

/**
 * Applique le thème à l'UI
 */
function special_randomize_colors_app(lightLevel = glo.randomizeColorLightLevel) {
    const theme = generateColorTheme(lightLevel);

    // Vérification de sécurité du contraste bouton/fond
    if (contrastRatio(theme.bgColor, theme.btnColor) < 3.0) {
        const bgLum = relativeLuminance(theme.bgColor);
        theme.btnColor = bgLum > 0.5
            ? new BABYLON.Color3(0.1, 0.1, 0.1)
            : new BABYLON.Color3(0.95, 0.95, 0.95);
    }

    glo.allControls.getByName('pickerColorBackground').value = theme.bgColor;
    glo.allControls.getByName('pickerColorButton').value     = theme.btnColor;
    glo.allControls.getByName('pickerColorMeshBg').value     = theme.meshColor;
    glo.allControls.getByName('pickerColorLine').value       = theme.lineColor;
}

function randomize_colors_app(){
	glo.allControls.haveThisClass('picker').map(picker_color => {
		picker_color.value = BABYLON.Color3.Random();
	});
}

function special_randomize_colors_app_old(lightLevel = glo.randomizeColorLightLevel) {
    const range = lightLevel < 4 ? 0.1 : lightLevel < 7 ? 0.2 : 0.3;
    const minLight = clamp01(lightLevel / 10);
    const maxLight = clamp01(minLight + range);

    const bgColor  = getRndBabylonColorInRange(minLight, maxLight);
    const btnColor = getRndButtonColorWithContrast(bgColor, 1.0 - maxLight, 1.0 - minLight);

    glo.allControls.getByName('pickerColorBackground').value = bgColor;
    glo.allControls.getByName('pickerColorButton').value     = btnColor;
    glo.allControls.getByName('pickerColorMeshBg').value     = bgColor.inv();
    glo.allControls.getByName('pickerColorLine').value       = bgColor;
}

function intiColorUI(){
	glo.allControls.getByName('pickerColorBackground').value = glo.initialColor.backgroundColor;
	glo.allControls.getByName('pickerColorMeshBg').value     = glo.initialColor.emissiveColor;
	glo.allControls.getByName('pickerColorButton').value     = hexToRgbNormalized(glo.buttons_background);
	glo.allControls.getByName('pickerColorLine').value       = glo.initialColor.lineColor;

	glo.allControls.haveThisClass('button').forEach(button => {
      button.background = glo.buttons_background;
	  button.color      = glo.buttons_color;
    });
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));

function getRndBabylonColorInRange(min = 0, max = 1) {
    const rnd = () => clamp01(min + (max - min) * Math.random());
    return new BABYLON.Color3(rnd(), rnd(), rnd());
}

/**
 * Luminance relative (WCAG 2.x)
 * Entrée : BABYLON.Color3 (composantes linéaires dans [0,1])
 * Si tes couleurs sont en sRGB, on applique la linéarisation gamma.
 */
function relativeLuminance(color) {
    const linearize = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * linearize(color.r) + 0.7152 * linearize(color.g) + 0.0722 * linearize(color.b);
}

/**
 * Ratio de contraste WCAG entre deux couleurs.
 * Retourne une valeur entre 1 (identique) et 21 (noir/blanc).
 * WCAG AA : >= 4.5 pour du texte normal, >= 3 pour du gros texte.
 */
function contrastRatio(color1, color2) {
    const l1 = relativeLuminance(color1);
    const l2 = relativeLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker  = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Génère une couleur de bouton avec contraste garanti par rapport au fond.
 * Regénère jusqu'à maxAttempts fois, puis fallback noir ou blanc.
 */
function getRndButtonColorWithContrast(bgColor, minLight, maxLight, minContrast = 4.5, maxAttempts = 30) {
    // Élargir la plage pour garantir qu'un contraste suffisant est possible
    const bgLum = relativeLuminance(bgColor);
    
    // Si le fond est sombre, les boutons doivent être clairs (et inversement)
    let adjMin = minLight;
    let adjMax = maxLight;
    if (bgLum < 0.2) {
        adjMin = Math.max(adjMin, 0.6);
        adjMax = Math.max(adjMax, 1.0);
    } else if (bgLum > 0.5) {
        adjMin = Math.min(adjMin, 0.0);
        adjMax = Math.min(adjMax, 0.3);
    } else {
        // Zone grise : on force les extrêmes
        adjMin = 0.75;
        adjMax = 1.0;
    }

    for (let i = 0; i < maxAttempts; i++) {
        const candidate = getRndBabylonColorInRange(adjMin, adjMax);
        if (contrastRatio(bgColor, candidate) >= minContrast) {
            return candidate;
        }
    }

    return bgLum > 0.5 ? new BABYLON.Color3(0, 0, 0) : new BABYLON.Color3(1, 1, 1);
}

function getRndBabylonColorInRange(min = 0, max = 1) {
    const rnd = () => clamp01(min + (max - min) * Math.random());
    return new BABYLON.Color3(rnd(), rnd(), rnd());
}

function getComplementaryColor(color3, darkForce = 1){
	function calcul_color(col){
		return 1 - col*darkForce;
	}

	var r = calcul_color(color3.r); var g = calcul_color(color3.g); var b = calcul_color(color3.b);
	r = r > 0 ? r : 0; g = g > 0 ? g : 0; b = b > 0 ? b : 0;
	r = r < 1 ? r : 1; g = g < 1 ? g : 1; b = b < 1 ? b : 1;
	return new BABYLON.Color3(r, g, b);
}
function darkingColor(color3, force){
	var r = color3.r / force; var g = color3.g / force; var b = color3.b / force;
	return new BABYLON.Color3(r, g, b);
}
function lightingColor(color3, force){
	var r = color3.r * force; var g = color3.g * force; var b = color3.b * force;
	r = r < 1 ? r : 1; g = g < 1 ? g : 1; b = b < 1 ? b : 1;
	return new BABYLON.Color3(r, g, b);
}

function getRndDarkColor(force = 0){
	if(force >= 5){ force = 4; }
	else if(force < 0){ force = 0; }
	force = 0.5 - (force / 10);

	var rndObjectDarkColor = getRndObjectDarkColor(force);
	while(rndObjectDarkColor.reg){
		rndObjectDarkColor = getRndObjectDarkColor(force);
	}
	return rndObjectDarkColor.color;
}

function getRndObjectDarkColor(force){
	var keepSup = 0.05;
	var color = BABYLON.Color3.Random();
	var verifColor1 = color.r * color.g * color.b > Math.pow(force, 3);
	var verifColor2 = color.r < keepSup || color.g < keepSup || color.b < keepSup;
	var regRed = color.r > (color.g + color.b) * 1.25;
	var regGreen = color.g > (color.r + color.b) * 1.25;
	var regBlue = color.b > (color.r + color.g) * 1.25;
	var noPurpleInComplementaryColor = color.r > 0.07 * 0.5 && color.r < 0.07 * 2 && color.g > 0.18 * 0.5 && color.g < 0.18 * 2 && color.b > 0.07 * 0.5 && color.b < 0.07 * 2;

	var reg = verifColor1 || verifColor2 || regRed || regGreen || regBlue || noPurpleInComplementaryColor;

	return {color: color, reg: reg };
}

function getRndLightColor(force = 0){
	var color = BABYLON.Color3.Random();
	var verifColor = color.r * color.g * color.b;

	if(force >= 5){ force = 4.9; }
	else if(force < 0){ force = 0; }
	force = 0.5 + (force / 10);
	while(verifColor < Math.pow(force, 3)){
		color = BABYLON.Color3.Random();
		verifColor = color.r * color.g * color.b;
	}
	return color;
}

function rgbNormalizedToHex({ r, g, b }) {
	// Convertit chaque composante en entier entre 0 et 255
	const to255 = x => Math.round(Math.min(1, Math.max(0, x)) * 255);

	// Convertit en hex, en ajoutant un 0 si besoin
	const toHex = x => to255(x).toString(16).padStart(2, '0');

	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgbNormalized(hex) {
    hex = hex.replace(/^#/, '');
    return new BABYLON.Color3
		(
			parseInt(hex.slice(0, 2), 16) / 255,
			parseInt(hex.slice(2, 4), 16) / 255,
			parseInt(hex.slice(4, 6), 16) / 255
		)
    ;
}

function whatColors(){
	const arround = (val, n) => Math.round(val * Math.pow(10, n), n) / Math.pow(10, n);

	const roundColor = (color, n) => new BABYLON.Color3(
		arround(color.r, n),
		arround(color.g, n),
		arround(color.b, n)
	);

	const decimalPrecision = 4;
	const UiBg     = roundColor(glo.allControls.getByName('pickerColorBackground').value, decimalPrecision);
	const UiButton = roundColor(glo.allControls.getByName('pickerColorButton').value, decimalPrecision);
	const MeshBg   = roundColor(glo.allControls.getByName('pickerColorMeshBg').value, decimalPrecision);
	const MeshLine = roundColor(glo.allControls.getByName('pickerColorLine').value, decimalPrecision);

	console.log(
		`pickerColorBackground: new BABYLON.Color3(${UiBg.r}, ${UiBg.g}, ${UiBg.b}),\n`,
		`pickerColorButton: new BABYLON.Color3(${UiButton.r}, ${UiButton.g}, ${UiButton.b}),\n`,
		`pickerColorMeshBg: new BABYLON.Color3(${MeshBg.r}, ${MeshBg.g}, ${MeshBg.b}),\n`,
		`pickerColorLine: new BABYLON.Color3(${MeshLine.r}, ${MeshLine.g}, ${MeshLine.b}),\n`,
	);
}