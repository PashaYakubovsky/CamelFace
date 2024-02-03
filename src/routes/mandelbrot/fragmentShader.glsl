#ifdef GL_ES
precision mediump float;
#endif

uniform float u_zoom;
uniform vec3 u_color;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform float distanceFromCenter;
varying vec2 vUv;
varying vec3 vPosition;
float PI = 3.141592653589793238;



float mandelbrot( in vec2 c )
{
    #if 1
    {
        float c2 = dot(c, c);
        // skip computation inside M1 - https://iquilezles.org/articles/mset1bulb
        if( 256.0*c2*c2 - 96.0*c2 + 32.0*c.x - 3.0 < 0.0 ) return 0.0;
        // skip computation inside M2 - https://iquilezles.org/articles/mset2bulb
        if( 16.0*(c2+2.0*c.x+1.0) - 1.0 < 0.0 ) return 0.0;
    }
    #endif


    const float B = 256.0;
    float l = 0.0;
    vec2 z  = vec2(0.0);
    for( int i=0; i<512; i++ )
    {
        z = vec2( z.x*z.x - z.y*z.y, 2.0*z.x*z.y ) + c;
        if( dot(z,z)>(B*B) ) break;
        l += 1.0;
    }

    if( l>511.0 ) return 0.0;
    
    // ------------------------------------------------------
    // smooth interation count
    //float sl = l - log(log(length(z))/log(B))/log(2.0);

    // equivalent optimized smooth interation count
    float sl = l - log2(log2(dot(z,z))) + 4.0;

    float al = smoothstep( -0.1, 0.0, (0.5*6.2831*u_time ) );
    l = mix( l, sl, al );

    return l;
}


float lerp(float a, float b, float t) {
  return a + t * (b - a);
}

void main() {
  vec3 col = vec3(0.0);

  vec2 fragCoord = vUv * u_resolution.xy;
    
  vec2 p = (-u_resolution.xy + 2.0*fragCoord.xy)/u_resolution.y;
  float zoom = u_zoom;
  zoom = lerp(zoom, 1.0, distanceFromCenter);
  float zoo = 0.62 + 0.38/(.07*zoom);
  zoo = pow( zoo,25.0);
  zoo += zoo * 0.2;
  float coa = cos( 0.15*(1.0-zoo)*zoom );
  float sia = sin( 0.15*(1.0-zoo)*zoom );
  
  vec2 xy = vec2( p.x-p.y, p.x+p.y);
  vec2 c = vec2(-.745,.186) + xy*zoo;

  float l = mandelbrot(c);

  col += cos( 10.0 + l*0.1 + u_color);
  gl_FragColor = vec4( col, 1.0 );
}
