uniform vec2 uResolution;
uniform sampler2D uPictureTexture;
uniform sampler2D uDisplacementTexture;

attribute float aIntensity;
attribute float aAngle;

varying vec3 vColor;

void main()
{
    // Displacement
    vec3 newPosition = position;
    vec4 displacementColor = texture(uDisplacementTexture, uv);
    float displacementIntensity = 
        (displacementColor.r + displacementColor.g + displacementColor.b);

    displacementIntensity = smoothstep(0.1, 0.3, displacementIntensity);

    vec3 displacement = vec3(
        cos(aAngle) * 0.2,
        sin(aAngle) * 0.2,
        1.0
    );
    displacement = normalize(displacement);
    displacement *= displacementIntensity;
    // displacement *= 1.;
    displacement *= aIntensity;
    
    newPosition += displacement;
    
    // move particles with force around the displacement center
    vec3 displacementCenter = vec3(0.5, 0.5, 0.0);
    vec3 displacementDirection = normalize(displacementCenter - newPosition);
    float displacementDistance = distance(displacementCenter, newPosition);
    float displacementForce = 1.0 / (displacementDistance * displacementDistance);
    displacementForce = clamp(displacementForce, 0.0, 1.0);
    displacementForce = pow(displacementForce, 2.0);
    displacementForce *= 0.1;
    newPosition += displacementDirection * displacementForce;

    // Final position
    vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    // Picture
    vec4 pictureColor = texture(uPictureTexture, uv);
    float pictureIntensity = (pictureColor.r + pictureColor.g + pictureColor.b) / 3.0;

    // Point size
    gl_PointSize = 0.1 * pictureIntensity * uResolution.y;
    gl_PointSize *= (1.0 / - viewPosition.z);

    // Varyings
    vColor = mix( vec3(1.0),pictureColor.rgb,  1.0 - pictureIntensity);
}