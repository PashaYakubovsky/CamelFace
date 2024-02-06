uniform float uTime;
uniform vec2 uSize;
attribute vec3 color;
varying vec2 vUv;
varying vec2 vPosition;
varying vec3 vColor;
varying vec3 worldPosition;
attribute float index;
uniform float uCount;
uniform float screenWidth;
float PI = 3.141592653589793;
uniform vec2 mouseUVCoords;
uniform float uRadius;
uniform float uScale;
uniform float uStrength;
uniform bool uActiveNoise;

uniform vec2 uMouse;

//	Simplex 3D Noise 
//	by Ian McEwan, Ashima Arts
//
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //  x0 = x0 - 0. + 0.0 * C 
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1. + 3.0 * C.xxx;

// Permutations
  i = mod(i, 289.0 ); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients
// ( N*N points uniformly over a square, mapped onto an octahedron.)
  float n_ = 1.0/7.0; // N=7
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

// Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}

// distance function for fluid brush effect
float brush(vec2 p, vec2 center, float radius, float hardness){
    float d = distance(p, center);
    return smoothstep(radius, radius - hardness, d);
}


 void main() {
    vColor = color;
    // vUv = fract(position.xz * 0.1);
    // take uSize into account
    vUv = position.xz / uSize;


    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = 20.0 * (10.0 / -mvPosition.z);

    worldPosition = position;
    vPosition = position.xz;

    vec2 p = position.xz;
    // p.normalize();

    float dim = 10.0;
    vec2 mouse = (mouseUVCoords) * dim;
    float b = brush(p, mouse, uRadius, 0.1);
    if(b > 0.0 && uActiveNoise){
        float time = uTime * 0.001;

        p = p + (p - uMouse) * 5.1;
        float d = 0.0;
        for(float i = 0.0; i < 10.0; i++){
            d += snoise(vec3(p * 0.1, time)) * uStrength;
            p = p + (p - uMouse) * 0.1;
        }

        // gl_PointSize = n * 2.0 * (10.0 / -mvPosition.z);
        gl_Position =  projectionMatrix * modelViewMatrix * vec4(position + vec3(0.0, d * 0.5, 0.0), 1.0);
    } else {
        gl_Position = projectionMatrix * mvPosition;
    }
}