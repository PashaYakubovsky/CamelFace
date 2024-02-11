uniform float uTime;
uniform vec2 uMouse;
varying vec3 vNormal;
varying vec2 vUv;
varying float intensity;
uniform float uIntensity;
varying vec3 vPosition;
varying vec3 vWorldPosition;
attribute float instanceId;


void main() {
    vec3 transformed = position.xyz;;
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(transformed, 1.0);
    vec3 worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;

    gl_Position = projectionMatrix * mvPosition;
    vNormal = normalMatrix * normal;
    vUv = uv;
    vPosition = position;




    vWorldPosition = worldPosition;
    vec3 viewVector=normalize(vec3(worldPosition)); 
    vec3 lightVector=normalize(vec3(0.0, 0.0, 1.0));
    float diffuse=max(dot(vNormal, lightVector), 0.0);
    intensity = diffuse * uIntensity;



  
}
