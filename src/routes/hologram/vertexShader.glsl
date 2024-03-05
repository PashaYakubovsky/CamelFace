#include <common>
#include <skinning_pars_vertex>

uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uTime;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 Normal;
varying vec3 Position;

float random2D(vec2 value)
{
    return fract(sin(dot(value.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main()
{   
    #include <skinbase_vertex>
    #include <begin_vertex>
    #include <beginnormal_vertex>
    #include <defaultnormal_vertex>
    #include <skinning_vertex>
    #include <project_vertex>

    // Position
    // vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 modelPosition = mvPosition + vec4(position, 0.0);

    // Glitch
    float time = uTime * 3.0;
    float glitchTime = time - modelPosition.y;
    float glitchStrength = sin(glitchTime) + sin(glitchTime * 3.45) + sin(glitchTime * 8.76);
    glitchStrength /= 3.0;
    glitchStrength = smoothstep(0.3, 1.0, glitchStrength);
    glitchStrength *= 0.25;
    float glitch1 = (random2D(modelPosition.xz + time) - 0.5) * glitchStrength;
    float glitch2 = (random2D(modelPosition.zx + time) - 0.5) * glitchStrength;
    // apply glitch from bottom to top reapetedly
    modelPosition.x += glitch1;
    modelPosition.z += glitch2;


    // Normal
    vec4 modelNormal = modelMatrix * vec4(normal, 0.0);

    //  Varyings
    vPosition = modelPosition.xyz;
    vNormal = modelNormal.xyz;
    vUv = uv;
    Normal = normalize(normalMatrix * normal);
    Position = vec3(modelViewMatrix * vec4(position, 1.0));

    // Final position
    gl_Position = projectionMatrix * viewMatrix * modelPosition;
}