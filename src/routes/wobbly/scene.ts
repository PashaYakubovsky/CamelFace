import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils"
import vertexShader from "./vertexShader.glsl"
import fragmentShader from "./fragmentShader.glsl"
import Stats from "stats.js"

import * as THREE from "three"
import GUI from "lil-gui"
import CustomShaderMaterial from "three-custom-shader-material/vanilla"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

class WobblyScene {
	renderer: THREE.WebGLRenderer | null = null
	mouse: THREE.Vector2
	width = window.innerWidth
	height = window.innerHeight
	pixelRatio = Math.min(window.devicePixelRatio, 2)
	stats?: Stats
	time = 0
	scene!: THREE.Scene
	camera!: THREE.PerspectiveCamera
	gui!: GUI
	gltfLoader: GLTFLoader
	rafId: number | null = null
	dracoLoader: DRACOLoader
	material!: CustomShaderMaterial
	depthMaterial!: CustomShaderMaterial
	controls: OrbitControls
	debugObject = {
		clearColor: "#000",
		color: "#006eff",
		color2: "#000000",
		color3: "#050505",
		orbitControls: true,
		metalness: 0,
		roughness: 0,
		transmission: 0.78,
		ior: 1.17,
		thickness: 0.96,
		positionFrequency: 0.5,
		timeFrequency: 0.656,
		strength: 0.907,
		warpPositionFrequency: 0,
		warpTimeFrequency: 0.12,
		warpStrength: 1.7,
	}
	uniforms = {
		uTime: new THREE.Uniform(0),
		uPositionFrequency: new THREE.Uniform(0.5),
		uTimeFrequency: new THREE.Uniform(0.5),
		uStrength: new THREE.Uniform(0.5),
		uWarpPositionFrequency: new THREE.Uniform(0.5),
		uWarpTimeFrequency: new THREE.Uniform(0.5),
		uWarpStrength: new THREE.Uniform(0.5),
		uResolution: new THREE.Uniform(
			new THREE.Vector2(
				this.width * this.pixelRatio,
				this.height * this.pixelRatio,
			),
		),
		uMouse: new THREE.Uniform(new THREE.Vector2()),
		uColor: new THREE.Uniform(new THREE.Color(this.debugObject.color)),
		uColor2: new THREE.Uniform(new THREE.Color(this.debugObject.color2)),
		uColor3: new THREE.Uniform(new THREE.Color(this.debugObject.color3)),
	}
	floorPlane!: THREE.Mesh
	geometry!: THREE.BufferGeometry
	wobble!: THREE.Mesh | THREE.Group

	constructor(
		canvasElement: HTMLCanvasElement | null,
		opt?: {
			renderToTarget: boolean
		},
	) {
		this.height = window.innerHeight
		this.width = window.innerWidth
		this.pixelRatio = Math.min(window.devicePixelRatio, 2)

		if (!opt?.renderToTarget && canvasElement) {
			this.renderer = new THREE.WebGLRenderer({
				canvas: canvasElement,
				antialias: true,
				alpha: true,
				powerPreference: "high-performance",
			})
			this.renderer.shadowMap.enabled = true
			this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
			// this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
			this.renderer.toneMappingExposure = 1
			this.renderer.setSize(this.width, this.height)
			this.renderer.setPixelRatio(this.pixelRatio)
			this.renderer.setClearColor(new THREE.Color(this.debugObject.clearColor))
		}

		this.scene = new THREE.Scene()

		// Loaders
		this.dracoLoader = new DRACOLoader()
		this.dracoLoader.setDecoderPath("./draco/")
		this.gltfLoader = new GLTFLoader()
		this.gltfLoader.setDRACOLoader(this.dracoLoader)

		// Lights
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
		this.scene.add(ambientLight)
		const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
		if (this.renderer) {
			directionalLight.castShadow = true
			directionalLight.shadow.mapSize.set(1024, 1024)
			directionalLight.shadow.camera.far = 20
			directionalLight.shadow.normalBias = 0.05
			directionalLight.position.set(0.25, 2, -2.25)
		}
		this.scene.add(directionalLight)

		/**
		 * Camera
		 */
		this.camera = new THREE.PerspectiveCamera(
			35,
			this.width / this.height,
			0.0001,
			10000,
		)

		this.scene.add(this.camera)

		// Stats
		if (this.renderer) {
			this.stats = new Stats()
			this.stats.dom.style.left = "auto"
			this.stats.dom.style.right = "0"
			this.stats.dom.style.top = "auto"
			this.stats.dom.style.bottom = "0"
			document.body.appendChild(this.stats.dom)
		}

		// Mouse
		this.mouse = new THREE.Vector2()

		new THREE.TextureLoader().load("/matcap.png", (texture) => {
			texture.mapping = THREE.EquirectangularReflectionMapping
			texture.magFilter = THREE.LinearFilter
			texture.minFilter = THREE.LinearMipmapLinearFilter
			texture.flipY = false
			texture.generateMipmaps = true
			texture.wrapS = THREE.ClampToEdgeWrapping
			texture.wrapT = THREE.ClampToEdgeWrapping
			texture.repeat.set(1, 1)

			this.scene.environment = texture
		})

		// Controls
		if (this.renderer) {
			this.controls = new OrbitControls(this.camera, canvasElement)
			this.controls.enableDamping = true
			this.controls.enabled = this.debugObject.orbitControls
			this.camera.position.set(13, -3, -20)
		} else {
			this.camera.position.set(0, 5, 15)
			this.camera.lookAt(new THREE.Vector3(0, 0, 0))
		}

		// Add objects
		this.addObjects()

		// debug
		if (this.renderer) this.addDebug()

		// initial render
		this.animate()

		// Events
		window.addEventListener("resize", this.onWindowResize.bind(this), false)
		window.addEventListener("mousemove", this.onMouseMove.bind(this), false)
	}

	async addObjects() {
		/**
		 * Setup objects
		 */

		// Material
		this.material = new CustomShaderMaterial({
			// CSM
			baseMaterial: THREE.MeshPhysicalMaterial,
			vertexShader,
			fragmentShader,
			// Uniforms
			uniforms: this.uniforms,
			// MeshPhysicalMaterial
			side: THREE.DoubleSide,
			silent: true,
			transparent: true,
			color: this.debugObject.color,
			roughness: this.debugObject.roughness,
			metalness: this.debugObject.metalness,
			transmission: this.debugObject.transmission,
			ior: this.debugObject.ior,
			thickness: this.debugObject.thickness,
			wireframe: false,
		})

		// Depth material
		this.depthMaterial = new CustomShaderMaterial({
			// CSM
			baseMaterial: THREE.MeshDepthMaterial,
			vertexShader,
			// Uniforms
			uniforms: this.uniforms,
			silent: true,
			// MeshDepthMaterial
			depthPacking: THREE.RGBADepthPacking,
		})

		// Geometry
		this.geometry = new THREE.IcosahedronGeometry(2.5, 50)
		this.geometry = mergeVertices(this.geometry)
		this.geometry.computeTangents()

		// Mesh
		const wobble = new THREE.Mesh(this.geometry, this.material)
		wobble.customDepthMaterial = this.depthMaterial
		wobble.castShadow = true
		this.scene.add(wobble)
		this.wobble = wobble

		// Add floor
		const floorGeometry = new THREE.PlaneGeometry(50, 50)
		const floorMaterial = new THREE.MeshStandardMaterial()
		this.floorPlane = new THREE.Mesh(floorGeometry, floorMaterial)
		this.floorPlane.receiveShadow = true
		this.floorPlane.position.y = -6
		this.floorPlane.rotation.x = -Math.PI / 2

		this.scene.add(this.floorPlane)
	}

	addDebug() {
		this.gui = new GUI({ width: 300 })

		this.gui.open()
		this.gui.addColor(this.debugObject, "clearColor").onChange(() => {
			if (this.renderer)
				this.renderer.setClearColor(this.debugObject.clearColor)
		})
		this.gui
			.add(this.debugObject, "orbitControls")
			.onChange((value: boolean) => {
				this.controls.enabled = value
			})

		const folder = this.gui.addFolder("MeshPhysicalMaterial")
		folder
			.addColor(this.debugObject, "color")
			.name("Color gradient 1")
			.onChange(() => {
				if (this.material) {
					this.uniforms.uColor.value = new THREE.Color(this.debugObject.color)
				}
			})
		folder
			.addColor(this.debugObject, "color2")
			.name("Color gradient 2")
			.onChange(() => {
				if (this.material) {
					this.uniforms.uColor2.value = new THREE.Color(this.debugObject.color2)
				}
			})
		folder
			.addColor(this.debugObject, "color3")
			.name("Color gradient 3")
			.onChange(() => {
				if (this.material) {
					this.uniforms.uColor3.value = new THREE.Color(this.debugObject.color3)
				}
			})

		folder
			.add(this.debugObject, "metalness")
			.min(0)
			.max(1)
			.step(0.01)
			.onChange(() => {
				if (this.material) {
					;(this.material as unknown as THREE.MeshPhysicalMaterial).metalness =
						this.debugObject.metalness
				}
			})
		folder
			.add(this.debugObject, "roughness")
			.min(0)
			.max(1)
			.step(0.01)
			.onChange(() => {
				if (this.material) {
					;(this.material as unknown as THREE.MeshPhysicalMaterial).roughness =
						this.debugObject.roughness
				}
			})
		folder
			.add(this.debugObject, "transmission")
			.min(0)
			.max(1)
			.step(0.01)
			.onChange(() => {
				if (this.material) {
					;(
						this.material as unknown as THREE.MeshPhysicalMaterial
					).transmission = this.debugObject.transmission
				}
			})
		folder
			.add(this.debugObject, "ior")
			.min(0)
			.max(3)
			.step(0.01)
			.onChange(() => {
				if (this.material) {
					;(this.material as unknown as THREE.MeshPhysicalMaterial).ior =
						this.debugObject.ior
				}
			})
		folder
			.add(this.debugObject, "thickness")
			.min(0)
			.max(1)
			.step(0.01)
			.onChange(() => {
				if (this.material) {
					;(this.material as unknown as THREE.MeshPhysicalMaterial).thickness =
						this.debugObject.thickness
				}
			})

		const folderWobble = this.gui.addFolder("Wobble")
		folderWobble
			.add(this.debugObject, "positionFrequency")
			.min(0)
			.max(2)
			.step(0.001)
			.onChange(() => {
				if (this.uniforms.uPositionFrequency) {
					this.uniforms.uPositionFrequency.value =
						this.debugObject.positionFrequency
				}
			})
		folderWobble
			.add(this.debugObject, "timeFrequency")
			.min(0)
			.max(2)
			.step(0.001)
			.onChange(() => {
				if (this.uniforms.uTimeFrequency) {
					this.uniforms.uTimeFrequency.value = this.debugObject.timeFrequency
				}
			})
		folderWobble
			.add(this.debugObject, "strength")
			.min(0)
			.max(2)
			.step(0.001)
			.onChange(() => {
				if (this.uniforms.uStrength) {
					this.uniforms.uStrength.value = this.debugObject.strength
				}
			})

		folderWobble
			.add(this.debugObject, "warpPositionFrequency")
			.min(0)
			.max(2)
			.step(0.001)
			.onChange(() => {
				if (this.uniforms.uWarpPositionFrequency) {
					this.uniforms.uWarpPositionFrequency.value =
						this.debugObject.warpPositionFrequency
				}
			})

		folderWobble
			.add(this.debugObject, "warpTimeFrequency")
			.min(0)
			.max(2)
			.step(0.001)
			.onChange(() => {
				if (this.uniforms.uWarpTimeFrequency) {
					this.uniforms.uWarpTimeFrequency.value =
						this.debugObject.warpTimeFrequency
				}
			})

		folderWobble
			.add(this.debugObject, "warpStrength")
			.min(0)
			.max(2)
			.step(0.001)
			.onChange(() => {
				if (this.uniforms.uWarpStrength) {
					this.uniforms.uWarpStrength.value = this.debugObject.warpStrength
				}
			})

		// Add select to choose shape
		const shapes = [
			"Icosahedron",
			"Torus",
			"Sphere",
			"Cone",
			"Cylinder",
			"TorusKnot",
			"Dodecahedron",
			"Octahedron",
			"Tetrahedron",
			"Plane",
			"Box",
			"Circle",
		]
		this.gui
			.add({ shape: "Icosahedron" }, "shape", shapes)
			.onChange((value: string) => {
				const shapeCreate = {
					["Icosahedron"]: new THREE.IcosahedronGeometry(2.5, 50),
					["Torus"]: new THREE.TorusGeometry(2.5, 1, 50, 100),
					["Sphere"]: new THREE.SphereGeometry(2.5, 50, 50),
					["Cone"]: new THREE.ConeGeometry(2.5, 5, 50),
					["Cylinder"]: new THREE.CylinderGeometry(2.5, 2.5, 5, 50),
					["TorusKnot"]: new THREE.TorusKnotGeometry(2.5, 1, 100, 16),
					["Dodecahedron"]: new THREE.DodecahedronGeometry(2.5, 50),
					["Octahedron"]: new THREE.OctahedronGeometry(2.5, 50),
					["Tetrahedron"]: new THREE.TetrahedronGeometry(2.5, 50),
					["Plane"]: new THREE.PlaneGeometry(5, 5, 50, 50),
					["Box"]: new THREE.BoxGeometry(5, 5, 5, 50, 50, 50),
					["Circle"]: new THREE.CircleGeometry(2.5, 50),
				}
				this.geometry = mergeVertices(
					shapeCreate[value as keyof typeof shapeCreate],
				)
				this.geometry.computeTangents()

				if (this.wobble) {
					this.scene.remove(this.wobble)
				}

				const wobble = new THREE.Mesh(this.geometry, this.material)
				wobble.customDepthMaterial = this.depthMaterial
				wobble.castShadow = true
				this.scene.add(wobble)
				this.wobble = wobble
			})

		// add button to load custom glb model
		this.gui.add({ loadModel: () => this.loadModel() }, "loadModel")
	}

	loadModel() {
		const inputFile = document.createElement("input")
		inputFile.type = "file"
		// glb or gltf
		inputFile.accept = ".glb, .gltf"
		inputFile.click()

		inputFile.addEventListener("change", async () => {
			const file = inputFile.files?.[0]
			if (file) {
				const gltf = await this.gltfLoader.loadAsync(URL.createObjectURL(file))
				// find first mesh
				// const recursiveFindMesh = (object: THREE.Object3D): THREE.Mesh | undefined => {
				// 	if (object instanceof THREE.Mesh) {
				// 		return object;
				// 	}
				// 	for (const child of object.children) {
				// 		const mesh = recursiveFindMesh(child);
				// 		if (mesh) {
				// 			return mesh;
				// 		}
				// 	}
				// };
				// const mesh = recursiveFindMesh(gltf.scene);

				const recursiveAddMaterial = (object: THREE.Object3D) => {
					if (object instanceof THREE.Mesh) {
						object.castShadow = true
						object.receiveShadow = true
						object.material = this.material
					}
					for (const child of object.children) {
						recursiveAddMaterial(child)
					}
				}

				recursiveAddMaterial(gltf.scene)

				if (gltf.scene) {
					// remove old mesh
					this.scene.remove(this.wobble)
					// add new mesh
					this.wobble = gltf.scene

					this.scene.add(gltf.scene)
				}
			}
		})

		document.body.appendChild(inputFile)
		inputFile.style.display = "none"
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
		if (this.material) {
			this.uniforms.uResolution.value = new THREE.Vector2(
				this.width * this.pixelRatio,
				this.height * this.pixelRatio,
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

		// Update the mouse uniform
		if (this.material) {
			this.uniforms.uMouse.value = this.mouse
		}
	}

	clock = new THREE.Clock()
	animate(): void {
		const elapsedTime = this.clock.getElapsedTime()
		this.time = elapsedTime

		// Update controls
		if (this.controls) this.controls.update()

		// Update uniforms
		this.uniforms.uTime.value = this.time

		// Update material
		if (this.material) {
			this.material.uniforms = this.uniforms
		}
		if (this.depthMaterial) {
			this.depthMaterial.uniforms = this.uniforms
		}

		// Render normal scene
		if (this.renderer) this.renderer.render(this.scene, this.camera)

		// animate camera if this preview scene
		if (!this.renderer) {
			this.camera.position.x = Math.sin(this.time * 0.1) * 10
			this.camera.position.z = Math.cos(this.time * 0.1) * 10
			this.camera.lookAt(this.wobble.position)
		}

		this.rafId = requestAnimationFrame(() => this.animate())

		if (this.stats) this.stats.update()
	}

	onClick(e: MouseEvent): void {
		e.preventDefault()
	}

	destroy(): void {
		window.removeEventListener("mousemove", this.onMouseMove.bind(this))

		if (this.renderer) {
			this.renderer.dispose()
			this.renderer.forceContextLoss()
		}
		if (this.gui) this.gui.destroy()

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

export default WobblyScene
