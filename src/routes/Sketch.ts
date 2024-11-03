import type { Post } from "../types"
import * as THREE from "three"

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
import { threejsLoading } from "$lib/loading"
import type { IntegratedScene } from "./SketchTypes"

import bgVertexShader from "./shaders/bgVertexShader.glsl"
import bgFragmentShader from "./shaders/bgFragmentShader.glsl"
import vertexShader from "./shaders/vertexShader.glsl"
import fragmentShader from "./shaders/fragmentShader.glsl"

import { gsap } from "gsap"
import debounce from "debounce"
import CustomShaderMaterial from "three-custom-shader-material/vanilla"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"

export class GallerySketch {
	private worker!: Worker
	private canvas: HTMLCanvasElement
	private renderer: THREE.WebGLRenderer
	scene: THREE.Scene
	camera: THREE.PerspectiveCamera
	isMobile = window.innerWidth < 768
	loaded = false
	objs: { dist: number }[] = []

	position = 0
	speed = 0
	rounded = 0
	direction = 1
	currentIndex = 0
	posts: Post[] = []
	attractMode = false
	attractTo = 0
	rafId: number | null = null

	total = 0
	integratedScenes: IntegratedScene[] = []
	renderTargets: (THREE.WebGLRenderTarget | null)[] = []
	integratedScenesDict: Record<string, IntegratedScene> = {}
	slugSet: Record<string, THREE.Texture | undefined> = {}
	width = 0
	height = 0
	clock: THREE.Clock

	eulerValues = { x: 0, y: 0, z: 0 }
	positionValues = { x: 0, y: 0, z: 0 }

	raycaster = new THREE.Raycaster()
	mouse = new THREE.Vector2(0.5, 0.5)
	intersected: THREE.Intersection<THREE.Object3D<THREE.Object3DEventMap>>[] = []
	hovered: Record<string, THREE.Intersection> = {}

	bgGeometry: THREE.PlaneGeometry | null = null
	bgMaterial: THREE.ShaderMaterial | null = null
	bgPlane: THREE.Mesh | null = null
	material: THREE.ShaderMaterial | null = null
	backgroundColors: string[] = []
	textColors: string[] = []
	geometry: THREE.PlaneGeometry | null = null

	gltfLoader: GLTFLoader = new GLTFLoader()

	groups: THREE.Group<THREE.Object3DEventMap>[] = []
	meshes: THREE.Mesh[] = []
	materials: THREE.ShaderMaterial[] = []

	onClickEvent: ((meshIndex: number) => void) | null = null
	handleHoverIn: (() => void) | null = null
	handleHoverOut: (() => void) | null = null
	handleHoverNavItem(post: Post) {}
	handleHoverOutNavItem() {}

	private hamburger!: THREE.Group
	private hamburgerCircles!: THREE.Group
	private hamburgerMaterial!: CustomShaderMaterial
	private loaderMesh!: THREE.Mesh
	private slugSetTexture!: Record<string, THREE.Texture | undefined>
	private time = 0

	contentElements: HTMLElement[] = []

	constructor(canvasElement: HTMLCanvasElement, posts: Post[]) {
		this.canvas = canvasElement
		this.posts = posts

		this.width = window.innerWidth
		this.height = window.innerWidth

		this.geometry = createGeometry()
		this.eulerValues = calculateEuler()
		this.positionValues = calculatePosition()

		this.renderer = new THREE.WebGLRenderer({
			canvas: canvasElement,
			antialias: true,
			powerPreference: "high-performance",
			alpha: true,
		})

		this.renderer.toneMapping = THREE.ACESFilmicToneMapping
		this.renderer.toneMappingExposure = 1
		this.renderer.outputColorSpace = THREE.SRGBColorSpace
		this.renderer.setPixelRatio(Math.min(2, devicePixelRatio))

		this.resizeRendererToDisplaySize(this.renderer)

		this.scene = new THREE.Scene()
		this.camera = new THREE.PerspectiveCamera(
			55,
			this.width / this.height,
			0.1,
			1000,
		)
		this.camera.position.set(0, 0, 4)

		this.clock = new THREE.Clock()

		this.addObjects()

		this.handleResize()
		// init events
		window.addEventListener("resize", this.handleResize.bind(this))
		window.addEventListener("mousemove", this.handleMouseMove.bind(this))
		window.addEventListener("wheel", this.handleWheel.bind(this))

		// render loop
		gsap.ticker.fps(60)
		gsap.ticker.add(this.animate.bind(this))
	}

	private handleResize() {
		this.resizeRendererToDisplaySize(this.renderer)

		this.camera.aspect = window.innerWidth / window.innerHeight
		this.camera.updateProjectionMatrix()

		if (this.hamburger) {
			const aspect = window.innerWidth / window.innerHeight
			this.hamburger.position.set(-1 - aspect * 4.5, 5.5, -10)
		}
	}

	private handleMouseMove(e: MouseEvent) {
		// 1. Calculate mouse position relative to the canvas/container
		const rect = this.renderer.domElement.getBoundingClientRect()
		this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
		this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

		// 2. Update the raycaster
		this.raycaster.setFromCamera(this.mouse, this.camera)

		// 3. Adjust raycaster parameters if needed
		this.raycaster.params.Line!.threshold = 0.1 // Adjust threshold if needed
		this.raycaster.params.Points!.threshold = 0.1

		// 4. Perform intersection test
		this.intersected = this.raycaster.intersectObjects(
			this.scene.children,
			true,
		)

		// Reset cursor
		document.body.style.cursor = ""

		// 5. Handle hover out
		Object.keys(this.hovered).forEach((key) => {
			const hit = this.intersected.find((hit) => hit.object.uuid === key)
			if (!hit) {
				if (
					this.handleHoverOut &&
					!(e.target instanceof HTMLElement && e.target.closest("nav"))
				) {
					this.handleHoverOut()
				}
				if (this.hovered[key].object.name.endsWith("|hamburger")) {
					this.handleHoverOutNavItem()
				}
				delete this.hovered[key]
			}
		})

		// 6. Handle hover in
		this.intersected.forEach((hit) => {
			// Check if object is already hovered
			if (!this.hovered[hit.object.uuid]) {
				this.hovered[hit.object.uuid] = hit

				if (this.handleHoverIn) {
					this.handleHoverIn()
				}
			}

			const obj = hit.object as THREE.Mesh & { post: Post }

			// Handle material interactions
			if (obj.material instanceof THREE.ShaderMaterial) {
				if (obj.name === "bgPlane") return

				document.body.style.cursor = "pointer"

				// Update shader uniforms with correct mouse position
				if (obj.material.uniforms.uMouse) {
					obj.material.uniforms.uMouse.value = this.mouse
				}
			}

			// Handle hamburger menu interaction
			if (obj.name.endsWith("|hamburger")) {
				this.handleHoverNavItem(obj.post)
			}
		})
	}

	async addGallery() {
		const posts = this.posts

		this.objs = Array(posts.length)
			.fill(null)
			.map(() => {
				return {
					dist: 0,
				}
			})

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
			// GPGPUScene,
		]

		let isComplied = false

		let loaderContainerEl = document.querySelector(".loader-container")
		if (!loaderContainerEl) {
			loaderContainerEl = document.createElement("div")
			loaderContainerEl.classList.add("loader-container")
			document.body.appendChild(loaderContainerEl)
		}

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
				depthTest: false,
				depthWrite: false,
			}),
		)

		this.loaderMesh = loader

		if (loader) {
			loader.position.set(0, 0, 0)
			this.scene.add(loader)
		}

		this.total = posts.length - 1
		for (let i = 0; i < scenes.length; i++) {
			const Scene = scenes[i]
			const scene = new Scene(null, {
				renderToTarget: true,
			})

			this.integratedScenes.push(scene)

			await new Promise((resolve) => setTimeout(resolve, 300))

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

			if (itemsLoaded === this.total && !isComplied) {
				isComplied = true
				loaderContainerEl.remove()
			}
			const rafId = scene.rafId
			if (rafId) cancelAnimationFrame(rafId)
			scene.rafId = null
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

		this.renderTargets = this.integratedScenes.map(
			() => new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight),
		)

		const vor = this.integratedScenesDict["/voronoi"] as VoronoiScene
		if (vor) {
			vor.targetRenderer = this.renderer
			vor.camera.position.z += 4
			vor.raycastOffsetX = -500.5
			vor.raycastOffsetY = 0
		}

		const partInter = this.integratedScenesDict[
			"/particles-interactive"
		] as ParticlesInteractiveScene
		if (partInter) {
			partInter.targetRenderer = this.renderer
		}

		// const gpgpu = this.integratedScenesDict["/gpgpu"] as GPGPUScene
		// if (partInter) {
		// 	gpgpu.targetRenderer = this.renderer
		// }

		const slugSetTexture = this.getSlugSet()
		this.slugSetTexture = slugSetTexture

		for (let i = 0; i < posts.length; i++) {
			const post = posts[i]

			this.backgroundColors.push(post.backgroundColor)
			this.backgroundColors.push(post.textColor)

			// Apply texture to the material
			if (!this.material || !this.geometry) return

			const mat = this.material.clone()

			try {
				const group = new THREE.Group()

				mat.uniforms.id = { value: i }
				mat.uniforms.uResolution.value = new THREE.Vector3(
					this.width,
					this.height,
					1,
				)

				const slug = post.slug
				if (slugSetTexture[slug]) {
					mat.uniforms.uTexture.value = slugSetTexture[slug]
					mat.uniforms.uTexture.value.needsUpdate = true
				}

				const mesh = new THREE.Mesh(this.geometry, mat)

				group.add(mesh)

				mesh.name = `Gallery card N${i}`

				this.meshes[i] = mesh
				this.materials[i] = mat
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
				},
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
				},
			)
			gsap.to(group.rotation, {
				...this.eulerValues,
				duration: 1,
				ease: "power2.inOut",
			})
			this.scene.add(group)
		})

		self.postMessage({
			type: "init",
			data: {
				posts,
			},
		})
	}

	handleWheel(e: WheelEvent) {
		this.speed += e.deltaY * -0.0003
		this.direction = Math.sign(e.deltaY) as 1 | -1

		if (this.direction === 1 && Math.abs(this.currentIndex) === 0) {
			this.speed += e.deltaY * 0.0003
		}
		if (this.direction === -1 && this.currentIndex === this.posts.length - 1) {
			this.speed += e.deltaY * 0.0003
		}

		debounce(() => {
			this.handleChangeSelection()
		}, 500)()
	}

	handleChangeSelection() {
		// Cancel raf loop if it's not the current index
		this.integratedScenes.forEach((scene) => {
			if (scene && scene?.rafId) {
				cancelAnimationFrame(scene.rafId)
				scene.rafId = null
			}
		})
		this.contentElements.forEach((c) => c.classList.add("hidden"))

		// handle enter to viewport
		const post = this.posts[this.currentIndex]
		const scene = this.integratedScenesDict[post.slug]
		if (scene && !scene?.rafId) {
			scene.animate()
			this.addColorToBGShader(this.currentIndex)

			const content = this.contentElements[this.currentIndex]
			content.classList.remove("hidden")
		}
	}

	animate() {
		this.time = this.clock.getElapsedTime()
		// Slider raf
		this.position += this.speed
		this.speed *= 0.7
		this.rounded = Math.round(this.position)
		const diff = this.rounded - this.position
		const nextIndex = +this.position.toFixed(0)

		// get current index of anchor
		this.currentIndex = nextIndex

		for (let i = 0; i < this.objs.length; i++) {
			const obj = this.objs[i]

			obj.dist = 1.0 - Math.min(Math.abs(this.position - i), 1)

			const mesh = this.meshes[i]

			if (mesh) {
				const mat = mesh.material as THREE.ShaderMaterial

				mat.uniforms.distanceFromCenter.value = obj.dist

				const delta =
					(mesh.geometry as unknown as { parameters: { height: number } })
						.parameters.height * 1.15

				const scale = 1 + 0.2 * obj.dist
				mesh.scale.set(scale, scale, scale)
				mesh.position.y = i * delta + -(this.position * delta)
			}
		}

		if (this.hamburgerCircles) {
			this.hamburgerCircles.children.forEach((circle) => {
				if (circle instanceof THREE.Mesh) {
					const mat = circle.material as CustomShaderMaterial

					const curPost = this.posts[this.currentIndex]
					const slug = curPost.slug

					mat.uniforms.uActive.value = false
					const slugCircle = String(circle.name).replace("|hamburger", "")
					if (slugCircle === slug) {
						mat.uniforms.uActive.value = true
					}
					mat.needsUpdate = true
				}
			})
		}

		if (this.attractMode) {
			this.position += -(this.position - this.attractTo) * 0.1
		} else {
			this.position += Math.sign(diff) * Math.pow(Math.abs(diff), 0.7) * 0.015
		}

		// Renders part
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
							let temp = iScene.target
							temp = iScene.secondTarget
							iScene.secondTarget = temp

							this.renderer.setRenderTarget(temp)
							this.renderer.render(iScene.scene, iScene.depthCamera)
							if (iScene.material) {
								iScene.material.uniforms.uDepths.value = temp.depthTexture
							}
							this.renderer.setRenderTarget(null)
						}
					} catch (err) {
						console.error(`Error rendering scene ${i}:`, err)
					}
				}
			}
		}

		// Render the main scene
		this.renderer.render(this.scene, this.camera)

		if (this.hamburger) {
			// // this.hamburger.rotation.y += 0.01
			this.hamburger.scale.set(
				Math.sin(this.time) * 0.1 + 1,
				Math.sin(this.time) * 0.1 + 1,
				Math.sin(this.time) * 0.1 + 1,
			)

			this.hamburger.children.forEach((hamChild) => {
				if (
					hamChild instanceof THREE.Mesh &&
					hamChild?.material?.uniforms &&
					"time" in hamChild.material.uniforms
				) {
					hamChild.material.uniforms.time.value = this.time
				}
			})
		}
	}

	destroy() {
		window.removeEventListener("resize", this.handleResize)
		window.removeEventListener("mousemove", this.handleMouseMove)
		window.removeEventListener("wheel", this.handleWheel)

		if (this.rafId) {
			cancelAnimationFrame(this.rafId)
		}
	}

	getSlugSet() {
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

	addObjects() {
		this.material = new THREE.ShaderMaterial({
			side: THREE.FrontSide,
			uniforms: {
				time: { value: 0 },
				uTexture: { value: null },
				resolutions: { value: new THREE.Vector4() },
				distanceFromCenter: { value: 0.0 },
				mouse: { value: new THREE.Vector2(0, 0) },
				uResolution: { value: new THREE.Vector2(1, 1) },
				uMouse: { value: new THREE.Vector2(0, 0) },
				isMobile: { value: this.width < 768 },
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
					value: new THREE.Vector2(this.width, this.height),
				},
				uMouse: { value: new THREE.Vector2(0, 0) },
				uSpeed: { value: 0.01 },
				uFactor: { value: 1.0 },
				uEnabled: { value: true },
			},
			vertexShader: bgVertexShader,
			fragmentShader: bgFragmentShader,
			transparent: false,
		})
		const aspectRatio = this.width / this.height
		this.bgGeometry = new THREE.PlaneGeometry(100, 100, 1, 1)
		this.bgGeometry.scale(aspectRatio, 1, 1)
		this.bgPlane = new THREE.Mesh(this.bgGeometry, this.bgMaterial)
		this.bgPlane.position.z = 3.2
		this.scene.add(this.bgPlane)
	}

	resizeRendererToDisplaySize(renderer: THREE.WebGLRenderer) {
		const canvas = renderer.domElement
		const needResize =
			canvas.width !== window.innerWidth || canvas.height !== window.innerHeight
		if (needResize) {
			renderer.setSize(window.innerWidth, window.innerHeight, false)
		}

		return needResize
	}

	addColorToBGShader(index: number) {
		const color = this.posts[index].backgroundColor
		if (this.bgMaterial) {
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

	async addHamburger() {
		try {
			const { scene } = await this.gltfLoader.loadAsync("Hamburger.glb")
			const hamburgerGroup = scene.getObjectByName("Circle003_Circle004")

			const hamMatBase = new CustomShaderMaterial({
				baseMaterial: THREE.MeshPhysicalMaterial,
				uniforms: {
					time: { value: 0 },
					uColor: { value: new THREE.Color("white") },
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
					uniform vec3 uColor;


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
			this.hamburgerMaterial = hamMatBase

			if (hamburgerGroup) {
				for (let i = 0; i < hamburgerGroup.children.length; i++) {
					const child = hamburgerGroup.children[i] as THREE.Mesh
					child.material = hamMatBase
					child.position.y -= 0.3
					child.scale.set(0.07, 0.07, 0.07)
				}

				hamburgerGroup.rotation.x = Math.PI / 10
				hamburgerGroup.rotation.y += 0.5
				const aspect = window.innerWidth / window.innerHeight
				hamburgerGroup.position.set(-1 - aspect * 4.5, 5.5, -10)

				const ambLight = new THREE.AmbientLight(0xffffff, 5)
				this.scene.add(ambLight)

				const circles: THREE.Mesh[] = []
				this.hamburgerCircles = new THREE.Group()
				for (let i = 0; i < this.posts.length - 1; i++) {
					const hamMat = new CustomShaderMaterial({
						baseMaterial: THREE.MeshPhysicalMaterial,
						uniforms: {
							time: { value: 0 },
							uColor: { value: new THREE.Color("white") },
							uColorActive: { value: new THREE.Color("red") },
							uActive: { value: false },
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
							uniform vec3 uColor;
							uniform vec3 uColorActive;
							uniform bool uActive;
		
							void main() {
								// fresnel effect
								vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
								float fresnel = 1.0 - dot(vNormal, viewDir);
								fresnel = pow(fresnel, 2.0);
		
								// color
								vec3 color = vec3(1.0, 1.0, 1.0);
		
								
								if(uActive) {
									color = uColorActive;
									} else {
										color = uColor;
								}
								
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
					const post = this.posts[i]
					const geo = new THREE.TetrahedronGeometry(0.25, 0)
					const circle = new THREE.Mesh(geo, hamMat)

					// create a responsive list of circles around the hamburger
					const angle = (i / this.posts.length) * Math.PI * 2.1
					const gap = 0.35
					const radius = 3

					const x = Math.cos(angle) * radius * gap
					const y = Math.sin(angle) * radius * gap

					circle.name = `${post.slug}|hamburger`

					circle.position.set(x, y, 0)
					circles.push(circle)
				}

				this.scene.add(hamburgerGroup)
				this.hamburger = hamburgerGroup as THREE.Group
				this.hamburgerCircles.add(...circles)
				this.hamburger.add(this.hamburgerCircles)

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
}

export default GallerySketch

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

	return new THREE.PlaneGeometry(geometry[0], geometry[1], 1, 1)
}
