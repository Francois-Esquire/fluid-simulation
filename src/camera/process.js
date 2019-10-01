import { videoVertexShader, videoFragmentShader } from '../shaders';
import { quad } from '../shapes';

export default function cameraProcessModule(ctx, app) {
  const { positions, texCoords, faces } = quad;
  const command = {
    pipeline: ctx.pipeline({
      vert: videoVertexShader,
      frag: videoFragmentShader,
    }),
    attributes: {
      aPosition: ctx.vertexBuffer(positions),
      aTexCoord0: ctx.vertexBuffer(texCoords),
    },
    indices: ctx.indexBuffer(faces),
    uniforms: {
      uVideoTexture: texture,
      uBounds: [0, 0, 1, 1],
      uColorFactor: 0,
    },
    viewport: [0, 0, 256, 256],
  };

  return function frame() {
    if (app.state.camera.loaded) {
      ctx.submit(command, {
        uniforms: {
          uVideoTexture: app.state.camera.texture,
        },
        viewport: [0, 0, ctx.gl.canvas.width, ctx.gl.canvas.height],
      });
    }
  };
}
