import * as THREE from "three"
import { GUI } from "lil-gui"
import gsap from "$gsap"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { Boid } from "./Boid"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"
import { Sky } from "three/addons/objects/Sky.js"
import Stats from "stats.js"

const options = {
	Color: "#8fe9ff",
}

class BoidsScene {
	scene: THREE.Scene = new THREE.Scene()
	camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
		75,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	)
	renderer: THREE.WebGLRenderer | null = null
	material: THREE.ShaderMaterial | null = null
	geometry: THREE.BufferGeometry | null = null
	loaderGltf: GLTFLoader | null = null
	gui: GUI | null = null
	stats = new Stats()
	rotation = new THREE.Vector3(0, 0, 0)
	controls: OrbitControls | null = null
	mousePos = { x: 0, y: 0 }
	flock: Boid[] = []
	birdGeometry: THREE.BufferGeometry | null = null
	config = {
		velocity: new THREE.Vector3(0.228, 0.215, 0.202),
		acceleration: new THREE.Vector3(86.22, 90.84, 90.84),
		force: 0.7,
		countOfBirds: 750,
		cohesionRadius: 0.05,
		alignmentRadius: 0.2,
		perceptionRadius: 0.1,
		aligmnetOn: true,
		separationOn: true,
		cohesionOn: true,
		speedFactor: 0.001,
		mouseBehavior: false,
		mouseBehaviorForce: 0.1,
	}
	mouse = new THREE.Vector3()
	sky: Sky | null = null
	birdTexture: THREE.Texture | null = null

	instancedMesh: THREE.InstancedMesh | null = null

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

			this.stats.showPanel(0)
			document.body.appendChild(this.stats.dom)
		}

		const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
		this.scene.add(ambientLight)
		this.addSky()

		this.loaderGltf = new GLTFLoader()
		this.loaderGltf.load("/Hummingbird.glb", (gltf) => {
			const mesh = gltf.scene.children[0] as THREE.Mesh
			this.birdGeometry = mesh.geometry
			this.birdGeometry.scale(0.0005, 0.0005, 0.0005)
			// set initial rotation based on velocity
			const quaternion = new THREE.Quaternion()
			quaternion.setFromUnitVectors(
				new THREE.Vector3(0, 1, 0),
				this.config.velocity.clone().normalize()
			)
			mesh.setRotationFromQuaternion(quaternion)

			// get texture from gltf
			const texture = gltf.scene.children[0] as THREE.Mesh
			const material = texture.material as THREE.MeshBasicMaterial
			this.birdTexture = material.map

			this.init()
		})

		if (this.renderer) {
			this.controls = new OrbitControls(this.camera, this.renderer.domElement)

			window.addEventListener("mousemove", this.onMouseMove.bind(this))
			window.addEventListener("resize", this.onResize.bind(this))
			window.addEventListener("wheel", this.onMouseWheel.bind(this))
		}
	}

	public init() {
		this.createBoids()
		this.addControls()
		this.animate()
	}

	createBoids() {
		this.geometry = this.birdGeometry

		const count = this.config.countOfBirds

		this.material = new THREE.MeshBasicMaterial({
			color: 0xffffff,
		}) as unknown as THREE.ShaderMaterial
		this.material.onBeforeCompile = (shader) => {
			this.material = shader as unknown as THREE.ShaderMaterial

			shader.uniforms.uTime = { value: 0 }
			shader.uniforms.uColor = { value: new THREE.Color(options.Color) }
			shader.uniforms.uResolution = {
				value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1),
			}
			shader.uniforms.uMouse = { value: new THREE.Vector2() }
			shader.uniforms.uZoom = { value: 1 }
			shader.uniforms.uCameraPos = { value: new THREE.Vector3(0, 0, 0) }
			shader.uniforms.uTexture = { value: this.birdTexture }

			shader.fragmentShader = `
				uniform vec3 uColor;
				uniform float uTime;
				uniform vec2 uResolution;
				uniform vec2 uMouse;
				uniform float uZoom;
				uniform vec3 uCameraPos;
				varying vec3 vNormal;
				uniform sampler2D uTexture;

				void main() {
					vec2 uv = gl_FragCoord.xy / uResolution.xy;
					vec3 color = uColor;

					// time varying pixel color
					color = mix(uColor, vec3(0.5 + 0.5 * cos(uTime + uv.xyx + vec3(0, 2, 4))), .5);

					// texture
					vec4 tex = texture2D(uTexture,vec2(
						0.5 + atan(vNormal.z, vNormal.x) / 6.28318530718,
						0.5 - asin(vNormal.y) / 3.14159265359
					));

					gl_FragColor = tex;
				}
			`

			shader.vertexShader = `
				uniform float uTime;
				uniform float uZoom;
				uniform vec3 uCameraPos;
				varying vec3 vNormal;
				uniform sampler2D uTexture;
				// vertex shader for instanced mesh geometry
				// add noise to the position


				//	Simplex 3D Noise 
				//	by Ian McEwan, Ashima Arts
				//
				vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
				vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

				float snoise(vec3 v){ 
				const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
				const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

				// First corner
				vec3 i  = floor(v + dot(v, C.yyy) );
				vec3 x0 =   v - i + dot(i, C.xxx) ;

				// Other corners
				vec3 g = step(x0.yzx, x0.xyz);
				vec3 l = 1.0 - g;
				vec3 i1 = min( g.xyz, l.zxy );
				vec3 i2 = max( g.xyz, l.zxy );

				//  x0 = x0 - 0. + 0.0 * C 
				vec3 x1 = x0 - i1 + 1.0 * C.xxx;
				vec3 x2 = x0 - i2 + 2.0 * C.xxx;
				vec3 x3 = x0 - 1. + 3.0 * C.xxx;

				// Permutations
				i = mod(i, 289.0 ); 
				vec4 p = permute( permute( permute( 
							i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
						+ i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
						+ i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

				// Gradients
				// ( N*N points uniformly over a square, mapped onto an octahedron.)
				float n_ = 1.0/7.0; // N=7
				vec3  ns = n_ * D.wyz - D.xzx;

				vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

				vec4 x_ = floor(j * ns.z);
				vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

				vec4 x = x_ *ns.x + ns.yyyy;
				vec4 y = y_ *ns.x + ns.yyyy;
				vec4 h = 1.0 - abs(x) - abs(y);

				vec4 b0 = vec4( x.xy, y.xy );
				vec4 b1 = vec4( x.zw, y.zw );

				vec4 s0 = floor(b0)*2.0 + 1.0;
				vec4 s1 = floor(b1)*2.0 + 1.0;
				vec4 sh = -step(h, vec4(0.0));

				vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
				vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

				vec3 p0 = vec3(a0.xy,h.x);
				vec3 p1 = vec3(a0.zw,h.y);
				vec3 p2 = vec3(a1.xy,h.z);
				vec3 p3 = vec3(a1.zw,h.w);

				//Normalise gradients
				vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
				p0 *= norm.x;
				p1 *= norm.y;
				p2 *= norm.z;
				p3 *= norm.w;

				// Mix final noise value
				vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
				m = m * m;
				return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
												dot(p2,x2), dot(p3,x3) ) );
				}


				void main() {
					vec3 transformed = position.xyz;;
					vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(transformed, 1.0);
					gl_Position = projectionMatrix * mvPosition;
					// normal
					vNormal = normalMatrix * normal;
				}
			`
		}

		if (!this.geometry) return

		const mesh = new THREE.InstancedMesh(this.geometry, this.material, count)
		mesh.frustumCulled = true

		this.instancedMesh = mesh

		this.scene.add(mesh)

		const flock = []

		const dummy = new THREE.Object3D()

		for (let i = 0; i < count; i++) {
			const x = gsap.utils.random(-1, 1)
			const y = gsap.utils.random(-1, 1)
			const z = gsap.utils.random(-1, 1)

			dummy.position.set(x, y, z)

			const boid = new Boid({
				pos: { x, y, z },
				force: this.config.force,
				velocity: this.config.velocity,
				acceleration: this.config.acceleration,
				mesh: dummy,
				cohesionRadius: this.config.cohesionRadius,
				alignmentRadius: this.config.alignmentRadius,
				perceptionRadius: this.config.perceptionRadius,
				index: i,
				instanceMesh: mesh,
				__modules: {
					aligment: this.config.aligmnetOn,
					cohesion: this.config.cohesionOn,
					separation: this.config.separationOn,
				},
			})

			// set position
			mesh.setMatrixAt(i, dummy.matrix)
			dummy.updateMatrix()

			flock.push(boid)
		}

		this.flock = flock

		mesh.instanceMatrix.needsUpdate = true
	}

	onMouseMove(event: MouseEvent) {
		if (this.material) {
			const x = event.clientX
			const y = event.clientY
			this.material.uniforms.uMouse.value.x = x
			this.material.uniforms.uMouse.value.y = y
		}

		this.mousePos.x = event.clientX
		this.mousePos.y = event.clientY

		this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
		this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
	}

	onMouseWheel(event: WheelEvent) {
		if (this.material) {
			const speed = event.deltaY * 0.01
			this.material.uniforms.uZoom.value += speed
		}
	}

	onResize() {
		if (this.material) {
			this.material.uniforms.uResolution.value.x = window.innerWidth
			this.material.uniforms.uResolution.value.y = window.innerHeight
		}

		this.camera.aspect = window.innerWidth / window.innerHeight
		this.camera.updateProjectionMatrix()

		this.renderer?.setSize(window.innerWidth, window.innerHeight)
	}

	drawFlocks() {
		const maxPos = 8
		this.flock.forEach((boid, i) => {
			// add direction from mouse
			if (this.config.mouseBehavior) {
				const mouse = new THREE.Vector3(this.mouse.x, this.mouse.y, 0)
				const dir = new THREE.Vector3().subVectors(mouse, boid.position)
				dir.normalize()
				boid.acceleration.add(
					dir.multiplyScalar(this.config.mouseBehaviorForce)
				)
			}

			boid.flock(this.flock)
			boid.update()
			boid.show()

			const d = this.flock[i].position.distanceTo(new THREE.Vector3(0, 0, 0))
			if (maxPos < d) {
				boid.position = new THREE.Vector3(
					gsap.utils.random(0, 0.2),
					gsap.utils.random(0, 0.2),
					gsap.utils.random(0, 0.2)
				)
			}
		})

		if (this.instancedMesh) this.instancedMesh.instanceMatrix.needsUpdate = true
	}

	clock = new THREE.Clock()
	rafId: number | null = null

	public animate() {
		this.rafId = requestAnimationFrame(this.animate.bind(this))

		this.drawFlocks()

		this.stats.update()

		if (this.material && this.material.uniforms?.uTime) {
			this.material.uniforms.uTime.value += 0.001
		}
		if (this.renderer) this.renderer.render(this.scene, this.camera)
		if (this.material && this.material.uniforms?.uCameraPos)
			this.material.uniforms.uCameraPos.value = this.camera.position
		if (this.instancedMesh) this.instancedMesh.instanceMatrix.needsUpdate = true

		// change day time in sky
		if (this.sky && "azimuth" in this.sky.material.uniforms) {
			this.sky.material.uniforms["azimuth"].value =
				Math.sin(this.clock.getElapsedTime() * 0.1) * 2 * Math.PI
		}
	}

	private addSky() {
		// add sky
		this.sky = new Sky()
		const sun = new THREE.Vector3()
		this.scene.add(this.sky)

		// scale
		this.sky.scale.setScalar(200)

		const effectController = {
			turbidity: 10,
			rayleigh: 1,
			mieCoefficient: 0.005,
			mieDirectionalG: 0.7,
			elevation: 2,
			azimuth: 180,
			exposure: this.renderer?.toneMappingExposure,
		}

		const updateSky = () => {
			if (!this.sky) return
			const uniforms = this.sky.material.uniforms
			uniforms["turbidity"].value = effectController.turbidity
			uniforms["rayleigh"].value = effectController.rayleigh
			uniforms["mieCoefficient"].value = effectController.mieCoefficient
			uniforms["mieDirectionalG"].value = effectController.mieDirectionalG

			const phi = THREE.MathUtils.degToRad(90 - effectController.elevation)
			const theta = THREE.MathUtils.degToRad(effectController.azimuth)

			sun.setFromSphericalCoords(1, phi, theta)

			uniforms["sunPosition"].value.copy(sun)
			if (!this.renderer || !effectController.exposure) return
			this.renderer.toneMappingExposure = effectController.exposure
			this.renderer.render(this.scene, this.camera)
		}
		updateSky()
	}

	private addControls() {
		this.gui = new GUI()
		this.gui.close()
		if (!this.material) return

		const recreatecountOfBirds = () => {
			this.flock.forEach((boid) => {
				if (boid.mesh) {
					this.scene.remove(boid.mesh)
					boid.remove()
				}
			})

			if (this.instancedMesh) {
				this.scene.remove(this.instancedMesh)
				this.instancedMesh = null
			}

			this.flock = []
			this.createBoids()
		}

		const boid = this.gui.addFolder("boid algorithm")

		boid
			.add(this.config, "speedFactor", 0, 0.1)
			.step(0.001)
			.name("Speed Factor")
			.onChange(() => {
				this.flock.forEach((boid) => {
					boid.speedFactor = this.config.speedFactor
				})
			})

		const vel = boid.addFolder("Velocity")

		vel
			.add(this.config.velocity, "x", 0, 1)
			.step(0.001)
			.name("Velocity X")
			.onFinishChange(() => {
				this.flock.forEach((boid) => {
					boid.velocity = new THREE.Vector3(
						gsap.utils.random(0, this.config.velocity.x),
						gsap.utils.random(0, this.config.velocity.y),
						gsap.utils.random(0, this.config.velocity.z)
					)
				})
			})
		vel
			.add(this.config.velocity, "y", 0, 1)
			.step(0.001)
			.name("Velocity Y")
			.onFinishChange(() => {
				this.flock.forEach((boid) => {
					boid.velocity = new THREE.Vector3(
						gsap.utils.random(0, this.config.velocity.x),
						gsap.utils.random(0, this.config.velocity.y),
						gsap.utils.random(0, this.config.velocity.z)
					)
				})
			})
		vel
			.add(this.config.velocity, "z", 0, 1)
			.step(0.001)
			.name("Velocity Z")
			.onFinishChange(() => {
				this.flock.forEach((boid) => {
					boid.velocity = new THREE.Vector3(
						gsap.utils.random(0, this.config.velocity.x),
						gsap.utils.random(0, this.config.velocity.y),
						gsap.utils.random(0, this.config.velocity.z)
					)
				})
			})

		const acceleration = boid.addFolder("Acceleration")

		acceleration
			.add(this.config.acceleration, "x", 0, 100)
			.step(0.01)
			.name("Acceleration X")
			.onFinishChange(() => {
				this.flock.forEach((boid) => {
					boid.acceleration = this.config.acceleration
				})
			})
		acceleration
			.add(this.config.acceleration, "y", 0, 100)
			.step(0.01)
			.name("Acceleration Y")
			.onFinishChange(() => {
				this.flock.forEach((boid) => {
					boid.acceleration = this.config.acceleration
				})
			})
		acceleration
			.add(this.config.acceleration, "z", 0, 100)
			.step(0.01)
			.name("Acceleration Z")
			.onFinishChange(() => {
				this.flock.forEach((boid) => {
					boid.acceleration = this.config.acceleration
				})
			})

		this.gui
			.add(this.config, "countOfBirds", 1, 2000)
			.step(1)
			.name("countOfBirds")
			.onFinishChange(recreatecountOfBirds)

		this.gui
			.add(this.config, "cohesionOn")
			.name("Cohesion On/Off")
			.onFinishChange(() => {
				this.flock.forEach((boid) => {
					boid._modules.cohesion = this.config.cohesionOn
				})
			})
		this.gui
			.add(this.config, "cohesionRadius", 0, 1)
			.step(0.01)
			.name("Cohesion Radius")
			.onFinishChange(() => {
				this.flock.forEach((boid) => {
					boid.cohesionRadius = this.config.cohesionRadius
				})
			})

		this.gui
			.add(this.config, "aligmnetOn")
			.name("Alignment On/Off")
			.onFinishChange(() => {
				this.flock.forEach((boid) => {
					boid._modules.aligment = this.config.aligmnetOn
				})
			})
		this.gui
			.add(this.config, "alignmentRadius", 0, 1)
			.step(0.01)
			.name("Alignment Radius")
			.onFinishChange(() => {
				this.flock.forEach((boid) => {
					boid.alignmentRadius = this.config.alignmentRadius
				})
			})

		this.gui
			.add(this.config, "separationOn")
			.name("Separation On/Off")
			.onFinishChange(() => {
				this.flock.forEach((boid) => {
					boid._modules.separation = this.config.separationOn
				})
			})
		this.gui
			.add(this.config, "perceptionRadius", 0, 10)
			.step(0.01)
			.name("Perception Radius")
			.onFinishChange(() => {
				this.flock.forEach((boid) => {
					boid.perceptionRadius = this.config.perceptionRadius
				})
			})

		// add mouse behavior
		const mouse = this.gui.addFolder("Mouse Behavior")
		mouse.add(this.config, "mouseBehavior").name("Mouse On/Off")
		mouse
			.add(this.config, "mouseBehaviorForce", 0, 1)
			.step(0.01)
			.name("Mouse Force")
		if (this.scene.fog) {
			this.gui?.addColor(this.scene.fog, "color").name("Fog Color")
			this.gui?.add(this.scene.fog, "near", 0, 100).name("Fog Near")
			this.gui?.add(this.scene.fog, "far", 0, 100).name("Fog Far")
		}

		// add reset button
		this.gui.add({ reset: recreatecountOfBirds }, "reset").name("Reset")
	}

	destroy() {
		window.removeEventListener("mousemove", this.onMouseMove.bind(this))
		window.removeEventListener("resize", this.onResize.bind(this))
		window.removeEventListener("wheel", this.onMouseWheel.bind(this))

		if (this.gui) this.gui.destroy()
		if (this.controls) this.controls.dispose()
		if (this.renderer) this.renderer.dispose()
		this.stats.dom.remove()

		if (this.rafId) cancelAnimationFrame(this.rafId)
	}
}

export default BoidsScene
