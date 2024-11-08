<script lang="ts">
	import { onMount, onDestroy } from "svelte"
	import GalaxySketch from "./scene"
	import { goto } from "$app/navigation"

	let canvasElem: HTMLCanvasElement
	let scene: GalaxySketch = $state()

	onMount(() => {
		scene = new GalaxySketch(canvasElem)
	})

	onDestroy(() => {
		if (scene) scene.destroy()
	})
</script>

<svelte:head>
	<title>Galaxy WebGPU</title>
	<meta name="description" content="Galaxy simulation three.js webgpu" />
</svelte:head>

<canvas bind:this={canvasElem}></canvas>

<style>
	canvas {
		width: 100vw;
		height: 100vh;
		position: absolute;
		left: 0;
		top: 0;
		z-index: 10;
	}
	:global(#cursorP) {
		display: none;
	}
</style>
