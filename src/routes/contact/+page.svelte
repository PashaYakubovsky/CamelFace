<script lang="ts">
	import { onMount } from 'svelte';
	import cloudsScene from './clouds';

	let canvasElement: HTMLCanvasElement;

	onMount(() => {
		const scene = new cloudsScene(canvasElement);
	});
</script>

<canvas bind:this={canvasElement} />
