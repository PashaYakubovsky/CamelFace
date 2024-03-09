// #include <common>
// #include <skinning_pars_vertex>

uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uTime;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;

float random2D(vec2 value)
{
    return fract(sin(dot(value.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main()
{   
    // #include <skinbase_vertex>
    // #include <begin_vertex>
    // #include <beginnormal_vertex>
    // #include <defaultnormal_vertex>
    // #include <skinning_vertex>
    // #include <project_vertex>

    // Position
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    // Normal
    vec4 modelNormal = modelMatrix * vec4(normal, 0.0);

    //  Varyings
    vPosition = modelPosition.xyz;
    vNormal = modelNormal.xyz;
    vUv = uv;

    // Final position
    gl_Position = projectionMatrix * viewMatrix * modelPosition;
}