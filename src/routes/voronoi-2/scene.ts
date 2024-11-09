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

const COUNT = 64
const TEXTURE_WIDTH = COUNT ** 2

const debug = {
	count: COUNT,
	sizeX: 4,
	sizeY: 4,
	color: "#ffffff",
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

	constructor(el: HTMLCanvasElement) {
		this.camera = new THREE.PerspectiveCamera(
			75,
			window.innerWidth / window.innerHeight,
			0.1,
			10000,
		)
		this.camera.position.z = 5
		this.camera.aspect = window.innerWidth / window.innerHeight
		this.camera.updateProjectionMatrix()

		this.scene = new THREE.Scene()
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

		this.textureLoader = new THREE.TextureLoader()

		this.init()
		this.resize()
		this.animate()
		this.initRaycaster()
		window.addEventListener("resize", this.resize.bind(this))
		window.addEventListener("mousemove", this.handleMouseMove.bind(this))

		this.stats = new Stats()
		document.body.appendChild(this.stats.dom)
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
		// this.initialGeo = new THREE.BufferGeometry()
		// this.initialGeo.setDrawRange(0, TEXTURE_WIDTH)
		// const sample = this.samples[this.index]
		// this.initialGeo.setAttribute(
		// 	"position",
		// 	new THREE.Float32BufferAttribute(sample.points, 3)
		// )
		// this.initialGeo.setAttribute(
		// 	"reference",
		// 	new THREE.Float32BufferAttribute(sample.references, 2)
		// )

		// this.initialPoint = new THREE.LineSegments(
		// 	new THREE.WireframeGeometry(this.initialGeo),
		// 	this.material
		// )

		// this.initialPoint.rotateX(Math.PI)
		// this.scene.add(this.initialPoint)

		// this.material.uniforms.uSample.value =
		// 	this.textureLoader.load("/garold.jpg")

		// setTimeout(() => {
		// }, 1000)
		// 	this.addDebug()
		this.initComputeRenderer()
		this.generateVoronois()
	}

	async getSamples() {
		this.isSampling = true
		const srcs = [
			"/textures/garold.jpg",
			"/textures/inyan.png",
			"/textures/sigma.png",
		]

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
							"/textures/garold.jpg": 200,
							"/textures/inyan.png": 200,
							"/textures/sigma.png": 90,
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

	handleMouseMove(event: MouseEvent) {
		// fill mouse pos for raycasting
		const x = event.clientX
		const y = event.clientY

		this.mousePos.x = (x / window.innerWidth) * 2 - 1
		this.mousePos.y = -(y / window.innerHeight) * 2 + 1
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

		for (let i = 0; i < imageData.data.length; i += 4) {
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

	initComputeRenderer() {
		if (!this.renderer) return

		this.gpuCompute = new GPUComputationRenderer(COUNT, COUNT, this.renderer)

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
			fragmentShaderVelocity,
			dtVelocity,
		)
		this.positionVariable = this.gpuCompute.addVariable(
			"textureVelocity",
			fragmentShaderPosition,
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

		this.renderer.domElement.addEventListener(
			"click",
			this.handleClick.bind(this),
		)
	}
	clock = new THREE.Clock()
	prevTime = 0
	animate() {
		const elapsedTime = this.clock.getElapsedTime()
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
			if (this.vpMat && this.positionVariable) {
				this.vpMat.uniforms.uPositions.value =
					this.gpuCompute.getCurrentRenderTarget(this.positionVariable).texture
			}
		}

		if (this.material) {
			this.material.uniforms.uTime.value += 0.05
		}

		if (this.vpMat) {
			this.vpMat.uniforms.uTime.value = elapsedTime
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

		const points = new Float32Array(targetPoints.length)
		for (let i = 0; i < targetPoints.length; i += 4) {
			points[i] = targetPoints[i]
			points[i + 1] = targetPoints[i + 1]
			points[i + 2] = 0
		}

		const { delaunay, voronoi } = this.generateDelaunayPoints(points)

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
				varying vec3 vColor;

				void main() {
					vec3 mvPosition = position;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(mvPosition, 1.0);
					gl_PointSize = 15.0;

					vPosition = position;
					vColor = vec3(color);
				}
				`,
			fragmentShader: `
				varying vec3 vPosition;
				uniform vec3 uColor;
				varying vec3 vColor;
				void main() {
					gl_FragColor = vec4(vColor, 1.0);
				}
				`,
			transparent: true,
			depthWrite: false,
			depthTest: false,
			vertexColors: true,
		})

		const geo = new THREE.BufferGeometry()

		const polygons = voronoi.cellPolygons()
		const cells = Array.from(polygons)
		const centeroids = cells
			.map((cell) => {
				const x = cell.reduce((acc, curr) => acc + curr[0], 0) / cell.length
				const y = cell.reduce((acc, curr) => acc + curr[1], 0) / cell.length
				return [x, y]
			})
			.filter((c) => {
				if (c[0] && c[1]) return true
				return false
			})

		const textureWidth = centeroids.length * 3

		const positions = new Float32Array(textureWidth)
		const colors = new Float32Array(textureWidth)

		for (let i = 0; i < centeroids.length; i++) {
			const i3 = i * 3

			positions[i3] = centeroids[i][0]
			positions[i3 + 1] = centeroids[i][1]
			positions[i3 + 2] = 0

			colors[i3] = centeroids[i][0]
			colors[i3 + 1] = Math.random()
			colors[i3 + 2] = Math.random()
		}

		geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
		geo.setAttribute("color", new THREE.BufferAttribute(colors, 3))

		const pointsMesh = new THREE.Points(geo, this.lineMaterial)

		// this.scene.add(pointsMesh)
		const vpMat = new THREE.ShaderMaterial({
			uniforms: {
				uColor: { value: new THREE.Color(0xffffff) },
				uTime: { value: 0 },
				uPositions: { value: null },
				iResolution: {
					value: new THREE.Vector2(window.innerWidth, window.innerHeight),
				},
				uVoronoi: { value: null },
			},
			vertexShader: `
				varying vec3 vPosition;
				uniform float uTime;
				uniform sampler2D uPositions;
				varying vec3 vColor;

				void main() {
					vec3 mvPosition = position;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(mvPosition, 1.0);
					gl_PointSize = 15.0;

					vPosition = position;
					vColor = vec3(color);
				}
				`,
			fragmentShader: `
				varying vec3 vPosition;
				uniform vec3 uColor;
				varying vec3 vColor;
				uniform sampler2D iChannel0;
				uniform float uTime;
				uniform vec2 iResolution;
				uniform sampler2D uPositions;

				
				
				// The MIT License
				// Copyright © 2013 Inigo Quilez
				// https://www.youtube.com/c/InigoQuilez
				// https://iquilezles.org/
				// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

				// I've not seen anybody out there computing correct cell interior distances for Voronoi
				// patterns yet. That's why they cannot shade the cell interior correctly, and why you've
				// never seen cell boundaries rendered correctly. 
				//
				// However, here's how you do mathematically correct distances (note the equidistant and non
				// degenerated grey isolines inside the cells) and hence edges (in yellow):
				//
				// https://iquilezles.org/articles/voronoilines
				//
				// More Voronoi shaders:
				//
				// Exact edges:  https://www.shadertoy.com/view/ldl3W8
				// Hierarchical: https://www.shadertoy.com/view/Xll3zX
				// Smooth:       https://www.shadertoy.com/view/ldB3zc
				// Voronoise:    https://www.shadertoy.com/view/Xd23Dh

				#define ANIMATE

				vec2 hash2( vec2 p )
				{
					// texture based white noise
					// return textureLod( iChannel0, (p+0.5)/256.0, 0.0 ).xy;
					
				// procedural white noise	
					return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
				}

				vec3 voronoi( in vec2 x )
				{
				vec2 ip = floor(x);
				vec2 fp = fract(x);

				//----------------------------------
				// first pass: regular voronoi
				//----------------------------------
					vec2 mg, mr;

				float md = 8.0;
				for( int j=-1; j<=1; j++ )
				for( int i=-1; i<=1; i++ )
				{
				vec2 g = vec2(float(i),float(j));
						vec2 o = hash2( ip + g );
						#ifdef ANIMATE
				o = 0.5 + 0.5*sin( uTime + 6.2831*o );
				#endif	
				vec2 r = g + o - fp;
				float d = dot(r,r);

				if( d<md )
				{
					md = d;
					mr = r;
					mg = g;
				}
				}

				//----------------------------------
				// second pass: distance to borders
				//----------------------------------
				md = 8.0;
				for( int j=-2; j<=2; j++ )
				for( int i=-2; i<=2; i++ )
				{
				vec2 g = mg + vec2(float(i),float(j));
						vec2 o = hash2( ip + g );
						#ifdef ANIMATE
				o = 0.5 + 0.5*sin( uTime + 6.2831*o );
				#endif	
				vec2 r = g + o - fp;

				if( dot(mr-r,mr-r)>0.00001 )
				md = min( md, dot( 0.5*(mr+r), normalize(r-mr) ) );
				}

				return vec3( md, mr );
				}

				
				void main() {
					vec2 p = gl_FragCoord.xy/iResolution.xy;
					vec4 fragColor = vec4(1.0);
					vec4 base = texture2D( uPositions,  p);

					vec3 c = voronoi( vec2(base.xx) );

					// isolines
					vec3 col = vec3(0.2) * smoothstep( 0.02, 0.03, c.x );
					// borders	
					col = mix( vec3(1.0,0.1,0.0), col, smoothstep( 0.04, 0.07, c.x ) );
					// feature points
					// float dd = length( c.yz );
					// col = mix( vec3(1.0,0.6,0.1), col, smoothstep( 0.0, 0.12, dd) );
					// col += vec3(1.0,0.6,0.1)*(1.0-smoothstep( 0.0, 0.04, dd));

					fragColor = vec4(col,1.0);

					gl_FragColor = fragColor;
				}

				`,
			transparent: true,
			depthWrite: false,
			depthTest: false,
			vertexColors: true,
		})

		const voronoiPlane = new THREE.Mesh(
			new THREE.PlaneGeometry(this.size.x * 2, this.size.z * 2),
			vpMat,
		)

		this.vpMat = vpMat
		const polys = Array.from(voronoi.cellPolygons())
		vpMat.uniforms.uVoronoi.value = polys.reduce(
			(acc, curr, i) => {
				const i3 = i * 3

				acc[i3] = curr[0][0]
				acc[i3 + 1] = curr[0][1]
				acc[i3 + 2] = 0
				return acc
			},
			new Float32Array(polys.length * 3),
		)

		this.scene.add(voronoiPlane)
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
