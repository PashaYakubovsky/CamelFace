<script lang="ts">
	import { onMount } from "svelte"
	import LyapunovScene from "./lyapunov"
	import { loading } from "$lib/loading"

	let canvasElement: HTMLCanvasElement

	onMount(() => {
		loading.update((state) => ({ ...state, loading: false }))
		const scene = new LyapunovScene(canvasElement)

		return () => {
			scene.destroy()
		}
	})
</script>

<svelte:head>
	<title>Lyapunov</title>
	<meta name="description" content="Lyapunov fractal" />
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
