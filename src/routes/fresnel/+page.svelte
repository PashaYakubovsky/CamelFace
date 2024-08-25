<script lang="ts">
	import { onMount, onDestroy } from "svelte"
	import Scene from "./scene"
	import gsap from "$gsap"
	import { ScrollTrigger } from "$scrollTrigger"
	import { ScrollSmoother } from "$scrollSmoother"

	let canvasElem: HTMLCanvasElement
	let parentElem: HTMLElement
	let scene: Scene

	onMount(() => {
		gsap.registerPlugin(ScrollTrigger, ScrollSmoother)
		const smoother = new ScrollSmoother({
			content: parentElem,
			smooth: 1.5,
			effects: true,
			speed: 0.5,
			smoothTouch: true,
			normalizeScroll: true,
		})

		scene = new Scene(canvasElem)
	})

	onDestroy(() => {
		if (scene) scene.destroy()
	})
</script>

<svelte:head>
	<title>Fresnel</title>
	<meta name="description" content="Fresnel webgl" />
</svelte:head>

<div bind:this={parentElem} class="parent">
	<canvas bind:this={canvasElem} />
</div>

<style>
	.parent {
		width: 100vw;
		height: 100%;
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
