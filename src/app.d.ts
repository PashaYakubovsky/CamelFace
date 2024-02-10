// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}

	declare module '*.glsl' {
		const value: string;
		export default value;
	}
}

declare module 'three/addons/objects/Sky.js' {
	import { Object3D } from 'three';
	export class Sky extends Object3D {
		constructor();
	}
}

export {};
