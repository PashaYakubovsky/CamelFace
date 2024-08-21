varying vec3 vPosition;
uniform vec3 uColor;
uniform sampler2D uSample;
uniform sampler2D uPosition;
varying vec2 vUv;
uniform sampler2D uTarget;
varying vec2 vReference;
uniform float uTime;


float remap(float value, float inputMin, float inputMax, float outputMin, float outputMax) {
    return outputMin + ((value - inputMin) / (inputMax - inputMin) * (outputMax - outputMin));
}

void main() {
          float alpha = 1.0 - length(gl_PointCoord - vec2(0.5, 0.5)) * 2.;
          vec3 color = uColor;
          vec4 base = texture2D(uPosition, vReference);
          vec4 particle = texture2D( uTarget, vUv );
          float finalAlpha = alpha*0.05+smoothstep(0.0, 1., alpha)*0.1+0.5*smoothstep(0.6-fwidth(alpha), 0.9, alpha);
          
          // base.a == 0 is alpha 1 color, base.a == 1 is alpha 0 color 
          color.xyz *= remap(base.a, -1.0, 0.0, 0.0, 1.0) * 0.5;
          color.xyz *= 5.0;

          gl_FragColor = vec4(color, finalAlpha);
}