export const contexts = ['webgl2', 'webgl', 'experimental-webgl'];

export function getContext({ context: ctx, canvas: c, options: opts } = {}) {
  let canvas = c || null;

  if (canvas instanceof HTMLCanvasElement === false) {
    canvas = createCanvas(c || {});
  }

  let context = null;

  if (ctx) {
    context = canvas.getContext(ctx, opts);
  }

  if (!context) {
    if (ctx) console.warn('The provided context is unavailable');

    for (var i = 0; i < contexts.length; i++) {
      const gl = canvas.getContext(contexts[i], opts);

      if (gl) {
        context = gl;
        break;
      }
    }
  }

  if (context === null) {
    throw new Error('WebGL is unavailable');
  }

  return context;
}

export function createCanvas({
  width = window.innerHeight,
  height = window.innerWidth,
  pixelRatio = window.devicePixelRatio,
  append = true,
} = {}) {
  const canvas = document.createElement('canvas');

  if (pixelRatio !== 1) {
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
  }

  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;

  if (append) document.body.appendChild(canvas);

  return canvas;
}

export function createViewportMeta({ append = true } = {}) {
  const name = 'viewport';
  const content = [
    ['width', 'device-width'],
    ['user-scalable', 'no'],
    ['minimum-scale', '1.0'],
    ['maximum-scale', '1.0'],
    ['shrink-to-fit', '0.0'],
  ]
    .filter(([property, value]) => !!value)
    .map(([property, value]) => [property, value].join('='))
    .join(', ');

  const meta = document.createElement('meta');
  meta.setAttribute('name', name);
  meta.setAttribute('content', content);

  if (append) {
    // TODO: check if existing declaration and handle (remove)
    document.head.appendChild(meta);
  }

  return meta;
}

export function createWebGLCanvasContext({
  context,
  options,
  width,
  height,
  pixelRatio,
  append,
}) {
  const canvas = createCanvas({ width, height, pixelRatio, append });
  const meta = createViewportMeta({ append });

  const gl = getContext({ context, canvas, options });

  return { canvas, meta, gl };
}
