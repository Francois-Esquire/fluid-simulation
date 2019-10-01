import createCube from 'primitive-cube';
import mat4 from 'pex-math/mat4';

import { glsl } from '../util';
import { quad } from '../shapes';

export default function fluidCubeRenderModule(ctx, app) {
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
    uniform mat4 uRotationMatrix;
    uniform vec3 uOrientation;

    varying vec3 vNormal;
    varying vec3 vLighting;

    highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
    highp vec3 directionalLightColor = vec3(1, 1, 1);
    highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));

    void main () {
      // vec3 orientation = vec3(sin(uOrientation.x), cos(uOrientation.y), sin(uOrientation.z));
      gl_Position = uProjectionMatrix * uViewMatrix * uRotationMatrix * vec4(aPosition, 1.0);

      highp vec4 transformedNormal = uNormalMatrix * vec4(aNormal, 1.0);
      highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);

      vLighting = ambientLight + (directionalLightColor * directional);
      vNormal = aNormal;
    }
    `;

  const cubeFragmentShader = glsl`
    precision highp float;
    varying vec3 vNormal;
    varying vec3 vLighting;

    uniform mat4 uProjectionMatrix;
    uniform mat4 uViewMatrix;

    float rand(float n){return fract(sin(n) * 43758.5453123);}
    float mod289(float x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
    vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
    vec4 perm(vec4 x){return mod289(((x * 34.0) + 1.0) * x);}
    float noise(vec3 p){
      vec3 a = floor(p);
      vec3 d = p - a;
      d = d * d * (3.0 - 2.0 * d);

      vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
      vec4 k1 = perm(b.xyxy);
      vec4 k2 = perm(k1.xyxy + b.zzww);

      vec4 c = k2 + a.zzzz;
      vec4 k3 = perm(c);
      vec4 k4 = perm(c + 1.0);

      vec4 o1 = fract(k3 * (1.0 / 41.0));
      vec4 o2 = fract(k4 * (1.0 / 41.0));

      vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
      vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);

      return o4.y * d.y + o4.x * (1.0 - d.y);
    }

    void main () {
      vec4 mat = vec4(rand(0.01)) * uProjectionMatrix * uViewMatrix;

      gl_FragColor.rgb = 1.0 * vLighting * mat.rgb;
      gl_FragColor.a = 0.5;

      vec3 baseWaterValue = fract(vec3(0.2, 0.3, 0.8));
      // gl_FragColor.rgb = baseWaterValue * noise(gl_FragCoord.xyz);
      gl_FragColor.rgb = (gl_FragColor.rgb) * mix(baseWaterValue * sin(gl_FragCoord.xyz / 60.), gl_FragColor.rgb, noise(baseWaterValue) * cos(gl_FragCoord.xyz / 85.));
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

  const uRotationMatrix = mat4.create();
  // mat4.invert(uRotationMatrix, uViewMatrix);
  // mat4.transpose(uRotationMatrix, uRotationMatrix);

  const cube = createCube();

  // commands

  const textureWidth = app.width;
  const textureHeight = app.height;
  const diffuseTexture = ctx.texture2D({
    width: textureWidth,
    height: textureHeight,
    pixelFormat: ctx.PixelFormat.RGBA8,
    encoding: ctx.Encoding.SRGB,
  });

  const { positions, texCoords, faces } = quad;
  const indices = ctx.indexBuffer(faces);
  const attributes = {
    aPosition: ctx.vertexBuffer(positions),
    aTexCoord0: ctx.vertexBuffer(texCoords),
  };

  // final output
  const diffuseCmd = {
    pipeline: ctx.pipeline({
      vert: glsl`
        attribute vec2 aPosition;
        attribute vec2 aTexCoord0;
        varying vec2 vTexCoord;
        void main () {
          gl_Position = vec4(aPosition, 0.0, 1.0);
          vTexCoord =  aTexCoord0;
        }`,
      frag: glsl`
        precision highp float;
        uniform sampler2D uDiffuseTexture;
        uniform vec2 uResolution;
        varying vec2 vTexCoord;
        void main () {
          vec2 pixel = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
          float xPixel = 1.0/uResolution.x;
          float yPixel = 1.0/uResolution.y;

          vec4 rightColor = texture2D(uDiffuseTexture, vec2(pixel.x+xPixel, pixel.y));
          vec4 leftColor = texture2D(uDiffuseTexture, vec2(pixel.x-xPixel, pixel.y));
          vec4 upColor = texture2D(uDiffuseTexture, vec2(pixel.x, pixel.y+yPixel));
          vec4 downColor = texture2D(uDiffuseTexture, vec2(pixel.x, pixel.y-yPixel));

          gl_FragColor = vec4(vec3(0.1), 1.);
          gl_FragColor.rgb +=
            12.0 * 0.016 *
            (
                leftColor.rgb +
                rightColor.rgb +
                downColor.rgb * 3.0 +
                upColor.rgb -
                6.0 * gl_FragColor.rgb
            );
        }`,
    }),
    attributes,
    indices,
    uniforms: {
      uResolution: [app.width, app.height],
      uDiffuseTexture: diffuseTexture,
    },
  };

  const drawCmd = {
    // pass: ctx.pass({
    //   clearColor: [0.1, 0.1, 0.1, 1],
    //   // clearDepth: 1,
    //   // depth: [depthTexture],
    // }),
    pass: ctx.pass({
      color: [diffuseTexture],
      clearColor: [0.1, 0.1, 0.1, 1],
    }),
    pipeline: ctx.pipeline({
      blend: true,
      // depthWrite: true,
      depthTest: true,
      vert: cubeVertexShader,
      frag: cubeFragmentShader,
    }),
    attributes: {
      aPosition: ctx.vertexBuffer(cube.positions),
      aTexCoord: ctx.vertexBuffer(cube.uvs),
      aNormal: ctx.vertexBuffer(cube.normals),
    },
    indices: ctx.indexBuffer(cube.cells),
    uniforms: {
      uProjectionMatrix,
      uViewMatrix,
      uNormalMatrix,
      uRotationMatrix,
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

  console.log(ctx.gl.getContextAttributes());

  return function render() {
    const { press, mx, my, alpha, beta, gamma, time } = app;

    const uOrientation = [alpha, beta, gamma];

    mat4.rotate(uRotationMatrix, 0.03, [0.5, 0.5, 0.5]);

    if (press) {
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
    ctx.submit(diffuseCmd);
  };
}
