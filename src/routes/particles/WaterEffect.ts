import * as THREE from 'three';
import { Effect } from 'postprocessing';

export class WaterEffect extends Effect {
	constructor(options = {}) {
		super('WaterEffect', fragment, {
			uniforms: new Map([
				['uTexture', new THREE.Uniform(options.texture)],
				['uDistortionIntensity', new THREE.Uniform(options.distortionIntensity || 1)]
			])
		});
	}
}
export default WaterEffect;

const fragment = `
uniform sampler2D uTexture;
uniform float uDistortionIntensity;

void mainUv(inout vec2 uv) {
        float pi = 3.14159265359;
        vec4 tex = texture2D(uTexture, uv);
        float angle = -((tex.r) * (pi * 0.1) - pi) ;
        float vx = -(tex.r *0.1 - 1.);
        float vy = -(tex.g *0.1 - 1.);
        float intensity = tex.b * uDistortionIntensity * 0.1;

        uv.x +=  0.2 * intensity;
        uv.y +=  0.2 * intensity;
    }
`;
