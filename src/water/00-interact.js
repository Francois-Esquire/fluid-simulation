import { glsl } from '../util';

export default function interactionModule(ctx, app) {
  const {
    state: {
      water: {
        attributes,
        indices,
        // constants: { timestep },
        shaders: { screenVertexShader },
        textures: { screen, color },
        swap,
      },
    },
  } = app;

  const interactionFragmentShader = glsl`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vTexCoord;

    uniform bool uDragging;
    uniform vec2 uMouse;
    uniform sampler2D uInputTexture;

    void main() {
      gl_FragColor = texture2D(uInputTexture, fract(vTexCoord));

      if (uDragging) {
        float radius = .1;
        float dist = distance(uMouse, vTexCoord);
        if (dist < radius) gl_FragColor.rgb += (vec3(0.2, 0.4, 0.7) * (1. - dist / radius));
      }
    }`;

  const drawColorInteractionCmd = {
    pass: ctx.pass({
      color: [color],
    }),
    pipeline: ctx.pipeline({
      vert: screenVertexShader,
      frag: interactionFragmentShader,
    }),
    attributes,
    indices,
    uniforms: {
      uMouse: [0, 0],
      uInputTexture: screen,
    },
  };

  return function renderInteractions() {
    const { mx, my, dragging } = app.state;

    ctx.submit(drawColorInteractionCmd, {
      pass: ctx.pass({
        color: [app.state.water.textures.color],
      }),
      uniforms: {
        uDragging: dragging,
        uMouse: [mx, my],
        uInputTexture: app.state.water.textures.screen,
      },
    });
    swap('color', 'screen');
  };
}
