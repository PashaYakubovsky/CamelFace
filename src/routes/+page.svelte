<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Scene from './scene';
	import { goto } from '$app/navigation';

	let canvasElem: HTMLCanvasElement;
	let scene: Scene;
	let loadingAnimation = false;

	onMount(() => {
		scene = new Scene(canvasElem);
	});

	onDestroy(() => {
		if (scene) scene.destroy();
	});
</script>

<title>Jet set together</title>

<canvas bind:this={canvasElem} />

<button
	on:click={() => {
		scene.fadeOut(scene);
		loadingAnimation = true;
		setTimeout(() => {
			loadingAnimation = false;
			goto('/home');
		}, 6000);
	}}
	class={`absolute hover:scale-110 hover:shadow-lg shadow-slate-100 transition-all left-[50%] bottom-5 translate-x-[-50%] z-10 rounded px-4 py-2 cursor-pointer bg-gray-50 text-slate-950 ${
		loadingAnimation ? 'cursor-progress' : ''
	}`}>Explore</button
>

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
</style>
