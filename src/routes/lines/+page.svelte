<script lang="ts">
	import { onMount, onDestroy } from "svelte"
	import Scene from "./scene"

	let canvasElem: HTMLCanvasElement
	let scene: Scene

	onMount(() => {
		scene = new Scene(canvasElem)
		document.body.style.overflow = "hidden"
	})

	onDestroy(() => {
		if (scene) scene.destroy()
		document.body.style.overflow = "auto"
	})
</script>

<svelte:head>
	<title>Lines</title>
	<meta
		name="description"
		content="Distortion for lines in three.js based on depth texture"
	/>
</svelte:head>

<canvas bind:this={canvasElem} />

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
