import * as THREE from "./three.webgpu"
// import { OrbitControls } from "three/addons/controls/OrbitControls.js"
// import { TransformControls } from "three/addons/controls/TransformControls.js"
import {
	float,
	If,
	PI,
	color,
	cos,
	instanceIndex,
	Loop,
	mix,
	mod,
	sin,
	storage,
	Fn,
	uint,
	uniform,
	uniformArray,
	hash,
	vec3,
	vec4,
	negate,
} from "./three.webgpu"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import GUI from "lil-gui"
import Stats from "three/examples/jsm/libs/stats.module.js"
import gsap from "gsap"
import { Pane } from "tweakpane"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
class GalaxySketch {
	renderer: THREE.WebGPURenderer | undefined
	scene: THREE.Scene
	camera: THREE.PerspectiveCamera
	raycaster: THREE.Raycaster
	mouse: THREE.Vector2
	particles: THREE.Points | undefined
	material: THREE.ShaderMaterial | undefined
	rafId: number | null = null
	group: THREE.Group | undefined
	audio: HTMLAudioElement | undefined
	time = 0
	attractors: any[] | undefined
	controls: OrbitControls | undefined
	geometry: THREE.BufferGeometry
	positions: Float32Array
	colors: Float32Array
	sizes: Float32Array
	stats: Stats | undefined

	gltfLoader: GLTFLoader
	dracoLoader: DRACOLoader
	updateCompute: any

	constructor(
		canvasElement: HTMLCanvasElement | null,
		opt?: { renderToTarget: boolean },
	) {
		this.scene = new THREE.Scene()

		this.camera = new THREE.PerspectiveCamera(
			25,
			window.innerWidth / window.innerHeight,
			0.1,
			400,
		)
		this.camera.position.set(3, 5, 8)

		// ambient light

		const ambientLight = new THREE.AmbientLight("#ffffff", 0.5)
		this.scene.add(ambientLight)

		// Loaders
		// this.dracoLoader = new DRACOLoader()
		// this.dracoLoader.setDecoderPath("./draco/")
		// this.gltfLoader = new GLTFLoader()
		// this.gltfLoader.setDRACOLoader(this.dracoLoader)

		// stats
		this.stats = new Stats()
		document.body.appendChild(this.stats.dom)

		// directional light

		const directionalLight = new THREE.DirectionalLight("#ffffff", 1.5)
		directionalLight.position.set(4, 2, 0)
		this.scene.add(directionalLight)

		// renderer
		if (!opt?.renderToTarget && canvasElement) {
			this.renderer = new THREE.WebGPURenderer({
				antialias: true,
				canvas: canvasElement,
				powerPreference: "high-performance",
			})
			this.renderer.setPixelRatio(window.devicePixelRatio)
			this.renderer.setSize(window.innerWidth, window.innerHeight)
			this.renderer.setClearColor(new THREE.Color("#000"))

			this.controls = new OrbitControls(this.camera, this.renderer.domElement)
			this.controls.enableDamping = true
			this.controls.minDistance = 0.1
			this.controls.maxDistance = 90

			this.mouse = new THREE.Vector2()
		}

		this.initOptions()
		this.initObjects()

		if (this.renderer) {
			window.addEventListener("resize", this.onWindowResize.bind(this), false)
			window.addEventListener("mousemove", this.onMouseMove.bind(this), false)
		}

		gsap.ticker.add(this.animate.bind(this))
		gsap.ticker.fps(60)

		this.audio = new Audio()
		this.audio.src = "/galaxy.mp3"
	}

	gui: Pane | undefined
	options = {
		armRadius: 3.75,
		armSpeed: 1.2,
		attractorMass: 500000,
		particleGlobalMass: 391304,
		timeScale: 3.9,
		spinningStrength: 1.9,
		maxSpeed: 13,
		gravityConstant: 1.7e-12,
		velocityDamping: 0.1,
		scale: 0.066,
		boundHalfExtent: 150,
		particleCount: 512,
	}

	initOptions(): void {
		this.options.armRadius = parseFloat(
			localStorage.getItem("galaxy-armRadius") || this.options.armRadius,
		)
		this.options.armSpeed = parseFloat(
			localStorage.getItem("galaxy-armSpeed") || this.options.armSpeed,
		)
		this.options.attractorMass = parseFloat(
			localStorage.getItem("galaxy-attractorMass") ||
				this.options.attractorMass,
		)
		this.options.timeScale = parseFloat(
			localStorage.getItem("galaxy-timeScale") || this.options.timeScale,
		)
		this.options.spinningStrength = parseFloat(
			localStorage.getItem("galaxy-spinningStrength") ||
				this.options.spinningStrength,
		)
		this.options.maxSpeed = parseFloat(
			localStorage.getItem("galaxy-maxSpeed") || this.options.maxSpeed,
		)
		this.options.gravityConstant = parseFloat(
			localStorage.getItem("galaxy-gravityConstant") || "1.67e-11",
		)
		this.options.velocityDamping = parseFloat(
			localStorage.getItem("galaxy-velocityDamping") ||
				this.options.velocityDamping,
		)
		this.options.scale = parseFloat(
			localStorage.getItem("galaxy-scale") || this.options.scale,
		)
		this.options.boundHalfExtent = parseFloat(
			localStorage.getItem("galaxy-boundHalfExtent") ||
				this.options.boundHalfExtent,
		)
		this.options.particleGlobalMass = parseFloat(
			localStorage.getItem("galaxy-particleGlobalMass") ||
				this.options.particleGlobalMass,
		)
		this.options.particleCount = parseFloat(
			localStorage.getItem("galaxy-particleCount") ||
				this.options.particleCount,
		)
	}

	addDebugGUI(): void {
		if (this.gui) this.gui.dispose()

		this.gui = new Pane({
			title: "Galaxy",
			expanded: true,
		})
		this.gui.element.parentElement.style.zIndex = "100"

		const saveToLs = (key: string, value: any) => {
			localStorage.setItem(key, JSON.stringify(value))
		}

		const folder = this.gui.addFolder({
			title: "Galaxy options",
		})

		folder
			.addBinding(this.options, "armRadius", { min: 0, max: 5 })
			.on("change", ({ value }) => {
				this.options.armRadius = value
				saveToLs("galaxy-armRadius", value)
			}).label = "Arm radius"
		folder
			.addBinding(this.options, "armSpeed", { min: 0, max: 10 })
			.on("change", ({ value }) => {
				this.options.armSpeed = value
				saveToLs("galaxy-armSpeed", value)
			}).label = "Arm speed"
		folder
			.addBinding(this.options, "attractorMass", { min: 0, min: 1e9 })
			.on("change", ({ value }) => {
				this.attractorMass.value = value
				saveToLs("galaxy-attractorMass", value)
			}).label = "Attractor mass"
		folder
			.addBinding(this.options, "timeScale", { min: 0, max: 5 })
			.on("change", ({ value }) => {
				this.timeScale.value = value
				saveToLs("galaxy-timeScale", value)
			}).label = "Time scale"
		folder
			.addBinding(this.options, "spinningStrength", { min: 0, max: 5 })
			.on("change", ({ value }) => {
				this.spinningStrength.value = value
				saveToLs("galaxy-spinningStrength", value)
			}).label = "Spinning strength"
		folder
			.addBinding(this.options, "maxSpeed", { min: 0, max: 20 })
			.on("change", ({ value }) => {
				this.maxSpeed.value = value
				saveToLs("galaxy-maxSpeed", value)
			}).label = "Max speed"
		folder
			.addBinding(this.options, "gravityConstant", { min: 0, max: 1e-10 })
			.on("change", ({ value }) => {
				this.gravityConstant = value
				saveToLs("galaxy-gravityConstant", value)
			}).label = "Gravity constant"
		folder
			.addBinding(this.options, "velocityDamping", { min: 0, max: 1 })
			.on("change", ({ value }) => {
				this.velocityDamping.value = value
				saveToLs("galaxy-velocityDamping", value)
			}).label = "Velocity damping"
		folder
			.addBinding(this.options, "scale", { min: 0.001, max: 0.3 })
			.on("change", ({ value }) => {
				this.scale.value = value
				saveToLs("galaxy-scale", value)
			}).label = "Scale"
		folder
			.addBinding(this.options, "boundHalfExtent", { min: 10, max: 300 })
			.on("change", ({ value }) => {
				this.boundHalfExtent.value = value
				saveToLs("galaxy-boundHalfExtent", value)
			}).label = "Bound half extent"
		folder
			.addBinding(this.options, "particleGlobalMass", { min: 1, max: 1e6 })
			.on("change", ({ value }) => {
				this.particleGlobalMass.value = value
				saveToLs("galaxy-particleGlobalMass", value)
			}).label = "Particle global mass"
		folder
			.addBinding(this.options, "particleCount", { min: 24, max: 1024 })
			.on("change", ({ value }) => {
				this.options.particleCount = value
				saveToLs("galaxy-particleCount", value)
			}).label = "Particle count (requires reload)"

		// add reset button
		this.gui
			.addButton({
				title: "Reset",
			})
			.on("click", () => {
				// reset all values
				this.initOptions()

				this.scene.clear()

				this.initObjects()
			})
	}

	initObjects() {
		// load spacemap
		this.textureLoader = new THREE.TextureLoader()
		this.textureLoader.load("/spacemap2.png", (texture) => {
			texture.wrapS = THREE.RepeatWrapping
			texture.wrapT = THREE.RepeatWrapping
			texture.anisotropy = 16
			texture.encoding = THREE.SRGBColorSpace
			texture.mapping = THREE.EquirectangularRefractionMapping
			texture.repeat.set(1, 1)
			texture.magFilter = THREE.LinearFilter
			texture.minFilter = THREE.LinearFilter
			texture.needsUpdate = true

			const material = new THREE.MeshBasicMaterial({
				map: texture,
				side: THREE.DoubleSide,
			})

			const geometry = new THREE.SphereGeometry(100, 64, 64)
			const sphere = new THREE.Mesh(geometry, material)
			this.scene.add(sphere)
		})

		// attractors for spiral galaxy shape
		const attractorsPositions = uniformArray([
			new THREE.Vector3(0, 0, 0), // Central black hole
			new THREE.Vector3(2, -0.2, 0), // Outer spiral arm attractor
			new THREE.Vector3(-2, 0.2, 0), // Second spiral arm attractor
		])
		const attractorsRotationAxes = uniformArray([
			new THREE.Vector3(0, 1, 0), // Central rotation
			new THREE.Vector3(0, 1, 0.2), // Spiral arm 1
			new THREE.Vector3(0, 1, -0.2), // Spiral arm 2
		])

		this.attractorsPositions = attractorsPositions

		const attractorsLength = uniform(attractorsPositions.array.length)

		const attractors = []
		for (let i = 0; i < attractorsPositions.array.length; i++) {
			const attractor = {} as {
				position: THREE.Vector3
				orientation: THREE.Vector3
				reference: THREE.Object3D
				// controls: TransformControls
			}
			attractor.position = attractorsPositions.array[i]
			attractor.orientation = attractorsRotationAxes.array[i]
			attractor.reference = new THREE.Object3D()
			attractor.reference.position.copy(attractor.position)
			attractor.reference.quaternion.setFromUnitVectors(
				new THREE.Vector3(0, 1, 0),
				attractor.orientation,
			)
			this.scene.add(attractor.reference)

			// attractor.controls = new TransformControls(
			// 	this.camera,
			// 	this.renderer.domElement,
			// )
			// attractor.controls.mode = "rotate"
			// attractor.controls.size = 0.5
			// attractor.controls.attach(attractor.reference)
			// attractor.controls.visible = true
			// attractor.controls.enabled = attractor.controls.visible

			// this.scene.add(attractor.controls.parent)

			attractors.push(attractor)
		}

		this.attractors = attractors

		// particles

		const count = this.options.particleCount ** 2
		const material = new THREE.SpriteNodeMaterial({
			transparent: true,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
			depthTest: true,
			sizeAttenuation: true,
		})

		//  physics parameters
		this.attractorMass = uniform(this.options.attractorMass)
		this.particleGlobalMass = uniform(this.options.particleGlobalMass)
		this.timeScale = uniform(this.options.timeScale)
		this.spinningStrength = uniform(this.options.spinningStrength)
		this.maxSpeed = uniform(this.options.maxSpeed)
		this.gravityConstant = this.options.gravityConstant
		this.velocityDamping = uniform(this.options.velocityDamping)
		this.scale = uniform(this.options.scale)
		this.boundHalfExtent = uniform(this.options.boundHalfExtent)

		const colorCore = uniform(color("#6495ED")) // Brighter blue core
		const colorArms = uniform(color("#ff6b3d"))
		const colorStars = uniform(color("#ffffff"))
		const colorHot = uniform(color("#ff1a1a")) // Hot particles near black hole

		this.positionBuffer = storage(
			new THREE.StorageInstancedBufferAttribute(count, 3),
			"vec3",
			count,
		)
		this.velocityBuffer = storage(
			new THREE.StorageInstancedBufferAttribute(count, 3),
			"vec3",
			count,
		)

		// init gpgpu initialization for disk-like distribution
		const init = Fn(() => {
			const position = this.positionBuffer.element(instanceIndex)
			const velocity = this.velocityBuffer.element(instanceIndex)

			// Disk-like initial distribution
			const radius = hash(
				instanceIndex.add(uint(Math.random() * 0xffffff)),
			).mul(10) // Larger initial radius
			const angle = hash(instanceIndex.add(uint(Math.random() * 0xffffff))).mul(
				PI.mul(2),
			)
			const height = hash(instanceIndex.add(uint(Math.random() * 0xffffff)))
				.sub(0.5)
				.mul(1.5) // Flatter distribution

			const basePosition = vec3(
				cos(angle).mul(radius),
				height,
				sin(angle).mul(radius),
			)
			position.assign(basePosition)

			// Calculate orbital velocity (sqrt(GM/r) for circular orbit)
			const orbitSpeed = radius.sqrt().mul(1.5)

			// Set initial orbital velocity (perpendicular to radius)
			velocity.assign(
				vec3(
					sin(angle).mul(negate(orbitSpeed)),
					float(0),
					cos(angle).mul(orbitSpeed),
				),
			)
		})
		init.bind(this)

		const initCompute = init().compute(count)

		const reset = () => {
			this.renderer.computeAsync(initCompute)
		}

		reset()

		// update compute
		const particleMassMultiplier = hash(
			instanceIndex.add(uint(Math.random() * 0xffffff)),
		)
			.remap(0.25, 1)
			.toVar()

		// Update compute shader
		const update = Fn(() => {
			const delta = float(1 / 60)
				.mul(this.timeScale)
				.toVar()
			const position = this.positionBuffer.element(instanceIndex)
			const velocity = this.velocityBuffer.element(instanceIndex)

			// Calculate forces
			const force = vec3(0).toVar()

			Loop(attractorsLength, ({ i }) => {
				const attractorPosition = attractorsPositions.element(i)
				const attractorRotationAxis = attractorsRotationAxes.element(i)
				const toAttractor = attractorPosition.sub(position)

				const distance = toAttractor.length().max(0.1) // Prevent division by zero
				const direction = toAttractor.div(distance)

				// Gravity force
				const gravityStrength = this.attractorMass
					.mul(this.particleGlobalMass)
					.mul(this.gravityConstant)
					.div(distance.pow(2))
					.toVar()

				force.addAssign(direction.mul(gravityStrength))

				// Spinning force
				const spinningForce = attractorRotationAxis
					.mul(gravityStrength)
					.mul(this.spinningStrength)
				force.addAssign(spinningForce.cross(toAttractor))
			})

			// Update velocity
			velocity.addAssign(force.mul(delta))

			// Limit speed
			const speed = velocity.length()
			If(speed.greaterThan(this.maxSpeed), () => {
				velocity.assign(velocity.normalize().mul(this.maxSpeed))
			})

			// Apply damping
			velocity.mulAssign(this.velocityDamping.oneMinus())

			// Update position
			position.addAssign(velocity.mul(delta))

			// Prevent particles from stucking at the attractors
			Loop(attractorsLength, ({ i }) => {
				const attractorPosition = attractorsPositions.element(i)
				const toAttractor = attractorPosition.sub(position)
				const distance = toAttractor.length().max(0.1)
				const direction = toAttractor.div(distance)

				// If particle is too close to attractor, move it away
				If(distance.lessThan(0.3), () => {
					position.addAssign(direction.mul(10.5))
				})
			})

			// Wrap around bounds
			const halfHalfExtent = this.boundHalfExtent.div(2).toVar()
			position.assign(
				mod(position.add(halfHalfExtent), this.boundHalfExtent).sub(
					halfHalfExtent,
				),
			)
		})

		this.updateCompute = update().compute(count)

		// nodes

		material.positionNode = this.positionBuffer.toAttribute()

		//  color mixing
		material.colorNode = Fn(() => {
			const velocity = this.velocityBuffer.toAttribute()
			const speed = velocity.length()
			const position = this.positionBuffer.toAttribute()
			const distanceFromCenter = position.length()

			const speedMix = speed.div(this.maxSpeed).smoothstep(0, 0.5)
			const distanceMix = distanceFromCenter.div(10).smoothstep(0, 1)

			// Mix between core, arm, and hot colors based on distance and speed
			const baseColor = mix(colorCore, colorArms, distanceMix)
			const finalColor = mix(baseColor, colorHot, speedMix.mul(0.3))

			// Fade out particles at the edges
			const alpha = this.boundHalfExtent
				.sub(distanceFromCenter)
				.div(this.boundHalfExtent)
				.smoothstep(0, 0.9)

			return vec4(finalColor, alpha)
		})()
		material.scaleNode = particleMassMultiplier.mul(this.scale)

		// mesh
		const geometry = new THREE.PlaneGeometry(1, 1)
		const mesh = new THREE.InstancedMesh(geometry, material, count)
		this.scene.add(mesh)

		this.addDebugGUI()
	}

	onWindowResize(): void {
		this.camera.aspect = window.innerWidth / window.innerHeight
		this.camera.updateProjectionMatrix()
		if (this.renderer)
			this.renderer.setSize(window.innerWidth, window.innerHeight)
	}

	onMouseMove(event: MouseEvent): void {
		// this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
		// this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
	}

	animate(): void {
		this.time += 0.01

		if (this.attractorsPositions) {
			// Rotate spiral arm attractors

			// Central attractor stays at origin
			this.attractorsPositions.array[0].set(0, 0, 0)

			// Update spiral arm positions
			this.attractorsPositions.array[1].x =
				Math.cos(this.time * this.options.armSpeed) * this.options.armRadius
			this.attractorsPositions.array[1].z =
				Math.sin(this.time * this.options.armSpeed) * this.options.armRadius

			this.attractorsPositions.array[2].x =
				Math.cos(this.time * this.options.armSpeed + Math.PI) *
				this.options.armRadius
			this.attractorsPositions.array[2].z =
				Math.sin(this.time * this.options.armSpeed + Math.PI) *
				this.options.armRadius

			// Smooth camera movement
			const cameraRadius = 25
			const cameraHeight = 15
			const cameraSpeed = 0.1

			this.camera.position.x = Math.cos(this.time * cameraSpeed) * cameraRadius
			this.camera.position.z = Math.sin(this.time * cameraSpeed) * cameraRadius
			this.camera.position.y = cameraHeight

			this.camera.lookAt(0, 0, 0)
		}

		if (this.stats) this.stats.update()

		if (this.renderer) {
			this.renderer.computeAsync(this.updateCompute)
			this.renderer.renderAsync(this.scene, this.camera)
		}
	}

	destroy(): void {
		if (this.audio) this.audio.pause()
		if (this.renderer) this.renderer.dispose()
		this.scene.clear()
		if (this.gui) this.gui.dispose
	}
}

export default GalaxySketch
