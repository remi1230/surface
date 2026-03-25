# Launch Texts — SURFACE

Ready-to-use texts for launching SURFACE on various platforms.

---

## GitHub Repository Description (one-liner)

```
Real-time parametric surface explorer — write math equations, customize GLSL shaders, apply symmetries, animate and export to OBJ/STL. Runs in your browser.
```

**Website field:** `https://remi1230.github.io/surface/`

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

## Reddit — r/math

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

## Reddit — r/generativeart

**Title:**
```
SURFACE — a free tool for creating generative 3D art with math equations and GLSL shaders
```

**Body:**
```
I made a browser-based tool for creating 3D parametric surfaces. Write a math equation, tweak GLSL shaders for colors and deformations, apply symmetries, and animate with time.

Some things you can do:
- Write equations like X=cos(u)*(3+cos(v)) and see a torus appear instantly
- Apply normal deformations with functions like m() that create organic, gyroid-like patterns
- Symmetrize up to 48x per axis for kaleidoscopic effects
- Use the time variable "t" for animations, record as video
- Randomize colors with a single keypress (h)
- Export to OBJ/STL for 3D printing

It's fully client-side (no server needed), open source, and free.

Try it: https://surfaces.netlify.app/
Landing page: https://remi1230.github.io/surface/
Source: https://github.com/remi1230/surface

I'd love to see what you create with it!
```

---

## Reddit — r/webgl / r/babylonjs

**Title:**
```
Open-source parametric surface explorer built with BabylonJS + custom GLSL shaders
```

**Body:**
```
I built SURFACE, a real-time parametric surface tool using BabylonJS, WebGL2, and Monaco Editor for GLSL editing.

Technical highlights:
- GPU-computed mesh with custom vertex and fragment shaders
- Equation parser with regex-based macro expansion (shorthand like "cu" → cos(u))
- Two Monaco editors for live GLSL editing (fragment color + normal deformation)
- Symmetry system that repeats mesh geometry along arbitrary axes
- Full shader CRUD (create, save, delete, import/export) with localStorage persistence
- Video recording via MediaRecorder API with canvas capture
- Export to OBJ/STL/JSON

The shader system includes 20+ custom GLSL functions for deformation (multiplicative cosines, additive cosines, phase-shifted patterns, exponential cosines, etc.).

No build step — just HTML + vanilla JS + CDN dependencies.

Live app: https://surfaces.netlify.app/
GitHub: https://github.com/remi1230/surface (MIT)

Feedback welcome, especially on the shader architecture!
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
