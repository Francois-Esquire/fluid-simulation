export function createGPUDevice(gl) {
  if (typeof WebGL2RenderingContext === 'undefined' || !(gl instanceof WebGL2RenderingContext) || !gl.getExtension('EXT_color_buffer_float')) {
    throw new Error('Water 3D requires WebGL2 with floating-point render targets. Water 2D and Smoke remain available.');
  }
  const resources = [];
  const emptyVAO = gl.createVertexArray();
  resources.push(() => gl.deleteVertexArray(emptyVAO));

  function texture(width, height, data = null, options = {}) {
    const handle = gl.createTexture();
    const framebuffer = gl.createFramebuffer();
    const depthBuffer = options.depth ? gl.createRenderbuffer() : null;
    resources.push(() => { gl.deleteTexture(handle); gl.deleteFramebuffer(framebuffer); if (depthBuffer) gl.deleteRenderbuffer(depthBuffer); });
    gl.bindTexture(gl.TEXTURE_2D, handle);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, data);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, handle, 0);
    if (depthBuffer) {
      gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
    }
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Floating-point framebuffer is incomplete.');
    return { handle, framebuffer, depthBuffer, width, height };
  }

  function resize(target, width, height) {
    if (target.width === width && target.height === height) return;
    gl.bindTexture(gl.TEXTURE_2D, target.handle);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, null);
    if (target.depthBuffer) {
      gl.bindRenderbuffer(gl.RENDERBUFFER, target.depthBuffer);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
    }
    target.width = width;
    target.height = height;
  }

  function program(vertex, fragment) {
    const handle = gl.createProgram();
    resources.push(() => gl.deleteProgram(handle));
    for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(error);
      }
      gl.attachShader(handle, shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(handle);
    if (!gl.getProgramParameter(handle, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(handle));
    const uniforms = [];
    for (let index = 0; index < gl.getProgramParameter(handle, gl.ACTIVE_UNIFORMS); index++) {
      const uniform = gl.getActiveUniform(handle, index);
      uniforms.push({ ...uniform, name: uniform.name, type: uniform.type, location: gl.getUniformLocation(handle, uniform.name) });
    }
    return { handle, uniforms };
  }

  function vertices(values) {
    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    resources.push(() => { gl.deleteVertexArray(vao); gl.deleteBuffer(buffer); });
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(values.flat()), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    return vao;
  }

  function draw(pipeline, target, values, options = {}) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target?.framebuffer ?? null);
    gl.viewport(0, 0, target?.width ?? gl.canvas.width, target?.height ?? gl.canvas.height);
    gl.disable(gl.BLEND);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.CULL_FACE);
    if (options.depth) gl.enable(gl.DEPTH_TEST);
    else gl.disable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.useProgram(pipeline.handle);
    gl.bindVertexArray(options.vao ?? emptyVAO);
    let unit = 0;
    for (const { name, location, type } of pipeline.uniforms) {
      const value = values[name];
      if (value === undefined) throw new Error('Missing GPU uniform: ' + name);
      if (type === gl.SAMPLER_2D) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, value.handle);
        gl.uniform1i(location, unit++);
      } else if (type === gl.FLOAT) gl.uniform1f(location, value);
      else if (type === gl.INT || type === gl.BOOL) gl.uniform1i(location, value);
      else if (type === gl.FLOAT_VEC3) gl.uniform3fv(location, value);
      else if (type === gl.FLOAT_MAT4) gl.uniformMatrix4fv(location, false, value);
      else throw new Error('Unsupported GPU uniform type: ' + name);
    }
    gl.drawArrays(options.primitive ?? gl.TRIANGLES, 0, options.count ?? 3);
  }

  function upload(target, data) {
    gl.bindTexture(gl.TEXTURE_2D, target.handle);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, target.width, target.height, gl.RGBA, gl.FLOAT, data);
  }

  function read(target) {
    const previous = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    const data = new Float32Array(target.width * target.height * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.readPixels(0, 0, target.width, target.height, gl.RGBA, gl.FLOAT, data);
    gl.bindFramebuffer(gl.FRAMEBUFFER, previous);
    return data;
  }

  function dispose() {
    resources.splice(0).reverse().forEach(release => release());
  }
  return { gl, texture, resize, program, vertices, draw, upload, read, dispose, resources };
}

export const computeVertex = `#version 300 es
void main() {
  vec2 position = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(position * 2.0 - 1.0, 0.0, 1.0);
}`;
