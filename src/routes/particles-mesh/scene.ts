import { gsap } from 'gsap/all';
import GUI from 'lil-gui';
import * as THREE from 'three';
import vertexShader from './vertexShader.glsl';
import fragmentShader from './fragmentShader.glsl';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { createNoise3D } from 'simplex-noise';
import alea from 'alea';
import Stats from 'three/examples/jsm/libs/stats.module';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

function lerp(start: number, end: number, t: number) {
	return start * (1 - t) + end;
}

class ParticlesScene {
	public particlesGeo: THREE.BufferGeometry | undefined;
	private renderer: THREE.WebGLRenderer;
	// private textureLoader: THREE.TextureLoader;
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;
	private raycaster: THREE.Raycaster;
	private mouse: THREE.Vector2;
	public particles: THREE.Points | undefined;
	private geometry!: THREE.BufferGeometry;
	private material: THREE.ShaderMaterial | undefined;
	public gui: GUI | undefined;
	public group: THREE.Group | undefined;
	public videoElement: HTMLVideoElement | undefined;
	public audio: HTMLAudioElement | undefined;
	public params = {
		count: 500000,
		threshold: 0.1,
		noiseRoughness: 0,
		particlesWidth: 10,
		particlesHeight: 10,
		orbitControls: true
	};
	public stats?: Stats;
	public stream: MediaStream | undefined;

	public time = 0;
	public texture!: THREE.Texture;
	public controls: OrbitControls | undefined;
	public videoTexture: THREE.VideoTexture | undefined;
	private FBXLoader: FBXLoader | undefined;

	constructor(canvasElement: HTMLCanvasElement) {
		this.renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: true,
			canvas: canvasElement,
			powerPreference: 'high-performance'
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
		this.stats = new Stats();

		document.body.appendChild(this.stats.dom);

		this.addParticlesFromGLTF();
		this.addObjects();

		this.camera = new THREE.PerspectiveCamera(
			75,
			window.innerWidth / window.innerHeight,
			0.1,
			1000
		);
		this.camera.position.set(0, 0, 15);

		// set max visible distance
		this.camera.far = 1000;

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enabled = this.params.orbitControls;

		this.raycaster = new THREE.Raycaster();
		this.mouse = new THREE.Vector2();

		window.addEventListener('resize', this.onWindowResize.bind(this), false);
		window.addEventListener('mousemove', this.onMouseMove.bind(this), false);

		this.addDebug();
		this.animate();
	}

	addParticlesFromGLTF() {
		this.FBXLoader = new FBXLoader();
		this.FBXLoader.load('/Casual_Hoodie.fbx', (fbx) => {
			this.group = new THREE.Group();
			fbx.children.forEach((c) => {
				console.log(c.name);

				const obj = c as THREE.Mesh;
				const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
				if (!obj.geometry) return;
				const geometry = new THREE.BufferGeometry();
				// geometry.setFromPoints(obj.geometry.attributes);
				// const mesh = new THREE.Points(geometry, material);
				// this.scene.add(mesh);
			});
			// apply animations
			// this.mixer = new THREE.AnimationMixer(fbx);
			// const action = this.mixer.clipAction(fbx.animations[0]);
			// action.play();

			// scale down the model and add it to the scene
			// this.group.add(fbx);
			// this.scene.add(this.group);
		});
	}

	addObjects(): void {
		this.scene.clear();
		const particlesGeo = new THREE.BufferGeometry();
		const count = this.params.count;
		const positions = new Float32Array(count * 3);
		let color = new Float32Array(count * 3);
		color = color.map(() => Math.random());
		let indices = new Float32Array(count);
		indices = indices.map((_, i) => i);
		this.particlesGeo = particlesGeo;

		for (let i = 0; i < count; i++) {
			// positions
			positions[i * 3] = (Math.random() - 0.5) * this.params.particlesWidth;
			positions[i * 3 + 1] = (Math.random() - 0.5) * this.params.particlesHeight;
			positions[i * 3 + 2] = Math.random() * 10;
		}

		particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		particlesGeo.setAttribute('color', new THREE.BufferAttribute(color, 3));
		particlesGeo.setAttribute('index', new THREE.Float32BufferAttribute(indices, 1));

		const material = new THREE.ShaderMaterial({
			vertexShader,
			fragmentShader,
			uniforms: {
				uTime: { value: 0 },
				uMouse: { value: new THREE.Vector2() },
				screenWidth: { value: window.innerWidth },
				mouseUVCoords: { value: new THREE.Vector2() }
			},
			transparent: true,
			depthTest: false,
			side: THREE.DoubleSide,
			blending: THREE.AdditiveBlending
		});
		this.material = material;

		if (this.particles) {
			this.scene.remove(this.particles);
		}

		this.particles = new THREE.Points(particlesGeo, material);
		this.particles.scale.set(10, 10, 10);
		this.particles.position.set(-5, -10, -50);
		// this.scene.add(this.particles);
	}

	addDebug() {
		this.gui = new GUI();

		this.gui.add(this.params, 'orbitControls').onFinishChange(() => {
			if (this.controls) this.controls.enabled = this.params.orbitControls;
		});
		this.gui
			.add(this.params, 'count')
			.min(100)
			.max(2000000)
			.step(100)
			.onFinishChange(() => {
				this.addObjects();

				if (this.particles) {
					this.particles.position.set(
						-this.params.particlesWidth * 5,
						this.params.particlesHeight * 5,
						-50
					);
				}
			});
	}

	onWindowResize(): void {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
	}

	onMouseMove(event: MouseEvent): void {
		const rect = this.renderer.domElement.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		const mouseUVCoords = new THREE.Vector2(x / rect.width, y / rect.height);

		if (this.material) this.material.uniforms.mouseUVCoords.value = mouseUVCoords;
	}

	animate(): void {
		this.renderer.render(this.scene, this.camera);

		if (this.stats) this.stats.update();

		this.time += 0.01;
		if (this.material) {
			this.material.uniforms.uTime.value += this.time;
			this.material.uniforms.uMouse.value = this.mouse;
		}

		// if (this.mixer) {
		// 	this.mixer.update(0.01);
		// }

		requestAnimationFrame(() => this.animate());
	}

	destroy(): void {
		this.renderer.dispose();
		this.scene.clear();
		this.gui?.destroy();
		this.videoElement?.remove();
		this.stats?.dom.remove();
		if (this.stream) this.stream.getTracks().forEach((track) => track.stop());
	}
}

export default ParticlesScene;
