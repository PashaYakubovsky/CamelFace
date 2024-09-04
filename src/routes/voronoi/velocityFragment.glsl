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
          vec4 velocity = texture2D( textureVelocity, uv );
          vec3 target = texture2D( uTarget, uv ).xyz;

          velocity.xyz *= 0.54;
          velocity.xyz += (target.xyz - position.xyz) * 1.34;
        

          gl_FragColor = velocity;

} 