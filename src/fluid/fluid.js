import createCube from 'primitive-cube';
import mat4 from 'pex-math/mat4';

import { glsl } from '../util';

export default function fluidRenderModule(ctx, app) {
  const { width, height } = app;

  /**
   * FLUID RENDER SIMULATOR
   *
   * problems to break down and build:
   * - device orientation reactive cube
   * - device orientation reactive fluid
   * - renderable water
   * - renderable water based on simulation physics
   * - fluid simulation based on particles
   */

  const cubeVertexShader = glsl`
    attribute vec3 aPosition;
    attribute vec3 aNormal;

    uniform mat4 uProjectionMatrix;
    uniform mat4 uViewMatrix;
    uniform mat4 uNormalMatrix;
    uniform vec3 uOrientation;

    varying vec3 vNormal;
    varying vec3 vLighting;

    highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
    highp vec3 directionalLightColor = vec3(1, 1, 1);
    highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));

    void main () {
      // vec3 orientation = vec3(sin(uOrientation.x), cos(uOrientation.y), sin(uOrientation.z));
      gl_Position = uProjectionMatrix * uViewMatrix * vec4(aPosition, 1.0);

      vNormal = aNormal;

      highp vec4 transformedNormal = uNormalMatrix * vec4(aNormal, 1.0);

      highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
      vLighting = ambientLight + (directionalLightColor * directional);
    }
    `;

  const cubeFragmentShader = glsl`
    precision mediump float;
    varying vec3 vNormal;
    varying vec3 vLighting;
    void main () {
      gl_FragColor.rgb = 1.0 * vLighting;
      gl_FragColor.a = 1.0;
    }
    `;

  const uViewMatrix = mat4.lookAt(
    mat4.create(),
    [2, 2, 5],
    [0, 0, 0],
    [0, 1, 0],
  );
  const uProjectionMatrix = mat4.perspective(
    mat4.create(),
    Math.PI / 4,
    width / height,
    0.1,
    100,
  );
  const uNormalMatrix = mat4.create();
  mat4.invert(uNormalMatrix, uViewMatrix);
  mat4.transpose(uNormalMatrix, uNormalMatrix);

  const cube = createCube();

  // commands

  // create a cube and use as bounding box for experiment
  // consider mass as a variable in the equation for fluid simulation
  // calculate velocity direction in 3d space using .rgb and value as value

  const drawCmd = {
    pass: ctx.pass({
      clearColor: [0.2, 0.2, 0.2, 1],
      clearDepth: 1,
    }),
    pipeline: ctx.pipeline({
      // blend: true,
      depthTest: true,
      vert: cubeVertexShader,
      frag: cubeFragmentShader,
    }),
    attributes: {
      aPosition: ctx.vertexBuffer(cube.positions),
      aNormal: ctx.vertexBuffer(cube.normals),
    },
    indices: ctx.indexBuffer(cube.cells),
    uniforms: {
      uProjectionMatrix,
      uViewMatrix,
      uNormalMatrix,
      uOrientation: [0, 0, 0],
    },
  };

  const clearCmd = {
    pass: ctx.pass({
      clearColor: [0, 0, 0, 1],
      clearDepth: 1,
    }),
  };

  let ix = 0;
  let iy = 0;
  let init = false;
  let pressing = false;
  let dx = 0;
  let dy = 0;

  return function render() {
    const {
      mx,
      my,
      state: { dragging, alpha, beta, gamma },
    } = app;

    const uOrientation = [alpha, beta, gamma];

    if (dragging) {
      if (pressing === false) {
        pressing = true;

        if (init === false) {
          init = true;

          ix = mx;
          iy = my;
        }
      }
    } else if (pressing === true) {
      pressing = false;
    }

    ctx.submit(clearCmd);
    ctx.submit(drawCmd, {
      uniforms: {
        uOrientation,
      },
    });
  };
}
