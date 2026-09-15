# Fluid simulation

A WebGL playground built with Pex. Select Water 2D or Smoke and drag to interact, or view the experimental Water 3D particle study.

The selector updates the `demo` query parameter, so demos can be bookmarked and shared:

- `?demo=water-2d` selects Water 2D.
- `?demo=smoke` selects Smoke.
- `?demo=water-3d` selects the experimental Water 3D particle preview. It does not yet simulate fluid motion or respond to dragging.
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
