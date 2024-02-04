import * as THREE from 'three';
import vertexShader from './vertexShader.glsl';
import fragmentShader from './fragmentShader.glsl';
import { GUI } from 'lil-gui';
import gsap from 'gsap';

const options = {
	Color: '#ff0000',
	['Scroll mode']: true,
	['Recursive step']: 100,
	['Mouse mode']: true,
	['Intensity']: 90
};

class LyapunovScene {
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
		this.setInitialValues();
		this.animate();

		window.addEventListener('mousemove', this.onMouseMove.bind(this));
		window.addEventListener('resize', this.onResize.bind(this));
		window.addEventListener('wheel', this.onMouseWheel.bind(this));
		window.addEventListener('keypress', this.mousePressed.bind(this));
		window.addEventListener('click', this.onClick.bind(this));
	}

	public setInitialValues() {
		const mouseMode = localStorage.getItem('mouseMode');
		const mousePosition = localStorage.getItem('mousePosition');

		if (mouseMode) {
			options['Mouse mode'] = mouseMode === 'true';
		}
		if (mousePosition) {
			const [x, y] = mousePosition.split(' ');
			if (this.material) {
				this.material.uniforms.u_mouse.value.x = parseFloat(x);
				this.material.uniforms.u_mouse.value.y = parseFloat(y);
			}
		}
	}

	public addControls() {
		this.gui = new GUI();

		this.gui.domElement.style.position = 'absolute';
		this.gui.domElement.style.top = '0';
		this.gui.domElement.style.right = '0';
		this.gui.domElement.addEventListener('click', (e) => {
			e.stopPropagation();
		});
		if (!this.material) return;

		this.gui.addColor(options, 'Color').onChange(() => {
			if (!this.material) return;
			this.material.uniforms.u_color.value = new THREE.Color(options.Color);
			this.material.needsUpdate = true;
		});

		this.gui.add(options, 'Intensity', 1, 100000).onChange(() => {
			if (this.material) this.material.uniforms.u_zoom.value = options['Intensity'];
		});
	}

	public mousePressed(e: KeyboardEvent) {
		if (e.key === '=' || e.key === '+' || e.key === '-') {
			if (this.material?.uniforms.u_zoom) {
				if (e.key === '-') {
					this.material.uniforms.u_zoom.value -= this.material.uniforms.u_zoom.value * 0.2;
				} else {
					this.material.uniforms.u_zoom.value += this.material.uniforms.u_zoom.value * 0.2;
				}
			}
		}
	}

	public init() {
		// convert window.innerWidth and window.innerHeight to floats
		// and pass them to the shader as a vector3
		const dif = window.innerWidth / window.innerHeight;
		this.geometry = new THREE.PlaneGeometry(2 * dif, 2, 10, 10);

		this.material = new THREE.ShaderMaterial({
			side: THREE.DoubleSide,
			uniforms: {
				u_time: { value: 0 },
				u_resolution: { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1) },
				u_mouse: { value: new THREE.Vector2() },
				u_color: { value: new THREE.Color(options.Color) },
				u_zoom: { value: options['Intensity'] },
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

			// save position to local storage
			localStorage.setItem('mousePosition', x + ' ' + y);
		}
	}
	public damping = 0.1;
	onMouseWheel(event: WheelEvent) {
		if (!options['Scroll mode']) return;
		if (this.material && this.material.uniforms.u_zoom.value + event.deltaY * 0.1 > 1) {
			const speed = this.material.uniforms.u_zoom.value * 0.2 * event.deltaY * 0.01;

			this.material.uniforms.u_zoom.value += speed;
			options['Intensity'] = this.material.uniforms.u_zoom.value;
			this.gui?.controllers[1].updateDisplay();

			// save zoom value to local storage
			localStorage.setItem('zoomValue', this.material.uniforms.u_zoom.value.toString());
		}
	}

	onClick() {
		this.dir *= -1;
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

	public dir = 1;

	public animate() {
		requestAnimationFrame(this.animate.bind(this));
		if (this.material) {
			this.material.uniforms.u_time.value += 0.002 * this.dir;
			if (this.material.uniforms.u_time.value > 5) {
				this.dir *= -1;
			}
			if (this.material.uniforms.u_time.value < -10) {
				this.dir *= -1;
			}
		}
		if (this.renderer) this.renderer.render(this.scene, this.camera);
	}
}

export default LyapunovScene;
