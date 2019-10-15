import { glsl } from '../util';

export const screenVertexShader = glsl`
    attribute vec2 aPosition;
    attribute vec2 aTexCoord;

    varying vec2 vTexCoord;

    void main() {
      vTexCoord = aTexCoord;

      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

export const screenFragmentShader = glsl`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vTexCoord;

    uniform sampler2D uTexture;

    void main() {
      gl_FragColor = texture2D(uTexture, vTexCoord);
    }
  `;
