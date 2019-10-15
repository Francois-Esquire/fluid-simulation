import mat4 from 'pex-math/mat4';

import { glsl } from '../util';
import { createPlane } from '../shapes';

export default function terrainMesh(ctx, app) {
  const {
    width,
    height,
    state: {
      terrainGenerator: { terrainMapTexture },
    },
  } = app;

  const uViewMatrix = mat4.lookAt(
    mat4.create(),
    [2, 2, 5],
    [0, 0, 0],
    [0, 1, 0],
  );
  const uProjectionMatrix = mat4.perspective(
    mat4.create(),
    Math.PI / 3,
    width / height,
    0.1,
    1000,
  );

  const uModelMatrix = mat4.create();
  mat4.rotate(uModelMatrix, 90, [1, 0.0, 0.0]);
  // mat4.translate(uModelMatrix, [0, 0, 0.5]);
  // mat4.scale(uModelMatrix, [1, 1, 1]);

  const uNormalMatrix = mat4.create();
  mat4.invert(uNormalMatrix, uViewMatrix);
  mat4.transpose(uNormalMatrix, uNormalMatrix);

  const gridWidth = 256;
  const gridHeight = 256;
  const grid = createPlane(4, 4, gridWidth, gridHeight, { quads: false });

  const depthMapSize = 512;
  const depthMap = ctx.texture2D({
    width: depthMapSize,
    height: depthMapSize,
    pixelFormat: ctx.PixelFormat.Depth,
    encoding: ctx.Encoding.Linear,
    min: ctx.Filter.Linear,
    mag: ctx.Filter.Linear,
  });
  const colorMap = ctx.texture2D({
    width: depthMapSize,
    height: depthMapSize,
    pixelFormat: ctx.PixelFormat.RGBA8,
    encoding: ctx.Encoding.SRGB,
  });

  const depthPassCmd = {
    name: 'depthPass',
    pass: ctx.pass({
      color: [colorMap],
      depth: depthMap,
      clearColor: [1, 0, 0, 1],
      clearDepth: 1,
    }),
  };

  const drawPassCmd = {
    name: 'drawPass',
    pass: ctx.pass({
      clearColor: [0.1, 0.1, 0.1],
      clearDepth: 1,
    }),
  };

  const drawTerrainVertexShader = glsl`
    attribute vec3 aVertex;
    attribute vec3 aNormal;
    attribute vec2 aTexCoord;

    uniform mat4 uViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform mat4 uModelMatrix;
    uniform mat4 uNormalMatrix;

    uniform sampler2D uTerrainMapTexture;

    varying vec2 vTexCoord;
    varying vec4 vNormal;
    varying vec4 vHeightVector;

    void main() {
      mat4 mvpMatrix = uProjectionMatrix * uViewMatrix * uModelMatrix;

      vec4 normal = vec4(aNormal / 2.0 + 0.5, 1.);

      vHeightVector = texture2D(uTerrainMapTexture, aTexCoord);
      vNormal = normalize(uNormalMatrix * normal + length(vHeightVector.xyz));
      vTexCoord = aTexCoord;

      float heightValue = dot(vHeightVector, vNormal);

      gl_Position = mvpMatrix * vec4(aVertex, 1.0);
      // gl_Position.y += length(vHeightVector.xyz);
      gl_Position.y += heightValue;
    }`;

  const drawTerrainFragmentShader = glsl`
    precision highp float;

    uniform bool uApplyColor;
    uniform sampler2D uDepthMapTexture;
    uniform sampler2D uTerrainMapTexture;

    varying vec2 vTexCoord;
    varying vec4 vNormal;
    varying vec4 vHeightVector;

    void main() {
      vec3 color =  mix(vec3(texture2D(uDepthMapTexture, vTexCoord).x), vHeightVector.xyz, 0.5);
      // vec3 color = vec3(texture2D(uDepthMapTexture, vTexCoord).x) - vec3(vTexCoord, 0.0);
      // vec3 color = vec3(gl_FragCoord.z) - 0.5;
      // vec3 color = vHeightVector.xyz + (vNormal.xyz / 2.0);
      // vec3 color = vHeightVector.xyz;
      // vec3 color = vNormal.xyz;

      if (uApplyColor) {
        float waterHeight = 0.95;
        float height = length(color);

        if (height < waterHeight) {
          color += (vec3(0.2, 0.5, 0.8) * 0.59);
          color -= vec3(waterHeight - height);

        }
        else color += vec3(0.1);
      }

      gl_FragColor = vec4(color, 1.0);
    }`;

  const drawTerrainDepthFragmentShader = glsl`
    precision highp float;

    varying vec4 vNormal;

    void main() {
      gl_FragColor = vec4(vNormal.xyz, 1.0);
    }`;

  const drawTerrainDepthCmd = {
    name: 'drawTerrainDepth',
    pipeline: ctx.pipeline({
      depthTest: true,
      vert: drawTerrainVertexShader,
      frag: drawTerrainDepthFragmentShader,
    }),
    attributes: {
      aVertex: ctx.vertexBuffer(grid.positions),
      aTexCoord: ctx.vertexBuffer(grid.uvs),
      aNormal: ctx.vertexBuffer(grid.normals),
    },
    indices: ctx.indexBuffer(grid.cells),
    uniforms: {
      uTime: 0,
      uViewMatrix,
      uProjectionMatrix,
      uModelMatrix,
      uNormalMatrix,
      uTerrainMapTexture: terrainMapTexture,
    },
  };

  const drawTerrainCmd = {
    name: 'drawTerrain',
    pipeline: ctx.pipeline({
      depthTest: true,
      vert: drawTerrainVertexShader,
      frag: drawTerrainFragmentShader,
    }),
    attributes: {
      aVertex: ctx.vertexBuffer(grid.positions),
      aTexCoord: ctx.vertexBuffer(grid.uvs),
      aNormal: ctx.vertexBuffer(grid.normals),
    },
    indices: ctx.indexBuffer(grid.cells),
    uniforms: {
      uTime: 0,
      uViewMatrix,
      uProjectionMatrix,
      uModelMatrix,
      uNormalMatrix,
      uDepthMapTexture: depthMap,
      uTerrainMapTexture: terrainMapTexture,
      uApplyColor: true,
    },
  };

  return function render() {
    ctx.submit(depthPassCmd, () => {
      ctx.submit(drawTerrainDepthCmd, {
        uniforms: {
          uTime: app.state.time,
        },
      });
    });
    ctx.submit(drawPassCmd, () => {
      ctx.submit(drawTerrainCmd, {
        uniforms: {
          uTime: app.state.time,
        },
      });
    });
  };
}
