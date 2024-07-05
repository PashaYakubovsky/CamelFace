<script lang="ts">
	import { onMount } from 'svelte';
	import cloudsScene from './scene';
	import { loading } from '$lib/loading';

	let canvasElement: HTMLCanvasElement;
	let cursorElement: HTMLDivElement;

	onMount(() => {
		loading.update((state) => ({ ...state, loading: false }));
		const scene = new cloudsScene(canvasElement);

		return () => {
			scene.destroy();
		};
	});
</script>

<title>Fractal browning</title>

<canvas
	on:mousemove={(event) => {
		cursorElement.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
	}}
	bind:this={canvasElement}
/>

<div bind:this={cursorElement} class="cursor">
	<div class="cursor-1" />
	<div class="cursor-2" />
</div>
<div class="ui" />

<style>
	canvas {
		width: 100%;
		height: 100%;
		position: absolute;
		left: 0;
		top: 0;
		z-index: 1;
		cursor: none;
	}
	.cursor {
		position: absolute;
		width: 10px;
		height: 10px;
		/* background-color: rgb(252, 250, 250); */
		background-color: transparent;
		z-index: 2;
		pointer-events: none;
		transition: 0.3s ease-in-out filter;
		animation: glow 1s infinite;
	}
	.cursor-1 {
		position: absolute;
		width: 15px;
		height: 2px;
		background-color: rgb(255, 255, 255);
		border-radius: 50%;
		transition: 0.3s ease-in-out all;
		left: -7px;
		top: -1px;
	}
	.cursor-2 {
		position: absolute;
		width: 2px;
		height: 15px;
		background-color: rgb(255, 254, 254);
		border-radius: 50%;
		transition: 0.3s ease-in-out all;
		left: -1px;
		top: -7.5px;
	}
	@keyframes glow {
		0% {
			filter: drop-shadow(0 0 10px rgb(252, 250, 250));
		}
		50% {
			filter: drop-shadow(0 0 20px rgb(252, 250, 250));
		}
		100% {
			filter: drop-shadow(0 0 10px rgb(252, 250, 250));
		}
	}
</style>
