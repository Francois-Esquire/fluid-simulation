import { getContext, setDebugging } from '../webgl';

import { createCanvas, createViewportMeta } from './elements';
import * as events from './events';

export default class WebGLApplication {
  constructor({ debug = false } = {}) {
    this._debug = debug;

    this.events = events;
    this.frameGeneration = 0;
    this.boundEvents = [];

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
      debug = this._debug,
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
        ['mouseup', 'onMouseUp', window],
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
      events.on(eventName, this[handlerName], target, { capture: true, passive: false });
      this.boundEvents.push([eventName, this[handlerName], target]);
    });

    this.initialized = true;

    return this;
  }

  render(ctx, modules = []) {
    this.stop();
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

    const generation = ++this.frameGeneration;
    this.running = true;
    ctx.frame(() => {
      if (!this.running || generation !== this.frameGeneration) return false;
      this.state.ticks += 1;
      this.state.time = (performance.now() - startTime) / 1000;
      this.modules.forEach(frame => frame(this.state));
    });

    return this;
  }

  stop() {
    this.running = false;

    return this;
  }

  destroy() {
    this.stop();
    this.state.water3D?.dispose?.();
    this.boundEvents.forEach(([name, handler, target]) => events.off(name, handler, target));
    this.boundEvents = [];
    if (this.ctx) this.ctx.dispose();
    this.ctx = null;
    this.modules = [];
    delete this.state.water;
    delete this.state.water3D;
    if (this.canvas) this.canvas.remove();
    this.initialized = false;
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
      if (this.state.water) {
        ['color1', 'color2'].forEach(name => {
          this.ctx.update(this.state.water.textures[name], { width, height });
        });
      }
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
    const bounds = this.canvas.getBoundingClientRect();
    this.mx = (event.clientX - bounds.left) / bounds.width;
    this.my = 1 - (event.clientY - bounds.top) / bounds.height;

    if (this.state.dragging) {
      this.state.mx = this.mx;
      this.state.my = this.my;

      // TODO: put values in -1 to 1 coordinate space
      // this.state.mx = 2 * (this.mx / this.width) - 1;
      // this.state.my = 2 * (1 - this.my / this.height) - 1;
    }
  }
  onMouseDown(event) {
    this.state.dragging = true;

    this.onMouseMove(event);
  }
  onMouseUp(event) {
    this.state.dragging = false;

    this.state.dx = 0;
    this.state.dy = 0;
  }
  onTouchMove(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!event.touches.length) return;
    const { clientX, clientY, force } = event.touches[0];
    const bounds = this.canvas.getBoundingClientRect();
    this.mx = (clientX - bounds.left) / bounds.width;
    this.my = 1 - (clientY - bounds.top) / bounds.height;

    this.state.force = force;

    if (this.state.dragging) {
      this.state.mx = this.mx;
      this.state.my = this.my;
    }
  }
  onTouchStart(event) {
    event.preventDefault();
    event.stopPropagation();
    this.state.dragging = true;
    this.onTouchMove(event);
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
