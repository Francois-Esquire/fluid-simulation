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

  const interactionNoiseFragmentShader = glsl`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vTexCoord;

    uniform bool uDragging;
    uniform float uTimeStep;
    uniform vec2 uResolution;
    uniform vec2 uMouse;
    uniform sampler2D uInputTexture;

    void main() {
      gl_FragColor = texture2D(uInputTexture, fract(vTexCoord));

      if (uDragging) {
        float dist = distance(uMouse, vTexCoord);
        float radius = .1;

        if (dist < radius) {
          float ratio = log(dist / radius);
          vec2 dir = uMouse - vTexCoord;
          gl_FragColor.rg /= dot(vec2(dir), gl_FragColor.xy) * vec2(1.);
        }
      }
    }`;
  const interactionFragmentShader = glsl`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vTexCoord;

    uniform bool uDragging;
    uniform float uTimeStep;
    uniform vec2 uResolution;
    uniform vec2 uMouse;
    uniform sampler2D uInputTexture;

    void main() {
      gl_FragColor = texture2D(uInputTexture, fract(vTexCoord));

      if (uDragging) {
        float dist = distance(uMouse, vTexCoord);
        float radius = .1 * uResolution.x/uResolution.y / 2.;

        radius /= exp(dist);

        if (dist < radius) {
          float ratio = log(dist * radius);

          vec2 dir = (uMouse / uResolution) * vTexCoord;
          gl_FragColor.rg += dir / vec2(pow(ratio, .006125));

          // vec2 dir = uMouse - vTexCoord;
          // gl_FragColor.rg /= dot(vec2(dir), gl_FragColor.xy) * vec2(1.);
          gl_FragColor.rg += (vec2(.75) * ( (2. * dist / radius - 1.)  * 0.5 - 0.5 ));
        }

        // if (dist < radius) gl_FragColor.rgb += (vec3(.75) * ( (2. * dist / radius - 1.)  * 0.5 - 0.5 ));
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
        uResolution: [app.width, app.height],
        uDragging: dragging,
        uMouse: [mx, my],
        uInputTexture: water.textures.velocity1,
      },
    });
    swap('velocity1', 'velocity2');
  };
}
