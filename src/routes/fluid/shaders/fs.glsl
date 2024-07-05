uniform vec2 uMouse;
uniform vec2 uResolution;

varying vec2 vUv;

void main() {
    vec2 uv =vUv;
    vec2 mouse = uMouse / uResolution.xy;

    float d = distance(uv, mouse * 2.0);
    float c = 1.0 - d;
   
    gl_FragColor = vec4(vec3(c), 1.0);
}

