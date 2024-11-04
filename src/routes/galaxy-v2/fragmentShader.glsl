uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;
uniform float uSize;

void main() {
    vec2 uv = gl_PointCoord.xy;
    vec2 center = vec2(0.5, 0.5);
    float d = distance(uv, center);
    vec3 color1 = mix(uColor1, uColor2, uColor3);
    vec3 color = mix(color1, color1, d);

    vec4 tex = texture2D(uTexture, gl_PointCoord);

    gl_FragColor = vec4(color, tex.z);
}