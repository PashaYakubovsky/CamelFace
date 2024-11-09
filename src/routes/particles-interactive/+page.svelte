<script lang="ts">
	import { onMount, onDestroy } from "svelte"
	import Scene from "./scene"

	let canvasElem: HTMLCanvasElement
	let scene: Scene

	onMount(() => {
		scene = new Scene(canvasElem)
	})

	onDestroy(() => {
		if (scene) scene.destroy()
	})
</script>

<svelte:head>
	<title>Particles</title>
	<meta name="description" content="Particles simulation three.js" />
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
</style>
