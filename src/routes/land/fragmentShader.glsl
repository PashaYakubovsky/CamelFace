varying vec3 vNormal1;
uniform float iTime;
uniform vec3 iMouse;
uniform vec3 iCameraPos;
varying vec3 vPosition;
uniform float iAmbientRadius;
varying float vDepth;
varying vec3 vWorldPosition;
// varying vec3 vViewPosition;
uniform vec2 iResolution;
uniform sampler2D iDiffuse;
uniform sampler2D iDiffuse2;
uniform vec2 uDivade;


void main() {
    vec3 normal1 = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition)));

    vec3 viewDir1 = normalize(vViewPosition);
    vec3 x1 = normalize(
        vec3(viewDir1.z, 0.0, -viewDir1.x)
    );
    vec3 y1 = cross(viewDir1, x1);
    vec2 uv1 = vec2(
        dot( x1, normal1),
        dot( y1, normal1)
    ) * 0.495 + 0.5;
    vec4 t = texture2D(iDiffuse, uv1);
    vec4 t2 = texture2D(iDiffuse2, uv1);

    vec2 screenUv = gl_FragCoord.xy / iResolution.xy;

    float divade = step(uDivade.x, (screenUv.y - screenUv.x + .1) * uDivade.y);

    vec4 color = mix(t, t2, divade);


    float fog = smoothstep(-1., 20.0, length(vViewPosition*vec3(1.5, 1.7, 1.0)));
    vec3 fogColor = mix(vec3(0.0), vec3(1.0), divade);
    color = mix(color, vec4(fogColor, 1.0), fog);
    // color = mix(color, vec4(fogColor, 1.0), fog);
    csm_FragColor = color; 
}