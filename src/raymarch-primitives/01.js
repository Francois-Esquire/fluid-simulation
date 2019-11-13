// tutorial (the art of code): https://www.youtube.com/watch?v=PGtv-dBi2wE

import { glsl, screenVertexShader } from './shaders';
import { quad } from '../shapes';

export default function rayMarchingPrimitives(ctx, app) {
  const rayMarchPrimitiveFragmentShader = glsl`
    #define MAX_STEPS 100
    #define MAX_DIST 100.
    #define SURF_DIST .001

    precision highp int;
    precision highp float;

    varying vec2 vTexCoord;

    uniform float uTime;
    uniform vec2 uMouse;
    uniform vec2 uResolution;

    float opSmoothUnion( float d1, float d2, float k ) {
        float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
        return mix( d2, d1, h ) - k*h*(1.0-h); }
    float opSmoothSubtraction( float d1, float d2, float k ) {
        float h = clamp( 0.5 - 0.5*(d2+d1)/k, 0.0, 1.0 );
        return mix( d2, -d1, h ) + k*h*(1.0-h); }
    float opSmoothIntersection( float d1, float d2, float k ) {
        float h = clamp( 0.5 - 0.5*(d2-d1)/k, 0.0, 1.0 );
        return mix( d2, d1, h ) + k*h*(1.0-h); }

    float sdCylinder( vec3 p, vec2 h )
    {
      vec2 d = abs(vec2(length(p.xz),p.y)) - h;
      return min(max(d.x,d.y),0.0) + length(max(d,0.0));
    }
    float sdCapsule( vec3 p, vec3 a, vec3 b, float r )
    {
      vec3 pa = p-a, ba = b-a;
      float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
      return length( pa - ba*h ) - r;
    }

    float sdColumn(vec3 p, vec2 h) {
      vec3 dp = p - vec3(0,0,0);
      // dp.x += sin(p.z * 5. + uTime * 4.) * 0.01;
      float d = sdCylinder(dp, h);

      vec3 cp = dp - vec3(0., h.y * -1., 0.);
      cp.xz = abs(cp.xz);
      cp.xz -= vec2(h.x, 0.125);
      vec3 a = vec3(.0, h.y * 2., 0.0);
      vec3 b = vec3(.0, .0, 0.);
      float r = .0375;
      float capsuleDist = sdCapsule(cp, a, b, r);

      d = opSmoothSubtraction(capsuleDist, d, 0.01);
      // d = opSmoothUnion(capsuleDist, d, 0.00001);

      return d;
    }

    float Lounge(vec3 p) {
      vec4 s = vec4(1., 0., 4., 1.);
      float plane = dot(p, normalize(vec3(0., 1., 0.))) + s.w;
      float column = sdColumn(p - s.xyz, vec2(.25, .75));
      float d = min(column, plane);
      return d;
    }

    float baseScene(vec3 p) {
      vec4 s = vec4(0., 1., 5., 1.);
      float sphereDist = length(p - s.xyz) - s.w;
      float planeDist = p.y + s.w;
      float d = min(sphereDist, planeDist);
      return d;
    }

    float sphere(vec3 p) {
      float sphereDist = length(p - vec3(4,-1, 15)) - .5;
      float planeDist = p.y + 2.5;
      float d = min(sphereDist, planeDist);
      return d;
    }

    float map(vec3 p) {
      return Lounge(p);
      // return baseScene(p);
      // return sphere(p);
    }

    float castRay(vec3 ro, vec3 rd) {
      float distance = 0.;

      for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * distance;
        float dS = map(p);
        distance += dS;
        if (distance > MAX_DIST || abs(dS) < SURF_DIST) break;
      }

      if (distance > 20.) distance = -1.;

      return distance;
    }

    vec3 calculateNormal(vec3 pose) {
      float distance = map(pose);
      vec2 e = vec2(SURF_DIST, 0.);

      vec3 normal = distance - vec3(
        map(pose - e.xyy),
        map(pose - e.yxy),
        map(pose - e.yyx)
      );

      return normalize(normal);
    }

    vec3 R(vec2 uv, vec3 p, vec3 l, float z) {
    vec3 f = normalize(l-p),
        r = normalize(cross(vec3(0,1,0), f)),
        u = cross(f,r),
        c = p+f*z,
        i = c + uv.x*r + uv.y*u,
        d = normalize(i-p);
    return d;
}

    void main() {
      /*

      straightforward

      vec2 p = (vTexCoord.xy - 0.5) * uResolution / uResolution.y;
      vec3 ro = vec3(0, 0, 1);
      vec3 rd = normalize(vec3(p, -1.5));

      */

      vec2 p = ( 2.0 * gl_FragCoord.xy - uResolution.xy)  / uResolution.y;

      float an = 10.0*uMouse.x; //0.1*uTime;

      vec3 ta = vec3(0.0, 0.75, 0.0); // target point
      vec3 ro = vec3(1.5 * sin(an), 0, 1.5 * cos(an));
      vec3 ww = normalize( ta - ro );
      vec3 uu = normalize( cross( ww,  vec3(0, 1, 0) ) );
      vec3 vv = normalize( cross( uu, ww ) );
      vec3 rd = normalize( p.x*uu + p.y*vv - 1.8*ww );

      // vec3 rd = R(p, ro, vec3(0,1,0), 1.);

      // base color {the sky}
      vec3 color = vec3(0.45, 0.69, 0.799) - 0.78 * rd.y;
      color = mix( color, vec3( 0.7, 0.75, 0.8 ), exp( -1.0*rd.y ) );

      float t = castRay(ro, rd);

      // modeling, materials and lighting
      if( t > 0.0 ) {
        vec3 position = ro + rd * t;
        vec3 nor = calculateNormal(position);

        vec3 light = vec3(0., 0.9, .2);
        light.xz -= vec2(sin(uTime), cos(uTime));

        vec3 mate = vec3(0.2, 0.2, 0.2);

        vec3 sun_dir = normalize(light);
        float sun_dif = clamp( dot(nor, sun_dir), 0., 1. );
        float sun_sha = step( castRay(position + nor*0.01, sun_dir), 0. );
        float sky_dif = clamp( length(color) *  0.5 + 0.5*dot(nor, vec3(0., 1., 0.)), 0., 1. );
        float bou_dif = clamp( 0.5 + 0.5*dot(nor, vec3(0., -1., 0.)), 0., 1. );

        color  = mate * vec3(9.1, 7., 5.) * sun_dif * sun_sha;
        color += mate * vec3(0.5, 0.8, 0.9) * sky_dif;
        color += mate * vec3(0.7, 0.3, 0.2) * bou_dif;

        if (t > 20.) {
          color = vec3(0.7);
        }
      } else {
        // render clouds
        vec3 position = ro + rd * t;
        // color = calculateNormal(position);
      }

      color = pow( color, vec3(0.4545) );

      gl_FragColor.rgb = color;
      gl_FragColor.a = 1.0;
    }`;

  const { faces, positions, texCoords } = quad;

  const drawRayMarchingCmd = {
    pipeline: ctx.pipeline({
      vert: screenVertexShader,
      frag: rayMarchPrimitiveFragmentShader,
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

  return function rayMarchingPrimitivesRenderer() {
    ctx.submit(drawRayMarchingCmd, {
      uniforms: {
        // in seconds
        uTime: app.state.time,
        uMouse: [app.state.mx, app.state.my],
        uResolution: [app.width, app.height],
      },
    });
  };
}
