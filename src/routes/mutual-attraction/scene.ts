import * as THREE from "three"
import vertexShader from "./vertexShader.glsl"
import fragmentShader from "./fragmentShader.glsl"
import { GUI } from "lil-gui"
import gsap from "$gsap"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import Mover from "./Mover"
import type { IMover } from "./Mover"
import Stats from "stats.js"

const options = {
	count: 5000,
	glowingIntensity: 2.5,
	color: "#00bfff",
	attractorMass: 1,
	moversMass: 0.1,
	speedFactor: 0.1,
	nBodyMode: false,
	nBody: 2,
}

class AttractionScene {
	scene: THREE.Scene = new THREE.Scene()
	camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
		75,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	)
	renderer: THREE.WebGLRenderer | null = null
	material: THREE.ShaderMaterial | null = null
	geometry: THREE.PlaneGeometry | null = null
	gui: GUI | null = null
	controls: OrbitControls | null = null
	instancedMesh: THREE.InstancedMesh | null = null
	stats = new Stats()
	rafId: number | null = null

	constructor(el: HTMLCanvasElement | null, opt?: { renderToTarget: boolean }) {
		this.camera.position.z = 1
		if (!opt?.renderToTarget && el) {
			this.renderer = new THREE.WebGLRenderer({
				canvas: el,
			})

			this.renderer.toneMapping = THREE.ReinhardToneMapping
			this.renderer.setClearColor("#050505")
			this.renderer.setSize(window.innerWidth, window.innerHeight)
		}
		this.init()
		if (!opt?.renderToTarget && el) {
			this.addDebug()
			// add stats
			this.stats.showPanel(0)
			document.body.appendChild(this.stats.dom)
		}
		this.setInitialValues()
		this.animate()

		if (this.renderer) {
			this.controls = new OrbitControls(this.camera, this.renderer.domElement)
			// add controls to the scene
			this.controls.enableDamping = true
			this.controls.dampingFactor = 0.25
			this.controls.enableZoom = true
			this.controls.autoRotate = true
			this.controls.autoRotateSpeed = 0.5
			this.controls.enablePan = true

			window.addEventListener("resize", this.onResize.bind(this))
			window.addEventListener("wheel", this.onMouseWheel.bind(this))
			window.addEventListener("keypress", this.mousePressed.bind(this))
			window.addEventListener("click", this.onClick.bind(this))
		}
		window.addEventListener("mousemove", this.onMouseMove.bind(this))
	}

	setInitialValues() {
		// initial values
	}

	mousePressed(e: KeyboardEvent) {
		// key pressed
	}

	movers: IMover[] = []
	init() {
		// convert window.innerWidth and window.innerHeight to floats
		// and pass them to the shader as a vector3
		const dif = window.innerWidth / window.innerHeight
		this.geometry = new THREE.PlaneGeometry(2 * dif, 2, 10, 10)

		this.material = new THREE.ShaderMaterial({
			side: THREE.DoubleSide,
			uniforms: {
				uTime: { value: 0.0 },
				uMouse: { value: new THREE.Vector2(0.0, 0.0) },
				uResolution: {
					value: new THREE.Vector2(window.innerWidth, window.innerHeight),
				},
				uTexture: { value: new THREE.TextureLoader().load("/particle.png") },
				uColor: { value: new THREE.Color(options.color) },
				uIntensity: { value: options.glowingIntensity },
			},
			vertexShader,
			fragmentShader,
		})

		const nBodyMode = options.nBodyMode
		const nBody = options.nBody

		let n = options.count

		if (nBodyMode) n = nBody

		const geometry = new THREE.SphereGeometry(0.05, 12, 12)

		this.instancedMesh = new THREE.InstancedMesh(geometry, this.material, n)

		const movers: IMover[] = []
		const dummy = new THREE.Object3D()

		for (let i = 0; i < n; i++) {
			let m =
				i === 0
					? options.attractorMass
					: gsap.utils.random(0.1, options.moversMass)
			if (nBodyMode) {
				m = gsap.utils.random(0.1, options.moversMass)
			}
			const x = i === 0 ? 0 : gsap.utils.random(0, 1)
			const y = i === 0 ? 0 : gsap.utils.random(0, 1)
			const z = i === 0 ? 0 : gsap.utils.random(0, 1)
			const mover = new Mover({
				x,
				y,
				z,
				mesh: this.instancedMesh,
				index: i,
				m,
				radius: i === 0 ? 0.05 : 0.01,
				speedFactor: options.speedFactor,
			})

			dummy.position.set(x, y, z)
			dummy.updateMatrix()
			this.instancedMesh.setMatrixAt(i, dummy.matrix)
			movers.push(mover)
		}
		// add offset to -50%
		this.instancedMesh.position.set(-0.5, -0.5, -0.5)
		this.scene.add(this.instancedMesh)
		this.movers = movers
	}

	onMouseMove(event: MouseEvent) {
		if (this.material) {
			const x = event.clientX
			const y = event.clientY
		}

		if (this.movers[0] && !options.nBodyMode) {
			this.movers[0].position.x = THREE.MathUtils.lerp(
				this.movers[0].position.x,
				(event.clientX / window.innerWidth) * 2 - 1,
				0.1
			)
			this.movers[0].position.y = THREE.MathUtils.lerp(
				this.movers[0].position.y,
				-(event.clientY / window.innerHeight) * 2 + 1,
				0.1
			)
		}
	}
	damping = 0.1
	onMouseWheel(event: WheelEvent) {
		// wheel event
	}

	onClick() {
		// click event
	}

	onResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight
		this.camera.updateProjectionMatrix()
		this.renderer?.setSize(window.innerWidth, window.innerHeight)
	}

	drawMovers() {
		if (!this.movers.length) return

		const nBodyMode = options.nBodyMode

		if (nBodyMode) {
			for (let i = 0; i < this.movers.length; i++) {
				const mover = this.movers[i]
				mover.boundaries()
				mover.update()
				mover.show()
				for (let j = 0; j < this.movers.length; j++) {
					if (i !== j) {
						mover.attract(this.movers[j])
						mover.boundaries()
						mover.update()
						mover.show()
					}
				}
			}
		} else {
			const main = this.movers[0]

			main.update()
			main.show()

			for (let i = 1; i < this.movers.length; i++) {
				main.attract(this.movers[i])
				this.movers[i].applyForce(main.acc)
				this.movers[i].update()
				this.movers[i].show()
			}
		}

		if (this.instancedMesh) this.instancedMesh.instanceMatrix.needsUpdate = true
	}

	addDebug() {
		this.gui = new GUI()

		this.gui
			.add(options, "count", 1, 200000)
			.step(1)
			.name("Count")
			.onChange(() => {
				if (this.instancedMesh) {
					// clean up
					this.scene.remove(this.instancedMesh)
					this.movers = []
				}
				// reinit
				this.init()
			})
		this.gui
			.add(options, "glowingIntensity", 0, 20)
			.step(0.01)
			.name("Glowing Intensity")
			.onChange(() => {
				if (this.material) {
					this.material.uniforms.uIntensity.value = options.glowingIntensity
				}
			})
		this.gui
			.addColor(options, "color")
			.name("Color")
			.onChange(() => {
				if (this.material) {
					this.material.uniforms.uColor.value = new THREE.Color(options.color)
				}
			})

		this.gui
			.add(options, "attractorMass", 0, 10)
			.step(0.01)
			.name("Attractor Mass")
			.onChange(() => {
				if (this.movers.length > 0) {
					this.movers[0].mass = options.attractorMass
				}
			})

		this.gui
			.add(options, "moversMass", 0, 10)
			.step(0.01)
			.name("Movers Mass")
			.onChange(() => {
				if (this.movers.length > 0) {
					for (let i = 1; i < this.movers.length; i++) {
						this.movers[i].mass = options.moversMass
					}
				}
			})

		this.gui
			.add(options, "speedFactor", 0.0001, 1)
			.step(0.01)
			.name("Speed Factor")
			.onChange(() => {
				if (this.movers.length > 0) {
					for (let i = 1; i < this.movers.length; i++) {
						this.movers[i].speedFactor = options.speedFactor
						this.movers[i].update()
					}
				}
			})

		// add reset button
		this.gui
			.add(
				{
					reset: () => {
						this.cleanUp()
						this.init()
					},
				},
				"reset"
			)
			.name("Reset")

		const nBodyFolder = this.gui.addFolder("N-Body")

		nBodyFolder
			.add(options, "nBodyMode")
			.name("N-Body Mode")
			.onChange(() => {
				this.cleanUp()
				this.init()
			})

		nBodyFolder
			.add(options, "nBody", 2, 30)
			.step(1)
			.name("N-Body")
			.onChange(() => {
				this.cleanUp()
				this.init()
			})
	}

	cleanUp() {
		if (this.instancedMesh) {
			this.instancedMesh.clear()
			this.scene.remove(this.instancedMesh)
		}
		if (this.material) {
			this.material.dispose()
		}
		if (this.geometry) {
			this.geometry.dispose()
		}
	}

	animate() {
		this.drawMovers()
		this.rafId = requestAnimationFrame(this.animate.bind(this))
		this.stats.update()
		if (this.material) {
			this.material.uniforms.uTime.value += 0.01
		}
		if (this.renderer) this.renderer.render(this.scene, this.camera)
	}

	destroy() {
		if (this.gui) {
			this.gui.destroy()
		}
		window.removeEventListener("mousemove", this.onMouseMove.bind(this))
		window.removeEventListener("resize", this.onResize.bind(this))
		window.removeEventListener("wheel", this.onMouseWheel.bind(this))

		this.renderer?.dispose()

		if (this.stats) {
			this.stats.dom.remove()
		}
		if (this.rafId) cancelAnimationFrame(this.rafId)
	}
}

export default AttractionScene
