import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import vertexShader from './vertexShader.glsl';
import fragmentShader from './fragmentShader.glsl';
import { GUI } from 'lil-gui';

class FluidsScene {
	private scene: THREE.Scene = new THREE.Scene();
	public camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
		75,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	);
	public renderer: THREE.WebGLRenderer | null = null;
	private material: THREE.ShaderMaterial | null = null;
	private geometry: THREE.PlaneGeometry | null = null;
	private controls: OrbitControls | null = null;
	private gui: GUI | null = null;

	constructor(el: HTMLCanvasElement) {
		this.camera.position.z = 1;
		this.renderer = new THREE.WebGLRenderer({
			canvas: el
		});

		this.renderer.setClearColor('#000000');
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		// this.controls = new OrbitControls(this.camera, this.renderer.domElement);

		this.init();
		this.addControls();
		this.animate();

		window.addEventListener('mousemove', this.onMouseMove.bind(this));
		window.addEventListener('resize', this.onResize.bind(this));
	}

	public addControls() {
		this.gui = new GUI();
		if (!this.material) return;
		const options = {
			Octaves: this.material.uniforms.u_octaves.value,
			Color: this.material.uniforms.u_color.value,
			['Lines count']: this.material.uniforms.u_count.value
		};

		this.gui.add(options, 'Octaves', 0, 500).onChange(() => {
			if (!this.material) return;
			this.material.uniforms.u_octaves.value = options.Octaves;
			this.material.needsUpdate = true;
		});

		this.gui.addColor(options, 'Color').onChange(() => {
			if (!this.material) return;
			this.material.uniforms.u_color.value = new THREE.Color(options.Color);
			this.material.needsUpdate = true;
		});

		this.gui.add(options, 'Lines count', 0, 1000).onChange(() => {
			if (!this.material) return;
			this.material.uniforms.u_count.value = options['Lines count'];
			this.material.needsUpdate = true;
		});
	}

	public init() {
		// // width and height 100% of the screen
		this.geometry = new THREE.PlaneGeometry(1, 0.9, 32, 32);
		// make geometry responsive
		this.geometry.scale(1.5, 1.5, 1.5);

		this.material = new THREE.ShaderMaterial({
			side: THREE.DoubleSide,
			uniforms: {
				u_time: { value: 0 },
				u_resolution: { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1) },
				u_mouse: { value: new THREE.Vector4() },
				u_octaves: { value: 4 },
				u_color: { value: new THREE.Color('#ffffff') },
				u_count: { value: 300 }
			},
			vertexShader,
			fragmentShader
		});

		const mesh = new THREE.Mesh(this.geometry, this.material);

		this.camera.lookAt(mesh.position);

		this.scene.add(mesh);
	}

	onMouseMove(event: MouseEvent) {
		if (this.material) {
			this.material.uniforms.u_mouse.value.x = event.clientX;
			this.material.uniforms.u_mouse.value.y = event.clientY;
		}
	}

	onResize() {
		if (this.material) {
			this.material.uniforms.u_resolution.value.x = window.innerWidth;
			this.material.uniforms.u_resolution.value.y = window.innerHeight;
		}

		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();

		this.renderer?.setSize(window.innerWidth, window.innerHeight);
	}

	public animate() {
		requestAnimationFrame(this.animate.bind(this));
		if (this.material) {
			this.material.uniforms.u_time.value += 0.006;
		}
		if (this.renderer) this.renderer.render(this.scene, this.camera);
	}
}

export default FluidsScene;
