import { screenVertexShader, glsl, bilinearSampling } from './shaders';

export default function renderWaterModule(ctx, app) {
  const { indices, attributes, textures, passFor } = app.state.water;
  const modes = { surface: 0, normal: 1, legacy: 2 };

  const fragmentShader = glsl`
    precision highp float;
    varying vec2 vTexCoord;

    uniform sampler2D uVelocityTexture;
    uniform float uGridUnit;
    uniform float uNormalStrength;
    uniform float uColorScale;
    uniform int uColorMode;
    uniform vec3 uBaseColor;
    uniform vec3 uHighlightColor;

    ${bilinearSampling}

    float heightAt(vec2 coords) {
      return length(sampleBilinear(uVelocityTexture, coords, 1.0 / uGridUnit).xy);
    }

    void main() {
      vec2 velocity = sampleBilinear(uVelocityTexture, vTexCoord, 1.0 / uGridUnit).xy;
      vec2 stepX = vec2(uGridUnit, 0.0);
      vec2 stepY = vec2(0.0, uGridUnit);
      vec2 slope = vec2(
        heightAt(vTexCoord + stepX) - heightAt(vTexCoord - stepX),
        heightAt(vTexCoord + stepY) - heightAt(vTexCoord - stepY)
      ) / (2.0 * uGridUnit);
      vec3 normal = normalize(vec3(-slope * uNormalStrength, 1.0));
      vec3 color;

      if (uColorMode == 2) {
        color = vec3(0.2, 0.5, 0.8) - vec3(velocity, dot(velocity, velocity));
      } else if (uColorMode == 1) {
        color = normal * 0.5 + 0.5;
      } else {
        float intensity = 1.0 - exp(-length(velocity) * uColorScale);
        float light = 0.4 + 0.6 * max(dot(normal, normalize(vec3(-0.4, 0.6, 1.0))), 0.0);
        color = mix(uBaseColor, uHighlightColor, intensity) * light;
      }

      gl_FragColor = vec4(color, 1.0);
    }`;

  const command = {
    pipeline: ctx.pipeline({ vert: screenVertexShader, frag: fragmentShader }),
    attributes,
    indices,
  };

  return function waterRenderer() {
    const { parameters } = app.state.water;
    ctx.submit(command, {
      pass: passFor(textures.color1),
      uniforms: {
        uVelocityTexture: textures.velocity1,
        uGridUnit: parameters.gridUnit,
        uNormalStrength: parameters.normalStrength,
        uColorScale: parameters.colorScale,
        uColorMode: modes[parameters.colorMode] ?? modes.surface,
        uBaseColor: parameters.baseColor,
        uHighlightColor: parameters.highlightColor,
      },
    });
  };
}
