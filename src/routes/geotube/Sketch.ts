import GUI from "lil-gui"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js"

class Sketch {
	renderer!: THREE.WebGLRenderer
	scene!: THREE.Scene
	camera!: THREE.PerspectiveCamera
	tubes: THREE.Mesh[] = []
	gpuCompute!: GPUComputationRenderer
	positionVariable!: any
	WIDTH = 512 // Computation texture width
	rafId: number | null = null

	params = {
		t: 7.8,
		numPoints: 500,
		numTubes: 10,
		tubeRadius: 0.25,
		radialSegments: 14,
		cylinderRadius: 5, // Radius of the overall cylinder
		rotationSpeed: 0.001, // Speed of rotation animation
		animate: true,
		waveAmplitude: 0.5, // Amplitude of the wave
		waveFrequency: 0.5, // Frequency of the wave
	}

	controls!: OrbitControls

	constructor(c: HTMLCanvasElement) {
		this.setupScene(c)
		this.initGPUCompute()
		this.createUnifiedTubes()
		this.addDebug()
		this.render()
	}

	setupScene(c: HTMLCanvasElement) {
		this.renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true })
		this.renderer.setSize(window.innerWidth, window.innerHeight)
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

		this.scene = new THREE.Scene()
		this.camera = new THREE.PerspectiveCamera(
			75,
			window.innerWidth / window.innerHeight,
			0.1,
			1000,
		)
		this.camera.position.set(0, 10, 20)

		this.controls = new OrbitControls(this.camera, this.renderer.domElement)

		// Add lights
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
		this.scene.add(ambientLight)

		const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
		directionalLight.position.set(10, 10, 10)
		this.scene.add(directionalLight)

		window.addEventListener("resize", this.resize.bind(this))
	}

	initGPUCompute() {
		this.gpuCompute = new GPUComputationRenderer(
			this.WIDTH,
			this.WIDTH,
			this.renderer,
		)

		const positionShader = `
            uniform float t;
            uniform float numTubes;
            uniform float cylinderRadius;
            uniform float waveAmplitude;
            uniform float waveFrequency;
            
            void main() {
                vec2 uv = gl_FragCoord.xy / resolution.xy;
                float pointIndex = uv.x * ${this.params.numPoints}.0;
                float tubeIndex = uv.y * numTubes;
                
                // Calculate vertical position (y)
                float y = (pointIndex / ${this.params.numPoints}.0) * 10.0 - 5.0;
                
                // Calculate angle for this tube
                float angle = (tubeIndex / numTubes) * 2.0 * 3.14159;
                
                // Add wave motion
                float wave = sin(y * waveFrequency + t) * waveAmplitude;
                
                // Calculate position on cylinder
                float x = (cylinderRadius + wave) * cos(angle);
                float z = (cylinderRadius + wave) * sin(angle);
                
                gl_FragColor = vec4(x, y, z, 1.0);
            }
        `

		const positionTexture = this.gpuCompute.createTexture()
		this.positionVariable = this.gpuCompute.addVariable(
			"texturePosition",
			positionShader,
			positionTexture,
		)

		this.positionVariable.material.uniforms.t = { value: this.params.t }
		this.positionVariable.material.uniforms.numTubes = {
			value: this.params.numTubes,
		}
		this.positionVariable.material.uniforms.cylinderRadius = {
			value: this.params.cylinderRadius,
		}
		this.positionVariable.material.uniforms.waveAmplitude = {
			value: this.params.waveAmplitude,
		}
		this.positionVariable.material.uniforms.waveFrequency = {
			value: this.params.waveFrequency,
		}

		this.gpuCompute.init()
	}

	createUnifiedTubes() {
		// Remove existing tubes
		this.tubes.forEach((tube) => this.scene.remove(tube))
		this.tubes = []

		const material = new THREE.ShaderMaterial({
			uniforms: {
				texturePosition: { value: null },
				numPoints: { value: this.params.numPoints },
				tubeIndex: { value: 0 },
				tubeRadius: { value: this.params.tubeRadius },
			},
			vertexShader: `
                uniform sampler2D texturePosition;
                uniform float numPoints;
                uniform float tubeIndex;
                uniform float tubeRadius;
                
                varying vec3 vNormal;
                
                void main() {
                    vec2 uv = vec2(position.x / numPoints, tubeIndex);
                    vec4 pos = texture2D(texturePosition, uv);
                    vec3 transformed = vec3(pos.x, pos.y, pos.z);
                    
                    vec3 tangent = normalize(vec3(-pos.z, 0.0, pos.x));
                    vec3 bitangent = cross(normal, tangent);
                    
                    vec3 newPosition = transformed + normal * tubeRadius;
                    
                    vNormal = normal;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
                }
            `,
			fragmentShader: `
                varying vec3 vNormal;
                
                void main() {
                    vec3 normal = normalize(vNormal);
                    float intensity = dot(normal, vec3(1.0, 1.0, 1.0));
                    gl_FragColor = vec4(vec3(1.0), 1.0);
                }
            `,
			side: THREE.DoubleSide,
		})

		for (let i = 0; i < this.params.numTubes; i++) {
			const tube = new THREE.Mesh(
				new THREE.CylinderGeometry(
					this.params.cylinderRadius,
					this.params.cylinderRadius,
					10,
					this.params.radialSegments,
					1,
					true,
				),
				material,
			)

			tube.material.uniforms.texturePosition.value =
				this.gpuCompute.getCurrentRenderTarget(this.positionVariable).texture
			tube.material.uniforms.tubeIndex.value = i
			tube.position.y = 5
			tube.rotation.x = Math.PI / 2

			this.tubes.push(tube)
			this.scene.add(tube)
		}
	}

	updateComputeUniforms() {
		this.positionVariable.material.uniforms.t.value = this.params.t
		this.positionVariable.material.uniforms.numTubes.value =
			this.params.numTubes
		this.positionVariable.material.uniforms.cylinderRadius.value =
			this.params.cylinderRadius
		this.positionVariable.material.uniforms.waveAmplitude.value =
			this.params.waveAmplitude
		this.positionVariable.material.uniforms.waveFrequency.value =
			this.params.waveFrequency
	}

	render = () => {
		if (this.params.animate) {
			this.params.t += this.params.rotationSpeed
			this.updateComputeUniforms()
		}

		this.controls.update()
		this.renderer.render(this.scene, this.camera)
		this.rafId = requestAnimationFrame(this.render)
	}

	addDebug() {
		const gui = new GUI()
		const folder = gui.addFolder("Tube Parameters")

		folder.add(this.params, "animate")
		folder.add(this.params, "rotationSpeed", 0.001, 0.1)
		folder.add(this.params, "cylinderRadius", 1, 10).onChange(() => {
			this.updateComputeUniforms()
			this.createUnifiedTubes()
		})
		folder.add(this.params, "waveAmplitude", 0, 2).onChange(() => {
			this.updateComputeUniforms()
			this.createUnifiedTubes()
		})
		folder.add(this.params, "waveFrequency", 0, 2).onChange(() => {
			this.updateComputeUniforms()
			this.createUnifiedTubes()
		})
		folder.add(this.params, "numPoints", 10, 500).onChange(() => {
			this.params.numPoints = Math.floor(this.params.numPoints)
			this.updateComputeUniforms()
			this.createUnifiedTubes()
		})
		folder.add(this.params, "numTubes", 1, 50).onChange(() => {
			this.updateComputeUniforms()
			this.createUnifiedTubes()
		})
		folder.add(this.params, "tubeRadius", 0.01, 0.5).onChange(() => {
			this.createUnifiedTubes()
		})
		folder
			.add(this.params, "radialSegments", 3, 20)
			.step(1)
			.onChange(() => {
				this.createUnifiedTubes()
			})

		folder.open()
	}

	resize() {
		this.renderer.setSize(window.innerWidth, window.innerHeight)
		this.camera.aspect = window.innerWidth / window.innerHeight
		this.camera.updateProjectionMatrix()
	}

	destroy() {
		this.renderer.dispose()
		this.controls.dispose()
		this.scene.remove(...this.scene.children)
		this.gpuCompute.dispose()
		if (this.rafId) cancelAnimationFrame(this.rafId)
		window.removeEventListener("resize", this.resize.bind(this))
	}
}

export default Sketch
