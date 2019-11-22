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

---

### App design

The app is the source for events, global values and other core features.
On a per frame basis, we can check values of uniforms and other parameters from `app.state`,
we can expect to pick up the updated values without the need to emit there was a change.
You can also use `state` to write your scene shared state like references to textures or parameters
you want to share in your render stages that are called from your scene.

#### scene structure

To create a scene, export a function that returns your render function.
Handling cleanup can be done by having your render function return a function
for cleanup.

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
