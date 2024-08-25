<script lang="ts">
	import { onMount } from "svelte"
	import MandelbrotScene from "./mandelbrot"
	import { loading } from "$lib/loading"
	import { pageTransition } from "$lib/pageTransition"
	import { goto } from "$app/navigation"

	let canvasElement: HTMLCanvasElement

	onMount(() => {
		loading.update((state) => ({ ...state, loading: false }))
		const scene = new MandelbrotScene(canvasElement)

		return () => {
			scene.destroy()
		}
	})
</script>

<svelte:head>
	<title>Mandelbrot</title>
	<meta name="description" content="Mandelbrot fractal" />
</svelte:head>

<button
	on:click={() => {
		goto("/mandelbrot/webgpu")
	}}>webgpu version</button
>

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
	button {
		position: absolute;
		z-index: 2;
		bottom: 0.5rem;
		right: 0.5rem;
		border-radius: 0.5rem;
		padding: 0.5rem 1rem;
		background-color: #000;
		color: #f6f6f6;
		transition: 0.3s ease-in-out all;
	}
	button:hover {
		background-color: #f6f6f6;
		color: #000;
	}
</style>
