import { gsap } from "$gsap"
import GUI from "lil-gui"
import * as THREE from "three"
import vertexShader from "./vertexShader.glsl"
import fragmentShader from "./fragmentShader.glsl"

class ParticlesScene {
	renderer: THREE.WebGLRenderer | undefined
	scene: THREE.Scene
	camera: THREE.PerspectiveCamera
	raycaster: THREE.Raycaster
	mouse: THREE.Vector2
	particles: THREE.Points | undefined
	geometry: THREE.BufferGeometry
	material: THREE.ShaderMaterial | undefined
	count: number
	positions: Float32Array
	colors: Float32Array
	sizes: Float32Array
	rafId: number | null = null
	gui: GUI | undefined
	group: THREE.Group | undefined
	audio: HTMLAudioElement | undefined
	params: {
		count: number
		size: number
		radius: number
		branches: number
		spin: number
		randomness: number
		randomnessPower: number
		insideColor: string
		outsideColor: string
	}
	time = 0

	constructor(
		canvasElement: HTMLCanvasElement | null,
		opt?: { renderToTarget: boolean },
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
			this.renderer.setClearColor(0x000000, 0)
			this.renderer.outputColorSpace = THREE.SRGBColorSpace
			this.renderer.toneMapping = THREE.ACESFilmicToneMapping
			this.renderer.toneMappingExposure = 1
			this.renderer.shadowMap.enabled = true
			this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
		}
		this.scene = new THREE.Scene()

		this.camera = new THREE.PerspectiveCamera(
			75,
			window.innerWidth / window.innerHeight,
			0.1,
			1000,
		)
		this.camera.position.set(0, -4, 10)

		this.raycaster = new THREE.Raycaster()
		this.mouse = new THREE.Vector2()

		this.params = {
			count: 100000,
			size: 0.04,
			radius: 10,
			branches: 12,
			spin: 1,
			randomness: 0.1,
			randomnessPower: 1,
			insideColor: "#ff6030",
			outsideColor: "#1b3984",
		}

		this.geometry = new THREE.BufferGeometry()
		this.count = this.params.count
		this.positions = new Float32Array(this.count * 3)
		this.colors = new Float32Array(this.count * 3)
		this.sizes = new Float32Array(this.count)

		this.calculateGeometry()

		this.material = new THREE.ShaderMaterial({
			vertexShader,
			fragmentShader,
			uniforms: {
				uTime: { value: 0 },
				uSize: { value: 0.5 },
				uMouse: { value: new THREE.Vector2() },
				aSize: { value: 0 },
				uColor1: { value: new THREE.Color("pink") },
				uColor2: { value: new THREE.Color("white") },
				uColor3: { value: new THREE.Color("blue") },
				uTexture: {
					value: new THREE.TextureLoader().load("/textures/particle2.jpeg"),
				},
				uResolution: {
					value: new THREE.Vector2(window.innerWidth, window.innerHeight),
				},
			},

			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
			vertexColors: true,
		})

		this.particles = new THREE.Points(this.geometry, this.material)

		this.group = new THREE.Group()
		this.group.add(this.particles)
		this.group.rotation.set(1, 0, 0)
		this.group.position.set(-0.5, -2, 0)
		this.scene.add(this.group)

		if (this.renderer) {
			window.addEventListener("resize", this.onWindowResize.bind(this), false)
			window.addEventListener("mousemove", this.onMouseMove.bind(this), false)
			this.addDebug()
		}
		this.animate()

		this.audio = new Audio()
		this.audio.src = "/sounds/galaxy.mp3"
	}

	addDebug() {
		this.gui = new GUI()
		this.gui
			.add(this.params, "count")
			.min(100)
			.max(1000000)
			.step(100)
			.onFinishChange(this.calculateGeometry.bind(this))
		this.gui
			.add(this.params, "size")
			.min(0.001)
			.max(0.1)
			.step(0.001)
			.onFinishChange(this.calculateGeometry.bind(this))
		this.gui
			.add(this.params, "radius")
			.min(1)
			.max(20)
			.step(0.1)
			.onFinishChange(this.calculateGeometry.bind(this))
		this.gui
			.add(this.params, "branches")
			.min(2)
			.max(20)
			.step(1)
			.onFinishChange(this.calculateGeometry.bind(this))
		this.gui
			.add(this.params, "spin")
			.min(-5)
			.max(5)
			.step(0.001)
			.onFinishChange(this.calculateGeometry.bind(this))
		this.gui
			.add(this.params, "randomness")
			.min(0)
			.max(2)
			.step(0.001)
			.onFinishChange(this.calculateGeometry.bind(this))
	}

	calculateGeometry(): void {
		const insideColor = new THREE.Color(this.params.insideColor)
		const outsideColor = new THREE.Color(this.params.outsideColor)

		for (let i = 0; i < this.count; i++) {
			const i3 = i * 3

			// Position
			const radius = Math.random() * this.params.radius
			const spinAngle = radius * this.params.spin
			const branchAngle =
				((i % this.params.branches) / this.params.branches) * Math.PI * 2

			const randomX =
				Math.pow(Math.random(), this.params.randomnessPower) *
				(Math.random() < 0.5 ? 1 : -1) *
				this.params.randomness *
				radius
			const randomY =
				Math.pow(Math.random(), this.params.randomnessPower) *
				(Math.random() < 0.5 ? 1 : -1) *
				this.params.randomness *
				radius
			const randomZ =
				Math.pow(Math.random(), this.params.randomnessPower) *
				(Math.random() < 0.5 ? 1 : -1) *
				this.params.randomness *
				radius

			this.positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX
			this.positions[i3 + 1] = randomY
			this.positions[i3 + 2] =
				Math.sin(branchAngle + spinAngle) * radius + randomZ

			// Color
			const mixedColor = insideColor.clone()
			mixedColor.lerp(outsideColor, radius / this.params.radius)

			this.colors[i3] = mixedColor.r
			this.colors[i3 + 1] = mixedColor.g
			this.colors[i3 + 2] = mixedColor.b

			// Sizes
			this.sizes[i] = this.params.size

			this.geometry.setAttribute(
				"position",
				new THREE.BufferAttribute(this.positions, 3),
			)
			this.geometry.setAttribute(
				"color",
				new THREE.BufferAttribute(this.colors, 3),
			)
			this.geometry.setAttribute(
				"aSize",
				new THREE.BufferAttribute(this.sizes, 1),
			)

			const randoms = new Float32Array(this.params.randomness / 3)
			const colorRandom = new Float32Array(this.params.randomness / 3)

			this.geometry.setAttribute(
				"aRandom",
				new THREE.BufferAttribute(randoms, 1),
			)
			this.geometry.setAttribute(
				"aColorRandom",
				new THREE.BufferAttribute(colorRandom, 1),
			)
		}

		// need update for shader
		this.geometry.attributes.position.needsUpdate = true
	}

	onWindowResize(): void {
		this.camera.aspect = window.innerWidth / window.innerHeight
		this.camera.updateProjectionMatrix()
		if (this.renderer)
			this.renderer.setSize(window.innerWidth, window.innerHeight)
	}

	onMouseMove(event: MouseEvent): void {
		this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
		this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

		if (this.material) this.material.uniforms.uMouse.value = this.mouse

		this.raycaster.setFromCamera(this.mouse, this.camera)
	}

	fadeOut(instance: ParticlesScene): void {
		const tl = gsap.timeline()

		if (window.location.hostname !== "localhost") {
			this.audio?.play()
		}

		tl.to(
			this.camera.position,
			{
				duration: 3,
				z: 10,
				ease: "power0",
			},
			"start",
		)
		tl.to(
			this.camera.position,
			{
				duration: 3,
				x: -0.5,
				y: -2,
				z: 0,
				ease: "power2.inOut",
			},
			"end",
		)
		if (instance.group) {
			tl.to(
				instance.group.rotation,
				{
					duration: 6,
					x: 5,
					y: 10,
					z: 0,
					ease: "power0",
				},
				"start",
			)
		}

		if (instance.material) {
			// animate color
			tl.to(
				instance.material.uniforms.uColor1.value,
				{
					duration: 6,
					r: 0,
					g: 0,
					b: 0.1,
					ease: "power0",
				},
				"start",
			)
			tl.to(
				instance.material.uniforms.uColor1.value,
				{
					duration: 6,
					r: 0.2,
					g: 0.2,
					b: 0.4,
					ease: "power0",
				},
				"start",
			)
			tl.to(
				instance.material.uniforms.uColor1.value,
				{
					duration: 6,
					r: 0.2,
					g: 0,
					b: 1,
					ease: "power0",
				},
				"start",
			)
		}

		setTimeout(() => {
			this.audio?.pause()
		}, 5000)

		window.removeEventListener("resize", this.onWindowResize, false)
		window.removeEventListener("mousemove", this.onMouseMove, false)
	}

	animate(): void {
		if (this.renderer) this.renderer.render(this.scene, this.camera)

		this.time += 0.01
		if (this.material) {
			this.material.uniforms.uTime.value += this.time
			this.material.uniforms.uMouse.value = this.mouse
		}

		if (this.particles) {
			this.particles.rotation.y += 0.001
		}

		this.rafId = requestAnimationFrame(() => this.animate())
	}

	destroy(): void {
		if (this.audio) this.audio.pause()
		if (this.renderer) this.renderer.dispose()
		this.scene.clear()
		this.gui?.destroy()

		if (this.rafId) cancelAnimationFrame(this.rafId)
	}
}

export default ParticlesScene
