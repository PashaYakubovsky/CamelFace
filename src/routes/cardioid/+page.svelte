<script lang="ts">
	import { onMount } from "svelte"
	import CardioidScene from "./cardioid"
	import { loading } from "$lib/loading"

	let canvasElement: HTMLCanvasElement

	onMount(() => {
		loading.update((state) => ({ ...state, loading: false }))
		const scene = new CardioidScene(canvasElement)

		return () => {
			scene.destroy()
		}
	})
</script>

<svelte:head>
	<title>Cardioid</title>
	<meta name="description" content="Cardioid webgl" />
</svelte:head>

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
