import { screenVertexShader, screenFragmentShader } from '../shaders';

export default function renderScreenModule(ctx, app) {
  const {
    state: { camera },
  } = app;

  const scale = 4;
  const width = app.width / scale;
  const height = app.height / scale;
  const centerX = app.width - app.width / 2 + width * 2;
  const centerY = app.height - app.height / 2 + height * 2;
  const viewport = [centerX, centerY, width, height];

  const drawScreenCmd = {
    pass: ctx.pass({
      clearColor: [0.2, 0.2, 0.2, 1.0],
    }),
    pipeline: ctx.pipeline({
      vert: screenVertexShader,
      frag: screenFragmentShader,
    }),
    attributes: camera.attributes,
    indices: camera.indices,
    uniforms: {
      uTexture: app.state.camera.textures.process1,
    },
  };

  return function renderScreen() {
    const { camera } = app.state;

    ctx.submit(drawScreenCmd, {
      uniforms: {
        uTexture: camera.textures.process1,
      },
      viewport,
    });
  };
}
