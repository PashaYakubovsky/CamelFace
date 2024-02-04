#ifdef GL_ES
precision mediump float;
#endif

uniform bool u_mouse_mode;
uniform bool u_scroll_mode;
uniform float u_m_count;
uniform float u_zoom;
uniform vec3 u_color;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
varying vec2 vUv;
varying vec3 vPosition;
float PI = 3.141592653589793238;

vec2 rotateUv(vec2 uv, float angle) {
  float s = sin(angle);
  float c = cos(angle);
  mat2 rotation = mat2(c, -s, s, c);
  return rotation * uv;
}


vec3 calc( in vec2 p )
{
  float x = 0.5;
	float h = 0.0;
  for( float i=0.0; i<100.0; i++ )
	{
		x = p.x*x*(1.0-x); 
    h += log2(abs(p.x*(1.0-2.0*x)));
		x = p.x*x*(1.0-x) + u_time * 0.1; 
    h += log2(abs(p.x*(1.0-2.0*x)));
		x = p.x*x*(1.0-x) + u_time * 0.1;
    h += log2(abs(p.x*(1.0-2.0*x)));
		x = p.x*x*(1.0-x) + u_time * 0.1; 
    h += log2(abs(p.x*(1.0-2.0*x)));

    x = p.y*x*(1.0-x);
    h += log2(abs(p.y*(1.0-2.0*x)));
		x = p.y*x*(1.0-x);
    h += log2(abs(p.y*(1.0-2.0*x)));
		x = p.y*x*(1.0-x);
    h += log2(abs(p.y*(1.0-2.0*x)));
		x = p.y*x*(1.0-x);
    h += log2(abs(p.y*(1.0-2.0*x)));
	}
  h /= u_zoom*5.0;
	
	
	vec3 col = vec3(0.0);
	if( h<0.0 )
	{
		h = abs(h);
		col = 0.5 + 0.5*sin( vec3(0.0,0.4,0.7) + 2.5*h );
		col *= pow(h,0.25);
    col = mix( col, u_color, 1.0-exp(-2.0*h*h) );
	}
	

	return col;
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  rotateUv(fragCoord, u_time);
  vec3 color = vec3(1.0);
  
  color = calc( vec2(2.5,3.5) + 1.0*(fragCoord-vec2(0.0,0.0)) / u_resolution.x);
  color /= 1.0 + 0.2*length( 2.0*vUv );
  
	
	gl_FragColor = vec4( color, 1.0 );
}
