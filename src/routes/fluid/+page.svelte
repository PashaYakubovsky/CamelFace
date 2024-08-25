<script lang="ts">
	import { onMount } from "svelte"
	import { loading } from "$lib/loading"
	import { pageTransition } from "$lib/pageTransition"
	import Fluid from "./scene.ts"

	let canvasElement: HTMLCanvasElement

	onMount(() => {
		loading.update((state) => ({ ...state, loading: false }))
		const scene = new Fluid(canvasElement)

		return () => {
			//scene.destroy();
		}
	})
</script>

<title>Fluid</title>

<canvas bind:this={canvasElement} />

<style>
</style>
