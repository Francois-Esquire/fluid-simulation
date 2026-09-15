import { screenVertexShader, glsl } from './shaders';

export default function interactionModule(ctx, app) {
  const { attributes, indices, textures, passFor, swap } = app.state.water;
  let previousMouse = null;

  const fragmentShader = glsl`
    precision highp float;
    varying vec2 vTexCoord;

    uniform sampler2D uInputTexture;
    uniform vec2 uMouse;
    uniform vec2 uPointerDelta;
    uniform vec2 uWind;
    uniform float uAspect;
    uniform float uRadius;
    uniform float uStrength;
    uniform float uDragStrength;
    uniform float uTimeStep;
    uniform bool uDragging;

    void main() {
      vec2 velocity = texture2D(uInputTexture, vTexCoord).xy;
      velocity += uWind * uTimeStep;

      if (uDragging) {
        vec2 offset = (vTexCoord - uMouse) * vec2(uAspect, 1.0);
        float distance = length(offset);
        float falloff = 1.0 - smoothstep(0.0, uRadius, distance);
        vec2 radial = offset / max(distance, 0.00001);
        radial /= vec2(uAspect, 1.0);
        velocity += falloff * (
          radial * uStrength * uTimeStep + uPointerDelta * uDragStrength
        );
      }

      gl_FragColor = vec4(velocity, 0.0, 1.0);
    }`;

  const command = {
    pipeline: ctx.pipeline({ vert: screenVertexShader, frag: fragmentShader }),
    attributes,
    indices,
  };

  return function renderInteractions() {
    const { mx, my, dragging, water } = app.state;
    const { parameters } = water;
    const mouse = [mx, my];
    const delta = dragging && previousMouse
      ? [mx - previousMouse[0], my - previousMouse[1]]
      : [0, 0];
    previousMouse = dragging ? mouse : null;

    ctx.submit(command, {
      pass: passFor(textures.velocity2),
      uniforms: {
        uInputTexture: textures.velocity1,
        uMouse: mouse,
        uPointerDelta: delta,
        uWind: parameters.wind,
        uAspect: app.width / app.height,
        uRadius: parameters.interactionRadius,
        uStrength: parameters.interactionStrength,
        uDragStrength: parameters.dragStrength,
        uTimeStep: parameters.timestep,
        uDragging: dragging,
      },
    });
    swap('velocity1', 'velocity2');
  };
}
