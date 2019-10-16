// fxaa stolen from - https://github.com/oframe/ogl/blob/master/examples/post-fxaa.html

import { screenVertexShader, glsl } from './shaders';

export default function renderPostProcessingPass(ctx, app) {
  const {
    state: {
      water: {
        indices,
        attributes,
        textures: { color1, color2 },
        swap,
      },
    },
  } = app;

  const drawPostProcessingFragmentShader = glsl`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vTexCoord;

    uniform vec2 uResolution;
    uniform sampler2D uColorTexture;

    vec4 fxaa(sampler2D tex, vec2 uv, vec2 resolution) {
      vec2 pixel = vec2(1) / resolution;
      vec3 l = vec3(0.299, 0.587, 0.114);
      float lNW = dot(texture2D(tex, uv + vec2(-1, -1) * pixel).rgb, l);
      float lNE = dot(texture2D(tex, uv + vec2( 1, -1) * pixel).rgb, l);
      float lSW = dot(texture2D(tex, uv + vec2(-1,  1) * pixel).rgb, l);
      float lSE = dot(texture2D(tex, uv + vec2( 1,  1) * pixel).rgb, l);
      float lM  = dot(texture2D(tex, uv).rgb, l);
      float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
      float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));

      vec2 dir = vec2(
        -((lNW + lNE) - (lSW + lSE)),
        ((lNW + lSW) - (lNE + lSE))
      );

      float dirReduce = max((lNW + lNE + lSW + lSE) * 0.03125, 0.0078125);
      float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
      dir = min(vec2(8, 8), max(vec2(-8, -8), dir * rcpDirMin)) * pixel;

      vec3 rgbA = 0.5 * (
        texture2D(tex, uv + dir * (1.0 / 3.0 - 0.5)).rgb +
        texture2D(tex, uv + dir * (2.0 / 3.0 - 0.5)).rgb);
      vec3 rgbB = rgbA * 0.5 + 0.25 * (
        texture2D(tex, uv + dir * -0.5).rgb +
        texture2D(tex, uv + dir * 0.5).rgb);
      float lB = dot(rgbB, l);
      return mix(
        vec4(rgbB, 1),
        vec4(rgbA, 1),
        max(sign(lB - lMin), 0.0) * max(sign(lB - lMax), 0.0)
      );
    }

    void main() {
      vec4 aa = fxaa(uColorTexture, vTexCoord, uResolution);
      gl_FragColor = aa;
    }`;

  const drawPostProcessingCmd = {
    pass: ctx.pass({
      color: [color2],
    }),
    pipeline: ctx.pipeline({
      vert: screenVertexShader,
      frag: drawPostProcessingFragmentShader,
    }),
    attributes,
    indices,
    uniforms: {
      uResolution: [app.width, app.height],
      uColorTexture: color1,
    },
  };

  return function postProcessingRenderer() {
    ctx.submit(drawPostProcessingCmd, {
      pass: ctx.pass({
        color: [app.state.water.textures.color2],
      }),
      uniforms: {
        uColorTexture: app.state.water.textures.color1,
      },
    });
    swap('color1', 'color2');
  };
}
