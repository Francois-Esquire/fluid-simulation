import { getContext, setDebugging } from '../webgl';

import { createCanvas, createViewportMeta } from './elements';
import * as events from './events';

export default class WebGLApplication {
  constructor({ debug = false } = {}) {
    this._debug = debug;

    this.events = events;

    this.state = {
      time: 0,
      ticks: 0,
      alpha: 0,
      beta: 0,
      gamma: 0,
      mx: 0,
      my: 0,
      dragging: false,
    };
  }

  // members

  initialize(props = {}) {
    const {
      debug = true,
      width = this.width,
      height = this.height,
      pixelRatio = this.pixelRatio,
      context = 'webgl',
      canvas: c = null,
      events: e = { mouse: true, touch: true, device: false },
    } = props;

    this.canvas = createCanvas({ width, height, pixelRatio, canvas: c });
    createViewportMeta({ append: true });

    this.gl = getContext({
      context,
      canvas: this.canvas,
      options: this.options.gl,
    });
    this.availableExtensions = this.gl.getSupportedExtensions();

    setDebugging(this.gl, debug);

    ['render', 'stop', 'set'].forEach(methodName => {
      this[methodName] = this[methodName].bind(this);
    });

    const eventsToBind = [['resize', 'onResize', window]];

    if (e.device) {
      eventsToBind.push(
        ['devicemotion', 'onDeviceMotion', window],
        ['deviceorientation', 'onDeviceOrientation', window],
      );
    }

    if (e.mouse) {
      eventsToBind.push(
        ['mousemove', 'onMouseMove', this.canvas],
        ['mousedown', 'onMouseDown', this.canvas],
        ['mouseup', 'onMouseUp', this.canvas],
      );
    }

    if (e.touch) {
      eventsToBind.push(
        ['touchmove', 'onTouchMove', this.canvas],
        ['touchstart', 'onTouchStart', this.canvas],
        ['touchend', 'onTouchEnd', this.canvas],
        ['touchcancel', 'onTouchCancel', this.canvas],
      );
    }

    eventsToBind.forEach(([eventName, handlerName, target]) => {
      this[handlerName] = this[handlerName].bind(this);
      events.on(eventName, this[handlerName], target, true);
    });

    this.initialized = true;

    return this;
  }

  render(ctx, modules = []) {
    this.modules = [];
    this.ctx = ctx;

    // handle if exported module is a set of modules or initiates with a setup function of a module
    [].concat(modules).map(
      function setupModule(moduleInitializer) {
        const module = moduleInitializer(ctx, this);

        if (typeof module === 'function') {
          this.modules.push(module);
        } else if (Array.isArray(module))
          module.forEach(setupModule.bind(this));
      }.bind(this),
    );

    const startTime = performance.now();

    const app = this;

    this.raf = window.requestAnimationFrame(function renderFrame() {
      // TODO: METRICS - a good place to keep an eye on performance
      app.state.ticks += 1;
      app.state.time = (performance.now() - startTime) / 1000;
      app.modules.forEach(frame => frame(app.state));

      window.requestAnimationFrame(renderFrame);
    });

    return this;
  }

  stop() {
    window.cancelAnimationFrame(this.raf);

    return this;
  }

  destroy() {
    // TODO: TERMINATE - program and clean up resources, remove events
  }

  set(component, value) {
    // TODO: STATEFUL - update affected modules from change
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

  // event handlers

  onResize() {
    const { width, height, pixelRatio } = this;

    if (this.ctx) {
      this.ctx.set({
        width,
        height,
        pixelRatio,
      });
    }
  }
  onDeviceMotion() {}
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
      this.state.mx = this.mx / this.width;
      this.state.my = 1 - this.my / this.height;

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
  onTouchMove(event) {
    event.preventDefault();
    event.stopPropagation();
    const { clientX, clientY, force } = event.touches[0];
    this.mx = clientX;
    this.my = clientY;

    this.state.force = force;

    if (this.state.dragging) {
      this.state.mx = this.mx / this.width;
      this.state.my = 1 - this.my / this.height;
    }
  }
  onTouchStart(event) {
    event.preventDefault();
    event.stopPropagation();
    this.state.dragging = true;
    this.state.dx = 0;
    this.state.dy = 0;
  }
  onTouchEnd(event) {
    event.preventDefault();
    event.stopPropagation();
    this.state.dragging = false;
  }
  onTouchCancel(event) {
    event.preventDefault();
    event.stopPropagation();
    this.state.dragging = false;
  }
}
