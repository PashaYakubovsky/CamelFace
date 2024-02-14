precision mediump float; // Sets default precision for floating-point variables

varying vec2 vUv;
varying vec2 vPosition;
varying vec3 worldPosition;
varying vec3 vColor;
uniform vec2 uMouse;
uniform float uTime;
uniform vec2 uResolution;




void main() {
    vec2 uv = vUv;

    vec3 color = vec3(0.0);

    float d = distance(uv, vec2(0.5));

    color = vec3(.5, 5.0, 9.0) * smoothstep(0.5, 0.5, d);

    gl_FragColor = vec4(color, 1.0);

}
