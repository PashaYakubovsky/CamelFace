uniform float uTime;
uniform float uSize;
attribute vec3 color;
varying vec2 vUv;
varying vec2 vPosition;
varying vec3 vColor;
varying vec3 worldPosition;
attribute float index;
uniform float uCount;
float PI = 3.141592653589793;

 void main() {
    vUv = position.xy + vec2(0.5);
    worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    vPosition = worldPosition.xz;

    vColor = color;

    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * (1000.0 / length(gl_Position.xyz));
}