import { screenVertexShader, glsl } from './shaders';

export default function pressureModule(ctx, app) {
  const {
    state: {
      water: {
        attributes,
        indices,
        parameters: { timestep, density, gridUnit, jacobiIterations },
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

    float gridUnit = 2.0 * uGridUnit;
    vec2 unit = vec2(0., gridUnit);

    void main() {
      float divergence = texture2D(uDivergenceTexture, fract(vTexCoord)).x;

      float pressure = (1./4.) * (
        divergence
        + u(vTexCoord + unit.yx)
        + u(vTexCoord - unit.yx)
        + u(vTexCoord + unit.xy)
        + u(vTexCoord - unit.xy)
      );

      gl_FragColor = vec4(pressure, 0., 0., 1.);
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
      vec2 unit = vec2(0, uGridUnit);

      float right = p(vTexCoord +unit.yx);
      float left = p(vTexCoord -unit.yx);
      float top = p(vTexCoord + unit.xy);
      float bottom = p(vTexCoord - unit.xy);

      vec2 gradient = (vec2(right - left, top - bottom) / 1.0) + 0.0002;

      vec2 uA = texture2D(uVelocityTexture, vTexCoord).xy;

      float uX = uA.x - (uTimeStep/(2.0 * uDensity * uGridUnit)) * gradient.x;
      float uY = uA.y - (uTimeStep/(2.0 * uDensity * uGridUnit)) * gradient.y;

      gl_FragColor = vec4(uX, uY, 0., 1.);
    }`;

  const calculatePressureCmd = {
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
    for (let i = 0; i < jacobiIterations; i++) {
      ctx.submit(calculatePressureCmd, {
        pass: ctx.pass({
          color: [app.state.water.textures.pressure2],
        }),
        uniforms: {
          uPressureTexture: app.state.water.textures.pressure1,
        },
      });
      ctx.submit(calculatePressureCmd, {
        pass: ctx.pass({
          color: [app.state.water.textures.pressure1],
        }),
        uniforms: {
          uPressureTexture: app.state.water.textures.pressure2,
        },
      });
      // swap('pressure1', 'pressure2');
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
