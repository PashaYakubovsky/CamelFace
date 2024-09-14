import vertexShader from "./shaders/vertexShader.glsl"
import fragmentShader from "./shaders/fragmentShader.glsl"
import gpgpuParticlesFragmentShader from "./shaders/fragmentParticles.glsl"
import Stats from "three/addons/libs/stats.module.js"
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js"
import { GUI } from "lil-gui"

import {
	GPUComputationRenderer,
	type Variable,
} from "three/addons/misc/GPUComputationRenderer.js"

class GPGPUScene {
	renderer: THREE.WebGLRenderer | undefined
	targetRenderer: THREE.WebGLRenderer | null = null
	mouse: THREE.Vector2
	width = window.innerWidth
	height = window.innerHeight
	pixelRatio = Math.min(window.devicePixelRatio, 2)
	group: THREE.Group | undefined
	stats?: Stats
	time = 0
	rafId: number | null = null
	material!: THREE.ShaderMaterial
	scene!: THREE.Scene
	camera!: THREE.PerspectiveCamera
	gui!: GUI
	gltfLoader: GLTFLoader
	dracoLoader: DRACOLoader
	particles: {
		geometry?: THREE.BufferGeometry
		material?: THREE.ShaderMaterial
		points?: THREE.Points
	} = {}
	controls?: OrbitControls
	debugObject = {
		clearColor: "#160920",
		size: 0.07,
		debug: false,
		uFlowFieldInfluence: 0.5,
		uFlowSpeed: 0.5,
		uFlowFieldStrength: 0.5,
		uFlowFieldFrequency: 0.5,
		showRaycastBox: false,
	}
	baseGeometry: {
		instance?: THREE.BufferGeometry
		count?: number
	} = {}
	gpgpu: {
		size: number
		computation: GPUComputationRenderer
		particlesVariable?: Variable
		debug?: THREE.Mesh
	} = {
		size: 0,
		computation: new GPUComputationRenderer(0, 0, new THREE.WebGLRenderer()),
	}
	raycaster: THREE.Raycaster
	raycastBox!: THREE.Mesh
	isPreview = false

	constructor(
		canvasElement: HTMLCanvasElement | null,
		opt?: {
			renderToTarget?: boolean
		}
	) {
		if (!opt?.renderToTarget && canvasElement) {
			this.renderer = new THREE.WebGLRenderer({
				antialias: true,
				alpha: true,
				canvas: canvasElement,
			})
			this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
			this.renderer.setSize(window.innerWidth, window.innerHeight)
			this.renderer.setClearColor(new THREE.Color("#160920"), 0)
		} else {
			this.isPreview = true
		}

		this.scene = new THREE.Scene()

		/**
		 * Camera
		 */
		// Base camera
		this.camera = new THREE.PerspectiveCamera(
			35,
			this.width / this.height,
			0.1,
			100
		)
		this.camera.position.set(0, 0, 20)
		this.scene.add(this.camera)

		// Loaders
		this.dracoLoader = new DRACOLoader()
		this.dracoLoader.setDecoderPath("./draco/")
		this.gltfLoader = new GLTFLoader()
		this.gltfLoader.setDRACOLoader(this.dracoLoader)
		if (this.renderer) {
			this.stats = new Stats()
			this.stats.dom.style.left = "auto"
			this.stats.dom.style.right = "0"
			this.stats.dom.style.top = "auto"
			this.stats.dom.style.bottom = "0"
			document.body.appendChild(this.stats.dom)
		}

		// Raycaster
		this.raycaster = new THREE.Raycaster()
		this.mouse = new THREE.Vector2()

		// Controls
		if (!opt?.renderToTarget && canvasElement) {
			this.controls = new OrbitControls(this.camera, canvasElement)
			this.controls.enableDamping = true
		}
		// Disable controls
		// this.controls.enabled = false;

		// Add objects
		this.addObjects()

		// Debug
		if (!opt?.renderToTarget) {
			this.addDebug()
		}
		// Events
		window.addEventListener("resize", this.onWindowResize.bind(this), false)
		window.addEventListener("mousemove", this.onMouseMove.bind(this), false)

		// initial render
		this.animate()
	}

	async addObjects() {
		// Load models
		const gltf = await this.gltfLoader.loadAsync("/ship.glb")
		/**
		 * Geometry
		 */
		const shipMesh = gltf.scene.children[0] as THREE.Mesh
		this.baseGeometry = {
			instance: shipMesh.geometry,
			count: 0,
		}

		if (this.baseGeometry.instance)
			this.baseGeometry.count =
				this.baseGeometry.instance.attributes.position.count

		/**
		 * GPU Compute
		 */
		// Setup
		if (
			this.baseGeometry.count &&
			this.baseGeometry.instance &&
			(this.targetRenderer || this.renderer)
		) {
			this.gpgpu.size = Math.ceil(Math.sqrt(this.baseGeometry.count))
			this.gpgpu.computation = new GPUComputationRenderer(
				this.gpgpu.size,
				this.gpgpu.size,
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				this.targetRenderer! || this.renderer!
			)
		}
		// Base particles
		const baseParticlesTexture = this.gpgpu.computation.createTexture()

		if (this.baseGeometry.count && this.baseGeometry.instance) {
			for (let i = 0; i < this.baseGeometry.count; i++) {
				const i3 = i * 3
				const i4 = i * 4

				// Positions based on geometry
				const x = this.baseGeometry.instance.attributes.position.array[i3]
				const y = this.baseGeometry.instance.attributes.position.array[i3 + 1]
				const z = this.baseGeometry.instance.attributes.position.array[i3 + 2]

				// Set position
				baseParticlesTexture.image.data[i4] = x
				baseParticlesTexture.image.data[i4 + 1] = y
				baseParticlesTexture.image.data[i4 + 2] = z
				baseParticlesTexture.image.data[i4 + 3] = Math.random()
			}
		}

		// Particles variable
		this.gpgpu.particlesVariable = this.gpgpu.computation.addVariable(
			"uParticles",
			gpgpuParticlesFragmentShader,
			baseParticlesTexture
		)

		// Uniforms
		this.gpgpu.particlesVariable.material.uniforms.uTime = new THREE.Uniform(0)
		this.gpgpu.particlesVariable.material.uniforms.uBase = new THREE.Uniform(
			baseParticlesTexture
		)
		this.gpgpu.particlesVariable.material.uniforms.uDeltaTime =
			new THREE.Uniform(0)
		this.gpgpu.particlesVariable.material.uniforms.uFlowFieldInfluence =
			new THREE.Uniform(this.debugObject.uFlowFieldInfluence)
		this.gpgpu.particlesVariable.material.uniforms.uFlowSpeed =
			new THREE.Uniform(this.debugObject.uFlowSpeed)
		this.gpgpu.particlesVariable.material.uniforms.uFlowFieldStrength =
			new THREE.Uniform(this.debugObject.uFlowFieldStrength)
		this.gpgpu.particlesVariable.material.uniforms.uFlowFieldFrequency =
			new THREE.Uniform(this.debugObject.uFlowFieldFrequency)
		this.gpgpu.particlesVariable.material.uniforms.uIntersect =
			new THREE.Uniform(new THREE.Vector3(0, 0, 0))

		// Set dependencies
		this.gpgpu.computation.setVariableDependencies(
			this.gpgpu.particlesVariable,
			[this.gpgpu.particlesVariable]
		)

		// Init
		this.gpgpu.computation.init()

		// Debug
		const pTexture = this.gpgpu.computation.getCurrentRenderTarget(
			this.gpgpu.particlesVariable
		).texture
		this.gpgpu.debug = new THREE.Mesh(
			new THREE.PlaneGeometry(1, 1),
			new THREE.MeshBasicMaterial({
				map: pTexture,
				side: THREE.DoubleSide,
				visible: this.debugObject.debug,
			})
		)
		this.gpgpu.debug.position.set(5, 0, 0)
		this.scene.add(this.gpgpu.debug)

		/**
		 * Particles
		 */
		// Positions
		if (this.baseGeometry.count) {
			const particlesUVArray = new Float32Array(this.baseGeometry.count * 2)
			const sizesArray = new Float32Array(this.baseGeometry.count)
			for (let y = 0; y < this.gpgpu.size; y++) {
				// Particles UV
				for (let x = 0; x < this.gpgpu.size; x++) {
					const i = x + y * this.gpgpu.size
					const i2 = i * 2

					particlesUVArray[i2] = (x + 0.5) / this.gpgpu.size
					particlesUVArray[i2 + 1] = (y + 0.5) / this.gpgpu.size

					// Random sizes
					sizesArray[i] = Math.random()
				}
			}

			this.particles.geometry = new THREE.BufferGeometry()
			this.particles.geometry.setDrawRange(0, this.baseGeometry.count)

			// Attributes
			if (this.baseGeometry.instance) {
				this.particles.geometry.setAttribute(
					"aParticlesUv",
					new THREE.BufferAttribute(particlesUVArray, 2)
				)
				this.particles.geometry.setAttribute(
					"aColor",
					this.baseGeometry.instance.attributes.color
				)
				this.particles.geometry.setAttribute(
					"aSize",
					new THREE.BufferAttribute(sizesArray, 1)
				)
			}
		}

		// Material
		this.particles.material = new THREE.ShaderMaterial({
			vertexShader,
			fragmentShader,
			depthTest: true,
			uniforms: {
				uSize: new THREE.Uniform(this.debugObject.size),
				uResolution: new THREE.Uniform(
					new THREE.Vector2(
						this.width * this.pixelRatio,
						this.height * this.pixelRatio
					)
				),
				uMouse: new THREE.Uniform(new THREE.Vector2(0, 0)),
				uTime: new THREE.Uniform(0),
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				uParticlesTexture: new THREE.Uniform(),
			},
		})

		// Points
		this.particles.points = new THREE.Points(
			this.particles.geometry,
			this.particles.material
		)
		// Disable frustum culling for preventing points to be culled
		this.particles.points.frustumCulled = false
		this.scene.add(this.particles.points)

		requestAnimationFrame(() => {
			// add box for raycasting
			this.raycastBox = new THREE.Mesh(
				// take the bounding box of the ship
				new THREE.BoxGeometry(4, 5, 13),
				new THREE.MeshBasicMaterial({ visible: true, wireframe: true })
			)
			this.raycastBox.visible = this.debugObject.showRaycastBox

			this.raycastBox.position.set(1.4, 1, 1)

			// add to scene
			this.scene.add(this.raycastBox)
		})
	}

	addDebug() {
		this.gui = new GUI({ width: 300 })

		this.gui.open()
		this.gui
			.addColor(this.debugObject, "clearColor")
			.name("Canvas color")
			.onChange(() => {
				if (this.renderer)
					this.renderer.setClearColor(this.debugObject.clearColor)
			})
		this.gui
			.add(this.debugObject, "size")
			.name("Particle Size")
			.min(0.01)
			.max(5)
			.step(0.1)
			.onChange(() => {
				if (this.particles.material) {
					this.particles.material.uniforms.uSize.value = this.debugObject.size
				}
			})

		this.gui
			.add(this.debugObject, "debug")
			.name("FBO Debug plane")
			.onChange(() => {
				if (this.gpgpu.debug) {
					this.gpgpu.debug.visible = this.debugObject.debug
					// update the material
					if (this.gpgpu.particlesVariable)
						this.gpgpu.debug.material = new THREE.MeshBasicMaterial({
							map: this.gpgpu.computation.getCurrentRenderTarget(
								this.gpgpu.particlesVariable
							).texture,
							side: THREE.DoubleSide,
							visible: this.debugObject.debug,
						})
				}
			})

		this.gui
			.add(this.debugObject, "uFlowFieldInfluence")
			.name("Flow Field Influence")
			.min(0)
			.max(1)
			.step(0.01)
			.onChange(() => {
				if (this.gpgpu.particlesVariable) {
					this.gpgpu.particlesVariable.material.uniforms.uFlowFieldInfluence.value =
						this.debugObject.uFlowFieldInfluence
				}
			})

		this.gui
			.add(this.debugObject, "uFlowSpeed")
			.name("Flow Speed")
			.min(0.01)
			.max(10)
			.step(0.01)
			.onChange(() => {
				if (this.gpgpu.particlesVariable) {
					this.gpgpu.particlesVariable.material.uniforms.uFlowSpeed.value =
						this.debugObject.uFlowSpeed
				}
			})

		this.gui
			.add(this.debugObject, "uFlowFieldStrength")
			.name("Flow Field Strength")
			.min(0.1)
			.max(10)
			.step(0.01)
			.onChange(() => {
				if (this.gpgpu.particlesVariable) {
					this.gpgpu.particlesVariable.material.uniforms.uFlowFieldStrength.value =
						this.debugObject.uFlowFieldStrength
				}
			})

		this.gui
			.add(this.debugObject, "uFlowFieldFrequency")
			.name("Flow Field Frequency")
			.min(0.1)
			.max(1)
			.step(0.001)
			.onChange(() => {
				if (this.gpgpu.particlesVariable) {
					this.gpgpu.particlesVariable.material.uniforms.uFlowFieldFrequency.value =
						this.debugObject.uFlowFieldFrequency
				}
			})

		const folder = this.gui.addFolder("Raycasting")
		folder
			.add(this.debugObject, "showRaycastBox")
			.name("Show Raycast Box")
			.onChange(() => {
				this.raycastBox.visible = this.debugObject.showRaycastBox
			})
	}

	onWindowResize(): void {
		this.width = window.innerWidth
		this.height = window.innerHeight

		// Update camera
		this.camera.aspect = this.width / this.height
		this.camera.updateProjectionMatrix()

		// Update renderer
		if (this.renderer) {
			this.renderer.setSize(this.width, this.height)
			this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
		}
		// Update resolution uniform
		if (this.particles.material) {
			this.particles.material.uniforms.uResolution.value = new THREE.Vector2(
				this.width * this.pixelRatio,
				this.height * this.pixelRatio
			)
		}
	}

	onMouseMove(event: MouseEvent): void {
		// Get the bounding rectangle of the renderer
		const rect = this.renderer
			? this.renderer.domElement.getBoundingClientRect()
			: document.body.getBoundingClientRect()

		// Calculate the mouse's position within the renderer (0, 0 is the top left corner)
		const x = event.clientX - rect.left
		const y = event.clientY - rect.top

		// Normalizing the x, y coordinates (which will be in pixels)
		// to a range suitable for shaders (-1 to 1 for x and 1 to -1 for y)
		this.mouse.x = (x / rect.width) * 2 - 1
		this.mouse.y = -(y / rect.height) * 2 + 1

		// Raycaster
		if (this.raycaster && this.raycastBox) {
			// update the picking ray with the camera and pointer position
			this.raycaster.setFromCamera(this.mouse, this.camera)

			// calculate objects intersecting the picking ray
			const intersects = this.raycaster.intersectObject(this.raycastBox)

			if (intersects[0]?.point && this.gpgpu && this.gpgpu.particlesVariable) {
				this.gpgpu.particlesVariable.material.uniforms.uIntersect.value =
					intersects[0].point
			}
		}

		if (this.particles.material) {
			this.particles.material.uniforms.uMouse.value = this.mouse
		}
	}

	clock = new THREE.Clock()
	previousTime = 0
	animate(): void {
		const elapsedTime = this.clock.getElapsedTime()
		// clamp the delta
		const deltaTime = elapsedTime - this.previousTime
		this.previousTime = elapsedTime

		// Update controls
		if (this.controls) this.controls.update()

		// Update gpgpu
		if (this.gpgpu && this.gpgpu.computation && this.gpgpu.particlesVariable) {
			// Update uniforms
			this.gpgpu.particlesVariable.material.uniforms.uTime.value = elapsedTime
			this.gpgpu.particlesVariable.material.uniforms.uDeltaTime.value =
				deltaTime

			this.gpgpu.computation.compute()
			// Update particles texture
			if (this.particles.material && this.gpgpu.particlesVariable) {
				this.particles.material.uniforms.uParticlesTexture.value =
					this.gpgpu.computation.getCurrentRenderTarget(
						this.gpgpu.particlesVariable
					).texture
			}
		}

		// Update particles
		if (this.particles.material) {
			this.particles.material.uniforms.uTime.value = this.time
		}

		// Render normal scene
		if (this.renderer) this.renderer.render(this.scene, this.camera)

		if (this.isPreview) {
			const elapsedTime = performance.now() * 0.001 // Convert to seconds

			// Radius of the circular path
			const radius = 15

			// Calculate camera position
			const cameraX = Math.sin(elapsedTime * 0.5) * radius
			const cameraZ = Math.cos(elapsedTime * 0.5) * radius
			const cameraY = Math.sin(elapsedTime * 0.3) * 5 + 7 // Vertical oscillation

			// Smooth camera movement using lerp
			this.camera.position.x = THREE.MathUtils.lerp(
				this.camera.position.x,
				cameraX,
				0.02
			)
			this.camera.position.y = THREE.MathUtils.lerp(
				this.camera.position.y,
				cameraY,
				0.02
			)
			this.camera.position.z = THREE.MathUtils.lerp(
				this.camera.position.z,
				cameraZ,
				0.02
			)

			// Calculate a point for the camera to look at
			const lookAtX = Math.sin(elapsedTime * 0.2) * 3
			const lookAtY = Math.cos(elapsedTime * 0.2) * 2
			const lookAtZ = Math.sin(elapsedTime * 0.3) * 3

			// Create a vector for the camera to look at
			const lookAtPoint = new THREE.Vector3(lookAtX, lookAtY, lookAtZ)

			// Smoothly interpolate the camera's look-at point
			this.camera.lookAt(lookAtPoint)
		}

		this.rafId = requestAnimationFrame(() => this.animate())

		if (this.stats) this.stats.update()
	}

	destroy(): void {
		window.removeEventListener("mousemove", this.onMouseMove.bind(this))

		if (this.gui) this.gui.destroy()

		if (this.renderer) {
			this.renderer.dispose()
			this.renderer.forceContextLoss()
		}
		this.scene.traverse((child) => {
			if (child instanceof THREE.Mesh) {
				child.geometry.dispose()
				child.material.dispose()
			}
		})

		if (this.stats) this.stats.dom.remove()

		if (this.rafId) cancelAnimationFrame(this.rafId)
	}
}

export default GPGPUScene
