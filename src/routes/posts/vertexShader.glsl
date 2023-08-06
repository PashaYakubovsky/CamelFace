// Vertex shader
uniform float time; // Time passed in from Three.js
varying vec2 vUv;
varying vec3 vNormal;

void main() {
    vUv = uv;
    // create effect of wind blowing through grass
    vNormal = normal + 5.0 * sin(time + position.x);
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
