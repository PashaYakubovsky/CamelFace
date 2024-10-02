import * as THREE from "three"
import vertexShader from "./vertexShader.glsl"
import fragmentShader from "./fragmentShader.glsl"
import { GUI } from "lil-gui"

const options = {
	Octaves: 4,
	Color: "#ffffff",
	["Lines count"]: 100,
	strength: 0.001,
	radius: 0.001,
	threshold: 0.5,
}

class CardioidScene {
	scene: THREE.Scene
	material: THREE.ShaderMaterial | null = null
	geometry: THREE.PlaneGeometry | null = null
	gui: GUI | null = null

	camera: THREE.PerspectiveCamera
	renderer: THREE.WebGLRenderer | null = null
	rafId: number | null = null

	constructor(el: HTMLCanvasElement | null, opt?: { renderToTarget: boolean }) {
		if (!opt?.renderToTarget && el) {
			this.renderer = new THREE.WebGLRenderer({
				canvas: el,
				powerPreference: "high-performance",
				antialias: true,
			})

			// this.renderer.toneMapping = THREE.ReinhardToneMapping;
			this.renderer.setClearColor("#000000")
			this.renderer.setSize(window.innerWidth, window.innerHeight)
			// this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		}
		this.scene = new THREE.Scene()
		this.camera = new THREE.PerspectiveCamera(
			75,
			window.innerWidth / window.innerHeight,
			0.1,
			1000
		)
		this.camera.position.z = 1
		this.init()
		// this.addPostProcessing();
		if (!opt?.renderToTarget && el) {
			this.addControls()
		}
		window.addEventListener("mousemove", this.onMouseMove.bind(this))
		window.addEventListener("resize", this.onResize.bind(this))
		this.onResize()
		this.animate()
	}

	addControls() {
		this.gui = new GUI()
		if (!this.material) return

		this.gui.add(options, "Octaves", 0, 500).onChange(() => {
			if (!this.material) return
			this.material.uniforms.u_octaves.value = options.Octaves
			this.material.needsUpdate = true
		})

		this.gui.addColor(options, "Color").onChange(() => {
			if (!this.material) return
			this.material.uniforms.u_color.value = new THREE.Color(options.Color)
			this.material.needsUpdate = true
		})

		this.gui.add(options, "Lines count", 0, 1000).onChange(() => {
			if (!this.material) return
			this.material.uniforms.u_count.value = options["Lines count"]
			this.material.needsUpdate = true
		})
	}

	init() {
		this.geometry = new THREE.PlaneGeometry(2, 2, 1, 1)

		this.material = new THREE.ShaderMaterial({
			side: THREE.DoubleSide,
			blendDst: THREE.OneMinusSrcAlphaFactor,
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
			uniforms: {
				u_time: { value: 0 },
				u_resolution: {
					value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1),
				},
				u_mouse: { value: new THREE.Vector4() },
				u_octaves: { value: 4 },
				u_color: { value: new THREE.Color("#ffffff") },
				u_count: { value: 100 },
			},
			vertexShader,
			fragmentShader,
		})

		const mesh = new THREE.Mesh(this.geometry, this.material)

		this.camera.lookAt(mesh.position)

		this.scene.add(mesh)
	}

	onMouseMove(event: MouseEvent) {
		if (this.material) {
			this.material.uniforms.u_mouse.value.x = event.clientX
			this.material.uniforms.u_mouse.value.y = event.clientY
		}
	}

	onResize() {
		if (this.material) {
			this.material.uniforms.u_resolution.value.x = window.innerWidth
			this.material.uniforms.u_resolution.value.y = window.innerHeight
		}

		this.camera.aspect = window.innerWidth / window.innerHeight
		this.camera.updateProjectionMatrix()

		this.renderer?.setSize(window.innerWidth, window.innerHeight)
	}

	animate() {
		this.rafId = requestAnimationFrame(this.animate.bind(this))
		if (this.material) {
			this.material.uniforms.u_time.value += 0.006
		}
		if (this.renderer) this.renderer.render(this.scene, this.camera)
	}

	destroy() {
		window.removeEventListener("mousemove", this.onMouseMove)
		window.removeEventListener("resize", this.onResize)
		this.gui?.destroy()
		this.scene.traverse((object) => {
			if (object instanceof THREE.Mesh) {
				object.geometry.dispose()
				object.material.dispose()
			}
		})
		this.renderer?.dispose()
		if (this.rafId) cancelAnimationFrame(this.rafId)
	}
}

export default CardioidScene
