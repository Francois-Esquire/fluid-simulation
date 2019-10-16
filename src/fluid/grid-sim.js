// http://jamie-wong.com/2016/08/05/webgl-fluid-simulation/

import { glsl } from '../util';
import { quad } from '../shapes';

export default function fluidSimulationModule(ctx, app) {
  const uTimestep = 1.0 / 120.0;
  const uDensity = 1.0;

  const gridHeight = 512;
  const gridWidth = 512;
  // const gridUint = 1 / gridHeight;

  const standardVertexShader = glsl`
    attribute vec2 aPosition;
    attribute vec2 aTexCoord0;
    varying vec2 vTexCoord;
    void main () {
      gl_Position = vec4(aPosition, 0.0, 1.0);
      vTexCoord =  aTexCoord0;
    }`;

  const textureOptions = {
    height: gridHeight,
    width: gridWidth,
    pixelFormat: ctx.PixelFormat.RGBA8,
    encoding: ctx.Encoding.SRGB,
  };
  const textures = {
    uVelocityTexture0: ctx.texture2D(textureOptions),
    uVelocityTexture1: ctx.texture2D(textureOptions),
    uPressureTexture0: ctx.texture2D(textureOptions),
    uPressureTexture1: ctx.texture2D(textureOptions),
    uColorTexture0: ctx.texture2D(textureOptions),
    uColorTexture1: ctx.texture2D(textureOptions),
    uDivergenceTexture: ctx.texture2D(textureOptions),
  };

  const { positions, texCoords, faces } = quad;
  const indices = ctx.indexBuffer(faces);
  const attributes = {
    aPosition: ctx.vertexBuffer(positions),
    aTexCoord0: ctx.vertexBuffer(texCoords),
  };

  // final output

  const drawSimulationCmd = {
    pipeline: ctx.pipeline({
      vert: standardVertexShader,
      frag: glsl`
        precision highp float;
        uniform float uTime;
        uniform vec2 uMouse;
        uniform vec2 uResolution;
        // uniform sampler2D uColorTexture0;
        varying vec2 vTexCoord;
        void main () {
          vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
          vec2 mouse = uMouse * 1.0;

          vec3 color = vec3(0.);

          if (uv.y > 0.5) color = vec3(0.,0., 0.25 + uv.y);
          else color = vec3(1. - abs(uv), 0.);

          if (distance(mouse, uv) < .1) color = vec3(1.);

          uv *= 10.;

          vec2 gv = fract(uv) - .5;

          // color += smoothstep(0.1, -0.1, abs(gv.x + gv.y));

          if (gv.x > 0.48 || gv.y > 0.48) color = vec3(1., 0., 0.);

          gl_FragColor = vec4(color, 1.);
        }`,
    }),
    attributes,
    indices,
    uniforms: {
      uTime: 0,
      uMouse: [0, 0],
      uResolution: [app.width, app.height],
      // uColorTexture0: textures.uColorTexture0,
    },
  };

  // initialize commands - submit immediately

  return function render() {
    const {
      mx,
      my,
      width,
      height,
      state: { time: uTime },
    } = app;

    const uResolution = [width, height];

    // draw output
    ctx.submit(drawSimulationCmd, {
      uniforms: {
        uResolution,
        uMouse: [(width - my) / width, mx / height].reverse(),
        uTime,
      },
    });
  };
}
