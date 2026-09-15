import { createWaterSurface } from './surface';

export function createRenderer(device, app, simulation, camera) {
  const { gl } = device;
  const { radius, minimum, maximum } = simulation.parameters;
  const vertex = `#version 300 es
    layout(location = 0) in vec3 aPosition;
    uniform mat4 uView, uProjection;
    uniform vec3 uTank;
    void main() { gl_Position = uProjection * uView * vec4(aPosition + uTank, 1.0); }`;
  const fragment = `#version 300 es
    precision highp float;
    uniform vec3 uColor;
    out vec4 result;
    void main() { result = vec4(uColor, 1.0); }`;
  const geometry = device.program(vertex, fragment);
  const floor = device.vertices([
    [minimum[0], minimum[1] - 0.01, minimum[2]], [maximum[0], minimum[1] - 0.01, minimum[2]], [maximum[0], minimum[1] - 0.01, maximum[2]],
    [minimum[0], minimum[1] - 0.01, minimum[2]], [maximum[0], minimum[1] - 0.01, maximum[2]], [minimum[0], minimum[1] - 0.01, maximum[2]],
  ]);
  const lines = [];
  for (let axis = 0; axis < 3; axis++) {
    const other = (axis + 1) % 3;
    const remaining = (axis + 2) % 3;
    for (const first of [minimum[other], maximum[other]]) {
      for (const second of [minimum[remaining], maximum[remaining]]) {
        const start = [...minimum];
        start[other] = first;
        start[remaining] = second;
        const end = [...start];
        end[axis] = maximum[axis];
        lines.push(start, end);
      }
    }
  }
  const grid = [];
  for (let division = 0; division <= 12; division++) {
    const horizontal = minimum[0] + division / 12 * (maximum[0] - minimum[0]);
    const depth = minimum[2] + division / 12 * (maximum[2] - minimum[2]);
    grid.push([horizontal, minimum[1], minimum[2]], [horizontal, minimum[1], maximum[2]], [minimum[0], minimum[1], depth], [maximum[0], minimum[1], depth]);
  }
  const tankVAO = device.vertices(lines);
  const gridVAO = device.vertices(grid);
  const particles = device.program(`#version 300 es
    precision highp float;
    uniform sampler2D uPosition, uDensity;
    uniform mat4 uView, uProjection;
    uniform float uPointScale, uMaxPointSize;
    uniform bool uShowDensity;
    out vec3 vColor;
    void main() {
      int id = gl_VertexID;
      ivec2 pixel = ivec2(id % ${simulation.width}, id / ${simulation.width});
      vec4 position = uView * vec4(texelFetch(uPosition, pixel, 0).xyz, 1.0);
      gl_Position = uProjection * position;
      gl_PointSize = clamp(uPointScale / max(0.1, -position.z), 1.0, uMaxPointSize);
      float height = float((id / ${simulation.parameters.particlesPerAxis}) % ${simulation.parameters.particlesPerAxis}) / float(${simulation.parameters.particlesPerAxis - 1});
      vColor = vec3(0.15 + 0.45 * height, 0.65 + 0.25 * height, 0.8);
      if (uShowDensity) {
        float ratio = texelFetch(uDensity, pixel, 0).y;
        float compressed = clamp((ratio - 1.0) * 5.0, 0.0, 1.0);
        vColor = vec3(0.1 + compressed * 0.9, (0.25 + min(1.0, ratio) * 0.6) * (1.0 - compressed * 0.8), 0.9 - compressed * 0.7);
      }
    }`, `#version 300 es
    precision highp float;
    in vec3 vColor;
    out vec4 result;
    void main() {
      vec2 point = gl_PointCoord * 2.0 - 1.0;
      float squaredRadius = dot(point, point);
      if (squaredRadius > 1.0) discard;
      vec3 normal = vec3(point.x, -point.y, sqrt(1.0 - squaredRadius));
      float light = 0.25 + 0.75 * max(dot(normal, normalize(vec3(-0.4, 0.6, 1.0))), 0.0);
      result = vec4(vColor * light, 1.0);
    }`);
  const maxPointSize = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1];
  const renderSurface = createWaterSurface(device, simulation, camera);

  return function render() {
    camera.update(app.width, app.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.disable(gl.SCISSOR_TEST);
    gl.depthMask(true);
    gl.clearColor(0.018, 0.035, 0.055, 1);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const uniforms = { uView: camera.view, uProjection: camera.projection, uTank: simulation.tank };
    device.draw(geometry, null, { ...uniforms, uColor: [0.03, 0.075, 0.095] }, { vao: floor, count: 6, depth: true });
    device.draw(geometry, null, { ...uniforms, uColor: [0.07, 0.16, 0.18] }, { vao: gridVAO, count: grid.length, primitive: gl.LINES, depth: true });
    const showDensity = simulation.parameters.showDensity && simulation.parameters.solver === 'fluid';
    if (simulation.parameters.waterSurface && !showDensity) renderSurface();
    else device.draw(particles, null, {
      ...uniforms, uPosition: simulation.positionTexture, uDensity: simulation.densityTexture,
      uShowDensity: showDensity ? 1 : 0,
      uPointScale: radius * app.canvas.height / Math.tan(Math.PI / 8), uMaxPointSize: maxPointSize,
    }, { count: simulation.count, primitive: gl.POINTS, depth: true });
    device.draw(geometry, null, { ...uniforms, uColor: [0.18, 0.4, 0.45] }, { vao: tankVAO, count: lines.length, primitive: gl.LINES, depth: true });
  };
}
