export function createContactSolver(count, parameters) {
  const diameter = parameters.radius * 2;
  const dimensions = parameters.maximum.map((maximum, axis) => Math.ceil((maximum - parameters.minimum[axis]) / diameter));
  const heads = new Int32Array(dimensions[0] * dimensions[1] * dimensions[2]);
  const next = new Int32Array(count);
  const cells = new Int32Array(count * 3);
  const stats = { candidates: 0, contacts: 0 };

  function build(positions) {
    heads.fill(-1);
    for (let particle = 0; particle < count; particle++) {
      const offset = particle * 3;
      for (let axis = 0; axis < 3; axis++) {
        cells[offset + axis] = Math.max(0, Math.min(dimensions[axis] - 1, Math.floor((positions[offset + axis] - parameters.minimum[axis]) / diameter)));
      }
      const cell = cells[offset] + dimensions[0] * (cells[offset + 1] + dimensions[1] * cells[offset + 2]);
      next[particle] = heads[cell];
      heads[cell] = particle;
    }
  }

  function project(positions, reverse = false) {
    build(positions);
    for (let visit = 0; visit < count; visit++) {
      const particle = reverse ? count - 1 - visit : visit;
      const offset = particle * 3;
      for (let depth = Math.max(0, cells[offset + 2] - 1); depth <= Math.min(dimensions[2] - 1, cells[offset + 2] + 1); depth++) {
        for (let row = Math.max(0, cells[offset + 1] - 1); row <= Math.min(dimensions[1] - 1, cells[offset + 1] + 1); row++) {
          for (let column = Math.max(0, cells[offset] - 1); column <= Math.min(dimensions[0] - 1, cells[offset] + 1); column++) {
            const cell = column + dimensions[0] * (row + dimensions[1] * depth);
            for (let neighbor = heads[cell]; neighbor !== -1; neighbor = next[neighbor]) {
              if (neighbor <= particle) continue;
              stats.candidates++;
              const other = neighbor * 3;
              let horizontal = positions[offset] - positions[other];
              let vertical = positions[offset + 1] - positions[other + 1];
              let depthDelta = positions[offset + 2] - positions[other + 2];
              const squaredDistance = horizontal ** 2 + vertical ** 2 + depthDelta ** 2;
              if (squaredDistance >= diameter * diameter) continue;
              stats.contacts++;
              const originalDistance = Math.sqrt(squaredDistance);
              let distance = originalDistance;
              if (distance < 1e-8) {
                const axis = (particle + neighbor) % 3;
                horizontal = axis === 0 ? 1 : 0;
                vertical = axis === 1 ? 1 : 0;
                depthDelta = axis === 2 ? 1 : 0;
                distance = 1;
              }
              const correction = (diameter - originalDistance) * 0.5 / distance;
              positions[offset] += horizontal * correction;
              positions[offset + 1] += vertical * correction;
              positions[offset + 2] += depthDelta * correction;
              positions[other] -= horizontal * correction;
              positions[other + 1] -= vertical * correction;
              positions[other + 2] -= depthDelta * correction;
            }
          }
        }
      }
    }
  }

  return { project, stats };
}
