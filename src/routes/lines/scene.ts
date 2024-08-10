import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { gsap } from 'gsap/all';
import * as THREE from 'three';
import vertexShader from './vertexShader.glsl';
import fragmentShader from './fragmentShader.glsl';
import Stats from 'three/examples/jsm/libs/stats.module';
import { GUI } from 'lil-gui';

interface Options {
	renderToTarget: boolean;
}

class ParticlesScene {
	renderer: THREE.WebGLRenderer | null = null;
	mouse: THREE.Vector2;
	width = window.innerWidth;
	height = window.innerHeight;
	group: THREE.Group | undefined;
	params = {
		size: 256,
		noiseForce: 0.1,
		hoverRadius: 0.1,
		radar: true,
		radarRadius: 0.5
	};
	stats?: Stats;
	time = 0;
	material!: THREE.ShaderMaterial;
	rafId: number | null = null;
	count!: number;
	scene!: THREE.Scene;
	camera!: THREE.PerspectiveCamera;
	target!: THREE.WebGLRenderTarget;
	loader = new GLTFLoader();
	geometry!: THREE.PlaneGeometry;
	skullGeometry!: THREE.BufferGeometry;
	depthCamera!: THREE.PerspectiveCamera;
	skullMesh!: THREE.Mesh;
	ambientLight!: THREE.AmbientLight;
	directionalLight!: THREE.DirectionalLight;
	skull!: THREE.Mesh;
	text!: string;
	textMesh!: THREE.Mesh;
	skullMaterial!: THREE.MeshPhysicalMaterial;
	gui!: GUI;

	constructor(canvasElement: HTMLCanvasElement | null, opt?: Options) {
		if (!opt?.renderToTarget && canvasElement) {
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
		}

		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.01, 20);
		this.camera.position.z = 1.4;

		this.directionalLight = new THREE.DirectionalLight(new THREE.Color('#24e06d'), 10);
		this.directionalLight.position.set(0, 0, 1);
		this.scene.add(this.directionalLight);

		this.depthCamera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.01, 1);
		this.depthCamera.position.z = 0.5;

		if (this.renderer) {
			// this.scene = new THREE.Scene();
			this.stats = new Stats();
			this.stats.dom.style.left = 'auto';
			this.stats.dom.style.right = '0';
			this.stats.dom.style.top = 'auto';
			this.stats.dom.style.bottom = '0';
			document.body.appendChild(this.stats.dom);

			window.addEventListener('resize', this.onWindowResize.bind(this), false);
			window.addEventListener('mousemove', this.onMouseMove.bind(this), false);
			window.addEventListener('click', this.onClick.bind(this), false);
			window.addEventListener('wheel', this.onWheel.bind(this), false);
		}

		this.mouse = new THREE.Vector2();

		this.loader.load('/Skull.glb', (gltf) => {
			this.skull = gltf.scene.getObjectByName('Prop_Skull') as THREE.Mesh;

			if (this.skull) {
				this.skullGeometry = this.skull.geometry as THREE.BufferGeometry;
				this.skull.material = new THREE.MeshPhysicalMaterial({
					color: new THREE.Color('black'),
					roughness: 0.5,
					metalness: 1.0,
					clearcoatRoughness: 1,
					clearcoat: 1,
					reflectivity: 1,
					transparent: true
				});
				this.skull.position.z = -0.5;
				this.skull.position.y = -0.2;
				this.scene.add(this.skull);

				this.addObjects();

				if (this.renderer) {
					this.addDebug();
					this.animate();
					// this.loadFont();
					this.target = this.setupRenderTarget();
				}
			}
		});

		if (opt?.renderToTarget) {
			return {
				scene: this.scene,
				camera: this.camera,
				destroy: this.destroy.bind(this)
			};
		}
	}

	getRenderTarget() {
		const renderTarget = new THREE.WebGLRenderTarget(this.width, this.height, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			stencilBuffer: false,
			type: THREE.FloatType
		});

		return renderTarget;
	}

	addObjects() {
		this.geometry = new THREE.PlaneGeometry(2, 2, 256, 256);
		this.material = new THREE.ShaderMaterial({
			uniforms: {
				uTime: { value: 0 },
				uMouse: { value: new THREE.Vector2(0, 0) },
				uDepths: { value: null },
				uCameraNear: { value: this.depthCamera.near },
				uCameraFar: { value: this.depthCamera.far },
				uNoise: { value: 0.0 },
				uColor: { value: new THREE.Color('#69f1af') },
				uColor2: { value: new THREE.Color('#50c8fc') }
			},
			vertexShader,
			transparent: true,
			fragmentShader,
			side: THREE.DoubleSide
		});

		const size = 150;
		this.group = new THREE.Group();
		for (let i = 0; i < size; i++) {
			this.geometry = new THREE.PlaneGeometry(6, 0.003, 200, 1);

			const len = this.geometry.attributes.position.array.length;
			const y = new Float32Array(len / 3);

			for (let j = 0; j < len / 3; j++) {
				y[j] = i / size;
			}

			this.geometry.setAttribute('y', new THREE.BufferAttribute(y, 1));

			const mesh = new THREE.Mesh(this.geometry, this.material);
			mesh.position.y = 1.5 - (i / size) * 3;

			this.group.add(mesh);
		}

		// flip the group
		this.group.scale.y = -1;
		this.group.position.z = 0.6;
		this.scene.add(this.group);
	}

	setupRenderTarget() {
		const renderTarget = new THREE.WebGLRenderTarget(this.width, this.height);
		renderTarget.texture.format = THREE.RGBAFormat;
		renderTarget.texture.minFilter = THREE.NearestFilter;
		renderTarget.texture.magFilter = THREE.NearestFilter;
		renderTarget.texture.generateMipmaps = false;
		renderTarget.depthBuffer = true;
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		renderTarget.depthTexture = new THREE.DepthTexture();
		renderTarget.depthTexture.type = THREE.UnsignedShortType;
		renderTarget.depthTexture.format = THREE.DepthFormat;

		return renderTarget;
	}

	addDebug() {
		this.gui = new GUI();
		this.gui.close();
		const folder = this.gui.addFolder('Lights');
		// directional light
		folder.add(this.directionalLight, 'intensity', 0, 10, 0.01).name('Directional Light Intensity');
		folder.addColor(this.directionalLight, 'color').name('Directional Light Color');

		const folder1 = this.gui.addFolder('Material');
		folder1.add(this.material.uniforms.uNoise, 'value', 0, 1, 0.01).name('Noise');
		folder1.addColor(this.material.uniforms.uColor, 'value').name('Color');
		folder1.addColor(this.material.uniforms.uColor2, 'value').name('Color2');
	}

	onWindowResize(): void {
		if (this.renderer) this.renderer.setSize(window.innerWidth, window.innerHeight);
	}

	onMouseMove(event: MouseEvent): void {
		if (this.renderer) {
			const rect = this.renderer.domElement.getBoundingClientRect();
			const x = event.clientX - rect.left;
			const y = event.clientY - rect.top;
			this.mouse.x = (x / this.width) * 2 - 1;
			this.mouse.y = -(y / this.height) * 2 + 1;
		}

		if (this.material) this.material.uniforms.uMouse.value = this.mouse;

		if (this.skull) {
			gsap.to(this.skull.rotation, {
				x: -this.mouse.y,
				y: this.mouse.x,
				duration: 1
			});
		}
		if (this.group) {
			gsap.to(this.group.rotation, {
				x: -this.mouse.y * 0.5,
				y: this.mouse.x * 0.5,
				duration: 1
			});
		}
		if (this.directionalLight) {
			gsap.to(this.directionalLight.position, {
				x: this.mouse.x * 10,
				y: this.mouse.y * 10,
				duration: 1
			});
		}
	}

	animate(): void {
		this.time += 0.01;

		if (this.material) {
			this.material.uniforms.uTime.value = this.time;
			// this.material.uniforms.uCameraNear.value = this.camera.near;
			// this.material.uniforms.uCameraFar.value = this.camera.far;
		}

		// render scene to target
		if (this.target && this.depthCamera && this.renderer) {
			this.renderer.setRenderTarget(this.target);
			this.renderer.render(this.scene, this.depthCamera);
			if (this.material) this.material.uniforms.uDepths.value = this.target.depthTexture;
		}

		// render to screen
		if (this.renderer) {
			this.renderer.setRenderTarget(null);
			this.renderer.render(this.scene, this.camera);
		}

		// lerp camera to mouse pos with sin function
		if (this.camera && this.skull) {
			this.camera.position.x = THREE.MathUtils.lerp(
				this.camera.position.x,
				this.mouse.x * 1.2,
				0.01
			);
			this.camera.position.y = THREE.MathUtils.lerp(
				this.camera.position.y,
				this.mouse.y * 1.5,
				0.01
			);
			this.camera.lookAt(this.skull.position);
		}

		this.rafId = requestAnimationFrame(() => this.animate());

		if (this.stats) this.stats.update();
	}

	onClick(e: MouseEvent): void {
		if (this.material) {
			gsap.fromTo(
				this.material.uniforms.uNoise,
				{
					value: 0.5
				},
				{
					value: 0,
					duration: 3,
					ease: 'power4.inOut'
				}
			);
		}
	}

	destroy(): void {
		window.removeEventListener('mousemove', this.onMouseMove.bind(this));
		window.removeEventListener('click', this.onClick.bind(this));
		window.removeEventListener('wheel', this.onWheel.bind(this));

		if (this.renderer) {
			this.renderer.dispose();
			this.renderer.forceContextLoss();
		}

		this.scene.traverse((child) => {
			if (child instanceof THREE.Mesh) {
				child.geometry.dispose();
				child.material.dispose();
			}
		});

		if (this.stats) this.stats.dom.remove();

		if (this.gui) this.gui.destroy();

		if (this.rafId) cancelAnimationFrame(this.rafId);
	}

	pattern = new RegExp(/[a-zA-Z]/);
	stopWords = ['Backspace', 'Delete', 'Shift'];

	onWheel(event: WheelEvent) {
		if (this.skull) {
			this.skull.position.z += event.deltaY * 0.0001;
		}
	}
}

export default ParticlesScene;
