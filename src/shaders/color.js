import { glsl } from '../util';

export const colorCommonFunctions = glsl`
  vec3 rgb2yuv(vec3 color) {
    mat3 rgb2yuvMatrix = mat3(
      0.2126, 0.7152, 0.0722,
      -0.09991, -0.33609, 0.43600,
      0.615, -0.5586, -0.05639
    );
    return ((color - 0.5) * 2.0) * rgb2yuvMatrix;
  }`;