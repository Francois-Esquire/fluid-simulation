import createContext from 'pex-context';

import app from './app';

import {
  // cameraModule,
  // fluidModule,
  // smokeModule,
  // terrainModule,
  water2DModule,
  // rayMarchingModule,
  // rayMarchingPrimitivesModule,
  // water3DModule,
  // transformFeedbackModule,
} from './modules';

const modules = [
  // cameraModule,
  // fluidModule,
  // smokeModule,
  // terrainModule,
  water2DModule,
  // rayMarchingModule,
  // rayMarchingPrimitivesModule,
  // water3DModule,
  // transformFeedbackModule,
];

const options = {
  gl: {},
};

document.addEventListener('DOMContentLoaded', () => {
  window.app = app.set('options', options).initialize({ context: 'webgl' });

  const ctx = createContext({ gl: app.gl });
  // const ctx = { gl: app.gl };

  app.render(ctx, modules);
});
