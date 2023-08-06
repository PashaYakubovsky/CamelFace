import { gsap } from 'gsap/all';
import GUI from 'lil-gui';
import * as THREE from 'three';

class ParticlesScene {
	private renderer: THREE.WebGLRenderer;
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;
	private raycaster: THREE.Raycaster;
	private mouse: THREE.Vector2;
	public particles: THREE.Points | undefined;
	private geometry: THREE.BufferGeometry;
	public material: THREE.ShaderMaterial | undefined;
	private count: number;
	private positions: Float32Array;
	private colors: Float32Array;
	private sizes: Float32Array;
	public gui: GUI | undefined;
	public group: THREE.Group | undefined;
	public audio: HTMLAudioElement | undefined;
	public params: {
		count: number;
		size: number;
		radius: number;
		branches: number;
		spin: number;
		randomness: number;
		randomnessPower: number;
		insideColor: string;
		outsideColor: string;
	};
	public time = 0;

	constructor(canvasElement: HTMLCanvasElement) {
		this.renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: true,
			canvas: canvasElement
		});
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.setClearColor(0x000000, 0);
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1;
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

		this.scene = new THREE.Scene();

		this.camera = new THREE.PerspectiveCamera(
			75,
			window.innerWidth / window.innerHeight,
			0.1,
			1000
		);
		this.camera.position.set(0, -4, 10);

		this.raycaster = new THREE.Raycaster();
		this.mouse = new THREE.Vector2();

		this.params = {
			count: 100000,
			size: 0.04,
			radius: 10,
			branches: 12,
			spin: 1,
			randomness: 0.1,
			randomnessPower: 1,
			insideColor: '#ff6030',
			outsideColor: '#1b3984'
		};

		this.geometry = new THREE.BufferGeometry();
		this.count = this.params.count;
		this.positions = new Float32Array(this.count * 3);
		this.colors = new Float32Array(this.count * 3);
		this.sizes = new Float32Array(this.count);

		this.calclulateGeometry();

		this.material = new THREE.ShaderMaterial({
			vertexShader: `
		        uniform vec2 uMouse;
		        uniform float uTime;
		        uniform float uSize;
				attribute float aRandom;

		        void main() {
		            vec4 modelPosition = modelMatrix * vec4(position, 0.8);

		            gl_Position = projectionMatrix * viewMatrix * modelPosition;

		            gl_PointSize = uSize * 10.0 / length(gl_Position.xyz);
		        }
		    `,
			fragmentShader: `
				// Author @patriciogv - 2015
				// http://patriciogonzalezvivo.com
				
				// My own port of this processing code by @beesandbombs
				// https://dribbble.com/shots/1696376-Circle-wave
				
				#ifdef GL_ES
				precision mediump float;
				#endif
				
				uniform vec2 uResolution;
				uniform vec2 uMouse;
				uniform float uTime;
				
				vec2 random2(vec2 st){
					st = vec2( dot(st,vec2(127.1,311.7)),
							dot(st,vec2(269.5,183.3)) );
					return -1.0 + 2.0*fract(sin(st)*43758.5453123);
				}
				
				// Gradient Noise by Inigo Quilez - iq/2013
				// https://www.shadertoy.com/view/XdXGW8
				float noise(vec2 st) {
					vec2 i = floor(st);
					vec2 f = fract(st);
				
					vec2 u = f*f*(3.0-2.0*f);
				
					return mix( mix( dot( random2(i + vec2(0.0,0.0) ), f - vec2(0.0,0.0) ),
									dot( random2(i + vec2(1.0,0.0) ), f - vec2(1.0,0.0) ), u.x),
								mix( dot( random2(i + vec2(0.0,1.0) ), f - vec2(0.0,1.0) ),
									dot( random2(i + vec2(1.0,1.0) ), f - vec2(1.0,1.0) ), u.x), u.y);
				}
				
				mat2 rotate2d(float _angle){
					return mat2(cos(_angle),-sin(_angle),
								sin(_angle),cos(_angle));
				}
				
				float shape(vec2 st, float radius) {
					st = vec2(0.5)-st;
					float r = length(st)*2.0;
					float a = atan(st.y,st.x);
					float m = abs(mod(a+uTime*2.,3.14*2.)-3.14)/3.6;
					float f = radius;
					m += noise(st+uTime*0.1)*.5;
					a *= 1.+abs(atan(uTime*0.2))*.1;
					a *= 1.+noise(st+uTime*0.1)*0.1;
					f += sin(a*50.)*noise(st+uTime*.2)*.1;
					f += (sin(a*20.)*.1*pow(m,2.));
					return 1.-smoothstep(f,f+0.007,r);
				}
				
				float shapeBorder(vec2 st, float radius, float width) {
					return shape(st,radius)-shape(st,radius-width);
				}
				
				void main() {
					vec2 st = gl_FragCoord.xy/uResolution.xy;
					vec3 color = vec3(.5) * shapeBorder(st,0.1,0.02);
				
					gl_FragColor = vec4( 1.-color, 1.0 );
				}
		    `,
			uniforms: {
				uTime: { value: 0 },
				uSize: { value: 0 },
				uMouse: { value: new THREE.Vector2() },
				aSize: { value: 0 },
				uColor1: { value: new THREE.Color('pink') },
				uColor2: { value: new THREE.Color('red') },
				uColor3: { value: new THREE.Color('white') },
				uTexture: { value: new THREE.TextureLoader().load('/particle.png') },
				uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
			},

			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
			vertexColors: true
		});

		this.particles = new THREE.Points(this.geometry, this.material);

		this.group = new THREE.Group();
		this.group.add(this.particles);
		this.group.rotation.set(1, 0, 0);
		this.group.position.set(-0.5, -2, 0);
		this.scene.add(this.group);

		window.addEventListener('resize', this.onWindowResize.bind(this), false);
		window.addEventListener('mousemove', this.onMouseMove.bind(this), false);

		// this.addDebug();
		this.animate();

		this.audio = new Audio();
		this.audio.src = '/galaxy.mp3';
	}

	public addDebug() {
		this.gui = new GUI();
		this.gui
			.add(this.params, 'count')
			.min(100)
			.max(1000000)
			.step(100)
			.onFinishChange(this.calclulateGeometry.bind(this));
		this.gui
			.add(this.params, 'size')
			.min(0.001)
			.max(0.1)
			.step(0.001)
			.onFinishChange(this.calclulateGeometry.bind(this));
		this.gui
			.add(this.params, 'radius')
			.min(1)
			.max(20)
			.step(0.1)
			.onFinishChange(this.calclulateGeometry.bind(this));
		this.gui
			.add(this.params, 'branches')
			.min(2)
			.max(20)
			.step(1)
			.onFinishChange(this.calclulateGeometry.bind(this));
		this.gui
			.add(this.params, 'spin')
			.min(-5)
			.max(5)
			.step(0.001)
			.onFinishChange(this.calclulateGeometry.bind(this));
		this.gui
			.add(this.params, 'randomness')
			.min(0)
			.max(2)
			.step(0.001)
			.onFinishChange(this.calclulateGeometry.bind(this));
	}

	public calclulateGeometry(): void {
		const insideColor = new THREE.Color(this.params.insideColor);
		const outsideColor = new THREE.Color(this.params.outsideColor);

		for (let i = 0; i < this.count; i++) {
			const i3 = i * 3;

			// Position
			const radius = Math.random() * this.params.radius;
			const spinAngle = radius * this.params.spin;
			const branchAngle = ((i % this.params.branches) / this.params.branches) * Math.PI * 2;

			const randomX =
				Math.pow(Math.random(), this.params.randomnessPower) *
				(Math.random() < 0.5 ? 1 : -1) *
				this.params.randomness *
				radius;
			const randomY =
				Math.pow(Math.random(), this.params.randomnessPower) *
				(Math.random() < 0.5 ? 1 : -1) *
				this.params.randomness *
				radius;
			const randomZ =
				Math.pow(Math.random(), this.params.randomnessPower) *
				(Math.random() < 0.5 ? 1 : -1) *
				this.params.randomness *
				radius;

			this.positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
			this.positions[i3 + 1] = randomY;
			this.positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;

			// Color
			const mixedColor = insideColor.clone();
			mixedColor.lerp(outsideColor, radius / this.params.radius);

			this.colors[i3] = mixedColor.r;
			this.colors[i3 + 1] = mixedColor.g;
			this.colors[i3 + 2] = mixedColor.b;

			// Sizes
			this.sizes[i] = this.params.size;

			this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
			this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
			this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));

			const randoms = new Float32Array(this.params.randomness / 3);
			const colorRandom = new Float32Array(this.params.randomness / 3);

			this.geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
			this.geometry.setAttribute('aColorRandom', new THREE.BufferAttribute(colorRandom, 1));
		}

		// need update for shader
		this.geometry.attributes.position.needsUpdate = true;
	}

	public onWindowResize(): void {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
	}

	public onMouseMove(event: MouseEvent): void {
		this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
		this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

		if (this.material) this.material.uniforms.uMouse.value = this.mouse;

		this.raycaster.setFromCamera(this.mouse, this.camera);
	}

	public fadeOut(instance: ParticlesScene): void {
		const tl = gsap.timeline();

		this.audio?.play();

		tl.to(
			this.camera.position,
			{
				duration: 3,
				z: 10,
				ease: 'power0'
			},
			'start'
		);
		tl.to(
			this.camera.position,
			{
				duration: 3,
				x: -0.5,
				y: -2,
				z: 0,
				ease: 'power2.inOut'
			},
			'end'
		);
		if (instance.group) {
			tl.to(
				instance.group.rotation,
				{
					duration: 6,
					x: 5,
					y: 10,
					z: 0,
					ease: 'power0'
				},
				'start'
			);
		}

		setTimeout(() => {
			this.audio?.pause();
		}, 5000);

		window.removeEventListener('resize', this.onWindowResize, false);
		window.removeEventListener('mousemove', this.onMouseMove, false);
	}

	public animate(): void {
		this.renderer.render(this.scene, this.camera);

		this.time += 0.01;
		if (this.material) {
			this.material.uniforms.uTime.value += this.time;
			this.material.uniforms.uMouse.value = this.mouse;
		}

		if (this.particles) {
			this.particles.rotation.y += 0.001;
		}

		requestAnimationFrame(() => this.animate());
	}
}

export default ParticlesScene;
