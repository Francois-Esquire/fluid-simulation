import { glsl } from '../util';

export default function velocityAdvectionModule(ctx, app) {
  const {
    state: {
      water: {
        indices,
        attributes,
        constants: { timestep },
        shaders: { screenVertexShader },
        textures: { velocity1, velocity2 },
        swap,
      },
    },
  } = app;

  const waterVelocityAdvectionFragmentShader = glsl`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vTexCoord;

    uniform float uTimeStep;
    uniform sampler2D uInputTexture;
    uniform sampler2D uVelocityTexture;

    void main() {
      vec2 u = texture2D(uVelocityTexture, fract(vTexCoord)).xy;
      vec2 pastCoord = fract(vTexCoord - (0.5 * uTimeStep * u));
      gl_FragColor = texture2D(uInputTexture, pastCoord);
    }`;

  const initializeVelocityFragmentShader = glsl`
    precision highp float;

    varying vec2 vTexCoord;

    uniform float uFactor;

    void main() {
      float x = fract(sin(vTexCoord.x * uFactor));
      float y = fract(cos(vTexCoord.y * uFactor));

      gl_FragColor = vec4(vec3(x, y, 0.), 1.0);
    }`;

  const advectVelocityCmd = {
    pass: ctx.pass({
      color: [velocity2],
    }),
    pipeline: ctx.pipeline({
      vert: screenVertexShader,
      frag: waterVelocityAdvectionFragmentShader,
    }),
    attributes,
    indices,
    uniforms: {
      uTimeStep: timestep,
      uInputTexture: velocity1,
      uVelocityTexture: velocity1,
    },
  };

  const initializeVelocity = {
    pipeline: ctx.pipeline({
      vert: screenVertexShader,
      frag: initializeVelocityFragmentShader,
    }),
    attributes,
    indices,
  };

  ctx.submit(initializeVelocity, {
    pass: ctx.pass({
      color: [velocity1],
    }),
    uniforms: {
      uFactor: 6.0,
    },
  });

  ctx.submit(initializeVelocity, {
    pass: ctx.pass({
      color: [velocity2],
    }),
    uniforms: {
      uFactor: 8.5,
    },
  });

  return function renderVelocityAdvection() {
    ctx.submit(advectVelocityCmd, {
      pass: ctx.pass({
        color: [app.state.water.textures.velocity2],
      }),
      uniforms: {
        uInputTexture: app.state.water.textures.velocity1,
        uVelocityTexture: app.state.water.textures.velocity1,
      },
    });

    swap('velocity1', 'velocity2');
  };
}
