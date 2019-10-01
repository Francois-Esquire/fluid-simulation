import { glsl } from '../util';

export default function divergenceModule(ctx, app) {
  const {
    state: {
      water: {
        indices,
        attributes,
        constants: { timestep, density, gridUnit },
        shaders: { screenVertexShader },
        textures: { velocity1, divergence },
      },
    },
  } = app;

  const divergenceFragmentShader = glsl`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vTexCoord;

    uniform float uTimeStep;
    uniform float uDensity;
    uniform float uGridUnit;

    uniform sampler2D uVelocityTexture;

    vec2 u(vec2 coord) {
      return texture2D(uVelocityTexture, fract(coord)).xy;
    }

    void main() {
      float dx = u(vTexCoord + vec2(uGridUnit, 0)).x - u(vTexCoord - vec2(uGridUnit, 0)).x;
      float dy = u(vTexCoord + vec2(0, uGridUnit)).y - u(vTexCoord - vec2(0, uGridUnit)).y;
      float d = ( -2.0 * uGridUnit * uDensity / uTimeStep ) * ( dx + dy );

      gl_FragColor = vec4(d, 0., 0., 1.);
    }`;

  const drawDivergenceCmd = {
    pass: ctx.pass({
      color: [divergence],
    }),
    pipeline: ctx.pipeline({
      vert: screenVertexShader,
      frag: divergenceFragmentShader,
    }),
    attributes,
    indices,
    uniforms: {
      uTimeStep: timestep,
      uDensity: density,
      uGridUnit: gridUnit,
      uVelocityTexture: velocity1,
    },
  };

  return function renderDivergence() {
    ctx.submit(drawDivergenceCmd, {
      uniforms: {
        uVelocityTexture: app.state.water.textures.velocity1,
      },
    });
  };
}
