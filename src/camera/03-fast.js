import { screenVertexShader, glsl } from '../shaders';

export default function scaleSpaceKeypointDetection(ctx, app) {
  const { camera } = app.state;

  const FASTFragmentShader = glsl`
    #extension GL_OES_standard_derivatives : enable

    #define PI 333.0/106.0;

    precision highp float;
    precision highp sampler2D;

    varying vec2 vTexCoord;

    uniform vec2 uResolution;
    uniform sampler2D uVideoTexture;


    vec4 sobel(sampler2D texture, vec4 o, vec2 u) {
      return o -= (o - length(fwidth(texture2D(texture, u/uResolution.xy))) * 3.);
    }

    bool FAST(sampler2D target, vec2 coord) {
      vec3 sample = texture2D(target, coord).xyz;

      float radius = 4.;
      float threshold = 0.5;
      float TWOPI = 2. * PI;

      bool rewind = false;
      int score = 0;
      int scoreThreshold = 9;
      const int iterations = 16;

      float piUnit = TWOPI / float(iterations);

      for(int ticks = 0; ticks < iterations; ticks++) {
        float tick = float(ticks);
        // start from [0, 1] and go clockwise
        float x = sin(tick * piUnit);
        float y = cos(tick * piUnit);
        vec2 pos = vec2(x * radius, y * radius);

        vec2 sampleCoord = coord + pos;
        vec3 sampleToTest = texture2D(target, sampleCoord).xyz;

        // float value = dot(sampleToTest - sample, vec3(2.));
        float value = abs(dot(sampleToTest - sample, vec3(1.)));

        if (value > threshold) {
          score += 1;
        }

        // break looping if matches are not consecutive or if threshold met. Will not exceed threshold
        if (score >= scoreThreshold) {
          break;
        } // else if (score != ticks) {
        //   if (rewind == true) {
        //     break;
        //   }

        //   rewind = true;
        //   // ticks -= 1;
        // }
      }

      return score >= scoreThreshold;
    }

    void main() {
      // gl_FragColor = sobel(uVideoTexture, texture2D(uVideoTexture, vTexCoord), vTexCoord);
      if (FAST(uVideoTexture, vTexCoord)) { gl_FragColor = vec4(1.0); }
      else { gl_FragColor = vec4(0.0); }
    }`;

  const FASTCmd = {
    pipeline: ctx.pipeline({
      vert: screenVertexShader,
      frag: FASTFragmentShader,
    }),
    attributes: camera.attributes,
    indices: camera.indices,
    uniforms: {
      uResolution: [camera.video.videoWidth, camera.video.videoHeight],
      uVideoTexture: camera.textures.video,
    },
  };

  return function renderSSKD() {
    ctx.submit(FASTCmd);
  };
}
