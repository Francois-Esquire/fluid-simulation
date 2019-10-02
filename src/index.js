import app from './app';

// modules
// import fluidModule from './fluid';
// import smokeModule from './smoke';
import terrainModule from './terrain';
// import waterModule from './water';

const options = {};

app.set('options', options).initialize(
  terrainModule,
  // waterModule,
).render();
