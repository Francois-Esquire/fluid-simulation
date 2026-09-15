import './polyfills';
import createContext from 'pex-context';
import app from './app';
import water2DModule from './water-2d';

function start() {
  try {
    window.app = app.set('options', { gl: {} }).initialize({ context: 'webgl' });
    const ctx = createContext({ gl: app.gl });
    app.ctx = ctx;
    app.render(ctx, [water2DModule]);
  } catch (error) {
    app.destroy();
    const notice = document.getElementById('notice');
    notice.setAttribute('role', 'alert');
    notice.textContent = error.message;
    console.error(error);
  }
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
window.addEventListener('pagehide', onPageHide);
window.addEventListener('pageshow', onPageShow);
if (import.meta.hot) import.meta.hot.dispose(() => {
  window.removeEventListener('pagehide', onPageHide);
  window.removeEventListener('pageshow', onPageShow);
  app.destroy();
});
