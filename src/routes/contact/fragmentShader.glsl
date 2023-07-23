#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float time;
uniform sampler2D texture1;
uniform vec2 u_mouse;
precision highp float;
uniform float distanceFromCenter;
uniform vec4 resolution;
varying vec2 vUv;
varying vec3 vPosition;
float PI = 3.141592653589793238;


float random (in vec2 _st) {
    return fract(sin(dot(_st.xy,
                         vec2(12.9898,78.233)))*
        43758.5453123);
}

// Based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
float noise (in vec2 _st) {
    vec2 i = floor(_st);
    vec2 f = fract(_st);

    // Four corners in 2D of a tile
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}

#define NUM_OCTAVES 10

float fbm ( in vec2 _st) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    // Rotate to reduce axial bias
    mat2 rot = mat2(cos(0.1), sin(0.5),
                    -sin(0.5), cos(0.1));
    for (int i = 0; i < NUM_OCTAVES; ++i) {
        v += a * noise(_st);
        _st = rot * _st * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

void main() {
    vec2 st = gl_FragCoord.xy/u_resolution.xy*3.;
    st += st * abs(sin(u_time*0.1)*0.01);
    vec3 color = vec3(0.0);

    vec2 q = vec2(0.);
    q.x = fbm( st + 0.1*u_time);
    q.y = fbm( st + vec2(0.4));

    vec2 r = vec2(0.);
    r.x = fbm( st + 2.0*q + vec2(1.7,9.2)+ 0.0015*u_mouse );
    r.y = fbm( st + 2.0*q + vec2(8.3,2.8)+ 0.00126*u_mouse);

    float f = fbm(st+r);

    color = mix(vec3(0.01961,0.019608,0.666667),
                vec3(0.966667,0.166667,0.498039),
                clamp((f*f)*2.0,0.0,1.0));

    color = mix(color,
                vec3(u_time * 0.001,u_time * 0.02,0.564706),
                clamp(length(q),0.0,1.0));

    color = mix(color,
                vec3(0.066667,1,1),
                clamp(length(r.x),0.0,1.0));

    gl_FragColor = vec4((f*f*f+.2*f*f+.5*f)*color,1.);
}
