import { screenVertexShader, glsl } from './shaders';

export default function renderWaterModule(ctx, app) {
  const {
    state: {
      water: {
        indices,
        attributes,
        textures: { color1, velocity1 },
      },
    },
  } = app;

  const drawToScreenFragmentShader = glsl`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vTexCoord;
    uniform sampler2D uVelocityTexture;

    void main() {
      vec2 velocity = texture2D(uVelocityTexture, vTexCoord).xy;
      vec3 color = vec3(0.2, 0.5, 0.8) - vec3(velocity, length(velocity));

      gl_FragColor = vec4(color, 1.0);
      // gl_FragColor.rgb = normalize(gl_FragColor.rgb);
    }`;

  const drawMilkToScreenFragmentShader = glsl`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vTexCoord;
    uniform sampler2D uVelocityTexture;

    void main() {
      vec2 velocity = texture2D(uVelocityTexture, vTexCoord).xy;
      vec3 color = vec3(1.0) - length(velocity * 2.0 - 1.0) * 0.2;
      gl_FragColor = vec4(color, 1.0);
      // gl_FragColor.rgb += color * 0.25 + 0.25;
    }`;

  const drawGrayScaleToNormalFragmentShader = glsl`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vTexCoord;
    uniform sampler2D uVelocityTexture;

    float texel = 1./1024.0;
    float normalStrength = 5.;
    vec3 gr = vec3(0.299, 0.587, 0.114);

    void main() {
      vec2 velocity = texture2D(uVelocityTexture, vTexCoord).xy;
      vec2 velocityRight = texture2D(uVelocityTexture, vTexCoord + vec2(texel, 0.)).xy;
      vec2 velocityUp = texture2D(uVelocityTexture, vTexCoord + vec2(0., texel)).xy;

      float color = dot(vec3(1.0) - length(velocity * 2. - 1.) * 0.2, gr);
      float colorRight = dot(vec3(1.0) - length(velocityRight * 2. - 1.) * 0.2, gr);
      float colorUp = dot(vec3(1.0) - length(velocityUp * 2. - 1.) * 0.2, gr);

      float deltaRight = colorRight - color;
      float deltaUp = colorUp - color;

      vec3 graynorm = cross(
        vec3(1, 0, deltaRight * normalStrength),
        vec3(0, 1, deltaUp * normalStrength)
      );

      vec3 normal = normalize(graynorm);

      gl_FragColor = vec4(normal, 1.0);
    }`;

  const drawDebugToScreenFragmentShader = glsl`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vTexCoord;
    uniform sampler2D uVelocityTexture;

    void main() {
      vec2 velocity = texture2D(uVelocityTexture, vTexCoord).xy;
      vec3 color = vec3(velocity, 0.0);
      color = normalize(color);
      gl_FragColor = vec4(color, 1.0);
    }`;

  const drawCmd = {
    pass: ctx.pass({
      color: [color1],
    }),
    pipeline: ctx.pipeline({
      vert: screenVertexShader,
      // frag: drawToScreenFragmentShader,
      frag: drawMilkToScreenFragmentShader,
      // frag: drawGrayScaleToNormalFragmentShader,
      // frag: drawDebugToScreenFragmentShader,
    }),
    attributes,
    indices,
    uniforms: {
      uVelocityTexture: velocity1,
    },
  };

  return function waterRenderer() {
    ctx.submit(drawCmd, {
      pass: ctx.pass({
        color: [app.state.water.textures.color1],
      }),
      uniforms: {
        uVelocityTexture: app.state.water.textures.velocity1,
      },
    });
  };
}
