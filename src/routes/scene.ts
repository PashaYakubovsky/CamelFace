import * as THREE from 'three';
import vertexShader from './shaders/vertexShader.glsl';
import fragmentShader from './shaders/fragmentShader.glsl';
import bgVertexShader from './shaders/bgVertexShader.glsl';
import bgFragmentShader from './shaders/bgFragmentShader.glsl';
import type { Media, Post } from '../types';
import { defineScreen, type Screens } from '$lib/mediaQuery';
import { threejsLoading } from '$lib/loading';
import gsap from 'gsap';

// import LinesScene from './lines/scene';
import MorphScene from './morphing/scene';
import HologramScene from './hologram/scene';
import ParticlesScene from './particles/scene';
// import ParticlesInteractiveScene from './particles-interactive/scene';
import LyapunovScene from './lyapunov/lyapunov';
import NoiseInteractiveScene from './particles-noise/scene';
import BoidsScene from './boids/boids';
import AttractionScene from './mutual-attraction/scene';
import LandScene from './land/scene';
import MandelbrotScene from './mandelbrot/mandelbrot';
import FBMScene from './fbm/clouds';
import CardioidScene from './cardioid/cardioid';
import GalaxyScene from './galaxy/scene';

const calculateEuler = (isMobile: boolean, screens: Screens) => {
	let euler = { y: 0, x: 0, z: 0 };

	if (!isMobile) {
		euler = {
			x: -0.1,
			y: -0.7,
			z: -0.2
		};
		if (screens.isXl) {
			euler = {
				x: -0.1,
				y: -0.7,
				z: -0.2
			};
		}
	}

	return euler;
};
const calculatePosition = (isMobile: boolean, screens: Screens) => {
	let position = { y: -0.02, x: 0, z: -1 };

	if (!isMobile) {
		position = {
			x: window.innerWidth * 0.0012,
			y: 0,
			z: 0
		};
		if (screens.isXl) {
			position = {
				x: window.innerWidth * 0.0009,
				y: 0,
				z: 0
			};
		}
	}

	return position;
};

const createGeometry = (isMobile: boolean, screens: Screens) => {
	let geometry = [0.58, 1.05];

	if (!isMobile) {
		geometry = [window.innerWidth * 0.0016, window.innerWidth * 0.0014];
		if (screens.isXl) {
			geometry = [window.innerWidth * 0.0016, window.innerWidth * 0.0015];
		}
		if (screens.is2Xl) {
			geometry = [window.innerWidth * 0.0011, window.innerWidth * 0.001];
		}
	}
	return new THREE.PlaneGeometry(geometry[0], geometry[1], 10, 10);
};

type IntegratedScene = {
	scene: THREE.Scene;
	camera: THREE.Camera;
	destroy: () => void;
	rafId?: number | null;
	animate: () => void;
};

class TravelGalleryScene {
	integratedScenes: (IntegratedScene | null)[] = [];
	renderTargets: (THREE.WebGLRenderTarget | null)[] = [];
	isMobile = window.innerWidth < 768;
	scene: THREE.Scene = new THREE.Scene();
	camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
		55,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	);
	raycaster = new THREE.Raycaster();
	renderer: THREE.WebGLRenderer | null = null;
	materials: THREE.ShaderMaterial[] = [];
	material: THREE.ShaderMaterial | null = null;
	loaderManager = new THREE.LoadingManager();
	textureLoader = new THREE.TextureLoader(this.loaderManager);
	groups: THREE.Group[] = [];
	meshes: THREE.Mesh[] = [];
	mouse = new THREE.Vector2();
	width = window.innerWidth;
	height = window.innerHeight;
	intersected: THREE.Intersection<THREE.Object3D<THREE.Object3DEventMap>>[] = [];
	hovered: Record<string, THREE.Intersection> = {};
	rafId: number | null = null;
	integratedScenesDict: Record<string, IntegratedScene> = {};
	loaded = false;
	screens: Screens = {
		is2Xl: false,
		isXl: false,
		isLg: false,
		isMd: false,
		is3Xl: false
	};
	bgGeometry: THREE.PlaneGeometry | null = null;
	bgMaterial: THREE.ShaderMaterial | null = null;
	bgPlane: THREE.Mesh | null = null;
	geometry: THREE.PlaneGeometry | null = null;
	eulerValues = { x: 0, y: 0, z: 0 };
	positionValues = { x: 0, y: 0, z: 0 };
	time = 0;
	backgroundColors: string[] = [];
	textColors: string[] = [];
	onClickEvent: ((meshIndex: number) => void) | null = null;
	handleHoverIn: (() => void) | null = null;
	handleHoverOut: (() => void) | null = null;
	total = -1;
	posts: Post[] = [];
	videoNode: HTMLVideoElement | null = null;
	videTexture: THREE.VideoTexture | null = null;
	postsMaterials: THREE.ShaderMaterial[] = [];
	prevMaterialIndex = -1;

	constructor(canvasElement: HTMLCanvasElement) {
		this.renderer = new THREE.WebGLRenderer({
			canvas: canvasElement,
			antialias: true,
			alpha: true,
			powerPreference: 'high-performance',
			precision: 'highp'
		});

		this.screens = defineScreen();
		this.geometry = createGeometry(this.isMobile, this.screens);
		this.positionValues = calculatePosition(this.isMobile, this.screens);
		this.eulerValues = calculateEuler(this.isMobile, this.screens);

		// this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;

		this.camera.position.set(0, 0, this.isMobile ? 0 : 4);
		this.renderer.setSize(
			window.innerWidth,
			this.isMobile ? window.innerHeight * 0.35 : window.innerHeight
		);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		this.addObjects();

		this.animate();

		const manager = this.loaderManager;

		let isComplied = false;

		const loaderContainerEl = document.createElement('div');
		loaderContainerEl.classList.add('loader-container');
		document.body.appendChild(loaderContainerEl);

		const textureLoader = new THREE.TextureLoader();
		const texture_1 = textureLoader.load('locked_door.jpg');
		const texture_2 = textureLoader.load('opened_door.jpg');
		const aspectRatio = window.innerWidth / window.innerHeight;
		const loader = new THREE.Mesh(
			new THREE.PlaneGeometry(3.5, 3.5 * aspectRatio),
			new THREE.ShaderMaterial({
				uniforms: {
					progress: { value: 0 },
					sampleLockedDoor: { value: texture_1 },
					sampleUnlockedDoor: { value: texture_2 },
					aspectRatio: { value: aspectRatio }
				},
				vertexShader: `
						varying vec2 vUv;
						void main() {
							gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
							vUv = uv;
						}
					`,
				fragmentShader: `
						uniform float progress;
						varying vec2 vUv;
						uniform sampler2D sampleLockedDoor;
						uniform sampler2D sampleUnlockedDoor;
						uniform float aspectRatio;

						void main() {
							vec2 uv = vUv;
							
							// aspect ratio
							uv.x *= aspectRatio;

							vec4 colorLockedDoor = texture2D(sampleLockedDoor, vUv);
							vec4 colorUnlockedDoor = texture2D(sampleUnlockedDoor, vUv);
							// progress is a value between 0 and 100
							float progressValue = progress / 100.0;
							vec4 color = mix(colorLockedDoor, colorUnlockedDoor, progressValue);

							gl_FragColor = color;
						}
					`,
				transparent: true
			})
		);
		if (loader) {
			loader.position.set(0, 0, -2);
			this.scene.add(loader);
		}

		manager.onStart = (url, itemsLoaded, itemsTotal) => {
			isComplied = false;
			this.total = Math.max(this.total, itemsTotal);
			threejsLoading.update((v) => ({ ...v, loading: true, loaded: false }));
		};

		manager.onProgress = (url, itemsLoaded) => {
			const progressInPercent = (itemsLoaded / this.total) * 100;

			threejsLoading.update((v) => ({ ...v, progress: progressInPercent }));

			(loader.material as THREE.ShaderMaterial).uniforms.progress.value = progressInPercent;
			(loader.material as THREE.ShaderMaterial).needsUpdate = true;

			loaderContainerEl.textContent = `Loaded ${itemsLoaded}/${this.total}`;

			if (itemsLoaded === this.total && !isComplied) {
				if (loader) {
					this.loaded = true;
					this.scene.remove(loader);
					loaderContainerEl.remove();
					threejsLoading.update((v) => ({
						...v,
						loaded: true,
						loading: false
					}));
				} else {
					threejsLoading.update((v) => ({
						...v,
						loaded: true,
						loading: false
					}));
				}

				isComplied = true;
			}
		};

		manager.onError = function (url) {
			threejsLoading.update((v) => ({ ...v, loading: false }));
			console.log('There was an error loading ' + url);
		};

		this.scene.add(this.camera);

		window.addEventListener('mousemove', (e) => this.onMouseMove(e));
		window.addEventListener('resize', () => this.resize());
		window.addEventListener('click', (e) => this.onClick(e));
	}

	onClick(e: MouseEvent) {
		this.intersected.forEach((hit) => {
			const obj = hit.object as THREE.Mesh;

			const meshIndex = this.meshes.findIndex((mesh) => mesh.uuid === obj.uuid);
			if (obj.material instanceof THREE.ShaderMaterial) {
				if (e.target instanceof HTMLElement && e.target.closest('nav')) {
					return;
				}

				if (this.onClickEvent) this.onClickEvent(meshIndex);
			}
		});
	}

	private addObjects() {
		this.material = new THREE.ShaderMaterial({
			side: THREE.DoubleSide,
			uniforms: {
				time: { value: 0 },
				uTexture: { value: null },
				resolutions: { value: new THREE.Vector4() },
				distanceFromCenter: { value: 0 },
				pixels: { value: new THREE.Vector2(1, 1) },
				mouse: { value: new THREE.Vector2(0, 0) },
				uResolution: { value: new THREE.Vector2(1, 1) },
				uMouse: { value: new THREE.Vector2(0, 0) },
				isMobile: { value: this.isMobile },
				videoTexture: { value: null }
			},
			vertexShader,
			fragmentShader,
			transparent: true
		});
		this.bgMaterial = new THREE.ShaderMaterial({
			uniforms: {
				uTime: { value: 0 },
				uColor: { value: new THREE.Color('rgb(0, 0, 0)') },
				uPrevColor: { value: new THREE.Color('rgb(0, 0, 0)') },
				uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
				uMouse: { value: new THREE.Vector2(0, 0) },
				uSpeed: { value: 0.01 },
				uFactor: { value: 1.0 },
				uSelectedItemPosition: {
					// by default is 20% right and 50% down
					value: new THREE.Vector2(0.2, 0.5)
				},
				uEnabled: { value: true }
			},
			vertexShader: bgVertexShader,
			fragmentShader: bgFragmentShader,
			transparent: true,
			depthTest: false
		});
		const aspectRatio = window.innerWidth / window.innerHeight;
		// this.bgGeometry = new THREE.PlaneGeometry(aspectRatio * 2, 2, 64, 64);
		// const mesh = new THREE.Mesh(this.bgGeometry, this.bgMaterial);
		// mesh.name = 'bgPlane';
		// mesh.scale.set(5, 5, 5);
		// mesh.position.set(0, 0, -2);
		// this.bgPlane = mesh;
		// if (!this.isMobile) this.scene.add(this.bgPlane);
	}

	addColorToBGShader(color: string) {
		if (this.bgMaterial) {
			this.bgMaterial.uniforms.uPrevColor.value = this.bgMaterial.uniforms.uColor.value;
			this.bgMaterial.uniforms.uColor.value = new THREE.Color(color);

			gsap.fromTo(
				this.bgMaterial.uniforms.uFactor,
				{
					value: 0
				},
				{
					value: 1,
					duration: 1,
					ease: 'none'
				}
			);
		}
	}

	async addGallery({ posts }: { posts: Post[] }) {
		const textures: THREE.Texture[] = [];
		// // Create video node and texture
		// this.videoNode = document.createElement('video');
		// this.videoNode.loop = true;
		// this.videoNode.muted = true;

		// // Create video texture
		// this.videTexture = new THREE.VideoTexture(this.videoNode);
		// this.videTexture.minFilter = THREE.LinearFilter;
		// this.videTexture.magFilter = THREE.LinearFilter;
		// this.videTexture.format = THREE.RGBAFormat;

		// this.posts = posts.sort(
		// 	(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
		// );
		this.total = posts.length;

		this.integratedScenes = [
			new LyapunovScene(null, {
				renderToTarget: true
			}),
			new NoiseInteractiveScene(null, {
				renderToTarget: true
			}),
			new BoidsScene(null, {
				renderToTarget: true
			}),
			new AttractionScene(null, {
				renderToTarget: true
			}),
			new HologramScene(null, {
				renderToTarget: true
			}),
			new MorphScene(null, {
				renderToTarget: true
			}),

			new LandScene(null, {
				renderToTarget: true
			}),
			new ParticlesScene(null, {
				renderToTarget: true
			}),
			new MandelbrotScene(null, {
				renderToTarget: true
			}),
			new FBMScene(null, {
				renderToTarget: true
			}),
			new CardioidScene(null, {
				renderToTarget: true
			}),
			new GalaxyScene(null, {
				renderToTarget: true
			})
		];
		this.integratedScenes.reverse();

		this.renderTargets = this.integratedScenes.map(
			() => new THREE.WebGLRenderTarget(this.width, this.height)
		);

		const getSlugSet = () => {
			const slugSetTexture: Record<string, THREE.Texture | undefined> = {
				'/lyapunov': this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof LyapunovScene) return i;
				})?.texture,
				'/particles-noise': this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof NoiseInteractiveScene) return i;
				})?.texture,
				'/boids': this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof BoidsScene) return i;
				})?.texture,
				'/mutual-attraction': this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof AttractionScene) return i;
				})?.texture,
				// '/lines': this.renderTargets[5].texture,
				// '/particles-interactive': this.renderTargets[4]?.texture,
				'/hologram': this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof HologramScene) return i;
				})?.texture,
				'/morphing': this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof MorphScene) return i;
				})?.texture,
				'/land': this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof LandScene) return i;
				})?.texture,
				'/particles': this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof ParticlesScene) return i;
				})?.texture,
				'/mandelbrot': this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof MandelbrotScene) return i;
				})?.texture,
				'/fbm': this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof FBMScene) return i;
				})?.texture,
				'/cardioid': this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof CardioidScene) return i;
				})?.texture,
				'/galaxy': this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof GalaxyScene) return i;
				})?.texture
			};
			return slugSetTexture;
		};

		this.integratedScenesDict = {
			'/lyapunov': this.integratedScenes.find((i) => {
				if (i instanceof LyapunovScene) return i;
			}),
			'/particles-noise': this.integratedScenes.find((i) => {
				if (i instanceof NoiseInteractiveScene) return i;
			}),
			'/boids': this.integratedScenes.find((i) => {
				if (i instanceof BoidsScene) return i;
			}),
			'/mutual-attraction': this.integratedScenes.find((i) => {
				if (i instanceof AttractionScene) return i;
			}),
			'/hologram': this.integratedScenes.find((i) => {
				if (i instanceof HologramScene) return i;
			}),
			'/morphing': this.integratedScenes.find((i) => {
				if (i instanceof MorphScene) return i;
			}),
			'/land': this.integratedScenes.find((i) => {
				if (i instanceof LandScene) return i;
			}),
			'/particles': this.integratedScenes.find((i) => {
				if (i instanceof ParticlesScene) return i;
			}),
			'/mandelbrot': this.integratedScenes.find((i) => {
				if (i instanceof MandelbrotScene) return i;
			}),
			'/fbm': this.integratedScenes.find((i) => {
				if (i instanceof FBMScene) return i;
			}),
			'/cardioid': this.integratedScenes.find((i) => {
				if (i instanceof CardioidScene) return i;
			}),
			'/galaxy': this.integratedScenes.find((i) => {
				if (i instanceof GalaxyScene) return i;
			})
		} as Record<string, IntegratedScene>;

		for (let i = 0; i < posts.length; i++) {
			const post = posts[i];
			const media = post.backgroundImage as Media;

			const src = `https://storage.googleapis.com/travel-blog/media/${media.filename}`;

			const file = await fetch(src);
			const blob = await file.blob();
			const url = URL.createObjectURL(blob);

			const texture = await this.textureLoader.loadAsync(url);
			texture.minFilter = THREE.LinearFilter;
			texture.magFilter = THREE.LinearFilter;
			texture.colorSpace = THREE.SRGBColorSpace;

			// take the average color of the image
			const canvas = document.createElement('canvas');
			const context = canvas.getContext('2d');
			if (!context) return;
			context.drawImage(texture.image, 0, 0);
			const data = context.getImageData(0, 0, 1, 1).data;
			const color = new THREE.Color(`rgb(${data[0]}, ${data[1]}, ${data[2]})`);
			this.backgroundColors.push(color.getStyle());
			canvas.remove();

			textures.push(texture);

			// Apply texture to the material
			if (!this.material || !this.geometry) return;
			const material = this.material.clone();

			try {
				const group = new THREE.Group();

				const slugSetTexture = getSlugSet();

				const slug = post.slug;

				if (slugSetTexture[slug]) {
					material.uniforms.uTexture.value = slugSetTexture[slug];
				} else {
					material.uniforms.uTexture.value = texture;
				}
				material.uniforms.uTexture.value.needsUpdate = true;
				material.uniforms.id = { value: i };
				material.uniforms.uResolution.value = new THREE.Vector3(
					window.innerWidth,
					window.innerHeight,
					1
				);

				const mesh = new THREE.Mesh(this.geometry, material);

				group.add(mesh);

				this.meshes[i] = mesh;
				this.materials[i] = material;
				this.groups[i] = group;
			} catch (err) {
				console.error(err);
			}
		}
		this.groups.forEach((group) => {
			gsap.fromTo(
				group.scale,
				{
					x: 2,
					y: 2,
					z: 2
				},
				{
					x: 1,
					y: 1,
					z: 1,
					duration: 1,
					ease: 'power2.inOut'
				}
			);

			gsap.fromTo(
				group.position,
				{
					x: 0,
					y: -10,
					z: -3.5
				},
				{
					...this.positionValues,
					duration: 1,
					ease: 'power2.inOut'
				}
			);
			gsap.to(group.rotation, {
				...this.eulerValues,
				duration: 1,
				ease: 'power2.inOut'
			});
			this.scene.add(group);
		});

		// this.changeVideo(0);

		this.posts = posts;
	}

	// Change the index of the video to be played
	async changeVideo(index: number) {
		// try {
		// 	if (this.prevMaterialIndex === index) return;
		// 	if (this.materials.length === 0) return;
		// 	const post = this.posts[index];
		// 	if (!post.video) return;
		// 	this.materials.forEach((material) => {
		// 		// clean video texture
		// 		if (material.uniforms.videoTexture) material.uniforms.videoTexture.value = null;
		// 	});
		// 	if (post.video) {
		// 		const media = post.video as Media;
		// 		const src = `https://storage.googleapis.com/travel-blog/media/${media.filename}`;
		// 		const file = fetch(src);
		// 		const blob = await (await file).blob();
		// 		const url = URL.createObjectURL(blob);
		// 		console.log(url, 'GALLERY:INDEX: ', index);
		// 		if (!this.videoNode) return;
		// 		this.videoNode.loop = true;
		// 		this.videoNode.muted = true;
		// 		this.videoNode.src = url;
		// 		this.videoNode.play();
		// 		this.videTexture = new THREE.VideoTexture(this.videoNode);
		// 		this.videTexture.minFilter = THREE.LinearFilter;
		// 		this.videTexture.magFilter = THREE.LinearFilter;
		// 		this.videTexture.format = THREE.RGBAFormat;
		// 		// Update video texture
		// 		if (this.videTexture) this.videTexture.needsUpdate = true;
		// 	}
		// 	// Apply video texture to the material
		// 	this.materials[index].uniforms.videoTexture.value = this.videTexture;
		// 	this.materials[index].needsUpdate = true;
		// 	this.prevMaterialIndex = index;
		// } catch (err) {
		// 	console.error(err);
		// }
	}

	setBackground(texture: THREE.Texture) {
		const imgRatio = texture.image.width / texture.image.height;
		const planeRatio = innerWidth / innerHeight;
		const ratio = planeRatio / imgRatio;

		texture.repeat.x = ratio;
		texture.offset.x = 0.5 * (1 - ratio);
	}

	resize() {
		this.isMobile = window.innerWidth < 768;
		this.width = window.innerWidth;
		this.height = window.innerHeight;
		this.screens = defineScreen();

		if (this.renderer)
			this.renderer.setSize(
				window.innerWidth,
				this.isMobile ? window.innerHeight * 0.35 : window.innerHeight
			);

		this.camera.aspect = this.width / this.height;

		if (this.isMobile && this.bgPlane) {
			// if bgPlane in scene, remove it
			if (this.scene.children.includes(this.bgPlane)) {
				this.scene.remove(this.bgPlane);
			}
		}

		if (this.material) {
			this.material.uniforms.isMobile.value = this.isMobile;
			this.material.uniforms.uResolution.value = new THREE.Vector3(
				window.innerWidth,
				window.innerHeight,
				1
			);
		}

		if (this.bgMaterial) {
			this.bgMaterial.uniforms.uResolution.value = new THREE.Vector2(this.width, this.height);
		}
	}

	onMouseMove(e: MouseEvent) {
		// events
		this.mouse.set((e.clientX / this.width) * 2 - 1, -(e.clientY / this.height) * 2 + 1);
		this.raycaster.setFromCamera(this.mouse, this.camera);
		this.intersected = this.raycaster.intersectObjects(this.scene.children, true);
		document.body.style.cursor = '';

		// If a previously hovered item is not among the hits we must call onPointerOut
		Object.keys(this.hovered).forEach((key) => {
			const hit = this.intersected.find((hit) => hit.object.uuid === key);
			if (hit === undefined) {
				if (this.handleHoverOut) {
					if (e.target instanceof HTMLElement && e.target.closest('nav')) {
						return;
					}
					this.handleHoverOut();
				}
				delete this.hovered[key];
			}
		});

		this.intersected.forEach((hit) => {
			// If a hit has not been flagged as hovered we must call onPointerOver
			if (!this.hovered[hit.object.uuid]) {
				this.hovered[hit.object.uuid] = hit;

				if (this.handleHoverIn) {
					this.handleHoverIn();
				}
			}
			const obj = hit.object as THREE.Mesh;
			// if obj is a bgPlane, dont change cursor
			if (obj.material instanceof THREE.ShaderMaterial) {
				if (obj.name === 'bgPlane') return;
				document.body.style.cursor = 'pointer';
				if (obj.material.uniforms.uMouse) obj.material.uniforms.uMouse.value = this.mouse;
			}
		});
	}

	destroy() {
		this.meshes.forEach((mesh) => {
			this.scene.remove(mesh);
			mesh.geometry.dispose();
			(mesh.material as THREE.Material).dispose();
		});

		window.removeEventListener('mousemove', (e) => this.onMouseMove(e));
		window.removeEventListener('resize', () => this.resize());
		window.removeEventListener('click', (e) => this.onClick(e));

		this.renderer?.dispose();
		this.scene.clear();

		if (this.rafId) cancelAnimationFrame(this.rafId);

		if (this.integratedScenes.length > 0) {
			this.integratedScenes.forEach((scene) => {
				if (!scene) return;
				scene.destroy();
			});
		}
	}

	private animate() {
		this.time += 0.05;

		this.materials.forEach((material) => {
			material.uniforms.time.value = this.time;
		});

		if (this.bgMaterial) this.bgMaterial.uniforms.uTime.value = this.time;

		this.rafId = requestAnimationFrame(() => this.animate());

		if (this.renderer) {
			// Render the secondary scene to the render target
			if (
				this.renderTargets.length > 0 &&
				this.integratedScenes.length === this.renderTargets.length
			) {
				for (let i = 0; i < this.integratedScenes.length; i++) {
					try {
						const iScene = this.integratedScenes[i];
						if (!iScene) continue;
						// if (iScene instanceof ParticlesScene) {
						// 	debugger;
						// }
						if (!iScene.rafId) continue;
						const renderTarget = this.renderTargets[i];

						this.renderer.setRenderTarget(renderTarget);
						this.renderer.render(iScene.scene, iScene.camera);
						this.renderer.setRenderTarget(null); // Ensure rendering returns to the default framebuffer
					} catch (err) {
						// Added detailed error logging
						console.error(`Error rendering scene ${i}:`, err);
					}
				}
			}
			// Render the main scene
			this.renderer.render(this.scene, this.camera);
		}
	}

	initGalleryAnimation() {
		const tl = gsap.timeline();
		// const positions = this.groups.map((group) => group.position);
		// tl.fromTo(
		// 	positions,
		// 	{
		// 		z: -1,
		// 		y: 4,
		// 		x: 4,
		// 		duration: 0
		// 	},
		// 	{
		// 		z: 0,
		// 		y: 0,
		// 		x: 0,
		// 		duration: 0.5,
		// 		stagger: 0.1,
		// 		ease: 'power'
		// 	}
		// );

		return tl;
	}
}

export default TravelGalleryScene;
