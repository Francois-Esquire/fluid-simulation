import { computeVertex } from './gpu-device';

export function createWaterSurface(device, simulation, camera) {
  const { gl } = device;
  const depth = device.texture(1, 1, null, { depth: true });
  const horizontal = device.texture(1, 1);
  const vertical = device.texture(1, 1);
  const radius = simulation.parameters.radius * 1.65;
  const spheres = device.program(`#version 300 es
    precision highp float;
    uniform sampler2D uPosition;
    uniform mat4 uView, uProjection;
    uniform float uRadius;
    out vec2 vCorner;
    out vec3 vCenter;
    void main() {
      int id = gl_VertexID / 6;
      vec2 corners[6] = vec2[6](vec2(-1,-1), vec2(1,-1), vec2(1,1), vec2(-1,-1), vec2(1,1), vec2(-1,1));
      vCorner = corners[gl_VertexID % 6];
      vCenter = (uView * vec4(texelFetch(uPosition, ivec2(id % ${simulation.width}, id / ${simulation.width}), 0).xyz, 1)).xyz;
      gl_Position = uProjection * vec4(vCenter + vec3(vCorner * uRadius, 0), 1);
    }`, `#version 300 es
    precision highp float;
    uniform mat4 uProjection;
    uniform float uRadius;
    in vec2 vCorner;
    in vec3 vCenter;
    out vec4 result;
    void main() {
      float squared = dot(vCorner, vCorner);
      if (squared > 1.0) discard;
      vec3 position = vCenter + vec3(vCorner, sqrt(1.0 - squared)) * uRadius;
      vec4 projected = uProjection * vec4(position, 1);
      gl_FragDepth = projected.z / projected.w * 0.5 + 0.5;
      result = vec4(-position.z, 0, 0, 1);
    }`);
  const smooth = device.program(computeVertex, `#version 300 es
    precision highp float;
    uniform sampler2D uDepth;
    uniform vec3 uDirection;
    uniform float uRadius, uScale;
    out vec4 result;
    void main() {
      ivec2 pixel = ivec2(gl_FragCoord.xy);
      ivec2 size = textureSize(uDepth, 0);
      float center = texelFetch(uDepth, pixel, 0).r;
      if (center <= 0.0) { result = vec4(0); return; }
      float span = clamp(uRadius * uScale / center, 1.0, 18.0);
      float sum = 0.0;
      float weights = 0.0;
      for (int offset = -18; offset <= 18; offset++) {
        float distance = float(offset);
        if (abs(distance) > span) continue;
        ivec2 samplePixel = clamp(pixel + ivec2(uDirection.xy) * offset, ivec2(0), size - 1);
        float sampleDepth = texelFetch(uDepth, samplePixel, 0).r;
        if (sampleDepth <= 0.0) continue;
        float difference = (sampleDepth - center) / (uRadius * 2.0);
        float weight = exp(-2.0 * distance * distance / (span * span) - difference * difference * 0.5);
        sum += sampleDepth * weight;
        weights += weight;
      }
      result = vec4(sum / weights, 0, 0, 1);
    }`);
  const shade = device.program(computeVertex, `#version 300 es
    precision highp float;
    uniform sampler2D uDepth;
    uniform mat4 uProjection, uView;
    uniform vec3 uViewport;
    out vec4 result;
    float depthAt(ivec2 pixel) {
      return texelFetch(uDepth, clamp(pixel, ivec2(0), textureSize(uDepth, 0) - 1), 0).r;
    }
    vec3 positionAt(ivec2 pixel, float depth) {
      vec2 ndc = (vec2(pixel) + 0.5) / vec2(textureSize(uDepth, 0)) * 2.0 - 1.0;
      return vec3(ndc.x / uProjection[0][0], ndc.y / uProjection[1][1], -1) * depth;
    }
    vec3 neighbor(ivec2 pixel, float center) {
      float depth = depthAt(pixel);
      return positionAt(pixel, depth > 0.0 ? depth : center);
    }
    void main() {
      ivec2 pixel = ivec2(gl_FragCoord.xy / uViewport.xy * vec2(textureSize(uDepth, 0)));
      float depth = depthAt(pixel);
      if (depth <= 0.0) discard;
      vec3 position = positionAt(pixel, depth);
      vec3 right = neighbor(pixel + ivec2(1,0), depth) - position;
      vec3 left = position - neighbor(pixel - ivec2(1,0), depth);
      vec3 up = neighbor(pixel + ivec2(0,1), depth) - position;
      vec3 down = position - neighbor(pixel - ivec2(0,1), depth);
      vec3 normal = normalize(cross(abs(right.z) < abs(left.z) ? right : left, abs(up.z) < abs(down.z) ? up : down));
      vec3 eye = normalize(-position);
      vec3 light = normalize(mat3(uView) * vec3(-0.4, 0.85, 0.35));
      vec3 reflection = transpose(mat3(uView)) * reflect(-eye, normal);
      float fresnel = 0.02 + 0.98 * pow(1.0 - max(dot(normal, eye), 0.0), 5.0);
      vec3 environment = mix(vec3(0.025, 0.07, 0.10), vec3(0.65, 0.85, 0.9), smoothstep(-0.2, 0.9, reflection.y));
      float highlight = pow(max(dot(normal, normalize(light + eye)), 0.0), 100.0);
      vec3 body = vec3(0.025, 0.32, 0.34) * (0.5 + 0.5 * max(dot(normal, light), 0.0));
      vec3 color = mix(body, environment, fresnel) + vec3(0.9, 0.98, 1.0) * highlight * 0.65;
      result = vec4(pow(color, vec3(1.0 / 2.2)), 1);
      vec4 projected = uProjection * vec4(position, 1);
      gl_FragDepth = projected.z / projected.w * 0.5 + 0.5;
    }`);

  return function renderSurface() {
    const scale = Math.min(1, 1280 / Math.max(gl.canvas.width, gl.canvas.height));
    const width = Math.max(1, Math.round(gl.canvas.width * scale));
    const height = Math.max(1, Math.round(gl.canvas.height * scale));
    for (const target of [depth, horizontal, vertical]) device.resize(target, width, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, depth.framebuffer);
    gl.disable(gl.SCISSOR_TEST);
    gl.depthMask(true);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    device.draw(spheres, depth, {
      uPosition: simulation.positionTexture, uView: camera.view, uProjection: camera.projection, uRadius: radius,
    }, { count: simulation.count * 6, depth: true });
    let source = depth;
    for (let iteration = 0; iteration < 3; iteration++) {
      const uniforms = { uRadius: radius, uScale: height * camera.projection[5] * 0.5 };
      device.draw(smooth, horizontal, { ...uniforms, uDepth: source, uDirection: [1, 0, 0] });
      device.draw(smooth, vertical, { ...uniforms, uDepth: horizontal, uDirection: [0, 1, 0] });
      source = vertical;
    }
    device.draw(shade, null, {
      uDepth: vertical, uView: camera.view, uProjection: camera.projection,
      uViewport: [gl.canvas.width, gl.canvas.height, 0],
    }, { depth: true });
  };
}
