<script lang="ts">
	import { onMount } from "svelte"
	import Scene from "./scene"
	import gsap from "$gsap"
	import { ScrollTrigger } from "$scrollTrigger"
	import { ScrollSmoother } from "$scrollSmoother"

	gsap.registerPlugin(ScrollTrigger, ScrollSmoother)

	let canvasElem: HTMLCanvasElement
	let parentElem: HTMLElement
	let scene: Scene

	onMount(() => {
		const scene = new Scene(canvasElem)

		return () => {
			scene.destroy()
		}
	})
</script>

<svelte:head>
	<title>Hologram</title>
	<meta
		name="description"
		content="Hologram shader applied to the rigged mesh"
	/>
</svelte:head>

<div bind:this={parentElem} class="parent">
	<canvas bind:this={canvasElem} />
</div>

<style>
	.parent {
		width: 100vw;
		height: 100vh;
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
