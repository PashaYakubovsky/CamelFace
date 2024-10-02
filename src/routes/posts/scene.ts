import * as THREE from "three"
import bgVertexShader from "../fbm/vertexShader.glsl"
import bgFragmentShader from "../fbm/fragmentShader.glsl"
import fragmentShader from "./fragmentShader.glsl"
import vertexShader from "./vertexShader.glsl"

class Scene {
	private scene: THREE.Scene = new THREE.Scene()
	public camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
		75,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	)
	public renderer: THREE.WebGLRenderer | null = null
	private bgMaterial: THREE.ShaderMaterial | null = null
	private material: THREE.ShaderMaterial | null = null
	private geometry: THREE.PlaneGeometry | null = null
	private sphere: THREE.Mesh | null = null

	constructor(el: HTMLCanvasElement) {
		this.camera.position.z = 1
		this.renderer = new THREE.WebGLRenderer({
			canvas: el,
			powerPreference: "high-performance",
			antialias: true,
		})
		this.renderer.setClearColor("#000000")
		this.renderer.setSize(window.innerWidth, window.innerHeight)

		this.init()
		this.animate()

		window.addEventListener("mousemove", this.onMouseMove.bind(this))
		window.addEventListener("resize", this.onResize.bind(this))
	}

	public init() {
		// width and height 100% of the screen
		this.geometry = new THREE.PlaneGeometry(5, 5, 32, 32)
		// make geometry responsive
		this.geometry.scale(1.5, 1.5, 1.5)

		this.bgMaterial = new THREE.ShaderMaterial({
			side: THREE.DoubleSide,
			uniforms: {
				u_time: { value: 0 },
				u_resolution: {
					value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1),
				},
				u_mouse: { value: new THREE.Vector4() },
			},
			vertexShader: bgVertexShader,
			fragmentShader: bgFragmentShader,
		})

		const mesh = new THREE.Mesh(this.geometry, this.bgMaterial)

		mesh.position.x = 0
		mesh.position.y = 0
		mesh.position.z = 0

		this.scene.add(mesh)

		const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
		this.scene.add(ambientLight)

		const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7)
		directionalLight.position.set(1, 1, 1)
		this.scene.add(directionalLight)

		const sphere = new THREE.SphereGeometry(0.5, 32, 32)
		this.material = new THREE.ShaderMaterial({
			vertexShader,
			fragmentShader,
			uniforms: { time: { value: 0 } },
		})
		this.sphere = new THREE.Mesh(sphere, this.material)
		this.scene.add(this.sphere)
	}

	onMouseMove(event: MouseEvent) {
		if (this.bgMaterial) {
			this.bgMaterial.uniforms.u_mouse.value.x = event.clientX
			this.bgMaterial.uniforms.u_mouse.value.y = event.clientY
		}
	}

	onResize() {
		if (this.bgMaterial) {
			this.bgMaterial.uniforms.u_resolution.value.x = window.innerWidth
			this.bgMaterial.uniforms.u_resolution.value.y = window.innerHeight
		}

		this.camera.aspect = window.innerWidth / window.innerHeight
		this.camera.updateProjectionMatrix()

		this.renderer?.setSize(window.innerWidth, window.innerHeight)
	}

	public animate() {
		requestAnimationFrame(this.animate.bind(this))
		if (this.bgMaterial) {
			this.bgMaterial.uniforms.u_time.value += 0.01
		}
		if (this.material) {
			this.material.uniforms.time.value += 0.01
		}
		if (this.sphere) {
			this.sphere.rotation.x += 0.01
			this.sphere.rotation.y += 0.01
			this.sphere.position.z -= Math.sin(this.sphere.rotation.x) * 0.001
		}
		if (this.renderer) this.renderer.render(this.scene, this.camera)
	}
}

export default Scene
