import { screenVertexShader, glsl } from '../shaders';

export default function particlesModule(ctx, app) {
  const {
    state: {
      water3D: { attributes, indices, parameters, textures, swap },
    },
  } = app;

  // constrain values in a cube (1x3)
  // move particles based on factors, velocity (f=ma, a=dv/dt, dt=timestep, dv=velocity x gravity - always pointing down)
  // pass particles to renderable shader

  const particlesFragmentShader = glsl`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vTexCoord;

    uniform float uTime;
    uniform float uGridSize;
    uniform float uGridUnit;
    uniform sampler2D uParticleTexture;
    uniform sampler2D uVelocityTexture;

    void main() {
      vec3 particle = 2. * texture2D(uParticleTexture, vTexCoord).xyz - 1.;
      gl_FragColor = vec4(particle * 0.5 + .5, 1.0);
    }`;

  const drawParticlesCmd = {
    pass: ctx.pass({
      color: [textures.particle2],
    }),
    pipeline: ctx.pipeline({
      vert: screenVertexShader,
      frag: particlesFragmentShader,
    }),
    attributes,
    indices,
    uniforms: {
      uTime: 0,
      uGridSize: parameters.gridSize,
      uGridUnit: parameters.gridUnit,
      uParticleTexture: textures.particle1,
      uVelocityTexture: textures.velocity1,
    },
  };

  // put particles on lower end
  const initializeParticlesFragmentShader = glsl`
    precision highp float;
    precision highp sampler2D;

    uniform float uGridSize;

    varying vec2 vTexCoord;

    void main() {
      // float nFactor = 4.;
      // float mFactor = 4.;

      float nFactor = 128.;
      float mFactor = 128.;
      float x = 1. - mod(vTexCoord.x * nFactor, mFactor) / mFactor;
      float y = 1. - mod(vTexCoord.y * nFactor, mFactor) / mFactor;
      float z = 1. - mod(((mFactor / 2.) * (x + y) - mFactor) * nFactor, mFactor) / mFactor;
      vec3 position = vec3(x, y, z);
      gl_FragColor = vec4(position, 1.0);

      // all points flat
      // gl_FragColor = vec4(vec3(vTexCoord, 0.), 1.0);

      // points taper
      // gl_FragColor = vec4(vTexCoord.x * cos(vTexCoord.x * 100.) / .5, vTexCoord.y - (0.2 + 1. / vTexCoord.y * 0.125), vTexCoord.y * sin(vTexCoord.y * 1000.), 1.0);
    }`;

  const initializeParticlesCmd = {
    pass: ctx.pass({
      color: [textures.particle1],
    }),
    pipeline: ctx.pipeline({
      vert: screenVertexShader,
      frag: initializeParticlesFragmentShader,
    }),
    attributes,
    indices,
  };

  ctx.submit(initializeParticlesCmd);

  return function renderParticles() {
    ctx.submit(drawParticlesCmd, {
      pass: ctx.pass({
        color: [textures.particle2],
      }),
      uniforms: {
        uTime: app.state.time,
        uGridSize: parameters.gridSize,
        uParticleTexture: textures.particle1,
        uVelocityTexture: textures.velocity1,
      },
    });
    swap('particle1', 'particle2');
  };
}
