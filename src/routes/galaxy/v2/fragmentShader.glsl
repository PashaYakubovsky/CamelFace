precision mediump float; // Sets default precision for floating-point variables

varying vec2 vUv;
varying vec2 vPosition;
varying vec3 worldPosition;
varying vec3 vColor;


uniform sampler2D uTexture;


void main() {
	vec4 texColor = texture2D(uTexture, vUv);
    gl_FragColor = vec4(vec3(vUv, 1.0), 1.0);
}