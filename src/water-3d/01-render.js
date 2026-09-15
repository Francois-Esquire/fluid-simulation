import { screenVertexShader, screenFragmentShader } from '../shaders';

export default function renderScreenModule(ctx, app) {
  const {
    state: {
      water3D: {
        indices,
        attributes,
        textures,
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
      uTexture: textures.screen,
    },
  };

  return function renderScreen() {
    ctx.submit(drawScreenCmd, {
      uniforms: {
        uTexture: textures.screen,
      },
    });
  };
}
