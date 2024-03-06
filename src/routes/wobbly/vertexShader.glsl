uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uTime;
uniform float uPositionFrequency;
uniform float uTimeFrequency;
uniform float uStrength;
uniform float uWarpPositionFrequency;
uniform float uWarpTimeFrequency;
uniform float uWarpStrength;

attribute vec4 tangent;

varying float vWobble;

#include ./includes/simplexNoise4d.glsl

float getWobble(vec3 pos) {
    vec3 wrappedPosition = position;
    wrappedPosition += simplexNoise4d(
        vec4( 
            position * uWarpPositionFrequency, // XYZ
            uTime * uWarpTimeFrequency // W
        )
    ) * uWarpStrength;

    float wobble = simplexNoise4d(
        vec4( 
            wrappedPosition * uPositionFrequency, // XYZ
            uTime * uTimeFrequency // W
        )
    ) * uStrength;
    return wobble;
}

void main() {   
    vec3 bitangent = cross(normal, tangent.xyz);

    // Neighbouring positions
    float shift = 0.01;
    vec3 posA = csm_Position + tangent.xyz * shift;
    vec3 posB = csm_Position - bitangent * shift;

    // Wobble
    float wobble = getWobble(csm_Position);

    // Set the position
    csm_Position += wobble * normal;
    posA += getWobble(posA) * normal;
    posB += getWobble(posB) * normal;

    // Compute the normal
    vec3 toA = normalize(posA - csm_Position);
    vec3 toB = normalize(posB - csm_Position);

    csm_Normal = cross(toB, toA);

    // Varrying
    vWobble = wobble / uStrength;

}