precision mediump float; // Sets default precision for floating-point variables

uniform sampler2D uTexture;
varying vec2 vUv;
varying vec3 vColor;

void main() {
	vec3 color = vec3(vUv.x, vUv.y, 0.0);
	gl_FragColor = vec4(color, 1.0);
}