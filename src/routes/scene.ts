import * as THREE from 'three';
import db from '../lib/posts.json';
import { getPhoto } from '$lib/api';
import vertexShader from './vertexShader.glsl';
import fragmentShader from './fragmentShader.glsl';
import GUI from 'lil-gui';

class TravelGalleryScene {
	private isMobile = window.innerWidth < 768;
	private scene: THREE.Scene = new THREE.Scene();
	public camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
		75,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	);
	private light: THREE.Light | null = null;
	private raycaster = new THREE.Raycaster();
	public renderer: THREE.WebGLRenderer | null = null;
	private materials: THREE.ShaderMaterial[] = [];
	private material: THREE.ShaderMaterial | null = null;
	private geometry: THREE.PlaneGeometry = new THREE.PlaneGeometry(
		this.isMobile ? 1.4 : 2,
		this.isMobile ? 1.5 : 1.9,
		20,
		20
	);
	private gui = new GUI();
	public loaderManager = new THREE.LoadingManager();
	private textureLoader = new THREE.TextureLoader(this.loaderManager);
	public groups: THREE.Group[] = [];
	public meshes: THREE.Mesh[] = [];
	public mouse = new THREE.Vector2();
	private width = window.innerWidth;
	private height = window.innerHeight;
	private intersected: THREE.Intersection<THREE.Object3D<THREE.Event>>[] = [];
	private hovered: Record<string, THREE.Intersection> = {};

	public eulerValues = this.isMobile
		? { y: 0, x: -0.4, z: 0 }
		: {
				y: -0.5,
				x: -0.3,
				z: -0.2
		  };

	public positionValues = this.isMobile
		? { y: 0, x: 0, z: 0 }
		: {
				x: 1.2,
				y: 0,
				z: 0
		  };
	private time = 0;
	public backgroundColors = [
		'#c19ce9',
		'#230c75',
		'#140c0b',
		'#c19ce9',
		'#230c75',
		'#140c0b',
		'#c19ce9',
		'#230c75',
		'#140c0b'
	];

	constructor(canvasElement: HTMLCanvasElement) {
		this.renderer = new THREE.WebGLRenderer({
			canvas: canvasElement,
			antialias: true,
			alpha: true,
			powerPreference: 'high-performance',
			precision: 'highp'
		});
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;

		this.camera.position.set(0, 0, 4);
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		this.addObjects();

		this.animate();

		this.scene.add(this.camera);

		window.addEventListener('mousemove', (e) => this.onMouseMove(e));
		window.addEventListener('click', () => this.onClick());
		window.addEventListener('resize', () => this.resize());

		this.light = new THREE.PointLight(new THREE.Color('red'));

		this.light.intensity = 10;
		this.light.position.set(0, 0, 0);
		this.scene.add(this.light);

		// const sphere = new THREE.SphereGeometry(1, 32, 32);
		// const sphereMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color('red') });
		// sphereMaterial.roughness = 0.2;
		// sphereMaterial.metalness = 0.5;
		// const sphereMesh = new THREE.Mesh(sphere, sphereMaterial);
		// this.scene.add(sphereMesh);
	}

	public onClick() {
		this.intersected.forEach((hit) => {
			const mesh = hit.object as THREE.Mesh;

			// gsap.to(mesh.position, {
			// 	x: -1.5,
			// 	duration: 3,
			// 	ease: 'power0'
			// });
		});
	}

	private addObjects() {
		this.material = new THREE.ShaderMaterial({
			side: THREE.DoubleSide,
			uniforms: {
				time: { value: 0 } as THREE.IUniform,
				texture1: { value: null, type: 't' } as THREE.IUniform,
				resolutions: { value: new THREE.Vector4(), type: 'v4' } as THREE.IUniform,
				distanceFromCenter: { value: 0, type: 'f' } as THREE.IUniform,
				pixels: { value: new THREE.Vector2(1, 1), type: 'v2' } as THREE.IUniform,
				mouse: { value: new THREE.Vector2(0, 0), type: 'v2' } as THREE.IUniform,
				iResolution: { value: new THREE.Vector3(1, 1, 1), type: 'v3' } as THREE.IUniform,
				u_resolution: { value: new THREE.Vector2(1, 1), type: 'v2' } as THREE.IUniform,
				u_mouse: { value: new THREE.Vector2(0, 0), type: 'v2' } as THREE.IUniform,
				u_time: { value: 0, type: 'f' } as THREE.IUniform
			},
			vertexShader,
			fragmentShader,
			transparent: true
		});
	}

	public async addGallery() {
		const images = [];
		const textures = [];

		for (let i = 0; i < db.posts.length; i++) {
			const img = document.createElement('img');
			img.src = await getPhoto();
			img.crossOrigin = 'anonymous';
			images.push(img);

			const texture = this.textureLoader.load(img.src, (texture) => {
				this.setBackground(texture);
			});

			textures.push(texture);
		}

		textures.forEach((t) => {
			if (!this.material || !this.geometry) return;

			// const texture = new THREE.Texture(t);
			const texture = t;
			const material = this.material.clone();

			const group = new THREE.Group();

			group.receiveShadow = true;
			group.castShadow = true;

			material.uniforms.texture1.value = texture;
			material.uniforms.texture1.value.needsUpdate = true;
			material.uniforms.texture1.value.wrapS = THREE.RepeatWrapping;
			material.uniforms.texture1.value.wrapT = THREE.RepeatWrapping;
			material.uniforms.texture1.value.repeat.set(1, 1);

			material.uniforms.u_resolution.value = new THREE.Vector3(
				window.innerWidth,
				window.innerHeight,
				1
			);

			const mesh = new THREE.Mesh(this.geometry, material);

			group.add(mesh);

			group.rotation.set(this.eulerValues.x, this.eulerValues.y, this.eulerValues.z);
			mesh.position.set(this.positionValues.x, this.positionValues.y, this.positionValues.z);

			this.scene.add(group);

			this.meshes.push(mesh);
			this.materials.push(material);
			this.groups.push(group);
		});
	}

	public setBackground(texture: THREE.Texture) {
		const imgRatio = texture.image.width / texture.image.height;
		const planeRatio = innerWidth / innerHeight;
		const ratio = planeRatio / imgRatio;

		texture.repeat.x = ratio;
		texture.offset.x = 0.5 * (1 - ratio);
	}

	public resize() {
		this.width = window.innerWidth;
		this.height = window.innerHeight;
		this.camera.aspect = this.width / this.height;
		this.camera.updateProjectionMatrix();
		this.isMobile = window.innerWidth < 768;

		this.eulerValues = this.isMobile
			? { y: 0, x: 0, z: 0 }
			: {
					y: -0.5,
					x: -0.3,
					z: -0.2
			  };

		this.positionValues = this.isMobile
			? { y: 0, x: 0, z: 0 }
			: {
					x: 1.2,
					y: 0,
					z: 0
			  };

		this.groups.forEach((group, idx) => {
			group.rotation.set(this.eulerValues.x, this.eulerValues.y, this.eulerValues.z);
			this.meshes[idx].position.set(
				this.positionValues.x,
				this.positionValues.y,
				this.positionValues.z
			);
		});

		if (this.renderer) this.renderer.setSize(this.width, this.height);
	}

	public onMouseMove(e: MouseEvent) {
		// events
		this.mouse.set((e.clientX / this.width) * 2 - 1, -(e.clientY / this.height) * 2 + 1);
		this.raycaster.setFromCamera(this.mouse, this.camera);
		this.intersected = this.raycaster.intersectObjects(this.scene.children, true);

		// If a previously hovered item is not among the hits we must call onPointerOut
		Object.keys(this.hovered).forEach((key) => {
			const hit = this.intersected.find((hit) => hit.object.uuid === key);
			if (hit === undefined) {
				// const hoveredItem = this.hovered[key];
				delete this.hovered[key];
			}
		});

		this.intersected.forEach((hit) => {
			// If a hit has not been flagged as hovered we must call onPointerOver
			if (!this.hovered[hit.object.uuid]) {
				this.hovered[hit.object.uuid] = hit;
			}
			const obj = hit.object as THREE.Mesh;
			if (obj.material instanceof THREE.ShaderMaterial) {
				obj.material.uniforms.mouse.value = this.mouse;
				obj.material.uniforms.u_mouse.value = this.mouse;
			}
		});

		// Update the mouse variable
		e.preventDefault();

		// Make the sphere follow the mouse
		const vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5);
		vector.unproject(this.camera);
		const dir = vector.sub(this.camera.position).normalize();
		const distance = -this.camera.position.z / dir.z;
		const pos = this.camera.position.clone().add(dir.multiplyScalar(distance));

		if (this.light) this.light.position.copy(new THREE.Vector3(pos.x, pos.y, pos.z + 2));
	}

	private animate() {
		requestAnimationFrame(() => this.animate());

		if (this.renderer) this.renderer.render(this.scene, this.camera);

		this.time += 0.005;

		this.materials.forEach((material) => {
			material.uniforms.time.value = this.time;
			material.uniforms.u_time.value = this.time;
		});
	}
}

export default TravelGalleryScene;
