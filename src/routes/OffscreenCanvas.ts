/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */

import * as THREE from "three"
import type { Post } from "../types"

// Shaders
// import bgVertexShader from "./shaders/bgVertexShader.glsl"
// import bgFragmentShader from "./shaders/bgFragmentShader.glsl"
// import vertexShader from "./shaders/vertexShader.glsl"
// import fragmentShader from "./shaders/fragmentShader.glsl"
import gsap from "gsap"
import type { IntegratedScene } from "./SketchTypes"

let renderer: THREE.WebGLRenderer
let scene: THREE.Scene
let canvas: OffscreenCanvas
let camera: THREE.PerspectiveCamera
let clock: THREE.Clock
let rafId: number | null = null
let width = 0
let height = 0
let mouse = new THREE.Vector2()
let raycaster = new THREE.Raycaster()
let material: THREE.ShaderMaterial
let materials: THREE.ShaderMaterial[] = []
let meshes: THREE.Mesh[] = []
let groups: THREE.Group[] = []
let total = 0

let intersected: THREE.Intersection<THREE.Object3D<THREE.Object3DEventMap>>[] =
	[]
let hovered: Record<string, THREE.Intersection> = {}
let bgGeometry: THREE.PlaneGeometry | null = null
let bgMaterial: THREE.ShaderMaterial | null = null
let bgPlane: THREE.Mesh | null = null
let geometry: THREE.PlaneGeometry | null = createGeometry()
let eulerValues = calculateEuler()
let positionValues = calculatePosition()
let backgroundColors: string[] = []
let posts: Post[] = []
let integratedScenes: IntegratedScene[] = []
let renderTargets: THREE.RenderTarget[] = []
let integratedScenesDict: Record<string, IntegratedScene> = {}
let textures: THREE.Texture[] = []

// Message handler
self.onmessage = async (e: MessageEvent) => {
	const messageHandlers: Record<string, (data: any) => Promise<void> | void> = {
		init: async ({
			canvas: offscreenCanvas,
			width: w,
			height: h,
			devicePixelRatio,
		}) => {
			canvas = offscreenCanvas
			width = w
			height = h
			await init(devicePixelRatio)
		},
		resize: ({ width: w, height: h }) => {
			handleResize(w, h)
		},
		mousemove: ({ x, y }) => {
			handleMouseMove(x, y)
		},
		addGallery: async (data) => {
			await addGallery(data)
		},
		render: (data) => {
			const texture = data.texture
			if (meshes.length && meshes[data.index]) {
				const mesh = meshes[data.index]
				const mat = mesh.material as THREE.ShaderMaterial
				mat.uniforms.uTexture.value = texture
			}
		},
		destroy: () => {
			destroy()
		},
		changeBGColor: (data) => {
			addColorToBGShader(data.index)
		},
		setTexture: async (data) => {},
		// slides transform controls
		// sliderRaf: (data) => {
		// 	const position = data.position
		// 	const objects = data.objects as { dist: number }[]

		// 	for (let i = 0; i < objects.length; i++) {
		// 		const obj = objects[i]

		// 		obj.dist = 1.0 - Math.min(Math.abs(position - i), 1)

		// 		const mesh = meshes[i]

		// 		if (mesh) {
		// 			const mat = mesh.material as THREE.ShaderMaterial

		// 			mat.uniforms.distanceFromCenter.value = obj.dist

		// 			const delta =
		// 				(mesh.geometry as unknown as { parameters: { height: number } })
		// 					.parameters.height * 1.15

		// 			const scale = 1 + 0.2 * obj.dist
		// 			mesh.scale.set(scale, scale, scale)
		// 			mesh.position.y = i * delta + -(position * delta)
		// 		}
		// 	}
		// },
	}

	const { type, data } = e.data
	const props = { ...e.data, ...data }

	if (messageHandlers[type]) {
		await messageHandlers[type](props)
	}
}

// async function init(devicePixelRatio: number) {
// 	// Initialize Three.js
// 	renderer = new THREE.WebGLRenderer({
// 		canvas,
// 		antialias: true,
// 		powerPreference: "high-performance",
// 		alpha: true,
// 	})

// 	renderer.toneMapping = THREE.ACESFilmicToneMapping
// 	renderer.toneMappingExposure = 1
// 	renderer.outputColorSpace = THREE.SRGBColorSpace
// 	renderer.setPixelRatio(Math.min(2, devicePixelRatio))

// 	resizeRendererToDisplaySize(renderer)

// 	scene = new THREE.Scene()
// 	camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000)
// 	camera.position.set(0, 0, 4)

// 	clock = new THREE.Clock()

// 	// addObjects()

// 	animate()
// }

// function addObjects() {
// 	// Add your objects here, similar to the original class
// 	// But remove DOM manipulation code and UI feedback

// 	material = new THREE.ShaderMaterial({
// 		side: THREE.FrontSide,
// 		uniforms: {
// 			time: { value: 0 },
// 			uTexture: { value: null },
// 			resolutions: { value: new THREE.Vector4() },
// 			distanceFromCenter: { value: 0.0 },
// 			mouse: { value: new THREE.Vector2(0, 0) },
// 			uResolution: { value: new THREE.Vector2(1, 1) },
// 			uMouse: { value: new THREE.Vector2(0, 0) },
// 			isMobile: { value: width < 768 },
// 			videoTexture: { value: null },
// 		},
// 		vertexShader,
// 		fragmentShader,
// 		transparent: true,
// 		depthTest: false,
// 		depthWrite: false,
// 	})
// 	bgMaterial = new THREE.ShaderMaterial({
// 		uniforms: {
// 			uTime: { value: 0 },
// 			uColor: { value: new THREE.Color("rgb(0, 0, 0)") },
// 			uPrevColor: { value: new THREE.Color("rgb(255, 0, 0)") },
// 			uResolution: {
// 				value: new THREE.Vector2(width, height),
// 			},
// 			uMouse: { value: new THREE.Vector2(0, 0) },
// 			uSpeed: { value: 0.01 },
// 			uFactor: { value: 1.0 },
// 			uSelectedItemPosition: {
// 				// by default is 20% right and 50% down
// 				value: new THREE.Vector2(0.2, 0.5),
// 			},
// 			uEnabled: { value: true },
// 		},
// 		vertexShader: bgVertexShader,
// 		fragmentShader: bgFragmentShader,
// 		transparent: false,
// 	})
// 	const aspectRatio = width / height
// 	bgGeometry = new THREE.PlaneGeometry(100, 100, 1, 1)
// 	bgGeometry.scale(aspectRatio, 1, 1)
// 	bgPlane = new THREE.Mesh(bgGeometry, bgMaterial)
// 	bgPlane.position.z = 3.2
// 	scene.add(bgPlane)

// 	const light = new THREE.SpotLight(0xffffff, 10, 100, 180, 1)
// 	light.position.z = 10
// 	scene.add(light)
// }

// async function addGallery(props: { posts: Post[] }) {
// 	posts = props.posts

// 	// Similar to original but without DOM manipulation
// 	// Send progress updates to main thread instead

// 	for (let i = 0; i < props.posts.length; i++) {
// 		const post = props.posts[i]

// 		backgroundColors.push(post.backgroundColor)

// 		// Apply texture to the material
// 		if (!material || !geometry) return

// 		const mat = material.clone()

// 		try {
// 			const group = new THREE.Group()

// 			mat.uniforms.id = { value: i }
// 			mat.uniforms.uResolution.value = new THREE.Vector3(width, height, 1)
// 			mat.uniforms.uTexture.value = null

// 			const mesh = new THREE.Mesh(geometry, mat)

// 			group.add(mesh)

// 			mesh.name = `Gallery card N${i}`

// 			meshes[i] = mesh
// 			materials[i] = material
// 			groups[i] = group
// 		} catch (err) {
// 			console.error(err)
// 		}
// 	}
// 	groups.forEach((group) => {
// 		gsap.fromTo(
// 			group.scale,
// 			{
// 				x: 2,
// 				y: 2,
// 				z: 2,
// 			},
// 			{
// 				x: 1,
// 				y: 1,
// 				z: 1,
// 				duration: 1,
// 				ease: "power2.inOut",
// 			},
// 		)

// 		gsap.fromTo(
// 			group.position,
// 			{
// 				x: 0,
// 				y: -10,
// 				z: -3.5,
// 			},
// 			{
// 				...positionValues,
// 				duration: 1,
// 				ease: "power2.inOut",
// 			},
// 		)
// 		gsap.to(group.rotation, {
// 			...eulerValues,
// 			duration: 1,
// 			ease: "power2.inOut",
// 		})
// 		scene.add(group)
// 	})

// 	self.postMessage({
// 		type: "init",
// 		data: {
// 			posts,
// 		},
// 	})
// }

function handleResize(w: number, h: number) {
	width = w
	height = h

	resizeRendererToDisplaySize(renderer)

	if (camera) {
		camera.aspect = width / height
		camera.updateProjectionMatrix()
	}
}

function handleMouseMove(x: number, y: number) {
	mouse.set((x / width) * 2 - 1, -(y / height) * 2 + 1)

	raycaster.setFromCamera(mouse, camera)
	intersected = raycaster.intersectObjects(scene.children, true)

	for (let i = 0; i < intersected.length; i++) {
		const hit = intersected[i]
		if (!hovered[hit.object.uuid]) {
			hovered[hit.object.uuid + hit.object.name] = hit

			// if (handleHoverIn) {
			// 	handleHoverIn()
			// }
		}
		const obj = hit.object as THREE.Mesh & { post: Post }
		// if obj is a bgPlane, dont change cursor
		if (obj.material instanceof THREE.ShaderMaterial) {
			if (obj.name === "bgPlane") return
			// document.body.style.cursor = "pointer"
			if (obj.material.uniforms.uMouse)
				obj.material.uniforms.uMouse.value = mouse
		}
	}

	self.postMessage({
		type: "hover",
		data: {},
	})
}

function animate() {
	const time = clock.getElapsedTime()

	// Update materials
	materials.forEach((material) => {
		material.uniforms.time.value = time
	})

	renderer.render(scene, camera)

	rafId = requestAnimationFrame(animate)
}

function destroy() {
	if (rafId) cancelAnimationFrame(rafId)

	meshes.forEach((mesh) => {
		scene.remove(mesh)
		mesh.geometry.dispose()
		;(mesh.material as THREE.Material).dispose()
	})

	renderer?.dispose()
	scene.clear()
}

function resizeRendererToDisplaySize(renderer: THREE.WebGLRenderer) {
	const canvas = renderer.domElement
	const needResize = canvas.width !== width || canvas.height !== height
	if (needResize) {
		renderer.setSize(width, height, false)
	}

	return needResize
}

function addColorToBGShader(index: number) {
	const color = posts[index].backgroundColor
	if (bgMaterial) {
		bgMaterial.uniforms.uPrevColor.value = bgMaterial.uniforms.uColor.value
		bgMaterial.uniforms.uColor.value = new THREE.Color(color)

		const obj = { value: 0 }
		gsap.to(obj, {
			value: 1,
			duration: 1,
			ease: "linear",
			onUpdate: () => {
				if (bgMaterial) {
					bgMaterial.uniforms.uFactor.value = obj.value
				}
			},
		})
	}
}

function createGeometry() {
	const geometry = [2.5, 2.2]

	return new THREE.PlaneGeometry(geometry[0], geometry[1], 10, 10)
}

function calculateEuler() {
	const euler = {
		x: -0.1,
		y: -0.7,
		z: -0.2,
	}

	return euler
}
function calculatePosition() {
	const position = {
		x: 1.5,
		y: 0,
		z: 0,
	}

	return position
}
