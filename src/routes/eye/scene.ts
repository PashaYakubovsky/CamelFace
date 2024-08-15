import * as THREE from 'three';
import vertexShader from './vertexShader.glsl';
import fragmentShader from './fragmentShader.glsl';
import eyeFragmentShader from './eyeFragmentShader.glsl';
import eyeVertexShader from './eyeVertexShader.glsl';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

class scene {
	scene: THREE.Scene = new THREE.Scene();
	camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
		75,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	);
	renderer: THREE.WebGLRenderer | null = null;
	material: THREE.ShaderMaterial | null = null;
	geometry: THREE.PlaneGeometry | null = null;
	composer: EffectComposer | null = null;
	eyeMaterial: CustomShaderMaterial | null = null;
	rafPos = new THREE.Vector2(0, 0);
	basePos = new THREE.Vector2(0, 0);
	clock = new THREE.Clock();
	rafId: number | null = null;

	constructor(
		el: HTMLCanvasElement | null,
		opt?: {
			renderToTarget?: boolean;
		}
	) {
		this.camera.position.z = 1;
		if (!opt?.renderToTarget && el) {
			this.renderer = new THREE.WebGLRenderer({
				canvas: el,
				antialias: true,
				alpha: true
			});
			this.renderer.setClearColor('#000000');
			this.renderer.setSize(window.innerWidth, window.innerHeight);
			this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		}

		this.init();
		this.animate();

		window.addEventListener('mousemove', this.onMouseMove.bind(this));
		window.addEventListener('click', this.handleClick.bind(this));
		window.addEventListener('resize', this.onResize.bind(this));
	}

	init() {
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

		// this.scene.add(mesh);

		// create eye
		const guiObject = {
			timeSpeed: 0.05,
			order: 1,
			degree: 1,
			lineWidth: 2.5,
			lineCount: 24,
			color2: '#fff',
			color1: '#000',
			easing: 'linear',
			radius: 0.1,
			rotation: Math.PI / 2,
			offsetX: 0,
			offsetY: 0,
			enableMouse: 1
		};
		const material = new CustomShaderMaterial({
			baseMaterial: THREE.MeshBasicMaterial,
			vertexShader: eyeVertexShader,
			fragmentShader: eyeFragmentShader,
			silent: true, // Disables the default warning if true
			uniforms: {
				uTime: new THREE.Uniform(0),
				uResolution: new THREE.Uniform(new THREE.Vector2(window.innerWidth, window.innerHeight)),
				uMouse: new THREE.Uniform(new THREE.Vector2(0, 0)),
				uOrder: new THREE.Uniform(guiObject.order),
				uDegree: new THREE.Uniform(guiObject.degree),
				uLineWidth: new THREE.Uniform(guiObject.lineWidth),
				uLineCount: new THREE.Uniform(guiObject.lineCount),
				uColor1: new THREE.Uniform(new THREE.Color(guiObject.color1)),
				uColor2: new THREE.Uniform(new THREE.Color(guiObject.color2)),
				uEasing: new THREE.Uniform(guiObject.easing),
				uRotation: new THREE.Uniform(guiObject.rotation),
				uRadius: new THREE.Uniform(guiObject.radius),
				uOffsetX: new THREE.Uniform(guiObject.offsetX),
				uOffsetY: new THREE.Uniform(guiObject.offsetY),
				uEnableMouse: new THREE.Uniform(guiObject.enableMouse)
			},
			side: THREE.DoubleSide
		});
		this.eyeMaterial = material;
		const geometry = new THREE.SphereGeometry(0.6, 64, 64);
		const plane = new THREE.Mesh(geometry, material);
		plane.castShadow = true;
		plane.receiveShadow = true;
		plane.position.z = 0.1;

		const wrapperSphere = new THREE.Mesh(
			new THREE.SphereGeometry(0.55, 32, 32),
			new THREE.MeshBasicMaterial({
				transparent: true,
				opacity: 0,
				depthTest: false,
				depthWrite: false
			})
		);
		wrapperSphere.castShadow = true;
		wrapperSphere.receiveShadow = true;
		this.scene.add(wrapperSphere);
		wrapperSphere.position.z = 0.1;

		this.scene.add(plane);

		if (!this.renderer) return;
		const renderPass = new RenderPass(this.scene, this.camera);
		const fxaaPass = new ShaderPass(FXAAShader);
		const outputPass = new OutputPass();
		const composer = new EffectComposer(this.renderer);
		const canvas = this.renderer.domElement;
		composer.setSize(canvas.offsetWidth, canvas.offsetHeight);

		const pixelRatio = window.devicePixelRatio;
		fxaaPass.material.uniforms['resolution'].value.x =
			1 / (this.renderer.domElement.offsetWidth * pixelRatio);
		fxaaPass.material.uniforms['resolution'].value.y =
			1 / (this.renderer.domElement.offsetHeight * pixelRatio);

		fxaaPass.renderToScreen = true;
		composer.addPass(renderPass);
		composer.addPass(fxaaPass);
		composer.addPass(outputPass);
		this.composer = composer;

		const force = () => {
			const rafPos = this.rafPos;
			rafPos.x = THREE.MathUtils.lerp(rafPos.x, this.basePos.x, 0.001);
			rafPos.y = THREE.MathUtils.lerp(rafPos.y, this.basePos.y, 0.001);

			plane.material.uniforms.uMouse.value = rafPos;

			this.rafId = requestAnimationFrame(force);
		};
		window.requestAnimationFrame(force);

		// add light
		const light = new THREE.AmbientLight(0xffffff, 1);
		this.scene.add(light);
		const dirLight = new THREE.DirectionalLight(0xffffff, 10);
		dirLight.castShadow = true;
		dirLight.position.set(-2, 10, 10);

		//Set up shadow properties for the light
		dirLight.shadow.mapSize.width = 512; // default
		dirLight.shadow.mapSize.height = 512; // default
		dirLight.shadow.camera.near = 0.5; // default
		dirLight.shadow.camera.far = 500; // default
		this.dirLight = dirLight;
		dirLight.lookAt(plane.position);

		this.scene.add(dirLight);
		this.clock.start();

		const walls = new THREE.Mesh(
			new THREE.PlaneGeometry(15, 15),
			new THREE.MeshPhysicalMaterial({
				color: new THREE.Color('#000'),
				side: THREE.DoubleSide,
				metalness: 0.8,
				roughness: 0.6
			})
		);
		walls.rotation.z = Math.PI / 2;
		walls.receiveShadow = true;
		walls.castShadow = true;
		walls.position.y = -1;
		walls.position.z = 1.5;
		const walls2 = walls.clone();
		walls2.position.z = -2.5;
		walls.rotation.x = Math.PI / 2;
		walls.rotation.z = 0;
		walls2.castShadow = true;
		walls2.receiveShadow = true;
		walls2.material.needsUpdate = true;
		this.scene.add(walls2);
		this.scene.add(walls);
	}

	onMouseMove(event: MouseEvent) {
		if (this.material) {
			this.material.uniforms.u_mouse.value.x = THREE.MathUtils.lerp(
				this.material.uniforms.u_mouse.value.x,
				event.clientX,
				0.1
			);
			this.material.uniforms.u_mouse.value.y = THREE.MathUtils.lerp(
				this.material.uniforms.u_mouse.value.y,
				event.clientY,
				0.1
			);

			if (this.eyeMaterial) {
				const x = event.clientX;
				const y = event.clientY;
				const canvas = this.renderer?.domElement || document.body;
				if (!canvas) return;
				const rect = canvas.getBoundingClientRect();
				const x1 = ((x - rect.left) / rect.width) * 2 - 1;
				const y1 = -((y - rect.top) / rect.height) * 2 + 1;
				this.rafPos.x = THREE.MathUtils.lerp(this.rafPos.x, x1, 0.01);
				this.rafPos.y = THREE.MathUtils.lerp(this.rafPos.y, y1, 0.01);
				this.eyeMaterial.uniforms.uMouse.value = new THREE.Vector2(x1, y1);
			}
			if (this.dirLight) this.dirLight.lookAt(this.rafPos);
		}
	}

	handleClick() {
		if (this.degree < 5) this.degree += 1;
		else this.degree = 1;
		if (this.order < 3) this.order += 1;
		else this.order = 1;
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
	degree = 1;
	order = 1;
	dir = 1;
	animate() {
		const d = this.clock.getDelta() * 100;
		this.rafId = requestAnimationFrame(this.animate.bind(this));
		if (this.material) {
			this.material.uniforms.u_time.value += 0.01;
		}
		this.degree = this.dir ? this.degree + 0.001 : this.degree - 0.001;
		if (this.degree > 5) {
			this.dir = -1;
			this.degree = 4;
		}
		if (this.degree < 1) {
			this.dir = 1;
			this.degree = 1;
		}

		if (this.eyeMaterial) {
			this.eyeMaterial.uniforms.uTime.value -= 0.01;
			this.eyeMaterial.uniforms.uDegree.value = this.degree;
			this.eyeMaterial.uniforms.uOrder.value = this.order;
		}

		if (this.camera) {
			this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this.rafPos.x, 0.01);
			this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, this.rafPos.y, 0.01);
			this.camera.position.z = THREE.MathUtils.lerp(
				this.camera.position.z,
				Math.cos(d) + 1.5,
				0.01
			);
			// rotate the camera
			this.camera.rotation.z = THREE.MathUtils.lerp(this.camera.rotation.z, this.rafPos.x, 0.01);
		}

		// if (this.renderer) this.renderer.render(this.scene, this.camera);
		if (this.composer) this.composer.render();
	}

	destroy() {
		window.removeEventListener('mousemove', this.onMouseMove.bind(this));
		window.removeEventListener('resize', this.onResize.bind(this));
		window.removeEventListener('click', this.handleClick.bind(this));
		if (this.rafId) window.cancelAnimationFrame(this.rafId);

		if (this.renderer) this.renderer.dispose();
		if (this.eyeMaterial) this.eyeMaterial.dispose();
		if (this.material) this.material.dispose();
		if (this.geometry) this.geometry.dispose();
		if (this.composer) this.composer.dispose();
	}
}

export default scene;
