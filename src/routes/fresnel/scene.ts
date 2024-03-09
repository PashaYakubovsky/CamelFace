import vertexShader from './vertexShader.glsl';
import fragmentShader from './fragmentShader.glsl';
import Stats from 'three/examples/jsm/libs/stats.module';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import GUI from 'lil-gui';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { Sky } from 'three/examples/jsm/objects/Sky';

class MophingScene {
	private renderer: THREE.WebGLRenderer;
	private mouse: THREE.Vector2;
	private width = window.innerWidth;
	private height = window.innerHeight;
	private pixelRatio = Math.min(window.devicePixelRatio, 2);
	stats?: Stats;
	time = 0;
	scene!: THREE.Scene;
	camera!: THREE.PerspectiveCamera;
	gui!: GUI;
	gltfLoader: GLTFLoader;
	dracoLoader: DRACOLoader;
	material!: THREE.ShaderMaterial;
	controls: OrbitControls;
	debugObject = {
		clearColor: '#312f32',
		color: '#50c8fc',
		orbitControls: false,
		falloff: 0.9,
		stripeMultiplier: 15,
		fresnelPower: 1,
		floorColor: '#6c83a7',
		holographicMultiplier: 2.25
	};
	floorPlane!: THREE.Mesh;
	sky!: Sky;

	constructor(canvasElement: HTMLCanvasElement) {
		this.renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: true,
			canvas: canvasElement
		});
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.setClearColor(new THREE.Color(this.debugObject.clearColor));

		this.scene = new THREE.Scene();

		/**
		 * Camera
		 */
		// Base camera
		this.camera = new THREE.PerspectiveCamera(35, this.width / this.height, 0.0001, 10000);
		this.camera.position.set(0, 0, 20);
		this.scene.add(this.camera);

		// Loaders
		this.dracoLoader = new DRACOLoader();
		this.dracoLoader.setDecoderPath('./draco/');
		this.gltfLoader = new GLTFLoader();
		this.gltfLoader.setDRACOLoader(this.dracoLoader);

		// Lights
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
		this.scene.add(ambientLight);
		const directionalLight = new THREE.DirectionalLight(0xffffff, 12);
		directionalLight.position.set(0, 0, 10);

		this.stats = new Stats();
		this.stats.dom.style.left = 'auto';
		this.stats.dom.style.right = '0';
		this.stats.dom.style.top = 'auto';
		this.stats.dom.style.bottom = '0';
		document.body.appendChild(this.stats.dom);

		this.mouse = new THREE.Vector2();

		// Controls
		this.controls = new OrbitControls(this.camera, canvasElement);
		this.controls.enableDamping = true;
		// Disable controls
		this.controls.enabled = this.debugObject.orbitControls;

		// Add objects
		this.addObjects();

		// add sky
		this.addSky();

		// debug
		this.addDebug();

		// initial render
		this.animate();

		// Events
		window.addEventListener('resize', this.onWindowResize.bind(this), false);
		window.addEventListener('mousemove', this.onMouseMove.bind(this), false);
	}

	addSky() {
		// add sky
		this.sky = new Sky();
		const sun = new THREE.Vector3();
		this.scene.add(this.sky);

		// scale
		this.sky.scale.setScalar(200);

		const effectController = {
			turbidity: 10,
			rayleigh: 8.8,
			mieCoefficient: 0.005,
			mieDirectionalG: 0.7,
			elevation: -102,
			azimuth: 1,
			exposure: this.renderer?.toneMappingExposure
		};

		const updateSky = () => {
			const uniforms = this.sky.material.uniforms;
			uniforms['turbidity'].value = effectController.turbidity;
			uniforms['rayleigh'].value = effectController.rayleigh;
			uniforms['mieCoefficient'].value = effectController.mieCoefficient;
			uniforms['mieDirectionalG'].value = effectController.mieDirectionalG;

			const phi = THREE.MathUtils.degToRad(90 - effectController.elevation);
			const theta = THREE.MathUtils.degToRad(effectController.azimuth);

			sun.setFromSphericalCoords(1, phi, theta);

			uniforms['sunPosition'].value.copy(sun);
			if (!this.renderer || !effectController.exposure) return;
			this.renderer.toneMappingExposure = effectController.exposure;
			this.renderer.render(this.scene, this.camera);
		};
		updateSky();
	}

	addObjects() {
		// Load models
		// this.gltfLoader.load('/AnimatedHuman.glb', (gltf: GLTF) => {
		/**
		 * Setup objects
		 */
		// const mesh = gltf.scene.getObjectByName('Human_Mesh') as THREE.SkinnedMesh;

		// Material
		this.material = new THREE.ShaderMaterial({
			vertexShader,
			fragmentShader,
			transparent: true,
			side: THREE.DoubleSide,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
			depthTest: false,
			uniforms: {
				uProgress: new THREE.Uniform(0),
				uResolution: new THREE.Uniform(
					new THREE.Vector2(this.width * this.pixelRatio, this.height * this.pixelRatio)
				),
				uMouse: new THREE.Uniform(new THREE.Vector2(0, 0)),
				uTime: new THREE.Uniform(0),
				uColor: new THREE.Uniform(new THREE.Color(this.debugObject.color)),
				uFolloff: new THREE.Uniform(this.debugObject.falloff),
				uFresnelPower: new THREE.Uniform(this.debugObject.fresnelPower)
			}
		});

		const geometry = new THREE.SphereGeometry(5, 32, 32);
		const mesh = new THREE.Mesh(geometry, this.material);

		const geometry1 = new THREE.SphereGeometry(4.8, 32, 32);
		this.material1 = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
		const mesh1 = new THREE.Mesh(geometry1, this.material1);

		mesh.add(mesh1);

		mesh.material = this.material;
		mesh.frustumCulled = false;
		this.scene.add(mesh);
	}

	addDebug() {
		this.gui = new GUI({ width: 300 });

		this.gui.open();
		this.gui.addColor(this.debugObject, 'clearColor').onChange(() => {
			this.renderer.setClearColor(this.debugObject.clearColor);
		});
		this.gui.add(this.debugObject, 'orbitControls').onChange((value: boolean) => {
			this.controls.enabled = value;
		});

		// sky
		const skyFolder = this.gui.addFolder('Sky');
		// on/off
		skyFolder.add(this.sky, 'visible').name('Visible');
		skyFolder
			.add(this.sky.scale, 'x')
			.min(1)
			.max(100)
			.step(1)
			.name('Sky Scale')
			.onChange(() => {
				this.sky.scale.setScalar(this.sky.scale.x);
			});
		skyFolder
			.add(this.sky.material.uniforms.turbidity, 'value')
			.min(1)
			.max(20)
			.step(1)
			.name('Turbidity');

		skyFolder
			.add(this.sky.material.uniforms.rayleigh, 'value')
			.min(0.1)
			.max(10)
			.step(0.1)
			.name('Rayleigh');

		// fresnel
		const fresnelFolder = this.gui.addFolder('Fresnel');
		fresnelFolder
			.addColor(this.debugObject, 'color')
			.name('Fresnel color')
			.onChange(() => {
				if (this.material) {
					this.material.uniforms.uColor.value = new THREE.Color(this.debugObject.color);
				}
			});
		fresnelFolder
			.addColor(this.material1, 'color')
			.name('Sphere color')
			.onChange(() => {
				if (this.material1) {
					this.material1.color.set(this.debugObject.floorColor);
				}
			});
		fresnelFolder
			.add(this.debugObject, 'falloff')
			.min(0)
			.max(1)
			.step(0.01)
			.name('Falloff')
			.onChange(() => {
				if (this.material) {
					this.material.uniforms.uFolloff.value = this.debugObject.falloff;
				}
			});
		fresnelFolder
			.add(this.debugObject, 'fresnelPower')
			.min(0.01)
			.max(10)
			.step(0.01)
			.name('Fresnel Power')
			.onChange(() => {
				if (this.material) {
					this.material.uniforms.uFresnelPower.value = this.debugObject.fresnelPower;
				}
			});
	}

	onWindowResize(): void {
		this.width = window.innerWidth;
		this.height = window.innerHeight;

		// Update camera
		this.camera.aspect = this.width / this.height;
		this.camera.updateProjectionMatrix();

		// Update renderer
		this.renderer.setSize(this.width, this.height);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		// Update resolution uniform
		if (this.material) {
			this.material.uniforms.uResolution.value = new THREE.Vector2(
				this.width * this.pixelRatio,
				this.height * this.pixelRatio
			);
		}
	}

	onMouseMove(event: MouseEvent): void {
		// Get the bounding rectangle of the renderer
		const rect = this.renderer.domElement.getBoundingClientRect();

		// Calculate the mouse's position within the renderer (0, 0 is the top left corner)
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		// Normalizing the x, y coordinates (which will be in pixels)
		// to a range suitable for shaders (-1 to 1 for x and 1 to -1 for y)
		this.mouse.x = (x / rect.width) * 2 - 1;
		this.mouse.y = -(y / rect.height) * 2 + 1;

		// Update the mouse uniform
		if (this.material) {
			this.material.uniforms.uMouse.value = this.mouse;
		}
	}

	animate(): void {
		this.time += 0.01;

		// Update controls
		if (this.controls) this.controls.update();

		// Update material
		if (this.material) {
			this.material.uniforms.uTime.value = this.time;
		}

		// Lerp rotation camera to look at the center react to mouse
		this.camera.rotation.y = THREE.MathUtils.lerp(this.camera.rotation.y, this.mouse.x, 0.01);
		this.camera.rotation.x = THREE.MathUtils.lerp(this.camera.rotation.x, this.mouse.y, 0.01);

		// Render normal scene
		this.renderer.render(this.scene, this.camera);

		requestAnimationFrame(() => this.animate());

		if (this.stats) this.stats.update();
	}

	onClick(e: MouseEvent): void {
		e.preventDefault();
	}

	destroy(): void {
		window.removeEventListener('mousemove', this.onMouseMove.bind(this));

		this.renderer.dispose();
		this.renderer.forceContextLoss();

		if (this.gui) this.gui.destroy();

		this.scene.traverse((child) => {
			if (child instanceof THREE.Mesh) {
				child.geometry.dispose();
				child.material.dispose();
			}
		});

		if (this.stats) this.stats.dom.remove();
	}
}

export default MophingScene;
