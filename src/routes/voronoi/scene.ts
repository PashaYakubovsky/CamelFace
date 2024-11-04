import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { Delaunay, Voronoi } from "d3-delaunay"
import {
	GPUComputationRenderer,
	type Variable,
} from "three/addons/misc/GPUComputationRenderer.js"
import fragmentShaderVelocity from "./velocityFragment.glsl"
import fragmentShaderPosition from "./positionFragment.glsl"
import vertexShader from "./vertex.glsl"
import fragmentShader from "./fragment.glsl"
import Stats from "stats.js"
import { GUI } from "lil-gui"

const COUNT = 128
const TEXTURE_WIDTH = COUNT ** 2

const debug = {
	count: COUNT,
	sizeX: 4,
	sizeY: 4,
	color: "#ca9891",
	voronoiCells: false,
}

class VoronoiScene {
	scene: THREE.Scene
	camera: THREE.PerspectiveCamera
	renderer: THREE.WebGLRenderer | null = null
	rafId: number | null = null
	material: THREE.ShaderMaterial | null = null
	triangleMaterial: THREE.ShaderMaterial | null = null
	controls: OrbitControls | null = null
	mesh: THREE.Mesh | null = null
	voronoi: Voronoi<number[]> | null = null
	size: { x: number; z: number } = { x: debug.sizeX, z: debug.sizeY }
	initialGeo: THREE.BufferGeometry | null = null
	voronoiCells: THREE.Group | null = null
	initialPoint: THREE.Points | null = null
	textureLoader: THREE.TextureLoader
	gpuCompute: GPUComputationRenderer | null = null
	positionVariable: Variable | null = null
	velocityVariable: Variable | null = null
	positionUniforms: Record<string, THREE.IUniform<any>> = {}
	velocityUniforms: Record<string, THREE.IUniform<any>> = {}
	delaunay: Delaunay<number[]> | null = null
	centeroids: Float32Array = new Float32Array()
	stats: Stats | null = null
	gui: GUI | null = null
	index = 1
	targets: THREE.DataTexture[] = []
	lineMaterial: THREE.ShaderMaterial | null = null
	mousePos: THREE.Vector2 = new THREE.Vector2()
	raycaster: THREE.Raycaster = new THREE.Raycaster()
	raycastPlane: THREE.Mesh | null = null
	isSampling = false

	samples: {
		imageData: ImageData
		points: Float32Array
		canvas: HTMLCanvasElement
		image: HTMLImageElement
		threshold: number
		references: Float32Array
	}[] = []

	onSampleLoaded?: () => void

	constructor(
		el: HTMLCanvasElement | null,
		opts?: {
			renderToTarget?: boolean
			targetRenderer?: THREE.WebGLRenderer
		},
	) {
		this.camera = new THREE.PerspectiveCamera(
			75,
			window.innerWidth / window.innerHeight,
			0.1,
			10000,
		)
		this.camera.position.z = 5
		this.camera.aspect = window.innerWidth / window.innerHeight
		this.camera.updateProjectionMatrix()

		if (opts?.targetRenderer) {
			this.targetRenderer = opts.targetRenderer
		}

		this.scene = new THREE.Scene()

		if (!opts?.renderToTarget && el) {
			this.renderer = new THREE.WebGLRenderer({
				canvas: el,
				antialias: true,
				powerPreference: "high-performance",
			})
			this.renderer.setPixelRatio(window.devicePixelRatio)
			this.renderer.setClearColor("#000")
			this.renderer.setSize(window.innerWidth, window.innerHeight)

			this.controls = new OrbitControls(this.camera, this.renderer.domElement)
			this.controls.update()
			this.controls.enableDamping = true
			this.controls.dampingFactor = 0.25
			const query = new URLSearchParams(window.location.search)
			this.controls.enabled = query.get("controls") === "true"
		}

		this.textureLoader = new THREE.TextureLoader()

		this.init()
		this.resize()
		this.animate()
		this.initRaycaster()
		window.addEventListener("resize", this.resize.bind(this))
		window.addEventListener("mousemove", this.handleMouseMove.bind(this))

		if (!opts?.renderToTarget) {
			this.addDebug()
			this.stats = new Stats()
			document.body.appendChild(this.stats.dom)
		}
	}

	async init() {
		this.material = new THREE.ShaderMaterial({
			uniforms: {
				uTime: { value: 0 },
				uColor: { value: new THREE.Color(debug.color) },
				uPositions: { value: null },
				uTarget: { value: null },
				uSample: { value: null },
			},
			vertexShader: vertexShader,
			fragmentShader: fragmentShader,
			depthWrite: false,
			depthTest: false,
			transparent: true,
			vertexColors: true,
		})

		await this.getSamples()

		// add initial points
		this.initialGeo = new THREE.BufferGeometry()
		this.initialGeo.setDrawRange(0, TEXTURE_WIDTH)
		const sample = this.samples[this.index]
		this.initialGeo.setAttribute(
			"position",
			new THREE.Float32BufferAttribute(sample.points, 3),
		)
		this.initialGeo.setAttribute(
			"reference",
			new THREE.Float32BufferAttribute(sample.references, 2),
		)

		this.initialPoint = new THREE.Points(this.initialGeo, this.material)
		this.initialPoint.rotateX(Math.PI)
		this.scene.add(this.initialPoint)

		this.material.uniforms.uSample.value =
			this.textureLoader.load("/garold.jpg")

		this.initComputeRenderer()
	}

	async getSamples() {
		this.isSampling = true
		const srcs = ["/garold.jpg", "/inyan.png", "/sigma.png"]

		const wait = (ms: number) =>
			new Promise((resolve) => setTimeout(resolve, ms))

		try {
			for (const src of srcs) {
				const img = new Image()
				img.src = src
				img.crossOrigin = "anonymous"

				await wait(1000)

				const canvas = document.createElement("canvas")
				const aspectRatio = img.width / img.height
				canvas.height = 256
				canvas.width = canvas.height * aspectRatio

				const ctx = canvas.getContext("2d", {
					willReadFrequently: true,
				})
				if (!ctx) return

				ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
				const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
				const points = new Float32Array(TEXTURE_WIDTH * 3)
				const refs = new Float32Array(TEXTURE_WIDTH * 2)

				for (let i = 0; i < TEXTURE_WIDTH; i += 3) {
					refs[i * 2] = (i % COUNT) / COUNT
					refs[i * 2 + 1] = ~~(i / COUNT) / COUNT
				}

				this.samples.push({
					imageData,
					points,
					canvas,
					image: img,
					references: refs,
					threshold:
						{
							"/garold.jpg": 200,
							"/inyan.png": 200,
							"/sigma.png": 90,
						}[src] || 200,
				})
			}
		} catch (error) {
			console.error(error)
		}
		this.isSampling = false
		if (this.onSampleLoaded) this.onSampleLoaded()
	}

	resize() {
		if (this.renderer) {
			const width = window.innerWidth
			const height = window.innerHeight
			this.renderer.setSize(width, height)

			this.camera.aspect = width / height
			this.camera.updateProjectionMatrix()
		}
	}

	raycastOffsetX = 0
	raycastOffsetY = 0
	handleMouseMove(event: MouseEvent) {
		// fill mouse pos for raycasting
		const x = event.clientX
		const y = event.clientY

		this.mousePos.x = (x / (window.innerWidth - this.raycastOffsetX)) * 2 - 1
		this.mousePos.y = -(y / (window.innerHeight - this.raycastOffsetY)) * 2 + 1
	}

	handleClick(event: MouseEvent) {
		console.log("click", event)
	}

	generateDelaunayPoints(vertices: Float32Array) {
		const v: Delaunay.Point[] = []

		for (let i = 0; i < vertices.length; i += 3) {
			v.push([vertices[i], vertices[i + 1]])
		}

		const delaunay = Delaunay.from(v)
		const voronoi = delaunay.voronoi([
			-this.size.x,
			-this.size.z,
			this.size.x,
			this.size.z,
		])
		this.delaunay = delaunay
		this.voronoi = voronoi
		return { delaunay, voronoi }
	}

	initRaycaster() {
		this.raycaster = new THREE.Raycaster()
		this.raycastPlane = new THREE.Mesh(
			new THREE.PlaneGeometry(this.size.x * 2, this.size.z * 2),
			new THREE.MeshBasicMaterial({ visible: false, color: 0xff0000 }),
		)
		const aspect = window.innerWidth / window.innerHeight
		this.raycastPlane.scale.y = aspect
		this.raycastPlane.scale.x = aspect
		this.scene.add(this.raycastPlane)
		this.mousePos = new THREE.Vector2()
	}

	destroy() {
		if (this.rafId) cancelAnimationFrame(this.rafId)

		if (this.stats) {
			document.body.removeChild(this.stats.dom)
		}

		if (this.gui) {
			this.gui.destroy()
		}

		if (this.renderer) {
			this.renderer.domElement.removeEventListener(
				"click",
				this.handleClick.bind(this),
			)
		}

		document.removeEventListener("resize", this.resize.bind(this))
		document.removeEventListener("mousemove", this.handleMouseMove.bind(this))

		if (this.gpuCompute) {
			this.gpuCompute.dispose()
		}

		if (this.renderer) {
			this.renderer.dispose()
		}
	}

	fillTexture(texture: THREE.DataTexture, sample: (typeof this.samples)[0]) {
		const baseParticlesTexture = texture
		const imageData = sample.imageData

		for (let i = 0; i < TEXTURE_WIDTH; i++) {
			const i3 = i * 3
			const i4 = i * 4

			const x = THREE.MathUtils.randInt(0, sample.canvas.width)
			const y = THREE.MathUtils.randInt(0, sample.canvas.height)
			const index = (y * sample.canvas.width + x) * 4

			// Positions based on image data
			const id1 = imageData.data[index] / 255
			const id2 = imageData.data[index + 1] / 255
			const id3 = imageData.data[index + 2] / 255
			const value = (id1 + id2 + id3) / 3
			if (value < sample.threshold / 255) {
				i -= 1
				continue
			}

			const nx = THREE.MathUtils.mapLinear(
				x,
				0,
				sample.canvas.width,
				-this.size.x,
				this.size.x,
			)
			const ny = THREE.MathUtils.mapLinear(
				y,
				0,
				sample.canvas.height,
				-this.size.z,
				this.size.z,
			)

			// Set position
			baseParticlesTexture.image.data[i4] = nx
			baseParticlesTexture.image.data[i4 + 1] = ny
			baseParticlesTexture.image.data[i4 + 2] = 0
			baseParticlesTexture.image.data[i4 + 3] = Math.random()
		}
	}

	targetRenderer: THREE.WebGLRenderer | null = null
	initComputeRenderer() {
		const targetRenderer = this.renderer || this.targetRenderer
		if (!targetRenderer) return

		this.gpuCompute = new GPUComputationRenderer(COUNT, COUNT, targetRenderer)

		const dtPosition = this.gpuCompute.createTexture()
		const dtVelocity = this.gpuCompute.createTexture()

		const initialSample = this.samples[this.index]

		this.fillTexture(dtPosition, initialSample)
		this.fillTexture(dtVelocity, initialSample)

		this.targets = []
		for (let i = 0; i < this.samples.length; i++) {
			const target = this.gpuCompute.createTexture()
			this.fillTexture(target, this.samples[i])
			this.targets.push(target)
		}

		this.velocityVariable = this.gpuCompute.addVariable(
			"texturePosition",
			fragmentShaderPosition,
			dtVelocity,
		)
		this.positionVariable = this.gpuCompute.addVariable(
			"textureVelocity",
			fragmentShaderVelocity,
			dtPosition,
		)

		this.gpuCompute.setVariableDependencies(this.velocityVariable, [
			this.positionVariable,
			this.velocityVariable,
		])
		this.gpuCompute.setVariableDependencies(this.positionVariable, [
			this.positionVariable,
			this.velocityVariable,
		])

		this.positionUniforms = this.positionVariable.material.uniforms
		this.velocityUniforms = this.velocityVariable.material.uniforms

		this.positionUniforms["time"] = new THREE.Uniform(0.0)
		this.velocityUniforms["time"] = new THREE.Uniform(0.0)
		this.positionUniforms["deltaTime"] = new THREE.Uniform(0.0)
		this.velocityUniforms["deltaTime"] = new THREE.Uniform(0.0)
		this.velocityUniforms["uTarget"] = new THREE.Uniform(
			this.targets[this.index],
		)
		this.positionUniforms["uTarget"] = new THREE.Uniform(
			this.targets[this.index],
		)
		this.positionUniforms["uTexture"] = new THREE.Uniform(this.canvasTexture)
		this.velocityUniforms["uTexture"] = new THREE.Uniform(this.canvasTexture)
		this.velocityUniforms["uMouse"] = new THREE.Uniform(this.mousePos)
		this.positionUniforms["uMouse"] = new THREE.Uniform(this.mousePos)

		this.velocityVariable.wrapS = THREE.RepeatWrapping
		this.velocityVariable.wrapT = THREE.RepeatWrapping
		this.positionVariable.wrapS = THREE.RepeatWrapping
		this.positionVariable.wrapT = THREE.RepeatWrapping

		this.gpuCompute.init()

		targetRenderer.domElement.addEventListener(
			"click",
			this.handleClick.bind(this),
		)
	}
	clock = new THREE.Clock()
	prevTime = 0
	animate() {
		const elapsedTime = this.clock.getElapsedTime() * 0.01
		const deltaTime = elapsedTime - this.prevTime
		if (this.controls) {
			this.controls.update()
		}

		if (this.renderer) {
			this.renderer.render(this.scene, this.camera)
		}

		if (this.stats) {
			this.stats.update()
		}

		if (this.lineMaterial) {
			this.lineMaterial.uniforms.uTime.value = elapsedTime
		}

		if (this.gpuCompute) {
			this.gpuCompute.compute()
			this.positionUniforms["time"].value = elapsedTime
			this.positionUniforms["time"].value = elapsedTime
			this.positionUniforms["deltaTime"].value = deltaTime
			this.velocityUniforms["deltaTime"].value = deltaTime
			if (this.material && this.positionVariable)
				this.material.uniforms.uPositions.value =
					this.gpuCompute.getCurrentRenderTarget(this.positionVariable).texture
			if (this.lineMaterial && this.positionVariable) {
				this.lineMaterial.uniforms.uPositions.value =
					this.gpuCompute.getCurrentRenderTarget(this.positionVariable).texture
			}
		}

		if (this.material) {
			this.material.uniforms.uTime.value += 0.05
		}

		this.prevTime = elapsedTime

		this.rafId = requestAnimationFrame(this.animate.bind(this))

		// raycast
		if (this.raycastPlane) {
			this.raycaster.setFromCamera(this.mousePos, this.camera)
			const intersects = this.raycaster.intersectObject(this.raycastPlane)
			if (intersects.length) {
				const point = intersects[0].point
				// flip y
				point.y = -point.y
				if (this.positionUniforms["uMouse"]) {
					this.positionUniforms["uMouse"].value = point
					this.velocityUniforms["uMouse"].value = point
				}
			}
		}
	}

	generateVoronois() {
		const target = this.targets[this.index]
		const targetSample = this.samples[this.index]
		const targetPoints = target.image.data
		const float32Arr = new Float32Array(targetPoints)
		const weight = 0.01
		const float32ArrMin = new Float32Array(targetPoints.length * weight)

		for (let i = 0; i < float32Arr.length; i += 3) {
			float32ArrMin[i * weight] = float32Arr[i]
			float32ArrMin[i * weight + 1] = float32Arr[i + 1]
			float32ArrMin[i * weight + 2] = 0
		}

		const { delaunay, voronoi } = this.generateDelaunayPoints(float32ArrMin)
		const polygons = voronoi.cellPolygons()
		const cells = Array.from(polygons)

		this.voronoiCells = new THREE.Group()
		this.lineMaterial = new THREE.ShaderMaterial({
			uniforms: {
				uColor: { value: new THREE.Color(0xffffff) },
				uTime: { value: 0 },
				uPositions: { value: null },
			},
			vertexShader: `
				varying vec3 vPosition;
				uniform float uTime;
				uniform sampler2D uPositions;
				void main() {
					vec3 tPos = position;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(tPos, 1.0);
					vPosition = position;
				}
				`,
			fragmentShader: `
				varying vec3 vPosition;
				uniform vec3 uColor;
				void main() {
					gl_FragColor = vec4(uColor, 1.0);
				}
				`,
			transparent: true,
			depthWrite: false,
			depthTest: false,
		})
		for (const cell of cells) {
			// check px rgb value
			const x = cell[0][0]
			const y = cell[0][1]
			const index = (y * targetSample.imageData.width + x) * 4
			const r = targetSample.imageData.data[index]
			const g = targetSample.imageData.data[index + 1]
			const b = targetSample.imageData.data[index + 2]

			const value = (r + g + b) / 3

			if (value < 200) {
				continue
			}

			const points = []
			for (let i = 0; i < cell.length; i++) {
				points.push(new THREE.Vector3(cell[i][0], cell[i][1], 0))
			}

			// Close the loop for the polygon
			points.push(points[0])

			const geometry = new THREE.BufferGeometry().setFromPoints(points)
			const line = new THREE.LineLoop(geometry, this.lineMaterial)
			this.voronoiCells.add(line)
		}
		this.scene.add(this.voronoiCells)
	}

	addDebug() {
		this.gui = new GUI()

		// particles
		const particles = this.gui.addFolder("Particles")
		particles
			.addColor(debug, "color")
			.name("Color")
			.onChange((value: string) => {
				if (this.material) {
					this.material.uniforms.uColor.value.set(value)
				}
			})
		// add button to generate voronoi
		particles
			.add(debug, "voronoiCells")
			.name("Voronoi Cells")
			.onChange((v: boolean) => {
				if (!v && this.voronoiCells) {
					this.scene.remove(this.voronoiCells)
					return
				}
				this.generateVoronois()
			})
	}

	canvasTexture: THREE.CanvasTexture | null = null
	canvasContext: CanvasRenderingContext2D | null = null
}

export default VoronoiScene
