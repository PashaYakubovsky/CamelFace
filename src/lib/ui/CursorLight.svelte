<script lang="ts">
	import { gsap } from 'gsap/all';
	import { onMount } from 'svelte';

	onMount(() => {
		const element = document.getElementById('cursorP') as HTMLElement;

		if (!element) return;
		window.addEventListener('mousemove', (e) => {
			if (document.body.style.cursor === 'pointer') {
				gsap.to(element, {
					duration: 0.3,
					x: e.clientX,
					y: e.clientY,
					zIndex: 10,
					ease: 'power2.out'
				});
			} else {
				element.style.zIndex = '0';
			}
		});
	});
</script>

<!-- <div id="cursorP" class="max-md:hidden">
	<div id="cursor" />
</div> -->

<style>
	#cursorP {
		position: fixed;
		width: 1rem;
		height: 1rem;
		opacity: 0.2;
		transition: 0.3s ease-in-out opacity;
	}
	#cursor {
		border-radius: 50%;
		width: 100%;
		height: 100%;
		box-shadow: 0 0 1.5rem 2rem #fff;
		background-color: #fff;
	}
</style>
