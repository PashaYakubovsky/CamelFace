<script lang="ts">
	import { onMount } from 'svelte';
	import cloudsScene from './clouds';
	import { loading } from '$lib/loading';

	onMount(async () => {
		loading.set(false);
	});

	let canvasElement: HTMLCanvasElement;

	onMount(() => {
		const scene = new cloudsScene(canvasElement);
	});
</script>

<canvas bind:this={canvasElement} />
