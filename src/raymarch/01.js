// tutorial (the art of code): https://www.youtube.com/watch?v=PGtv-dBi2wE

import { screenVertexShader, glsl } from '../shaders';
import { quad } from '../shapes';

export default function rayMarchingModule(ctx, app) {
  const rayMarchFragmentShader = glsl`
    #define MAX_STEPS 100
    #define MAX_DIST 100.
    #define SURF_DIST .01

    precision highp float;

    varying vec2 vTexCoord;

    uniform float uTime;
    uniform vec2 uResolution;

    float getDist(vec3 p) {
      vec4 s = vec4(0, 1.1, 6, 1);

      float sphereDist = length(p - s.xyz) - s.w;
      float planeDist = p.y;

      float d = min(sphereDist, planeDist);
      return d;
    }

    float rayMarch(vec3 ro, vec3 rd) {
      float dO = 0.;

      for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * dO;
        float dS = getDist(p);
        dO += dS;
        if (dO > MAX_DIST || dS < SURF_DIST) break;
      }

      return dO;
    }

    vec3 getNormal(vec3 p) {
      float d = getDist(p);
      vec2 e = vec2(0.1, 0.);

      vec3 n = d - vec3(
        getDist(p - e.xyy),
        getDist(p - e.yxy),
        getDist(p - e.yyx)
      );

      return normalize(n);
    }

    float getLight(vec3 p) {
      vec3 lightPos = vec3(0, 5, 6);
      lightPos.xz += vec2(sin(uTime), cos(uTime));
      vec3 l = normalize(lightPos - p);
      vec3 n = getNormal(p);

      float dif = clamp(dot(n, l), 0., 1.);
      float d = rayMarch(p + n + SURF_DIST * 2., l);
      if (d < length(lightPos-p)) dif *= 0.1;
      return dif;
    }

    void main() {
      vec2 uv = (vTexCoord.xy - 0.5) * uResolution / uResolution.y;
      vec3 color = vec3(0.);

      vec3 ro = vec3(0., 1., 0.);
      vec3 rd = normalize(vec3(uv.xy, 1.));

      float d = rayMarch(ro, rd);

      vec3 p = ro + rd * d;

      color = vec3(getLight(p));

      gl_FragColor.rgb = color;
      gl_FragColor.a = 1.0;
    }`;

  const { faces, positions, texCoords } = quad;

  const drawRayMarchingCmd = {
    pipeline: ctx.pipeline({
      vert: screenVertexShader,
      frag: rayMarchFragmentShader,
    }),
    attributes: {
      aPosition: ctx.vertexBuffer(positions),
      aTexCoord: ctx.vertexBuffer(texCoords),
    },
    indices: ctx.indexBuffer(faces),
    uniforms: {
      uResolution: [app.width, app.height],
    },
  };

  const now = performance.now();

  return function rayMarchingRenderer() {
    ctx.submit(drawRayMarchingCmd, {
      uniforms: {
        // in seconds
        uTime: (performance.now() - now) / 1000,
      },
    });
  };
}
