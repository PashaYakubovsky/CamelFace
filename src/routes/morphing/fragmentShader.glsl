uniform vec2 uMouse;

varying vec3 vColor;
varying vec3 vPosition;

void main()
{
    vec2 uv = gl_PointCoord.xy;
    float distanceToCenter = length(uv - 0.5);
    float alpha = 0.05 / distanceToCenter - 0.1;


    gl_FragColor = vec4(vColor, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}