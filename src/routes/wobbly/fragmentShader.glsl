uniform vec3 uColor;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uTime;

varying float vWobble;

void main() {
    float colorMix = smoothstep(-1.0, 1.0, vWobble);
    vec3 color = mix(uColor, uColor2, colorMix);
    csm_DiffuseColor.rgb = mix(color, uColor3, sin(colorMix));
}