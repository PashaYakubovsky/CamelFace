import * as THREE from 'three';

const fragmentShader = `
	uniform float iTime;
	uniform vec3 iResolution;
	uniform vec4 iMouse;
	uniform sampler2D iChannel0;

	varying vec2 vUv;
	varying vec3 vPosition;

	void main() {
		vec4 t = texture2D(iChannel0, vUv);
		gl_FragColor = t;
	}
`;

const vertexShader = `
	uniform float time;
	varying vec2 vUv;
	varying vec3 vPosition;
	uniform vec2 pixels;
	float PI = 3.141592653589793238;

	void main() {
		vUv = uv;
		vec3 pos = position;

		pos.y += sin(time*0.3)*0.03;
		vUv.y -= sin(time*0.3)*0.02;

		gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
	}
`;

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
		this.camera.position.z = 5;
		this.renderer = new THREE.WebGLRenderer({
			canvas: el
		});
		this.renderer.setClearColor('#000000');
		this.renderer.setSize(window.innerWidth, window.innerHeight);

		this.init();
		this.animate();
	}

	public init() {
		// width and height 100% of the screen
		this.geometry = new THREE.PlaneGeometry(12, 12, 32, 32);

		const image = new Image();
		image.src = '/clouds.jpg';

		const texture = new THREE.Texture(image);
		texture.mapping = THREE.UVMapping;

		this.material = new THREE.ShaderMaterial({
			side: THREE.DoubleSide,
			extensions: {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				derivatives: '#extension GL_OES_standard_derivatives : enable'
			},
			uniforms: {
				iTime: { value: 0 },
				iResolution: { value: new THREE.Vector3() },
				iMouse: { value: new THREE.Vector4() },
				iChannel0: { value: texture }
			},
			vertexShader,
			fragmentShader
		});

		this.material.uniforms.iChannel0.value.needsUpdate = true;

		const mesh = new THREE.Mesh(this.geometry, this.material);

		mesh.position.x = 0;
		mesh.position.y = 0;
		mesh.position.z = 0;

		this.scene.add(mesh);
	}

	public animate() {
		requestAnimationFrame(this.animate.bind(this));
		if (this.material) this.material.uniforms.iTime.value += 0.01;
		if (this.renderer) this.renderer.render(this.scene, this.camera);
	}
}

export default cloudsScene;
