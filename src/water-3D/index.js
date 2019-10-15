import { quad } from '../shapes';

import visualizeModule from './00-visualize';
import renderModule from './01-render';
import particlesModule from './02-particles';
import velocityModule from './03-velocity';

export default function water3D(ctx, app) {
  const resolution = 1024;
  const parameters = {
    height: app.height,
    width: app.width,
    gridSize: resolution,
    gridUnit: 1 / resolution,
    timestep: 1 / 120.0,
    jacobiIterations: 10,
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
    screenTextureOptions.pixelFormat = ctx.PixelFormat.RGBA32F;
    simulationTextureOptions.pixelFormat = ctx.PixelFormat.RGBA32F;
  }

  const textures = {
    screen: ctx.texture2D(screenTextureOptions),
    particle1: ctx.texture2D(simulationTextureOptions),
    particle2: ctx.texture2D(simulationTextureOptions),
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

  app.state.water3D = {
    quad,
    indices,
    attributes,
    parameters,
    textures,
    swap,
  };

  const renderable = [];
  const simulation = [renderModule, particlesModule, velocityModule];
  const misc = [visualizeModule];

  return [].concat(renderable, simulation, misc);
}
