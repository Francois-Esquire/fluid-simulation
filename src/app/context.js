import createPexContext from 'pex-context';

export default function createContext({ gl }) {
  const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined'
    && gl instanceof WebGL2RenderingContext;
  if (!isWebGL2) return createPexContext({ gl });

  let frameID = null;
  let pendingSize = null;
  return {
    gl,
    set(size) { pendingSize = size; },
    frame(callback) {
      function render() {
        if (pendingSize) {
          const { width, height, pixelRatio } = pendingSize;
          gl.canvas.width = Math.round(width * pixelRatio);
          gl.canvas.height = Math.round(height * pixelRatio);
          gl.canvas.style.width = width + 'px';
          gl.canvas.style.height = height + 'px';
          pendingSize = null;
        }
        if (callback() !== false) frameID = requestAnimationFrame(render);
      }
      frameID = requestAnimationFrame(render);
    },
    dispose() {
      if (frameID !== null) cancelAnimationFrame(frameID);
      frameID = null;
    },
  };
}
