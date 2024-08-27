uniform float uTime;
varying vec2 vUv;
uniform vec3 uColor;
uniform float uFactor;
uniform vec2 uMouse;
uniform vec2 uResolution;
uniform float uSpeed;
uniform bool uEnabled;
uniform vec3 uPrevColor;

float sq(float x) {
    return x * x;
}
vec3 lerp(vec3 start, vec3 end, float factor) {
    return start + factor * (end - start);
}

void main() {
    vec2 fragCoord = gl_FragCoord.xy * 0.1;
    vec2 p = fragCoord/uResolution.xy;
    vec3 col = lerp(uPrevColor, uColor, uFactor);

    gl_FragColor = vec4(col, 1.0);
}