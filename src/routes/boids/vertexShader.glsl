varying vec2 vUv;
varying vec2 vPos;
varying vec3 worldPos;

void main() {	

    vUv = uv;
    vPos = position.xy;

    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
}