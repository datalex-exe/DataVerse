/**
 * High-Performance WebGL Camera Filter Engine
 * Single-pass WebGL fragment shader applying 200 real-time color grades,
 * temperature/tint, film grain, bloom, vignette, sharpness, and smooth skin.
 * Includes 2D canvas fallback for maximum compatibility.
 */

import { ShaderParams } from './types';

// Vertex Shader: full-screen quad with texture coordinate transformation (mirroring & zoom)
const VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_texCoord;
uniform float u_zoom;
uniform vec2 u_pan;
uniform float u_mirror;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  
  // Transform [-1, 1] clip space to [0, 1] UV space
  vec2 uv = (a_position + 1.0) * 0.5;
  // Video textures have Y inverted in WebGL
  uv.y = 1.0 - uv.y;

  // Horizontal mirror for front camera
  if (u_mirror > 0.5) {
    uv.x = 1.0 - uv.x;
  }

  // Digital zoom from center
  vec2 center = vec2(0.5) + u_pan;
  v_texCoord = center + (uv - center) / max(u_zoom, 1.0);
}
`;

// Fragment Shader: all photographic adjustments in one single fast GPU pass
const FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;

// Adjustments
uniform float u_brightness;     // -1.0 to 1.0
uniform float u_contrast;       // 0.0 to 3.0
uniform float u_saturation;     // 0.0 to 3.0
uniform float u_hue;            // -PI to PI
uniform float u_temperature;    // -1.0 to 1.0
uniform float u_tint;           // -1.0 to 1.0
uniform float u_fade;           // 0.0 to 1.0
uniform float u_vignette;       // 0.0 to 1.0
uniform float u_grain;          // 0.0 to 1.0
uniform float u_bloom;          // 0.0 to 1.0
uniform float u_sharpness;      // 0.0 to 1.0
uniform float u_skinSmooth;     // 0.0 to 1.0
uniform vec3 u_shadowColor;     // RGB
uniform vec3 u_highlightColor;  // RGB
uniform float u_filterStrength; // 0.0 to 1.0

// Fast pseudo-random generator
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Hue rotation helper
vec3 rotateHue(vec3 col, float angle) {
  const vec3 k = vec3(0.57735, 0.57735, 0.57735);
  float cosAngle = cos(angle);
  return col * cosAngle + cross(k, col) * sin(angle) + k * dot(k, col) * (1.0 - cosAngle);
}

void main() {
  vec2 uv = v_texCoord;

  // Out of bounds clamp
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec4 baseSample = texture2D(u_texture, uv);
  vec3 rawColor = baseSample.rgb;
  vec3 color = rawColor;

  vec2 onePixel = vec2(1.0) / max(u_resolution, vec2(1.0));

  // 1. Smooth Skin / Bilateral blur approximation
  if (u_skinSmooth > 0.01) {
    vec3 cN = texture2D(u_texture, uv + vec2(0.0, onePixel.y * 1.5)).rgb;
    vec3 cS = texture2D(u_texture, uv - vec2(0.0, onePixel.y * 1.5)).rgb;
    vec3 cE = texture2D(u_texture, uv + vec2(onePixel.x * 1.5, 0.0)).rgb;
    vec3 cW = texture2D(u_texture, uv - vec2(onePixel.x * 1.5, 0.0)).rgb;
    vec3 avg = (cN + cS + cE + cW) * 0.25;

    // Preserve strong edges, smooth low-variance regions
    float diff = length(color - avg);
    float weight = clamp(1.0 - diff * 3.5, 0.0, 1.0) * u_skinSmooth * 0.75;
    color = mix(color, avg, weight);
  }

  // 2. Sharpness (Laplacian high-pass)
  if (u_sharpness > 0.01) {
    vec3 cN = texture2D(u_texture, uv + vec2(0.0, onePixel.y)).rgb;
    vec3 cS = texture2D(u_texture, uv - vec2(0.0, onePixel.y)).rgb;
    vec3 cE = texture2D(u_texture, uv + vec2(onePixel.x, 0.0)).rgb;
    vec3 cW = texture2D(u_texture, uv - vec2(onePixel.x, 0.0)).rgb;
    vec3 edges = color * 4.0 - (cN + cS + cE + cW);
    color += edges * u_sharpness * 0.45;
  }

  // 3. Brightness
  color += u_brightness;

  // 4. Contrast
  color = (color - 0.5) * u_contrast + 0.5;

  // 5. Saturation
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(luma), color, u_saturation);

  // 6. Hue rotation
  if (abs(u_hue) > 0.001) {
    color = rotateHue(color, u_hue);
  }

  // 7. Temperature & Tint
  if (u_temperature > 0.0) {
    color.r += u_temperature * 0.16;
    color.g += u_temperature * 0.04;
    color.b -= u_temperature * 0.14;
  } else if (u_temperature < 0.0) {
    float cool = -u_temperature;
    color.r -= cool * 0.12;
    color.b += cool * 0.18;
  }

  if (abs(u_tint) > 0.01) {
    color.g -= u_tint * 0.12;
    color.r += u_tint * 0.06;
    color.b += u_tint * 0.06;
  }

  // 8. Split Toning
  float toneLuma = clamp(dot(color, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
  if (length(u_shadowColor) > 0.01) {
    float shadowWeight = (1.0 - toneLuma) * 0.35;
    color += u_shadowColor * shadowWeight;
  }
  if (length(u_highlightColor) > 0.01) {
    float highlightWeight = toneLuma * 0.35;
    color += u_highlightColor * highlightWeight;
  }

  // 9. Fade (Film lifted blacks)
  if (u_fade > 0.01) {
    color = mix(color, vec3(0.2, 0.2, 0.22), u_fade * 0.3);
  }

  // 10. Bloom (soft highlight dispersion)
  if (u_bloom > 0.01) {
    vec3 b1 = texture2D(u_texture, uv + onePixel * 4.0).rgb;
    vec3 b2 = texture2D(u_texture, uv - onePixel * 4.0).rgb;
    vec3 bloomAvg = (b1 + b2) * 0.5;
    float bloomWeight = smoothstep(0.55, 1.0, dot(bloomAvg, vec3(0.333))) * u_bloom * 0.65;
    color += bloomAvg * bloomWeight;
  }

  // 11. Vignette
  if (u_vignette > 0.01) {
    vec2 coord = (uv - 0.5) * vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);
    float dist = length(coord);
    float vig = smoothstep(0.75, 0.3, dist * (0.8 + u_vignette));
    color *= mix(1.0, vig, u_vignette);
  }

  // 12. Film Grain
  if (u_grain > 0.01) {
    float noise = random(uv * u_resolution + fract(u_time * 12.0));
    color += (noise - 0.5) * u_grain * 0.18;
  }

  // 13. Blend with original according to Filter Strength (0% to 100%)
  vec3 finalColor = mix(rawColor, color, u_filterStrength);

  gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), baseSample.a);
}
`;

export class WebGLFilterEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private isSupported: boolean = true;
  private uniformLocations: Record<string, WebGLUniformLocation | null> = {};

  constructor(targetCanvas: HTMLCanvasElement) {
    this.canvas = targetCanvas;
    this.initGL();
  }

  private initGL() {
    try {
      const gl =
        this.canvas.getContext('webgl', {
          alpha: false,
          depth: false,
          stencil: false,
          antialias: false,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
        }) || (this.canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);

      if (!gl) {
        console.warn('WebGL not available, falling back to 2D canvas');
        this.isSupported = false;
        return;
      }

      this.gl = gl;
      this.program = this.createProgram(VERTEX_SHADER, FRAGMENT_SHADER);

      if (!this.program) {
        this.isSupported = false;
        return;
      }

      // Full screen quad buffer
      this.positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      );

      // Create video texture
      this.texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      // Cache uniform locations
      gl.useProgram(this.program);
      const uniforms = [
        'u_zoom',
        'u_pan',
        'u_mirror',
        'u_resolution',
        'u_time',
        'u_brightness',
        'u_contrast',
        'u_saturation',
        'u_hue',
        'u_temperature',
        'u_tint',
        'u_fade',
        'u_vignette',
        'u_grain',
        'u_bloom',
        'u_sharpness',
        'u_skinSmooth',
        'u_shadowColor',
        'u_highlightColor',
        'u_filterStrength',
      ];
      for (const name of uniforms) {
        this.uniformLocations[name] = gl.getUniformLocation(this.program, name);
      }
    } catch (err) {
      console.warn('WebGL initialization failed:', err);
      this.isSupported = false;
    }
  }

  private createProgram(vSrc: string, fSrc: string): WebGLProgram | null {
    const gl = this.gl;
    if (!gl) return null;

    const vShader = gl.createShader(gl.VERTEX_SHADER);
    const fShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (!vShader || !fShader) return null;

    gl.shaderSource(vShader, vSrc);
    gl.compileShader(vShader);
    if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
      console.error('Vertex shader compile error:', gl.getShaderInfoLog(vShader));
      return null;
    }

    gl.shaderSource(fShader, fSrc);
    gl.compileShader(fShader);
    if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
      console.error('Fragment shader compile error:', gl.getShaderInfoLog(fShader));
      return null;
    }

    const prog = gl.createProgram();
    if (!prog) return null;
    gl.attachShader(prog, vShader);
    gl.attachShader(prog, fShader);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(prog));
      return null;
    }

    return prog;
  }

  /**
   * Render frame to canvas with full shader parameters
   */
  public render(
    source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
    params: ShaderParams = {},
    options: {
      mirror?: boolean;
      zoom?: number;
      filterStrength?: number;
      time?: number;
      width?: number;
      height?: number;
    } = {}
  ): boolean {
    const gl = this.gl;
    if (!gl || !this.program || !this.isSupported) {
      // 2D fallback
      return this.renderFallback2D(source, params, options);
    }

    const width = options.width || this.canvas.width;
    const height = options.height || this.canvas.height;

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    gl.viewport(0, 0, width, height);

    // Upload video/image frame to GPU texture
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

    gl.useProgram(this.program);

    // Setup attribute
    const posLoc = gl.getAttribLocation(this.program, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Pass uniforms
    const u = this.uniformLocations;
    if (u.u_zoom) gl.uniform1f(u.u_zoom, options.zoom || 1.0);
    if (u.u_pan) gl.uniform2f(u.u_pan, 0.0, 0.0);
    if (u.u_mirror) gl.uniform1f(u.u_mirror, options.mirror ? 1.0 : 0.0);
    if (u.u_resolution) gl.uniform2f(u.u_resolution, width, height);
    if (u.u_time) gl.uniform1f(u.u_time, options.time || 0.0);

    if (u.u_brightness) gl.uniform1f(u.u_brightness, params.brightness ?? 0.0);
    if (u.u_contrast) gl.uniform1f(u.u_contrast, params.contrast ?? 1.0);
    if (u.u_saturation) gl.uniform1f(u.u_saturation, params.saturation ?? 1.0);
    if (u.u_hue) gl.uniform1f(u.u_hue, params.hue ?? 0.0);
    if (u.u_temperature) gl.uniform1f(u.u_temperature, params.temperature ?? 0.0);
    if (u.u_tint) gl.uniform1f(u.u_tint, params.tint ?? 0.0);
    if (u.u_fade) gl.uniform1f(u.u_fade, params.fade ?? 0.0);
    if (u.u_vignette) gl.uniform1f(u.u_vignette, params.vignette ?? 0.0);
    if (u.u_grain) gl.uniform1f(u.u_grain, params.grain ?? 0.0);
    if (u.u_bloom) gl.uniform1f(u.u_bloom, params.bloom ?? 0.0);
    if (u.u_sharpness) gl.uniform1f(u.u_sharpness, params.sharpness ?? 0.0);
    if (u.u_skinSmooth) gl.uniform1f(u.u_skinSmooth, params.skinSmooth ?? 0.0);

    if (u.u_shadowColor) {
      const sc = params.shadowColor || [0, 0, 0];
      gl.uniform3f(u.u_shadowColor, sc[0], sc[1], sc[2]);
    }
    if (u.u_highlightColor) {
      const hc = params.highlightColor || [0, 0, 0];
      gl.uniform3f(u.u_highlightColor, hc[0], hc[1], hc[2]);
    }

    const strength = options.filterStrength !== undefined ? options.filterStrength : 1.0;
    if (u.u_filterStrength) gl.uniform1f(u.u_filterStrength, strength);

    // Draw full-screen quad
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    return true;
  }

  /**
   * 2D Canvas Fallback if WebGL is unavailable
   */
  private renderFallback2D(
    source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
    params: ShaderParams,
    options: { mirror?: boolean; zoom?: number; width?: number; height?: number }
  ): boolean {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return false;

    const width = options.width || this.canvas.width;
    const height = options.height || this.canvas.height;
    this.canvas.width = width;
    this.canvas.height = height;

    ctx.save();
    if (options.mirror) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    // Build CSS filter string
    const filters: string[] = [];
    if (params.brightness) filters.push(`brightness(${1 + params.brightness})`);
    if (params.contrast) filters.push(`contrast(${params.contrast})`);
    if (params.saturation) filters.push(`saturate(${params.saturation})`);
    if (params.hue) filters.push(`hue-rotate(${params.hue * (180 / Math.PI)}deg)`);
    if (params.temperature && params.temperature > 0) filters.push(`sepia(${params.temperature * 0.4})`);

    ctx.filter = filters.length > 0 ? filters.join(' ') : 'none';

    const zoom = options.zoom || 1.0;
    const sw = width / zoom;
    const sh = height / zoom;
    const sx = (width - sw) / 2;
    const sy = (height - sh) / 2;

    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, width, height);
    ctx.restore();
    return true;
  }

  /**
   * Release all WebGL resources and textures
   */
  public dispose() {
    const gl = this.gl;
    if (!gl) return;

    if (this.program) gl.deleteProgram(this.program);
    if (this.texture) gl.deleteTexture(this.texture);
    if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);

    this.program = null;
    this.texture = null;
    this.positionBuffer = null;
    this.gl = null;
  }
}
