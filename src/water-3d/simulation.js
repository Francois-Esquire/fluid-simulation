import { water3DConfig } from './config.js';
import { createContactSolver } from './contacts.js';

export function createSimulation() {
  const parameters = {
    ...water3DConfig,
    gravity: [...water3DConfig.gravity],
    minimum: [...water3DConfig.minimum],
    maximum: [...water3DConfig.maximum],
  };
  const side = parameters.particlesPerAxis;
  const count = side ** 3;
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const previousPositions = new Float32Array(positions.length);
  const contacts = createContactSolver(count, parameters);
  const simulation = { parameters, count, positions, velocities, stats: contacts.stats, paused: true, steps: 0, reset, advance };
  let accumulator = 0;

  function reset() {
    for (let particle = 0; particle < count; particle++) {
      const column = particle % side;
      const layer = Math.floor(particle / side) % side;
      const row = Math.floor(particle / (side * side));
      const jitter = ((particle * 16807 % 2147483647) % 997) / 997 - 0.5;
      positions[particle * 3] = -0.7 + column / (side - 1) * 1.4 + jitter * 0.001;
      positions[particle * 3 + 1] = 1.0 + layer / (side - 1) * 1.4;
      positions[particle * 3 + 2] = -0.7 + row / (side - 1) * 1.4 - jitter * 0.001;
    }
    velocities.fill(0);
    accumulator = 0;
    simulation.steps = 0;
    simulation.paused = true;
    contacts.stats.candidates = 0;
    contacts.stats.contacts = 0;
  }

  function constrainBounds() {
    const { minimum, maximum, radius } = parameters;
    for (let particle = 0; particle < count; particle++) {
      for (let axis = 0; axis < 3; axis++) {
        const index = particle * 3 + axis;
        positions[index] = Math.max(minimum[axis] + radius, Math.min(maximum[axis] - radius, positions[index]));
      }
    }
  }

  function step() {
    const { timestep, gravity, radius, restitution, drag, minimum, maximum } = parameters;
    const damping = Math.exp(-drag * timestep);
    previousPositions.set(positions);
    for (let particle = 0; particle < count; particle++) {
      for (let axis = 0; axis < 3; axis++) {
        const index = particle * 3 + axis;
        velocities[index] = (velocities[index] + gravity[axis] * timestep) * damping;
        positions[index] += velocities[index] * timestep;
      }
    }
    contacts.stats.candidates = 0;
    contacts.stats.contacts = 0;
    constrainBounds();
    if (parameters.contactsEnabled) {
      for (let iteration = 0; iteration < parameters.contactIterations; iteration++) {
        contacts.project(positions, (simulation.steps + iteration) % 2 === 1);
        constrainBounds();
      }
    }
    for (let particle = 0; particle < count; particle++) {
      for (let axis = 0; axis < 3; axis++) {
        const index = particle * 3 + axis;
        const incoming = velocities[index];
        velocities[index] = (positions[index] - previousPositions[index]) / timestep;
        const atLower = positions[index] <= minimum[axis] + radius + 1e-6;
        const atUpper = positions[index] >= maximum[axis] - radius - 1e-6;
        if ((atLower && incoming < 0) || (atUpper && incoming > 0)) {
          velocities[index] = Math.abs(incoming) > 0.5 ? -incoming * restitution : 0;
        }
      }
    }
    simulation.steps++;
  }

  function advance(elapsed) {
    if (simulation.paused) {
      accumulator = 0;
      return;
    }
    accumulator += Math.min(Math.max(elapsed, 0), parameters.maxFrameTime);
    while (accumulator + 1e-10 >= parameters.timestep) {
      step();
      accumulator = Math.max(0, accumulator - parameters.timestep);
    }
  }

  reset();
  return simulation;
}
