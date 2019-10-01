// http://jamie-wong.com/2016/08/05/webgl-fluid-simulation/

import { glsl } from '../util';
import { quad } from '../shapes';

export default function fluidSimulationModule(ctx, app) {
  const uTimestep = 1.0 / 120.0;
  const uDensity = 1.0;

  const gridHeight = 512;
  const gridWidth = 512;
  const gridUint = 1 / gridHeight;

  const standardVertexShader = glsl`
    attribute vec2 aPosition;
    attribute vec2 aTexCoord0;
    varying vec2 vTexCoord;
    void main () {
      gl_Position = vec4(aPosition, 0.0, 1.0);
      vTexCoord =  aTexCoord0;
    }`;

  const advectFragmentShader = glsl`
    precision highp float;
    uniform float uTimestep;
    uniform vec2 uResolution;
    uniform sampler2D uVelocityTexture0;
    uniform sampler2D uVelocityTexture1;
    varying vec2 vTexCoord;
    void main() {
      vec2 st = gl_FragCoord.xy / uResolution  * 0.5;
      vec2 u = texture2D(uVelocityTexture1, st).xy;

      vec2 pastCoord = fract(vTexCoord - (0.5 * uTimestep * u));
      gl_FragColor = texture2D(uVelocityTexture0, pastCoord);
    }`;

  const divergenceFragmentShader = glsl`
    precision highp float;
    uniform float uTimestep;
    uniform float uDensity;
    uniform float uGridUnit;
    uniform vec2 uResolution;
    uniform sampler2D uVelocityTexture0;
    varying vec2 vTexCoord;
    vec2 u(vec2 coord) {
      return texture2D(uVelocityTexture0, fract(coord)).xy;
    }
    void main() {
      vec2 st = gl_FragCoord.xy / uResolution  * 0.5;

      float divergence = -2.0 * (
        (uGridUnit * uDensity / uGridUnit) +
        u(vTexCoord + vec2(uGridUnit, 0)).x -
        u(vTexCoord - vec2(uGridUnit, 0)).x +
        u(vTexCoord + vec2(0, uGridUnit)).y -
        u(vTexCoord - vec2(0, uGridUnit)).y
      );

      gl_FragColor = vec4(divergence, 0., 0., 1.);
    }`;

  const jacobiFragmentShader = glsl`
    precision highp float;
    uniform float uGridUnit;
    uniform vec2 uResolution;
    uniform sampler2D uPressureTexture0;
    uniform sampler2D uDivergenceTexture;
    varying vec2 vTexCoord;
    vec2 p(vec2 coord) {
      return texture2D(uPressureTexture0, fract(coord)).xy;
    }
    void main() {
      vec2 st = gl_FragCoord.xy / uResolution  * 0.5;

      float divergence = texture2D(uDivergenceTexture, fract(vTexCoord)).x;

      float jacobi = 0.25 * (
        divergence +
        p(vTexCoord + vec2(2.0 * uGridUnit, 0)).x +
        p(vTexCoord - vec2(2.0 * uGridUnit, 0)).x +
        p(vTexCoord + vec2(0, 2.0 * uGridUnit)).x +
        p(vTexCoord - vec2(0, 2.0 * uGridUnit)).x
      );

      gl_FragColor = vec4(jacobi, 0., 0., 1.);
    }`;

  const subtractPressureFragmentShader = glsl`
    precision highp float;
    uniform vec2 uResolution;
    uniform sampler2D uPressureTexture0;
    uniform sampler2D uVelocityTexture0;
    varying vec2 vTexCoord;
    void main() {
      // vec2 coord = gl_FragCoord.xy / uResolution * 0.5;
      // coord = fract(coord);

      vec4 color = texture2D(uVelocityTexture0, vTexCoord);

      gl_FragColor = vec4(color.x, 0., 0., 1.);
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

  function swap(tex1, tex2) {
    const temp = textures[tex1];
    textures[tex1] = textures[tex2];
    textures[tex2] = temp;
  }

  const { positions, texCoords, faces } = quad;
  const indices = ctx.indexBuffer(faces);
  const attributes = {
    aPosition: ctx.vertexBuffer(positions),
    aTexCoord0: ctx.vertexBuffer(texCoords),
  };

  // draw simulation commands

  const advectVelocityField = {
    pass: ctx.pass({
      color: [textures.uVelocityTexture1],
    }),
    pipeline: ctx.pipeline({
      vert: standardVertexShader,
      frag: advectFragmentShader,
    }),
    attributes,
    indices,
    uniforms: {
      uTime: 0,
      uTimestep,
      uResolution: [gridWidth, gridHeight],
      uVelocityTexture0: textures.uVelocityTexture0,
      uVelocityTexture1: textures.uVelocityTexture0,
    },
  };

  const calculateDivergenceCmd = {
    pass: ctx.pass({
      color: [textures.uDivergenceTexture],
    }),
    pipeline: ctx.pipeline({
      vert: standardVertexShader,
      frag: divergenceFragmentShader,
    }),
    attributes,
    indices,
    uniforms: {
      uTimestep,
      uDensity,
      uGridUnit: gridUint,
      uResolution: [gridWidth, gridHeight],
      uVelocityTexture0: textures.uVelocityTexture0,
    },
  };

  const calculateJacobiIterationCmd = {
    pass: ctx.pass({
      color: [textures.uPressureTexture1],
    }),
    pipeline: ctx.pipeline({
      vert: standardVertexShader,
      frag: jacobiFragmentShader,
    }),
    attributes,
    indices,
    uniforms: {
      uResolution: [gridWidth, gridHeight],
      uDivergenceTexture: textures.uDivergenceTexture,
      uPressureTexture0: textures.uPressureTexture0,
      uGridUnit: gridUint,
      uTime: 0,
    },
  };

  const subtractPressureGradientCmd = {
    pass: ctx.pass({
      color: [textures.uVelocityTexture1],
    }),
    pipeline: ctx.pipeline({
      vert: standardVertexShader,
      frag: subtractPressureFragmentShader,
    }),
    attributes,
    indices,
    uniforms: {
      uResolution: [gridWidth, gridHeight],
      uVelocityTexture0: textures.uVelocityTexture0,
      uPressureTexture0: textures.uPressureTexture0,
      uTime: 0,
    },
  };

  // final output

  const drawSimulationCmd = {
    pipeline: ctx.pipeline({
      vert: standardVertexShader,
      frag: glsl`
        precision highp float;
        uniform vec2 uResolution;
        uniform sampler2D uColorTexture0;
        void main () {
          vec2 st = gl_FragCoord.xy / uResolution * 0.5;
          st = fract(st);
          gl_FragColor = texture2D(uColorTexture0, st);
        }`,
    }),
    attributes,
    indices,
    uniforms: {
      uResolution: [app.width, app.height],
      uColorTexture0: textures.uColorTexture0,
    },
  };

  // initialize commands - submit immediately

  /** implementation breakdown
    initialize color field, c
    initialize velocity field, u

    while(true):
        u_a := advect field u through itself
        d := calculate divergence of u_a
        p := calculate pressure based on d, using jacobi iteration
        u := u_a - gradient of p
        c := advect field c through velocity field u
        draw c
        wait a bit
   */

  ctx.submit({
    pass: ctx.pass({
      color: [textures.uColorTexture0],
    }),
    pipeline: ctx.pipeline({
      vert: standardVertexShader,
      frag: glsl`
        precision highp float;
        uniform vec2 uResolution;
        void main () {
          vec2 st = gl_FragCoord.xy / uResolution * 0.5;
          st = fract(st);
          gl_FragColor = vec4(vec3(st, 0.0), 1.0);
        }`,
    }),
    attributes,
    indices,
    uniforms: {
      uResolution: [gridWidth, gridHeight],
    },
  });

  ctx.submit({
    pass: ctx.pass({
      color: [textures.uVelocityTexture0],
    }),
    pipeline: ctx.pipeline({
      vert: standardVertexShader,
      frag: glsl`
        precision highp float;
        uniform vec2 uResolution;
        void main () {
          vec2 st = gl_FragCoord.xy / uResolution * 0.5;
          st = fract(st);
          gl_FragColor = vec4(vec3(sin(st.x), cos(st.y), 0.), 1.);
        }`,
    }),
    attributes,
    indices,
    uniforms: {
      uResolution: [gridWidth, gridHeight],
    },
  });

  return function render() {
    const {
      // mx,
      // my,
      width,
      height,
      state: { time: uTime },
    } = app;

    const uResolution = [width, height];
    // const uMouse = [mx, height - my];

    ctx.submit(advectVelocityField, {
      uniforms: {
        uTime,
      },
    });
    swap('uVelocityTexture0', 'uVelocityTexture1');

    ctx.submit(calculateDivergenceCmd, {
      uniforms: {
        uTime,
      },
    });

    // Calculate the pressure, leaving the result in textures.pressure0
    var JACOBI_ITERATIONS = 10;

    for (var i = 0; i < JACOBI_ITERATIONS; i++) {
      ctx.submit(calculateJacobiIterationCmd, {
        uniforms: {
          uTime,
        },
      });
      swap('uPressureTexture0', 'uPressureTexture1');
    }

    ctx.submit(subtractPressureGradientCmd, {
      uniforms: {
        uTime,
      },
    });
    swap('uVelocityTexture0', 'uVelocityTexture1');

    ctx.submit(advectVelocityField, {
      uniforms: {
        uTime,
        uVelocityTexture0: textures.uColorTexture0,
      },
    });
    swap('uColorTexture0', 'uColorTexture1');

    // draw output
    ctx.submit(drawSimulationCmd, {
      uniforms: {
        uResolution,
      },
    });
  };
}
