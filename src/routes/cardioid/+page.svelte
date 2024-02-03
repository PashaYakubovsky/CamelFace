<script lang="ts">
	import { onMount } from 'svelte';
	import CardioidScene from './cardioid';
	import { loading } from '$lib/loading';

	let canvasElement: HTMLCanvasElement;

	onMount(async () => {
		loading.update((state) => ({ ...state, loading: false }));
		const scene = new CardioidScene(canvasElement);
	});
</script>

<title>Cardioid</title>

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
