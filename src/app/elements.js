export function createCanvas({
  width = window.innerHeight,
  height = window.innerWidth,
  pixelRatio = window.devicePixelRatio,
  canvas: _canvasToUse = null,
  append = _canvasToUse instanceof HTMLCanvasElement ? false : true,
} = {}) {
  const canvas = _canvasToUse || document.createElement('canvas');

  if (pixelRatio !== 1) {
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
  }

  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;

  if (append) document.body.appendChild(canvas);

  return canvas;
}

export function createViewportMeta({ append = true, ...props } = {}) {
  const name = 'viewport';
  // TODO: variable input values for properties
  const content = [
    ['width', 'device-width'],
    ['user-scalable', 'no'],
    ['minimum-scale', '1.0'],
    ['maximum-scale', '1.0'],
    ['shrink-to-fit', '0.0'],
  ]
    .filter(([property, value]) => !!value || !!props[property])
    .map(([property, value]) => [property, props[property] || value].join('='))
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
