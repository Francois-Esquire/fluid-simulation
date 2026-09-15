export function createDensitySolver(count, parameters) {
  const support = parameters.smoothingRadius;
  const supportSquared = support * support;
  const volume = (1.4 / (parameters.particlesPerAxis - 1)) ** 3;
  const poly6 = 315 / (64 * Math.PI * support ** 9);
  const spiky = -45 / (Math.PI * support ** 6);
  const dimensions = parameters.maximum.map((maximum, axis) => Math.ceil((maximum - parameters.minimum[axis]) / support));
  const heads = new Int32Array(dimensions[0] * dimensions[1] * dimensions[2]);
  const next = new Int32Array(count);
  const cells = new Int32Array(count * 3);
  const ratios = new Float32Array(count);
  const lambdas = new Float32Array(count);
  const gradients = new Float32Array(count * 3);
  const denominators = new Float32Array(count);
  const corrections = new Float32Array(count * 3);
  let capacity = count * 32;
  let pairs = new Uint32Array(capacity * 2);
  let pairGradients = new Float32Array(capacity * 3);
  let weights = new Float32Array(capacity);
  let pairCount = 0;
  const stats = { neighbors: 0, meanCompression: 0, maxCompression: 0 };

  function addPair(first, second, horizontal, vertical, depth, squaredDistance, scale) {
    if (pairCount === capacity) {
      capacity *= 2;
      const expandedPairs = new Uint32Array(capacity * 2);
      const expandedGradients = new Float32Array(capacity * 3);
      const expandedWeights = new Float32Array(capacity);
      expandedPairs.set(pairs);
      expandedGradients.set(pairGradients);
      expandedWeights.set(weights);
      pairs = expandedPairs;
      pairGradients = expandedGradients;
      weights = expandedWeights;
    }
    const distance = Math.sqrt(squaredDistance);
    const weight = scale * poly6 * (supportSquared - squaredDistance) ** 3;
    let factor = scale * spiky * (support - distance) ** 2;
    if (distance > 1e-8) factor /= distance;
    else {
      const axis = (first + second) % 3;
      horizontal = axis === 0 ? 1 : 0;
      vertical = axis === 1 ? 1 : 0;
      depth = axis === 2 ? 1 : 0;
    }
    const offset = pairCount * 3;
    pairs[pairCount * 2] = first;
    pairs[pairCount * 2 + 1] = second;
    pairGradients[offset] = horizontal * factor;
    pairGradients[offset + 1] = vertical * factor;
    pairGradients[offset + 2] = depth * factor;
    weights[pairCount] = weight;
    ratios[first] += weight;
    ratios[second] += weight;
    for (let axis = 0; axis < 3; axis++) {
      const gradient = pairGradients[offset + axis];
      gradients[first * 3 + axis] += gradient;
      gradients[second * 3 + axis] -= gradient;
      denominators[first] += gradient * gradient;
      denominators[second] += gradient * gradient;
    }
    pairCount++;
  }

  function measure(positions) {
    const scale = volume / parameters.restDensity;
    heads.fill(-1);
    gradients.fill(0);
    denominators.fill(0);
    ratios.fill(scale * poly6 * support ** 6);
    pairCount = 0;
    for (let particle = 0; particle < count; particle++) {
      const offset = particle * 3;
      for (let axis = 0; axis < 3; axis++) {
        cells[offset + axis] = Math.max(0, Math.min(dimensions[axis] - 1, Math.floor((positions[offset + axis] - parameters.minimum[axis]) / support)));
      }
      const cell = cells[offset] + dimensions[0] * (cells[offset + 1] + dimensions[1] * cells[offset + 2]);
      next[particle] = heads[cell];
      heads[cell] = particle;
    }
    for (let particle = 0; particle < count; particle++) {
      const offset = particle * 3;
      for (let depth = Math.max(0, cells[offset + 2] - 1); depth <= Math.min(dimensions[2] - 1, cells[offset + 2] + 1); depth++) {
        for (let row = Math.max(0, cells[offset + 1] - 1); row <= Math.min(dimensions[1] - 1, cells[offset + 1] + 1); row++) {
          for (let column = Math.max(0, cells[offset] - 1); column <= Math.min(dimensions[0] - 1, cells[offset] + 1); column++) {
            const cell = column + dimensions[0] * (row + dimensions[1] * depth);
            for (let neighbor = heads[cell]; neighbor !== -1; neighbor = next[neighbor]) {
              if (neighbor <= particle) continue;
              const other = neighbor * 3;
              const horizontal = positions[offset] - positions[other];
              const vertical = positions[offset + 1] - positions[other + 1];
              const depthDelta = positions[offset + 2] - positions[other + 2];
              const squaredDistance = horizontal ** 2 + vertical ** 2 + depthDelta ** 2;
              if (squaredDistance < supportSquared) addPair(particle, neighbor, horizontal, vertical, depthDelta, squaredDistance, scale);
            }
          }
        }
      }
    }
    let sum = 0;
    let maximum = 0;
    for (const ratio of ratios) {
      const compression = Math.max(0, ratio - 1);
      sum += compression;
      maximum = Math.max(maximum, compression);
    }
    stats.neighbors = pairCount;
    stats.meanCompression = sum / count;
    stats.maxCompression = maximum;
    return stats;
  }

  function project(positions) {
    measure(positions);
    corrections.fill(0);
    for (let particle = 0; particle < count; particle++) {
      let denominator = denominators[particle] + parameters.densityRelaxation;
      for (let axis = 0; axis < 3; axis++) denominator += gradients[particle * 3 + axis] ** 2;
      lambdas[particle] = -Math.max(0, ratios[particle] - 1) / denominator;
    }
    for (let pair = 0; pair < pairCount; pair++) {
      const first = pairs[pair * 2];
      const second = pairs[pair * 2 + 1];
      const lambda = lambdas[first] + lambdas[second];
      for (let axis = 0; axis < 3; axis++) {
        const delta = lambda * pairGradients[pair * 3 + axis];
        corrections[first * 3 + axis] += delta;
        corrections[second * 3 + axis] -= delta;
      }
    }
    let maxLength = 0;
    for (let particle = 0; particle < count; particle++) {
      const offset = particle * 3;
      maxLength = Math.max(maxLength, Math.hypot(corrections[offset], corrections[offset + 1], corrections[offset + 2]));
    }
    const correctionScale = Math.min(1, support * 0.1 / Math.max(maxLength, 1e-8));
    for (let index = 0; index < positions.length; index++) positions[index] += corrections[index] * correctionScale;
  }

  function smoothVelocities(velocities) {
    corrections.fill(0);
    for (let pair = 0; pair < pairCount; pair++) {
      const first = pairs[pair * 2];
      const second = pairs[pair * 2 + 1];
      const weight = parameters.viscosity * weights[pair] / Math.max(1, ratios[first], ratios[second]);
      for (let axis = 0; axis < 3; axis++) {
        const delta = (velocities[second * 3 + axis] - velocities[first * 3 + axis]) * weight;
        corrections[first * 3 + axis] += delta;
        corrections[second * 3 + axis] -= delta;
      }
    }
    for (let index = 0; index < velocities.length; index++) velocities[index] += corrections[index];
  }

  return { project, measure, smoothVelocities, ratios, stats };
}
