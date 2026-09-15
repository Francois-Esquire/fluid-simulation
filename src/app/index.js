import Application from './app';

const configuration = {
  debug: false,
  // TODO: make all scripting serializable, able to be initialized from main thread; modules and vendor code
  workers: true,
  sharedBuffers: true,
};

export default new Application(configuration);
