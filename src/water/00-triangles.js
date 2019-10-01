import { glsl } from '../util';

export default function trianglesVelocityModule(ctx, app) {
  const {
    state: {
      water: {
        constants: { gridSize },
        textures: { velocity1 },
      },
    },
  } = app;

  var triangleVertices = [[0, 0.2], [1, 0], [0, -0.2]];

  const triangleCount = 12;
  const interval = gridSize / triangleCount;

  const trianglePositions = [];
  const triangleFaces = [];

  for (let i = interval / 2; i < gridSize; i += interval) {
    for (let j = interval / 2; j < gridSize; j += interval) {
      for (var k = 0; k < 3; k++) {
        triangleFaces.push(triangleVertices[k]);
        trianglePositions.push([
          (2 * j) / gridSize - 1,
          (2 * i) / gridSize - 1,
        ]);
      }
    }
  }

  console.log(trianglePositions.length, triangleFaces.length);

  const drawVelocityTrianglesCmd = {
    pipeline: ctx.pipeline({
      primitive: ctx.Primitive.POINTS,
      vert: glsl`
        attribute vec2 aPosition;

        uniform sampler2D uVelocityTexture;

        void main() {
          vec2 vertex = vec2(aPosition);
          gl_Position = vec4(vertex, 0.0, 1.0);
          gl_PointSize = 10.;
        }`,
      frag: glsl`
        precision highp float;

        void main() {
          gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }`,
    }),
    attributes: {
      aPosition: ctx.vertexBuffer(trianglePositions),
    },
    indices: ctx.indexBuffer(triangleFaces),
    uniforms: {
      uVelocityTexture: velocity1,
    },
  };

  return function renderTriangles() {
    ctx.submit(drawVelocityTrianglesCmd, {
      uniforms: {
        uVelocityTexture: app.state.water.textures.velocity1,
      },
    });
  };
}
