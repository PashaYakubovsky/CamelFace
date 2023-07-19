import * as THREE from 'three';
import db from '../lib/posts.json';
import { getPhoto } from '$lib/api';

const fragmentShader = `
	uniform float time;
	uniform sampler2D texture1;
	uniform float distanceFromCenter;
	uniform vec4 resolution;
	varying vec2 vUv;
	varying vec3 vPosition;
	float PI = 3.141592653589793238;

	void main() {
		vec4 t = texture2D(texture1, vUv);

		float bw = (t.r + t.g + t.b) / 3.0;
		vec4 another = vec4(bw, bw, bw, 2.0);

		gl_FragColor = t;

		gl_FragColor = mix(another, t, distanceFromCenter);
		gl_FragColor.a = clamp(distanceFromCenter, 0.5, 1.0);
	}
`;

const vertexShader = `
	uniform float time;
	varying vec2 vUv;
	varying vec3 vPosition;
	uniform vec2 pixels;
	float PI = 3.141592653589793238;
	uniform float distanceFromCenter;

	void main() {
		vUv = (uv - vec2(0.5))*(0.8 - 0.2*distanceFromCenter*(2. - distanceFromCenter)) + vec2(0.5);
		vec3 pos = position;
		pos.y += sin(PI*uv.x)*0.05;
		pos.z += sin(PI*uv.y)*0.05;
		
		pos.y += sin(time*0.3)*0.03;
		vUv.y -= sin(time*0.3)*0.02;

		gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
	}
`;

class TravelGalleryScene {
	private scene: THREE.Scene = new THREE.Scene();
	public camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
		75,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	);
	public renderer: THREE.WebGLRenderer | null = null;
	private materials: THREE.ShaderMaterial[] = [];
	private material: THREE.ShaderMaterial | null = null;
	private geometry: THREE.PlaneGeometry | null = null;
	public groups: THREE.Group[] = [];
	public meshes: THREE.Mesh[] = [];
	public eulerValues = {
		y: -0.3,
		x: -0.4,
		z: -0.3
	};
	private time = 0;
	public backgroundColors = [
		'#c19ce9',
		'#230c75',
		'#140c0b',
		'#c19ce9',
		'#230c75',
		'#140c0b',
		'#c19ce9',
		'#230c75',
		'#140c0b'
	];

	constructor(canvasElement: HTMLCanvasElement) {
		this.renderer = new THREE.WebGLRenderer({
			canvas: canvasElement,
			antialias: true,
			alpha: true,
			powerPreference: 'high-performance',
			precision: 'highp'
		});

		this.camera.position.set(0, 0, 3);

		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		window.addEventListener('resize', () => this.resize());

		this.addObjects();

		this.animate();

		this.scene.add(this.camera);
	}

	private addObjects() {
		this.material = new THREE.ShaderMaterial({
			side: THREE.DoubleSide,
			extensions: {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				derivatives: '#extension GL_OES_standard_derivatives : enable'
			},
			uniforms: {
				time: { value: 0 } as THREE.IUniform,
				texture1: { value: null, type: 't' } as THREE.IUniform,
				resolutions: { value: new THREE.Vector4(), type: 'v4' } as THREE.IUniform,
				distanceFromCenter: { value: 0, type: 'f' } as THREE.IUniform,
				pixels: { value: new THREE.Vector2(1, 1), type: 'v2' } as THREE.IUniform
			},
			vertexShader,
			fragmentShader,
			transparent: true
		});

		this.geometry = new THREE.PlaneGeometry(1.6, 1.2, 32, 32);
	}
	public async addGallery() {
		const images = [];

		for (let i = 0; i < db.posts.length; i++) {
			const img = document.createElement('img');
			img.src = await getPhoto();
			img.crossOrigin = 'anonymous';
			images.push(img);
		}

		images.forEach((img, index) => {
			if (!this.material || !this.geometry) return;

			const texture = new THREE.Texture(img);
			const material = this.material.clone();

			const group = new THREE.Group();

			material.uniforms.texture1.value = texture;
			material.uniforms.texture1.value.needsUpdate = true;

			const mesh = new THREE.Mesh(this.geometry, material);

			group.add(mesh);

			mesh.position.y = index * 1.2;
			mesh.position.x = 1.2;

			group.rotation.set(this.eulerValues.x, this.eulerValues.y, this.eulerValues.z);

			this.scene.add(group);

			this.meshes.push(mesh);
			this.materials.push(material);
			this.groups.push(group);
		});
	}

	public resize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();

		if (this.renderer) this.renderer.setSize(window.innerWidth, window.innerHeight);
	}

	private animate() {
		requestAnimationFrame(() => this.animate());

		if (this.renderer) this.renderer.render(this.scene, this.camera);

		this.time += 0.05;

		this.materials.forEach((material) => {
			material.uniforms.time.value = this.time;
		});
	}
}

export default TravelGalleryScene;
