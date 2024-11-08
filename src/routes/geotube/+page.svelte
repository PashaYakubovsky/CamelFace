<script lang="ts">
	import { onMount, onDestroy } from "svelte"
	import MathSketch from "./Sketch"

	let canvasElem: HTMLCanvasElement
	let scene: MathSketch = $state()

	onMount(() => {
		scene = new MathSketch(canvasElem)
	})

	onDestroy(() => {
		if (scene) scene.destroy()
	})
</script>

<svelte:head>
	<title>Math visualization</title>
	<meta name="description" content="Math visualization" />
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
