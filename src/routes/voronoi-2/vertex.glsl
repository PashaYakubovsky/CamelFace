uniform float uTime;
varying vec2 vUv;
varying vec3 vPosition;
uniform sampler2D uPosition;
attribute vec2 reference;
varying vec2 vReference;


void main() {
          vUv = uv;
          vPosition = position;
          vReference = reference;
          vec3 tempPosition = texture2D(uPosition, reference).xyz;

          gl_PointSize = (vPosition.z + 20.);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(tempPosition, 1.0);
}