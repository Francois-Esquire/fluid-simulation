import { glsl } from '../util';
import { quad } from '../shapes';

export default function terrainGenerator(ctx, app) {
  const terrainMapHeight = 512;
  const terrainMapWidth = 512;
  const terrainMapTexture = ctx.texture2D({
    width: terrainMapWidth,
    height: terrainMapHeight,
    pixelFormat: ctx.PixelFormat.RGBA8,
    encoding: ctx.Encoding.SRGB,
  });

  const { positions, texCoords, faces } = quad;
  const indices = ctx.indexBuffer(faces);
  const attributes = {
    aPosition: ctx.vertexBuffer(positions),
    aTexCoord0: ctx.vertexBuffer(texCoords),
  };

  const standardVertexShader = glsl`
    attribute vec2 aPosition;
    attribute vec2 aTexCoord0;
    varying vec2 vTexCoord;
    void main () {
      gl_Position = vec4(aPosition, 0.0, 1.0);
      vTexCoord =  aTexCoord0;
    }`;
  const generatorFrag = glsl`
    precision highp float;


    uniform float uTime;
    uniform int uOctaves;
    uniform float uFrequency;
    uniform float uPersistence;

    varying vec2 vTexCoord;

    float hash(float n) {
      return fract(sin(n) * 753.5453123);
    }

    float snoise(vec3 x) {
      vec3 p = floor(x);
      vec3 f = fract(x);
      f = f * f * (3.0 - (2.0 * f));

      float n = p.x + p.y * 157.0 + 113.0 * p.z;
      return mix(
        mix(
          mix(hash(n + 0.0), hash(n + 1.0), f.x),
          mix(hash(n + 157.0), hash(n + 158.0), f.x),
          f.y
        ),
        mix(
          mix(hash(n + 113.0), hash(n + 114.0), f.x),
          mix(hash(n + 270.0), hash(n + 271.0), f.x),
          f.y
        ),
        f.z
      );
    }

    float noise(vec3 position, int octaves, float frequency, float persistence) {
      float total = 0.0;
      float maxAmplitude = 0.0;
      float amplitude = 1.0;
      const int o = 12;
      for (int i = 0; i < o; i++) {
        total += snoise(position * frequency) * amplitude;
        frequency *= 2.0;
        maxAmplitude += amplitude;
        amplitude *= persistence;
      }
      return total / maxAmplitude;
    }

    void main() {
      // float z = mix(hash(vTexCoord.y / vTexCoord.x), sin(vTexCoord.x), cos(vTexCoord.y));
      float z = 1.0;
      float y = vTexCoord.y;
      float x = vTexCoord.x;
      vec3 position = vec3(x, y, z);
      float val = noise(position, uOctaves, uFrequency, uPersistence);

      vec3 color = vec3(val);

      gl_FragColor = vec4(color, 1.0);
    }`;

  const generateTerrainMapCmd = {
    pass: ctx.pass({
      color: [terrainMapTexture],
    }),
    pipeline: ctx.pipeline({
      vert: standardVertexShader,
      frag: generatorFrag,
    }),
    attributes,
    indices,
    uniforms: {
      uTime: 0,
      uOctaves: 8,
      uFrequency: 7.0,
      uPersistence: 0.5,
    },
  };

  app.state.terrainGenerator = {
    terrainMapTexture,
  };

  return function render() {
    // const freq = Math.sin(app.state.time / 120);
    ctx.submit(generateTerrainMapCmd, {
      uniforms: {
        uTime: app.state.time,
        // uFrequency: freq,
      },
    });
  };
}
