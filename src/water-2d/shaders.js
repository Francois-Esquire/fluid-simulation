import { glsl } from '../shaders';

export { screenVertexShader, screenFragmentShader, glsl } from '../shaders';

export const advectionTimeStepFragmentShader = glsl`
  precision highp float;
  precision highp sampler2D;

  varying vec2 vTexCoord;

  uniform float uTimeStep;
  uniform sampler2D uInputTexture;
  uniform sampler2D uSamplingTexture;

  void main() {
    vec2 u = texture2D(uSamplingTexture, fract(vTexCoord)).xy;
    vec2 pastCoord = fract(vTexCoord - (0.5 * uTimeStep * u));
    gl_FragColor = texture2D(uInputTexture, pastCoord);
  }`;
