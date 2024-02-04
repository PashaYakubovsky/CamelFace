uniform float uTime;
uniform float uSize;
uniform float uDepth;
varying vec2 vUv;
attribute vec3 color;
varying vec3 vColor;

void main() {
    vUv = uv;
    // vertex shader
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;

    vColor = color;

    gl_Position = projectionMatrix * viewPosition;
}