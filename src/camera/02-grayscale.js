import { screenVertexShader, glsl } from '../shaders';
import { quad } from '../shapes';

export default function grayScalePass(ctx, app) {
  const grayScaleFragmentShader = glsl`
    precision highp float;
    precision highp sampler2D;

    uniform float uColorFactor;
    uniform sampler2D uVideoTexture;

    varying vec2 vTexCoord;

    vec4 convertToGeyScale(vec4 sample) {
      float grey = 0.21 * sample.r + 0.71 * sample.g + 0.07 * sample.b;
      return vec4(
        sample.r * uColorFactor + grey * (1.0 - uColorFactor),
        sample.g * uColorFactor + grey * (1.0 - uColorFactor),
        sample.b * uColorFactor + grey * (1.0 - uColorFactor),
        1.0
      );
    }

    void main() {
      vec4 sample = texture2D(uVideoTexture, vTexCoord);
      gl_FragColor = convertToGeyScale(sample);
    }`;

  const { positions, texCoords, faces } = quad;

  const grayScaleCmd = {
    pass: ctx.pass({
      color: [app.state.camera.textures.process1],
    }),
    pipeline: ctx.pipeline({
      vert: screenVertexShader,
      frag: grayScaleFragmentShader,
    }),
    attributes: {
      aPosition: ctx.vertexBuffer(positions),
      aTexCoord: ctx.vertexBuffer(texCoords),
    },
    indices: ctx.indexBuffer(faces),
    uniforms: {
      uVideoTexture: app.state.camera.textures.video,
      uColorFactor: 0,
    },
  };

  return function convertGrayscale() {
    ctx.submit(grayScaleCmd);
  };
}
