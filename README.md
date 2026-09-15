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

## Water 3D: particle contacts

This is a particle contact simulation, not a fluid solver yet. The tank starts paused so you can inspect the initial block. Play applies gravity; Pause freezes physics while leaving the camera active. Reset restores the same initial positions and pauses again. The Particle collisions checkbox resets and pauses the demo so you can compare a pile with the old overlapping-particle behavior.

### Where the particles live

`src/water-3d/simulation.js` stores 4,096 particles in two CPU `Float32Array`s: XYZ positions and XYZ velocities. Each particle occupies three consecutive numbers. Unlike the previous scaffold, this pass does not store simulation state in textures or require floating-point texture support.

Every rendered frame uploads positions to one existing GPU vertex buffer. `renderer.js` draws one shaded circular point sprite per particle, along with a floor grid and tank outline. These are not individual sphere meshes. Colors identify initial height, not density or pressure.

### How they move

The simulation accumulates elapsed time and advances in fixed 1/120-second steps. Each step first predicts motion:

```text
velocity = (velocity + gravity × timestep) × exp(-drag × timestep)
predictedPosition = position + velocity × timestep
```

Then the contact solver projects overlapping particles apart and clamps them inside the tank. Corrected motion becomes the next velocity: `(correctedPosition - previousPosition) / timestep`. Wall restitution controls bounce on impacts; small impacts are stopped. Drag removes energy over time. Particle contacts themselves use positional correction without added restitution.

### Why the pile spreads

Each particle has a radius. If two centers are closer than two radii, each particle moves half the overlap distance along the line connecting them. The equal corrections preserve that pair's center of mass. Several passes are needed because fixing one contact can disturb another. This is the collision-constraint idea behind [Position Based Dynamics](https://matthias-research.github.io/pages/publications/posBasedDyn.pdf).

Gravity pushes upper particles down. The floor prevents lower particles from descending, so slanted contacts redirect motion sideways. The block spreads into available space and forms a pile. Tiny deterministic offsets in the initial lattice prevent artificial, perfectly aligned columns. Particles do not grow, and the pile will not expand upward to fill the whole box like a gas.

`contacts.js` rebuilds a uniform spatial grid each solver iteration. Cells are one particle diameter wide; each particle checks its cell and the 26 adjacent cells. Only nearby candidate pairs receive distance tests, rather than all 8,386,560 possible pairs for 4,096 particles. Exactly coincident centers use a deterministic separation axis instead of dividing by zero.

The default radius is `0.045`, with four `contactIterations` per timestep. Iterations are approximate: small residual overlaps can remain in a dense pile. More iterations improve contact resolution at a CPU cost. This is discrete collision detection, not a swept collision system; extreme externally assigned velocities can tunnel through other particles.

At most 0.1 seconds are simulated per rendered frame. This avoids a large catch-up burst after a stalled or backgrounded tab, at the cost of dropping excess elapsed time. Orbit controls change only the camera, never particle positions.

Edit `src/water-3d/config.js` for particle count, gravity, radius, timestep, wall bounce, drag, contact iterations, and bounds. Reload after changing defaults, especially radius and bounds, which determine the spatial grid. Live state is available at `window.app.state.water3D.simulation`. Its `stats` report candidate checks and overlap corrections across all iterations of the last physics step, not unique contacts.

### What comes next

Particles now resist overlap and form a bead-like pile. They do not yet enforce a target fluid density, viscosity, or surface tension. Density constraints are the next step toward liquid behavior; simply making contacts bouncier does not produce water. Fluid rendering comes after those interactions work. This CPU reference makes the physics inspectable before moving computation to the GPU.

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
