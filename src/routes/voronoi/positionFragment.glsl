

uniform float time;
uniform sampler2D uTarget;
uniform sampler2D uSample;
uniform sampler2D uTexture;
uniform vec2 uMouse;
#include curl.glsl;



void main() {

          vec2 uv = gl_FragCoord.xy / resolution.xy;

          vec4 position = texture2D( texturePosition, uv );
          vec3 velocity = texture2D( textureVelocity, uv ).xyz;
          vec4 particle = texture2D( uTarget, uv );
          vec4 base = texture2D( uSample, uv );
          vec4 target = texture2D( uTexture, uv );

          velocity.xyz += velocity.xyz * 1.0 / 60.0;

          // Fake haos movement
          vec4 rands = permute( vec4( vec3(uv*5.0, 0.0), 0.0) );
          vec3 noiseVal = curl(vec3(position.xy, rands.x), time, 0.1)*0.001*smoothstep(0.3, 0.8, rands.y);
          position.xy += noiseVal.xy;

           // Dead
          if (position.a <= -1.0) {
                    // Respawn
                    position.a = -0.9;
          } else {
                    // Decay
                    position.a -= particle.a * 0.001;
                    position.y += smoothstep(-1.0, 0.0, position.a) * 0.1 - 0.1;
          }

          // float distanceToTarget = distance(uMouse, position.xy);
          // if (distanceToTarget < 0.1) {
          //           position.xy *= 2.0;

          // }

          float distanceToTarget = distance(uMouse, position.xy);
          if (distanceToTarget < 0.5) {
                    // randomize velocity
                    velocity.xy += curl(vec3(position.xy, rands.x), time, 0.1).xy*4.1*smoothstep(0.3, 0.8, rands.y) ;
          }
    
          
          gl_FragColor = vec4( position.xyz + velocity * 0.015,  position.a ); 
}