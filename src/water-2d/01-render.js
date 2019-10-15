import { screenVertexShader, screenFragmentShader } from './shaders';

export default function renderScreenModule(ctx, app) {
  const {
    state: {
      water: {
        indices,
        attributes,
        textures: { screen },
      },
    },
  } = app;

  const drawScreenCmd = {
    pass: ctx.pass({
      clearColor: [0.2, 0.2, 0.2, 1.0],
    }),
    pipeline: ctx.pipeline({
      vert: screenVertexShader,
      frag: screenFragmentShader,
    }),
    attributes,
    indices,
    uniforms: {
      uTexture: screen,
    },
  };

  return function renderScreen() {
    const { water } = app.state;

    ctx.submit(drawScreenCmd, {
      uniforms: {
        uTexture: water.textures.screen,
      },
    });
  };
}
