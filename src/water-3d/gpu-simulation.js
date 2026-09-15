import { water3DConfig } from './config.js';
import { computeVertex } from './gpu-device.js';
import { createComputeSources } from './gpu-shaders.js';

export function createGPUSimulation(device) {
  const parameters = { ...water3DConfig, gravity: [...water3DConfig.gravity], minimum: [...water3DConfig.minimum], maximum: [...water3DConfig.maximum] };
  const count = parameters.particlesPerAxis ** 3;
  const capacity = 2 ** Math.ceil(Math.log2(count));
  const width = 2 ** Math.ceil(Math.log2(Math.sqrt(capacity)));
  const height = capacity / width;
  const dimensions = parameters.maximum.map((maximum, axis) => Math.ceil((maximum - parameters.minimum[axis]) / parameters.smoothingRadius));
  const rangeWidth = Math.ceil(Math.sqrt(dimensions.reduce((product, dimension) => product * dimension, 1)));
  let position = device.texture(width, height);
  let nextPosition = device.texture(width, height);
  let velocity = device.texture(width, height);
  let nextVelocity = device.texture(width, height);
  const previous = device.texture(width, height);
  let sorted = device.texture(width, height);
  let nextSorted = device.texture(width, height);
  const ranges = device.texture(rangeWidth, rangeWidth);
  const density = device.texture(width, height);
  const sources = createComputeSources(count, width, capacity, rangeWidth, dimensions, parameters);
  const programs = Object.fromEntries(Object.entries(sources).map(([name, fragment]) => [name, device.program(computeVertex, fragment)]));
  const tank = [0, 0, 0];
  const target = [0, 0, 0];
  const wallVelocity = [0, 0, 0];
  let accumulator = 0;
  const simulation = {
    backend: 'WebGL2 GPU', parameters, count, width, height, tank, target, paused: true, steps: 0,
    get positionTexture() { return position; },
    get densityTexture() { return density; },
    reset, advance, setTankTarget, readState,
  };

  function uniforms(extra = {}) {
    return {
      uPosition: position, uVelocity: velocity, uPrevious: previous,
      uSorted: sorted, uRanges: ranges, uDensity: density,
      uMinimum: parameters.minimum.map((value, axis) => value + tank[axis]),
      uMaximum: parameters.maximum.map((value, axis) => value + tank[axis]),
      uGravity: parameters.gravity, uWallVelocity: wallVelocity,
      uTimeStep: parameters.timestep, uDrag: parameters.drag, uRadius: parameters.radius,
      uRestDensity: parameters.restDensity, uRelaxation: parameters.densityRelaxation,
      uViscosity: parameters.viscosity, uRestitution: parameters.restitution,
      ...extra,
    };
  }
  function run(name, output, extra) { device.draw(programs[name], output, uniforms(extra)); }
  function swapPositions() { [position, nextPosition] = [nextPosition, position]; }
  function swapVelocities() { [velocity, nextVelocity] = [nextVelocity, velocity]; }

  function buildGrid() {
    run('hash', sorted);
    for (let stage = 2; stage <= capacity; stage *= 2) {
      for (let stride = stage / 2; stride >= 1; stride /= 2) {
        run('sort', nextSorted, { uStage: stage, uStride: stride });
        [sorted, nextSorted] = [nextSorted, sorted];
      }
    }
    run('ranges', ranges);
  }

  function reset() {
    const data = new Float32Array(capacity * 4);
    const side = parameters.particlesPerAxis;
    for (let particle = 0; particle < count; particle++) {
      const jitter = ((particle * 16807 % 2147483647) % 997) / 997 - 0.5;
      data[particle * 4] = -0.7 + (particle % side) / (side - 1) * 1.4 + jitter * 0.001;
      data[particle * 4 + 1] = 1 + (Math.floor(particle / side) % side) / (side - 1) * 1.4;
      data[particle * 4 + 2] = -0.7 + Math.floor(particle / (side * side)) / (side - 1) * 1.4 - jitter * 0.001;
      data[particle * 4 + 3] = 1;
    }
    for (const texture of [position, nextPosition, previous]) device.upload(texture, data);
    data.fill(0);
    for (const texture of [velocity, nextVelocity]) device.upload(texture, data);
    tank.fill(0);
    target.fill(0);
    wallVelocity.fill(0);
    accumulator = 0;
    simulation.steps = 0;
    simulation.paused = true;
    buildGrid();
    run('density', density);
  }

  function setTankTarget(value) {
    if (value.length !== 3 || !value.every(Number.isFinite)) return;
    for (let axis = 0; axis < 3; axis++) target[axis] = Math.max(-1.25, Math.min(1.25, value[axis]));
  }

  function step() {
    const delta = target.map((value, axis) => value - tank[axis]);
    const movementScale = Math.min(1, parameters.tankSpeed * parameters.timestep / Math.max(Math.hypot(...delta), 1e-8));
    for (let axis = 0; axis < 3; axis++) {
      const movement = delta[axis] * movementScale;
      tank[axis] += movement;
      wallVelocity[axis] = movement / parameters.timestep;
    }
    run('copy', previous);
    run('predict', nextPosition);
    swapPositions();
    const iterations = parameters.solver === 'fluid' ? parameters.densityIterations : parameters.solver === 'contacts' ? parameters.contactIterations : 0;
    for (let iteration = 0; iteration < iterations; iteration++) {
      buildGrid();
      if (parameters.solver === 'fluid') run('density', density);
      run(parameters.solver === 'fluid' ? 'project' : 'contacts', nextPosition);
      swapPositions();
    }
    run('velocity', nextVelocity);
    swapVelocities();
    if (parameters.solver === 'fluid') {
      buildGrid();
      run('density', density);
      run('viscosity', nextVelocity);
      swapVelocities();
    }
    simulation.steps++;
  }

  function advance(elapsed) {
    if (simulation.paused) {
      accumulator = 0;
      const translation = target.map((value, axis) => value - tank[axis]);
      if (translation.some(value => value !== 0)) {
        run('translate', nextPosition, { uTranslation: translation });
        swapPositions();
        for (let axis = 0; axis < 3; axis++) tank[axis] = target[axis];
      }
      wallVelocity.fill(0);
      return;
    }
    accumulator += Math.min(Math.max(0, elapsed), parameters.maxFrameTime);
    while (accumulator + 1e-10 >= parameters.timestep) {
      step();
      accumulator = Math.max(0, accumulator - parameters.timestep);
    }
  }

  function readState() {
    return { positions: device.read(position).slice(0, count * 4), velocities: device.read(velocity).slice(0, count * 4), density: device.read(density).slice(0, count * 4), sorted: device.read(sorted), ranges: device.read(ranges), dimensions, rangeWidth };
  }

  reset();
  return simulation;
}
