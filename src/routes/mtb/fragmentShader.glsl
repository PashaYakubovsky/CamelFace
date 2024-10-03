uniform vec2 uMouse;
uniform vec2 uResolution;
uniform float uTime;
varying vec3 vPosition;

#include ./includes/simplexNoise3d.glsl

// Created by inigo quilez - iq/2013
// https://www.youtube.com/c/InigoQuilez
// https://iquilezles.org

// Instead of using a pont, circle, line or any mathematical shape for traping the orbit
// of fc(z), one can use any arbitrary shape. For example, a NyanCat :)
//
// I invented this technique more than 10 years ago (can have a look to those experiments 
// here https://iquilezles.org/articles/ftrapsbitmap).

#define M_PI 3.1415926
#define RAD90 (M_PI * 0.5)

struct surface {
	float dist;
    vec4 albedo;
    int count;
    bool isHit;
};

// Surface Data Define
#define SURF_NOHIT(d)   (surface(d, vec4(0), 		 	0, false))
#define SURF_BLACK(d) 	(surface(d, vec4(0,0,0,1),   	0, true))
#define SURF_FACE(d) 	(surface(d, vec4(.0,0.7,0.6,1), 	0, true))
#define SURF_MOUSE(d) 	(surface(d, vec4(1,0.01,0.,1),   	0, true))
#define SURF_CHEEP(d) 	(surface(d, vec4(1,0.1,0.1,1), 	0, true))

mat2 rot( float th ){ vec2 a = sin(vec2(1.5707963, 0) + th); return mat2(a, -a.y, a.x); }

vec2 rotate(vec2 p, float t) {
  return p * cos(-t) + vec2(p.y, -p.x) * sin(-t);
}

vec3 hsv2rgb( in vec3 c )
{
    vec3 rgb = clamp( abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0 );

	rgb = rgb*rgb*(3.0-2.0*rgb); // cubic smoothing	

	return c.z * mix( vec3(1.0), rgb, c.y);
}

surface opU(surface d1, surface d2)
{
    if(d1.dist < d2.dist){
        return d1;
    } else {
    	return d2;
    }
}

float opU( float d1, float d2 ) {  return min(d1,d2); }

float smin( float d1, float d2, float k ) {
    float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) - k*h*(1.0-h); 
}

// Distance Function 2D
float sdRoundBox(vec2 p, vec2 size, float r)
{
    return length(max(abs(p) - size * 0.5, 0.0)) - r;
}
float sdBox( in vec2 p, in vec2 b )
{
    vec2 d = abs(p)-b;
    return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
}

float sdArc( in vec2 p, in vec2 sc, in float ra, float rb )
{
    // sc is the sin/cos of the arc's aperture
    p.x = abs(p.x);
    return ((sc.y*p.x>sc.x*p.y) ? length(p-sc*ra) : 
                                  abs(length(p)-ra)) - rb;
}

float sdCapsule(vec2 p, vec2 a, vec2 b, float r)
{
	vec2 pa = p - a, ba = b - a;
	float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
	return length(pa - ba*h) - r;
}

float sdEllipsoid( vec2 p, vec2 r )
{
    float k0 = length(p/r);
    float k1 = length(p/(r*r));
    return k0*(k0-1.0)/k1;
}

surface opColorOvreWrite(surface a, surface b)
{
    if(b.dist > 0.0){
        return a;
    }else{
        a.albedo = b.albedo;
        return a;
    }
}

//  1 out, 2 in...
float hash12(vec2 p)
{
	vec3 p3  = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

/////////////////////////////////////////////////////////////////////////////////////////////////
// Mikka Boze Distance Function 2D
/////////////////////////////////////////////////////////////////////////////////////////////////
float sdEar(vec2 p)
{
    p = rot(RAD90+0.25) * p;
    return sdArc(p + vec2(0.05, 0.175), vec2(sin(0.7),cos(0.7)), 0.03, 0.01);
    //return sdCappedTorus(p + vec3(0.05, 0.175, 0), vec2(sin(0.7),cos(0.7)), 0.03, 0.01);
}

#define EYE_SPACE_2D 0.001

vec2 opBendXY(vec2 p, float k)
{
    float c = cos(k*p.x);
    float s = sin(k*p.x);
    mat2  m = mat2(c,-s,s,c);
    return vec2(m*p.xy);
}

float sdCheep(vec2 p)
{    
    const float x = 0.085;
    const float r = 0.0045;
    const float rb1 = 100.;
    
   
    
    float d = sdCapsule(opBendXY(p + vec2(x, -0.02), rb1), vec2(-0.005,0.0), vec2(0.005, 0.), r);
    float d1 = sdCapsule(opBendXY(p + vec2(x+0.01, -0.02), 200.0), vec2(-0.0026,0.0), vec2(0.0026, 0.), r);
    float d2 = sdCapsule(opBendXY(p + vec2(x+0.019, -0.025), -rb1), vec2(-0.01,0.0), vec2(0.0045, 0.), r);
    
    return opU(opU(d, d1), d2);
}

float sdEyeBrow(vec2 p)
{
    const float x = 0.05;
    //p = opBendXZ(p + vec3(0.02,0,-0.02), -6.5);
    return sdRoundBox(p + vec2(EYE_SPACE_2D, -1.14), vec2(0.025,0.04), 0.0);
}

float sdRomboide(vec2 p, vec2 size, float r)
{
    vec2 q = abs(p) - size;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float sdCircle(vec2 p, float r)
{
    return length(p) - r;
}

const float a=1.0;
const float b=.1759;

float sdSpiral(vec2 p,vec2 c)
{
    // t = theta
    p = p - c;
    float t=atan(p.y, p.x) + uTime*8.0;
    // t=(t+PI)/(2.*PI);
    float r=length(p.xy);
    
    float n=(log(r/a)/b-t)/(2.*M_PI);

   
    float upper_r=a*exp(b*(t+2.*M_PI*ceil(n)));
    float lower_r=a*exp(b*(t+2.*M_PI*floor(n)));
    // float lower_r = 0.0;
    
    return min(abs(upper_r-r),abs(r-lower_r));
}


surface sdBoze(vec2 p, vec2 sc, float ms, vec2 U)
{    
    surface result = SURF_NOHIT(1e5);
    float noise = simplexNoise3d(vec3(U, uTime));
    
    float minsc = min(sc.x, sc.y);
    minsc *= noise * 0.5 + 0.5;
    p /= sc;


   
    vec2 mxp = vec2(-abs(p.x), p.y);

	// eye
    float d = sdCircle(p, 0.14);
    // float d = sdSpiral(vec2(1.), vec2(0., 0.));
	surface head = SURF_FACE(d * 1.2);
    // float d4 = sdRomboide(mxp, vec2(0.02, 0.05), 0.013);
    float d4 = sdCircle(mxp, 0.1);
    surface eye = SURF_BLACK(d4);
    surface mouse = SURF_MOUSE(d4);
    result = opColorOvreWrite(head, mouse);
   
    
    result = opColorOvreWrite(result, eye);
    
    result.dist *= minsc;
    
    return result;
}

/////////////////////////////////////////////////////////////////////////////////////////////////
// End of Mikka Boze 2D
/////////////////////////////////////////////////////////////////////////////////////////////////

vec4 getSDBoze2D(vec2 p, vec2 U)
{
    const vec2 s = vec2(1.0);
    float ms = sin(uTime*5.) * 0.5 + 0.5;
    
    p = fract(abs(U*2.)) - 0.5; // cells
    vec2 f = floor((U*2.));
    float h = hash12(f);
   
    vec2 q = rotate(p, uTime);
    
    surface mat = sdBoze(q+vec2(0,0.1), vec2(2), ms, U);
    
    // outline
    mat.albedo.xyz *= abs(mat.dist) <= 0.002 ? 0. : 1.;
    
    //float l = length(vec2(fwidth(f)));
    float l = smoothstep(0.015, 0., abs(sdBox(p,vec2(0.5))));
    
    return (mat.dist <= 0.0) ? mat.albedo : vec4(l);
}


void main()
{
    vec2 fragCoord = gl_FragCoord.xy;

    vec2 p = uResolution.xy;                                // normalized coordinates
    vec2 U = (fragCoord + fragCoord - p) / p.y;
    
	p = U - vec2(-2,0);  
    U -= vec2(.8,.2);                  // Moebius transform
    U *= mat2(p, -p.y, p) / dot(U,U);
    
    // offset   spiral, zoom       phase     // spiraling
    U =   log(length(U+=sin(uTime * 0.5)*2.5))*vec2(sin(uTime * .5)+2.0, -.5) + vec2(sin(uTime * .2) * 01.,uTime/8.)
        + atan(U.y, U.x)/4.20 * vec2(0, 4);
   
    
    float time = max( uTime, 0.0 );
    	
    vec4 col = vec4(0.0);

    col = getSDBoze2D(p, U);

	gl_FragColor = vec4( col.xyz,1.0);
    
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}