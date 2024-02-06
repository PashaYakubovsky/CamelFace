precision mediump float; // Sets default precision for floating-point variables

varying vec2 vUv;
varying vec2 vPosition;
varying vec3 worldPosition;
varying vec3 vColor;
uniform vec2 uMouse;
uniform float uTime;
uniform vec2 uResolution;

uniform sampler2D uTexture;




void main() {
    // vec4 tex = texture2D(uTexture, gl_PointCoord);
    vec4 tex = texture2D(uTexture, vUv);
    // flip y axis
    tex = texture2D(uTexture, vec2(vUv.x, 1.0 - vUv.y));

    gl_FragColor = vec4(tex.rgb, 1.0);

}
