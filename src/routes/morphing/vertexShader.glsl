uniform vec2 uResolution;
uniform float uSize;
uniform float uProgress;
uniform float uMorphMergeSize;
uniform float uMorphDuration;
uniform vec2 uMouse;
uniform float uTime;
uniform vec3 uColor1;
uniform vec3 uColor2;

varying vec3 vColor;
varying vec3 vPosition;

attribute vec3 aPositionTarget;
attribute float aSize;

#include ./includes/simplexNoise3d.glsl

float distanceWithNoiseEdge(vec2 p, float edge, float noise)
{   
    float d = edge - distance(p, vec2(0.5));
    d += noise;
    return d;
}


void main()
{
    // Position mixed with noise
    float noiseOrigin =  simplexNoise3d(position * uMorphMergeSize);
    float noiseTarget =  simplexNoise3d(aPositionTarget * uMorphMergeSize);
    float noise = mix(noiseOrigin, noiseTarget, uProgress);
    noise = smoothstep(-1.0, 1.0, noise);



    float durration = uMorphDuration;
    float delay = (1.0 - durration) * noise;
    float end = delay + durration;

    float progress = smoothstep(delay, end, uProgress);
    vec3 mixedPosition = mix(aPositionTarget, position, progress);


    // Noise with mouse
    vec2 mouse = uMouse;
    float noiseMouse = simplexNoise3d(vec3(mouse, uTime * 0.1));
    float distanceToMouse = distance(mixedPosition.xy, mouse);

    if(distanceToMouse < 1.2)
    {   
        float noise = mix(noiseMouse, noise, 0.5);
        noise = smoothstep(-1.0, 1.0, noise);
        // mixedPosition.xy += normalize(mixedPosition.xy - mouse) * noise * clamp((sin(uTime * 2.5) * 2.0), 1.0, 5.0);

        // moving circlular
        float angle = atan(mixedPosition.y - mouse.y, mixedPosition.x - mouse.x);
        mixedPosition.xy += vec2(cos(angle), sin(angle)) * noise * (sin(uTime * 2.5) + 1.0) * 0.5;


    }
    

    // Varyings
    vColor = mix(uColor1, uColor2, noise);
    vPosition = position;

    // Final position
    vec4 modelPosition = modelMatrix * vec4(mixedPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    // Point size
    gl_PointSize = aSize * uSize * uResolution.y;
    gl_PointSize *= (1.0 / - viewPosition.z);
}