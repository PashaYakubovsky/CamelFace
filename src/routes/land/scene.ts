import * as THREE from 'three';
import vertexShader from './vertexShader.glsl';
import fragmentShader from './fragmentShader.glsl';
import vertexShader1 from './vertexShader1.glsl';
import fragmentShader1 from './fragmentShader1.glsl';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import Stats from 'stats.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import gsap from 'gsap';
import Delaunator from 'delaunator';
import PoissionDiskSampling from 'poisson-disk-sampling';
import VirtualScroll from 'virtual-scroll';
import { CustomPostEffectShader } from './dotScreen';
import { Text } from '@pmndrs/vanilla';

const SIZE = 15;
const p = new PoissionDiskSampling({
	shape: [SIZE, SIZE * 2],
	minDistance: 0.1,
	maxDistance: 0.3,
	tries: 10
});
const points3d = p.fill().map((p) => new THREE.Vector3(p[0], 0, p[1]));

class scene {
	private scene: THREE.Scene = new THREE.Scene();
	public camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
		35,
		window.innerWidth / window.innerHeight,
		0.1,
		100
	);
	public renderer: THREE.WebGLRenderer | null = null;
	private material: CustomShaderMaterial | null = null;
	private geometry: THREE.PlaneGeometry | null = null;
	private composer: EffectComposer | null = null;
	clock = new THREE.Clock();
	private rafId: number | null = null;
	stats = new Stats();

	constructor(el: HTMLCanvasElement) {
		this.camera.position.z = 1;
		this.renderer = new THREE.WebGLRenderer({
			canvas: el,
			antialias: true,
			alpha: true
		});
		this.renderer.setClearColor('#000000');
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		this.init();
		this.animate();

		window.addEventListener('mousemove', this.onMouseMove.bind(this));
		window.addEventListener('resize', this.onResize.bind(this));
		window.addEventListener('wheel', this.onMouseWheel.bind(this));
		window.addEventListener('click', this.onClick.bind(this));
	}

	public init() {
		if (!this.renderer) return;
		this.stats.showPanel(0);
		document.body.appendChild(this.stats.dom);
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

		const customPass = new ShaderPass(CustomPostEffectShader);
		customPass.uniforms['scale'].value = 4;
		customPass.uniforms['angle'].value = 0;
		customPass.uniforms['resolution'].value = new THREE.Vector2(500, 500);

		this.customPass = customPass;
		customPass.renderToScreen = true;
		composer.addPass(customPass);

		this.composer = composer;

		// add light
		const ambientLight = new THREE.AmbientLight(new THREE.Color('white'), 10.5);
		this.scene.add(ambientLight);
		const directionalLight = new THREE.DirectionalLight(new THREE.Color('white'), 1);
		directionalLight.position.set(0, 0, 1);

		// create shape
		let indexDel = Delaunator.from(points3d.map((p) => [p.x, p.z]));

		console.log(indexDel);

		this.geometry = new THREE.BufferGeometry().setFromPoints(points3d);

		let meshIndexes = [];
		for (let i = 0; i < indexDel.triangles.length; i += 1) {
			meshIndexes.push(indexDel.triangles[i]);
		}

		this.geometry.setIndex(meshIndexes);
		this.geometry?.computeVertexNormals();

		const textureLoader = new THREE.TextureLoader();
		const matcapTexture = textureLoader.load('/matcap.png');
		const matcapTexture2 = textureLoader.load('/matcap2.png');
		matcapTexture.colorSpace = THREE.SRGBColorSpace;

		const material = new CustomShaderMaterial({
			baseMaterial: new THREE.MeshMatcapMaterial(),
			uniforms: {
				iTime: { value: 0 },
				iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
				iMouse: { value: new THREE.Vector3(0, 0, 0) },
				iZoom: { value: 1 },
				iAmbientRadius: { value: 0.5 },
				iCameraPosition: { value: this.camera.position },
				iDiffuse: { value: matcapTexture },
				iDiffuse2: { value: matcapTexture2 }
			},
			// wireframe: true,
			// matcap: matcapTexture,
			map: matcapTexture,
			vertexShader,
			fragmentShader
		});

		this.material = material;
		const mesh = new THREE.Mesh(this.geometry, material);
		const mesh2 = new THREE.Mesh(this.geometry, material);
		//frustum culling
		mesh.frustumCulled = false;
		mesh2.frustumCulled = true;

		this.scene.add(mesh);
		this.scene.add(mesh2);

		mesh.position.set(-(SIZE / 2), 0, -(SIZE * 0.4));
		mesh2.position.set(-(SIZE / 2), 0, SIZE);

		this.camera.position.set(0, 0.5, -9);
		this.camera.lookAt(0, -1, 0);
		// this.camera.lookAt(0, -2, 3);
		// const controls = new OrbitControls(this.camera, this.renderer.domElement);
		// controls.target.set(mesh.position);
		// controls.target.set(
		// 	this.camera.position.x + 0.15,
		// 	this.camera.position.y,
		// 	this.camera.position.z
		// );

		this.scroller = new VirtualScroll({
			useTouch: true,
			touchMultiplier: 4
		});
		this.progress = 0;
		this.scroller.on((event) => {
			this.progress += event.deltaY * 0.0001;
			this.progress = Math.max(0, Math.min(1, this.progress));
			console.log(this.progress);
			if (this.customPass) {
				const speed = event.deltaY * 0.0001;
				this.customPass.uniforms['uBlurAmount'].value += speed;
			}
		});

		// road path
		let points = [];
		points.push(new THREE.Vector3(-2.5, 0, -3.8));
		points.push(new THREE.Vector3(1.5, 0, 45));
		this.cameraPath = new THREE.CatmullRomCurve3(points);

		// create curved plane geometry
		const tube = new THREE.TubeGeometry(this.cameraPath, 600, 0.09, 2, false);

		this.tubeMaterial = new THREE.ShaderMaterial({
			vertexShader: vertexShader1,
			fragmentShader: fragmentShader1,
			uniforms: {
				iTime: { value: 0 },
				iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
			},
			// depthTest: false,
			transparent: true,
			side: THREE.DoubleSide,
			// wireframe: true
			blending: THREE.AdditiveBlending
		});
		const tubeMesh = new THREE.Mesh(tube, this.tubeMaterial);
		tubeMesh.position.y = 0.05;
		tubeMesh.position.x = 0.2;
		tubeMesh.scale.set(1, 1.3, 1);
		this.scene.add(tubeMesh);

		// create spheres on tube
		const sphereGeometry = new THREE.SphereGeometry(0.05, 15, 15);
		const sphereMaterial = new THREE.ShaderMaterial({
			vertexShader: `
			varying vec2 vUv;
			varying vec3 vNormal;
			varying vec3 vPosition;
			varying vec3 vViewPosition;

			void main() {
				vUv = uv;
				vNormal = normal;
				vPosition = position;
				vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
				vViewPosition = -mvPosition.xyz;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
			`,
			fragmentShader: `
			varying vec2 vUv;
			varying vec3 vNormal;
			varying vec3 vPosition;
			varying vec3 vViewPosition;

			void main() {
    			float fog = smoothstep(-1., 20.0, length(vViewPosition*vec3(1.5, 1.7, 1.0)));
				vec4 color = vec4(0.0, 0.0, 0.0, fog);
				gl_FragColor = mix(color, vec4(1.0), fog);
			}
			`
		});
		// get points on tube path
		const pointsOnTube = this.cameraPath.getPoints(10);
		pointsOnTube.forEach((point, i) => {
			const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
			sphere.position.copy(point);
			sphere.position.y += 0.1;
			sphere.position.x += 0.2;
			this.scene.add(sphere);

			const text = Text({
				text: [
					'chromatic aberration',
					'depth of field',
					'procedural generated terrain',
					'split view shader'
				][Math.floor(Math.random() * 4)],
				fontSize: 0.1,
				textAlign: 'left'
			});
			const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
			const material = new THREE.MeshBasicMaterial({
				color: 0xff0000,
				transparent: true,
				opacity: 0,
				side: THREE.DoubleSide
			});
			const mesh = new THREE.Mesh(geometry, material);

			mesh.add(text.mesh);
			mesh.position.copy(point);
			mesh.position.y += 0.1;
			mesh.position.x -= 0.5;
			// rotate 180
			mesh.rotation.y = Math.PI;
			this.scene.add(mesh);
			console.log(mesh);
		});

		const backgroundGeometry = new THREE.BoxGeometry(50, 50, 50);
		const backgroundMaterial = new THREE.ShaderMaterial({
			fragmentShader: `
			uniform vec2 iResolution;
			uniform float iTime;
			uniform sampler2D iChannel0;
			uniform sampler2D iChannel1;
			varying vec2 vUv;
			uniform float radius;
			uniform vec2 center;
			uniform float scale;
			uniform vec2 resolution;

			#define M_PI 3.14159265358979323846

			float FOV = 180.0;

			void main() {
				vec2 screenUv = gl_FragCoord.xy / iResolution.xy;
				float divade = step(0.5, (screenUv.y - screenUv.x + .1) * 3.14);

				// get the current pixel position
				vec2 uv = gl_FragCoord.xy / resolution.xy;

				// get the vector from the center to the current pixel
				vec2 dir = uv - center;

				// get the angle of the current pixel
				float angle = atan(dir.y, dir.x);

				// get the distance of the current pixel from the center
				float dist = length(dir);

				// get the angle of the current pixel in the panorama
				float anglePanorama = angle * FOV / M_PI;

				// get the texture coordinate of the current pixel in the panorama
				vec2 uvPanorama = vec2(anglePanorama / 360.0, dist / radius);

				// get the color of the current pixel in the panorama
				vec4 color = texture2D(iChannel0, uvPanorama);
				vec4 color2 = texture2D(iChannel1, uvPanorama);

				vec3 vViewPosition = normalize(vec3(0.0, 0.0, 1.0));
				gl_FragColor = mix(vec4(0.0), vec4(1.0), divade);
			}
			`,
			vertexShader: `
			varying vec2 vUv;
			varying vec3 vNormal;
			varying vec3 vPosition;
			varying vec3 vViewPosition;


			void main() {
				vUv = uv;
				vNormal = normal;
				vPosition = position;
				vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
				vViewPosition = -mvPosition.xyz;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
			`,
			side: THREE.BackSide,
			uniforms: {
				iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
				iTime: { value: 0 },
				iChannel0: { value: matcapTexture },
				iChannel1: { value: matcapTexture2 },
				uSampler: { value: null },
				radius: { value: 0.01 },
				center: { value: new THREE.Vector2(0.5, 0.5) },
				scale: { value: 1.0 },
				resolution: { value: new THREE.Vector2(300, 300) }
			}
		});
		const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
		background.scale.set(2, 2, 2);
		this.bgMaterial = backgroundMaterial;
		// background.position.copy(this.camera.position);
		// background.rotation.x = Math.PI;
		this.scene.add(background);

		// const controls = new OrbitControls(this.camera, this.renderer.domElement);
		// controls.target.set(background.position.x, background.position.y, background.position.z);
	}

	cameraPath: THREE.CatmullRomCurve3 | null = null;
	cameraPathProgress = 0;
	raycaster: THREE.Raycaster | null = null;
	mouse: THREE.Vector2 | null = null;

	onClick() {
		// if (this.material) {
		// 	gsap.fromTo(
		// 		this.material.uniforms.iAmbientRadius,
		// 		{
		// 			value: this.material.uniforms.iAmbientRadius.value
		// 		},
		// 		{
		// 			value: this.material.uniforms.iAmbientRadius.value === 0.5 ? 1.5 : 0.5,
		// 			duration: 1,
		// 			ease: 'power4.inOut',
		// 			onUpdate: () => {
		// 				if (this.material) this.material.needsUpdate = true;
		// 			}
		// 		}
		// 	);
		// }
	}

	onMouseMove(event: MouseEvent) {
		this.mouse = new THREE.Vector2(
			(event.clientX / window.innerWidth) * 2 - 1,
			-(event.clientY / window.innerHeight) * 2 + 1
		);
	}

	onMouseWheel(event: WheelEvent) {
		if (this.material) {
			// this.material.uniforms.iZoom.value += event.deltaY * 0.001;
			const minZoom = 0.5;
			const maxZoom = 7;
			const delta = event.deltaY * 0.0001;
			this.material.uniforms.iZoom.value = Math.max(
				minZoom,
				Math.min(maxZoom, this.material.uniforms.iZoom.value + delta)
			);
		}
	}
	lightPosRaf = new THREE.Vector3(0, 0, 0);
	onResize() {
		if (this.material) {
			this.material.uniforms.iResolution.value.x = window.innerWidth;
			this.material.uniforms.iResolution.value.y = window.innerHeight;
		}

		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();

		this.renderer?.setSize(window.innerWidth, window.innerHeight);
		this.composer?.setSize(window.innerWidth, window.innerHeight);

		if (this.bgMaterial) {
			this.bgMaterial.uniforms.iResolution.value.x = window.innerWidth;
			this.bgMaterial.uniforms.iResolution.value.y = window.innerHeight;
		}
	}

	public animate() {
		requestAnimationFrame(this.animate.bind(this));
		this.stats.update();

		// if (this.lightPosRaf) {
		// 	if (this.material) {
		// 		this.material.uniforms.iMouse.value = this.lightPosRaf;
		// 	}
		// }

		// if (this.raycaster && this.mouse) {
		// 	this.raycaster.setFromCamera(this.mouse, this.camera);
		// 	const intersects = this.raycaster.intersectObjects(this.scene.children);
		// 	if (intersects.length > 0) {
		// 		const obj = intersects[0];

		// 		if (this.material) {
		// 			this.lightPosRaf.z = THREE.MathUtils.lerp(
		// 				this.lightPosRaf.z,
		// 				obj.object.position.z - obj.point.z,
		// 				0.1
		// 			);
		// 			this.lightPosRaf.x = THREE.MathUtils.lerp(this.lightPosRaf.x, obj.point.x, 0.1);
		// 			this.lightPosRaf.y = THREE.MathUtils.lerp(this.lightPosRaf.y, obj.point.y, 0.1);

		// 			this.material.uniforms.iMouse.value = this.lightPosRaf;
		// 		}
		// 	}
		// }

		// move camera on progress
		if (this.camera && typeof this.progress === 'number') {
			// this.camera.position.z = THREE.MathUtils.lerp(-6, 6, this.progress * 0.01);
			const pointOnTube = this.cameraPath?.getPointAt(this.progress);
			pointOnTube.y = 0.8;
			if (pointOnTube) {
				this.camera.position.lerp(pointOnTube, 0.1);
			}
		}

		if (this.material) {
			this.material.uniforms.iTime.value = this.clock.getElapsedTime();
			// this.material.uniforms.iCameraPosition.value = this.camera.position;
		}
		if (this.tubeMaterial) {
			this.tubeMaterial.uniforms.iTime.value = this.clock.getElapsedTime();
		}
		if (this.customPass) {
			// lerp to default state
			this.customPass.uniforms['uBlurAmount'].value = THREE.MathUtils.lerp(
				this.customPass.uniforms['uBlurAmount'].value,
				0,
				0.1
			);
		}
		// if (this.renderer) this.renderer.render(this.scene, this.camera);
		if (this.composer) this.composer.render();
	}

	destroy() {
		window.removeEventListener('mousemove', this.onMouseMove.bind(this));
		window.removeEventListener('resize', this.onResize.bind(this));
		window.removeEventListener('wheel', this.onMouseWheel.bind(this));
		window.removeEventListener('click', this.onClick.bind(this));
		if (this.rafId) window.cancelAnimationFrame(this.rafId);

		if (this.renderer) this.renderer.dispose();
		if (this.material) this.material.dispose();
		if (this.geometry) this.geometry.dispose();
		if (this.composer) this.composer.dispose();
	}
}

export default scene;
