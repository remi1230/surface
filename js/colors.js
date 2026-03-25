/**
 * Generates a visually coherent color theme using HSL color space.
 * A random base hue is shared across all four colors, while lightness is driven
 * by the {@link lightLevel} parameter (0 = very dark, 10 = very bright).
 * Buttons and mesh colors are computed to contrast with the background.
 * @param {number} [lightLevel=glo.randomizeColorLightLevel] - Brightness level from 0 to 10.
 * @returns {{bgColor: BABYLON.Color3, btnColor: BABYLON.Color3, meshColor: BABYLON.Color3, lineColor: BABYLON.Color3}}
 */
function generateColorTheme(lightLevel = glo.randomizeColorLightLevel) {
    const t = clamp01(lightLevel / 10);

    const baseHue = Math.random() * 360;

    const bgLightness = 0.08 + t * 0.75;
    const bgSaturation = 0.15 + Math.random() * 0.25;
    const bgColor = hslToBabylonColor3(baseHue, bgSaturation, bgLightness);

    const btnLightness = t > 0.5
        ? bgLightness - 0.4 - Math.random() * 0.15
        : bgLightness + 0.4 + Math.random() * 0.15;
    const btnHueShift = 20 + Math.random() * 40;
    const btnColor = hslToBabylonColor3(
        baseHue + btnHueShift,
        0.3 + Math.random() * 0.4,
        clamp01(btnLightness)
    );

    const meshLightness = t > 0.5
        ? bgLightness - 0.25 - Math.random() * 0.2
        : bgLightness + 0.25 + Math.random() * 0.2;
    const meshColor = hslToBabylonColor3(
        baseHue + 180 + (Math.random() - 0.5) * 40,
        0.4 + Math.random() * 0.4,
        clamp01(meshLightness)
    );

    const lineLightnessOffset = t > 0.5 ? -0.15 : 0.15;
    const lineColor = hslToBabylonColor3(
        baseHue,
        bgSaturation * 0.5,
        clamp01(bgLightness + lineLightnessOffset)
    );

    return { bgColor, btnColor, meshColor, lineColor };
}

/**
 * Converts an HSL color to a BabylonJS Color3.
 * @param {number} h - Hue in degrees (0–360).
 * @param {number} s - Saturation (0–1).
 * @param {number} l - Lightness (0–1).
 * @returns {BABYLON.Color3}
 */
function hslToBabylonColor3(h, s, l) {
    h = ((h % 360) + 360) % 360;
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
 * Applies a generated color theme to the four color picker controls.
 * @param {{bgColor: BABYLON.Color3, btnColor: BABYLON.Color3, meshColor: BABYLON.Color3, lineColor: BABYLON.Color3}} theme
 */
function applyTheme(theme){
    glo.allControls.getByName('pickerColorBackground').value = theme.bgColor;
    glo.allControls.getByName('pickerColorButton').value     = theme.btnColor;
    glo.allControls.getByName('pickerColorMeshBg').value     = theme.meshColor;
    glo.allControls.getByName('pickerColorLine').value       = theme.lineColor;
}

/**
 * Generates and applies a coherent random color theme with guaranteed
 * button/background contrast. Falls back to black or white buttons
 * if the WCAG contrast ratio is below 3.0.
 * @param {number} [lightLevel=glo.randomizeColorLightLevel] - Brightness level (0–10).
 */
function specialRandomizeColorsApp(lightLevel = glo.randomizeColorLightLevel) {
    const theme = generateColorTheme(lightLevel);

    if (contrastRatio(theme.bgColor, theme.btnColor) < 3.0) {
        const bgLum = relativeLuminance(theme.bgColor);
        theme.btnColor = bgLum > 0.5
            ? new BABYLON.Color3(0.1, 0.1, 0.1)
            : new BABYLON.Color3(0.95, 0.95, 0.95);
    }

    applyTheme(theme);
}

/**
 * Assigns a fully random color to every color picker control.
 */
function randomizeColorsApp(){
	glo.allControls.haveThisClass('picker').map(pickerColor => {
		pickerColor.value = BABYLON.Color3.Random();
	});
}

/**
 * Resets all color pickers and button colors to the default theme.
 */
function intiColorUI(){
	defaultTheme.apply();

	glo.allControls.haveThisClass('button').forEach(button => {
	  button.color = glo.buttonsColor;
    });
}

/**
 * Clamps a value to the [0, 1] range.
 * @param {number} v
 * @returns {number}
 */
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/**
 * Generates a random BabylonJS Color3 with each component in [min, max].
 * @param {number} [min=0] - Lower bound for each RGB component.
 * @param {number} [max=1] - Upper bound for each RGB component.
 * @returns {BABYLON.Color3}
 */
function getRndBabylonColorInRange(min = 0, max = 1) {
    const rnd = () => clamp01(min + (max - min) * Math.random());
    return new BABYLON.Color3(rnd(), rnd(), rnd());
}

/**
 * Computes the WCAG 2.x relative luminance of a color.
 * Applies sRGB gamma linearization before computing.
 * @param {BABYLON.Color3} color
 * @returns {number} Relative luminance in [0, 1].
 */
function relativeLuminance(color) {
    const linearize = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * linearize(color.r) + 0.7152 * linearize(color.g) + 0.0722 * linearize(color.b);
}

/**
 * Computes the WCAG contrast ratio between two colors.
 * @param {BABYLON.Color3} color1
 * @param {BABYLON.Color3} color2
 * @returns {number} Contrast ratio from 1 (identical) to 21 (black/white).
 */
function contrastRatio(color1, color2) {
    const l1 = relativeLuminance(color1);
    const l2 = relativeLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker  = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Generates a random button color that meets a minimum contrast ratio against
 * the given background. Adjusts the lightness range based on background luminance,
 * retries up to {@link maxAttempts} times, then falls back to black or white.
 * @param {BABYLON.Color3} bgColor - Background color to contrast against.
 * @param {number} minLight - Minimum lightness for candidates.
 * @param {number} maxLight - Maximum lightness for candidates.
 * @param {number} [minContrast=4.5] - Minimum acceptable WCAG contrast ratio.
 * @param {number} [maxAttempts=30] - Maximum generation attempts before fallback.
 * @returns {BABYLON.Color3}
 */
function getRndButtonColorWithContrast(bgColor, minLight, maxLight, minContrast = 4.5, maxAttempts = 30) {
    const bgLum = relativeLuminance(bgColor);

    let adjMin = minLight;
    let adjMax = maxLight;
    if (bgLum < 0.2) {
        adjMin = Math.max(adjMin, 0.6);
        adjMax = Math.max(adjMax, 1.0);
    } else if (bgLum > 0.5) {
        adjMin = Math.min(adjMin, 0.0);
        adjMax = Math.min(adjMax, 0.3);
    } else {
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

/**
 * Computes the complementary (inverted) color, optionally darkened by a factor.
 * @param {BABYLON.Color3} color3 - Source color.
 * @param {number} [darkForce=1] - Darkening multiplier applied before inversion (1 = pure complement).
 * @returns {BABYLON.Color3}
 */
function getComplementaryColor(color3, darkForce = 1){
	function calculateColor(col){
		return 1 - col*darkForce;
	}

	var r = calculateColor(color3.r); var g = calculateColor(color3.g); var b = calculateColor(color3.b);
	r = r > 0 ? r : 0; g = g > 0 ? g : 0; b = b > 0 ? b : 0;
	r = r < 1 ? r : 1; g = g < 1 ? g : 1; b = b < 1 ? b : 1;
	return new BABYLON.Color3(r, g, b);
}

/**
 * Darkens a color by dividing each component by the given factor.
 * @param {BABYLON.Color3} color3
 * @param {number} force - Divisor (higher = darker).
 * @returns {BABYLON.Color3}
 */
function darkingColor(color3, force){
	var r = color3.r / force; var g = color3.g / force; var b = color3.b / force;
	return new BABYLON.Color3(r, g, b);
}

/**
 * Lightens a color by multiplying each component by the given factor, clamped to 1.
 * @param {BABYLON.Color3} color3
 * @param {number} force - Multiplier (higher = lighter).
 * @returns {BABYLON.Color3}
 */
function lightingColor(color3, force){
	var r = color3.r * force; var g = color3.g * force; var b = color3.b * force;
	r = r < 1 ? r : 1; g = g < 1 ? g : 1; b = b < 1 ? b : 1;
	return new BABYLON.Color3(r, g, b);
}

/**
 * Generates a random dark color by rejection-sampling until brightness and
 * channel-dominance constraints are met.
 * @param {number} [force=0] - Darkness level from 0 (medium-dark) to 4 (very dark).
 * @returns {BABYLON.Color3}
 */
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

/**
 * Generates a single random color candidate and checks dark-color constraints.
 * @param {number} force - Maximum brightness threshold.
 * @returns {{color: BABYLON.Color3, reg: boolean}} `reg` is true if the candidate was rejected.
 */
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

/**
 * Generates a random light color by rejection-sampling until brightness exceeds the threshold.
 * @param {number} [force=0] - Brightness level from 0 (medium-light) to 4.9 (very bright).
 * @returns {BABYLON.Color3}
 */
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

/**
 * Converts a normalized RGB color ({r, g, b} in [0, 1]) to a hex string (e.g. "#ff8040").
 * @param {{r: number, g: number, b: number}} color
 * @returns {string} Hex color string with leading "#".
 */
function rgbNormalizedToHex({ r, g, b }) {
	const to255 = x => Math.round(Math.min(1, Math.max(0, x)) * 255);
	const toHex = x => to255(x).toString(16).padStart(2, '0');

	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Converts a hex color string (e.g. "#ff8040") to a BabylonJS Color3.
 * @param {string} hex - Hex color string, with or without leading "#".
 * @returns {BABYLON.Color3}
 */
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

/**
 * Logs the current values of all four color picker controls to the console
 * as BabylonJS Color3 constructor calls, rounded to 4 decimal places.
 * Useful for exporting color themes.
 */
function whatColors(){
	const roundTo = (val, n) => Math.round(val * Math.pow(10, n), n) / Math.pow(10, n);

	const roundColor = (color, n) => new BABYLON.Color3(
		roundTo(color.r, n),
		roundTo(color.g, n),
		roundTo(color.b, n)
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