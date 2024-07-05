uniform float uTime;
varying vec3 vPosition;
varying vec2 vUv;
varying vec3 vNormale;
varying vec3 cameraPos;
varying vec3 vDistortion;

void main() {
    vNormale = normal;
    vPosition = position;
    vUv = uv;
    cameraPos = position;
    vec3 mPos = position;
    vec3 n = normalize(mPos);

    // simple distortion
    float distortion = vDistortion.x * 0.1;
    mPos += n * distortion * 0.01;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(mPos, 1.0);
}