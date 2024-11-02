import * as THREE from "three"
import vertexShader from "./vertexShader.glsl"
import fragmentShader from "./fragmentShader.glsl"
import { GUI } from "lil-gui"
import gsap from "$gsap"

const options = {
	Color: "#8fe9ff",
	["Scroll mode"]: false,
	["Recursive step"]: 17,
	["Mouse mode"]: false,
	["Zoom to number"]: 0.5,
	["Zoom duration"]: 1,
}

class MandelbrotScene {
	scene: THREE.Scene = new THREE.Scene()
	camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
		75,
		window.innerWidth / window.innerHeight,
		0.1,
		1000,
	)
	renderer: THREE.WebGLRenderer | null = null
	material: THREE.ShaderMaterial | null = null
	geometry: THREE.PlaneGeometry | null = null
	gui: GUI | null = null
	rafId: number | null = null
	mouse: THREE.Vector2 = new THREE.Vector2(0)

	constructor(el: HTMLCanvasElement | null, opt?: { renderToTarget: boolean }) {
		this.camera.position.z = 1
		if (!opt?.renderToTarget && el) {
			this.renderer = new THREE.WebGLRenderer({
				canvas: el,
				powerPreference: "high-performance",
				antialias: true,
			})

			this.renderer.toneMapping = THREE.ReinhardToneMapping
			this.renderer.setClearColor("#000000")
			this.renderer.setSize(window.innerWidth, window.innerHeight)
		}

		this.init()
		this.setInitialValues()
		if (this.renderer) {
			this.addControls()
		}
		this.animate()

		if (this.renderer) {
			window.addEventListener("mousemove", this.onMouseMove.bind(this))
			window.addEventListener("resize", this.resize.bind(this))
			window.addEventListener("wheel", this.onMouseWheel.bind(this))
			window.addEventListener("keypress", this.mousePressed.bind(this))
		}
	}

	public setInitialValues() {
		const mouseMode = localStorage.getItem("mouseMode")
		const mousePosition = localStorage.getItem("mousePosition")
		const scrollMode = localStorage.getItem("ScrollMode")

		if (mouseMode) {
			options["Mouse mode"] = mouseMode === "true"
		}
		if (scrollMode) {
			options["Scroll mode"] = scrollMode === "true"
		}
		if (mousePosition) {
			const [x, y] = mousePosition.split(" ")
			if (this.material) {
				this.material.uniforms.u_mouse.value.x = parseFloat(x)
				this.material.uniforms.u_mouse.value.y = parseFloat(y)
			}
		}
	}

	public addControls() {
		this.gui = new GUI()
		if (!this.material) return

		this.gui.addColor(options, "Color").onChange(() => {
			if (!this.material) return
			this.material.uniforms.u_color.value = new THREE.Color(options.Color)
			this.material.needsUpdate = true
		})

		this.gui
			.add(options, "Scroll mode")
			.onChange(() => {
				if (!this.material) return
				this.material.uniforms.u_scroll_mode.value = options["Scroll mode"]
				this.material.needsUpdate = true
			})
			.name("Scroll mode (press S to change)")

		this.gui.add(options, "Recursive step", 1, 1000).onChange(() => {
			if (!this.material) return
			this.material.uniforms.u_m_count.value = options["Recursive step"]
			this.material.needsUpdate = true
		})

		// add tooltip for mouse mode
		this.gui
			.addFolder("Mouse mode (press M to change)")
			.add(options, "Mouse mode")
			.onChange(() => {
				if (!this.material) return
				this.material.uniforms.u_mouse_mode.value = options["Mouse mode"]
				this.material.needsUpdate = true
			})

		let isGoing = false
		let tl = gsap.timeline()

		this.gui.add(options, "Zoom to number", 1, 100000).onChange(() => {
			if (isGoing) {
				// remove all tween
				tl.kill()
				isGoing = false
				tl = gsap.timeline()
			}
			if (this.material?.uniforms.u_zoom) {
				isGoing = true

				tl.to(this.material.uniforms.u_zoom, {
					value: options["Zoom to number"],
					duration: options["Zoom duration"],
					ease: "power4.inOut",
					onComplete: () => {
						isGoing = false
					},
				})
			}
		})

		this.gui.add(options, "Zoom duration", 1, 100).onChange(() => {
			if (isGoing) return
			if (this.material?.uniforms.u_zoom) {
				options["Zoom duration"] = Math.round(options["Zoom duration"])
			}
		})

		this.gui
			.add(
				{
					reset: () => {
						if (this.material) {
							this.material.uniforms.u_zoom.value = 0.5
							this.material.uniforms.u_mouse.value.set(0, 0)
							options["Zoom to number"] = 0.5
							this.gui?.controllers[3]?.updateDisplay()
							localStorage.setItem("zoomValue", "0.5")
							localStorage.setItem("mousePosition", "0 0")
						}
					},
				},
				"reset",
			)
			.name("Reset Zoom & Mouse")
	}

	public mousePressed(e: KeyboardEvent) {
		// if press M then change the mouse mode
		if (e.key === "m") {
			options["Mouse mode"] = !options["Mouse mode"]
			if (!this.material) return
			console.log(this.gui?.controllers[1])
			if (this.gui && this.gui.folders)
				this.gui.folders[0]?.controllers[0]?.updateDisplay()

			// save position to local storage and zoom value to local storage
			localStorage.setItem("mouseMode", options["Mouse mode"].toString())
			localStorage.setItem(
				"zoomValue",
				this.material.uniforms.u_zoom.value.toString(),
			)
			localStorage.setItem(
				"mousePosition",
				this.material.uniforms.u_mouse.value.x +
					" " +
					this.material.uniforms.u_mouse.value.y,
			)

			this.material.uniforms.u_mouse_mode.value = options["Mouse mode"]
			this.material.needsUpdate = true
		}
		if (e.key === "s") {
			options["Scroll mode"] = !options["Scroll mode"]
			if (!this.material) return

			localStorage.setItem("ScrollMode", options["Scroll mode"].toString())

			if (this.gui && this.gui.folders) this.gui.controllers[1].updateDisplay()

			this.material.uniforms.u_scroll_mode.value = options["Scroll mode"]
			this.material.needsUpdate = true
		}
		if (e.key === "=" || e.key === "+" || e.key === "-") {
			if (this.material?.uniforms.u_zoom) {
				if (e.key === "-") {
					this.material.uniforms.u_zoom.value -=
						this.material.uniforms.u_zoom.value * 0.2
				} else {
					this.material.uniforms.u_zoom.value +=
						this.material.uniforms.u_zoom.value * 0.2
				}
			}
		}
	}

	public init() {
		// convert window.innerWidth and window.innerHeight to floats
		// and pass them to the shader as a vector3
		const dif = window.innerWidth / window.innerHeight
		this.geometry = new THREE.PlaneGeometry(2 * dif, 2, 10, 10)

		this.material = new THREE.ShaderMaterial({
			side: THREE.DoubleSide,
			uniforms: {
				u_time: { value: 0 },
				u_resolution: {
					value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1),
				},
				u_mouse: { value: new THREE.Vector2() },
				u_color: { value: new THREE.Color(options.Color) },
				u_zoom: { value: options["Zoom to number"] },
				u_scroll_mode: { value: options["Scroll mode"] },
				u_m_count: { value: options["Recursive step"] },
				u_mouse_mode: { value: options["Mouse mode"] },
			},
			vertexShader,
			fragmentShader,
		})

		const mesh = new THREE.Mesh(this.geometry, this.material)

		this.camera.lookAt(mesh.position)

		this.scene.add(mesh)
	}

	resize() {
		if (this.renderer) {
			this.renderer.setSize(window.innerWidth, window.innerHeight)
			this.camera.aspect = window.innerWidth / window.innerHeight
			this.camera.updateProjectionMatrix()
		}
	}

	onMouseMove(event: MouseEvent) {
		if (!options["Mouse mode"]) return
		if (this.material) {
			const x = (event.clientX / window.innerWidth) * 2 - 1
			const y = -(event.clientY / window.innerHeight) * 2 + 1

			this.mouse.x = x
			this.mouse.y = y

			// save position to local storage
			localStorage.setItem("mousePosition", x + " " + y)
		}
	}
	public damping = 2
	onMouseWheel(event: WheelEvent) {
		if (!options["Scroll mode"]) return
		if (
			this.material &&
			this.material.uniforms.u_zoom.value + event.deltaY * 0.1 > 1
		) {
			const speed =
				this.material.uniforms.u_zoom.value * 0.2 * event.deltaY * 0.01

			this.material.uniforms.u_zoom.value += speed
			options["Zoom to number"] = this.material.uniforms.u_zoom.value
			this.gui?.controllers[3]?.updateDisplay()

			// save zoom value to local storage
			localStorage.setItem(
				"zoomValue",
				this.material.uniforms.u_zoom.value.toString(),
			)
		}
	}

	public animate() {
		this.rafId = requestAnimationFrame(this.animate.bind(this))
		if (this.material) {
			this.material.uniforms.u_time.value += 0.001
		}
		if (this.renderer) this.renderer.render(this.scene, this.camera)

		// if this render to target mode run camera movement animation
		if (!this.renderer && this.material) {
			this.camera.position.x =
				Math.sin(this.material.uniforms.u_time.value) * -1.5
			this.camera.position.y =
				Math.cos(this.material.uniforms.u_time.value) * 0.5
			this.camera.position.z =
				Math.cos(this.material.uniforms.u_time.value * 0.1) * 0.5
			this.camera.lookAt(this.scene.position)
		}
		if (this.mouse && this.material) {
			this.material.uniforms.u_mouse.value.y += this.mouse.y
			this.material.uniforms.u_mouse.value.x += this.mouse.x
		}
	}

	destroy() {
		if (this.renderer) {
			this.renderer.dispose()
		}
		if (this.gui) {
			this.gui.destroy()
		}
		if (this.material) {
			this.material.dispose()
		}
		if (this.rafId) cancelAnimationFrame(this.rafId)

		window.removeEventListener("mousemove", this.onMouseMove.bind(this))
		window.removeEventListener("resize", this.resize.bind(this))
		window.removeEventListener("wheel", this.onMouseWheel.bind(this))
		window.removeEventListener("keypress", this.mousePressed.bind(this))
	}
}

export default MandelbrotScene
