<script lang="ts">
	import { onMount } from "svelte"
	import cloudsScene from "./clouds"
	import { loading } from "$lib/loading"

	let canvasElement: HTMLCanvasElement

	onMount(() => {
		loading.update((state) => ({ ...state, loading: false }))
		const scene = new cloudsScene(canvasElement)

		return () => {
			scene.destroy()
		}
	})
</script>

<svelte:head>
	<title>Fractal browning</title>
	<meta name="description" content="Fractal browning motion glsl" />
</svelte:head>

<canvas bind:this={canvasElement}></canvas>

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
