---
title: How I Built a Real-Time Parametric Surface Explorer with BabylonJS and GLSL
published: false
description: A deep dive into building SURFACE, a browser-based tool for creating 3D parametric surfaces from math equations, with live GLSL shaders, symmetry, and zero build step.
tags: webgl, javascript, 3d, math
cover_image:
---

# How I Built a Real-Time Parametric Surface Explorer with BabylonJS and GLSL

## Introduction

I wanted a tool that sat somewhere between a graphing calculator and a shader playground -- something where I could type a parametric equation like `cos(u)*(3+cos(v))` and immediately see a 3D torus spinning on screen, then warp it with a single keystroke, multiply it with symmetry, color it with GLSL, and export the result for 3D printing. Nothing I found did all of that in one place, so I built SURFACE.

SURFACE is a fully client-side, browser-based parametric surface explorer. You write X(u,v), Y(u,v), Z(u,v) equations and a 3D mesh updates in real time. It supports Cartesian, Spherical, and Cylindrical coordinate systems, ships with 50+ built-in surfaces (torus, Mobius strip, Klein bottle, catenoid, and many more), and lets you edit GLSL shaders live with two Monaco-based code editors. You can symmetrize the geometry, animate with a time variable, randomize colors, and export to OBJ or STL.

The whole thing runs in your browser with no server, no sign-up, and no build step.

## Architecture Overview

I deliberately kept the stack minimal. There is no React, no Webpack, no npm install. The project is plain vanilla JavaScript loaded from a single `index.html`. All external dependencies -- BabylonJS, the BabylonJS GUI module, and Monaco Editor -- come from CDN links.

The file structure reflects this simplicity:

```
surface/
  index.html              # Entry point
  css/
    surface.css           # Main stylesheet
    monaco.css            # Shader editor styles
  js/
    bab.js                # BabylonJS scene setup and render loop
    glo.js                # Global state, config, regex macros
    gui.js                # GUI panels, sliders, buttons
    ribbon.js             # Mesh generation (paths, normals)
    GPUShaderMesh.js      # GPU shader pipeline (GLSL generation)
    shaders-frags.js      # Fragment shader definitions
    shaders-crud.js       # Shader CRUD with localStorage
    forms.js              # 50+ built-in surface definitions
    colors.js             # Color themes and randomization
    events.js             # Keyboard/mouse handlers
    ...
```

This architecture has tradeoffs. There is no tree-shaking, no code splitting, no TypeScript. But there is also no build time, no dependency hell, and anyone can clone the repo and open `index.html` to start exploring. For a creative tool like this, I think that tradeoff is worth it.

## The Equation Parser: Regex Macros

One of the features I am most proud of is the shorthand notation system. Writing `cos(u)*(3+cos(v))` every time gets tedious. With the macro system, you can write `cu*(3+cv)` instead. The parser expands it automatically before the expression is compiled to GLSL.

The engine is a sequential chain of regex substitutions stored in an array called `regs` inside `glo.js`. Each entry has a pattern (`exp`) and a replacement (`upd`). The input string passes through every rule in order:

```javascript
regs: [
  { exp: /\s/g, upd: "" },                        // strip whitespace
  { exp: /c([^u\(vw]*)u/g, upd: "cos($1u)" },    // cu  -> cos(u)
  { exp: /c([^v\(uw]*)v/g, upd: "cos($1v)" },    // cv  -> cos(v)
  { exp: /s([^u\(vw]*)u/g, upd: "sin($1u)" },    // su  -> sin(u)
  { exp: /s([^v\(uw]*)v/g, upd: "sin($1v)" },    // sv  -> sin(v)
  { exp: /cufv|cvfu/g, upd: "cos(uv)" },          // cufv -> cos(u*v)
  { exp: /sufv|svfu/g, upd: "sin(u*v)" },          // sufv -> sin(u*v)
  { exp: /R/g, upd: "h(x,y,z)" },                 // R -> distance from origin
  { exp: /m(?!od|\()/g, upd: "m()" },             // bare m -> m()
  { exp: /²/g, upd: "**2" },                      // unicode superscript
  { exp: /(\d+)([^,%*+-/.\d)])/g, upd: "$1*$2" }, // 2u -> 2*u
  // ... 80+ more rules
]
```

The key insight is that **order matters**. Compound patterns like `cufv` (which should become `cos(u*v)`) must be matched before simpler patterns like `cu` (which would otherwise consume the `c` and `u` and leave `fv` dangling). Similarly, the implicit multiplication rule `2u -> 2*u` runs late in the chain, after trig expansions are done, so it does not break things like `cos(2u)`.

There is also a cleanup phase at the end that fixes collateral damage. Because the rules are greedy, some valid tokens get accidentally mangled. For instance, the letter `l` gets replaced by `log`, so `sin*` (from an erroneous expansion) gets corrected back to `sin`, and `p*i` gets corrected back to `pi`:

```javascript
{ exp: /sin\*/g, upd: "sin" },
{ exp: /p\*i/g, upd: "pi" },
{ exp: /e\*x/g, upd: "ex" },
{ exp: /m\(\)\*o\(\)\*d/g, upd: "mod" },
```

This approach is fragile by nature -- adding a new shorthand can break existing ones if you are not careful about insertion order. But for the user, it is remarkably convenient. You can write equations almost like you would on paper: `2cu*(3+sv)` expands cleanly to `2*cos(u)*(3+sin(v))`.

## GPU Shader System

The core rendering pipeline is a custom `GPUShaderMesh` class that generates GLSL vertex and fragment shaders on the fly. When the user changes an equation, the class rebuilds the shader source, compiles it, and swaps the BabylonJS `ShaderMaterial`.

The vertex shader computes vertex positions from the parametric equations directly on the GPU. The fragment shader handles coloring. Both are editable live through Monaco editors embedded in the UI.

What makes the shader system interesting is the library of custom GLSL deformation functions that get injected into every shader. These are short, single-letter functions that operate on the current vertex position (stored in global variables `gx`, `gy`, `gz`, `gu`, `gv`):

```glsl
// m() -- multiplicative cosine deformation (gyroid-like)
float m(float ncx) {
    float deformCoeff1 = 6.0;
    float deformCoeff2 = 1.0 / deformCoeff1;
    return deformCoeff2
        * cos(ncx * gx * deformCoeff1)
        * cos(ncx * gy * deformCoeff1)
        * cos(ncx * gz * deformCoeff1);
}

// o() -- additive cosine deformation
float o(float ncx) {
    float deformCoeff1 = 6.0;
    float deformCoeff2 = 1.0 / deformCoeff1;
    return deformCoeff2 * (
        cos(ncx * gx * deformCoeff1)
      + cos(ncx * gy * deformCoeff1)
      + cos(ncx * gz * deformCoeff1)
    );
}

// ce() -- exponential cosine (intense near edges)
float ce(float c) {
    return cos(exp(c * abs(gx)))
         * cos(exp(c * abs(gy)))
         * cos(exp(c * abs(gz)));
}

// a() -- parametric-space oscillation
float a(float nbU, float nbV) {
    return cos(nbU * gu) * sin(nbV * gv);
}
```

Each function has multiple overloads (zero to three arguments) so the user can call `m()` with defaults, `m(2)` for doubled frequency, or `m(1, 2, 3)` for per-axis control. The functions are designed to compose: writing `m(1) + o(2)` in the deformation field combines gyroid bumps with additive cosines for complex organic patterns.

The dual-editor approach -- one for fragment color, one for normal deformation -- lets you keep visual appearance and geometric deformation as separate concerns. You can write a colorful shader without affecting geometry, or deform the mesh without touching colors. Both compile independently on Ctrl+S.

Utility functions like `q()` (mix/lerp), `r()` (smoothstep), `g()` (step), `h()` (Euclidean distance), and `cr()` (cross product) round out the library:

```glsl
float q(float a, float b, float t) { return mix(a, b, t); }
float r(float e0, float e1, float x) { return smoothstep(e0, e1, x); }
float g(float edge, float x) { return step(edge, x); }
float h(float x, float y, float z) { return length(vec3(x, y, z)); }
```

## The Symmetry Engine

The symmetry system lets you repeat the surface along X, Y, and Z axes independently, up to 48 copies per axis. It supports two modes: multiplicative (Cartesian product of copies across axes) and additive (independent copies on each axis).

The implementation works at the GPU level. Instead of duplicating mesh geometry on the CPU, each vertex carries a symmetry index `(sx, sy, sz)` as an attribute. The vertex shader reads this index and applies rotational transforms:

```javascript
// Multiplicative mode: Cartesian product
symCopies = [];
for (let sx = 0; sx < symX; sx++)
    for (let sy = 0; sy < symY; sy++)
        for (let sz = 0; sz < symZ; sz++)
            symCopies.push([sx, sy, sz]);

// Additive mode: independent axes
symCopies = [[0, 0, 0]];
for (let sx = 1; sx < symX; sx++) symCopies.push([sx, 0, 0]);
for (let sy = 1; sy < symY; sy++) symCopies.push([0, sy, 0]);
for (let sz = 1; sz < symZ; sz++) symCopies.push([0, 0, sz]);
```

Each copy index is packed into vertex attributes. On the GPU, the shader rotates each copy by `index * symmetryAngle` around the relevant axis. The angle defaults to PI but is user-adjustable, so you can create fans, spirals, or kaleidoscopic arrangements.

The symmetry order (which axis rotates first) is also configurable. A `uSymOrder` uniform tells the shader whether to apply X-Y-Z, Z-Y-X, or any other permutation, which produces very different visual results for the same base geometry.

Combined with time animation (the `t` variable), symmetrized surfaces can "breathe" -- each copy deforms in sync, creating organic pulsing effects that look far more complex than the simple equations that produce them.

## What I Learned

**Regex-based parsers are powerful but treacherous.** The shorthand system is one of the most user-facing features, and maintaining 80+ regex rules in the right order is a constant balancing act. Every new shorthand risks breaking an existing one. I considered writing a proper tokenizer several times, but the regex approach is so concise and easy to extend for simple cases that I kept it. If I were starting over, I might use a small recursive-descent parser for the core and keep regexes only for the simplest substitutions.

**Vanilla JS scales further than you think.** No framework, no bundler, no TypeScript. The codebase is around 15 files and a few thousand lines. For a tool with this scope, that is entirely manageable. The absence of a build step means iteration is instant: save the file, refresh the browser. I would not recommend this approach for a team project, but for a solo creative tool, it keeps friction near zero.

**GLSL function overloading is your friend.** Defining `m()`, `m(float)`, `m(float, float)`, and `m(float, float, float)` lets the user choose their level of control without learning a complex API. Defaults are baked in. Power users can fine-tune per axis.

**Symmetry is multiplicative complexity for free.** A simple shape repeated 6 times on three axes produces 216 copies. The visual complexity is enormous, but the user only had to define one base surface. This is the single most impactful feature in terms of "wow factor per line of equation."

**Ship something usable, then polish.** SURFACE started as a personal tool. The first version had no shader editors, no export, no symmetry. Each feature was added when I needed it or when someone asked. This incremental approach kept the project alive -- there was always a working tool, never a half-finished rewrite.

## Try It

SURFACE is free, open source, and runs entirely in your browser. No install, no sign-up.

- **Live app:** [https://surfaces.netlify.app/](https://surfaces.netlify.app/)
- **Landing page:** [https://remi1230.github.io/surface/](https://remi1230.github.io/surface/)
- **GitHub:** [https://github.com/remi1230/surface](https://github.com/remi1230/surface)

If you build something interesting with it, I would love to see it. Feedback, issues, and pull requests are all welcome.
