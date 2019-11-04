// tutorial (the art of code): https://www.youtube.com/watch?v=PGtv-dBi2wE

import { screenVertexShader, fragmentShader } from '../shaders';
import { quad } from '../shapes';

export default function rayMarchingPrimitives(ctx, app) {
  const { faces, positions, texCoords } = quad;

  const drawRayMarchingCmd = {
    pipeline: ctx.pipeline({
      vert: screenVertexShader,
      frag: fragmentShader,
    }),
    attributes: {
      aPosition: ctx.vertexBuffer(positions),
      aTexCoord: ctx.vertexBuffer(texCoords),
    },
    indices: ctx.indexBuffer(faces),
    uniforms: {
      iResolution: [app.width, app.height],
    },
  };

  return function rayMarchingPrimitivesRenderer() {
    ctx.submit(drawRayMarchingCmd, {
      uniforms: {
        // in seconds
        iTime: app.state.time,
        iMouse: [app.state.mx, app.state.my],
      },
    });
  };
}
