# Fluid simulation

A WebGL playground built with Pex. Select Water 2D or Smoke and drag to interact, or view the experimental Water 3D particle study.

The selector updates the `demo` query parameter, so demos can be bookmarked and shared:

- `?demo=water-2d` selects Water 2D.
- `?demo=smoke` selects Smoke.
- `?demo=water-3d` selects the experimental Water 3D particle preview. It does not yet simulate fluid motion or respond to dragging.
- Missing or unknown values fall back to Water 2D.

Browser Back and Forward restore the selected demo. Switching demos resets the simulation.

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
