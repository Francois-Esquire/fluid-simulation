import { screenVertexShader, glsl } from './shaders';

export default function interactionModule(ctx, app) {
  const {
    state: {
      water: {
        attributes,
        indices,
        parameters: { timestep },
        textures: { velocity1, velocity2 },
        swap,
      },
    },
  } = app;

  const interactionFragmentShader = glsl`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vTexCoord;

    uniform bool uDragging;
    uniform float uTimeStep;
    uniform vec2 uMouse;
    uniform sampler2D uInputTexture;

    void main() {
      gl_FragColor = texture2D(uInputTexture, fract(vTexCoord));

      if (uDragging) {
        float radius = .1;
        float dist = distance(uMouse, vTexCoord);
        if (dist < radius) gl_FragColor.rgb += (vec3(0.25) * (1. - dist / radius));
      }
    }`;

  const drawColorInteractionCmd = {
    pass: ctx.pass({
      color: [velocity2],
    }),
    pipeline: ctx.pipeline({
      vert: screenVertexShader,
      frag: interactionFragmentShader,
    }),
    attributes,
    indices,
    uniforms: {
      uMouse: [0, 0],
      uTimeStep: timestep,
      uInputTexture: velocity1,
    },
  };

  return function renderInteractions() {
    const { mx, my, dragging, water } = app.state;

    ctx.submit(drawColorInteractionCmd, {
      pass: ctx.pass({
        color: [water.textures.velocity2],
      }),
      uniforms: {
        uDragging: dragging,
        uMouse: [mx, my],
        uInputTexture: water.textures.velocity1,
      },
    });
    swap('velocity1', 'velocity2');
  };
}
