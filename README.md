# Fluid simulation

A WebGL playground built with Pex. The active demo is the 2D water simulation: drag across the canvas to disturb the fluid.

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

The Pages deployment job depends on the build job and deploys its uploaded artifact. After pushing the workflow, choose **GitHub Actions** in **Settings → Pages → Build and deployment**. The existing `gh-pages` deployment remains in place until then.

Site: [Fluid simulation](https://francois-esquire.github.io/fluid-simulation/).

## Scope

The entry point is `src/index.js`; the active simulation lives in `src/water-2d/`. The app owns input, animation, resizing, and GPU cleanup. Simulation modules initialize resources and return a per-frame render function.

Camera, smoke, terrain, ray marching, 3D water, and transform-feedback studies remain as archived experiments. They are not loaded or validated by the current demo.

Pex remains on its compatible 2.x API for this pass. Browser `assert` and `process` shims replace compatibility previously supplied by Parcel; unused dependencies have been removed.

### Later passes

- Simulation controls, visual polish, and adjustable quality.
- Solver timing, interaction direction, boundary conditions, and numerical behavior.
- Broader GPU compatibility and a deliberate migration to newer Pex APIs.
- Revisiting the archived studies individually.
