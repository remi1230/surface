# SURFACE - Awesome Lists Pull Request Texts

Ready-to-use PR texts for submitting SURFACE to three GitHub Awesome Lists.

---

## 1. awesome-creative-coding

- **Repository:** https://github.com/terkelg/awesome-creative-coding
- **Contributing guidelines:** https://github.com/terkelg/awesome-creative-coding/blob/main/contributing.md

### Target section

**Tools > Online** (line ~231, after the last entry "Hydra")

This section lists browser-based creative coding tools such as Shadertoy, GLSL Sandbox, and Shader Park. SURFACE fits here as a browser-based tool for real-time parametric surface exploration with GLSL shader editing.

### Exact line to add

```markdown
- [SURFACE](https://github.com/remi1230/surface) - Real-time parametric surface explorer with equation input, GLSL shader editors, symmetry, animation, and OBJ/STL export.
```

### PR title

```
Add SURFACE to Online tools
```

### PR description

```
SURFACE is a browser-based real-time parametric surface explorer built with BabylonJS.

It lets users input parametric equations, edit GLSL shaders live, apply symmetry
transformations, animate surfaces, and export to OBJ/STL — all from the browser
with no installation required.

Live app: https://surfaces.netlify.app/

- [x] I have read the contribution guidelines.
- [x] This is not a duplicate of an existing suggestion.
- [x] The project has been available for more than two weeks.
```

---

## 2. awesome-webgl

- **Repository:** https://github.com/sjfricke/awesome-webgl
- **Contributing guidelines:** https://github.com/sjfricke/awesome-webgl/blob/master/CONTRIBUTING.md

### Target section

**Libraries > Others** (line ~322, after "Whitestorm.js")

This section lists WebGL frameworks and libraries such as Babylon.js, Three.js, PlayCanvas, and Regl. SURFACE fits here as a WebGL application built on Babylon.js that demonstrates advanced WebGL rendering of parametric surfaces.

### Exact line to add

```markdown
* [SURFACE](https://github.com/remi1230/surface) - Real-time parametric surface explorer with GLSL shader editors, symmetry, animation, and OBJ/STL export, built with BabylonJS.
```

### PR title

```
Add SURFACE to Libraries - Others
```

### PR description

```
SURFACE is a browser-based real-time parametric surface explorer built on top of
BabylonJS / WebGL. Users can input parametric equations, edit GLSL vertex and
fragment shaders live, apply symmetry transformations, animate surfaces, and
export geometry to OBJ/STL.

Live app: https://surfaces.netlify.app/

- Link additions added to the bottom of the relevant category
- Individual PR for this single suggestion
- Follows the formatting convention: `[NAME](LINK) - DESCRIPTION.`
```

---

## 3. awesome-math

- **Repository:** https://github.com/rossant/awesome-math
- **Contributing guidelines:** https://github.com/rossant/awesome-math/blob/master/contributing.md

### Target section

**General Resources > Tools** (line ~149, after the last entry in the Tools section)

This section lists interactive math tools such as Desmos, GeoGebra, Wolfram Alpha, and Symbolab. SURFACE fits here as an interactive tool for exploring parametric surfaces defined by mathematical equations.

### Exact line to add

```markdown
* [SURFACE](https://surfaces.netlify.app/) - Real-time parametric surface explorer with equation input, GLSL shaders, symmetry, and animation ([GitHub](https://github.com/remi1230/surface))
```

### PR title

```
Add SURFACE to Tools
```

### PR description

```
SURFACE is a free, browser-based interactive tool for exploring parametric surfaces
defined by mathematical equations. Users can input parametric equations (x(u,v),
y(u,v), z(u,v)), visualize them in real time, apply symmetry transformations,
animate parameters, edit GLSL shaders, and export geometry to OBJ/STL.

GitHub: https://github.com/remi1230/surface
Live app: https://surfaces.netlify.app/

- Individual pull request for a single suggestion
- Follows the format: `[Item Name](link) - Description`
```

---

## Notes

- **awesome-creative-coding** uses the dash-prefix format: `- [Name](url) - Description.` (descriptions end with a period).
- **awesome-webgl** uses the asterisk-prefix format: `* [Name](url) - Description.` (descriptions end with a period, entries added to bottom of category alphabetically).
- **awesome-math** uses the asterisk-prefix format: `* [Name](url) - Description` (Tools section entries are plain links or have brief descriptions; no strict period requirement, but some entries include one). The contributing guidelines specify: `[Item Name](link) - Author (University)` but the Tools section uses a simpler format since tools are not academic papers.
- For each list, fork the repository first, make the edit on a new branch, then open the PR with the text above.
