import { glsl } from '../util';

export const screenImageVertexShader = glsl`
  attribute vec2 aPosition;
  attribute vec2 aTexCoord0;

  varying vec2 vTexCoord0;

  void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    vTexCoord0 = aTexCoord0;
  }`;

export const screenImageFragmentShader = glsl`
  precision highp float;

  varying vec2 vTexCoord0;

  uniform sampler2D uTexture;

  void main() {
    gl_FragColor = texture2D(uTexture, vTexCoord0);
  }`;
