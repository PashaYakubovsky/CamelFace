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

    if(uTime < 1.0) {
        gl_FragColor = vec4(col, 1.0);
        return;
    }

    for(float j = 0.0; j < 2.0; j++){
        for(float i = 1.0; i < 10.0; i++){
            p.x += 0.5 / (i + j) * cos(i * 10.0 * p.y + uTime * 0.1 + sin((uMouse.x / (1. * i + j)) * i + j));
            p.y += 0.5 / (i + j)* cos(i * 10.0 * p.x + uTime * 0.1 + sin((uMouse.y / (1. * i)) * i + j));
        }
        col[int(j)] = sin(.9 * 7.0*sq(p.x)) + sin(5.0*sq(p.y));
    }

   
    col = mix(col, uColor, 0.5);

    gl_FragColor = vec4(col, 0.1);
}