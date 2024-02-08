import * as THREE from 'three';
import vertexShader from './vertexShader.glsl';
import fragmentShader from './fragmentShader.glsl';
import { GUI } from 'lil-gui';
import gsap from 'gsap';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Boid } from './Boid';
import { createNoise3D } from 'simplex-noise';

const options = {
	Color: '#8fe9ff'
};

class BoidsScene {
	private scene: THREE.Scene = new THREE.Scene();
	public camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
		75,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	);
	public renderer: THREE.WebGLRenderer | null = null;
	private material: THREE.ShaderMaterial | null = null;
	private geometry: THREE.BufferGeometry | null = null;
	private gui: GUI | null = null;
	controls: OrbitControls | null = null;
	mousePos = { x: 0, y: 0 };
	flock: Boid[] = [];
	config = {
		velocity: new THREE.Vector3(0.228, 0.215, 0.202),
		acceleration: new THREE.Vector3(86.22, 90.84, 90.84),
		force: 0.7,
		particles: 877,
		cohesionRadius: 0.61,
		alignmentRadius: 0.18,
		perceptionRadius: 3.06,
		aligmnetOn: true,
		separationOn: true,
		cohesionOn: true,
		speedFactor: 0.01
	};
	mouse = new THREE.Vector3();

	constructor(el: HTMLCanvasElement) {
		this.camera.position.z = 1;
		this.renderer = new THREE.WebGLRenderer({
			canvas: el
		});

		this.renderer.toneMapping = THREE.ReinhardToneMapping;
		this.renderer.setClearColor('#000000');
		this.renderer.setSize(window.innerWidth, window.innerHeight);

		this.init();
		this.addControls();
		this.setInitialValues();
		this.animate();

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);

		window.addEventListener('mousemove', this.onMouseMove.bind(this));
		window.addEventListener('resize', this.onResize.bind(this));
		window.addEventListener('wheel', this.onMouseWheel.bind(this));
		window.addEventListener('keypress', this.mousePressed.bind(this));
	}

	public init() {
		this.geometry = new THREE.BufferGeometry();

		this.material = new THREE.ShaderMaterial({
			side: THREE.DoubleSide,
			uniforms: {
				uTime: { value: 0 },
				uResolution: { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1) },
				uMouse: { value: new THREE.Vector2() },
				uColor: { value: new THREE.Color(options.Color) },
				uZoom: { value: 1 }
			},
			vertexShader,
			fragmentShader
		});

		this.geometry = new THREE.ConeGeometry(0.01, 0.03, 3);

		this.createBoids();
	}

	createBoids() {
		const noise = createNoise3D();
		// initialize the flock

		if (!this.material || !this.geometry) return;
		for (let i = 0; i < this.config.particles; i++) {
			const mesh = new THREE.Mesh(this.geometry.clone(), this.material);

			const pos = {
				x: noise(gsap.utils.random(-5, 5), gsap.utils.random(-5, 5), gsap.utils.random(-5, 5)),
				y: noise(gsap.utils.random(-5, 5), gsap.utils.random(-5, 5), gsap.utils.random(-5, 5)),
				z: noise(gsap.utils.random(-5, 5), gsap.utils.random(-5, 5), gsap.utils.random(-5, 5))
			};
			const boid = new Boid({
				pos: pos,
				force: this.config.force,
				velocity: new THREE.Vector3(
					gsap.utils.random(0, 0.1),
					gsap.utils.random(0, 0.1),
					gsap.utils.random(0, 0.1)
				),
				acceleration: this.config.acceleration,
				mesh,
				cohesionRadius: this.config.cohesionRadius,
				alignmentRadius: this.config.alignmentRadius,
				perceptionRadius: this.config.perceptionRadius
			});
			boid._modules.aligment = this.config.aligmnetOn;
			boid._modules.cohesion = this.config.cohesionOn;
			boid._modules.separation = this.config.separationOn;
			boid.speedFactor = this.config.speedFactor;
			this.flock.push(boid);
		}

		this.flock.forEach((boid) => {
			if (boid.mesh) {
				this.scene.add(boid.mesh);
			}
		});
	}

	onMouseMove(event: MouseEvent) {
		if (this.material) {
			const x = event.clientX;
			const y = event.clientY;
			this.material.uniforms.uMouse.value.x = x;
			this.material.uniforms.uMouse.value.y = y;
		}

		this.mousePos.x = event.clientX;
		this.mousePos.y = event.clientY;

		this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
		this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
	}

	onMouseWheel(event: WheelEvent) {
		if (this.material) {
			const speed = event.deltaY * 0.01;
			this.material.uniforms.uZoom.value += speed;
		}
	}

	onResize() {
		if (this.material) {
			this.material.uniforms.uResolution.value.x = window.innerWidth;
			this.material.uniforms.uResolution.value.y = window.innerHeight;
		}

		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();

		this.renderer?.setSize(window.innerWidth, window.innerHeight);
	}

	drawflock() {
		const maxPos = 5;
		this.flock.forEach((boid, i) => {
			boid.flock(this.flock);
			boid.update();
			boid.show();

			const d = this.flock[i].position.distanceTo(new THREE.Vector3(0, 0, 0));
			if (maxPos < d) {
				boid.position = new THREE.Vector3(
					gsap.utils.random(-5, 5),
					gsap.utils.random(-5, 5),
					gsap.utils.random(-5, 5)
				);
			}
		});
	}

	public animate() {
		requestAnimationFrame(this.animate.bind(this));

		this.drawflock();

		if (this.material) {
			this.material.uniforms.uTime.value += 0.001;
		}
		if (this.renderer) this.renderer.render(this.scene, this.camera);
	}

	public setInitialValues() {}

	public addControls() {
		this.gui = new GUI();
		if (!this.material) return;

		const recreateParticles = () => {
			this.flock.forEach((boid) => {
				if (boid.mesh) {
					this.scene.remove(boid.mesh);
					boid.remove();
				}
			});
			this.flock = [];
			this.createBoids();
		};

		this.gui.addColor(options, 'Color').onChange(() => {
			if (!this.material) return;
			this.material.uniforms.uColor.value = new THREE.Color(options.Color);
			this.material.needsUpdate = true;
		});

		const boid = this.gui.addFolder('boid algorithm');
		boid
			.add(this.config, 'force', 0, 10)
			.step(0.001)
			.name('Force')
			.onChange(() => {
				this.flock.forEach((boid) => {
					boid.force = this.config.force;
					boid.acceleration = this.config.acceleration;
					boid.velocity = new THREE.Vector3(
						gsap.utils.random(0, this.config.velocity.x),
						gsap.utils.random(0, this.config.velocity.y),
						gsap.utils.random(0, this.config.velocity.z)
					);
					boid.cohesionRadius = this.config.cohesionRadius;
					boid.alignmentRadius = this.config.alignmentRadius;
				});
			});

		boid
			.add(this.config, 'speedFactor', 0, 0.1)
			.step(0.001)
			.name('Speed Factor')
			.onChange(() => {
				this.flock.forEach((boid) => {
					boid.speedFactor = this.config.speedFactor;
				});
			});

		const vel = boid.addFolder('Velocity');

		vel
			.add(this.config.velocity, 'x', 0, 1)
			.step(0.001)
			.name('Velocity X')
			.onFinishChange(() => {
				this.flock.forEach((boid) => {
					boid.velocity = new THREE.Vector3(
						gsap.utils.random(0, this.config.velocity.x),
						gsap.utils.random(0, this.config.velocity.y),
						gsap.utils.random(0, this.config.velocity.z)
					);
				});
			});
		vel
			.add(this.config.velocity, 'y', 0, 1)
			.step(0.001)
			.name('Velocity Y')
			.onFinishChange(() => {
				this.flock.forEach((boid) => {
					boid.velocity = new THREE.Vector3(
						gsap.utils.random(0, this.config.velocity.x),
						gsap.utils.random(0, this.config.velocity.y),
						gsap.utils.random(0, this.config.velocity.z)
					);
				});
			});
		vel
			.add(this.config.velocity, 'z', 0, 1)
			.step(0.001)
			.name('Velocity Z')
			.onFinishChange(() => {
				this.flock.forEach((boid) => {
					boid.velocity = new THREE.Vector3(
						gsap.utils.random(0, this.config.velocity.x),
						gsap.utils.random(0, this.config.velocity.y),
						gsap.utils.random(0, this.config.velocity.z)
					);
				});
			});

		const acceleration = boid.addFolder('Acceleration');

		acceleration
			.add(this.config.acceleration, 'x', 0, 100)
			.step(0.01)
			.name('Acceleration X')
			.onFinishChange(() => {
				this.flock.forEach((boid) => {
					boid.acceleration = this.config.acceleration;
				});
			});
		acceleration
			.add(this.config.acceleration, 'y', 0, 100)
			.step(0.01)
			.name('Acceleration Y')
			.onFinishChange(() => {
				this.flock.forEach((boid) => {
					boid.acceleration = this.config.acceleration;
				});
			});
		acceleration
			.add(this.config.acceleration, 'z', 0, 100)
			.step(0.01)
			.name('Acceleration Z')
			.onFinishChange(() => {
				this.flock.forEach((boid) => {
					boid.acceleration = this.config.acceleration;
				});
			});

		this.gui
			.add(this.config, 'particles', 1, 1000)
			.step(1)
			.name('Particles')
			.onFinishChange(recreateParticles);

		this.gui
			.add(this.config, 'cohesionOn')
			.name('Cohesion On/Off')
			.onFinishChange(() => {
				this.flock.forEach((boid) => {
					boid._modules.cohesion = this.config.cohesionOn;
				});
			});
		this.gui
			.add(this.config, 'cohesionRadius', 0, 1)
			.step(0.01)
			.name('Cohesion Radius')
			.onFinishChange(() => {
				this.flock.forEach((boid) => {
					boid.cohesionRadius = this.config.cohesionRadius;
				});
			});

		this.gui
			.add(this.config, 'aligmnetOn')
			.name('Alignment On/Off')
			.onFinishChange(() => {
				this.flock.forEach((boid) => {
					boid._modules.aligment = this.config.aligmnetOn;
				});
			});
		this.gui
			.add(this.config, 'alignmentRadius', 0, 1)
			.step(0.01)
			.name('Alignment Radius')
			.onFinishChange(() => {
				this.flock.forEach((boid) => {
					boid.alignmentRadius = this.config.alignmentRadius;
				});
			});

		this.gui
			.add(this.config, 'separationOn')
			.name('Separation On/Off')
			.onFinishChange(() => {
				this.flock.forEach((boid) => {
					boid._modules.separation = this.config.separationOn;
				});
			});
		this.gui
			.add(this.config, 'perceptionRadius', 0, 10)
			.step(0.01)
			.name('Perception Radius')
			.onFinishChange(() => {
				this.flock.forEach((boid) => {
					boid.perceptionRadius = this.config.perceptionRadius;
				});
			});

		// add reset button
		this.gui.add({ reset: recreateParticles }, 'reset').name('Reset');
	}

	public mousePressed(e: KeyboardEvent) {}
}

export default BoidsScene;
