uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
varying vec3 vNormal;
varying vec2 vUv;
uniform vec3 uColor;
varying float intensity;
varying vec3 vPosition;
varying vec3 vWorldPosition;

void main() {
  float dToWorldCenter = distance( vWorldPosition, vec3( 0.0 ) );
  if( dToWorldCenter < 0.1 ) discard;
  vec3 glow = pow( intensity, 2.0 ) * 0.5 * uColor;
  gl_FragColor = vec4( glow, 1.0 );
}

