precision mediump float;


uniform float time;
uniform vec2 pixels;
uniform float distanceFromCenter;
uniform bool isMobile;
uniform vec2 uMouse;
uniform vec2 uResolution;
uniform bool uActive;

varying vec2 vUv;
varying vec3 vPosition;
varying float vTime;

attribute vec3 aVertexPosition;




float PI = 3.141592653589793238;

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

    // get the distance between our vertex and the mouse position
    vec2 disPos = uv;
    float distanceFromMouse = distance(uMouse.xy, disPos);

    // calculate our wave effect
    float waveSinusoid = cos(4.0 * (distanceFromMouse - (time / 100.0)));

    // attenuate the effect based on mouse distance
    float distanceStrength = (0.1 / (distanceFromMouse + 0.3));

    // calculate our distortion effect
    float distortionEffect = distanceStrength * waveSinusoid * 1.4;

    // apply the distortion effect to our vertex position
    if(uActive) {
        pos.z += distortionEffect;
    }


    vPosition = position;
    vTime = time;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}