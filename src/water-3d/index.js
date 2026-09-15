import { createSimulation } from './simulation';
import { createCamera } from './camera';
import { createRenderer } from './renderer';

export default function water3D(ctx, app) {
  const simulation = createSimulation();
  const camera = createCamera(app.canvas);
  const pause = document.getElementById('particle-pause');
  const reset = document.getElementById('particle-reset');
  const status = document.getElementById('particle-status');
  const zoomIn = document.getElementById('particle-zoom-in');
  const zoomOut = document.getElementById('particle-zoom-out');
  const contacts = document.getElementById('particle-contacts');
  let previousTime = null;

  function updateControls() {
    pause.textContent = simulation.paused ? 'Play' : 'Pause';
    status.textContent = simulation.count.toLocaleString() + ' particles · ' +
      (simulation.paused ? 'Paused' : 'Running') +
      (simulation.parameters.contactsEnabled ? ' · Particle contacts, not liquid yet' : ' · Collisions off: particles can overlap');
    contacts.checked = simulation.parameters.contactsEnabled;
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
    contacts.removeEventListener('change', onContacts);
  }
  function onContacts() {
    simulation.parameters.contactsEnabled = contacts.checked;
    onReset();
  }
  function onZoomIn() { camera.distance = Math.max(4.5, camera.distance / 1.15); }
  function onZoomOut() { camera.distance = Math.min(12, camera.distance * 1.15); }

  app.state.water3D = { simulation, camera, dispose };
  const render = createRenderer(ctx, app, simulation, camera);
  pause.addEventListener('click', onPause);
  reset.addEventListener('click', onReset);
  zoomIn.addEventListener('click', onZoomIn);
  zoomOut.addEventListener('click', onZoomOut);
  contacts.addEventListener('change', onContacts);
  updateControls();

  return function frame(state) {
    const elapsed = previousTime === null ? 0 : state.time - previousTime;
    previousTime = state.time;
    simulation.advance(elapsed);
    render();
  };
}
