# Launch Texts — SURFACE

Ready-to-use texts for launching SURFACE on various platforms.

---

## GitHub Repository Description (one-liner)

```
Real-time parametric surface explorer — write math equations, customize GLSL shaders, apply symmetries, animate and export to OBJ/STL. Runs in your browser.
```

**Website field:** `https://remi1230.github.io/surface/`

---

## Video Recording Scenarios

Record these clips using the built-in video recorder in SURFACE (15–30 seconds each).
These can be posted directly as video/GIF on Reddit and other platforms.

### Scenario 1 — "From equation to surface" (r/math)
1. Start with empty equation fields
2. Type `cos(u)*(3+cos(v))` in X, `sin(u)*(3+cos(v))` in Y, `sin(v)` in Z → a torus appears
3. Change X to `cos(u)*(3+cos(v)+sin(5*u))` → the torus deforms live
4. Adjust the U/V sliders to open/close the surface

### Scenario 2 — "Symmetry explosion" (r/generativeart, r/creativecoding)
1. Start with a simple form (e.g. Catenoid or CosSin)
2. Apply deformation `m(1)` → organic bumps appear
3. Increase Symmetrize X from 1 to 6 → the shape multiplies
4. Increase Symmetrize Y from 1 to 6 → kaleidoscopic effect
5. Hit `h` to randomize colors a few times
6. Enable time animation (`a` key) → the whole thing breathes

### Scenario 3 — "Shader playground" (r/webgl, r/creativecoding)
1. Open the fragment shader editor
2. Show the GLSL code, make a visible change (e.g. add a color based on position)
3. Hit Ctrl+S to compile → colors update instantly
4. Switch to the normal deformation editor
5. Write a deformation → the mesh warps in real time

### Scenario 4 — "3D printing pipeline" (r/3Dprinting, r/math)
1. Pick a complex symmetrized surface
2. Show the mesh in wireframe mode (Shift+B)
3. Open Export dialog → select STL
4. Quick shot of the exported file

---

## Reddit Posts — Video/Image format

### r/generativeart (post as Video)

**Title:**
```
I made a tool that turns math equations into animated 3D art — apply symmetry, GLSL shaders, and export for 3D printing [OC]
```

**First comment:**
```
This is SURFACE, a free browser-based tool for creating parametric surfaces.

What you see in the video:
- Writing a math equation that generates a 3D mesh in real time
- Applying symmetry (repeat up to 48x per axis)
- Randomizing colors
- Normal deformation that creates organic patterns

Try it yourself (no install): https://surfaces.netlify.app/
Source code: https://github.com/remi1230/surface (MIT license)

Built with BabylonJS and GLSL. Completely client-side, nothing sent to any server.
```

---

### r/creativecoding (post as Video)

**Title:**
```
Real-time parametric surfaces from math equations — with GLSL shaders, symmetry, and animation
```

**First comment:**
```
I built this tool to explore parametric surfaces interactively. You write f(u,v) equations and the mesh updates in real time.

Features:
- Shorthand math: write "cu" for cos(u), "2u" for 2*u
- 20+ deformation functions (gyroid patterns, exponential cosines...)
- Symmetrize along X/Y/Z for kaleidoscopic effects
- Two GLSL editors (color + deformation) with live compilation
- Export to OBJ/STL for 3D printing
- Built-in video recorder

Free, open source, runs in browser: https://surfaces.netlify.app/
GitHub: https://github.com/remi1230/surface
```

---

### r/math (post as Image + Text)

**Title:**
```
I built a free browser tool for exploring parametric surfaces — supports Cartesian, Spherical and Cylindrical coordinates, 50+ built-in forms
```

**Body:**
```
I've been working on SURFACE, an open-source tool for creating parametric surfaces interactively in the browser.

[Screenshot of a complex surface with equations visible]

You write X(u,v), Y(u,v), Z(u,v) equations and the 3D mesh updates in real time. It supports Cartesian, Spherical and Cylindrical coordinate systems.

What makes it different from a simple graphing tool:
- Shorthand notation: write "cu" for cos(u), "sv" for sin(v), "cufv" for cos(u*v)
- Normal deformation: displace vertices along surface normals using custom functions
- Symmetry: repeat the surface along axes to create kaleidoscopic patterns
- GLSL shaders: two built-in editors for custom coloring and deformation
- Export to OBJ/STL for 3D printing
- Time variable "t" for animated surfaces

50+ built-in surfaces included (torus, Möbius strip, Klein bottle, catenoid, etc.) and you can define your own.

Try it: https://surfaces.netlify.app/
Source: https://github.com/remi1230/surface (MIT license)

Would love feedback from the math community — especially on what surfaces or functions to add!
```

---

### r/webgl (post as Video)

**Title:**
```
Open-source parametric surface explorer built with BabylonJS — live GLSL editing, symmetry system, 20+ custom shader functions
```

**First comment:**
```
I built SURFACE, a real-time parametric surface tool using BabylonJS, WebGL2, and Monaco Editor.

Technical highlights:
- GPU-computed mesh with custom vertex and fragment shaders
- Equation parser with regex-based macro expansion ("cu" → cos(u))
- Two Monaco editors for live GLSL editing (fragment color + normal deformation)
- Symmetry system that repeats mesh geometry along arbitrary axes
- Full shader CRUD (create, save, delete, import/export) with localStorage
- Video recording via MediaRecorder API with canvas capture
- Export to OBJ/STL/JSON

20+ custom GLSL deformation functions included (multiplicative cosines, additive cosines, phase-shifted patterns, exponential cosines...).

No build step — vanilla JS + CDN dependencies.

Live: https://surfaces.netlify.app/
GitHub: https://github.com/remi1230/surface (MIT)
```

---

### r/3Dprinting (post as Image)

**Title:**
```
I made a free tool that generates complex mathematical 3D surfaces you can export as STL — no CAD skills needed, just type an equation
```

**First comment:**
```
SURFACE is a browser tool that creates 3D meshes from parametric equations. You can:

- Pick from 50+ built-in mathematical surfaces
- Apply symmetry to multiply the shape along axes
- Deform the surface with custom functions
- Export directly to STL or OBJ

It's completely free and runs in your browser: https://surfaces.netlify.app/

Some surfaces that print well:
- Gyroid patterns (use the m() function)
- Symmetrized shells (spherical coords + symmetrize)
- Wave-deformed tori

Source code: https://github.com/remi1230/surface
```

---

## Reddit Posts — Text format (kept from original)

### r/math (alternative text-only post)

**Title:**
```
I built a free browser tool for exploring parametric surfaces with real-time equations and GLSL shaders
```

**Body:**
```
I've been working on SURFACE, an open-source tool for creating parametric surfaces interactively in the browser.

You write X(u,v), Y(u,v), Z(u,v) equations and the 3D mesh updates in real time. It supports Cartesian, Spherical and Cylindrical coordinate systems.

What makes it different from a simple graphing tool:
- Shorthand notation: write "cu" for cos(u), "sv" for sin(v), "cufv" for cos(u*v)
- Normal deformation: displace vertices along surface normals using custom functions
- Symmetry: repeat the surface along axes to create kaleidoscopic patterns
- GLSL shaders: two built-in editors for custom coloring and deformation
- Export to OBJ/STL for 3D printing

50+ built-in surfaces included (torus, Mobius strip, Klein bottle, catenoid, etc.) and you can define your own.

Try it: https://surfaces.netlify.app/
Source: https://github.com/remi1230/surface (MIT license)

Would love feedback from the math community — especially on what surfaces or functions to add!
```

---

## Hacker News — Show HN

**Title (80 chars max):**
```
Show HN: SURFACE – Explore parametric surfaces with equations and GLSL shaders
```

**Body:**
```
SURFACE is a free, open-source, browser-based tool for creating and exploring 3D parametric surfaces.

You write X(u,v), Y(u,v), Z(u,v) and the mesh updates in real time. It includes a shorthand notation (write "cu" instead of "cos(u)"), two Monaco-based GLSL editors for color and deformation, a symmetry system that repeats geometry up to 48x per axis, time-based animation, and OBJ/STL export for 3D printing.

Built with BabylonJS, WebGL2, and vanilla JS. No build step, no server, no sign-up.

Live: https://surfaces.netlify.app/
Source: https://github.com/remi1230/surface
```

---

## Product Hunt

**Tagline (60 chars max):**
```
Create 3D math surfaces with equations and GLSL shaders
```

**Description:**
```
SURFACE is a free, open-source tool that lets you create and explore parametric surfaces in real time, right in your browser.

Write a mathematical equation f(u,v) and watch a 3D mesh update instantly. Customize colors with GLSL fragment shaders, deform the surface along its normals, apply symmetries up to 48x per axis, animate with time, and export to OBJ or STL for 3D printing.

Key features:
- 50+ built-in surfaces (Torus, Mobius, Klein Bottle, Catenoid...)
- Two Monaco-based GLSL shader editors (color + deformation)
- Shorthand notation: write "cu" instead of "cos(u)", "2u" instead of "2*u"
- 20+ custom deformation functions (m, o, f, a, b, ce...)
- Symmetrize, scale, rotate, translate — all in real time
- Export as OBJ, STL, or JSON — import OBJ meshes
- Video recording of animated surfaces
- No install, no sign-up, no server — fully client-side

Built with BabylonJS, WebGL2, and Monaco Editor.
```

**Maker comment (first comment after launch):**
```
Hey everyone! I built SURFACE because I wanted a tool to quickly visualize and play with parametric surfaces — something between a graphing calculator and a shader playground.

The shorthand notation is probably my favorite feature: you can write "cu" instead of "cos(u)", and the parser expands it automatically. Combined with the GLSL shader editors, you can create surprisingly complex and beautiful surfaces with very little code.

A few things I'm particularly proud of:
- The symmetrize system that can repeat a surface up to 48 times per axis
- Normal deformation with custom functions like m() that creates gyroid-like patterns
- The implicit multiplication system that lets you write math almost like on paper

I'd love to hear your feedback — what features would you like to see next?

Try it: https://surfaces.netlify.app/
GitHub: https://github.com/remi1230/surface
```

---

## AlternativeTo

**Summary:**
```
SURFACE is a free, open-source browser tool for creating and exploring 3D parametric surfaces. Write mathematical equations, customize GLSL shaders, apply symmetries, animate surfaces with time, and export to OBJ/STL for 3D printing. Features 50+ built-in surfaces, two GLSL shader editors, shorthand math notation, and real-time rendering with BabylonJS and WebGL2.
```

**Tags:** `Math`, `3D`, `Parametric`, `GLSL`, `WebGL`, `Open Source`, `Free`, `Browser-based`, `3D Printing`, `Generative Art`

**Alternatives to:** GeoGebra 3D, Desmos, MathMod, Shadertoy, Graphtoy

---

## Awesome Lists — PR description

**For awesome-creative-coding, awesome-webgl, awesome-math:**

```
- [SURFACE](https://github.com/remi1230/surface) — Real-time parametric surface explorer with equation input, GLSL shader editors, symmetry, animation, and OBJ/STL export. Browser-based, built with BabylonJS.
```
