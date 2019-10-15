import { screenVertexShader, advectionTimeStepFragmentShader, glsl } from './shaders';

export default function velocityAdvectionModule(ctx, app) {
  const {
    state: {
      water: {
        indices,
        attributes,
        parameters: { timestep, gridSize, gridUnit },
        textures: { velocity1, velocity2 },
        swap,
      },
    },
  } = app;

  const advectVelocityCmd = {
    pass: ctx.pass({
      color: [velocity2],
    }),
    pipeline: ctx.pipeline({
      vert: screenVertexShader,
      frag: advectionTimeStepFragmentShader,
    }),
    attributes,
    indices,
    uniforms: {
      uTimeStep: timestep,
      uInputTexture: velocity1,
      uSamplingTexture: velocity1,
    },
  };

  const initializeVelocityFragmentShader = glsl`
    precision highp float;

    varying vec2 vTexCoord;

    uniform float uFactor;

    void main() {
      float x = 1.0 - fract(sin(vTexCoord.x * uFactor));
      float y = 1.0 - fract(cos(vTexCoord.y * uFactor));



      gl_FragColor = vec4(vec3(x, y, 0.), 1.0);
    }`;

  const initializeVelocity = {
    pipeline: ctx.pipeline({
      vert: screenVertexShader,
      frag: initializeVelocityFragmentShader,
    }),
    attributes,
    indices,
  };

  // pre-generating a velocity field and submit to GPU:

  [
    // [velocity1, 1.0],
    // [velocity1, 46.0],
    // [velocity2, 1.0],
    // [velocity2, 118.0],
  ].forEach(([texture, uFactor]) => {
    ctx.submit(initializeVelocity, {
      pass: ctx.pass({
        color: [texture],
      }),
      uniforms: {
        uFactor,
      },
    });
  });

  // TODO: INCLUDE - prebaked/dynamic/static alpha map
  // TODO: encapsulate within bounds

  const boundaryEnforcementVelocityFragmentShader = glsl`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vTexCoord;

    uniform float uGridUnit;
    uniform float uGridSize;
    uniform sampler2D uInputTexture;

    void main() {
      vec4 velocity = texture2D(uInputTexture, vTexCoord);

      float nX = vTexCoord.x; // / uGridSize;
      float nY = vTexCoord.y; // / uGridSize;

      if (nX == 0. || nX == 1. || nX == 0. || nX == 1. ) {
        velocity.xy = vec2(0.0, 0.0);
      }

      // BOX (0.5-0.65):

      // if (vTexCoord.x > 0.5 && vTexCoord.x < 0.65) {
      //   if (vTexCoord.y > 0.5 && vTexCoord.y < 0.65) {
      //     // TODO: calculate collision
      //     velocity.xy = vec2(0.0, 0.0);
      //   }
      // }


      gl_FragColor = velocity;
    }`;

  const enforceVelocityBoundaries = {
    pass: ctx.pass({
      color: [velocity1],
    }),
    pipeline: ctx.pipeline({
      vert: screenVertexShader,
      frag: boundaryEnforcementVelocityFragmentShader,
    }),
    attributes,
    indices,
    uniforms: {
      uGridUnit: gridUnit,
      uGridSize: gridSize,
      uInputTexture: velocity2,
    },
  };

  return function renderVelocityAdvection() {
    const { water } = app.state;

    ctx.submit(advectVelocityCmd, {
      pass: ctx.pass({
        color: [water.textures.velocity2],
      }),
      uniforms: {
        uInputTexture: water.textures.velocity1,
        uSamplingTexture: water.textures.velocity1,
      },
    });

    // swap('velocity1', 'velocity2');

    ctx.submit(enforceVelocityBoundaries, {
      pass: ctx.pass({
        color: [water.textures.velocity1],
      }),
      uniforms: {
        uInputTexture: water.textures.velocity2,
      },
    });

    // swap('velocity1', 'velocity2');
  };
}
