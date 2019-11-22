/*
  Simple Event System - limited to only one target per event
*/

import { eventHandlerNotFunction, eventNotSupported } from './errors';

export const events = new Map();
export const eventHandlers = new Map();

export const enabledEvents = new Set([
  'error',
  'message',
  'resize',
  'mousemove',
  'mousedown',
  'mouseup',
  'touchstart',
  'touchend',
  'touchmove',
  'touchcancel',
  'devicemotion',
  'deviceorientation',
]);

export const useEventListener = true;

export function on(eventName, callback, target, passive) {
  if (typeof callback !== 'function') throw eventHandlerNotFunction(eventName);

  if (enabledEvents.has(eventName)) {
    if (events.has(eventName)) {
      const handlers = events.get(eventName);

      handlers.add(callback);
    } else {
      events.set(eventName, new Set([callback]));

      const handler = event => {
        if (events.has(eventName)) {
          events.get(eventName).forEach(cb => cb(event));
        } else target[eventKey] = null;
      };

      if (useEventListener) {
        eventHandlers.set(eventName, handler);
        target.addEventListener(eventName, handler, passive);
      } else {
        const eventKey = `on${eventName}`;

        if (eventKey in target) {
          target[eventKey] = handler;
        }
      }
    }
  } else throw eventNotSupported(eventName);
}

export function off(eventName, callback, target) {
  if (events.has(eventName)) {
    const handlers = events.get(eventName);

    handlers.delete(callback);

    if (handlers.size === 0) {
      if (useEventListener) {
        const handler = eventHandlers.get(eventName);
        target.addEventListener(eventName, handler);
      } else {
        const eventKey = `on${eventName}`;

        if (typeof target[eventKey] === 'function') {
          target[eventKey] = null;
        }
      }

      events.delete(eventName);
    }
  }
}

export function once(eventName, callback, target) {
  if (typeof callback !== 'function') throw eventHandlerNotFunction(eventName);

  const disposableHandle = event => {
    off(eventName, disposableHandle, target);

    callback(event);
  };

  on(eventName, disposableHandle, target);
}

export function emit(eventName, event) {
  if (events.has(eventName)) {
    events.get(eventName).forEach(handle => handle(event));
  }
}
