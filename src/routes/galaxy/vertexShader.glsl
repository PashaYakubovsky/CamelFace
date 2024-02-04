uniform vec2 uMouse;
uniform float uTime;
uniform float uSize;
attribute float aRandom;

void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 0.8);

    gl_Position = projectionMatrix * viewMatrix * modelPosition;

    gl_PointSize = uSize * 10.0 / length(gl_Position.xyz);
}