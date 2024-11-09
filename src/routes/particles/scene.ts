import * as THREE from "three"
import vertexShader from "./vertexShader.glsl"
import fragmentShader from "./fragmentShader.glsl"
import { GUI } from "lil-gui"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import Stats from "stats.js"
import {
	BloomEffect,
	EffectComposer,
	EffectPass,
	RenderPass,
} from "postprocessing"
import { WaterTexture } from "./WaterTexture"
import WaterEffect from "./WaterEffect"

const options = {
	color: "#00bfff",
	waterSize: 141,
	waterAge: 111,
	bloomHeight: 1024,
	bloomStrength: 1,
	bloomRadius: 0.5,
	distortionIntensity: 2.75,
}

class Particles {
	scene: THREE.Scene = new THREE.Scene()
	camera: THREE.PerspectiveCamera
	renderer: THREE.WebGLRenderer | null = null
	material: THREE.ShaderMaterial | null = null
	geometry: THREE.PlaneGeometry | null = null
	gui: GUI | null = null
	controls: OrbitControls | null = null
	instancedMesh: THREE.InstancedMesh | null = null
	stats: Stats | null = null
	sizes = {
		width: window.innerWidth,
		height: window.innerHeight,
		pixelRatio: window.devicePixelRatio,
	}
	rafId: number | null = null
	displacement: Partial<{
		canvas: HTMLCanvasElement
		context: CanvasRenderingContext2D
		glowImage: HTMLImageElement
		interactivePlane: THREE.Mesh
		raycaster: THREE.Raycaster
		screenCursor: THREE.Vector2
		canvasCursor: THREE.Vector2
		canvasCursorPrevious: THREE.Vector2
		texture: THREE.CanvasTexture
	}> = {}
	textureLoader: THREE.TextureLoader | null = null
	composer: EffectComposer | null = null
	waterTexture: WaterTexture | null = null
	waterEffect: WaterEffect | null = null
	bloomEffect: BloomEffect | null = null
	bloomEffectPass: EffectPass | null = null

	constructor(el: HTMLCanvasElement | null, opt?: { renderToTarget: boolean }) {
		this.camera = new THREE.PerspectiveCamera(
			75,
			window.innerWidth / window.innerHeight,
			0.1,
			100,
		)
		this.camera.position.z = 12
		if (!opt?.renderToTarget && el) {
			this.renderer = new THREE.WebGLRenderer({
				canvas: el,
				powerPreference: "high-performance",
				antialias: false,
				stencil: false,
				depth: false,
			})

			this.renderer.toneMapping = THREE.ReinhardToneMapping
			this.renderer.setClearColor("#050505")
			this.renderer.setSize(window.innerWidth, window.innerHeight)
			this.renderer.setPixelRatio(window.devicePixelRatio)

			this.stats = new Stats()
			this.stats.showPanel(0)
		}
		this.setInitialValues()
		this.animate()

		window.addEventListener("pointermove", this.handlePointerMove.bind(this))

		if (this.renderer) {
			this.addDebug()
			this.controls = new OrbitControls(this.camera, this.renderer.domElement)
			// add controls to the scene
			this.controls.enableDamping = true
			this.controls.dampingFactor = 0.25
			this.controls.enableZoom = true
			this.controls.autoRotate = true
			this.controls.autoRotateSpeed = 0.5
			this.controls.enablePan = true
			window.addEventListener("resize", this.onResize.bind(this))
		}
	}

	handlePointerMove(event: PointerEvent) {
		if (
			!this.displacement.screenCursor ||
			!this.displacement.canvasCursor ||
			!this.displacement.canvasCursorPrevious
		)
			return

		const point = {
			x: event.clientX / this.sizes.width,
			y: event.clientY / this.sizes.height,
		}
		this.displacement.screenCursor.x = point.x
		this.displacement.screenCursor.y = point.y

		if (this.waterTexture) this.waterTexture.addPoint(point)
	}

	setInitialValues() {
		this.displacement = {}

		// create interactive mesh for raycasting
		const geometry = new THREE.PlaneGeometry(32, 20, 1, 1)
		const material = new THREE.MeshBasicMaterial({
			color: new THREE.Color("#fff"),
			side: THREE.DoubleSide,
			visible: false,
		})
		const plane = new THREE.Mesh(geometry, material)
		// this.scene.add(plane);
		this.displacement.interactivePlane = plane

		// Raycaster
		this.displacement.raycaster = new THREE.Raycaster()

		// Coordinates
		this.displacement.screenCursor = new THREE.Vector2(9999, 9999)
		this.displacement.canvasCursor = new THREE.Vector2(9999, 9999)
		this.displacement.canvasCursorPrevious = new THREE.Vector2(9999, 9999)

		// Initial canvas
		this.waterTexture = new WaterTexture({
			size: options.waterSize,
			maxAge: options.waterAge,
		})
		this.displacement.canvas = this.waterTexture?.canvas
		this.displacement.texture = new THREE.CanvasTexture(
			this.displacement.canvas,
		)

		/**
		 * Particles
		 */
		const particlesGeometry = new THREE.PlaneGeometry(32, 20, 200, 200)
		particlesGeometry.setIndex(null)
		particlesGeometry.deleteAttribute("normal")

		const intensitiesArray = new Float32Array(
			particlesGeometry.attributes.position.count,
		)
		const anglesArray = new Float32Array(
			particlesGeometry.attributes.position.count,
		)

		for (let i = 0; i < particlesGeometry.attributes.position.count; i++) {
			intensitiesArray[i] = Math.random()
			anglesArray[i] = Math.random() * Math.PI * 2
		}

		particlesGeometry.setAttribute(
			"aIntensity",
			new THREE.BufferAttribute(intensitiesArray, 1),
		)
		particlesGeometry.setAttribute(
			"aAngle",
			new THREE.BufferAttribute(anglesArray, 1),
		)
		this.textureLoader = new THREE.TextureLoader()
		const texture = this.textureLoader.load("/textures/bg.jpg")

		const particlesMaterial = new THREE.ShaderMaterial({
			vertexShader: vertexShader,
			fragmentShader: fragmentShader,
			uniforms: {
				uResolution: new THREE.Uniform(
					new THREE.Vector2(
						this.sizes.width * this.sizes.pixelRatio,
						this.sizes.height * this.sizes.pixelRatio,
					),
				),
				uPictureTexture: new THREE.Uniform(texture),
				uDisplacementTexture: new THREE.Uniform(this.displacement.texture),
				uTime: { value: 0 },
				uColor: { value: new THREE.Color(options.color) },
			},
			blending: THREE.AdditiveBlending,
		})
		const particles = new THREE.Points(particlesGeometry, particlesMaterial)
		this.scene.add(particles)

		// fit all particles in the screen
		if (window.innerWidth < 768) {
			particles.position.y = 10
		}
		if (this.renderer) {
			this.composer = new EffectComposer(this.renderer)
		}
		const renderPass = new RenderPass(this.scene, this.camera)

		this.waterEffect = new WaterEffect({
			texture: this.displacement.texture,
			distortionIntensity: options.distortionIntensity,
		})
		const waterPass = new EffectPass(this.camera, this.waterEffect)
		this.bloomEffect = new BloomEffect({
			height: options.bloomHeight,
			width: options.bloomHeight,
			intensity: options.bloomStrength,
			radius: options.bloomRadius,
			blendFunction: THREE.AdditiveBlending,
		})

		this.bloomEffect.blendMode.opacity.value = 0.5
		this.bloomEffectPass = new EffectPass(this.camera, this.bloomEffect)
		waterPass.renderToScreen = false
		this.bloomEffectPass.renderToScreen = true
		renderPass.renderToScreen = false

		if (this.composer) {
			this.composer.addPass(renderPass)
			this.composer.addPass(waterPass)
			this.composer.addPass(this.bloomEffectPass)
		}
	}

	damping = 0.1

	onResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight
		this.camera.updateProjectionMatrix()
		this.renderer?.setSize(window.innerWidth, window.innerHeight)
	}

	addDebug() {
		this.gui = new GUI()

		const folderEffect = this.gui.addFolder("Water Effect")

		folderEffect
			.add(options, "waterSize")
			.min(10)
			.max(256)
			.name("Size")
			.onChange(() => {
				if (!this.waterTexture) return
				this.waterTexture.size = options.waterSize
				this.waterTexture.radius = options.waterSize * 0.1
			})

		folderEffect
			.add(options, "waterAge")
			.min(10)
			.max(1000)
			.name("Age")
			.onChange(() => {
				if (!this.waterTexture) return
				this.waterTexture.maxAge = options.waterAge
			})

		const folderPostProcessing = this.gui.addFolder("Post Processing")
		// folderPostProcessing.add(this.waterEffect.uniforms.get('uTexture'), 'value').name('Texture');
		if (this.bloomEffect) {
			folderPostProcessing
				.add(this.bloomEffect.blendMode.opacity, "value")
				.min(0)
				.max(1)
				.name("Bloom Opacity")

			folderPostProcessing
				.add(options, "bloomStrength")
				.min(0)
				.max(100)
				.name("Bloom Strength")
				.onChange(() => {
					if (this.bloomEffect)
						this.bloomEffect.intensity = options.bloomStrength
				})

			folderPostProcessing
				.add(options, "bloomRadius")
				.min(0)
				.max(10)
				.name("Bloom Radius")
				.onChange(() => {
					if (this.bloomEffect)
						this.bloomEffect.distinction = options.bloomRadius
				})
		}
		const distortionIntensity = this.waterEffect?.uniforms.get(
			"uDistortionIntensity",
		)
		folderPostProcessing
			.add(options, "distortionIntensity")
			.min(0)
			.max(10)
			.onChange(() => {
				if (distortionIntensity)
					distortionIntensity.value = options.distortionIntensity
			})
			.name("Distortion Intensity")
	}

	cleanUp() {
		if (this.displacement.canvas && this.displacement.glowImage) {
			this.displacement.canvas.remove()
			this.displacement.glowImage.remove()
		}

		if (this.displacement.interactivePlane)
			this.scene.remove(this.displacement.interactivePlane)
		if (this.instancedMesh) this.scene.remove(this.instancedMesh)

		if (this.displacement.texture) this.displacement.texture.dispose()
		this.renderer?.dispose()

		this.displacement = {}
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		this.renderer = null
	}

	animate() {
		if (this.stats) this.stats.update()

		/**
		 * Raycaster
		 */
		if (this.displacement.raycaster) {
			this.displacement.raycaster.setFromCamera(
				this.displacement.screenCursor!,
				this.camera,
			)
			const intersections = this.displacement.raycaster.intersectObject(
				this.displacement.interactivePlane!,
			)

			if (intersections.length) {
				const uv = intersections[0].uv
				if (!uv) return
				this.displacement.canvasCursor!.x =
					uv.x * this.displacement.canvas!.width
				this.displacement.canvasCursor!.y =
					(1 - uv.y) * this.displacement.canvas!.height
			}
		}

		if (this.material) {
			this.material.uniforms.uTime.value += 0.01
		}
		if (this.waterTexture) {
			this.waterTexture.update()
		}
		if (this.displacement.texture) {
			this.displacement.texture.needsUpdate = true
		}
		if (this.composer) this.composer.render()

		this.rafId = requestAnimationFrame(this.animate.bind(this))
	}

	destroy() {
		if (this.gui) {
			this.gui.destroy()
		}
		window.removeEventListener("resize", this.onResize.bind(this))
		window.removeEventListener("pointermove", this.handlePointerMove)

		this.renderer?.dispose()

		if (this.stats) {
			this.stats.dom.remove()
		}

		if (this.controls) {
			this.controls.dispose()
		}

		this.cleanUp()

		if (this.rafId) cancelAnimationFrame(this.rafId)
	}
}

export default Particles
