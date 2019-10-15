import { screenVertexShader, advectionTimeStepFragmentShader } from './shaders';

export default function colorModule(ctx, app) {
  const {
    state: {
      water: {
        indices,
        attributes,
        parameters: { timestep },
        textures: { velocity1, color1, color2 },
        swap,
      },
    },
  } = app;

  const drawColorsCmd = {
    pass: ctx.pass({
      color: [color2],
    }),
    pipeline: ctx.pipeline({
      vert: screenVertexShader,
      frag: advectionTimeStepFragmentShader,
    }),
    attributes,
    indices,
    uniforms: {
      uTimeStep: timestep,
      uInputTexture: color1,
      uSamplingTexture: velocity1,
    },
  };

  return function renderColors() {
    ctx.submit(drawColorsCmd, {
      pass: ctx.pass({
        color: [app.state.water.textures.color2],
      }),
      uniforms: {
        uInputTexture: app.state.water.textures.color1,
        uSamplingTexture: app.state.water.textures.velocity1,
      },
    });
    swap('color1', 'color2');
  };
}
