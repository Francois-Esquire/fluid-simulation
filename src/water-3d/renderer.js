import { glsl } from '../shaders';

export function createRenderer(ctx, app, simulation, camera) {
  const { radius, minimum, maximum } = simulation.parameters;
  const pointBuffer = ctx.vertexBuffer(simulation.positions);
  const colors = new Float32Array(simulation.count * 3);
  for (let particle = 0; particle < simulation.count; particle++) {
    const height = (simulation.positions[particle * 3 + 1] - 1) / 1.4;
    colors.set([0.15 + 0.45 * height, 0.65 + 0.25 * height, 0.8], particle * 3);
  }
  const vertex = glsl`
    attribute vec3 aPosition;
    uniform mat4 uView;
    uniform mat4 uProjection;
    void main() {
      gl_Position = uProjection * uView * vec4(aPosition, 1.0);
    }`;
  const fragment = glsl`
    precision highp float;
    uniform vec3 uColor;
    void main() { gl_FragColor = vec4(uColor, 1.0); }`;
  const floor = {
    pipeline: ctx.pipeline({ vert: vertex, frag: fragment, depthTest: true }),
    attributes: { aPosition: ctx.vertexBuffer([
      [minimum[0], -0.01, minimum[2]], [maximum[0], -0.01, minimum[2]], [maximum[0], -0.01, maximum[2]],
      [minimum[0], -0.01, minimum[2]], [maximum[0], -0.01, maximum[2]], [minimum[0], -0.01, maximum[2]],
    ]) },
    count: 6,
  };
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
    const coordinate = -1.5 + division * 0.25;
    grid.push([coordinate, 0, -1.5], [coordinate, 0, 1.5], [-1.5, 0, coordinate], [1.5, 0, coordinate]);
  }
  const linePipeline = ctx.pipeline({ vert: vertex, frag: fragment, primitive: ctx.Primitive.Lines, depthTest: true });
  const tank = { pipeline: linePipeline, attributes: { aPosition: ctx.vertexBuffer(lines) }, count: lines.length };
  const floorGrid = { pipeline: linePipeline, attributes: { aPosition: ctx.vertexBuffer(grid) }, count: grid.length };
  const particles = {
    pipeline: ctx.pipeline({
      primitive: ctx.Primitive.Points,
      depthTest: true,
      vert: glsl`
        attribute vec3 aPosition;
        attribute vec3 aColor;
        uniform mat4 uView;
        uniform mat4 uProjection;
        uniform float uPointScale;
        uniform float uMaxPointSize;
        varying vec3 vColor;
        void main() {
          vec4 position = uView * vec4(aPosition, 1.0);
          gl_Position = uProjection * position;
          gl_PointSize = clamp(uPointScale / max(0.1, -position.z), 1.0, uMaxPointSize);
          vColor = aColor;
        }`,
      frag: glsl`
        precision highp float;
        varying vec3 vColor;
        void main() {
          vec2 point = gl_PointCoord * 2.0 - 1.0;
          float squaredRadius = dot(point, point);
          if (squaredRadius > 1.0) discard;
          vec3 normal = vec3(point.x, -point.y, sqrt(1.0 - squaredRadius));
          float light = 0.25 + 0.75 * max(dot(normal, normalize(vec3(-0.4, 0.6, 1.0))), 0.0);
          gl_FragColor = vec4(vColor * light, 1.0);
        }`,
    }),
    attributes: { aPosition: pointBuffer, aColor: ctx.vertexBuffer(colors) },
    count: simulation.count,
  };
  const pass = ctx.pass({ clearColor: [0.018, 0.035, 0.055, 1], clearDepth: 1 });
  const maxPointSize = ctx.gl.getParameter(ctx.gl.ALIASED_POINT_SIZE_RANGE)[1];

  return function render() {
    camera.update(app.width, app.height);
    ctx.update(pointBuffer, { data: simulation.positions });
    const uniforms = { uView: camera.view, uProjection: camera.projection };
    ctx.submit({ pass }, () => {
      ctx.submit(floor, { uniforms: { ...uniforms, uColor: [0.03, 0.075, 0.095] } });
      ctx.submit(floorGrid, { uniforms: { ...uniforms, uColor: [0.07, 0.16, 0.18] } });
      ctx.submit(particles, { uniforms: { ...uniforms, uPointScale: radius * app.canvas.height / Math.tan(Math.PI / 8), uMaxPointSize: maxPointSize } });
      ctx.submit(tank, { uniforms: { ...uniforms, uColor: [0.18, 0.4, 0.45] } });
    });
  };
}
