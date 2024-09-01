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
uniform bool uHoverNoiseEnabled;
uniform bool uEnabledNoise;
uniform float uNoiseRoughness;
uniform float uNoiseScale;

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

float random (in vec2 st) {
    return fract(sin(dot(st.xy,
                         vec2(12.9898,78.233)))*
        43758.5453123);
}

float sdStar( in vec2 p, in float r, in int n, in float m)
{
    // next 4 lines can be precomputed for a given shape
    float an = 3.141593/float(n);
    float en = 3.141593/m;  // m is between 2 and n
    vec2  acs = vec2(cos(an),sin(an));
    vec2  ecs = vec2(cos(en),sin(en)); // ecs=vec2(0,1) for regular polygon

    float bn = mod(atan(p.x,p.y),2.0*an) - an;
    p = length(p)*vec2(cos(bn),abs(sin(bn)));
    p -= r*acs;
    p += ecs*clamp( -dot(p,ecs), 0.0, r*acs.y/ecs.y);
    return random(
        vec2(
            p.x * 0.1,
            p.y * 0.1
        )
    ) - length(p)*sign(p.x);
}

float rotateSdfStar( in vec2 p, in float r, in int n, in float m, in float a )
{
    p = mat2(cos(a),-sin(a),sin(a),cos(a))*p;
    return sdStar(p,r,n,m);
}


 void main() {
    vColor = color;
    vUv = position.xz / uSize;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = 2.0 * (1.0 / -mvPosition.z);

    worldPosition = position;
    vPosition = position.xz;

    vec2 p = position.xz;

    float dim = 10.0;
    vec2 mouse = (mouseUVCoords) * dim;
    vec2 starPos = p - mouse;
    starPos.x += dim * 0.5;
    // starPos.x -= 3.5;
    float b = sdStar(
        starPos,
        uRadius,
        6,
        1.5
    );
   
    if(b > 0.0 && uHoverNoiseEnabled){
        float time = uTime * 0.01;

        float distanceToMouse = length(p - mouse);
        float scale = 1.0 - distanceToMouse / dim;
        float d = snoise(vec3(p * 0.1, time)) * uStrength * scale;
        for(float i = 0.0; i < uScale; i++){
            d += snoise(vec3(p * 0.1, time)) * uStrength;
            p = p + (p - uMouse) * 0.1;
        }
        mvPosition.y += d;
        gl_Position = projectionMatrix * mvPosition;

        // p = p + (p - uMouse);
        // float d = 0.0;
        

        // mvPosition.y += d;
        // gl_Position = projectionMatrix * mvPosition;

    } else {

        if(uEnabledNoise) {
            float time = uTime * 10.1;
            float d = 0.0;
            for(float i = 0.0; i < uNoiseScale; i++){
                d += snoise(vec3(p * uNoiseRoughness, time)) * uNoiseRoughness;
            }

            mvPosition.xyz += d;
        }

        gl_Position = projectionMatrix * mvPosition;
    }
}