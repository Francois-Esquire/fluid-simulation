import { screenVertexShader, glsl } from '../shaders';
import { quad } from '../shapes';

export default function scaleSpaceKeypointDetection(ctx, app) {
  const sskdFragmentShader = glsl`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vTexCoord;

    vec4 bilinearFilter(sampler2D target, vec2 coord, float step, float resolution) {
      vec2 unit = vec2(0., step);

      // [[0,0], [0,1], [1,0], [1,1]]

      vec2 coord1 = coord + unit.xy;
      vec2 coord2 = coord + unit.yx;
      vec2 coord3 = coord + unit.yy;
      vec2 coord4 = coord;

      vec4 s1 = texture2D(target, coord1);
      vec4 s2 = texture2D(target, coord2);
      vec4 s3 = texture2D(target, coord3);
      vec4 s4 = texture2D(target, coord4);

      vec2 Dimensions = coord * resolution;

      float fu = fract(Dimensions.x);
      float fv = fract(Dimensions.y);

      vec4 tmp1 = mix(s4, s2, fu);
      vec4 tmp2 = mix(s1, s3, fu);

      return mix(tmp1, tmp2, fv);
    }

    vec4 downsample(sampler2D target, vec2 coord, float factor) {

    }

    vec4 octaveSampler(sampler2D target, vec2 coord, int octave) {}


    void main() {
      gl_FragColor = vec4(1.0);
    }`;

  const { positions, texCoords, faces } = quad;
  const sskdCmd = {
    pipeline: ctx.pipeline({
      vert: screenVertexShader,
      frag: sskdFragmentShader,
    }),
    attributes: {
      aPosition: ctx.vertexBuffer(positions),
      aTexCoord: ctx.vertexBuffer(texCoords),
    },
    indices: ctx.indexBuffer(faces),
    uniforms: {
      uVideoTexture: app.state.camera.textures.process1,
      uColorFactor: 0,
    },
  };

  return function renderSSKD() {
    ctx.submit(sskdCmd);
  };
}
