

uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uTime;

varying vec3 vPosition;

#include ./includes/simplexNoise3d.glsl

void main() {
    // Position mixed with noise
    // float noiseOrigin =  simplexNoise3d(position * uMorphMergeSize);
    // float noiseTarget =  simplexNoise3d(aPositionTarget * uMorphMergeSize);
    // float noise = mix(noiseOrigin, noiseTarget, uProgress);
    // noise = smoothstep(-1.0, 1.0, noise);



    // float durration = uMorphDuration;
    // float delay = (1.0 - durration) * noise;
    // float end = delay + durration;

    // float progress = smoothstep(delay, end, uProgress);
    // vec3 mixedPosition = mix(aPositionTarget, position, progress);

    // // Noise with mouse
    // // convert -1 - 1 from whole screen to 0 - 1 to fit the noise function
    // vec2 mouse = uMouse;
    // float distanceToMouse = distance(mixedPosition.xy, mouse);

    // move particle away from mouse
    // float force = (1.0 - distanceToMouse) * 2.0;
    // if(distanceToMouse < 1.) {
    //     // add offset to mouse
    //     mouse += vec2(-0.5, -0.5);
    //     mixedPosition.xy += normalize(mixedPosition.xy - mouse) * force * 0.2;
    // }
    // mixedPosition.xy += normalize(mixedPosition.xy - mouse) * force * 0.1;
    
    

    // Varyings
    // vColor = mix(uColor1, uColor2, noise);
    vPosition = position;

    // Final position
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    // Point size
    // gl_PointSize = aSize * uSize * uResolution.y;
    // gl_PointSize *= (1.0 / - viewPosition.z);
}