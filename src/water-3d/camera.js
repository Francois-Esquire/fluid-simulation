import mat4 from 'pex-math/mat4';

export function createCamera(canvas) {
  const camera = { yaw: 0.65, pitch: 0.35, distance: 7.5, view: mat4.create(), projection: mat4.create(), update, dispose };
  let pointer = null;

  function onPointerDown(event) {
    if (event.button !== 0 || pointer) return;
    pointer = { id: event.pointerId, horizontal: event.clientX, vertical: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    camera.yaw -= (event.clientX - pointer.horizontal) * 0.008;
    camera.pitch = Math.max(-0.15, Math.min(1.35, camera.pitch + (event.clientY - pointer.vertical) * 0.008));
    pointer.horizontal = event.clientX;
    pointer.vertical = event.clientY;
  }
  function onPointerEnd(event) {
    if (pointer?.id !== event.pointerId) return;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    pointer = null;
  }
  function onWheel(event) {
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1);
    camera.distance = Math.max(4.5, Math.min(12, camera.distance * Math.exp(delta * 0.001)));
  }
  const listeners = [
    ['pointerdown', onPointerDown], ['pointermove', onPointerMove],
    ['pointerup', onPointerEnd], ['pointercancel', onPointerEnd],
    ['lostpointercapture', onPointerEnd], ['wheel', onWheel],
  ];
  listeners.forEach(([name, handler]) => canvas.addEventListener(name, handler, { passive: false }));

  function update(width, height) {
    const distance = camera.distance * Math.max(1, 0.9 * height / width);
    const horizontal = Math.cos(camera.pitch) * distance;
    mat4.lookAt(camera.view, [Math.sin(camera.yaw) * horizontal, 1.4 + Math.sin(camera.pitch) * distance, Math.cos(camera.yaw) * horizontal], [0, 1.4, 0], [0, 1, 0]);
    mat4.perspective(camera.projection, Math.PI / 4, width / height, 0.1, 50);
  }
  function dispose() {
    listeners.forEach(([name, handler]) => canvas.removeEventListener(name, handler));
    pointer = null;
  }
  return camera;
}
