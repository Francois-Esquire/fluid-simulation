export const water3DConfig = {
  particlesPerAxis: 16,
  radius: 0.045,
  gravity: [0, -9.81, 0],
  timestep: 1 / 120,
  maxFrameTime: 0.1,
  restitution: 0.1,
  drag: 0.8,
  contactIterations: 4,
  contactsEnabled: true,
  minimum: [-1.5, 0, -1.5],
  maximum: [1.5, 3, 1.5],
};
