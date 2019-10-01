import { glsl } from '../util';

export default function debugDrawModule(ctx, app) {
  const {
    state: {
      water: {
        indices,
        attributes,
        shaders: { screenVertexShader },
        textures: { screen, velocity1 },
      },
    },
  } = app;

  const drawToScreenFragmentShader = glsl`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vTexCoord;
    uniform sampler2D uTexture;

    void main() {
      vec3 color = vec3(texture2D(uTexture, vTexCoord).xy * 2.0, 0.);
      gl_FragColor = vec4(color, 1.0);
    }`;

  const drawCmd = {
    pass: ctx.pass({
      color: [screen],
    }),
    pipeline: ctx.pipeline({
      vert: screenVertexShader,
      frag: drawToScreenFragmentShader,
    }),
    attributes,
    indices,
    uniforms: {
      uTexture: velocity1,
    },
  };

  return function renderDebugRenderer() {
    ctx.submit(drawCmd, {
      pass: ctx.pass({
        color: [app.state.water.textures.screen],
      }),
      uniforms: {
        uTexture: app.state.water.textures.velocity1,
      },
    });
  };
}
