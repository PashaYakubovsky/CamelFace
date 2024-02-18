<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Scene from './scene';

	let canvasElem: HTMLCanvasElement;
	let scene: Scene;

	onMount(() => {
		scene = new Scene(canvasElem);
	});

	onDestroy(() => {
		if (scene) scene.destroy();
	});
</script>

<title>Particles</title>

<canvas bind:this={canvasElem} />

<style>
	canvas {
		width: 100vw;
		height: 100vh;
		position: absolute;
		left: 0;
		top: 0;
		z-index: 10;
	}
</style>
