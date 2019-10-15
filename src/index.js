import app from './app';

// modules
// import fluidModule from './fluid';
// import smokeModule from './smoke';
// import terrainModule from './terrain';
import water2DModule from './water-2D';
// import rayMarchingModule from './raymarch';
// import water3DModule from './water-3D';

const options = {};

window.app = app.set('options', options).render(
  // terrainModule,
  water2DModule,
  // rayMarchingModule,
  // water3DModule,
);
