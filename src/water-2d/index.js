import { quad } from '../shapes';

import drawInteractionsModule from './00-interact';

import renderModule from './01-render';
import drawVelocityModule from './02-velocity';
import drawDivergenceModule from './03-divergence';
import drawPressureModule from './04-pressure';
import drawColorModule from './05-color';
import drawWaterModule from './06-water';

/**
 *
 * TODO:
 * - Set Bounds
 * - Calculate delta/direction of interaction to push the veloicty field correctly; its just additive now.
 *
 */

export default function water2D(ctx, app) {
  const resolution = 1024;
  const parameters = {
    height: app.height,
    width: app.width,
    gridSize: resolution,
    gridUnit: 1 / resolution,
    timestep: 1 / 120.0,
    jacobiIterations: 5,
    // quality
    density: 1.0,
  };

  // get extensions
  const [textureFloat] = ['OES_texture_float'].map(extName => {
    const ext = ctx.gl.getExtension(extName);
    if (!ext) {
      console.warn(`${extName} is not supported`);
      return null;
    }
    return true;
  });

  const { gridSize, height, width } = parameters;

  // initialize textures

  const screenTextureOptions = {
    height,
    width,
    pixelFormat: ctx.PixelFormat.RGBA8,
    encoding: ctx.Encoding.SRGB,
  };

  const simulationTextureOptions = {
    height: gridSize,
    width: gridSize,
    pixelFormat: ctx.PixelFormat.RGBA8,
    encoding: ctx.Encoding.SRGB,
  };

  if (textureFloat) {
    // screenTextureOptions.pixelFormat = ctx.PixelFormat.RGBA32F;
    simulationTextureOptions.pixelFormat = ctx.PixelFormat.RGBA32F;
  }

  const textures = {
    screen: ctx.texture2D(screenTextureOptions),
    color1: ctx.texture2D(screenTextureOptions),
    color2: ctx.texture2D(screenTextureOptions),
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

  // set initial water state for modules

  app.state.water = {
    quad,
    indices,
    attributes,
    parameters,
    textures,
    swap,
    onUpdate() {
      // TODO: STATEFUL - rebuild/rewrite shaders and command
    },
  };

  const simulation = [
    renderModule,
    drawVelocityModule,
    drawDivergenceModule,
    drawPressureModule,
    drawColorModule,
  ];

  return [drawWaterModule].concat(simulation, [
    // drawNoiseModule,
    // drawTrianglesModule,
    drawInteractionsModule,
  ]);
}
