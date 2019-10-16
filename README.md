# fluid simulation in WebGL

A playground for exploring fluid simulation in verious ways, using Pex.gl

## Experiments

### Smoke simulation

### Water 2D

### Water 3D

### Supporting studies

#### Camera Input

#### Terrain noise

#### Ray marching

### App design

An effort was made to centralize one place for events, global values and other core features.
Being that we rely on a per frame basis to check values of uniforms and other parameters,
we can expect to pick up the updated values without the need to emit changes in values or
for instance, carry the overhead of the garbage collector from updating an immutable store
for state.

#### module structure

```js
export default function initialize(ctx, app) {
  // initial setup, module state, events, etc
  return function render(state) {
    // draw calls - this function will be run per frame
    return function cleanup() {
      // release any resources and event handlers from initializer
    }
  }
}
```
