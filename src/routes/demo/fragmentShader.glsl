#ifdef GL_ES
precision mediump float;
#endif

uniform float u_count;
uniform vec3 u_color;
uniform vec2 u_resolution;
uniform float u_octaves;
uniform float u_time;
uniform sampler2D texture1;
uniform vec2 u_mouse;
uniform float distanceFromCenter;
varying vec2 vUv;
varying vec3 vPosition;
float PI = 3.141592653589793238;



void main() {
      // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = vUv - vec2(0.5);
    // uv.x *= u_resolution.x/u_resolution.y;
    uv *= 6.;
    vec3 col;
    float count = u_count;
    float Factor = mod(u_time,u_octaves);
    for(float i = 0. ;i< count;i++){
         float r = 2.;
         float theta = (2. * 3.14)/count;
         theta *= i;
         vec2 a = r * vec2(cos(theta),sin(theta));

         vec2 b = r * vec2(cos(theta * Factor + 3.14),sin(theta * Factor + 3.14));
        //  col += .001/length(uv  -a);
        //  col += .001/length(uv  -b);
         float m = (a.y - b.y)/(a.x - b.x);
     
        float d = .0002/abs(uv.y - a.y - m*(uv.x - a.x));
        if(length(uv) < r) {
            col += d;
            // col += .0002/length(uv  -a);
        }
    }
     
    vec4 fragColor = vec4(col,1.0);

    // apply color
    fragColor.rgb *= u_color;

    gl_FragColor = fragColor;
}
