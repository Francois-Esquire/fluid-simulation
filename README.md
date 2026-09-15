# Fluid simulation

A WebGL playground built with Pex. Select Water 2D or Smoke and drag to interact, or explore the experimental Water 3D particle tank.

The selector updates the `demo` query parameter, so demos can be bookmarked and shared:

- `?demo=water-2d` selects Water 2D.
- `?demo=smoke` selects Smoke.
- `?demo=water-3d` selects the experimental Water 3D particle tank. Press Play to drop the particles, drag to orbit, and scroll or use the zoom buttons to change distance.
- Missing or unknown values fall back to Water 2D.

Browser Back and Forward restore the selected demo. Switching demos resets the simulation.

## Water 2D parameters

Edit `src/water-2d/config.js` to set defaults. The same values are available at `window.app.state.water.parameters` while Water 2D is running. Grid size and pressure iteration changes require restarting the demo.

- `gridSize`: simulation resolution, independent of display resolution. Defaults to 256 cells per side.
- `jacobiIterations`: pressure solver iterations per frame, default 60. Larger grids generally need more iterations to spread pressure corrections across the domain.
- `velocityDissipation`: exponential velocity decay per simulation second, default `1.2`. Set to `0` to disable explicit damping; interpolation still introduces numerical diffusion.
- `wind`: constant acceleration `[x, y]` per simulation second. Positive X is right; positive Y is up. `[0, 0]` is neutral. Try `[-0.1, -0.1]` for a bottom-left bias, not an exact reproduction of the old bug.
- `interactionRadius`: brush radius as a fraction of canvas height, corrected for aspect ratio.
- `interactionStrength`: outward force while pressing. Set to `0` for drag-only interaction.
- `dragStrength`: strength of the force along pointer movement.
- `colorMode`: `surface` for a shaded two-color palette, `normal` for encoded normals derived from flow-speed gradients, or `legacy` for the original velocity-based colors.
- `baseColor` and `highlightColor`: RGB arrays in the range `[0, 1]` for `surface` mode.
- `colorScale`: how quickly speed reaches the highlight color.
- `normalStrength`: slope strength for surface shading and normal visualization.

The normal view is a visualization, not a physical water-height field. Wind and press forces use the existing fixed simulation timestep; simulation speed is still tied to rendered frames.

The solver uses bilinear semi-Lagrangian advection and an adjacent-cell Jacobi pressure solve, following the approach described in [GPU Gems: Fast Fluid Dynamics Simulation on the GPU](https://developer.nvidia.com/gpugems/gpugems/part-vi-beyond-triangles/chapter-38-fast-fluid-dynamics-simulation-gpu). Sampling clamps at the domain edges instead of wrapping to the opposite side. Pressure projection is iterative and approximate, not an instantaneous domain-wide solution. Surface colors visualize velocity, not a separate transported dye or water-height layer.

## Water 3D: GPU particles and a movable tank

The active 3D demo requires WebGL2 and `EXT_color_buffer_float`. Unsupported devices show an explanation rather than silently running CPU physics. Water 2D and Smoke retain their WebGL/Pex paths.

All demos use `createContext({ gl })` from `src/app/context.js` for frame scheduling, resizing, and disposal. The factory delegates WebGL1 to Pex and supplies that lifecycle directly for WebGL2, where compute and rendering use raw GL. This avoids Pex 2's WebGL2 initialization bug, which passes a string rather than an enum to `getParameter`. The WebGL2 implementation does not expose Pex's rendering helpers.

### Try it

1. Select Water 3D. It starts paused.
2. Press Play, then drag inside the tank to grab it. Shake side to side or lift and drop it.
3. Drag outside the tank, or hold Shift while dragging, to orbit. Scroll or use the zoom buttons to change distance.
4. Pause to inspect. While paused, dragging repositions the tank and its contents together without adding momentum.
5. Reset restores the centered tank and original particle block.

Tank translation is limited to ±1.25 world units on each axis. During playback, it approaches the pointer target at a bounded speed. This avoids teleporting walls through the entire particle volume. The tank translates but does not rotate.

The Solver selector resets the demo for comparison: **Fluid density**, **Particle contacts**, or **No particle interaction**. All three active modes run on the GPU. Show density colors sparse neighborhoods blue, near-target neighborhoods teal, and compressed neighborhoods red.

**Water surface** is checked by default for Water 3D. Uncheck it to inspect individual particles without resetting the simulation. Show density temporarily overrides the surface with diagnostic particles; disabling density restores the selected rendering mode. The default demo URL remains Water 2D.

### Water rendering

`surface.js` renders particle spheres into a depth texture, smooths depth with three pairs of edge-aware horizontal/vertical filters, then reconstructs normals for teal shading, specular highlights, and Fresnel reflection of a procedural sky. This follows the [screen-space fluid rendering approach described by NVIDIA](https://developer.download.nvidia.com/tools/docs/Fluid_Rendering_Alice.pdf). The final pass writes depth so the floor and tank edges can occlude water correctly.

Surface targets resize in place and cap their longest dimension at 1,280 pixels. Rendering uses the existing GPU position texture, with no particle readback. Enlarged rendering spheres connect nearby particles; they do not change collision radii or physics. This is an opaque screen-space approximation, not a reconstructed 3D mesh or physically refractive water. Silhouettes can still reveal individual particles, particularly in sparse splashes.

### Where the data lives

The default 1,728 particles live in RGBA32F textures. RGB stores XYZ position or velocity; alpha is spare. Texture addresses identify particles, not world-space locations. Storage pads to a power of two for sorting, and padded entries are excluded from neighbor solving and rendering.

Initialization and Reset upload the initial lattice. Normal stepping and rendering do not upload particle arrays or read particle state back to JavaScript. The vertex shader looks up particle positions directly using `gl_VertexID`. The optional particle view uses shaded point sprites.

WebGL2 fragment passes provide the compute work through [floating-point render targets](https://registry.khronos.org/webgl/extensions/EXT_color_buffer_float/). JavaScript schedules passes and supplies scalar parameters, elapsed time, camera matrices, and tank position.

### A physics step on the GPU

1. Save previous positions and predict motion under gravity and drag.
2. Assign each particle a spatial-cell key.
3. Bitonic-sort cell keys and particle IDs on the GPU.
4. Build cell start/end ranges with GPU binary searches.
5. Solve contacts or density using each cell and its 26 neighbors.
6. Rebuild the grid for each correction iteration; apply tank bounds.
7. Reconstruct velocity from corrected displacement and resolve impacts relative to moving-wall velocity.
8. In fluid mode, refresh density and smooth neighboring velocities.

Neighbor ranges are variable-length, not truncated to a fixed number of particles per cell. Ping-pong textures prevent a pass from reading its own output.

Density solving uses a compression-only [Position Based Fluids](https://mmacklin.com/pbf_sig_preprint.pdf) variant: Poly6 density weights, Spiky gradients, regularized corrections, and mild neighbor velocity smoothing. Sparse neighborhoods do not attract each other. Iteration counts trade incompressibility for cost. The GPU applies bounded per-particle Jacobi corrections; results need not match the CPU reference bit-for-bit.

### How shaking works

Picking casts a ray through the pointer and intersects the tank box. A hit anchors a camera-facing drag plane, converting pointer motion into a world-space target. A miss, or Shift-drag, controls the camera.

Particles stay in world space during playback. Moving the tank changes collision bounds, not every particle's position by the same offset. A wall pushes particles it reaches, with impacts evaluated relative to wall velocity. Density corrections transfer that disturbance through nearby particles. Moving the camera never applies a force.

### Files and parameters

- `gpu-device.js`: programs, floating-point textures, draw dispatch, and resource cleanup.
- `gpu-shaders.js`: prediction, sorting, neighbor ranges, density, contacts, and velocity kernels.
- `gpu-simulation.js`: GPU state, fixed-step scheduling, reset, and bounded tank motion.
- `renderer.js`: tank geometry and selection between surface and particle rendering.
- `surface.js`: particle depth, smoothing, and water shading.
- `picking.js` and `camera.js`: ray picking, tank grabbing, orbit, and zoom.
- `simulation.js`, `contacts.js`, and `density.js`: CPU reference only; not imported by the active demo.

Edit `src/water-3d/config.js`, then reload. Radius and smoothing radius derive from initial lattice spacing. `restDensity` is a dimensionless target multiplier; `densityIterations`, `densityRelaxation`, and `viscosity` tune the fluid solve. `contactIterations` applies to bead mode. `tankSpeed` bounds translation speed. Gravity, drag, wall restitution, timestep, and bounds remain configurable. Reinitialize after structural changes such as particle count or smoothing radius.

The fixed step is 1/120 second, with at most 1/30 second simulated per render. Excess elapsed time is discarded under load; GPU execution does not guarantee real-time speed on every device.

### Inspecting results

`window.app.state.water3D.simulation.backend` identifies the GPU path. For explicit debugging only, `simulation.readState()` reads positions, velocities, density ratios, sorted IDs, and cell ranges back to the CPU. It synchronizes with the GPU and can stall rendering, so the demo never calls it automatically. Each particle occupies four values; density ratio is the second value in each density texel.

The CPU implementation remains a numerical reference. Initial GPU density estimates and a gravity-only step can be compared against it; longer trajectories diverge with floating-point order and differing correction limits.

### Remaining limits

This is still a learning solver with an approximate screen-space surface. There are no boundary-density particles, physical surface tension, vorticity confinement, arbitrary obstacles, or swept particle collisions. Small compression and overlap errors remain possible, particularly while shaking. Dense neighbor searches and repeated GPU sorts still cost work; this is not an unlimited-particle claim. A lost GPU context stops the demo with a recovery message.
## Development

Use Node.js 22.12 or newer (CI uses Node.js 24).

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite, under `/fluid-simulation/`.

```sh
npm run build
npm run preview
```

The production build goes into ignored `public/`. npm and `package-lock.json` replace the old Yarn/Parcel setup.

## CI and deployment

Pull requests and pushes to `main` run a clean install and production build. This prototype has no automated test suite or coverage gate.

GitHub Pages uses GitHub Actions. The deployment job depends on the build job and deploys its uploaded artifact.

Site: [Fluid simulation](https://francois-esquire.github.io/fluid-simulation/).

## Scope

The entry point is `src/index.js`; the active simulation lives in `src/water-2d/`. The app owns input, animation, resizing, and GPU cleanup. Simulation modules initialize resources and return a per-frame render function.

The repository contains Water 2D, Smoke, and the experimental Water 3D preview. Unrelated studies have been removed; their source remains available in Git history.

Pex remains on its compatible 2.x API for this pass. Browser `assert` and `process` shims replace compatibility previously supplied by Parcel; unused dependencies have been removed.

### Later passes

- Simulation controls, visual polish, and adjustable quality.
- Solver timing, interaction direction, boundary conditions, and numerical behavior.
- Broader GPU compatibility and a deliberate migration to newer Pex APIs.
