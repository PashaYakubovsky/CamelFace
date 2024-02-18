uniform float uTime;
varying vec2 vUv;
uniform sampler2D uPositions;

void main() {
  vUv = uv;
  vec3 pos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = 50. * (1. / -gl_Position.z);
}

