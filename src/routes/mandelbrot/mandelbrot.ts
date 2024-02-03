import * as THREE from 'three';
import vertexShader from './vertexShader.glsl';
import fragmentShader from './fragmentShader.glsl';
import { GUI } from 'lil-gui';

const options = {
	Color: '#8fe9ff',
	['Scroll mode']: true,
	['Recursive step']: 100,
	['Mouse mode']: true
};

class MandelbrotScene {
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
	private gui: GUI | null = null;

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
		this.animate();

		window.addEventListener('mousemove', this.onMouseMove.bind(this));
		window.addEventListener('resize', this.onResize.bind(this));
		window.addEventListener('wheel', this.onMouseWheel.bind(this));
		window.addEventListener('keypress', this.mousePressed.bind(this));
	}

	public addControls() {
		this.gui = new GUI();
		if (!this.material) return;

		this.gui.addColor(options, 'Color').onChange(() => {
			if (!this.material) return;
			this.material.uniforms.u_color.value = new THREE.Color(options.Color);
			this.material.needsUpdate = true;
		});

		this.gui.add(options, 'Scroll mode').onChange(() => {
			if (!this.material) return;
			this.material.uniforms.u_scroll_mode.value = options['Scroll mode'];
			this.material.needsUpdate = true;
		});

		this.gui.add(options, 'Recursive step', 1, 1000).onChange(() => {
			if (!this.material) return;
			this.material.uniforms.u_m_count.value = options['Recursive step'];
			this.material.needsUpdate = true;
		});

		// add tooltip for mouse mode
		this.gui
			.addFolder('Mouse mode (press M to change)')
			.add(options, 'Mouse mode')
			.onChange(() => {
				if (!this.material) return;
				this.material.uniforms.u_mouse_mode.value = options['Mouse mode'];
				this.material.needsUpdate = true;
			});
	}

	public mousePressed(e: KeyboardEvent) {
		// if press M then change the mouse mode
		if (e.key === 'm') {
			options['Mouse mode'] = !options['Mouse mode'];
			if (!this.material) return;
			this.material.uniforms.u_mouse_mode.value = options['Mouse mode'];
			this.material.needsUpdate = true;
		}
	}

	public init() {
		// convert window.innerWidth and window.innerHeight to floats
		// and pass them to the shader as a vector3
		const dif = window.innerWidth / window.innerHeight;
		this.geometry = new THREE.PlaneGeometry(2 * dif, 2, 1, 1);

		this.material = new THREE.ShaderMaterial({
			side: THREE.DoubleSide,
			uniforms: {
				u_time: { value: 0 },
				u_resolution: { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1) },
				u_mouse: { value: new THREE.Vector2() },
				u_color: { value: new THREE.Color(options.Color) },
				u_zoom: { value: 1 },
				u_scroll_mode: { value: options['Scroll mode'] },
				u_m_count: { value: options['Recursive step'] },
				u_mouse_mode: { value: options['Mouse mode'] }
			},
			vertexShader,
			fragmentShader
		});

		const mesh = new THREE.Mesh(this.geometry, this.material);

		this.camera.lookAt(mesh.position);

		this.scene.add(mesh);
	}

	onMouseMove(event: MouseEvent) {
		if (!options['Mouse mode']) return;
		if (this.material) {
			const x = event.clientX;
			const y = event.clientY;
			this.material.uniforms.u_mouse.value.x = x;
			this.material.uniforms.u_mouse.value.y = y;
		}
	}

	onMouseWheel(event: WheelEvent) {
		if (!options['Scroll mode']) return;
		if (this.material && this.material.uniforms.u_zoom.value + event.deltaY * 0.1 > 1) {
			this.material.uniforms.u_zoom.value += event.deltaY * 0.1;
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
			this.material.uniforms.u_time.value += 0.001;
		}
		if (this.renderer) this.renderer.render(this.scene, this.camera);
	}
}

export default MandelbrotScene;
