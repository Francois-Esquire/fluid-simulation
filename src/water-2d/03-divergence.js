import { screenVertexShader, glsl } from './shaders';

export default function divergenceModule(ctx, app) {
  const {
    state: {
      water: {
        indices,
        attributes,
        parameters: { timestep, density, gridUnit },
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
      vec2 unit = vec2(0.0, uGridUnit);
      float dx = u( vTexCoord + unit.yx ).x - u( vTexCoord - unit.yx ).x;
      float dy = u( vTexCoord + unit.xy ).y - u( vTexCoord - unit.xy ).y;
      float divergence = ( -2.0 * uGridUnit * uDensity / uTimeStep ) * ( dx + dy );

      gl_FragColor = vec4(divergence, 0., 0., 0.);
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
