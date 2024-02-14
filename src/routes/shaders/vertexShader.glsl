uniform float time;
varying vec2 vUv;
varying vec3 vPosition;
uniform vec2 pixels;
float PI = 3.141592653589793238;
uniform float distanceFromCenter;
uniform bool isMobile;

vec3 noise() {
    return vec3(
        sin(time*0.3)*0.5 + 0.5,
        sin(time*0.3 + 2.)*0.5 + 0.5,
        sin(time*0.3 + 4.)*0.5 + 0.5
    );
}

void main() {
    vUv = (uv - vec2(0.5))*(0.8 - 0.2*distanceFromCenter*(2. - distanceFromCenter)) + vec2(0.5);
    vec3 pos = position;
    if(!isMobile) {
        pos.y += sin(PI*uv.x)*0.05;
        pos.z += sin(PI*uv.y)*0.05;
        
        pos.y += sin(time*0.3)*0.05;
        vUv.y += sin(time*0.3)*0.05;
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}