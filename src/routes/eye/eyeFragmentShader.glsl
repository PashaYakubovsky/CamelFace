precision highp float;

uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
varying vec2 vUv;
varying vec3 vNormale;
varying vec3 vPosition;
uniform int uOrder;
uniform int uDegree;
uniform float uLineWidth;
uniform float uLineCount;
uniform float uLineMultiplier;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform int uEasing;
varying vec3 cameraPos;
uniform float uRadius;
uniform float uRotation;
uniform float uOffsetX;
uniform float uOffsetY;
uniform float uEnableMouse;
varying vec3 vDistortion;

#define SQRT2PI 2.506628274631
#define HALF_PI 1.5707963267948966

float sineInOut(float t) {
    return -0.5 * (cos(PI * t) - 1.0);
}

// factorial
float fac(int n) {
    float res = 1.0;
    for (int i = n; i > 1; i--)
        res *= float(i);
    return res;
}
// double factorial
float dfac(int n) {
    float res = 1.0;
    for (int i = n; i > 1; i-=2)
        res *= float(i);
    return res;
}
// fac(l-m)/fac(l+m) but more stable
float fac2(int l, int m) {
    int am = abs(m);
    if (am > l)
        return 0.0;
    float res = 1.0;
    for (int i = max(l-am+1,2); i <= l+am; i++)
        res *= float(i);
    if (m < 0)
        return res;
    return 1.0 / res;
}


// complex exponential
vec2 cexp(vec2 c) {
    return exp(c.x)*vec2(cos(c.y), sin(c.y));
}

// complex multiplication
vec2 cmul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

// complex conjugation
vec2 conj(vec2 c) { return vec2(c.x, -c.y); }

// complex/real magnitude squared
float sqr(float x) { return x*x; }
float sqr(vec2 x) { return dot(x,x); }

// associated legendre polynomials
float legendre_poly(float x, int l, int m) {
    if (l < abs(m))
        return 0.0;
    if (l == 0)
        return 1.0;
    float mul = m >= 0 ? 1.0 : float((~m&1)*2-1)*fac2(l,m);
    m = abs(m);
    // recursive calculation of legendre polynomial
    float lp1 = 0.0;
    float lp2 = float((~m&1)*2-1)*dfac(2*m-1)*pow(1.0-x*x, float(m)/2.0);
    for (int i = m+1; i <= l; i++) {
        float lp = (x*float(2*i-1)*lp2 - float(i+m-1)*lp1)/float(i-m);
        lp1 = lp2; lp2 = lp;
    }
    return lp2 / mul;
}

vec2 sphere_harm(float theta, float phi, int l, int m) {
    float abs_value = 1.0/SQRT2PI*sqrt(float(2*l+1)/2.0*fac2(l,m))
                    *legendre_poly(cos(theta), l, m);
    return cexp(vec2(0.0,float(m)*phi))*abs_value;
}

float sineIn(float t) {
    return sin((t - 1.0) * HALF_PI) + 1.0;
}

float sdCircle( vec2 p, float r )
{
    float d = length(p) - r;
    float edgeWidth = fwidth(d); // Compute the width of the edge
    return smoothstep(-edgeWidth, edgeWidth, d);
}

vec2 rotate2d (vec2 _st, float _angle) {
    _st -= 0.5;
    _st =  mat2(cos(_angle),-sin(_angle),
                sin(_angle),cos(_angle)) * _st;
    _st += 0.5;
    return _st;
}
vec3 rotate3d (vec3 _st, float _angle) {
    _st -= 0.5;
    _st =  mat3(cos(_angle),-sin(_angle), 0.0,
                sin(_angle),cos(_angle), 0.0,
                0.0, 0.0, 1.0) * _st;
    _st += 0.5;
    return _st;
}

void main() {
    vec2 uv = vUv;
    vec3 norm = vNormale;
    norm.y += uOffsetY * 0.01;
    if(uEnableMouse == 1.0) {
        norm.y += -uMouse.y;
    }
    vec3 n = normalize(norm);
    vec3 color = uColor1;
    float time = uTime;


    if(uEasing == 4) {
        time = sineIn(uTime);
    }

    float sinTheta = sqrt(1.0 - n.y * n.y);
    float phi = sinTheta > 0.0 ? atan(n.x, n.z) : 0.0;
    float theta = atan(sinTheta, n.y);
    int degree = uDegree;
    int order = uOrder;

    // compute spherical harmonics
    vec2 sh1 = sphere_harm(theta, phi, degree, order);
    float off = uOffsetX;
    if(uEnableMouse == 1.0) {
        off += uMouse.x;
    }
    sh1 = rotate2d(sh1, off);


    float r = length(sh1); // convert from Cartesian to Polar coordinates
    float theta1 = atan(sh1.y, sh1.x);
    float edgeWidth = 0.1;

    float circle = 0.0;
    // rotate x
    if(sh1.x < 0.0 || sh1.x > 0.0) {
        vec2 sh2 = mod(fract(sh1) + time * 0.1, 1.0);

        // Compute the distance to the circle and smooth it
        float dCircle = sin(mod(sh2.x * uLineCount, 1.0)) * 10.;
        circle = smoothstep(-edgeWidth, edgeWidth, (1.0 * uLineWidth) - abs(dCircle));
    }
    vec3 color1 = uColor1;

    color = mix(color1, uColor2, circle);
    vec4 final = vec4(color, 1.0);

    csm_DiffuseColor = final;

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}