import { screenVertexShader, glsl } from './shaders';

export default function renderWaterModule(ctx, app) {
  const {
    state: {
      water: {
        indices,
        attributes,
        textures: { screen, velocity1 },
      },
    },
  } = app;

  const drawToScreenFragmentShader = glsl`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vTexCoord;
    uniform sampler2D uVelocityTexture;

    void main() {
      vec2 velocity = texture2D(uVelocityTexture, vTexCoord).xy;
      vec3 color = vec3(0.2, 0.5, 0.8) * 1. - vec3(velocity, length(velocity));
      gl_FragColor = vec4(color, 1.0);
    }`;

  const drawMilkToScreenFragmentShader = glsl`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vTexCoord;
    uniform sampler2D uVelocityTexture;

    void main() {
      vec2 velocity = texture2D(uVelocityTexture, vTexCoord).xy;
      vec3 color = vec3(1.0) - length(velocity * 2.0 - 1.0) * 0.1;
      gl_FragColor = vec4(color, 1.0);
      // gl_FragColor.rgb += color * 0.25 + 0.25;
    }`;

  const drawDebugToScreenFragmentShader = glsl`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vTexCoord;
    uniform sampler2D uVelocityTexture;

    void main() {
      vec2 velocity = texture2D(uVelocityTexture, vTexCoord).xy;
      vec3 color = vec3(velocity, 0.0);
      color = normalize(color);
      gl_FragColor = vec4(color, 1.0);
    }`;

  const drawCmd = {
    pass: ctx.pass({
      color: [screen],
    }),
    pipeline: ctx.pipeline({
      vert: screenVertexShader,
      frag: drawToScreenFragmentShader,
      // frag: drawMilkToScreenFragmentShader,
      // frag: drawDebugToScreenFragmentShader,
    }),
    attributes,
    indices,
    uniforms: {
      uVelocityTexture: velocity1,
    },
  };

  return function waterRenderer() {
    ctx.submit(drawCmd, {
      pass: ctx.pass({
        color: [app.state.water.textures.screen],
      }),
      uniforms: {
        uVelocityTexture: app.state.water.textures.velocity1,
      },
    });
  };
}
