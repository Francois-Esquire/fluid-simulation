import mat4 from 'pex-math/mat4';

import { glsl } from '../shaders';

export default function visualizeToScreenModule(ctx, app) {
  const {
    state: {
      water3D: { parameters, textures },
    },
  } = app;

  const uViewMatrix = mat4.lookAt(
    mat4.create(),
    [2, 1, 4],
    [0, 0, 0],
    [0, 1, 0],
  );
  const uProjectionMatrix = mat4.perspective(
    mat4.create(),
    Math.PI / 4,
    app.width / app.height,
    0.1,
    1000,
  );

  const uModelMatrix = mat4.create();
  // mat4.rotate(uModelMatrix, 90, [1, 0.0, 0.0]);
  // mat4.translate(uModelMatrix, [0, 0, 0.5]);
  // mat4.scale(uModelMatrix, [0.3, 0.3, 0.3]);

  // const _numParticles = 100 * 100;
  const _numParticles = parameters.gridSize * parameters.gridSize;
  const particleIndices = new Float32Array(_numParticles);
  for (let i = 0; i < _numParticles; i++) particleIndices[i] = i;

  const particleVertexBuffer = ctx.vertexBuffer({
    data: particleIndices,
  });

  // TODO: move all particles

  const drawParticlesToScreenVertexShader = glsl`
    precision highp float;
    precision highp sampler2D;

    attribute float aIndex;

    uniform mat4 uViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform mat4 uModelMatrix;
    uniform float uGridSize;
    uniform sampler2D uParticlesTexture;

    varying vec2 vTexCoord;
    varying vec3 vColor;

    void main() {
      float i = fract(aIndex / uGridSize);
      float j = floor(aIndex / uGridSize) / uGridSize;
      vec2 uv = vec2(i, j);

      vec4 position = texture2D(uParticlesTexture, uv) + vec4(0.625, 0.125, 1.5, 0.0);

      vColor = position.xyz;
      vTexCoord = uv;

      mat4 mvpMatrix = uProjectionMatrix * uViewMatrix * uModelMatrix;

      gl_Position = mvpMatrix * vec4(position.xyz, 1.0);
    }`;

  const drawParticlesToScreenFragmentShader = glsl`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vTexCoord;
    varying vec3 vColor;

    void main() {
      // gl_FragColor = vec4(vec3(1.0), 1.0);
      // gl_FragColor = vec4(normalize(vTexCoord.yxy), 1.0);
      gl_FragColor = vec4(vTexCoord, 0.0, 1.0);
      // gl_FragColor = vec4(vColor * 0.5 + 0.5, 1.0);
    }`;

  const drawVisualizationCmd = {
    pass: ctx.pass({
      color: [textures.screen],
    }),
    pipeline: ctx.pipeline({
      vert: drawParticlesToScreenVertexShader,
      frag: drawParticlesToScreenFragmentShader,
      primitive: ctx.Primitive.Points,
    }),
    attributes: {
      aIndex: particleVertexBuffer,
    },
    count: particleVertexBuffer.length,
    uniforms: {
      uTime: 0,
      uViewMatrix,
      uProjectionMatrix,
      uModelMatrix,
      uGridSize: parameters.gridSize,
      uParticlesTexture: textures.particle1,
    },
  };

  return function waterRenderer() {
    ctx.submit(drawVisualizationCmd, {
      pass: ctx.pass({
        color: [textures.screen],
        clearColor: [0, 0, 0, 1],
      }),
      uniforms: {
        uTime: app.state.time,
        uParticlesTexture: textures.particle1,
      },
    });
  };
}
