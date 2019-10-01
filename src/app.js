import createContext from 'pex-context';

class Application {
  constructor() {
    const { width, height, pixelRatio } = this;

    this.state = {
      time: 0,
      alpha: 0,
      beta: 0,
      gamma: 0,
      mx: 0,
      my: 0,
      dragging: false,
    };

    this.ctx = createContext({
      width,
      height,
      pixelRatio,
    });

    this.availableExtensions = this.ctx.gl.getSupportedExtensions();

    [
      'onMouseMove',
      'onMouseDown',
      'onMouseUp',
      'onDeviceOrientation',
      'onResize',
    ].forEach(handler => {
      this[handler] = this[handler].bind(this);
    });

    this.ctx.gl.canvas.addEventListener('mousemove', this.onMouseMove);
    this.ctx.gl.canvas.addEventListener('mousedown', this.onMouseDown);
    this.ctx.gl.canvas.addEventListener('mouseup', this.onMouseUp);

    window.addEventListener('deviceorientation', this.onDeviceOrientation);
    window.addEventListener('resize', this.onResize);
  }

  // functions

  initialize(...args) {
    this.modules = [];

    // handle if exported module is a set of modules or initiates with a setup function
    [].concat(...args).forEach(
      function setupModule(moduleInitializer) {
        const module = moduleInitializer(this.ctx, this);

        if (typeof module === 'function') {
          this.modules.push(module);
        } else if (Array.isArray(module))
          module.forEach(setupModule.bind(this));
      }.bind(this),
    );

    return this;
  }

  render() {
    this.ctx.frame(() => {
      this.state.time += 1;
      this.modules.forEach(frame => frame(this.state));
    });

    return this;
  }

  set(component, value) {
    if (['options'].includes(component)) {
      this[`_${component}`] = value;
    }

    return this;
  }

  // common getters

  get width() {
    return window.innerWidth;
  }
  get height() {
    return window.innerHeight;
  }
  get pixelRatio() {
    return window.devicePixelRatio;
  }

  get options() {
    return this._options || {};
  }

  // internal helpers

  error(e, name) {
    console.error(name || '', e);
  }

  // event handlers

  onResize() {
    const { width, height, pixelRatio } = this;

    this.ctx.set({
      width,
      height,
      pixelRatio,
    });
  }
  onDeviceOrientation(event) {
    const {
      alpha,
      beta, // In degree in the range [-180,180]
      gamma, // In degree in the range [-90,90]
    } = event;

    this.state.alpha = alpha;
    this.state.beta = beta;
    this.state.gamma = gamma;
  }
  onMouseMove(event) {
    this.mx = event.offsetX;
    this.my = event.offsetY;

    if (this.state.dragging) {
      this.state.mx = (this.mx / this.width);
      this.state.my = (1 - this.my / this.height);

      // TODO: put values in -1 to 1 coordinate space
      // this.state.mx = 2 * (this.mx / this.width) - 1;
      // this.state.my = 2 * (1 - this.my / this.height) - 1;
    }
  }
  onMouseDown(event) {
    this.state.dragging = true;

    this.state.mx = this.mx;
    this.state.my = this.my;
  }
  onMouseUp(event) {
    this.state.dragging = false;

    this.state.dx = 0;
    this.state.dy = 0;
  }
}

export default new Application();
