export function eventHandlerNotFunction(eventName) {
  return new Error(`Event handler for ${eventName} is not a function`);
}

export function eventNotSupported(eventName) {
  return new Error(`Event ${eventName} is not supported`);
}
