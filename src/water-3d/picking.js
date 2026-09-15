import mat4 from 'pex-math/mat4';

export function pointerRay(horizontal, vertical, bounds, camera) {
  const inverse = mat4.invert(mat4.mult(mat4.copy(camera.projection), camera.view));
  const screen = [(horizontal - bounds.left) / bounds.width * 2 - 1, 1 - (vertical - bounds.top) / bounds.height * 2];
  function unproject(depth) {
    const clip = [screen[0], screen[1], depth, 1];
    const result = [0, 0, 0, 0];
    for (let row = 0; row < 4; row++) for (let column = 0; column < 4; column++) result[row] += inverse[column * 4 + row] * clip[column];
    return result.slice(0, 3).map(value => value / result[3]);
  }
  const origin = unproject(-1);
  const far = unproject(1);
  const direction = far.map((value, axis) => value - origin[axis]);
  const length = Math.hypot(...direction);
  return { origin, direction: direction.map(value => value / length) };
}

export function intersectTank(ray, minimum, maximum, tank) {
  let near = 0;
  let far = Infinity;
  for (let axis = 0; axis < 3; axis++) {
    const lower = minimum[axis] + tank[axis];
    const upper = maximum[axis] + tank[axis];
    if (Math.abs(ray.direction[axis]) < 1e-8) {
      if (ray.origin[axis] < lower || ray.origin[axis] > upper) return null;
      continue;
    }
    const first = (lower - ray.origin[axis]) / ray.direction[axis];
    const second = (upper - ray.origin[axis]) / ray.direction[axis];
    near = Math.max(near, Math.min(first, second));
    far = Math.min(far, Math.max(first, second));
    if (near > far) return null;
  }
  return ray.origin.map((value, axis) => value + near * ray.direction[axis]);
}

export function intersectPlane(ray, point, normal) {
  const denominator = ray.direction.reduce((sum, value, axis) => sum + value * normal[axis], 0);
  if (Math.abs(denominator) < 1e-8) return null;
  const distance = point.reduce((sum, value, axis) => sum + (value - ray.origin[axis]) * normal[axis], 0) / denominator;
  if (distance < 0) return null;
  return ray.origin.map((value, axis) => value + ray.direction[axis] * distance);
}
