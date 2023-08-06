<script lang="ts">
	import { onMount } from 'svelte';
	import Scene from './scene';

	let canvas: HTMLCanvasElement | null = null;

	onMount(() => {
		if (!canvas) return null;
		const scene = new Scene(canvas);
	});
</script>

<canvas bind:this={canvas} />
