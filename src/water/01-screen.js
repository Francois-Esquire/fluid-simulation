export default function waterScreenModule(ctx, app) {
  const {
    state: {
      water: {
        indices,
        attributes,
        shaders: { screenVertexShader, screenFragmentShader },
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
    ctx.submit(drawScreenCmd, {
      uniforms: {
        uTexture: app.state.water.textures.screen,
      },
    });
  };
}
