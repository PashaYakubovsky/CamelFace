import { Vector2 } from 'three';

/**
 * Dot screen shader
 * based on glfx.js sepia shader
 * https://github.com/evanw/glfx.js
 */

const CustomPostEffectShader = {
	name: 'CustomPostEffect',

	uniforms: {
		tDiffuse: { value: null },
		tSize: { value: new Vector2(256, 256) },
		center: { value: new Vector2(0.5, 0.5) },
		angle: { value: 1.07 },
		scale: { value: 1.0 },
		resolution: { value: new Vector2(256, 256) },
		offset: { value: new Vector2(0, 0) },
		zoom: { value: 1.0 },
		uBlurAmount: { value: 0.0 },
		uMouse: { value: new Vector2(0, 0) },
		uVelocity: { value: new Vector2(0, 0) },
		time: { value: 0.0 },
		uDivade: { value: new Vector2(0.5, 1.0) }
	},

	vertexShader: /* glsl */ `

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,

	fragmentShader: /* glsl */ `

		uniform vec2 center;
		uniform float angle;
		uniform float scale;
		uniform vec2 tSize;
		uniform vec2 resolution;
		uniform vec2 offset;
		uniform float zoom;
		uniform float max_distort;
		uniform float uBlurAmount;
		uniform vec2 uMouse;
		uniform vec2 uVelocity;
		uniform float time;
		uniform vec2 uDivade;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		//	Simplex 3D Noise 
		//	by Ian McEwan, Stefan Gustavson (https://github.com/stegu/webgl-noise)
		//
		vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
		vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

		float snoise(vec3 v){ 
		const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
		const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

		// First corner
		vec3 i  = floor(v + dot(v, C.yyy) );
		vec3 x0 =   v - i + dot(i, C.xxx) ;

		// Other corners
		vec3 g = step(x0.yzx, x0.xyz);
		vec3 l = 1.0 - g;
		vec3 i1 = min( g.xyz, l.zxy );
		vec3 i2 = max( g.xyz, l.zxy );

		//  x0 = x0 - 0. + 0.0 * C 
		vec3 x1 = x0 - i1 + 1.0 * C.xxx;
		vec3 x2 = x0 - i2 + 2.0 * C.xxx;
		vec3 x3 = x0 - 1. + 3.0 * C.xxx;

		// Permutations
		i = mod(i, 289.0 ); 
		vec4 p = permute( permute( permute( 
					i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
				+ i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
				+ i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

		// Gradients
		// ( N*N points uniformly over a square, mapped onto an octahedron.)
		float n_ = 1.0/7.0; // N=7
		vec3  ns = n_ * D.wyz - D.xzx;

		vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

		vec4 x_ = floor(j * ns.z);
		vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

		vec4 x = x_ *ns.x + ns.yyyy;
		vec4 y = y_ *ns.x + ns.yyyy;
		vec4 h = 1.0 - abs(x) - abs(y);

		vec4 b0 = vec4( x.xy, y.xy );
		vec4 b1 = vec4( x.zw, y.zw );

		vec4 s0 = floor(b0)*2.0 + 1.0;
		vec4 s1 = floor(b1)*2.0 + 1.0;
		vec4 sh = -step(h, vec4(0.0));

		vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
		vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

		vec3 p0 = vec3(a0.xy,h.x);
		vec3 p1 = vec3(a0.zw,h.y);
		vec3 p2 = vec3(a1.xy,h.z);
		vec3 p3 = vec3(a1.zw,h.w);

		//Normalise gradients
		vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
		p0 *= norm.x;
		p1 *= norm.y;
		p2 *= norm.z;
		p3 *= norm.w;

		// Mix final noise value
		vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
		m = m * m;
		return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
										dot(p2,x2), dot(p3,x3) ) );
		}


		float pattern() {

			float s = sin( angle ), c = cos( angle );

			vec2 tex = vUv * tSize - center;
			vec2 point = vec2( c * tex.x - s * tex.y, s * tex.x + c * tex.y ) * scale;

			return ( sin( point.x ) * sin( point.y ) ) * 4.0;

		}

		float sat( float t ){
			return clamp( t, 0.0, 1.0 );
		}
		
		float linterp( float t ) {
			return sat( 1.0 - abs( 2.0*t - 1.0 ) );
		}
		
		float remap( float t, float a, float b ) {
			return sat( (t - a) / (b - a) );
		}
		
		vec3 spectrum_offset( float t ) {
			vec3 ret;
			float lo = step(t,0.5);
			float hi = 1.0-lo;
			float w = linterp( remap( t, 1.0/6.0, 5.0/6.0 ) );
			ret = vec3(lo,1.0,hi) * vec3(1.0-w, w, 1.0-w);
			
			return pow( ret, vec3(1.0/2.2) );
		}
		vec2 barrelDistortion(vec2 coord, float amt) {
			vec2 cc = coord - 0.5;
			float dist = dot(cc, cc);
			return coord + cc * dist * amt;
		}

		const int num_iter = 5;
		const float reci_num_iter_f = 1.0 / float(num_iter);

		float random(vec3 scale, float seed) {
			return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
		}

		vec2 sdf_circle(vec2 coord, vec2 circle, float radius) {
			float dist = length(coord - circle) - radius;
			return normalize(coord - circle) * max(dist, 0.0);
		}

		void main() {
			vec4 color = texture2D( tDiffuse, vUv );
			vec2 screenRatio = vec2(resolution.x / resolution.y, 1.0);
			vec3 sumcol = vec3(0.0);
			vec3 sumw = vec3(0.0);
			vec2 blurOrigin = resolution * 0.5;
			float blurAmount = 0.0 + uBlurAmount;
			vec2 screenUv = vUv * screenRatio;

			vec2 sCircle = uMouse + 0.5;
			// maintain aspect ratio
			float dist = length(screenUv - sCircle);
			float borderEdge = 0.004;
			float radius = 0.05;
			float noise = snoise(vec3(vUv * 10.0, time * 0.1));
			dist -= uBlurAmount;
			
			vec2 toCenter = blurOrigin - vUv * resolution;
			float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);
			for(int i = 0; i < num_iter; i++) {
				float t = float(i) * reci_num_iter_f;
				float percent = (float(i) + offset) / float(num_iter);
				vec3 w = mix(spectrum_offset(t),vec3(1.0),0.5);
				sumw+=w;
				sumcol += w * texture2D(tDiffuse, vUv + toCenter * percent * blurAmount /resolution).rgb;
			}

			float divade = step(uDivade.x, (screenUv.y - screenUv.x - .2) * uDivade.y);

			if(dist < radius + borderEdge + noise * 0.05 && dist > radius + noise * 0.05) {
				if(divade < 0.5) {
					sumcol = vec3(1.0);
					sumw = vec3(1.0);
				} else {
					sumcol = vec3(0.0);
					sumw = vec3(0.0);
				}
			}
			// handle inside distorted area
			if(
				dist < radius + noise * 0.05
			) {
				vec3 col = texture2D(tDiffuse, vUv).rgb;

				if(divade < 0.5) {
					col = vec3(1.0) - col;
				}else {
					col = vec3(1.0) - col * 0.5;
				}
				gl_FragColor = vec4(col, 1.0);
				return;
			}



			gl_FragColor = vec4(sumcol / sumw, 1.0);
		}`
};

export { CustomPostEffectShader };
