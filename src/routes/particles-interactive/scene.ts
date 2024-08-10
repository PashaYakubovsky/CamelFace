import GUI from 'lil-gui';
import * as THREE from 'three';
import vertexShader from './vertexShader.glsl';
import fragmentShader from './fragmentShader.glsl';
import simVertexShader from './simVertexShader.glsl';
import simFragmentShader from './simFragmentShader.glsl';
import Stats from 'three/examples/jsm/libs/stats.module';

class ParticlesScene {
	renderer: THREE.WebGLRenderer | null = null;
	mouse: THREE.Vector2;
	width = window.innerWidth;
	height = window.innerHeight;
	gui: GUI | undefined;
	rafId: number | null = null;
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
	fbo!: THREE.WebGLRenderTarget;
	fbo1!: THREE.WebGLRenderTarget;
	fboScene!: THREE.Scene;
	fboCamera!: THREE.OrthographicCamera;
	fboMaterial!: THREE.ShaderMaterial;
	fboMesh!: THREE.Mesh;
	fboTexture!: THREE.DataTexture;
	data!: Float32Array;
	infoArr!: Float32Array;
	info!: THREE.DataTexture;
	material!: THREE.ShaderMaterial;
	count!: number;
	scene!: THREE.Scene;
	camera!: THREE.OrthographicCamera;

	constructor(canvasElement: HTMLCanvasElement | null, opt?: { renderToTarget: boolean }) {
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

			// this.scene = new THREE.Scene();
			this.stats = new Stats();
			this.stats.dom.style.left = 'auto';
			this.stats.dom.style.right = '0';
			this.stats.dom.style.top = 'auto';
			this.stats.dom.style.bottom = '0';
			document.body.appendChild(this.stats.dom);
		}
		this.scene = new THREE.Scene();
		this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
		this.camera.lookAt(0, 0, 1);
		this.camera.position.z = 0.5;

		this.mouse = new THREE.Vector2();

		window.addEventListener('resize', this.onWindowResize.bind(this), false);
		window.addEventListener('mousemove', this.onMouseMove.bind(this), false);

		this.setupFBO();
		this.addObjects();

		if (!opt?.renderToTarget) {
			this.addDebug();
		}
		this.animate();

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

	setupFBO() {
		this.fbo = this.getRenderTarget();
		this.fbo1 = this.getRenderTarget();

		this.fboScene = new THREE.Scene();
		this.fboCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);

		this.fboCamera.position.z = 0.5;
		this.fboCamera.lookAt(0, 0, 0);

		this.data = new Float32Array(this.params.size * this.params.size * 4);

		for (let i = 0; i < this.params.size; i++) {
			for (let j = 0; j < this.params.size; j++) {
				const index = (i * this.params.size + j) * 4;
				const theta = Math.random() * Math.PI * 2;
				const r = 0.5 * Math.random();

				this.data[index + 0] = Math.sin(theta) * r;
				this.data[index + 1] = Math.cos(theta) * r;
				this.data[index + 2] = 1;
				this.data[index + 3] = 1;
			}
		}

		this.fboTexture = new THREE.DataTexture(
			this.data,
			this.params.size,
			this.params.size,
			THREE.RGBAFormat,
			THREE.FloatType
		);
		this.fboTexture.needsUpdate = true;
		this.fboTexture.magFilter = THREE.NearestFilter;
		this.fboTexture.minFilter = THREE.NearestFilter;

		const geometry = new THREE.PlaneGeometry(2, 2);
		this.fboMaterial = new THREE.ShaderMaterial({
			uniforms: {
				uPositions: { value: this.fboTexture },
				uInfo: { value: null },
				uTime: { value: 0 },
				uMouse: { value: new THREE.Vector2(0, 0) },
				uForce: { value: this.params.noiseForce },
				uHoverRadius: { value: this.params.hoverRadius },
				uRadar: { value: this.params.radar },
				uRadarRadius: { value: this.params.radarRadius }
			},
			vertexShader: simVertexShader,
			fragmentShader: simFragmentShader,
			side: THREE.DoubleSide
		});

		this.infoArr = new Float32Array(this.params.size * this.params.size * 4);
		for (let i = 0; i < this.params.size; i++) {
			for (let j = 0; j < this.params.size; j++) {
				const index = (i * this.params.size + j) * 4;
				this.infoArr[index + 0] = 0.5 + Math.random();
				this.infoArr[index + 1] = 0.5 + Math.random();
				this.infoArr[index + 2] = 1;
				this.infoArr[index + 3] = 1;
			}
		}

		this.info = new THREE.DataTexture(
			this.infoArr,
			this.params.size,
			this.params.size,
			THREE.RGBAFormat,
			THREE.FloatType
		);

		this.fboMaterial.uniforms.uInfo.value = this.info;
		this.info.needsUpdate = true;

		this.fboMesh = new THREE.Mesh(geometry, this.fboMaterial);
		this.fboScene.add(this.fboMesh);

		if (this.renderer) {
			this.renderer.setRenderTarget(this.fbo);
			this.renderer.render(this.fboScene, this.fboCamera);
			this.renderer.setRenderTarget(this.fbo1);
			this.renderer.render(this.fboScene, this.fboCamera);
		}
	}

	addObjects() {
		// add plane
		this.count = this.params.size ** 2;

		const geometry = new THREE.BufferGeometry();
		const positions = new Float32Array(this.count * 3);
		const uv = new Float32Array(this.count * 2);

		for (let i = 0; i < this.params.size; i++) {
			for (let j = 0; j < this.params.size; j++) {
				const index = (i * this.params.size + j) * 3;
				const uvIndex = (i * this.params.size + j) * 2;

				const theta = Math.random() * Math.PI * 2;
				const r = Math.random() * 1;

				positions[index + 0] = Math.sin(theta) * r;
				positions[index + 1] = Math.cos(theta) * r;
				positions[index + 2] = 0;

				uv[uvIndex + 0] = j / this.params.size;
				uv[uvIndex + 1] = i / this.params.size;
			}
		}

		geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));

		this.material = new THREE.ShaderMaterial({
			uniforms: {
				uPositions: { value: null },
				uTime: { value: 0 },
				uMouse: { value: new THREE.Vector2(0, 0) },
				uTexture: { value: new THREE.TextureLoader().load('/particle2.jpeg') },
				uForce: { value: this.params.noiseForce },
				uHoverRadius: { value: this.params.hoverRadius },
				uRadar: { value: this.params.radar },
				uRadarRadius: { value: this.params.radarRadius }
			},
			vertexShader,
			fragmentShader,
			side: THREE.DoubleSide,
			transparent: true,
			blendDst: THREE.OneMinusSrcAlphaFactor,
			blending: THREE.AdditiveBlending
		});

		this.material.uniforms.uPositions.value = this.fboTexture;

		const plane = new THREE.Points(geometry, this.material);

		this.scene.add(plane);
	}

	addDebug() {
		this.gui = new GUI();

		const t = {
			['size^2*4']: this.params.size
		};
		this.gui
			.add(t, 'size^2*4')
			.min(1)
			.max(1200)
			.step(1)
			.onFinishChange(() => {
				this.params.size = t['size^2*4'];
				// clean up
				this.fboMaterial.dispose();
				this.fboTexture.dispose();
				this.fbo.dispose();

				this.setupFBO();
			});

		this.gui
			.add(this.params, 'noiseForce')
			.min(0.1)
			.max(10)
			.step(0.01)
			.onFinishChange(() => {
				if (this.fboMaterial) this.fboMaterial.uniforms.uForce.value = this.params.noiseForce;
				if (this.material) this.material.uniforms.uForce.value = this.params.noiseForce;
			});

		this.gui
			.add(this.params, 'hoverRadius')
			.min(0.01)
			.max(5)
			.step(0.01)
			.onFinishChange(() => {
				if (this.fboMaterial)
					this.fboMaterial.uniforms.uHoverRadius.value = this.params.hoverRadius;
				if (this.material) this.material.uniforms.uHoverRadius.value = this.params.hoverRadius;
			});

		this.gui
			.add(this.params, 'radar')
			.name('radar')
			.onChange(() => {
				if (this.fboMaterial) this.fboMaterial.uniforms.uRadar.value = this.params.radar;
				if (this.material) this.material.uniforms.uRadar.value = this.params.radar;
			});

		this.gui
			.add(this.params, 'radarRadius')
			.min(0.01)
			.max(5)
			.step(0.01)
			.onFinishChange(() => {
				if (this.fboMaterial)
					this.fboMaterial.uniforms.uRadarRadius.value = this.params.radarRadius;
				if (this.material) this.material.uniforms.uRadarRadius.value = this.params.radarRadius;
			});
	}

	onWindowResize(): void {
		if (this.renderer) this.renderer.setSize(window.innerWidth, window.innerHeight);
	}

	onMouseMove(event: MouseEvent): void {
		const rect = this.renderer
			? this.renderer.domElement.getBoundingClientRect()
			: document.body.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		this.mouse.x = (x / this.width) * 2 - 1;
		this.mouse.y = -(y / this.height) * 2 + 1;

		if (this.material) this.material.uniforms.uMouse.value = this.mouse;
		if (this.fboMaterial)
			this.fboMaterial.uniforms.uMouse.value = {
				x: -this.mouse.x,
				y: this.mouse.y
			};
	}

	animate(): void {
		this.time += 0.01;

		if (this.fboMaterial) this.fboMaterial.uniforms.uTime.value = this.time;
		if (this.material) this.material.uniforms.uTime.value = this.time;

		this.rafId = requestAnimationFrame(() => this.animate());

		// render to fbo
		if (this.fboMaterial) this.fboMaterial.uniforms.uPositions.value = this.fbo1.texture;
		if (this.material) this.material.uniforms.uPositions.value = this.fbo1.texture;
		// render to fbo
		if (this.renderer) {
			this.renderer.setRenderTarget(this.fbo);
			this.renderer.render(this.fboScene, this.fboCamera);
			// render to screen
			this.renderer.setRenderTarget(null);
			this.renderer.render(this.scene, this.camera);
		}
		// swap render targets
		const temp = this.fbo;
		this.fbo = this.fbo1;
		this.fbo1 = temp;

		if (this.stats) this.stats.update();
	}

	destroy(): void {
		if (this.gui) {
			this.gui.destroy();
		}
		window.removeEventListener('mousemove', this.onMouseMove.bind(this));

		if (this.renderer) {
			this.renderer.dispose();
			this.renderer.forceContextLoss();
		}

		if (this.material) this.material.dispose();
		if (this.fboMaterial) this.fboMaterial.dispose();
		if (this.fboTexture) this.fboTexture.dispose();
		if (this.fbo) this.fbo.dispose();
		if (this.fbo1) this.fbo1.dispose();

		if (this.stats) this.stats.dom.remove();

		if (this.rafId) cancelAnimationFrame(this.rafId);
	}
}

export default ParticlesScene;
