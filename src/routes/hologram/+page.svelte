<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Scene from './scene';
	import gsap from 'gsap';
	import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';
	import { ScrollSmoother } from 'gsap/dist/ScrollSmoother';
	gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

	let canvasElem: HTMLCanvasElement;
	let parentElem: HTMLElement;
	let scene: Scene;

	onMount(() => {
		const scene = new Scene(canvasElem);

		return () => {
			scene.destroy();
		};
	});
</script>

<title>Hologram</title>

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
