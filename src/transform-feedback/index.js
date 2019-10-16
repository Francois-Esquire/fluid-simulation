import { glsl } from '../shaders';

function createShader(gl, type, source) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }

  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }

  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

export default function transformFeedbackModule({ gl }) {
  const vertexShaderSource = glsl`
    #version 300 es

    in vec4 aPos;

    void main() {
      gl_PointSize = 20.;
      gl_Position = vec4(-aPos.x, aPos.yzw);
    }`;
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);

  const fragmentShaderSource = glsl`
    #version 300 es
    precision mediump float;

    out vec4 outColor;

    void main() {
      outColor = vec4(1.);
    }`;
  const fragmentShader = createShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource,
  );

  const program = createProgram(gl, vertexShader, fragmentShader);

  gl.useProgram(program);

  gl.transformFeedbackVaryings(program, ['gl_Position'], gl.SEPARATE_ATTRIBS);

  const aPosLoc = gl.getAttribLocation(program, 'aPos');
  let bufA = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufA);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([0.8, 0, 0, 1]),
    gl.DYNAMIC_COPY,
  );

  let bufB = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufB);
  gl.bufferData(gl.ARRAY_BUFFER, 4 * 4, gl.DYNAMIC_COPY);

  const transformFeedback = gl.createTransformFeedback();
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, transformFeedback);

  return function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, bufA);
    gl.vertexAttribPointer(aPosLoc, 4, gl.FLOAT, gl.FALSE, 0, 0);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, bufB);

    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, 1);
    gl.endTransformFeedback();

    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);

    var t = bufA;
    bufA = bufB;
    bufB = t;
  };
}
