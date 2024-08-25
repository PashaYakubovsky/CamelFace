<script lang="ts">
	import { onMount } from "svelte"
	import MutualAttractionScene from "./scene"
	import { loading } from "$lib/loading"

	let canvasElement: HTMLCanvasElement

	onMount(() => {
		loading.update((state) => ({ ...state, loading: false }))
		const scene = new MutualAttractionScene(canvasElement)

		return () => {
			scene.destroy()
		}
	})
</script>

<svelte:head>
	<title>Mutual attraction</title>
	<meta name="description" content="Mutual attraction simulation three.js" />
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
