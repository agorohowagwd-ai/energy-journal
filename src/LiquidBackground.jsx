import { useEffect, useRef } from "react"

// Full-bleed iridescent "liquid" backdrop for the landing page, in the spirit of
// the Monopo hero: slow domain-warped noise mapped to mint / amber / oxblood on
// black, with a thin-film sheen and a soft pull toward the cursor.
// Falls back silently (renders nothing) when WebGL is unavailable, so the CSS
// gradient animation underneath stays visible.

const VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 3; i++) {
    v += a * snoise(p);
    p = rot * p * 1.8;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res.xy) / min(u_res.x, u_res.y);
  float t = u_time * 0.022;

  // cursor pulls the liquid gently
  vec2 aspect = u_res.xy / min(u_res.x, u_res.y);
  vec2 m = (u_mouse - 0.5) * aspect;
  p += (m - p) * exp(-2.2 * length(p - m)) * 0.2;

  // silky folds: two-level domain warp at a large scale
  p *= 0.5;
  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, -t * 0.7)));
  vec2 r = vec2(fbm(p + 1.4 * q + vec2(1.7, 9.2) + t * 0.5),
                fbm(p + 1.4 * q + vec2(8.3, 2.8) - t * 0.4));
  float f = fbm(p + 1.5 * r);

  vec3 oxblood = vec3(0.647, 0.176, 0.145);
  // muted amber: the reference #ffac2e pulled toward bronze so it glows rather than shouts
  vec3 amber   = vec3(0.72, 0.47, 0.20);
  vec3 mint    = vec3(0.627, 0.878, 0.671);

  // restrained palette: oxblood -> amber across the folds
  vec3 hue = mix(oxblood * 0.85, amber, smoothstep(0.05, 0.65, f + 0.3 * r.x));

  // most of the frame stays black; light lives on the raised folds
  float light = smoothstep(-0.05, 0.55, f + 0.25 * q.y);
  vec3 col = hue * light * 0.72;

  // thin glossy highlight that catches a little mint
  float crest = pow(0.5 + 0.5 * sin((f * 2.0 + r.y) * 3.0 + t * 1.5), 7.0) * light;
  col += mix(vec3(1.0), mint, 0.6) * crest * 0.12;

  // vignette and a calmer lower-left where the text sits
  float vig = 1.0 - smoothstep(0.35, 1.3, length((uv - vec2(0.55, 0.6)) * vec2(1.0, 1.2)));
  col *= mix(0.25, 1.0, vig);
  col *= mix(0.5, 1.0, smoothstep(0.0, 0.7, uv.y + uv.x * 0.2));

  gl_FragColor = vec4(col, 1.0);
}
`

export default function LiquidBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" })
    if (!gl) {
      canvas.style.display = "none"
      return
    }

    function compile(type, source) {
      const shader = gl.createShader(type)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn(gl.getShaderInfoLog(shader))
        return null
      }
      return shader
    }

    const vs = compile(gl.VERTEX_SHADER, VERTEX)
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT)
    if (!vs || !fs) {
      canvas.style.display = "none"
      return
    }
    const program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      canvas.style.display = "none"
      return
    }
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(program, "a_pos")
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(program, "u_res")
    const uTime = gl.getUniformLocation(program, "u_time")
    const uMouse = gl.getUniformLocation(program, "u_mouse")

    // Render below native resolution: the image is soft anyway and it keeps phones cool.
    const scale = Math.min(window.devicePixelRatio || 1, 2) * 0.5
    function resize() {
      const w = Math.max(1, Math.floor(canvas.clientWidth * scale))
      const h = Math.max(1, Math.floor(canvas.clientHeight * scale))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
    }

    const target = { x: 0.5, y: 0.55 }
    const mouse = { x: 0.5, y: 0.55 }
    function onMove(event) {
      const rect = canvas.getBoundingClientRect()
      const point = event.touches ? event.touches[0] : event
      target.x = (point.clientX - rect.left) / rect.width
      target.y = 1 - (point.clientY - rect.top) / rect.height
    }
    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("touchmove", onMove, { passive: true })

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    const speed = reduced ? 0.3 : 1
    const start = performance.now()
    let frame = 0

    function draw(now) {
      resize()
      mouse.x += (target.x - mouse.x) * 0.04
      mouse.y += (target.y - mouse.y) * 0.04
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uTime, ((now - start) / 1000) * speed + 20.0)
      gl.uniform2f(uMouse, mouse.x, mouse.y)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    // WebGL works: hide the CSS gradient fallback underneath.
    const host = canvas.parentElement
    host?.classList.add("liquid-on")

    return () => {
      host?.classList.remove("liquid-on")
      cancelAnimationFrame(frame)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("touchmove", onMove)
      gl.getExtension("WEBGL_lose_context")?.loseContext()
    }
  }, [])

  return <canvas ref={canvasRef} className="liquid-canvas" aria-hidden="true" />
}
