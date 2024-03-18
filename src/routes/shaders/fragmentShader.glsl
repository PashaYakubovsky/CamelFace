precision mediump float;

uniform vec2 uResolution;
uniform float time;
uniform sampler2D uTexture;
uniform sampler2D videoTexture;
uniform vec2 uMouse;
precision highp float;
uniform float distanceFromCenter;
uniform vec4 resolution;
varying vec2 vUv;
varying vec3 vPosition;
float PI = 3.141592653589793238;

float random (vec2 st) {
    return fract(sin(dot(st.xy,
                         vec2(12.9898,78.233)))*
        43758.5453123);
}

float sdfCircle(vec2 st, vec2 center, float radius) {
    return length(st - center) - radius;
}

void main() {
    vec2 uv = vUv;
    vec4 t = texture2D(uTexture, uv);
    vec4 vT = texture2D(videoTexture, uv);

    // replace texture with video if it's available
    if (vT.a > 0.0) {
        t = mix(vT, t, 1.0 - distanceFromCenter);
    }

    vec2 st = gl_FragCoord.xy/uResolution.xy;

    st *= 100.0; // Scale the coordinate system by 10
    vec2 ipos = floor(st);  // get the integer coords
    vec2 fpos = fract(st);  // get the fractional coords

    float bw = (t.r + t.g + t.b) / 3.0;

    float d = sdfCircle(uMouse, vec2(uv.x, uv.y - 0.5), .001);
    
    // apply the distance field to the color
    vec4 circle = vec4(vec3(1.0 - d), 1.0);
    t = mix(t, circle, 0.2);
    
    // Assign a random value based on the integer coord
    vec3 color = vec3(random( ipos ));
    vec4 another = mix(vec4(bw, bw, bw, 1.0), vec4(color / 2., 1.0), 0.1);

    gl_FragColor = mix(another, t, distanceFromCenter);
    gl_FragColor.a = clamp(distanceFromCenter, 0.5, 1.0);
}