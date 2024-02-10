<script lang="ts">
	import { onMount } from 'svelte';
	import MandelbrotScene from './mandelbrot';
	import { loading } from '$lib/loading';

	let canvasElement: HTMLCanvasElement;

	onMount(() => {
		loading.update((state) => ({ ...state, loading: false }));
		const scene = new MandelbrotScene(canvasElement);

		return () => {
			scene.destroy();
		};
	});
</script>

<title>Mandelbrot WebGPU</title>

<canvas id="webgpu-canvas" bind:this={canvasElement} />

<style>
	canvas {
		width: 100%;
		height: 100%;
		position: absolute;
		left: 0;
		top: 0;
		z-index: 1;
	}
</style>
