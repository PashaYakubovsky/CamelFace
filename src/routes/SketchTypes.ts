export type IntegratedScene = {
	scene: THREE.Scene
	camera: THREE.Camera
	destroy: () => void
	rafId?: number | null
	animate: () => void
	renderer?: THREE.WebGLRenderer | null
}
