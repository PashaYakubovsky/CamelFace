import vertexShader from "./vertexShader.glsl"
import fragmentShader from "./fragmentShader.glsl"
import Stats from "three/examples/jsm/libs/stats.module"

import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader"
import GUI from "lil-gui"
import gsap from "$gsap"

class MTBScene {
	renderer: THREE.WebGLRenderer | null = null
	private mouse: THREE.Vector2
	private width = window.innerWidth
	private height = window.innerHeight
	private pixelRatio = Math.min(window.devicePixelRatio, 2)
	stats?: Stats
	time = 0
	scene!: THREE.Scene
	camera!: THREE.PerspectiveCamera
	gui!: GUI
	rafId: number | null = null
	gltfLoader: GLTFLoader
	dracoLoader: DRACOLoader

	controls: OrbitControls
	debugObject = {
		clearColor: "#160920",
	}

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
				powerPreference: "high-performance",
			})
			this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
			this.renderer.setSize(window.innerWidth, window.innerHeight)
			this.renderer.setClearColor(new THREE.Color("#160920"), 0)

			this.stats = new Stats()
			this.stats.dom.style.left = "auto"
			this.stats.dom.style.right = "0"
			this.stats.dom.style.top = "auto"
			this.stats.dom.style.bottom = "0"
			document.body.appendChild(this.stats.dom)
		}
		this.scene = new THREE.Scene()

		/**
		 * Camera
		 */
		// Base camera
		this.camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0, 1000)

		// new THREE.PerspectiveCamera(
		// 	35,
		// 	this.width / this.height,
		// 	0.1,
		// 	100
		// )
		// this.camera.position.set(0, 0, 20)
		this.scene.add(this.camera)

		// Loaders
		this.dracoLoader = new DRACOLoader()
		this.dracoLoader.setDecoderPath("./draco/")
		this.gltfLoader = new GLTFLoader()
		this.gltfLoader.setDRACOLoader(this.dracoLoader)

		this.mouse = new THREE.Vector2()

		// Controls
		if (this.renderer) {
			this.controls = new OrbitControls(this.camera, canvasElement)
			this.controls.enableDamping = true
			// Disable controls
			this.controls.enabled = false
		}

		// Add objects
		this.addObjects()

		// Debug
		if (this.renderer) this.addDebug()

		// initial render
		this.animate()

		// Events
		window.addEventListener("mousemove", this.onMouseMove.bind(this), false)
		if (this.renderer) {
			window.addEventListener("resize", this.onWindowResize.bind(this), false)
		}
	}

	onReady() {
		// Ready callback
	}

	async addObjects() {
		// add plane and attach shader material
		const geometry = new THREE.PlaneGeometry(10, 10, 32, 32)
		const material = new THREE.ShaderMaterial({
			vertexShader,
			fragmentShader,
			uniforms: {
				uTime: { value: 0 },
				uResolution: { value: new THREE.Vector2(this.width, this.height) },
				uMouse: { value: this.mouse },
			},
		})
		const plane = new THREE.Mesh(geometry, material)
		this.material = material
		this.scene.add(plane)
	}

	addDebug() {
		this.gui = new GUI({ width: 300 })
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
	}

	clock = new THREE.Clock()
	animate(): void {
		const elapsedTime = this.clock.getElapsedTime() * 0.5
		this.time = elapsedTime

		// Update controls
		if (this.controls) this.controls.update()

		if (this.renderer) this.renderer.render(this.scene, this.camera)

		if (this.material) {
			this.material.uniforms.uTime.value = this.time
			this.material.uniforms.uMouse.value = this.mouse
		}

		this.rafId = requestAnimationFrame(() => this.animate())

		if (this.stats) this.stats.update()
	}

	onClick(e: MouseEvent): void {
		e.preventDefault()
	}

	destroy(): void {
		window.removeEventListener("mousemove", this.onMouseMove.bind(this))

		if (this.gui) this.gui.destroy()

		if (this.controls) this.controls.dispose()

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

export default MTBScene
