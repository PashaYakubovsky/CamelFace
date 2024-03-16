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
	on:change={() => {
		if (!fileElem.files) return;
		const file = fileElem.files[0];
		if (file) {
			scene.uploadNewFile(file);
		}
	}}
	type="file"
	name="texture"
	id="texture"
/>

<button
	on:click={() => {
		scene.getUserMedia();
	}}
	>Get texture from camera
</button>

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
		top: 2rem;
		left: 1rem;
		z-index: 1000;
	}
	button {
		position: absolute;
		top: 4.5rem;
		left: 1rem;
		z-index: 20;
		border-radius: 0.25rem;
		padding: 0.5rem 1rem;
		background-color: #fff;
		border: 1px solid #000;
		color: #000;
	}
</style>
