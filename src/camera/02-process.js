import { screenVertexShader, glsl } from '../shaders';
import { quad } from '../shapes';

export default function cameraProcessModule(ctx, app) {
  const { positions, texCoords, faces } = quad;

  const videoVertexShader = glsl`
    attribute vec2 aPosition;
    attribute vec2 aTexCoord0;

    uniform vec4 uBounds; // x, y, width, height

    varying vec2 vTexCoord;

    void main() {
      vec2 pos = aPosition;
      pos = (pos + 1.0) / 2.0; // move from -1..1 to 0..1
      pos = vec2(
        uBounds.x + pos.x * uBounds.z,
        uBounds.y + pos.y * uBounds.w
      );
      pos = pos * 2.0 - 1.0;
      gl_Position = vec4(pos, 0.0, 1.0);
      vTexCoord = aTexCoord0;
    }`;

  const videoFragmentShader = glsl`
    precision highp float;

    uniform sampler2D uVideoTexture;
    uniform vec4 uBounds;
    uniform float uColorFactor;

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

    float divisor = 1. / 3.;
    const int octaves = 4;
    int threshold = 9;

    void main() {
      vec4 sample = texture2D(uVideoTexture, vTexCoord);

      if (vTexCoord.y <= divisor * 2. && vTexCoord.y >= divisor) {
        gl_FragColor = convertToGeyScale(sample);
      } else if (vTexCoord.y < divisor) {
        vec4 grey = convertToGeyScale(sample);

        int n = 0;
        float radius = 4.;
        const int steps = 360 / 16;

        for (int i = 0; i < steps; i++) {
          int theta = i * steps;
          vec4 pix = texture2D(
            uVideoTexture,
            vec2(
              floor(radius * cos(float(theta))),
              floor(radius * sin(float(theta)))
            )
          );

          if (length(abs(grey - convertToGeyScale(pix))) > 0.85) {
            n++;
          }
        }

        if (n > threshold) {
          gl_FragColor = vec4(1.);
        } else {
          gl_FragColor = vec4(vec3(0.), 1.);
        }
      } else {
        gl_FragColor = sample;
      }
    }`;

  const command = {
    pipeline: ctx.pipeline({
      vert: screenVertexShader,
      frag: videoFragmentShader,
    }),
    attributes: {
      aPosition: ctx.vertexBuffer(positions),
      aTexCoord: ctx.vertexBuffer(texCoords),
    },
    indices: ctx.indexBuffer(faces),
    uniforms: {
      // uVideoTexture: texture,
      uBounds: [0, 0, 1, 1],
      uColorFactor: 0,
    },
    // viewport: [0, 0, 256, 256],
  };

  return function frame() {
    if (app.state.camera.loaded) {
      ctx.submit(command, {
        uniforms: {
          uVideoTexture: app.state.camera.texture,
        },
        // viewport: [0, 0, ctx.gl.canvas.width, ctx.gl.canvas.height],
      });
    }
  };
}
