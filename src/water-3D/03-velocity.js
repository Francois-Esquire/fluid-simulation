import { screenVertexShader, glsl } from '../shaders';

export default function velocityModule(ctx, app) {
  const {
    state: {
      water3D: { attributes, indices, parameters, textures, swap },
    },
  } = app;

  const velocityFragmentShader = glsl`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vTexCoord;

    uniform sampler2D uVelocityTexture;

    void main() {
      vec2 uv = 2. * (vTexCoord) - 1.;

      vec3 velocity = texture2D(uVelocityTexture, vTexCoord).xyz * uv.x;
      vec2 xy = 0.5 * uv - 0.5;

      gl_FragColor = vec4(xy, 1. - xy.x - xy.y, 1.0);
    }`;

  const drawVelocityCmd = {
    pass: ctx.pass({
      color: [textures.velocity2],
    }),
    pipeline: ctx.pipeline({
      vert: screenVertexShader,
      frag: velocityFragmentShader,
    }),
    attributes,
    indices,
    uniforms: {
      uTimeStep: parameters.timestep,
      uVelocityTexture: textures.velocity1,
    },
  };

  return function renderVelocity() {
    ctx.submit(drawVelocityCmd, {
      pass: ctx.pass({
        color: [textures.velocity2],
      }),
      uniforms: {
        uVelocityTexture: textures.velocity1,
      },
    });
    swap('velocity1', 'velocity2');
  };
}
