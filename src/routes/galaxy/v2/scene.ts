import { gsap } from 'gsap/all';
import GUI from 'lil-gui';
import * as THREE from 'three';
import vertexShader from './vertexShader.glsl';
import fragmentShader from './fragmentShader.glsl';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { createNoise3D, createNoise2D } from 'simplex-noise';

function lerp(start: number, end: number, t: number) {
	return start * (1 - t) + end;
}

class ParticlesScene {
	private renderer: THREE.WebGLRenderer;
	private textureLoader: THREE.TextureLoader;
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;
	private raycaster: THREE.Raycaster;
	private mouse: THREE.Vector2;
	public particles: THREE.Points | undefined;
	private geometry!: THREE.BufferGeometry;
	private material: THREE.ShaderMaterial | undefined;
	public gui: GUI | undefined;
	public group: THREE.Group | undefined;
	public audio: HTMLAudioElement | undefined;
	public params = {
		count: 1000,
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

		this.addObjects();

		this.textureLoader = new THREE.TextureLoader();
		this.textureLoader.load('/particle3.png', (texture) => {
			if (this.material) {
				this.texture = texture;
				this.texture.wrapS = this.texture.wrapT = THREE.RepeatWrapping;

				this.material.uniforms.uTexture.value = this.texture;
			}
		});

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

	simpleNoiseVertices(vertices: Float32Array) {
		const getNoise = createNoise3D();
		const _vertices = vertices.slice();

		for (let i = 0; i < _vertices.length; i += 3) {
			const x = (Math.random() - 0.5) * 100;
			const y = (Math.random() - 0.5) * 100;
			const z = (Math.random() - 0.5) * 100;

			const noise = getNoise(x, y, z);
			_vertices[i] = x + noise;
			_vertices[i + 1] = noise;
			_vertices[i + 2] = z + noise;
		}

		return _vertices;
	}

	positionAndUVForVertices(ver: Float32Array): Float32Array {
		const _ver = ver.slice();
		const minRadius = 1;
		const maxRadius = 1;

		const uvs = new Float32Array(this.params.count * 2);

		// generate torus vertices
		const count = this.params.count;
		for (let i = 0; i < count; i++) {
			const theta = Math.random() * Math.PI * 2;
			const radius = lerp(minRadius, maxRadius, Math.random() * 1.5);

			const x = radius * Math.sin(theta) * 2;
			const y = 0;
			const z = radius * Math.cos(theta) * 2;

			_ver[i * 3] = x;
			_ver[i * 3 + 1] = y;
			_ver[i * 3 + 2] = z;
		}

		return _ver;
	}

	addObjects(): void {
		this.scene.clear();
		const particlesGeo = new THREE.BufferGeometry();
		const count = this.params.count;
		let positions = new Float32Array(count * 3);
		let color = new Float32Array(count * 3);
		color = color.map(() => Math.random());
		let indices = new Float32Array(count);
		indices = indices.map((_, i) => i);
		positions = this.positionAndUVForVertices(positions);

		particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		particlesGeo.setAttribute('color', new THREE.BufferAttribute(color, 3));
		particlesGeo.setAttribute('index', new THREE.Float32BufferAttribute(indices, 1));
		// particlesGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
		// const material = new THREE.PointsMaterial({
		// 	size: this.params.size * 20,
		// 	depthTest: false,
		// 	transparent: true,
		// 	blending: THREE.AdditiveBlending,
		// 	map: new THREE.TextureLoader().load('/particle3.png')
		// });

		const material = new THREE.ShaderMaterial({
			vertexShader,
			fragmentShader,
			uniforms: {
				uTime: { value: 0 },
				uTexture: { value: new THREE.TextureLoader().load('/particle3.png') },
				uThreshold: { value: this.params.threshold },
				uSize: { value: this.params.size },
				uMouse: { value: new THREE.Vector2() }
			},
			transparent: true,
			side: THREE.DoubleSide,
			blending: THREE.AdditiveBlending
		});

		// vUv = ( uvTransform * vec3( uv, 1 ) ).xy;

		if (this.particles) {
			this.scene.remove(this.particles);
		}

		this.particles = new THREE.Points(particlesGeo, material);
		this.scene.add(this.particles);
	}

	addDebug() {
		this.gui = new GUI();
		this.gui
			.add(this.params, 'count')
			.min(100)
			.max(2000)
			.step(100)
			.onFinishChange(this.addObjects.bind(this));

		this.gui
			.add(this.params, 'size')
			.min(0.01)
			.max(10)
			.step(0.01)
			.onFinishChange(this.addObjects.bind(this));
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

		requestAnimationFrame(() => this.animate());
	}

	destroy(): void {
		this.renderer.dispose();
		this.scene.clear();
		this.gui?.destroy();
	}
}

export default ParticlesScene;
