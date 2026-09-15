const particlesPerAxis = 12;
const spacing = 1.4 / (particlesPerAxis - 1);

export const water3DConfig = {
  particlesPerAxis,
  radius: spacing * 0.48,
  gravity: [0, -9.81, 0],
  timestep: 1 / 120,
  maxFrameTime: 1 / 30,
  tankSpeed: 2,
  restitution: 0.1,
  drag: 0.8,
  contactIterations: 4,
  solver: 'fluid',
  waterSurface: true,
  smoothingRadius: spacing * 1.93,
  restDensity: 1,
  densityIterations: 3,
  densityRelaxation: 20,
  viscosity: 0.02,
  minimum: [-1.5, 0, -1.5],
  maximum: [1.5, 3, 1.5],
};
