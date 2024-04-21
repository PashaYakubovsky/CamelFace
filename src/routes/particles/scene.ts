import * as THREE from 'three';
import vertexShader from './vertexShader.glsl';
import fragmentShader from './fragmentShader.glsl';
import { GUI } from 'lil-gui';
import gsap from 'gsap';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'stats.js';

const options = {
	color: '#00bfff'
};

class Particles {
	private scene: THREE.Scene = new THREE.Scene();
	camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
		75,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	);
	renderer: THREE.WebGLRenderer | null = null;
	private material: THREE.ShaderMaterial | null = null;
	private geometry: THREE.PlaneGeometry | null = null;
	private gui: GUI | null = null;
	private controls: OrbitControls | null = null;
	private instancedMesh: THREE.InstancedMesh | null = null;
	private stats = new Stats();
	sizes = {
		width: window.innerWidth,
		height: window.innerHeight,
		pixelRatio: window.devicePixelRatio
	};
	displacement: Partial<{
		canvas: HTMLCanvasElement;
		context: CanvasRenderingContext2D;
		glowImage: HTMLImageElement;
		interactivePlane: THREE.Mesh;
		raycaster: THREE.Raycaster;
		screenCursor: THREE.Vector2;
		canvasCursor: THREE.Vector2;
		canvasCursorPrevious: THREE.Vector2;
		texture: THREE.CanvasTexture;
	}> = {};
	textureLoader: THREE.TextureLoader | null = null;

	constructor(el: HTMLCanvasElement) {
		this.camera.position.z = 1;
		this.renderer = new THREE.WebGLRenderer({
			canvas: el,
			antialias: true
		});

		this.renderer.toneMapping = THREE.ReinhardToneMapping;
		this.renderer.setClearColor('#050505');
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.setPixelRatio(window.devicePixelRatio);

		this.addDebug();
		this.setInitialValues();
		this.animate();

		// add stats
		this.stats.showPanel(0);
		document.body.appendChild(this.stats.dom);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		// add controls to the scene
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.25;
		this.controls.enableZoom = true;
		this.controls.autoRotate = true;
		this.controls.autoRotateSpeed = 0.5;
		this.controls.enablePan = true;

		window.addEventListener('resize', this.onResize.bind(this));
	}

	setInitialValues() {
		this.displacement = {};

		// create interactive mesh for raycasting
		const geometry = new THREE.PlaneGeometry(20, 20, 1, 1);
		const material = new THREE.MeshBasicMaterial({
			color: new THREE.Color('#fff'),
			side: THREE.DoubleSide,
			visible: false
		});
		const plane = new THREE.Mesh(geometry, material);
		this.scene.add(plane);
		this.displacement.interactivePlane = plane;

		// 2D canvas
		this.displacement.canvas = document.createElement('canvas');
		this.displacement.canvas.width = 256;
		this.displacement.canvas.height = 256;
		this.displacement.canvas.style.position = 'fixed';
		this.displacement.canvas.style.width = '256px';
		this.displacement.canvas.style.height = '256px';
		this.displacement.canvas.style.top = '0px';
		this.displacement.canvas.style.left = '0px';
		this.displacement.canvas.style.zIndex = '10';
		document.body.append(this.displacement.canvas);

		// Context
		this.displacement.context = this.displacement.canvas.getContext('2d')!;
		this.displacement.context.fillRect(
			0,
			0,
			this.displacement.canvas.width,
			this.displacement.canvas.height
		);

		// Glow image
		this.displacement.glowImage = new Image();
		this.displacement.glowImage.src = './glow.png';

		// Raycaster
		this.displacement.raycaster = new THREE.Raycaster();

		// Coordinates
		this.displacement.screenCursor = new THREE.Vector2(9999, 9999);
		this.displacement.canvasCursor = new THREE.Vector2(9999, 9999);
		this.displacement.canvasCursorPrevious = new THREE.Vector2(9999, 9999);

		window.addEventListener('pointermove', (event) => {
			if (
				!this.displacement.screenCursor ||
				!this.displacement.canvasCursor ||
				!this.displacement.canvasCursorPrevious
			)
				return;
			this.displacement.screenCursor.x = (event.clientX / this.sizes.width) * 2 - 1;
			this.displacement.screenCursor.y = -(event.clientY / this.sizes.height) * 2 + 1;
		});

		// Texture
		this.displacement.texture = new THREE.CanvasTexture(this.displacement.canvas);

		/**
		 * Particles
		 */
		const particlesGeometry = new THREE.PlaneGeometry(20, 20, 128, 128);
		particlesGeometry.setIndex(null);
		particlesGeometry.deleteAttribute('normal');

		const intensitiesArray = new Float32Array(particlesGeometry.attributes.position.count);
		const anglesArray = new Float32Array(particlesGeometry.attributes.position.count);

		for (let i = 0; i < particlesGeometry.attributes.position.count; i++) {
			intensitiesArray[i] = Math.random();
			anglesArray[i] = Math.random() * Math.PI * 2;
		}

		particlesGeometry.setAttribute('aIntensity', new THREE.BufferAttribute(intensitiesArray, 1));
		particlesGeometry.setAttribute('aAngle', new THREE.BufferAttribute(anglesArray, 1));
		this.textureLoader = new THREE.TextureLoader();
		const particlesMaterial = new THREE.ShaderMaterial({
			vertexShader: vertexShader,
			fragmentShader: fragmentShader,
			uniforms: {
				uResolution: new THREE.Uniform(
					new THREE.Vector2(
						this.sizes.width * this.sizes.pixelRatio,
						this.sizes.height * this.sizes.pixelRatio
					)
				),
				uPictureTexture: new THREE.Uniform(this.textureLoader.load('/ambient2.jpg')),
				uDisplacementTexture: new THREE.Uniform(this.displacement.texture),
				uTime: { value: 0 },
				uColor: { value: new THREE.Color(options.color) }
			},
			blending: THREE.AdditiveBlending
		});
		const particles = new THREE.Points(particlesGeometry, particlesMaterial);
		this.scene.add(particles);
	}

	damping = 0.1;

	onResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer?.setSize(window.innerWidth, window.innerHeight);
	}

	addDebug() {}

	cleanUp() {
		if (this.displacement.canvas && this.displacement.glowImage) {
			this.displacement.canvas.remove();
			this.displacement.glowImage.remove();
		}

		this.scene.remove(this.displacement.interactivePlane!);
		this.scene.remove(this.instancedMesh!);

		this.displacement.texture!.dispose();
		this.renderer?.dispose();

		this.displacement = {};
		this.renderer = null;
	}

	animate() {
		requestAnimationFrame(this.animate.bind(this));
		this.stats.update();

		/**
		 * Raycaster
		 */
		if (this.displacement.raycaster) {
			this.displacement.raycaster.setFromCamera(this.displacement.screenCursor!, this.camera);
			const intersections = this.displacement.raycaster.intersectObject(
				this.displacement.interactivePlane!
			);

			if (intersections.length) {
				const uv = intersections[0].uv;
				if (!uv) return;
				this.displacement.canvasCursor!.x = uv.x * this.displacement.canvas!.width;
				this.displacement.canvasCursor!.y = (1 - uv.y) * this.displacement.canvas!.height;
			}
		}

		/**
		 * Displacement
		 */
		// Fade out
		this.displacement.context!.globalCompositeOperation = 'source-over';
		this.displacement.context!.globalAlpha = 0.02;

		this.displacement.context!.fillRect(
			0,
			0,
			this.displacement.canvas!.width,
			this.displacement.canvas!.height
		);

		// Speed alpha
		const cursorDistance = this.displacement.canvasCursorPrevious!.distanceTo(
			this.displacement.canvasCursor!
		);
		this.displacement.canvasCursorPrevious!.copy(this.displacement.canvasCursor!);
		const alpha = Math.min(cursorDistance * 0.05, 1);
		// Draw glow
		const glowSize = this.displacement.canvas!.width * 0.1;
		this.displacement.context!.globalCompositeOperation = 'lighten';
		this.displacement.context!.globalAlpha = alpha;

		this.displacement.context!.drawImage(
			this.displacement.glowImage!,
			this.displacement.canvasCursor!.x - glowSize * 0.5,
			this.displacement.canvasCursor!.y - glowSize * 0.5,
			glowSize,
			glowSize
		);

		// Texture
		this.displacement.texture!.needsUpdate = true;

		if (this.material) {
			this.material.uniforms.uTime.value += 0.01;
		}
		if (this.renderer) this.renderer.render(this.scene, this.camera);
	}

	destroy() {
		if (this.gui) {
			this.gui.destroy();
		}
		window.removeEventListener('resize', this.onResize.bind(this));

		this.renderer?.dispose();

		if (this.stats) {
			this.stats.dom.remove();
		}

		this.cleanUp();
	}
}

export default Particles;
