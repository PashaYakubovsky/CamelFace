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

float sdTorus( vec3 p, vec2 t )
{
  vec2 q = vec2(length(p.xz)-t.x,p.y);
  return length(q)-t.y;
}

float sdTriPrism( vec3 p, vec2 h )
{
  vec3 q = abs(p);
  return max(q.z-h.y,max(q.x*0.866025+p.y*0.5,-p.y)-h.x*0.5);
}

float sdSphere( vec3 p, float s )
{
  return length(p)-s;
}

// rotate torus
vec3 rotate(vec3 p, float a) {
    float c = cos(a);
    float s = sin(a);
    mat2 m = mat2(c, -s, s, c);
    return vec3(m * p.xy, p.z);
}

vec2 rotate2d(vec2 _st, float _angle){
    _st -= 0.5;
    _st =  mat2(cos(_angle),-sin(_angle),
                sin(_angle),cos(_angle)) * _st;
    _st += 0.5;
    return _st;
}


void main() {
      // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = vUv - vec2(0.5);
    uv *= 6.;

    vec3 col;
    float count = u_count;
    float Factor = mod(u_time,u_octaves);
    for(float i = 0. ;i< count;i++){
         float r = 2.;
         float theta = (4. * 3.14)/count;
         theta *= i * 0.5;
         vec2 a = r * vec2(cos(theta),sin(theta));

         vec2 b = r * vec2(cos(theta * Factor + PI),sin(theta * Factor + PI));
         float m = (a.y - b.y)/(a.x - b.x);
     
        float d =.001/abs(uv.y - a.y  - m*(uv.x - a.x));
        if(length(uv) < r) {
            col += d;
        }
    }
     
    vec4 fragColor = vec4(col,1.0);

    // apply color
    fragColor.rgb *= u_color;

    gl_FragColor = fragColor;
}
