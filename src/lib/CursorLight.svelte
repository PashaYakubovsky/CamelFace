<script lang="ts">
	import { onMount } from 'svelte';

	onMount(() => {
		const element = document.getElementById('cursor') as HTMLElement;

		window.addEventListener('mousemove', (e) => {
			element.setAttribute(
				'style',
				`transform:translate(${e.clientX}px,${e.clientY}px);${
					document.body.style.cursor === 'pointer' ? 'z-index:10;' : ''
				}`
			);
		});
	});
</script>

<div id="cursor" class="max-md:hidden" />

<style>
	div {
		position: fixed;
		width: 4rem;
		height: 4rem;
		border-radius: 50%;
		left: -2rem;
		top: -2rem;
		box-shadow: 0 0 0.5rem 1.5rem #fff;
		opacity: 0.2;
		background-color: #fff;
		transition: 0.3s ease-in-out opacity;
	}
</style>
