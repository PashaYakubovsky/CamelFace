precision mediump float; // Sets default precision for floating-point variables

varying vec2 vUv;
varying vec2 vPosition;
varying vec3 worldPosition;
uniform vec2 uMouse;
uniform float uTime;
uniform vec2 uResolution;
varying vec4 vColor;

uniform sampler2D uTexture;

uniform sampler2D uPositions;


void main() {
    vec2 uv = vUv;
    gl_FragColor = vColor;

}
