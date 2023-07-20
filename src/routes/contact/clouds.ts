import * as THREE from 'three';
import vertexShader from './vertexShader.glsl';
import fragmentShader from './fragmentShader.glsl';

class cloudsScene {
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

	constructor(el: HTMLCanvasElement) {
		this.camera.position.z = 1;
		this.renderer = new THREE.WebGLRenderer({
			canvas: el
		});
		this.renderer.setClearColor('#000000');
		this.renderer.setSize(window.innerWidth, window.innerHeight);

		this.init();
		this.animate();

		window.addEventListener('mousemove', this.onMouseMove.bind(this));
		window.addEventListener('resize', this.onResize.bind(this));
	}

	public init() {
		// width and height 100% of the screen
		this.geometry = new THREE.PlaneGeometry(5, 5, 32, 32);
		// make geometry responsive
		this.geometry.scale(1.5, 1.5, 1.5);

		this.material = new THREE.ShaderMaterial({
			side: THREE.DoubleSide,
			uniforms: {
				u_time: { value: 0 },
				u_resolution: { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1) },
				u_mouse: { value: new THREE.Vector4() }
			},
			vertexShader,
			fragmentShader
		});

		const mesh = new THREE.Mesh(this.geometry, this.material);

		mesh.position.x = 0;
		mesh.position.y = 0;
		mesh.position.z = 0;

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
			this.material.uniforms.u_time.value += 0.01;
		}
		if (this.renderer) this.renderer.render(this.scene, this.camera);
	}
}

export default cloudsScene;
