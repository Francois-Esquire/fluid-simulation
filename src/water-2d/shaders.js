import { glsl } from '../shaders';

export { screenVertexShader, screenFragmentShader, glsl } from '../shaders';

export const bilinearSampling = glsl`
  vec4 sampleBilinear(sampler2D field, vec2 uv, float gridSize) {
    vec2 position = clamp(uv * gridSize - 0.5, vec2(0.0), vec2(gridSize - 1.0));
    vec2 cell = floor(position);
    vec2 fraction = fract(position);
    vec2 origin = (cell + 0.5) / gridSize;
    vec2 step = vec2(1.0 / gridSize, 0.0);
    return mix(
      mix(texture2D(field, origin), texture2D(field, origin + step.xy), fraction.x),
      mix(texture2D(field, origin + step.yx), texture2D(field, origin + step.xx), fraction.x),
      fraction.y
    );
  }`;

export const advectionTimeStepFragmentShader = glsl`
  precision highp float;
  precision highp sampler2D;

  varying vec2 vTexCoord;

  uniform float uTimeStep;
  uniform float uGridSize;
  uniform float uDissipation;

  uniform sampler2D uInputTexture;
  uniform sampler2D uSamplingTexture;

  ${bilinearSampling}

  void main() {
    vec2 velocity = texture2D(uSamplingTexture, vTexCoord).xy;
    vec2 pastCoord = vTexCoord - uTimeStep * velocity;
    vec2 advected = sampleBilinear(uInputTexture, pastCoord, uGridSize).xy;
    gl_FragColor = vec4(advected * exp(-uDissipation * uTimeStep), 0.0, 1.0);
  }`;
