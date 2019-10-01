import { glsl } from '../util';

export default function pressureModule(ctx, app) {
  const {
    state: {
      water: {
        constants: { timestep, density, gridUnit, jacobi },
        attributes,
        indices,
        shaders: { screenVertexShader },
        textures: { pressure1, pressure2, velocity1, velocity2, divergence },
        swap,
      },
    },
  } = app;

  const pressureFragmentShader = glsl`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vTexCoord;

    uniform float uGridUnit;
    uniform sampler2D uDivergenceTexture;
    uniform sampler2D uPressureTexture;

    float u(vec2 coords) {
      return texture2D(uPressureTexture, fract(coords)).x;
    }

    void main() {
      float divergence = texture2D(uDivergenceTexture, fract(vTexCoord)).x;

      float p = 0.25 * (
        divergence
        + u(vTexCoord + vec2(2.0 * uGridUnit, 0))
        + u(vTexCoord - vec2(2.0 * uGridUnit, 0))
        + u(vTexCoord + vec2(0, 2.0 * uGridUnit))
        + u(vTexCoord - vec2(0, 2.0 * uGridUnit))
      );

      gl_FragColor = vec4(p, 0., 0., 1.);
    }`;

  const subtractPressureFragmentShader = glsl`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vTexCoord;

    uniform float uTimeStep;
    uniform float uDensity;
    uniform float uGridUnit;
    uniform sampler2D uVelocityTexture;
    uniform sampler2D uPressureTexture;

    float p(vec2 coord) {
      return texture2D(uPressureTexture, fract(coord)).x;
    }

    void main() {
      vec2 uA = texture2D(uVelocityTexture, vTexCoord).xy;

      float pX = p(vTexCoord + vec2(uGridUnit, 0)) - p(vTexCoord - vec2(uGridUnit, 0));
      float pY = p(vTexCoord + vec2(0, uGridUnit)) - p(vTexCoord - vec2(0, uGridUnit));

      float uX = uA.x - uTimeStep/(2.0 * uDensity * uGridUnit) * pX;
      float uY = uA.y - uTimeStep/(2.0 * uDensity * uGridUnit) * pY;

      gl_FragColor = vec4(uX, uY, 0., 1.);
    }`;

  const drawPressureCmd = {
    pass: ctx.pass({
      color: [pressure1],
    }),
    pipeline: ctx.pipeline({
      vert: screenVertexShader,
      frag: pressureFragmentShader,
    }),
    attributes,
    indices,
    uniforms: {
      uTimeStep: timestep,
      uDensity: density,
      uGridUnit: gridUnit,
      uDivergenceTexture: divergence,
      uPressureTexture: pressure2,
    },
  };

  const subtractPressureCmd = {
    pass: ctx.pass({
      color: [velocity2],
    }),
    pipeline: ctx.pipeline({
      vert: screenVertexShader,
      frag: subtractPressureFragmentShader,
    }),
    attributes,
    indices,
    uniforms: {
      uTimeStep: timestep,
      uDensity: density,
      uGridUnit: gridUnit,
      uVelocityTexture: velocity1,
      uPressureTexture: pressure1,
    },
  };

  return function renderPressure() {
    for (let i = 0; i < jacobi; i++) {
      ctx.submit(drawPressureCmd, {
        pass: ctx.pass({
          color: [app.state.water.textures.pressure2],
        }),
        uniforms: {
          uDivergenceTexture: app.state.water.textures.divergence,
          uPressureTexture: app.state.water.textures.pressure1,
        },
      });
      swap('pressure1', 'pressure2');
    }

    ctx.submit(subtractPressureCmd, {
      pass: ctx.pass({
        color: [app.state.water.textures.velocity2],
      }),
      uniforms: {
        uVelocityTexture: app.state.water.textures.velocity1,
        uPressureTexture: app.state.water.textures.pressure1,
      },
    });
    swap('velocity1', 'velocity2');
  };
}
