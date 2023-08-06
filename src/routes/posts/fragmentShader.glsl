varying vec3 vNormal;

  void main() {
    vec3 light = vec3(0.3, 0.2, 1.0); // Directional light direction
    float intensity = dot(vNormal, light);

    // Set the number of intensity levels (adjust for desired toon effect)
    float levels = 5.0;

    // Apply toon shading by quantizing the intensity levels
    float toon = floor(intensity * levels) / levels;

    // Add outline to the objects (black border)
    float outline = fwidth(toon);

    // Set the thickness of the outline (adjust as needed)
    float outlineThickness = 0.5;

    gl_FragColor = vec4(vec3(0.2, 0.5, 0.0), 1.);
  }