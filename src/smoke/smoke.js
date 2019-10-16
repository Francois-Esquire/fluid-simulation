// https://gamedevelopment.tutsplus.com/tutorials/how-to-write-a-smoke-shader--cms-25587

import { quad } from '../shapes';

import { screenImageVertexShader, screenImageFragmentShader, glsl } from '../shaders';

const smokeSourceVertexShader = glsl`
  attribute vec2 aPosition;

  void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }`;

const smokeSourceFragmentShader = glsl`
  precision highp float;

  uniform vec2 uMouse;
  uniform vec2 uResolution;
  uniform sampler2D uScreenTexture;

  vec4 advect(sampler2D map, vec2 center) {
    return vec4(0.);
  }

  void main() {
    vec2 pixel = gl_FragCoord.xy / uResolution.xy;

    // grab the current pixel
    gl_FragColor = texture2D( uScreenTexture, pixel );

    float dist = distance(uMouse.xy, gl_FragCoord.xy);

    float radius = 20.;
    if (dist < radius) {
      float factor = 1. - (dist / radius);
      float base = 0.05 * (factor * 4.);
      gl_FragColor.rgb += base;
    } else {
      // simulate smoke going up
      float xPixel = 1.0/uResolution.x;
      float yPixel = 1.0/uResolution.y;

      vec4 rightColor = texture2D(uScreenTexture, vec2(pixel.x+xPixel, pixel.y));
      vec4 leftColor = texture2D(uScreenTexture, vec2(pixel.x-xPixel, pixel.y));
      vec4 upColor = texture2D(uScreenTexture, vec2(pixel.x, pixel.y+yPixel));
      vec4 downColor = texture2D(uScreenTexture, vec2(pixel.x, pixel.y-yPixel));

      // diffusion
      gl_FragColor.rgb +=
        8.0 * 0.016 *
        (
            leftColor.rgb +
            rightColor.rgb +
            downColor.rgb * 3.0 +
            upColor.rgb -
            6.0 * gl_FragColor.rgb
        );
      // gl_FragColor.rgb +=
      //   12.0 * 0.016 *
      //   (
      //       leftColor.rgb +
      //       rightColor.rgb +
      //       downColor.rgb * 3.0 +
      //       upColor.rgb -
      //       4.0 * gl_FragColor.rgb
      //   );
    }

    gl_FragColor.a = 1.0;
  }`;

export default function smoke(ctx, app) {
  const { positions, texCoords, faces } = quad;

  const screenMap = ctx.texture2D({
    height: app.height,
    width: app.width,
    pixelFormat: ctx.PixelFormat.RGBA8,
    encoding: ctx.Encoding.SRGB,
    flipY: true,
  });
  const smokeMap = ctx.texture2D({
    height: app.height,
    width: app.width,
    pixelFormat: ctx.PixelFormat.RGBA8,
    encoding: ctx.Encoding.SRGB,
    flipY: true,
  });

  const drawSmoke = {
    pass: ctx.pass({
      color: [smokeMap],
    }),
    pipeline: ctx.pipeline({
      vert: smokeSourceVertexShader,
      frag: smokeSourceFragmentShader,
    }),
    attributes: {
      aPosition: ctx.vertexBuffer(positions),
    },
    indices: ctx.indexBuffer(faces),
    uniforms: {
      uScreenTexture: screenMap,
      uResolution: [app.width, app.height],
      uMouse: [0, 0],
    },
  };

  const drawTexture = {
    name: 'drawTexture',
    pass: ctx.pass({
      color: [screenMap],
    }),
    pipeline: ctx.pipeline({
      vert: screenImageVertexShader,
      frag: screenImageFragmentShader,
    }),
    attributes: {
      aPosition: ctx.vertexBuffer(positions),
      aTexCoord0: ctx.vertexBuffer(texCoords),
    },
    indices: ctx.indexBuffer(faces),
    uniforms: {
      uTexture: smokeMap,
      uResolution: [app.width, app.height],
    },
  };

  const drawScreen = {
    name: 'drawTexture',
    pipeline: ctx.pipeline({
      vert: screenImageVertexShader,
      frag: screenImageFragmentShader,
    }),
    attributes: {
      aPosition: ctx.vertexBuffer(positions),
      aTexCoord0: ctx.vertexBuffer(texCoords),
    },
    indices: ctx.indexBuffer(faces),
    uniforms: {
      uTexture: screenMap,
      uResolution: [app.width, app.height],
    },
  };

  return function renderSmoke() {
    const { state: {mx, my}, width, height } = app;

    const uResolution = [width, height];
    const uMouse = [mx, my];

    ctx.submit(drawSmoke, {
      uniforms: {
        uResolution,
        uMouse,
      },
    });
    ctx.submit(drawTexture, {
      uniforms: {
        uResolution,
      },
    });
    ctx.submit(drawScreen);
  };
}
