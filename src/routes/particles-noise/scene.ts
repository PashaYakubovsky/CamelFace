import { gsap } from 'gsap/all';
import GUI from 'lil-gui';
import * as THREE from 'three';
import vertexShader from './vertexShader.glsl';
import fragmentShader from './fragmentShader.glsl';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { createNoise3D } from 'simplex-noise';
import alea from 'alea';

function lerp(start: number, end: number, t: number) {
	return start * (1 - t) + end;
}

class ParticlesScene {
	public particlesGeo: THREE.BufferGeometry | undefined;
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
		count: 100000,
		threshold: 0.1,
		size: 0.04,
		noiseRoughness: 0.0,
		noiseScale: 0.0,
		hoverRadius: 2.0,
		hoverScale: 1.0,
		hoverStrength: 0.1,
		noise: true,
		hoverNoise: true,
		particlesWidth: 7,
		particlesHeight: 7
	};

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
		this.textureLoader.load('/ambient2.jpg', (texture) => {
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
		this.camera.position.set(25, -25, 15);

		// set max visible distance
		this.camera.far = 1000;

		// if (this.particles) this.camera.lookAt(this.particles.position);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.25;
		this.controls.maxPolarAngle = Math.PI / 2;
		this.controls.minPolarAngle = Math.PI / 3;

		this.controls.maxAzimuthAngle = Math.PI / 2;
		this.controls.minAzimuthAngle = -Math.PI / 2;

		this.controls.target = new THREE.Vector3(40, -30, 0);

		this.controls.zoomToCursor = true;

		this.raycaster = new THREE.Raycaster();
		this.mouse = new THREE.Vector2();

		window.addEventListener('resize', this.onWindowResize.bind(this), false);
		window.addEventListener('mousemove', this.onMouseMove.bind(this), false);

		this.addDebug();
		this.animate();
	}

	uploadNewFile(file: File) {
		// take texture from file
		const url = URL.createObjectURL(file);
		const texture = this.textureLoader.load(url);
		this.texture = texture;

		// update texture in material
		if (this.material) this.material.uniforms.uTexture.value = this.texture;
	}

	positionAndUVForVertices(ver: Float32Array): Float32Array {
		const _ver = ver.slice();

		const noiseRoughness = this.params.noiseRoughness;
		const noiseScale = this.params.noiseScale;
		const width = this.params.particlesWidth;
		const height = this.params.particlesHeight;

		// create a new random function based on the seed
		const prng = alea('seed');

		const getNoise = createNoise3D(prng);
		// generate terrain vertices
		const count = this.params.count;

		for (let i = 0; i < count; i++) {
			const u = Math.random();
			const v = Math.random();

			const x = lerp(-width, width, u);
			const z = lerp(-height, height, v);
			const y = getNoise(x * noiseScale, z * noiseScale, this.time) * noiseRoughness;

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
		this.particlesGeo = particlesGeo;

		particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		particlesGeo.setAttribute('color', new THREE.BufferAttribute(color, 3));
		particlesGeo.setAttribute('index', new THREE.Float32BufferAttribute(indices, 1));

		const material = new THREE.ShaderMaterial({
			vertexShader,
			fragmentShader,
			uniforms: {
				uTime: { value: 0 },
				uTexture: { value: this.texture },
				uThreshold: { value: this.params.threshold },
				uSize: { value: this.params.size },
				uMouse: { value: new THREE.Vector2() },
				screenWidth: { value: window.innerWidth },
				mouseUVCoords: { value: new THREE.Vector2() },
				uRadius: { value: this.params.hoverRadius },
				uScale: { value: this.params.hoverScale },
				uStrength: { value: this.params.hoverStrength },
				uActiveNoise: { value: this.params.hoverNoise }
			},
			transparent: true,
			depthTest: false,
			side: THREE.DoubleSide
			// blending: THREE.AdditiveBlending
		});
		this.material = material;

		if (this.particles) {
			this.scene.remove(this.particles);
		}

		this.particles = new THREE.Points(particlesGeo, material);
		this.particles.scale.set(10, 10, 10);
		this.scene.add(this.particles);

		this.particles.position.set(0, 0, -10);
		this.particles.rotateX(Math.PI / 2);
	}

	addDebug() {
		this.gui = new GUI();
		this.gui
			.add(this.params, 'count')
			.min(100)
			.max(2000000)
			.step(100)
			.onFinishChange(this.addObjects.bind(this));

		const folderNoise = this.gui.addFolder('Noise');

		folderNoise
			.add(this.params, 'size')
			.min(0.01)
			.max(10)
			.step(0.01)
			.onFinishChange(this.addObjects.bind(this));

		folderNoise.add(this.params, 'noise');

		folderNoise
			.add(this.params, 'noiseRoughness')
			.min(0.1)
			.max(10)
			.step(0.01)
			.onFinishChange(this.addObjects.bind(this));

		folderNoise
			.add(this.params, 'noiseScale')
			.min(0.1)
			.max(10)
			.step(0.01)
			.onFinishChange(this.addObjects.bind(this));

		const folderHoverNoise = this.gui.addFolder('Hover Noise');

		folderHoverNoise.add(this.params, 'hoverNoise').onFinishChange(() => {
			if (this.material) this.material.uniforms.uActiveNoise.value = this.params.hoverNoise;
		});

		folderHoverNoise
			.add(this.params, 'hoverRadius')
			.min(0.01)
			.max(10)
			.step(0.01)
			.onFinishChange(() => {
				if (this.material) this.material.uniforms.uRadius.value = this.params.hoverRadius;
			});

		folderHoverNoise
			.add(this.params, 'hoverScale')
			.min(0.01)
			.max(10)
			.step(0.01)
			.onFinishChange(() => {
				if (this.material) this.material.uniforms.uScale.value = this.params.hoverScale;
			});

		folderHoverNoise
			.add(this.params, 'hoverStrength')
			.min(0.01)
			.max(10)
			.step(0.01)
			.onFinishChange(() => {
				if (this.material) this.material.uniforms.uStrength.value = this.params.hoverStrength;
			});
	}

	onWindowResize(): void {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
	}

	onMouseMove(event: MouseEvent): void {
		// this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
		// this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

		// if (this.material) this.material.uniforms.uMouse.value = this.mouse;

		const rect = this.renderer.domElement.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		const mouseUVCoords = new THREE.Vector2(x / rect.width, y / rect.height);
		if (this.material) this.material.uniforms.mouseUVCoords.value = mouseUVCoords;
	}

	animate(): void {
		this.renderer.render(this.scene, this.camera);

		this.time += 0.01;
		if (this.material) {
			this.material.uniforms.uTime.value += this.time;
			this.material.uniforms.uMouse.value = this.mouse;
		}

		if (this.particlesGeo && this.params.noise) {
			const vert = this.particlesGeo.getAttribute('position');
			const _ver = this.positionAndUVForVertices(vert.array as Float32Array);
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			//@ts-ignore
			vert.array = _ver;
			vert.needsUpdate = true;
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
