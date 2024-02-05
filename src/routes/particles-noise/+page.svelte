<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Scene from './scene';
	import { goto } from '$app/navigation';

	let canvasElem: HTMLCanvasElement;
	let scene: Scene;
	let loadingAnimation = false;
	let fileElem: HTMLInputElement;

	onMount(() => {
		scene = new Scene(canvasElem);
	});

	onDestroy(() => {
		if (scene) scene.destroy();
	});
</script>

<title>Particles</title>

<canvas bind:this={canvasElem} />

<input
	accept="image/*"
	bind:this={fileElem}
	on:change={(e) => {
		const file = fileElem.files[0];
		if (file) {
			scene.uploadNewFile(file);
		}
	}}
	type="file"
	name="texture"
	id="texture"
/>

<style>
	canvas {
		width: 100vw;
		height: 100vh;
		position: absolute;
		left: 0;
		top: 0;
		z-index: 10;
	}
	:global(#cursorP) {
		display: none;
	}

	input {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 20;
	}
</style>
