import { glsl } from '../util';
import { quad } from '../shapes';

import drawingModule from './00-draw';
import drawTrianglesModule from './00-triangles';
import drawNoiseModule from './00-noise';
import drawInteractionsModule from './00-interact';

import drawScreenModule from './01-screen';
import drawVelocityModule from './02-velocity';
import drawDivergenceModule from './03-divergence';
import drawPressureModule from './04-pressure';
import drawColorModule from './05-color';

export default function waterModule(ctx, app) {
  const gridSize = 2048;

  const constants = {
    gridSize,
    timestep: 1 / 120.0,
    density: 1.0,
    gridUnit: 1 / gridSize,
    jacobi: 10,
  };

  // initialize textures

  const screenTextureOptions = {
    height: app.height,
    width: app.width,
    pixelFormat: ctx.PixelFormat.RGBA8,
    encoding: ctx.Encoding.SRGB,
  };

  const simulationTextureOptions = {
    height: gridSize,
    width: gridSize,
    pixelFormat: ctx.PixelFormat.RGBA8,
    encoding: ctx.Encoding.SRGB,
  };

  const textures = {
    screen: ctx.texture2D(screenTextureOptions),
    color: ctx.texture2D(simulationTextureOptions),
    velocity1: ctx.texture2D(simulationTextureOptions),
    velocity2: ctx.texture2D(simulationTextureOptions),
    divergence: ctx.texture2D(simulationTextureOptions),
    pressure1: ctx.texture2D(simulationTextureOptions),
    pressure2: ctx.texture2D(simulationTextureOptions),
  };

  // swap textures helper

  function swap(texture1, texture2) {
    const temp = textures[texture1];
    textures[texture1] = textures[texture2];
    textures[texture2] = temp;
  }

  // drawing surface

  const { positions, texCoords, faces } = quad;

  const indices = ctx.indexBuffer(faces);
  const attributes = {
    aPosition: ctx.vertexBuffer(positions),
    aTexCoord: ctx.vertexBuffer(texCoords),
  };

  // common shaders

  const screenVertexShader = glsl`
    attribute vec2 aPosition;
    attribute vec2 aTexCoord;

    varying vec2 vTexCoord;

    void main() {
      vTexCoord = aTexCoord;

      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const screenFragmentShader = glsl`
    precision highp float;
    precision highp sampler2D;

    varying vec2 vTexCoord;

    uniform sampler2D uTexture;

    void main() {
      gl_FragColor = texture2D(uTexture, vTexCoord);
    }
  `;

  const shaders = {
    screenVertexShader,
    screenFragmentShader,
  };

  // set initial water state for modules

  app.state.water = {
    constants,
    indices,
    attributes,
    quad,
    shaders,
    textures,
    swap,
  };

  return [
    drawScreenModule,
    drawNoiseModule,
    drawVelocityModule,
    drawDivergenceModule,
    drawPressureModule,
    drawColorModule,
    drawingModule,
    // drawTrianglesModule,
    drawInteractionsModule,
  ];
}
