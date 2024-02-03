#ifdef GL_ES
precision mediump float;
#endif

uniform bool u_mouse_mode;
uniform bool u_scroll_mode;
uniform float u_m_count;
uniform float u_zoom;
uniform vec3 u_color;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform float distanceFromCenter;
varying vec2 vUv;
varying vec3 vPosition;
float PI = 3.141592653589793238;

vec3 mandelbrotForN(vec2 c, float n) {
  vec2 z = c;
  for (float i = 0.0; i < n; i++) {
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    if (length(z) > 2.0) {
      return vec3(1.0 - i / n);
    }
  }
  return vec3(0.0);
}

void main() {
  vec2 c = vUv * 4.0 - 2.0;
  c.y *= u_resolution.y / u_resolution.x;
  c /= u_zoom;
  c.x += u_mouse.x / u_resolution.x - 0.5;
  c.y -= u_mouse.y / u_resolution.y - 0.5;

  vec3 color = mandelbrotForN(c, u_m_count);
  gl_FragColor = vec4(color, 1.0);
}
