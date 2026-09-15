export function createComputeSources(count, width, capacity, rangeWidth, dimensions, parameters) {
  const header = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
const int COUNT = ${count};
const int WIDTH = ${width};
const int CAPACITY = ${capacity};
const int RANGE_WIDTH = ${rangeWidth};
const ivec3 CELLS = ivec3(${dimensions.join(',')});
const float SUPPORT = ${parameters.smoothingRadius.toPrecision(12)};
const float VOLUME = ${((1.4 / (parameters.particlesPerAxis - 1)) ** 3).toPrecision(12)};
uniform sampler2D uPosition, uVelocity, uPrevious, uSorted, uRanges, uDensity;
uniform vec3 uMinimum, uMaximum, uGravity, uWallVelocity, uTranslation;
uniform float uTimeStep, uDrag, uRadius, uRestDensity, uRelaxation, uViscosity, uRestitution;
uniform int uStage, uStride;
out vec4 result;
vec4 fetch(sampler2D field, int index) { return texelFetch(field, ivec2(index % WIDTH, index / WIDTH), 0); }
int particleID() { return int(gl_FragCoord.x) + int(gl_FragCoord.y) * WIDTH; }
ivec3 cellFor(vec3 position) { return clamp(ivec3(floor((position - uMinimum) / SUPPORT)), ivec3(0), CELLS - 1); }
int keyFor(ivec3 cell) { return cell.x + CELLS.x * (cell.y + CELLS.y * cell.z); }
float weight(float squaredDistance) {
  float difference = max(0.0, SUPPORT * SUPPORT - squaredDistance);
  return VOLUME / uRestDensity * 315.0 / (64.0 * 3.14159265359 * pow(SUPPORT, 9.0)) * difference * difference * difference;
}
vec3 gradient(vec3 offset, float distance, int first, int second) {
  vec3 direction;
  if (distance > 0.00000001) direction = offset / distance;
  else {
    int axis = (first + second) % 3;
    direction = vec3(axis == 0 ? 1.0 : 0.0, axis == 1 ? 1.0 : 0.0, axis == 2 ? 1.0 : 0.0) * (first < second ? 1.0 : -1.0);
  }
  return direction * (VOLUME / uRestDensity * -45.0 / (3.14159265359 * pow(SUPPORT, 6.0)) * pow(SUPPORT - distance, 2.0));
}
vec3 bounded(vec3 position) { return clamp(position, uMinimum + uRadius, uMaximum - uRadius); }
`;
  function neighbors(body) {
    return `ivec3 center = cellFor(position);
    for (int depth = -1; depth <= 1; depth++) for (int row = -1; row <= 1; row++) for (int column = -1; column <= 1; column++) {
      ivec3 cell = center + ivec3(column, row, depth);
      if (any(lessThan(cell, ivec3(0))) || any(greaterThanEqual(cell, CELLS))) continue;
      int key = keyFor(cell);
      ivec2 range = ivec2(texelFetch(uRanges, ivec2(key % RANGE_WIDTH, key / RANGE_WIDTH), 0).xy);
      for (int cursor = range.x; cursor < range.y; cursor++) {
        int neighbor = int(fetch(uSorted, cursor).y);
        if (neighbor == id) continue;
        vec3 offset = position - fetch(uPosition, neighbor).xyz;
        float squaredDistance = dot(offset, offset);
        if (squaredDistance >= SUPPORT * SUPPORT) continue;
        float distance = sqrt(squaredDistance);
        ${body}
      }
    }`;
  }
  function particle(body) {
    return header + `void main() {
      int id = particleID();
      if (id >= COUNT) { result = vec4(0.0); return; }
      vec3 position = fetch(uPosition, id).xyz;
      ${body}
    }`;
  }
  return {
    copy: header + 'void main() { result = fetch(uPosition, particleID()); }',
    translate: particle('result = vec4(position + uTranslation, 1.0);'),
    predict: particle('vec3 velocity = (fetch(uVelocity, id).xyz + uGravity * uTimeStep) * exp(-uDrag * uTimeStep); result = vec4(bounded(position + velocity * uTimeStep), 1.0);'),
    hash: header + `void main() { int id = particleID(); result = vec4(id < COUNT ? float(keyFor(cellFor(fetch(uPosition, id).xyz))) : 1e9, float(id), 0.0, 1.0); }`,
    sort: header + `void main() {
      int id = particleID(); vec4 first = fetch(uSorted, id); vec4 second = fetch(uSorted, id ^ uStride);
      bool smaller = first.x < second.x || (first.x == second.x && first.y < second.y);
      bool wantMinimum = ((id & uStage) == 0) == ((id & uStride) == 0);
      result = smaller == wantMinimum ? first : second;
    }`,
    ranges: header + `int lowerBound(int key) {
      int lower = 0; int upper = CAPACITY;
      for (int iteration = 0; iteration < ${Math.log2(capacity) + 1}; iteration++) {
        if (lower >= upper) break;
        int middle = (lower + upper) / 2;
        if (fetch(uSorted, middle).x < float(key)) lower = middle + 1; else upper = middle;
      }
      return lower;
    }
    void main() { int key = int(gl_FragCoord.x) + int(gl_FragCoord.y) * RANGE_WIDTH; result = vec4(float(lowerBound(key)), float(lowerBound(key + 1)), 0.0, 1.0); }`,
    density: particle(`float ratio = weight(0.0); float denominator = uRelaxation; vec3 totalGradient = vec3(0.0);
      ${neighbors('ratio += weight(squaredDistance); vec3 grad = gradient(offset, distance, id, neighbor); totalGradient += grad; denominator += dot(grad, grad);')}
      denominator += dot(totalGradient, totalGradient);
      result = vec4(-max(0.0, ratio - 1.0) / denominator, ratio, 0.0, 1.0);`),
    project: particle(`vec3 correction = vec3(0.0); float lambda = fetch(uDensity, id).x;
      ${neighbors('correction += (lambda + fetch(uDensity, neighbor).x) * gradient(offset, distance, id, neighbor);')}
      correction *= min(1.0, SUPPORT * 0.1 / max(length(correction), 0.00000001));
      result = vec4(bounded(position + correction), 1.0);`),
    contacts: particle(`vec3 correction = vec3(0.0); float contacts = 0.0;
      ${neighbors(`if (distance < 2.0 * uRadius) {
        vec3 direction = distance > 0.00000001 ? offset / distance : -normalize(gradient(offset, distance, id, neighbor));
        correction += direction * (2.0 * uRadius - distance) * 0.5; contacts += 1.0;
      }`)}
      result = vec4(bounded(position + correction / max(1.0, contacts * 0.5)), 1.0);`),
    velocity: particle(`vec3 incoming = (fetch(uVelocity, id).xyz + uGravity * uTimeStep) * exp(-uDrag * uTimeStep);
      vec3 velocity = (position - fetch(uPrevious, id).xyz) / uTimeStep;
      for (int axis = 0; axis < 3; axis++) {
        float relative = incoming[axis] - uWallVelocity[axis];
        bool contact = (position[axis] <= uMinimum[axis] + uRadius + 0.000001 && relative < 0.0) || (position[axis] >= uMaximum[axis] - uRadius - 0.000001 && relative > 0.0);
        if (contact) velocity[axis] = uWallVelocity[axis] - (abs(relative) > 0.5 ? relative * uRestitution : 0.0);
      }
      result = vec4(velocity, 1.0);`),
    viscosity: particle(`vec3 velocity = fetch(uVelocity, id).xyz; vec3 correction = vec3(0.0); float ratio = fetch(uDensity, id).y;
      ${neighbors('correction += (fetch(uVelocity, neighbor).xyz - velocity) * (uViscosity * weight(squaredDistance) / max(1.0, max(ratio, fetch(uDensity, neighbor).y)));')}
      result = vec4(velocity + correction, 1.0);`),
  };
}
