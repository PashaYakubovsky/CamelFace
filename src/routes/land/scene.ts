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
import Delaunator from 'delaunator';
import PoissionDiskSampling from 'poisson-disk-sampling';
import VirtualScroll from 'virtual-scroll';
import { CustomPostEffectShader } from './CustomPostEffect';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import gsap from 'gsap';

const SIZE = 25;
const p = new PoissionDiskSampling({
	shape: [SIZE, SIZE * 2],
	minDistance: 0.1,
	maxDistance: 3,
	tries: 2
});
const points3d = p.fill().map((p) => new THREE.Vector3(p[0], 0, p[1]));

class LandScene {
	scene: THREE.Scene = new THREE.Scene();
	camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
		35,
		window.innerWidth / window.innerHeight,
		0.1,
		500
	);
	renderer: THREE.WebGLRenderer | null = null;
	material: CustomShaderMaterial | null = null;
	geometry: THREE.PlaneGeometry | null = null;
	composer: EffectComposer | null = null;
	clock = new THREE.Clock();
	rafId: number | null = null;
	stats = new Stats();
	scroller: VirtualScroll | null = null;
	progress = 0;
	uDivade = new THREE.Vector2(-6, 3.14);
	customPass: ShaderPass | null = null;
	tubeMaterial: THREE.ShaderMaterial | null = null;
	bgMaterial: THREE.ShaderMaterial | null = null;
	tube: THREE.TubeGeometry | null = null;
	spheres: THREE.Mesh[] = [];
	textMeshes: THREE.Mesh[] = [];
	constructor(
		el: HTMLCanvasElement | null,
		opt?: {
			renderToTarget: boolean;
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
		this.animate.bind(this);
		this.animate();
		if (!opt?.renderToTarget) {
			window.addEventListener('mousemove', this.onMouseMove.bind(this));
			window.addEventListener('resize', this.onResize.bind(this));
			window.addEventListener('wheel', this.onMouseWheel.bind(this));
			window.addEventListener('click', this.onClick.bind(this));
		}
	}

	public init() {
		const renderPass = new RenderPass(this.scene, this.camera);
		const fxaaPass = new ShaderPass(FXAAShader);
		const outputPass = new OutputPass();

		if (this.renderer) {
			this.stats.showPanel(0);
			document.body.appendChild(this.stats.dom);

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
			customPass.uniforms['scale'].value = 2;
			customPass.uniforms['angle'].value = 0;
			customPass.uniforms['resolution'].value = new THREE.Vector2(500, 500);
			customPass.uniforms['time'].value = 0;
			customPass.uniforms['uBlurAmount'].value = 0;
			customPass.uniforms['uMouse'].value = new THREE.Vector2(0, 0);
			customPass.uniforms['uDivade'].value = this.uDivade;

			this.customPass = customPass;
			customPass.renderToScreen = true;
			composer.addPass(customPass);

			this.composer = composer;
		}

		// add light
		const ambientLight = new THREE.AmbientLight(new THREE.Color('white'), 10.5);
		this.scene.add(ambientLight);
		const directionalLight = new THREE.DirectionalLight(new THREE.Color('white'), 1);
		directionalLight.position.set(0, 0, 1);

		// create shape
		let indexDel = Delaunator.from(points3d.map((p) => [p.x, p.z]));

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
				iDiffuse2: { value: matcapTexture2 },
				uDivade: { value: this.uDivade }
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
		this.mesh = mesh;
		this.mesh2 = mesh2;

		this.scene.add(mesh);
		this.scene.add(mesh2);

		mesh.position.set(-(SIZE / 2), 0, -(SIZE * 0.4));
		mesh2.position.set(-(SIZE / 2), 0, SIZE * 1.5);

		this.camera.position.set(0, 0.5, -9);
		this.camera.lookAt(0, -1, 0);

		this.scroller = new VirtualScroll({
			useTouch: true,
			touchMultiplier: 4
		});
		this.progress = 0;
		this.scroller.on((event) => {
			this.progress += event.deltaY * 0.00005;
			this.progress = Math.max(0, Math.min(1, this.progress));
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
		this.tube = new THREE.TubeGeometry(this.cameraPath, 600, 0.09, 2, false);

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
		this.tubeMesh = new THREE.Mesh(this.tube, this.tubeMaterial);
		this.tubeMesh.position.y = 0.05;
		this.tubeMesh.position.x = 0.2;
		this.tubeMesh.scale.set(1, 1.3, 1);
		this.scene.add(this.tubeMesh);

		// create spheres on tube
		const sphereGeometry = new THREE.SphereGeometry(0.05, 15, 15);
		const sphereMaterial = new THREE.ShaderMaterial({
			// blending: THREE.AdditiveBlending,
			transparent: true,
			depthTest: false,
			uniforms: {
				iTime: { value: 0 },
				iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
				uDivade: { value: this.uDivade }
			},
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
			uniform vec2 iResolution;
			uniform vec2 uDivade;

			void main() {
    			float fog = smoothstep(-1., 20.0, length(vViewPosition*vec3(1.5, 1.7, 1.0)));
				vec4 color = vec4(vec3(1.0), 1.0 - fog);
				vec2 screenUv = gl_FragCoord.xy / iResolution.xy;
				float divade = step(uDivade.x, (screenUv.y - screenUv.x + .1) * uDivade.y);
				vec3 color2 = vec3(1.0, 0.0, 0.0) * divade;
				gl_FragColor = color;
			}
			`
		});
		const textMaterial = new THREE.ShaderMaterial({
			blending: THREE.AdditiveBlending,
			transparent: true,
			depthTest: false,
			uniforms: {
				iTime: { value: 0 },
				iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
				uDivade: { value: this.uDivade }
			},
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
			uniform vec2 iResolution;
			uniform vec2 uDivade;

			void main() {
				float fog = smoothstep(-1., 20.0, length(vViewPosition*vec3(1.5, 1.7, 1.0)));
				vec4 color = vec4(vec3(1.0), 1.0 - fog);
				vec2 screenUv = gl_FragCoord.xy / iResolution.xy;
				float divade = step(uDivade.x, (screenUv.y - screenUv.x + .1) * uDivade.y);
				vec3 color2 = vec3(1.0, 0.0, 0.0) * divade;
				color /= divade;
				gl_FragColor = mix(color, vec4(color2, 1.0), 1.0 -fog);
			}
			`
		});
		// get points on tube path
		const pointsOnTube = this.cameraPath.getPoints(15);

		pointsOnTube.forEach((point, i) => {
			const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
			sphere.position.copy(point);
			sphere.position.y += 0.1;
			sphere.position.x += 0.2;
			this.scene.add(sphere);

			// const text = Text({
			// 	text: [
			// 		'chromatic aberration',
			// 		'depth of field',
			// 		'procedural generated terrain',
			// 		'split view shader'
			// 	][Math.floor(Math.random() * 4)],
			// 	fontSize: 0.1,
			// 	textAlign: 'left',
			// 	// strokeWidth: 0.5,
			// 	depthOffset: 0.01
			// });
			const texts = [
				'',
				'',
				'',
				'SHADERS',
				'Episode IV',
				'A NEW HOPE',
				'In a Coding galaxy far, far away...',
				'Frightened by the increasing power of shaders',
				'Game developers from all over the universe are seeking for knowledge and guidance.',
				'Shaders, mysterious and powerful',
				'They rule the visuals of every modern video game.',
				'Giving life to the worlds gamers explore.',
				'They draw the line between a flat surface and a realistic texture',
				'But with great power comes great responsibility.',
				'And with great responsibility comes the need for knowledge.',
				'And knowledge is what we are here to provide.',
				'Welcome to the world of shaders.',
				'Where the pixels are your playground.'
			];

			new FontLoader().load('fonts/helvetiker_regular.typeface.json', (font) => {
				this.font = font;
				const textGeometry = new TextGeometry(texts[i] || '', {
					font: font,
					size: 0.1,
					depth: 0.0004,
					curveSegments: 5,
					bevelThickness: 2,
					bevelSize: 0.1,
					bevelEnabled: false
				});

				textGeometry.computeBoundingBox();

				const textMesh1 = new THREE.Mesh(textGeometry, textMaterial);

				textMesh1.position.copy(point);
				textMesh1.position.y += 0.1;

				textMesh1.rotation.y = Math.PI;
				textMesh1.scale.set(1, 1, 0.001);
				// this.spheres.push(textMesh1);
				this.scene.add(textMesh1);
				this.textMeshes.push(textMesh1);
			});

			// const controls = new OrbitControls(this.camera, this.renderer.domElement);
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
			uniform vec2 uDivade;

			#define M_PI 3.14159265358979323846

			float FOV = 180.0;

			void main() {
				vec2 screenUv = gl_FragCoord.xy / iResolution.xy;
				float divade = step(uDivade.x, (screenUv.y - screenUv.x + .1) * uDivade.y);

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
				resolution: { value: new THREE.Vector2(300, 300) },
				uDivade: { value: this.uDivade }
			}
		});
		const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
		background.scale.set(5, 5, 5);
		this.bgMaterial = backgroundMaterial;
		this.scene.add(background);

		// init animation
		const tObj = {
			value: -6
		};
		gsap.to(tObj, {
			value: 6,
			duration: 10,
			repeat: -1,
			ease: 'power4.inOut',
			yoyo: true,
			onUpdate: () => {
				this.uDivade.x = tObj.value;
				if (this.material) {
					this.material.uniforms.uDivade.value = this.uDivade;
				}
				if (this.bgMaterial) {
					this.bgMaterial.uniforms.uDivade.value = this.uDivade;
				}
			}
		});

		// setup raycaster
		this.raycaster = new THREE.Raycaster();
	}

	cameraPath: THREE.CatmullRomCurve3 | null = null;
	cameraPathProgress = 0;
	raycaster: THREE.Raycaster | null = null;
	mouse: THREE.Vector2 | null = null;

	onClick() {
		if (this.customPass) {
			this.customPass.uniforms.enableMouse.value = !this.customPass.uniforms.enableMouse.value;
		}
	}
	lastRaycastCallTimestamp = 0;
	animating = false;
	onMouseMove(event: MouseEvent) {
		this.mouse = new THREE.Vector2(
			(event.clientX / window.innerWidth) * 2 - 1,
			-(event.clientY / window.innerHeight) * 2 + 1
		);
		if (this.customPass) {
			const uvMouse = new THREE.Vector2(
				event.clientX / window.innerWidth - 0.5,
				-(event.clientY / window.innerHeight - 0.5)
			);
			this.customPass.uniforms['uMouse'].value = uvMouse;
		}
		requestAnimationFrame(() => {
			if (this.lastRaycastCallTimestamp + 100 > Date.now() || this.animating) return;
			this.lastRaycastCallTimestamp = Date.now();
			// raycast
			if (this.raycaster && this.mouse) {
				this.raycaster.setFromCamera(this.mouse, this.camera);
				const intersects = this.raycaster.intersectObjects(this.scene.children);
				if (intersects.length > 0) {
					const obj = intersects[0].object;
					if (obj.id === this.raycastTextId) {
						if (this.customPass) {
							this.animating = true;
							// clamp exponentialy blur amount to 0.75 from current value
							gsap.to(this.customPass.uniforms['uBlurAmount'], {
								value: 0.75,
								duration: 0.75,
								ease: 'expo.out',
								onComplete: () => {
									this.animating = false;
								}
							});
						}
					}
				}
			}
		});
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
		this.stats.update();

		const time = this.clock.getElapsedTime();

		// move camera on progress
		if (this.camera && typeof this.progress === 'number') {
			const pointOnTube = this.cameraPath?.getPointAt(this.progress);
			if (!pointOnTube) return;
			// this.camera.position.z = THREE.MathUtils.lerp(-6, 6, this.progress * 0.01);
			pointOnTube.y = 0.8;
			// if progress is 1, then loop back to 0
			if (this.progress >= 1) {
				this.progress = 0;
				const point = this.cameraPath?.getPointAt(0);
				if (!point) return;
				this.camera.position.set(point?.x, point?.y, point?.z);

				// change title of 1st sphere
				this.textMeshes[3].geometry.dispose();
				this.textMeshes[3].remove();
				const pos = this.textMeshes[3].position;
				this.scene.remove(this.textMeshes[3]);
				this.textMeshes[3] = new THREE.Mesh(
					new TextGeometry('You already be here?', {
						font: this.font,
						size: 0.1,
						depth: 0.0004,
						curveSegments: 5,
						bevelThickness: 2,
						bevelSize: 0.1,
						bevelEnabled: false
					}),
					this.textMeshes[2].material
				);
				this.raycastTextId = this.textMeshes[3].id;
				this.textMeshes[3].position.copy(pos);
				this.textMeshes[3].position.y = 0.1;
				this.textMeshes[3].rotation.y = Math.PI;
				this.textMeshes[3].scale.set(1, 1, 0.001);
				this.scene.add(this.textMeshes[3]);

				// const nextPos = SIZE * 2 * (Math.random() > 0.5 ? -1 : 1);

				// pointOnTube = this.cameraPath?.getPointAt(this.progress);
			}
			this.camera.position.lerp(pointOnTube, 0.1);
		}

		if (this.material) {
			this.material.uniforms.iTime.value = time;
			// this.material.uniforms.iCameraPosition.value = this.camera.position;
		}
		if (this.tubeMaterial) {
			this.tubeMaterial.uniforms.iTime.value = time;
		}
		if (this.customPass) {
			// lerp to default state
			this.customPass.uniforms['uBlurAmount'].value = THREE.MathUtils.lerp(
				this.customPass.uniforms['uBlurAmount'].value,
				0,
				0.1
			);
			this.customPass.uniforms['time'].value = time * 2;
		}
		if (this.textMeshes[3]) {
			this.textMeshes[3].lookAt(this.camera.position);
			// sin rotation
			this.textMeshes[3].rotation.y = Math.sin(time * 2) * 0.1;
			if (this.animating) {
				// scale
				this.textMeshes[3].scale.lerp(new THREE.Vector3(1.5, 1.5, 0.001), 0.1);
			} else {
				this.textMeshes[3].scale.lerp(new THREE.Vector3(1, 1, 0.001), 0.1);
			}
		}
		// if (this.renderer) this.renderer.render(this.scene, this.camera);
		if (this.composer) this.composer.render();
		else if (this.renderer) this.renderer.render(this.scene, this.camera);

		this.rafId = requestAnimationFrame(this.animate.bind(this));
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
		if (this.tubeMaterial) this.tubeMaterial.dispose();
		if (this.bgMaterial) this.bgMaterial.dispose();
		if (this.customPass) this.customPass.dispose();
	}
}

export default LandScene;
