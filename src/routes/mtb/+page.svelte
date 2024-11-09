<script lang="ts">
	import { onMount } from "svelte"
	import Scene from "./scene"

	let canvasElem: HTMLCanvasElement
	let parentElem: HTMLElement
	let scene: Scene

	onMount(() => {
		scene = new Scene(canvasElem)

		return () => {
			scene.destroy()
		}
	})
</script>

<svelte:head>
	<title>MTB</title>
	<meta name="description" content="Morphing three.js" />
</svelte:head>

<div bind:this={parentElem} class="parent">
	<canvas bind:this={canvasElem}></canvas>
</div>

<style>
	/* global style for body */
	:global(body) {
		overflow: auto !important;
	}
	.parent {
		width: 100vw;
		height: 100svh;
		overflow: hidden;
		position: relative;
	}
	canvas {
		width: 100vw;
		height: 100vh;
		position: absolute;
		left: 0;
		top: 0;
		z-index: 10;
	}
</style>
