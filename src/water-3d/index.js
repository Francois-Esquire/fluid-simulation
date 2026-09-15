import { createGPUDevice } from './gpu-device';
import { createGPUSimulation } from './gpu-simulation';
import { createCamera } from './camera';
import { createRenderer } from './renderer';

export default function water3D(ctx, app) {
  const device = createGPUDevice(ctx.gl);
  app.state.water3D = { dispose: () => device.dispose() };
  const simulation = createGPUSimulation(device);
  const camera = createCamera(app.canvas, simulation);
  const pause = document.getElementById('particle-pause');
  const reset = document.getElementById('particle-reset');
  const status = document.getElementById('particle-status');
  const zoomIn = document.getElementById('particle-zoom-in');
  const zoomOut = document.getElementById('particle-zoom-out');
  const solver = document.getElementById('particle-solver');
  const density = document.getElementById('particle-density');
  const waterSurface = document.getElementById('water-surface');
  const densityControls = document.getElementById('density-controls');
  const densityStatus = document.getElementById('density-status');
  let previousTime = null;

  function updateControls() {
    pause.textContent = simulation.paused ? 'Play' : 'Pause';
    status.textContent = simulation.count.toLocaleString() + ' particles · WebGL2 GPU · ' +
      (simulation.paused ? 'Paused' : 'Running') +
      ' · ' + { fluid: 'Compression-only fluid', contacts: 'Bead contacts', off: 'Particles can overlap' }[simulation.parameters.solver];
    solver.value = simulation.parameters.solver;
    density.checked = !!simulation.parameters.showDensity;
    waterSurface.checked = simulation.parameters.waterSurface;
    densityControls.style.display = simulation.parameters.solver === 'fluid' ? 'block' : 'none';
    updateDensity();
  }
  function updateDensity() {
    densityStatus.textContent = simulation.parameters.solver === 'fluid'
      ? (simulation.parameters.showDensity ? 'Blue: sparse · teal: target · red: compressed' : 'Density and neighbor searches stay on the GPU.')
      : '';
  }
  function onPause() {
    simulation.paused = !simulation.paused;
    updateControls();
  }
  function onReset() {
    simulation.reset();
    updateControls();
  }
  function dispose() {
    camera.dispose();
    pause.removeEventListener('click', onPause);
    reset.removeEventListener('click', onReset);
    zoomIn.removeEventListener('click', onZoomIn);
    zoomOut.removeEventListener('click', onZoomOut);
    solver.removeEventListener('change', onSolver);
    density.removeEventListener('change', onDensity);
    waterSurface.removeEventListener('change', onWaterSurface);
    app.canvas.removeEventListener('webglcontextlost', onContextLost);
    device.dispose();
  }
  function onContextLost(event) {
    event.preventDefault();
    app.stop();
    const notice = document.getElementById('notice');
    notice.setAttribute('role', 'alert');
    notice.textContent = 'The GPU context was lost. Reload or select another demo to restart.';
  }
  function onSolver() {
    simulation.parameters.solver = solver.value;
    onReset();
  }
  function onDensity() {
    simulation.parameters.showDensity = density.checked;
    updateDensity();
  }
  function onWaterSurface() {
    simulation.parameters.waterSurface = waterSurface.checked;
  }
  function onZoomIn() { camera.distance = Math.max(4.5, camera.distance / 1.15); }
  function onZoomOut() { camera.distance = Math.min(12, camera.distance * 1.15); }

  app.state.water3D = { simulation, camera, device, dispose };
  const render = createRenderer(device, app, simulation, camera);
  pause.addEventListener('click', onPause);
  reset.addEventListener('click', onReset);
  zoomIn.addEventListener('click', onZoomIn);
  zoomOut.addEventListener('click', onZoomOut);
  solver.addEventListener('change', onSolver);
  density.addEventListener('change', onDensity);
  waterSurface.addEventListener('change', onWaterSurface);
  app.canvas.addEventListener('webglcontextlost', onContextLost);
  updateControls();

  return function frame(state) {
    const elapsed = previousTime === null ? 0 : state.time - previousTime;
    previousTime = state.time;
    simulation.advance(elapsed);
    render();
  };
}
