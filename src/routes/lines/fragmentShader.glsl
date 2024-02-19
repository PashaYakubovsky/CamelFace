#include <packing>
precision mediump float; // Sets default precision for floating-point variables

varying vec2 vUv;
varying vec2 vUv1;
uniform vec2 uMouse;
uniform float uTime;
uniform float uCameraNear;
uniform float uCameraFar;
uniform sampler2D uDepths;
varying vec3 vPos;



float readDepth(sampler2D depths, vec2 coord) {
    float fragCoordZ = texture2D(depths, coord).x;
    float viewZ = perspectiveDepthToViewZ(fragCoordZ, uCameraNear, uCameraFar);
    return viewZToOrthographicDepth(viewZ, uCameraNear, uCameraFar);
}


void main() {
    vec2 uv = vUv;
    float depth = readDepth(uDepths, vUv1);

    vec3 c1 = vec3(0.27, 0.78, 0.93);;
    vec3 c2 = vec3(1.0, 0.12, 0.09);

    vec3 color = vec3(1.0 - depth) * mix(c1, c2, depth);
    color += mix(color, vec3(0.1, 0.0, 0.7), 0.5);

    gl_FragColor.rgb = color;
    gl_FragColor.a = 1.0;
    // gl_FragColor.a = 1.0 - depth;
}
