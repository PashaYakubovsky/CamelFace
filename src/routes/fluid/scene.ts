import * as THREE from "three"
import vs from "./shaders/vs.glsl"
import fs from "./shaders/fs.glsl"

class FluidSimulationParent {
	renderer: THREE.WebGLRenderer
	scene: THREE.Scene
	camera: THREE.PerspectiveCamera
	geometry!: THREE.PlaneGeometry
	material!: THREE.ShaderMaterial
	canvas: HTMLCanvasElement
	raf!: number
	mouse = new THREE.Vector2()
	frustumSize = 1
	aspectRatio = 1

	constructor(canvasElement: HTMLCanvasElement) {
		this.canvas = canvasElement
		this.renderer = new THREE.WebGLRenderer({
			canvas: this.canvas,
			antialias: true,
			powerPreference: "high-performance",
		})
		this.renderer.setSize(window.innerWidth, window.innerHeight)
		document.body.appendChild(this.renderer.domElement)

		this.scene = new THREE.Scene()
		//this.camera = new THREE.PerspectiveCamera(
		//	75,
		//	window.innerWidth / window.innerHeight,
		//	0.1,
		//	1000
		//);
		//this.camera.position.z = 1;
		//
		// Orthographic camera
		this.aspectRatio = window.innerWidth / window.innerHeight
		const zoom = 1
		this.camera = new THREE.OrthographicCamera(
			-zoom * this.aspectRatio,
			zoom * this.aspectRatio,
			zoom,
			-zoom,
			1,
			1000
		)

		//this.frustumSize = 1;
		//this.camera = new THREE.OrthographicCamera(
		//	(this.frustumSize * this.aspectRatio) / -2,
		//	(this.frustumSize * this.aspectRatio) / 2,
		//	this.frustumSize / 2,
		//	this.frustumSize / -2,
		//	0.1,
		//	100
		//);
		// Setup
		this.setup()
		this.render()
		this.resize()

		// Event listeners
		window.addEventListener("resize", this.resize.bind(this))
		this.canvas.addEventListener("mousemove", this.onMouseMove.bind(this))
	}

	resize() {
		this.renderer.setSize(window.innerWidth, window.innerHeight)
		this.camera.aspect = window.innerWidth / window.innerHeight
		this.camera.updateProjectionMatrix()

		if (this.material) {
			this.material.uniforms.uResolution.value = new THREE.Vector2(
				window.innerWidth,
				window.innerHeight
			)
		}
	}

	setup() {
		this.geometry = new THREE.PlaneGeometry(10, 10, 32, 32)
		this.material = new THREE.ShaderMaterial({
			uniforms: {
				uTime: { value: 0.0 },
				uResolution: {
					value: new THREE.Vector2(window.innerWidth, window.innerHeight),
				},
				uMouse: { value: this.mouse },
			},
			fragmentShader: fs,
			vertexShader: vs,
			side: THREE.DoubleSide,
		})

		const plane = new THREE.Mesh(this.geometry, this.material)

		plane.position.z = 0
		this.scene.add(plane)
	}

	tick() {
		this.material.uniforms.uTime.value += 0.01
	}

	render() {
		this.renderer.render(this.scene, this.camera)

		this.tick()

		this.raf = requestAnimationFrame(() => this.render())
	}

	onMouseMove(event: MouseEvent) {
		const x = event.clientX / window.innerWidth
		const y = event.clientY / window.innerHeight

		this.mouse.x = x
		this.mouse.y = y

		console.log("[x, y]", this.mouse)

		if (this.material) {
			this.material.uniforms.uMouse.value = this.mouse
		}
	}
}

export default FluidSimulationParent
