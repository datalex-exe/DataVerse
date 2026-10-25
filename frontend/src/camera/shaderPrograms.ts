// Unified high-performance WebGL shader pipeline for camera effects

export const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

export const FRAGMENT_SHADER_SOURCE = `
precision highp float;

varying vec2 v_texCoord;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_time;

// Color Grading Uniforms
uniform float u_brightness;     // -1.0 to 1.0 (default: 0.0)
uniform float u_contrast;       // 0.0 to 3.0 (default: 1.0)
uniform float u_saturation;     // 0.0 to 3.0 (default: 1.0)
uniform float u_warmth;         // -1.0 to 1.0 (default: 0.0)
uniform float u_tint;           // -1.0 to 1.0 (default: 0.0)
uniform float u_sepia;          // 0.0 to 1.0 (default: 0.0)
uniform float u_vignette;       // 0.0 to 1.0 (default: 0.0)
uniform float u_grain;          // 0.0 to 1.0 (default: 0.0)
uniform float u_bloom;          // 0.0 to 1.0 (default: 0.0)
uniform float u_blackLevel;     // 0.0 to 0.5 (default: 0.0)
uniform vec3 u_tintColor;       // Color tint overlay (RGB)
uniform float u_tintOpacity;    // 0.0 to 1.0 (default: 0.0)
uniform float u_letterbox;      // 0.0 or 1.0

// Light Leak Uniforms
uniform int u_lightLeakType;    // 0: none, 1: pink, 2: blue, 3: golden, 4: rainbow, 5: sunset
uniform float u_lightLeakIntensity;

// Distortion Mode
// 0: none, 1: bulge-eyes, 2: alien, 3: wave, 4: kaleidoscope, 5: mirror-horizontal,
// 6: quad-mirror, 7: rgb-glitch, 8: pixelate, 9: neon-outline, 10: comic, 11: sketch,
// 12: pop-art, 13: double-vision, 14: chromatic-shift, 15: posterize, 16: vortex-swirl
uniform int u_distortionMode;
uniform vec2 u_eyeLeft;
uniform vec2 u_eyeRight;
uniform vec2 u_faceCenter;
uniform float u_distortionFactor;

// Pseudo-random generator for film grain and glitch
float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

// Convert RGB to HSL
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

// Convert HSL to RGB
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Bulge distortion around a coordinate
vec2 bulge(vec2 uv, vec2 center, float radius, float strength) {
  vec2 delta = uv - center;
  float dist = length(delta);
  if (dist < radius) {
    float percent = 1.0 - ((radius - dist) / radius) * strength;
    percent = percent * percent;
    return center + delta * percent;
  }
  return uv;
}

// Swirl vortex distortion
vec2 swirl(vec2 uv, vec2 center, float radius, float angle) {
  vec2 delta = uv - center;
  float dist = length(delta);
  if (dist < radius) {
    float percent = (radius - dist) / radius;
    float theta = percent * percent * angle;
    float s = sin(theta);
    float c = cos(theta);
    return center + vec2(dot(delta, vec2(c, -s)), dot(delta, vec2(s, c)));
  }
  return uv;
}

void main() {
  vec2 uv = v_texCoord;

  // 1. APPLY DISTORTIONS (GEOMETRIC WARPING)
  if (u_distortionMode == 1) {
    // Big eyes bulge
    uv = bulge(uv, u_eyeLeft, 0.12, 0.55);
    uv = bulge(uv, u_eyeRight, 0.12, 0.55);
  } else if (u_distortionMode == 2) {
    // Alien face: enlarged forehead, pinched chin
    vec2 forehead = vec2(u_faceCenter.x, u_faceCenter.y - 0.18);
    vec2 chin = vec2(u_faceCenter.x, u_faceCenter.y + 0.22);
    uv = bulge(uv, forehead, 0.28, 0.45);
    uv = bulge(uv, chin, 0.20, -0.35);
    uv = bulge(uv, u_eyeLeft, 0.11, 0.4);
    uv = bulge(uv, u_eyeRight, 0.11, 0.4);
  } else if (u_distortionMode == 3) {
    // Water ripple wave distortion
    float wave = sin(uv.y * 22.0 + u_time * 2.5) * 0.02;
    uv.x += wave;
  } else if (u_distortionMode == 4) {
    // 8-segment Kaleidoscope
    vec2 p = uv - vec2(0.5);
    float r = length(p);
    float a = atan(p.y, p.x);
    float tau = 6.2831853;
    float seg = tau / 8.0;
    a = mod(a, seg);
    if (a > seg * 0.5) a = seg - a;
    a += u_time * 0.2;
    uv = vec2(0.5) + vec2(cos(a), sin(a)) * r;
  } else if (u_distortionMode == 5) {
    // Mirror World (horizontal symmetry)
    uv.x = abs(uv.x - 0.5) + 0.25;
  } else if (u_distortionMode == 6) {
    // Quad mirror
    uv.x = abs(uv.x - 0.5) * 2.0;
    uv.y = abs(uv.y - 0.5) * 2.0;
  } else if (u_distortionMode == 8) {
    // Pixelate
    float pixelSize = 0.02;
    uv = floor(uv / pixelSize) * pixelSize;
  } else if (u_distortionMode == 16) {
    // Dream vortex swirl
    uv = swirl(uv, vec2(0.5), 0.48, 2.2);
  }

  // 2. SAMPLE BASE TEXTURE (WITH OPTIONAL CHROMATIC/GLITCH/DOUBLE VISION)
  vec4 color = vec4(1.0);

  if (u_distortionMode == 7) {
    // RGB Glitch channel displacement
    float slice = step(0.85, sin(uv.y * 30.0 + u_time * 8.0));
    float offset = (rand(vec2(u_time, uv.y)) - 0.5) * 0.05 * slice;
    float r = texture2D(u_image, uv + vec2(0.02 + offset, 0.0)).r;
    float g = texture2D(u_image, uv + vec2(offset * 0.5, 0.0)).g;
    float b = texture2D(u_image, uv - vec2(0.02 - offset, 0.0)).b;
    color = vec4(r, g, b, 1.0);
  } else if (u_distortionMode == 13) {
    // Double vision
    vec4 baseCol = texture2D(u_image, uv);
    vec4 ghostCol = texture2D(u_image, uv + vec2(0.04 * sin(u_time), 0.02));
    color = mix(baseCol, ghostCol, 0.45);
  } else if (u_distortionMode == 14) {
    // Radial Chromatic Shift
    vec2 dir = uv - vec2(0.5);
    float dist = length(dir);
    float r = texture2D(u_image, uv + dir * 0.03 * dist).r;
    float g = texture2D(u_image, uv).g;
    float b = texture2D(u_image, uv - dir * 0.03 * dist).b;
    color = vec4(r, g, b, 1.0);
  } else if (u_distortionMode == 9) {
    // Neon Outline (Sobel Filter)
    vec2 step = 1.0 / u_resolution;
    vec3 cL = texture2D(u_image, uv - vec2(step.x, 0.0)).rgb;
    vec3 cR = texture2D(u_image, uv + vec2(step.x, 0.0)).rgb;
    vec3 cU = texture2D(u_image, uv - vec2(0.0, step.y)).rgb;
    vec3 cD = texture2D(u_image, uv + vec2(0.0, step.y)).rgb;
    float edge = length(cL - cR) + length(cU - cD);
    edge = smoothstep(0.12, 0.4, edge);
    color = vec4(vec3(0.0, 1.0, 0.8) * edge * 2.0, 1.0);
  } else if (u_distortionMode == 10) {
    // Comic Book Halftone & Inking
    vec4 src = texture2D(u_image, uv);
    vec3 posterized = floor(src.rgb * 5.0) / 4.0;
    vec2 grid = fract(uv * u_resolution / 4.0) - vec2(0.5);
    float dot = step(length(grid), 0.45 * (1.0 - (src.r + src.g + src.b) / 3.0));
    color = vec4(mix(posterized, vec3(0.05), dot * 0.6), 1.0);
  } else if (u_distortionMode == 11) {
    // Pencil Sketch
    vec2 step = 1.5 / u_resolution;
    float edge = length(texture2D(u_image, uv - step).rgb - texture2D(u_image, uv + step).rgb);
    float sketch = clamp(1.0 - edge * 4.0, 0.0, 1.0);
    color = vec4(vec3(sketch * 0.95), 1.0);
  } else if (u_distortionMode == 12) {
    // Andy Warhol 4-quadrant Pop Art
    vec2 quadUV = fract(uv * 2.0);
    vec4 src = texture2D(u_image, quadUV);
    float lum = dot(src.rgb, vec3(0.299, 0.587, 0.114));
    vec2 quadrant = floor(uv * 2.0);
    vec3 colA, colB;
    if (quadrant.x < 1.0 && quadrant.y < 1.0) {
      colA = vec3(0.9, 0.1, 0.3); colB = vec3(0.1, 0.9, 0.8);
    } else if (quadrant.x >= 1.0 && quadrant.y < 1.0) {
      colA = vec3(0.9, 0.8, 0.1); colB = vec3(0.5, 0.1, 0.8);
    } else if (quadrant.x < 1.0 && quadrant.y >= 1.0) {
      colA = vec3(0.1, 0.8, 0.3); colB = vec3(0.9, 0.3, 0.7);
    } else {
      colA = vec3(0.2, 0.3, 0.9); colB = vec3(0.95, 0.5, 0.1);
    }
    color = vec4(mix(colA, colB, lum), 1.0);
  } else {
    // Normal sampling
    color = texture2D(u_image, uv);
  }

  // 3. COLOR GRADING (BRIGHTNESS, CONTRAST, SATURATION, WHITE BALANCE)
  // Brightness
  color.rgb += u_brightness;

  // Lift Black Level (film fade / milky blacks)
  if (u_blackLevel > 0.0) {
    color.rgb = mix(vec3(u_blackLevel), color.rgb, 1.0 - u_blackLevel * 0.5);
  }

  // Contrast
  color.rgb = (color.rgb - 0.5) * u_contrast + 0.5;

  // Saturation
  float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  color.rgb = mix(vec3(luminance), color.rgb, u_saturation);

  // Warmth / Coolness Temperature Shift
  if (u_warmth > 0.0) {
    color.r += u_warmth * 0.16;
    color.g += u_warmth * 0.06;
    color.b -= u_warmth * 0.12;
  } else if (u_warmth < 0.0) {
    float cool = -u_warmth;
    color.r -= cool * 0.10;
    color.g += cool * 0.02;
    color.b += cool * 0.18;
  }

  // Tint (Green vs Magenta)
  if (u_tint != 0.0) {
    color.g += u_tint * 0.12;
    color.r -= u_tint * 0.06;
    color.b -= u_tint * 0.06;
  }

  // Sepia
  if (u_sepia > 0.0) {
    vec3 sepiaColor;
    sepiaColor.r = dot(color.rgb, vec3(0.393, 0.769, 0.189));
    sepiaColor.g = dot(color.rgb, vec3(0.349, 0.686, 0.168));
    sepiaColor.b = dot(color.rgb, vec3(0.272, 0.534, 0.131));
    color.rgb = mix(color.rgb, sepiaColor, u_sepia);
  }

  // Tint Color Overlay
  if (u_tintOpacity > 0.0) {
    color.rgb = mix(color.rgb, color.rgb * u_tintColor, u_tintOpacity);
  }

  // 4. LIGHT LEAKS AND ORGANIC EFFECTS
  if (u_lightLeakType == 1) {
    // Pink light leak (top-left)
    float d = length(v_texCoord - vec2(0.0, 0.0));
    float leak = smoothstep(0.8, 0.0, d) * u_lightLeakIntensity;
    color.rgb += vec3(0.95, 0.25, 0.55) * leak;
  } else if (u_lightLeakType == 2) {
    // Blue light leak (top-right)
    float d = length(v_texCoord - vec2(1.0, 0.0));
    float leak = smoothstep(0.8, 0.0, d) * u_lightLeakIntensity;
    color.rgb += vec3(0.1, 0.6, 0.95) * leak;
  } else if (u_lightLeakType == 3) {
    // Golden amber light leak (bottom-left)
    float d = length(v_texCoord - vec2(0.0, 1.0));
    float leak = smoothstep(0.9, 0.0, d) * u_lightLeakIntensity;
    color.rgb += vec3(0.95, 0.65, 0.15) * leak;
  } else if (u_lightLeakType == 4) {
    // Rainbow spectral beam
    float beam = smoothstep(0.12, 0.0, abs(v_texCoord.x + v_texCoord.y - 0.95));
    vec3 rainbow = 0.5 + 0.5 * cos(u_time * 0.5 + v_texCoord.xyx + vec3(0.0, 2.0, 4.0));
    color.rgb += rainbow * beam * u_lightLeakIntensity * 1.5;
  } else if (u_lightLeakType == 5) {
    // Sunset gradient wash
    float grad = v_texCoord.y;
    vec3 sunset = mix(vec3(0.95, 0.45, 0.1), vec3(0.5, 0.15, 0.7), grad);
    color.rgb = mix(color.rgb, color.rgb * sunset, u_lightLeakIntensity);
  }

  // 5. BLOOM / HIGHLIGHT GLOW
  if (u_bloom > 0.0) {
    float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    float highGlow = smoothstep(0.65, 1.0, lum);
    color.rgb += color.rgb * highGlow * u_bloom * 0.8;
  }

  // 6. FILM GRAIN
  if (u_grain > 0.0) {
    float noise = (rand(v_texCoord + fract(u_time * 17.13)) - 0.5) * u_grain;
    color.rgb += noise;
  }

  // 7. VIGNETTE
  if (u_vignette > 0.0) {
    vec2 coord = (v_texCoord - vec2(0.5)) * 2.0;
    float dist = length(coord);
    float vig = smoothstep(1.5, 0.7, dist * (u_vignette + 0.5));
    color.rgb *= vig;
  }

  // 8. CINEMA LETTERBOX
  if (u_letterbox > 0.5) {
    if (v_texCoord.y < 0.11 || v_texCoord.y > 0.89) {
      color.rgb = vec3(0.0);
    }
  }

  gl_FragColor = vec4(clamp(color.rgb, 0.0, 1.0), 1.0);
}
`;

export class WebGLShaderPipeline {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;
  private texture: WebGLTexture | null = null;

  // Uniform locations cache
  private uniforms: Record<string, WebGLUniformLocation | null> = {};

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      preserveDrawingBuffer: true,
    });

    if (!gl) {
      console.warn('WebGL not supported on this context');
      return;
    }

    this.gl = gl;
    this.initProgram();
  }

  private initProgram() {
    const gl = this.gl;
    if (!gl) return;

    const vShader = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fShader = this.compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    if (!vShader || !fShader) return;

    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Shader program link failed:', gl.getProgramInfoLog(program));
      return;
    }

    this.program = program;
    gl.useProgram(program);

    // Buffers for full-screen quad
    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const aPos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    this.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]),
      gl.STATIC_DRAW
    );

    const aTex = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(aTex);
    gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 0, 0);

    // Create video texture
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Cache uniform locations
    const uniformNames = [
      'u_image',
      'u_resolution',
      'u_time',
      'u_brightness',
      'u_contrast',
      'u_saturation',
      'u_warmth',
      'u_tint',
      'u_sepia',
      'u_vignette',
      'u_grain',
      'u_bloom',
      'u_blackLevel',
      'u_tintColor',
      'u_tintOpacity',
      'u_letterbox',
      'u_lightLeakType',
      'u_lightLeakIntensity',
      'u_distortionMode',
      'u_eyeLeft',
      'u_eyeRight',
      'u_faceCenter',
      'u_distortionFactor',
    ];

    for (const name of uniformNames) {
      this.uniforms[name] = gl.getUniformLocation(program, name);
    }
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl;
    if (!gl) return null;

    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  public render(
    video: HTMLVideoElement,
    width: number,
    height: number,
    filterParams: Record<string, any>,
    timeSec: number,
    faceData?: { eyeLeft: { x: number; y: number }; eyeRight: { x: number; y: number }; noseTip: { x: number; y: number } } | null
  ) {
    const gl = this.gl;
    if (!gl || !this.program) return;

    gl.viewport(0, 0, width, height);

    // Upload current video frame to texture
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

    gl.useProgram(this.program);

    // Resolution & Time
    if (this.uniforms.u_resolution) gl.uniform2f(this.uniforms.u_resolution, width, height);
    if (this.uniforms.u_time) gl.uniform1f(this.uniforms.u_time, timeSec);

    // Color Grading
    if (this.uniforms.u_brightness) gl.uniform1f(this.uniforms.u_brightness, filterParams.brightness || 0.0);
    if (this.uniforms.u_contrast) gl.uniform1f(this.uniforms.u_contrast, filterParams.contrast || 1.0);
    if (this.uniforms.u_saturation) gl.uniform1f(this.uniforms.u_saturation, filterParams.saturation || 1.0);

    // Warmth / Coolness
    let warmthVal = filterParams.warmth || 0.0;
    if (filterParams.coolness) warmthVal = -filterParams.coolness;
    if (this.uniforms.u_warmth) gl.uniform1f(this.uniforms.u_warmth, warmthVal);

    // Tint
    let tintVal = 0.0;
    if (filterParams.tintPink) tintVal = -filterParams.tintPink; // magenta
    if (filterParams.tintGreen) tintVal = filterParams.tintGreen;
    if (this.uniforms.u_tint) gl.uniform1f(this.uniforms.u_tint, tintVal);

    if (this.uniforms.u_sepia) gl.uniform1f(this.uniforms.u_sepia, filterParams.sepia || (filterParams.grayscale ? 0.0 : 0.0));
    if (filterParams.grayscale) {
      if (this.uniforms.u_saturation) gl.uniform1f(this.uniforms.u_saturation, 1.0 - (filterParams.grayscale || 1.0));
    }

    if (this.uniforms.u_vignette) gl.uniform1f(this.uniforms.u_vignette, filterParams.vignette || filterParams.radialVignette || 0.0);
    if (this.uniforms.u_grain) gl.uniform1f(this.uniforms.u_grain, filterParams.grain || 0.0);
    if (this.uniforms.u_bloom) gl.uniform1f(this.uniforms.u_bloom, filterParams.bloom || 0.0);
    if (this.uniforms.u_blackLevel) gl.uniform1f(this.uniforms.u_blackLevel, filterParams.blackLevel || 0.0);
    if (this.uniforms.u_letterbox) gl.uniform1f(this.uniforms.u_letterbox, filterParams.letterbox ? 1.0 : 0.0);

    // Specific Color Tint Overlays
    if (this.uniforms.u_tintColor && this.uniforms.u_tintOpacity) {
      if (filterParams.tealOrange) {
        gl.uniform3f(this.uniforms.u_tintColor, 1.0, 0.85, 0.65);
        gl.uniform1f(this.uniforms.u_tintOpacity, 0.25);
      } else if (filterParams.violetTint) {
        gl.uniform3f(this.uniforms.u_tintColor, 0.85, 0.65, 0.98);
        gl.uniform1f(this.uniforms.u_tintOpacity, filterParams.violetTint);
      } else if (filterParams.peachTint) {
        gl.uniform3f(this.uniforms.u_tintColor, 0.98, 0.8, 0.7);
        gl.uniform1f(this.uniforms.u_tintOpacity, filterParams.peachTint);
      } else if (filterParams.sageTint) {
        gl.uniform3f(this.uniforms.u_tintColor, 0.75, 0.9, 0.8);
        gl.uniform1f(this.uniforms.u_tintOpacity, filterParams.sageTint);
      } else if (filterParams.oceanTint) {
        gl.uniform3f(this.uniforms.u_tintColor, 0.2, 0.7, 0.95);
        gl.uniform1f(this.uniforms.u_tintOpacity, filterParams.oceanTint);
      } else if (filterParams.goldenTint || filterParams.goldenYellow) {
        gl.uniform3f(this.uniforms.u_tintColor, 0.98, 0.85, 0.4);
        gl.uniform1f(this.uniforms.u_tintOpacity, 0.22);
      } else {
        gl.uniform1f(this.uniforms.u_tintOpacity, 0.0);
      }
    }

    // Light Leaks
    let leakType = 0;
    let leakIntensity = 0.0;
    if (filterParams.leakColor === '#f43f5e' || filterParams.plasticLensFlare) {
      leakType = 1; leakIntensity = filterParams.intensity || 0.5;
    } else if (filterParams.leakColor === '#0ea5e9' || filterParams.anamorphicStreak) {
      leakType = 2; leakIntensity = filterParams.intensity || 0.5;
    } else if (filterParams.leakColor === '#f59e0b' || filterParams.sunburstAngle) {
      leakType = 3; leakIntensity = filterParams.flareIntensity || 0.5;
    } else if (filterParams.rainbowBeam || filterParams.ringPrism) {
      leakType = 4; leakIntensity = filterParams.beamOpacity || 0.45;
    } else if (filterParams.sunsetGradient) {
      leakType = 5; leakIntensity = filterParams.opacity || 0.4;
    }
    if (this.uniforms.u_lightLeakType) gl.uniform1i(this.uniforms.u_lightLeakType, leakType);
    if (this.uniforms.u_lightLeakIntensity) gl.uniform1f(this.uniforms.u_lightLeakIntensity, leakIntensity);

    // Distortion Mapping
    let distMode = 0;
    const dType = filterParams.distortionType;
    if (dType === 'bulge-eyes') distMode = 1;
    else if (dType === 'cartoon-caricature' || dType === 'alien-head') distMode = 2;
    else if (dType === 'water-wave') distMode = 3;
    else if (dType === 'kaleidoscope') distMode = 4;
    else if (dType === 'mirror-horizontal') distMode = 5;
    else if (dType === 'quad-mirror') distMode = 6;
    else if (dType === 'rgb-split' || filterParams.chromaticAberration) distMode = 7;
    else if (dType === 'pixelate-face' || filterParams.blockSize) distMode = 8;
    else if (dType === 'sobel-neon') distMode = 9;
    else if (dType === 'comic-halftone') distMode = 10;
    else if (dType === 'pencil-sketch') distMode = 11;
    else if (dType === 'warhol-4quad') distMode = 12;
    else if (dType === 'stereoscopic-ghost') distMode = 13;
    else if (dType === 'radial-chromatic') distMode = 14;
    else if (dType === 'posterize') distMode = 15;
    else if (dType === 'vortex-swirl') distMode = 16;

    if (this.uniforms.u_distortionMode) gl.uniform1i(this.uniforms.u_distortionMode, distMode);

    // Face Anchor coordinates (normalized 0-1)
    if (faceData) {
      if (this.uniforms.u_eyeLeft) gl.uniform2f(this.uniforms.u_eyeLeft, faceData.eyeLeft.x, faceData.eyeLeft.y);
      if (this.uniforms.u_eyeRight) gl.uniform2f(this.uniforms.u_eyeRight, faceData.eyeRight.x, faceData.eyeRight.y);
      if (this.uniforms.u_faceCenter) gl.uniform2f(this.uniforms.u_faceCenter, faceData.noseTip.x, faceData.noseTip.y);
    } else {
      if (this.uniforms.u_eyeLeft) gl.uniform2f(this.uniforms.u_eyeLeft, 0.38, 0.42);
      if (this.uniforms.u_eyeRight) gl.uniform2f(this.uniforms.u_eyeRight, 0.62, 0.42);
      if (this.uniforms.u_faceCenter) gl.uniform2f(this.uniforms.u_faceCenter, 0.5, 0.52);
    }

    // Draw full-screen quad
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  public dispose() {
    const gl = this.gl;
    if (!gl) return;

    if (this.program) gl.deleteProgram(this.program);
    if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);
    if (this.texCoordBuffer) gl.deleteBuffer(this.texCoordBuffer);
    if (this.texture) gl.deleteTexture(this.texture);

    this.program = null;
    this.gl = null;
  }
}

export { WebGLShaderPipeline as ShaderProgramPipeline };
