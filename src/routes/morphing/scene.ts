import vertexShader from './vertexShader.glsl';
import fragmentShader from './fragmentShader.glsl';
import Stats from 'three/examples/jsm/libs/stats.module';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import GUI from 'lil-gui';
import gsap from 'gsap';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';

class MorphingScene {
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
	particles: {
		geometry?: THREE.BufferGeometry;
		material?: THREE.ShaderMaterial;
		points?: THREE.Points;
		maxCount: number;
		positions?: THREE.Float32BufferAttribute[];
		index: number;
		targetIndex: number;
		sizes?: Float32Array;
	} = {
		maxCount: 0,
		index: 1,
		targetIndex: 0
	};
	controls: OrbitControls;
	debugObject = {
		clearColor: '#160920',
		progress: 0,
		morphDuration: 0.5,
		morphMergeSize: 0.1,
		size: 0.4,
		color1: '#50c8fc',
		color2: '#0576f0'
	};

	constructor(canvasElement: HTMLCanvasElement) {
		this.renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: true,
			canvas: canvasElement
		});
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.setClearColor(new THREE.Color('#160920'), 0);

		this.scene = new THREE.Scene();

		/**
		 * Camera
		 */
		// Base camera
		this.camera = new THREE.PerspectiveCamera(35, this.width / this.height, 0.1, 100);
		this.camera.position.set(0, 0, 20);
		this.scene.add(this.camera);

		// Loaders
		this.dracoLoader = new DRACOLoader();
		this.dracoLoader.setDecoderPath('./draco/');
		this.gltfLoader = new GLTFLoader();
		this.gltfLoader.setDRACOLoader(this.dracoLoader);

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
		this.controls.enabled = false;

		// Add objects
		this.addObjects();

		// Debug
		this.addDebug();

		// initial render
		this.animate();

		// Events
		window.addEventListener('resize', this.onWindowResize.bind(this), false);
		window.addEventListener('mousemove', this.onMouseMove.bind(this), false);
	}

	onReady() {
		// Ready callback
	}

	async addObjects() {
		// Load models
		// this.gltfLoader.load('/models.glb', (gltf: GLTF) => {
		const gltf = await this.gltfLoader.loadAsync('/models.glb');
		// Positions
		const { children } = gltf.scene;
		const maxCount = Math.max(
			...children.map(
				(child) => (child as THREE.Mesh).geometry.getAttribute('position')?.count || 0
			)
		);

		this.particles = {
			...this.particles,
			maxCount,
			positions: []
		};

		children.forEach((child) => {
			const position = (child as THREE.Mesh).geometry.getAttribute(
				'position'
			) as THREE.BufferAttribute;
			const original = position.array;
			const newArr = new Float32Array(maxCount * 3);

			for (let i = 0; i < maxCount; i++) {
				const i3 = i * 3;
				const i3mod = i3 % original.length;

				newArr.set(original.subarray(i3mod, i3mod + 3), i3);
			}

			if (this.particles.positions)
				this.particles.positions.push(new THREE.Float32BufferAttribute(newArr, 3));
		});

		this.particles.sizes = Float32Array.from({ length: maxCount }, () => Math.random());

		// Geometry
		this.particles.geometry = new THREE.BufferGeometry();
		if (this.particles.positions) {
			this.particles.geometry.setAttribute(
				'position',
				this.particles.positions[this.particles.index]
			);

			this.particles.geometry.setAttribute(
				'aPositionTarget',
				this.particles.positions[this.particles.targetIndex]
			);
		}

		this.particles.geometry.setAttribute(
			'aSize',
			new THREE.BufferAttribute(this.particles.sizes, 1)
		);

		// Material
		this.particles.material = new THREE.ShaderMaterial({
			vertexShader,
			fragmentShader,
			blending: THREE.AdditiveBlending,
			depthTest: false,
			uniforms: {
				uProgress: new THREE.Uniform(0),
				uSize: new THREE.Uniform(this.debugObject.size),
				uResolution: new THREE.Uniform(
					new THREE.Vector2(this.width * this.pixelRatio, this.height * this.pixelRatio)
				),
				uMorphMergeSize: new THREE.Uniform(this.debugObject.morphMergeSize),
				uMorphDuration: new THREE.Uniform(this.debugObject.morphDuration),
				uMouse: new THREE.Uniform(new THREE.Vector2(0, 0)),
				uTime: new THREE.Uniform(0),
				uColor1: new THREE.Uniform(new THREE.Color(this.debugObject.color1)),
				uColor2: new THREE.Uniform(new THREE.Color(this.debugObject.color2))
			}
		});

		// Points
		this.particles.points = new THREE.Points(this.particles.geometry, this.particles.material);
		// Disable frustum culling for preventing points to be culled
		this.particles.points.frustumCulled = false;
		this.scene.add(this.particles.points);

		// On ready callback
		this.onReady();
		// });
	}

	morph({ index, targetIndex }: { index?: number; targetIndex?: number }) {
		if (index !== undefined) this.particles.index = index;
		if (targetIndex !== undefined) this.particles.targetIndex = targetIndex;

		if (this.particles.geometry && this.particles.positions) {
			this.particles.geometry.setAttribute(
				'position',
				this.particles.positions[this.particles.index]
			);
			this.particles.geometry.setAttribute(
				'aPositionTarget',
				this.particles.positions[this.particles.targetIndex]
			);
		}
	}

	addDebug() {
		this.gui = new GUI({ width: 300 });

		this.gui.open();
		this.gui.addColor(this.debugObject, 'clearColor').onChange(() => {
			this.renderer.setClearColor(this.debugObject.clearColor);
		});
		this.gui
			.add(this.debugObject, 'progress')
			.min(0)
			.max(1)
			.step(0.001)
			.onChange(() => {
				if (this.particles.material) {
					this.particles.material.uniforms.uProgress.value = this.debugObject.progress;
				}
			});

		this.gui
			.add(this.debugObject, 'morphDuration')
			.min(0.1)
			.max(1)
			.step(0.01)
			.onChange(() => {
				if (this.particles.material) {
					this.particles.material.uniforms.uMorphDuration.value = this.debugObject.morphDuration;
				}
			});

		this.gui
			.add(this.debugObject, 'morphMergeSize')
			.min(0.01)
			.max(1)
			.step(0.01)
			.onChange(() => {
				if (this.particles.material) {
					this.particles.material.uniforms.uMorphMergeSize.value = this.debugObject.morphMergeSize;
				}
			});

		this.gui
			.add(this.debugObject, 'size')
			.min(0.1)
			.max(5)
			.step(0.1)
			.onChange(() => {
				if (this.particles.material) {
					this.particles.material.uniforms.uSize.value = this.debugObject.size;
				}
			});

		this.gui.addColor(this.debugObject, 'color1').onChange(() => {
			if (this.particles.material) {
				this.particles.material.uniforms.uColor1.value = new THREE.Color(this.debugObject.color1);
			}
		});

		this.gui.addColor(this.debugObject, 'color2').onChange(() => {
			if (this.particles.material) {
				this.particles.material.uniforms.uColor2.value = new THREE.Color(this.debugObject.color2);
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
		if (this.particles.material) {
			this.particles.material.uniforms.uResolution.value = new THREE.Vector2(
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

		// Rescaling from (-1, 1) to (-4.5, 4.5)
		// this.mouse.x *= 4.5;
		// this.mouse.y *= 4.5;

		// Shifting the center from (0, 0) to (0.5, 0.5)
		// this.mouse.x += 0.5;
		// this.mouse.y += 0.5;

		console.log('[morph:mouse]', this.mouse);

		if (this.particles.material) {
			this.particles.material.uniforms.uMouse.value = this.mouse;
		}
	}

	animate(): void {
		this.time += 0.01;

		// Update controls
		if (this.controls) this.controls.update();

		// Lerp particles to mouse position
		if (this.particles.points) {
			this.particles.points.position.x = gsap.utils.interpolate(
				this.particles.points.position.x,
				this.mouse.x,
				0.01
			);
			this.particles.points.position.y = gsap.utils.interpolate(
				this.particles.points.position.y,
				this.mouse.y,
				0.01
			);
		}

		// Rotate points
		if (this.particles.points) {
			this.particles.points.rotation.y = Math.sin(this.time * 0.1) * 0.5;
		}

		// Update particles
		if (this.particles.material) {
			this.particles.material.uniforms.uTime.value = this.time;
		}

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

		if (this.gui) this.gui.destroy();

		this.renderer.dispose();
		this.renderer.forceContextLoss();

		this.scene.traverse((child) => {
			if (child instanceof THREE.Mesh) {
				child.geometry.dispose();
				child.material.dispose();
			}
		});

		if (this.stats) this.stats.dom.remove();
	}
}

export default MorphingScene;
