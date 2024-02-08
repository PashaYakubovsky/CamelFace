<script lang="ts">
	import { onMount } from 'svelte';
	import BoidsScene from './boids';
	import { loading } from '$lib/loading';

	let canvasElement: HTMLCanvasElement;

	onMount(async () => {
		loading.update((state) => ({ ...state, loading: false }));
		const scene = new BoidsScene(canvasElement);
	});
</script>

<title>Boids simulation</title>

<canvas bind:this={canvasElement} />

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
