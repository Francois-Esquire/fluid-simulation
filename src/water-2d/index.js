import { quad } from '../shapes';
import { water2DConfig } from './config';

import renderPass from './01-render';
import drawVelocityPass from './02-velocity';
import drawDivergencePass from './03-divergence';
import drawPressurePass from './04-pressure';
import drawColorPass from './05-color';
import drawPostProcessingPass from './06-post';

import drawInteractionsPass from './00-interact';

export default function water2D(ctx, app) {
  const resolution = water2DConfig.gridSize;
  const parameters = {
    gridSize: resolution,
    gridUnit: 1 / resolution,
    timestep: 1 / 120.0,
    // quality
    density: 1.0,
    ...water2DConfig,
    wind: [...water2DConfig.wind],
    baseColor: [...water2DConfig.baseColor],
    highlightColor: [...water2DConfig.highlightColor],
  };

  // drawing surface

  const { positions, texCoords, faces } = quad;
  const indices = ctx.indexBuffer(faces);
  const attributes = {
    aPosition: ctx.vertexBuffer(positions),
    aTexCoord: ctx.vertexBuffer(texCoords),
  };

  // initialize textures

  const screenTextureOptions = {
    height: app.height,
    width: app.width,
    pixelFormat: ctx.PixelFormat.RGBA8,
    encoding: ctx.Encoding.SRGB,
    min: ctx.Filter.Linear,
    mag: ctx.Filter.Linear,
  };

  const simulationTextureOptions = {
    height: parameters.gridSize,
    width: parameters.gridSize,
    pixelFormat: ctx.PixelFormat.RGBA8,
    encoding: ctx.Encoding.SRGB,
  };

  // get extensions
  const [textureFloat] = ['OES_texture_float'].map(extName => {
    const ext = ctx.gl.getExtension(extName);
    if (!ext) {
      console.warn(`${extName} is not supported`);
      return false;
    }
    return true;
  });

  if (textureFloat) {
    simulationTextureOptions.pixelFormat = ctx.PixelFormat.RGBA32F;
  }

  const textures = {
    // display
    color1: ctx.texture2D(screenTextureOptions),
    color2: ctx.texture2D(screenTextureOptions),
    // simulation
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
  const passes = new Map();
  function passFor(texture) {
    if (!passes.has(texture)) passes.set(texture, ctx.pass({ color: [texture] }));
    return passes.get(texture);
  }

  // set initial water state for modules

  app.state.water = {
    indices,
    attributes,
    parameters,
    textures,
    swap,
    passFor,
  };

  /** implementation breakdown
    initialize color field, c
    initialize velocity field, u

    while(true):
      u_a := advect field u through itself
      d := calculate divergence of u_a
      p := calculate pressure based on d, using jacobi iteration
      u := u_a - gradient of p
      c := advect field c through velocity field u
      draw c
      wait a bit
  */

  // passes

  const simulation = [
    // simulation passes in order
    // TODO: more granular, need to add steps and break down a few
    drawVelocityPass,
    drawInteractionsPass,
    drawDivergencePass,
    drawPressurePass,
  ];

  const visuals = [
    drawColorPass,
    drawPostProcessingPass,
  ];

  return [].concat(simulation, visuals, [renderPass]);
}
