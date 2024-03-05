uniform vec2 uMouse;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uColor;
uniform float uFolloff;
uniform float uStripeMultiplier;
uniform float uFresnelPower;
uniform float uHolographicMultiplier;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;

void main()
{
    float time = uTime * 0.1;
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    vec3 color = uColor;
    vec3 normal = normalize(vNormal);
    if(!gl_FrontFacing) normal *= -1.0;

    // Stripes
    float stripe = mod((vPosition.y - time) * uStripeMultiplier, 1.0);
    stripe = pow(stripe, 3.0);

    // Fresnel
    vec3 viewDirection = normalize(vPosition - cameraPosition);
    float fresnel = dot(viewDirection, normal) + 1.0;
    fresnel *= pow(fresnel, uFresnelPower);

    // Folloff
    float falloff = smoothstep(uFolloff, 0.0, fresnel);

    // Holographic effect
    float holographic = stripe * fresnel;
    holographic += fresnel * uHolographicMultiplier;
    holographic *= falloff;

 

    // Final color
    gl_FragColor = vec4(color, holographic);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}