import { glsl } from '../util';

export default function colorModule(ctx, app) {
  const {
    state: {
      water: {
        attributes,
        indices,
        constants: { timestep },
        shaders: { screenVertexShader },
        textures: { velocity1, screen, color },
        swap,
      },
    },
  } = app;

  const colorAdvectionFragmentShader = glsl`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vTexCoord;

    uniform float uTimeStep;
    uniform sampler2D uInputTexture;
    uniform sampler2D uVelocityTexture;

    void main() {
      vec2 u = texture2D(uVelocityTexture, fract(vTexCoord)).xy;
      vec2 pastCoord = fract(vTexCoord - (0.5 * uTimeStep * u));
      gl_FragColor = step(0.5, texture2D(uInputTexture, pastCoord));

      if (vTexCoord.y < 0.01) {
        if (vTexCoord.x < 0.01) {
          gl_FragColor = vec4(1.0);
        }
      }
    }`;

  const drawColorsCmd = {
    pass: ctx.pass({
      color: [color],
    }),
    pipeline: ctx.pipeline({
      vert: screenVertexShader,
      frag: colorAdvectionFragmentShader,
    }),
    attributes,
    indices,
    uniforms: {
      uTimeStep: timestep,
      uInputTexture: screen,
      uVelocityTexture: velocity1,
    },
  };

  return function renderColors() {
    ctx.submit(drawColorsCmd, {
      pass: ctx.pass({
        color: [app.state.water.textures.color],
      }),
      uniforms: {
        uInputTexture: app.state.water.textures.screen,
        uVelocityTexture: app.state.water.textures.velocity1,
      },
    });
    swap('screen', 'color');
  };
}
