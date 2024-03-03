uniform float uTime;
uniform float uDeltaTime;
uniform sampler2D uBase;
uniform float uFlowFieldInfluence;
uniform float uFlowSpeed;
uniform float uFlowFieldStrength;
uniform float uFlowFieldFrequency;
uniform vec3 uIntersect;

#include ./includes/simplexNoise4d.glsl

void main() {
    float time = uTime * 0.2 * uFlowSpeed;
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 particle = texture(uParticles, uv);
    vec4 base = texture(uBase, uv);

    // Intersection
    float distance = distance(particle.xyz, uIntersect);
    float radius = 1.0;
    bool intersect = distance < radius;

    // Dead
    if (particle.a >= 1.0) {
        particle.a = mod(particle.a, 1.0);
        particle.xyz = base.xyz;
    // Alive
    } else {
        // Strength
        float strength = simplexNoise4d(vec4(
            base.xyz * 0.2, time + 1.0
        ));

        float influence = (uFlowFieldInfluence - 0.5) * (- 2.0);
        strength = smoothstep(influence, 1.0, strength);

        // Intersect
        if (intersect) {
            vec3 direction = normalize(particle.xyz - uIntersect);
            particle.xyz += direction * uDeltaTime * 0.5 * uFlowSpeed;
            strength = 1.0;
            influence = 1.0;
        }

        // Flow field
        vec3 noiseFreq = particle.xyz * uFlowFieldFrequency;

        vec3 flowField = vec3(
            simplexNoise4d(vec4(
                noiseFreq + 0.0, time
            )),
            simplexNoise4d(vec4(
                noiseFreq + 1.0, time
            )),
            simplexNoise4d(vec4(
                noiseFreq + 2.0, time
            ))
        );
        flowField = normalize(flowField);
        particle.xyz += flowField * uDeltaTime * strength * uFlowFieldStrength * uFlowSpeed;

        // Decay
        particle.a += uDeltaTime * 0.3 * uFlowSpeed;
    }

    // Update particle
    gl_FragColor = particle;
}