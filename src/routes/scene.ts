import * as THREE from "three"
import vertexShader from "./shaders/vertexShader.glsl"
import fragmentShader from "./shaders/fragmentShader.glsl"
import bgVertexShader from "./shaders/bgVertexShader.glsl"
import bgFragmentShader from "./shaders/bgFragmentShader.glsl"
import type { Post } from "../types"
import { defineScreen, type Screens } from "$lib/mediaQuery"
import { threejsLoading } from "$lib/loading"
import { gsap } from "gsap"
import CustomShaderMaterial from "three-custom-shader-material/vanilla"

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"

import LinesScene from "./lines/scene"
import MorphScene from "./morphing/scene"
import HologramScene from "./hologram/scene"
import ParticlesScene from "./particles/scene"
import ParticlesInteractiveScene from "./particles-interactive/scene"
import LyapunovScene from "./lyapunov/lyapunov"
import NoiseInteractiveScene from "./particles-noise/scene"
import BoidsScene from "./boids/boids"
import AttractionScene from "./mutual-attraction/scene"
import LandScene from "./land/scene"
import MandelbrotScene from "./mandelbrot/mandelbrot"
import FBMScene from "./fbm/clouds"
import CardioidScene from "./cardioid/cardioid"
import GalaxyScene from "./galaxy/scene"
import EyeScene from "./eye/scene"
import FresnelScene from "./fresnel/scene"
import WobblyScene from "./wobbly/scene"
import VoronoiScene from "./voronoi/scene"
import GPGPUScene from "./gpgpu/scene"

const calculateEuler = () => {
	const euler = {
		x: -0.1,
		y: -0.7,
		z: -0.2,
	}

	return euler
}
const calculatePosition = () => {
	const position = {
		x: 1.5,
		y: 0,
		z: 0,
	}

	return position
}

const createGeometry = () => {
	const geometry = [2.5, 2.2]

	return new THREE.PlaneGeometry(geometry[0], geometry[1], 10, 10)
}

type IntegratedScene = {
	scene: THREE.Scene
	camera: THREE.Camera
	destroy: () => void
	rafId?: number | null
	animate: () => void
	renderer?: THREE.WebGLRenderer | null
}

class TravelGalleryScene {
	integratedScenes: (IntegratedScene | null)[] = []
	renderTargets: (THREE.WebGLRenderTarget | null)[] = []
	isMobile = window.innerWidth < 768
	scene: THREE.Scene = new THREE.Scene()
	camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
		55,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	)
	raycaster = new THREE.Raycaster()
	renderer: THREE.WebGLRenderer | null = null
	materials: THREE.ShaderMaterial[] = []
	material: THREE.ShaderMaterial | null = null
	loaderManager = new THREE.LoadingManager()
	textureLoader = new THREE.TextureLoader(this.loaderManager)
	groups: THREE.Group<THREE.Object3DEventMap>[] = []
	meshes: THREE.Mesh[] = []
	mouse = new THREE.Vector2()
	width = window.innerWidth
	height = window.innerHeight
	intersected: THREE.Intersection<THREE.Object3D<THREE.Object3DEventMap>>[] = []
	hovered: Record<string, THREE.Intersection> = {}
	rafId: number | null = null
	integratedScenesDict: Record<string, IntegratedScene> = {}
	loaded = false
	screens: Screens = {
		is2Xl: false,
		isXl: false,
		isLg: false,
		isMd: false,
		is3Xl: false,
	}
	bgGeometry: THREE.PlaneGeometry | null = null
	bgMaterial: THREE.ShaderMaterial | null = null
	bgPlane: THREE.Mesh | null = null
	geometry: THREE.PlaneGeometry | null = null
	eulerValues = { x: 0, y: 0, z: 0 }
	positionValues = { x: 0, y: 0, z: 0 }
	time = 0
	backgroundColors: string[] = []
	textColors: string[] = []
	onClickEvent: ((meshIndex: number) => void) | null = null
	handleHoverIn: (() => void) | null = null
	handleHoverOut: (() => void) | null = null
	total = -1
	posts: Post[] = []
	videoNode: HTMLVideoElement | null = null
	videTexture: THREE.VideoTexture | null = null
	postsMaterials: THREE.ShaderMaterial[] = []
	prevMaterialIndex = -1
	gltfLoader: GLTFLoader = new GLTFLoader()
	hamburger: THREE.Group | null = null
	hamburgerMaterial: CustomShaderMaterial | null = null
	hamburgerCircles: THREE.Group | null = null
	loaderMesh: THREE.Mesh | null = null

	constructor(canvasElement: HTMLCanvasElement) {
		this.renderer = new THREE.WebGLRenderer({
			canvas: canvasElement,
			antialias: true,
		})
		this.isMobile = window.innerWidth < 768
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping
		this.renderer.toneMappingExposure = 1

		this.screens = defineScreen()
		this.geometry = createGeometry()
		this.positionValues = calculatePosition()
		this.eulerValues = calculateEuler()

		this.renderer.toneMapping = THREE.ACESFilmicToneMapping
		this.renderer.outputColorSpace = THREE.SRGBColorSpace

		this.camera.position.set(0, 0, 4)
		this.renderer.setSize(window.innerWidth, window.innerHeight)
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

		this.addObjects()

		this.animate()

		const manager = this.loaderManager

		let isComplied = false

		const loaderContainerEl = document.createElement("div")
		loaderContainerEl.classList.add("loader-container")
		document.body.appendChild(loaderContainerEl)

		const textureLoader = new THREE.TextureLoader()
		const texture_1 = textureLoader.load("locked_door.jpg")
		const texture_2 = textureLoader.load("opened_door.jpg")
		const aspectRatio = window.innerWidth / window.innerHeight
		const loader = new THREE.Mesh(
			new THREE.PlaneGeometry(3.5, 3.5 * aspectRatio),
			new THREE.ShaderMaterial({
				uniforms: {
					progress: { value: 0 },
					sampleLockedDoor: { value: texture_1 },
					sampleUnlockedDoor: { value: texture_2 },
					aspectRatio: { value: aspectRatio },
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
				transparent: true,
				// wireframe: true,
				depthTest: false,
				depthWrite: false,
			})
		)

		this.loaderMesh = loader

		if (loader) {
			loader.position.set(0, 0, 0)
			this.scene.add(loader)
		}

		// init preloader
		this.total = 0
		threejsLoading.update((v) => ({ ...v, loading: true, loaded: false }))

		manager.onStart = (url, itemsLoaded, itemsTotal) => {
			isComplied = false
			this.total = Math.max(this.total, itemsTotal)
			threejsLoading.update((v) => ({ ...v, loading: true, loaded: false }))
		}

		manager.onProgress = (url, itemsLoaded) => {
			const progressInPercent = (itemsLoaded / this.total) * 100

			threejsLoading.update((v) => ({ ...v, progress: progressInPercent }))
			const mat = loader?.material as THREE.ShaderMaterial

			mat.uniforms.progress.value = progressInPercent
			mat.needsUpdate = true

			loaderContainerEl.textContent = `Loaded ${itemsLoaded}/${this.total}`

			if (itemsLoaded === this.total && !isComplied) {
				if (loader) {
					this.loaded = true
					this.scene.remove(loader)
					loaderContainerEl.remove()
					threejsLoading.update((v) => ({
						...v,
						loaded: true,
						loading: false,
					}))
				} else {
					threejsLoading.update((v) => ({
						...v,
						loaded: true,
						loading: false,
					}))
				}

				isComplied = true
			}
		}

		manager.onError = function (url) {
			threejsLoading.update((v) => ({ ...v, loading: false }))
			console.log("There was an error loading " + url)
		}

		// gsap.fromTo(
		// 	loader.material.uniforms.progress,
		// 	{
		// 		value: 0,
		// 	},
		// 	{
		// 		value: 100,
		// 		onComplete: () => {
		// 			this.loaded = true
		// 			this.scene.remove(loader)
		// 			loaderContainerEl.remove()
		// 			threejsLoading.update((v) => ({
		// 				...v,
		// 				loaded: true,
		// 				loading: false,
		// 			}))
		// 		},
		// 		duration: 3,
		// 		ease: "power2.inOut",
		// 	}
		// )

		this.scene.add(this.camera)

		window.addEventListener("mousemove", (e) => this.onMouseMove(e))
		window.addEventListener("resize", this.resize.bind(this))
		window.addEventListener("click", (e) => this.onClick(e))
	}

	onClick(e: MouseEvent) {
		this.intersected.forEach((hit) => {
			const obj = hit.object as THREE.Mesh

			const meshIndex = this.meshes.findIndex((mesh) => mesh.uuid === obj.uuid)
			if (obj.material instanceof THREE.ShaderMaterial) {
				if (e.target instanceof HTMLElement && e.target.closest("nav")) {
					return
				}

				if (this.onClickEvent) this.onClickEvent(meshIndex)
			}
		})
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
				videoTexture: { value: null },
			},
			vertexShader,
			fragmentShader,
			transparent: true,
			depthTest: false,
			depthWrite: false,
		})
		this.bgMaterial = new THREE.ShaderMaterial({
			uniforms: {
				uTime: { value: 0 },
				uColor: { value: new THREE.Color("rgb(0, 0, 0)") },
				uPrevColor: { value: new THREE.Color("rgb(255, 0, 0)") },
				uResolution: {
					value: new THREE.Vector2(window.innerWidth, window.innerHeight),
				},
				uMouse: { value: new THREE.Vector2(0, 0) },
				uSpeed: { value: 0.01 },
				uFactor: { value: 1.0 },
				uSelectedItemPosition: {
					// by default is 20% right and 50% down
					value: new THREE.Vector2(0.2, 0.5),
				},
				uEnabled: { value: true },
			},
			vertexShader: bgVertexShader,
			fragmentShader: bgFragmentShader,
			transparent: false,
		})
		const aspectRatio = window.innerWidth / window.innerHeight
		this.bgGeometry = new THREE.PlaneGeometry(1, 1, 10, 10)
		this.bgGeometry.scale(aspectRatio, 1, 1)
		this.bgPlane = new THREE.Mesh(this.bgGeometry, this.bgMaterial)
		this.bgPlane.position.z = 3.2
		this.scene.add(this.bgPlane)
	}

	animated = false
	addColorToBGShader(color: string) {
		if (this.bgMaterial) {
			// this.animated = true
			this.bgMaterial.uniforms.uPrevColor.value =
				this.bgMaterial.uniforms.uColor.value
			this.bgMaterial.uniforms.uColor.value = new THREE.Color(color)

			const obj = { value: 0 }
			gsap.to(obj, {
				value: 1,
				duration: 1,
				ease: "linear",
				onUpdate: () => {
					if (this.bgMaterial) {
						this.bgMaterial.uniforms.uFactor.value = obj.value
					}
				},
			})
		}
	}

	async addGallery({ posts }: { posts: Post[] }) {
		this.total = posts.length

		this.integratedScenes = []
		const scenes = [
			LyapunovScene,
			NoiseInteractiveScene,
			BoidsScene,
			AttractionScene,
			HologramScene,
			MorphScene,
			LandScene,
			ParticlesScene,
			MandelbrotScene,
			FBMScene,
			CardioidScene,
			GalaxyScene,
			LinesScene,
			ParticlesInteractiveScene,
			EyeScene,
			FresnelScene,
			WobblyScene,
			VoronoiScene,
			GPGPUScene,
		]

		const loaderContainerEl = document.createElement("div")
		loaderContainerEl.classList.add("loader-container")
		document.body.appendChild(loaderContainerEl)
		let isComplied = false
		this.total = posts.length - 1
		for (let i = 0; i < scenes.length; i++) {
			const Scene = scenes[i]
			const scene = new Scene(null, {
				renderToTarget: true,
			})
			this.integratedScenes.push(scene)
			await new Promise((resolve) => setTimeout(resolve, 150))

			const itemsLoaded = i + 1
			const progressInPercent = (itemsLoaded / this.total) * 100

			threejsLoading.update((v) => ({ ...v, progress: progressInPercent }))
			const loader = this.loaderMesh as THREE.Mesh
			const mat = loader?.material as THREE.ShaderMaterial

			mat.uniforms.progress.value = progressInPercent
			mat.needsUpdate = true

			loaderContainerEl.textContent = `Loaded ${itemsLoaded}/${this.total}`

			if (itemsLoaded === this.total && !isComplied) {
				if (loader) {
					this.loaded = true
					this.scene.remove(loader)
					loaderContainerEl.remove()
					threejsLoading.update((v) => ({
						...v,
						loaded: true,
						loading: false,
					}))
					if (!this.isMobile) {
						this.addHamburger()
					}
				}

				isComplied = true
			}
			const rafId = scene.rafId
			if (rafId) cancelAnimationFrame(rafId)
		}

		this.integratedScenes.reverse()

		this.renderTargets = this.integratedScenes.map(
			() => new THREE.WebGLRenderTarget(this.width, this.height)
		)

		const getSlugSet = () => {
			const slugSetTexture: Record<string, THREE.Texture | undefined> = {
				"/lyapunov": this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof LyapunovScene) return i
				})?.texture,
				"/particles-noise": this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof NoiseInteractiveScene)
						return i
				})?.texture,
				"/boids": this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof BoidsScene) return i
				})?.texture,
				"/mutual-attraction": this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof AttractionScene) return i
				})?.texture,
				"/lines": this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof LinesScene) return i
				})?.texture,
				"/particles-interactive": this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof ParticlesInteractiveScene)
						return i
				})?.texture,
				"/hologram": this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof HologramScene) return i
				})?.texture,
				"/morphing": this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof MorphScene) return i
				})?.texture,
				"/land": this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof LandScene) return i
				})?.texture,
				"/particles": this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof ParticlesScene) return i
				})?.texture,
				"/mandelbrot": this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof MandelbrotScene) return i
				})?.texture,
				"/fbm": this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof FBMScene) return i
				})?.texture,
				"/cardioid": this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof CardioidScene) return i
				})?.texture,
				"/galaxy": this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof GalaxyScene) return i
				})?.texture,
				"/eye": this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof EyeScene) return i
				})?.texture,
				"/fresnel": this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof FresnelScene) return i
				})?.texture,
				"/wobbly": this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof WobblyScene) return i
				})?.texture,
				"/gpgpu": this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof GPGPUScene) return i
				})?.texture,
				"/voronoi": this.renderTargets.find((i, idx) => {
					if (this.integratedScenes[idx] instanceof VoronoiScene) return i
				})?.texture,
			}
			return slugSetTexture
		}

		this.integratedScenesDict = {
			"/lyapunov": this.integratedScenes.find((i) => {
				if (i instanceof LyapunovScene) return i
			}),
			"/particles-noise": this.integratedScenes.find((i) => {
				if (i instanceof NoiseInteractiveScene) return i
			}),
			"/boids": this.integratedScenes.find((i) => {
				if (i instanceof BoidsScene) return i
			}),
			"/mutual-attraction": this.integratedScenes.find((i) => {
				if (i instanceof AttractionScene) return i
			}),
			"/hologram": this.integratedScenes.find((i) => {
				if (i instanceof HologramScene) return i
			}),
			"/morphing": this.integratedScenes.find((i) => {
				if (i instanceof MorphScene) return i
			}),
			"/land": this.integratedScenes.find((i) => {
				if (i instanceof LandScene) return i
			}),
			"/particles": this.integratedScenes.find((i) => {
				if (i instanceof ParticlesScene) return i
			}),
			"/mandelbrot": this.integratedScenes.find((i) => {
				if (i instanceof MandelbrotScene) return i
			}),
			"/fbm": this.integratedScenes.find((i) => {
				if (i instanceof FBMScene) return i
			}),
			"/cardioid": this.integratedScenes.find((i) => {
				if (i instanceof CardioidScene) return i
			}),
			"/galaxy": this.integratedScenes.find((i) => {
				if (i instanceof GalaxyScene) return i
			}),
			"/lines": this.integratedScenes.find((i) => {
				if (i instanceof LinesScene) return i
			}),
			"/particles-interactive": this.integratedScenes.find((i) => {
				if (i instanceof ParticlesInteractiveScene) return i
			}),
			"/eye": this.integratedScenes.find((i) => {
				if (i instanceof EyeScene) return i
			}),
			"/fresnel": this.integratedScenes.find((i) => {
				if (i instanceof FresnelScene) return i
			}),
			"/wobbly": this.integratedScenes.find((i) => {
				if (i instanceof WobblyScene) return i
			}),
			"/gpgpu": this.integratedScenes.find((i) => {
				if (i instanceof GPGPUScene) return i
			}),
			"/voronoi": this.integratedScenes.find((i) => {
				if (i instanceof VoronoiScene) return i
			}),
		} as Record<string, IntegratedScene>

		const vor = this.integratedScenesDict["/voronoi"] as VoronoiScene
		if (vor) {
			vor.targetRenderer = this.renderer
			vor.camera.position.z += 4
			vor.raycastOffsetX = -500.5
			vor.raycastOffsetY = 0
		}

		// const gpgpus = this.integratedScenesDict["/gpgpu"] as GPGPUScene
		// if (gpgpus) {
		// 	gpgpus.targetRenderer = this.renderer
		// }

		const partInter = this.integratedScenesDict[
			"/particles-interactive"
		] as ParticlesInteractiveScene
		if (partInter) {
			partInter.targetRenderer = this.renderer
		}

		const slugSetTexture = getSlugSet()

		for (let i = 0; i < posts.length; i++) {
			const post = posts[i]
			let texture: THREE.Texture | undefined

			this.backgroundColors.push(post.backgroundColor)

			// Apply texture to the material
			if (!this.material || !this.geometry) return
			const material = this.material.clone()
			try {
				const group = new THREE.Group()

				const slug = post.slug

				if (slugSetTexture[slug]) {
					material.uniforms.uTexture.value = slugSetTexture[slug]
				} else {
					material.uniforms.uTexture.value = texture
				}
				if (material.uniforms.uTexture.value)
					material.uniforms.uTexture.value.needsUpdate = true
				material.uniforms.id = { value: i }
				material.uniforms.uResolution.value = new THREE.Vector3(
					window.innerWidth,
					window.innerHeight,
					1
				)

				const mesh = new THREE.Mesh(this.geometry, material)

				group.add(mesh)

				this.meshes[i] = mesh
				this.materials[i] = material
				this.groups[i] = group
			} catch (err) {
				console.error(err)
			}
		}
		this.groups.forEach((group) => {
			gsap.fromTo(
				group.scale,
				{
					x: 2,
					y: 2,
					z: 2,
				},
				{
					x: 1,
					y: 1,
					z: 1,
					duration: 1,
					ease: "power2.inOut",
				}
			)

			gsap.fromTo(
				group.position,
				{
					x: 0,
					y: -10,
					z: -3.5,
				},
				{
					...this.positionValues,
					duration: 1,
					ease: "power2.inOut",
				}
			)
			gsap.to(group.rotation, {
				...this.eulerValues,
				duration: 1,
				ease: "power2.inOut",
			})
			this.scene.add(group)
		})

		this.posts = posts
	}

	async addHamburger() {
		try {
			const { scene } = await this.gltfLoader.loadAsync("Hamburger.glb")
			const hamburgerGroup = scene.getObjectByName("Circle003_Circle004")

			const hamMat = new CustomShaderMaterial({
				baseMaterial: THREE.MeshPhysicalMaterial,
				uniforms: {
					time: { value: 0 },
				},
				vertexShader: `
					varying vec2 vUv;
					void main() {
						gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
						vUv = uv;
					}
				`,
				fragmentShader: `
					varying vec2 vUv;
					uniform float time;


					void main() {
						// fresnel effect
						vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
						float fresnel = 1.0 - dot(vNormal, viewDir);
						fresnel = pow(fresnel, 2.0);

						// color
						vec3 color = vec3(1.0, 1.0, 1.0);

						csm_DiffuseColor = vec4(color * fresnel, 1.0);
					}

				`,
				depthTest: false,
				depthWrite: false,
				ior: 2.2,
				reflectivity: 1,
				clearcoat: 1,
				clearcoatRoughness: 0.1,
				roughness: 0.01,
				metalness: 0.9,
				transparent: true,
				opacity: 0.2,
			})
			this.hamburgerMaterial = hamMat

			if (hamburgerGroup) {
				for (let i = 0; i < hamburgerGroup.children.length; i++) {
					const child = hamburgerGroup.children[i] as THREE.Mesh
					child.material = hamMat
					child.position.y -= 0.3
					child.scale.set(0.07, 0.07, 0.07)
				}

				hamburgerGroup.rotation.x = Math.PI / 10
				hamburgerGroup.rotation.y += 0.5
				const aspect = window.innerWidth / window.innerHeight
				hamburgerGroup.position.set(-1 - aspect * 4.5, 5.5, -10)
				hamburgerGroup.scale.set(0.1, 0.1, 0.1)

				const ambLight = new THREE.DirectionalLight(0xffffff, 40)
				ambLight.position.set(-5, 4, 2)
				this.scene.add(ambLight)

				const circles: THREE.Mesh[] = []
				this.hamburgerCircles = new THREE.Group()
				for (let i = 0; i < this.posts.length - 1; i++) {
					const post = this.posts[i]
					const geo = new THREE.TetrahedronGeometry(0.5, 0)
					const circle = new THREE.Mesh(geo, hamMat)
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-ignore
					circle.post = post

					// create a responsive list of circles around the hamburger
					const angle = (i / this.posts.length) * Math.PI * 2.1
					const gap = 0.35
					const radius = 3

					const x = Math.cos(angle) * radius * gap
					const y = Math.sin(angle) * radius * gap

					circle.name = `${post.slug}|hamburger`

					circle.position.set(x, y, 0)
					circle.scale.set(0.5, 0.5, 0.5)
					circles.push(circle)
				}

				hamburgerGroup.position.set(-100, 100, -100)

				this.scene.add(hamburgerGroup)
				this.hamburger = hamburgerGroup as THREE.Group
				this.hamburgerCircles.add(...circles)
				this.hamburger.add(this.hamburgerCircles)

				const raycastPlane = new THREE.Mesh(
					new THREE.PlaneGeometry(5, 5),
					new THREE.MeshBasicMaterial({
						color: 0xff0000,
						visible: false,
						depthTest: false,
						depthWrite: false,
					})
				)
				// center the plane
				raycastPlane.position.set(0, 0, 0)
				raycastPlane.name = "hamburgerRaycastPlane"
				this.hamburger.add(raycastPlane)

				// animate the hamburger
				gsap.to(hamburgerGroup.position, {
					x: -1 - aspect * 5.4,
					y: 5.5,
					z: -10,
					duration: 1,
					ease: "power2.inOut",
				})
			}
		} catch (err) {
			console.error(err)
		}
	}

	resize() {
		this.isMobile = window.innerWidth < 768
		this.width = window.innerWidth
		this.height = window.innerHeight
		this.screens = defineScreen()

		if (this.renderer)
			this.renderer.setSize(window.innerWidth, window.innerHeight)

		this.camera.aspect = this.width / this.height
		this.camera.updateProjectionMatrix()

		if (this.material) {
			this.material.uniforms.uResolution.value = new THREE.Vector3(
				window.innerWidth,
				window.innerHeight,
				1
			)
		}

		if (this.bgMaterial) {
			this.bgMaterial.uniforms.uResolution.value = new THREE.Vector2(
				this.width,
				this.height
			)
			// resize bgPlane
			const aspectRatio = this.width / this.height
			this.bgGeometry?.scale(aspectRatio, 1, 1)
		}

		for (const post of this.posts) {
			const slug = post.slug
			const scene = this.integratedScenesDict[slug]
			if (scene && scene.camera instanceof THREE.PerspectiveCamera) {
				scene.camera.aspect = this.width / this.height
				scene.camera.updateProjectionMatrix()
			}
			if (scene && scene.camera instanceof THREE.OrthographicCamera) {
				scene.camera.left = -this.width / 2
				scene.camera.right = this.width / 2
				scene.camera.top = this.height / 2
				scene.camera.bottom = -this.height / 2
				scene.camera.updateProjectionMatrix()
			}
		}

		for (const mesh of this.meshes) {
			mesh.geometry.dispose()
			mesh.geometry = createGeometry()
		}

		if (this.hamburger) {
			const aspect = window.innerWidth / window.innerHeight
			this.hamburger.position.set(-1 - aspect * 4.5, 5.5, -10)
		}
	}

	handleHoverNavItem(post: Post) {
		const slug = post.slug
		console.log("slug", slug)
	}
	handleHoverOutNavItem() {
		// empty
	}
	onMouseMove(e: MouseEvent) {
		// events
		this.mouse.set(
			(e.clientX / this.width) * 2 - 1,
			-(e.clientY / this.height) * 2 + 1
		)
		this.raycaster.setFromCamera(this.mouse, this.camera)
		this.intersected = this.raycaster.intersectObjects(
			this.scene.children,
			true
		)
		document.body.style.cursor = ""

		// If a previously hovered item is not among the hits we must call onPointerOut
		Object.keys(this.hovered).forEach((key) => {
			const hit = this.intersected.find((hit) => hit.object.uuid === key)
			if (hit === undefined) {
				if (this.handleHoverOut) {
					if (e.target instanceof HTMLElement && e.target.closest("nav")) {
						return
					}
					this.handleHoverOut()
				}
				if (this.hovered[key].object.name.endsWith("|hamburger")) {
					this.handleHoverOutNavItem()
				}
				delete this.hovered[key]
			}
		})

		this.intersected.forEach((hit) => {
			// If a hit has not been flagged as hovered we must call onPointerOver
			if (!this.hovered[hit.object.uuid]) {
				this.hovered[hit.object.uuid + hit.object.name] = hit

				if (this.handleHoverIn) {
					this.handleHoverIn()
				}
			}
			const obj = hit.object as THREE.Mesh & { post: Post }
			// if obj is a bgPlane, dont change cursor
			if (obj.material instanceof THREE.ShaderMaterial) {
				if (obj.name === "bgPlane") return
				document.body.style.cursor = "pointer"
				if (obj.material.uniforms.uMouse)
					obj.material.uniforms.uMouse.value = this.mouse
			}

			if (obj.name.endsWith("|hamburger")) {
				this.handleHoverNavItem(obj.post)
			}
		})
	}

	destroy() {
		this.meshes.forEach((mesh) => {
			this.scene.remove(mesh)
			mesh.geometry.dispose()
			;(mesh.material as THREE.Material).dispose()
		})

		window.removeEventListener("mousemove", (e) => this.onMouseMove(e))
		window.removeEventListener("resize", () => this.resize())
		window.removeEventListener("click", (e) => this.onClick(e))

		this.renderer?.dispose()
		this.scene.clear()

		if (this.rafId) cancelAnimationFrame(this.rafId)

		if (this.integratedScenes.length > 0) {
			this.integratedScenes.forEach((scene) => {
				if (!scene) return
				scene.destroy()
			})
		}
	}
	clock = new THREE.Clock()
	animate() {
		this.time = this.clock.getElapsedTime()

		this.materials.forEach((material) => {
			material.uniforms.time.value = this.time
		})

		if (this.bgMaterial) this.bgMaterial.uniforms.uTime.value = this.time

		if (this.renderer) {
			// Render the secondary scene to the render target
			if (
				this.renderTargets.length > 0 &&
				this.integratedScenes.length === this.renderTargets.length
			) {
				for (let i = 0; i < this.integratedScenes.length; i++) {
					try {
						const iScene = this.integratedScenes[i]
						if (!iScene) continue

						if (!iScene.rafId) continue

						const renderTarget = this.renderTargets[i]

						if (
							iScene instanceof GPGPUScene ||
							iScene instanceof ParticlesInteractiveScene
						) {
							continue
						}
						this.renderer.setRenderTarget(renderTarget)
						this.renderer.render(iScene.scene, iScene.camera)
						this.renderer.setRenderTarget(null) // Ensure rendering returns to the default framebuffer

						if (iScene instanceof LinesScene) {
							if (!iScene.target) {
								continue
							}
							this.renderer.setRenderTarget(iScene.target)
							this.renderer.render(iScene.scene, iScene.depthCamera)
							if (iScene.material) {
								iScene.material.uniforms.uDepths.value =
									iScene.target.depthTexture
							}
							this.renderer.setRenderTarget(null)
						}
					} catch (err) {
						// Added detailed error logging
						console.error(`Error rendering scene ${i}:`, err)
					}
				}
			}

			if (this.hamburgerMaterial) {
				this.hamburgerMaterial.uniforms.time.value = this.time
			}

			if (this.hamburger) {
				// this.hamburger.rotation.y += 0.01
				this.hamburger.scale.set(
					Math.sin(this.time) * 0.1 + 1,
					Math.sin(this.time) * 0.1 + 1,
					Math.sin(this.time) * 0.1 + 1
				)

				// if (!this.hovered[this.hamburger.uuid + this.hamburger.name]) {
				const hoveredItems = Object.values(this.hovered)
				const isSomeHovered = hoveredItems.some((hit) => {
					const obj = hit.object as THREE.Mesh
					return obj.name.endsWith("hamburgerRaycastPlane")
				})

				if (this.hamburgerCircles) {
					if (!isSomeHovered) {
						this.hamburgerCircles.rotation.z += 0.001
					} else {
						this.hamburgerCircles.rotation.z = THREE.MathUtils.lerp(
							this.hamburgerCircles.rotation.z,
							0,
							0.01
						)
					}
				}
			}

			// Render the main scene
			this.renderer.render(this.scene, this.camera)

			this.rafId = requestAnimationFrame(() => this.animate())
		}
	}
}

export default TravelGalleryScene
