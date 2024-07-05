import GUI from 'lil-gui';
import * as THREE from 'three';
import vertexShader from './vertexShader.glsl';
import fragmentShader from './fragmentShader.glsl';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { createNoise3D } from 'simplex-noise';
import alea from 'alea';
import Stats from 'three/examples/jsm/libs/stats.module';

function lerp(start: number, end: number, t: number) {
	return start * (1 - t) + end;
}

class ParticlesScene {
	private renderer: THREE.WebGLRenderer;
	private textureLoader: THREE.TextureLoader;
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;
	private raycaster!: THREE.Raycaster;
	private mouse: THREE.Vector2;
	private material: THREE.ShaderMaterial | undefined;
	particlesGeo: THREE.BufferGeometry | undefined;
	raycasetPlane!: THREE.Mesh;
	particles: THREE.Points | undefined;
	gui: GUI | undefined;
	group: THREE.Group | undefined;
	videoElement: HTMLVideoElement | undefined;
	audio: HTMLAudioElement | undefined;
	params = {
		count: 500000,
		threshold: 0.1,
		size: 10,
		noiseRoughness: 0,
		noiseScale: 0,
		hoverRadius: 5.0,
		hoverScale: 0.1,
		hoverStrength: 0.1,
		noise: false,
		hoverNoise: true,
		shaderNoise: true,
		particlesWidth: 10,
		particlesHeight: 7,
		orbitControls: false,
		shaderNoiseRoughness: 0.65,
		shaderNoiseScale: 3.5
	};
	stats?: Stats;
	stream: MediaStream | undefined;

	time = 0;
	texture!: THREE.Texture;
	controls: OrbitControls | undefined;
	videoTexture: THREE.VideoTexture | undefined;

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
		this.stats.dom.style.position = 'absolute';
		this.stats.dom.style.top = 'auto';
		this.stats.dom.style.bottom = '0';
		this.stats.dom.style.right = '1rem';
		this.stats.dom.style.left = 'auto';
		this.stats.dom.style.zIndex = '1000';

		document.body.appendChild(this.stats.dom);

		this.addObjects();

		this.camera = new THREE.PerspectiveCamera(
			75,
			window.innerWidth / window.innerHeight,
			0.1,
			1000
		);
		this.camera.position.set(0, 0, 15);

		this.textureLoader = new THREE.TextureLoader();
		this.textureLoader.load('/ambient2.jpg', (texture) => {
			if (this.material) {
				this.texture = texture;
				this.texture.wrapS = this.texture.wrapT = THREE.RepeatWrapping;

				// get width and height of texture and set particlesWidth and particlesHeight
				const img = new Image();
				img.src = '/ambient2.jpg';
				img.onload = () => {
					this.applySizeFromImage(img);
				};

				this.material.uniforms.uTexture.value = this.texture;
			}
		});

		// set max visible distance
		this.camera.far = 1000;

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.25;
		this.controls.maxPolarAngle = Math.PI / 2;
		this.controls.minPolarAngle = Math.PI / 3;
		this.controls.maxAzimuthAngle = Math.PI / 2;
		this.controls.minAzimuthAngle = -Math.PI / 2;
		this.controls.zoomToCursor = true;

		this.controls.enabled = this.params.orbitControls;

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

		// get width and height of texture and set particlesWidth and particlesHeight
		const img = new Image();
		img.src = url;
		img.onload = () => {
			this.applySizeFromImage(img);
		};

		// update texture in material
		if (this.material) this.material.uniforms.uTexture.value = this.texture;
	}

	applySizeFromImage(img: HTMLImageElement) {
		const isMobile = window.innerWidth < 768;
		const aspectRatio = img.width / img.height;
		// if (isMobile) aspectRatio = 1 / aspectRatio;
		const d = this.params.size;

		this.params.particlesWidth = d * aspectRatio;
		this.params.particlesHeight = d;

		if (this.material) {
			this.material.uniforms.uSize.value = {
				x: img.width,
				y: img.height
			};
		}

		this.addObjects();

		if (this.particles) {
			this.particles.position.set(
				-this.params.particlesWidth * 5.5,
				this.params.particlesHeight * 5,
				isMobile ? -150 : -50
			);
		}
	}

	simplexNoiseVert(ver: Float32Array): Float32Array {
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
		positions = this.simplexNoiseVert(positions);
		this.particlesGeo = particlesGeo;

		particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		particlesGeo.setAttribute('color', new THREE.BufferAttribute(color, 3));
		particlesGeo.setAttribute('index', new THREE.Float32BufferAttribute(indices, 1));

		const material = new THREE.ShaderMaterial({
			vertexShader,
			fragmentShader,
			uniforms: {
				uTime: { value: 0 },
				uTexture: { value: this.videoTexture || this.texture },
				uThreshold: { value: this.params.threshold },
				uMouse: { value: new THREE.Vector2() },
				screenWidth: { value: window.innerWidth },
				mouseUVCoords: { value: new THREE.Vector2() },
				uRadius: { value: this.params.hoverRadius },
				uScale: { value: this.params.hoverScale },
				uStrength: { value: this.params.hoverStrength },
				uHoverNoiseEnabled: { value: this.params.hoverNoise },
				uSize: {
					value: {
						x: this.params.particlesWidth,
						y: this.params.particlesHeight
					}
				},
				uEnabledNoise: { value: this.params.shaderNoise },
				uNoiseRoughness: { value: this.params.shaderNoiseRoughness },
				uNoiseScale: { value: this.params.shaderNoiseScale }
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
		this.scene.add(this.particles);

		// this.particles.position.set(0, 0, -10);
		this.particles.rotateX(Math.PI / 2);

		// get width and height of texture and set particlesWidth and particlesHeight
		this.raycasetPlane = new THREE.Mesh(
			new THREE.PlaneGeometry(
				this.params.particlesWidth * 3.2,
				this.params.particlesHeight * 3.2,
				1,
				1
			),
			new THREE.MeshBasicMaterial({ wireframe: true, depthTest: false, side: THREE.DoubleSide })
		);
		this.raycasetPlane.position.x = -2;
		this.scene.add(this.raycasetPlane);
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

		this.gui
			.add(this.params, 'size')
			.min(0.01)
			.max(10)
			.step(0.01)
			.onFinishChange(() => {
				const aspectRatio = this.params.particlesWidth / this.params.particlesHeight;

				this.params.particlesWidth = this.params.size * aspectRatio;
				this.params.particlesHeight = this.params.size;

				if (this.material)
					this.material.uniforms.uSize.value = {
						x: this.params.particlesWidth,
						y: this.params.particlesHeight
					};

				if (this.particles)
					this.particles.position.set(
						-this.params.particlesWidth * 5,
						this.params.particlesHeight * 5,
						-50
					);

				// this.addObjects();
			});

		const folderNoise = this.gui.addFolder('Noise');
		folderNoise.add(this.params, 'noise');

		folderNoise
			.add(this.params, 'noiseRoughness')
			.min(0.1)
			.max(10)
			.step(0.01)
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

		folderNoise
			.add(this.params, 'noiseScale')
			.min(0.1)
			.max(10)
			.step(0.01)
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

		const folderHoverNoise = this.gui.addFolder('Hover Noise');

		folderHoverNoise.add(this.params, 'hoverNoise').onFinishChange(() => {
			if (this.material) this.material.uniforms.uHoverNoiseEnabled.value = this.params.hoverNoise;
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

		const folderShaderNoise = this.gui.addFolder('Shader Noise');
		folderShaderNoise.add(this.params, 'shaderNoise').onFinishChange(() => {
			if (this.material) this.material.uniforms.uEnabledNoise.value = this.params.shaderNoise;
		});
		folderShaderNoise
			.add(this.params, 'shaderNoiseRoughness')
			.min(0.1)
			.max(10)
			.step(0.01)
			.onFinishChange(() => {
				if (this.material)
					this.material.uniforms.uNoiseRoughness.value = this.params.shaderNoiseRoughness;
			});
		folderShaderNoise
			.add(this.params, 'shaderNoiseScale')
			.min(0.1)
			.max(10)
			.step(0.01)
			.onFinishChange(() => {
				if (this.material) this.material.uniforms.uNoiseScale.value = this.params.shaderNoiseScale;
			});
	}

	onWindowResize(): void {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
	}

	onMouseMove(event: MouseEvent): void {
		// raycasting
		this.mouse = new THREE.Vector2(
			(event.clientX / window.innerWidth) * 2 - 1,
			-(event.clientY / window.innerHeight) * 2 + 1
		);
		this.raycaster.setFromCamera(this.mouse, this.camera);
		const intersects = this.raycaster.intersectObject(this.raycasetPlane);
		console.log(intersects);
		if (intersects.length > 0) {
			try {
				const uv = intersects[0].uv;
				if (!uv) return;
				uv.y = 1 - uv.y;
				// normalize uv
				uv.x = uv.x + 0.3;

				console.log(this.mouse);
				if (this.material) this.material.uniforms.mouseUVCoords.value = uv;
			} catch {}
		}
	}

	animate(): void {
		this.renderer.render(this.scene, this.camera);

		if (this.stats) this.stats.update();

		this.time += 0.01;
		if (this.material) {
			this.material.uniforms.uTime.value += this.time;
			this.material.uniforms.uMouse.value = this.mouse;
		}

		if (this.particlesGeo && this.params.noise) {
			const vert = this.particlesGeo.getAttribute('position');
			const _ver = this.simplexNoiseVert(vert.array as Float32Array);
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
		this.videoElement?.remove();
		this.stats?.dom.remove();
		if (this.stream) this.stream.getTracks().forEach((track) => track.stop());
	}

	getUserMedia(): void {
		navigator.mediaDevices
			.getUserMedia({ video: true })
			.then((stream) => {
				this.stream = stream;
				const video = document.createElement('video');
				video.srcObject = stream;
				video.play();
				document.body.appendChild(video);
				video.style.position = 'absolute';
				video.style.bottom = '0';
				video.style.left = '0';
				video.style.width = '250px';
				video.style.height = '250px';
				video.style.zIndex = '1000';

				this.videoTexture = new THREE.VideoTexture(video);
				this.videoTexture.minFilter = THREE.LinearFilter;
				this.videoTexture.magFilter = THREE.LinearFilter;

				this.videoElement = video;

				if (this.material) this.material.uniforms.uTexture.value = this.videoTexture;
			})
			.catch((err) => {
				console.error('Error getting user media', err);
			});
	}
}

export default ParticlesScene;
