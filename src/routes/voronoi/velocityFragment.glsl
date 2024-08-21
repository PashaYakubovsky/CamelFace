uniform float time;
uniform sampler2D uTarget;
uniform sampler2D uTexture;
#include curl.glsl;

float random (in vec2 st) {
    return fract(sin(dot(st.xy,
                         vec2(12.9898,78.233)))*
        43758.5453123);
}
 


void main() {
          vec2 uv = gl_FragCoord.xy / resolution.xy;
          vec4 tmpPos = texture2D( texturePosition, uv );
          vec3 position = tmpPos.xyz;
          vec4 text = texture2D( uTexture, uv );
          vec3 velocity = texture2D( textureVelocity, uv ).xyz;
          vec3 target = texture2D( uTarget, uv ).xyz;

          velocity.xy *= 0.84;
          velocity.xy += (target.xy - position.xy) * 3.14;
        

          gl_FragColor = vec4(velocity, 1.0 );

} 