// import createContext from 'pex-context';

import app from './app';

import {
  // fluidModule,
  // smokeModule,
  // terrainModule,
  // water2DModule,
  // rayMarchingModule,
  // water3DModule,
  transformFeedbackModule,
} from './modules';

const modules = [
  // fluidModule,
  // smokeModule,
  // terrainModule,
  // water2DModule,
  // rayMarchingModule,
  // water3DModule,
  transformFeedbackModule,
];

const options = {
  gl: {},
};

document.addEventListener('DOMContentLoaded', () => {
  window.app = app.set('options', options).initialize({ context: 'webgl2' });

  // const ctx = createContext({ gl: app.gl });
  const ctx = { gl: app.gl };

  app.render(ctx, modules);
});
