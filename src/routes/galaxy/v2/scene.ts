import { gsap } from 'gsap/all';
import GUI from 'lil-gui';
import * as THREE from 'three';
import vertexShader from './vertexShader.glsl';
import fragmentShader from './fragmentShader.glsl';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

class ParticlesScene {
	private renderer: THREE.WebGLRenderer;
	private textureLoader: THREE.TextureLoader;
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;
	private raycaster: THREE.Raycaster;
	private mouse: THREE.Vector2;
	public particles: THREE.InstancedMesh | undefined;
	private geometry!: THREE.BufferGeometry;
	private material: THREE.ShaderMaterial | undefined;
	public gui: GUI | undefined;
	public group: THREE.Group | undefined;
	public audio: HTMLAudioElement | undefined;
	public params = {
		count: 100,
		threshold: 0.5,
		size: 0.04,
		discard: true,
		numVisible: 0
	};
	public width = 500;
	public height = 500;
	public time = 0;
	public texture!: THREE.Texture;
	public controls: OrbitControls | undefined;

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

		this.textureLoader = new THREE.TextureLoader();
		this.textureLoader.load('/ambient.jpg', (texture) => {
			if (this.material) {
				this.texture = texture;

				if (this.material.uniforms.uTexture) {
					this.material.uniforms.uTexture.value = this.texture;
				}
			}
		});

		this.addParticles();

		const box = new THREE.BoxGeometry(1, 1, 1);
		const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
		const cube = new THREE.Mesh(box, material);

		this.group = new THREE.Group();
		this.group.add(cube);

		this.scene.add(this.group);

		this.camera = new THREE.PerspectiveCamera(
			75,
			window.innerWidth / window.innerHeight,
			0.1,
			1000
		);
		this.camera.position.set(0, -4, 10);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);

		this.raycaster = new THREE.Raycaster();
		this.mouse = new THREE.Vector2();

		window.addEventListener('resize', this.onWindowResize.bind(this), false);
		window.addEventListener('mousemove', this.onMouseMove.bind(this), false);

		this.addDebug();
		this.animate();
	}

	addParticles(): void {
		const geometry = new THREE.BufferGeometry();
		const count = this.params.count;

		const positions = new Float32Array(count * 3);
		const colors = new Float32Array(count * 3);
		const sizes = new Float32Array(count);
		const materials = [];

		const getColorPerlinNoise = (x: number, y: number, z: number) => {
			const c = Math.abs(Math.sin(x * 0.01) + Math.sin(y * 0.01) + Math.sin(z * 0.01));
			return c;
		};

		for (let i = 0; i < count; i++) {
			const i3 = i * 3;

			const x = (Math.random() - 0.5) * 10;
			const y = (Math.random() - 0.5) * 10;
			const z = (Math.random() - 0.5) * 10;

			positions[i3 + 0] = x;
			positions[i3 + 1] = y;
			positions[i3 + 2] = z;

			const color = new THREE.Color();
			color.setHSL(getColorPerlinNoise(x, y, z), 0.5, 0.5);
			colors[i3 + 0] = color.r;
			colors[i3 + 1] = color.g;
			colors[i3 + 2] = color.b;

			sizes[i] = Math.random() * 0.1;

			// const material = new THREE.PointsMaterial({
			// 	size: sizes[i],
			// 	blending: THREE.AdditiveBlending,
			// 	depthTest: false,
			// 	transparent: true
			// });
		}

		geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
		geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
		geometry.computeVertexNormals();

		const material = new THREE.ShaderMaterial({
			uniforms: {
				uTime: { value: 0 },
				uTexture: { value: this.texture },
				uMouse: { value: new THREE.Vector2() }
			},
			vertexShader,
			fragmentShader,
			side: THREE.DoubleSide,
			transparent: true,
			depthTest: false,
			depthWrite: false,
			blending: THREE.AdditiveBlending
		});

		for (let i = 0; i < this.params.count; i++) {
			const mat = material.clone();
			materials.push(mat);

			const particles = new THREE.Points(geometry, mat);

			this.scene.add(particles);
		}

		// const material = new THREE.ShaderMaterial({
		// 	uniforms: {
		// 		uTime: { value: 0 },
		// 		uTexture: { value: this.texture },
		// 		uMouse: { value: new THREE.Vector2() }
		// 	},
		// 	vertexShader,
		// 	fragmentShader,
		// 	transparent: true,
		// 	depthTest: false,
		// 	depthWrite: false,
		// 	blending: THREE.AdditiveBlending
		// });
	}

	addDebug() {
		this.gui = new GUI();
		this.gui
			.add(this.params, 'count')
			.min(100)
			.max(2000)
			.step(100)
			.onFinishChange(this.addParticles.bind(this));
	}

	onWindowResize(): void {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
	}

	onMouseMove(event: MouseEvent): void {
		this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
		this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

		if (this.material) this.material.uniforms.uMouse.value = this.mouse;

		this.raycaster.setFromCamera(this.mouse, this.camera);
	}

	animate(): void {
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

	destroy(): void {
		this.renderer.dispose();
		this.scene.clear();
		this.gui?.destroy();
	}
}

export default ParticlesScene;
