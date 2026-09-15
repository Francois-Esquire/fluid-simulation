import './polyfills';
import createContext from 'pex-context';
import app from './app';
import water2DModule from './water-2d';
import smokeModule from './smoke';
import water3DModule from './water-3d';

const demos = new Map([
  ['water-2d', water2DModule],
  ['smoke', smokeModule],
  ['water-3d', water3DModule],
]);
const selector = document.getElementById('demo');

function start() {
  const requestedDemo = new URLSearchParams(window.location.search).get('demo');
  const demo = demos.has(requestedDemo) ? requestedDemo : 'water-2d';
  selector.value = demo;
  const notice = document.getElementById('notice');
  notice.removeAttribute('role');
  notice.textContent = demo === 'water-3d'
    ? 'Experimental particle preview. Fluid motion and interaction are not implemented.'
    : demo === 'smoke'
    ? 'Drag across the canvas to add smoke.'
    : 'Drag across the canvas to disturb the fluid.';
  app.state.dragging = false;
  try {
    window.app = app.set('options', { gl: {} }).initialize({ context: 'webgl' });
    const ctx = createContext({ gl: app.gl });
    app.ctx = ctx;
    app.render(ctx, [].concat(demos.get(demo)));
  } catch (error) {
    app.destroy();
    const notice = document.getElementById('notice');
    notice.setAttribute('role', 'alert');
    notice.textContent = error.message;
    console.error(error);
  }
}

function onNavigation() {
  app.destroy();
  start();
}

function onSelection() {
  const url = new URL(window.location.href);
  url.searchParams.set('demo', selector.value);
  window.history.pushState(null, '', url);
  onNavigation();
}

function onPageShow(event) {
  if (event.persisted) {
    app.destroy();
    start();
  }
}
function onPageHide() {
  app.stop();
}

start();
selector.addEventListener('change', onSelection);
window.addEventListener('popstate', onNavigation);
window.addEventListener('pagehide', onPageHide);
window.addEventListener('pageshow', onPageShow);
if (import.meta.hot) import.meta.hot.dispose(() => {
  selector.removeEventListener('change', onSelection);
  window.removeEventListener('popstate', onNavigation);
  window.removeEventListener('pagehide', onPageHide);
  window.removeEventListener('pageshow', onPageShow);
  app.destroy();
});
