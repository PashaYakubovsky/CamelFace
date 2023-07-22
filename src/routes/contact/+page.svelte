<script lang="ts">
	import { onMount } from 'svelte';
	import cloudsScene from './clouds';
	import { loading } from '$lib/loading';

	onMount(async () => {
		loading.update((state) => ({ ...state, loading: false }));
	});

	let canvasElement: HTMLCanvasElement;

	onMount(() => {
		const scene = new cloudsScene(canvasElement);
	});
</script>

<canvas bind:this={canvasElement} />
