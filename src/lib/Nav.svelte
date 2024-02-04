<script lang="ts">
	import { onMount } from 'svelte';
	import gsap from 'gsap';

	const handleClick = (e: MouseEvent) => {
		e.stopPropagation();
	};

	let navContainer: HTMLButtonElement;
	let isOpen = false;

	onMount(() => {
		gsap.set(navContainer, { xPercent: 99.5, filter: 'blur(3px)' });
		const links = gsap.utils.toArray('.nav-link');

		navContainer.addEventListener('click', () => {
			gsap.to(navContainer, { xPercent: 0, filter: 'blur(0px)', duration: 0.5 });
			gsap.to(links, { x: 0, opacity: 1, stagger: 0.1, duration: 0.5 });
			isOpen = true;
		});

		document.addEventListener('click', (e) => {
			if (e.target !== navContainer) {
				gsap.to(navContainer, { xPercent: 99.5, filter: 'blur(3px)', duration: 0.5 });
				gsap.to(links, { x: -20, opacity: 0, stagger: 0.1, duration: 0.5 });
				isOpen = false;
			}
		});

		navContainer.addEventListener('click', handleClick);

		return () => {
			navContainer.removeEventListener('click', handleClick);
		};
	});

	const handleLinkClick = (e: MouseEvent, url: string) => {
		if (!isOpen) return;

		e.preventDefault();
		e.stopPropagation();
		gsap.to(navContainer, { xPercent: 99.5, filter: 'blur(3px)', duration: 0.5 });
		gsap.to('.nav-link', { x: -20, opacity: 0, stagger: 0.1, duration: 0.5 });
		isOpen = false;
		history.pushState({}, '', url);
		history.go();
	};
</script>

<button
	bind:this={navContainer}
	on:click={(e) => {
		e.stopPropagation();
	}}
	class="menu"
>
	<a on:click={(e) => handleLinkClick(e, '/galaxy')} href="#" class="nav-link">Galaxy</a>
	<a on:click={(e) => handleLinkClick(e, '/mandelbrot')} href="#" class="nav-link">Mandelbrot set</a
	>
	<a on:click={(e) => handleLinkClick(e, '/fbm')} href="#" class="nav-link"
		>Fractal browning motion</a
	>
	<a on:click={(e) => handleLinkClick(e, '/cardioid')} href="#" class="nav-link">Cardioid</a>
	<a on:click={(e) => handleLinkClick(e, '/lyapunov')} href="#" class="nav-link">Lyapunov fractal</a
	>
</button>

<style>
	.menu {
		position: fixed;
		top: 1rem;
		right: 1rem;
		background-color: var(--primary);
		border-radius: 0.25rem;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: flex-start;
		cursor: pointer;
		z-index: 999;
		transition: background-color 0.3s ease;
	}
	a {
		color: var(--secondary);
		text-decoration: none;
		font-size: 1.5rem;
		opacity: 0;
		transform: translateX(-20px);
		transition: opacity 0.3s ease, text-shadow 0.3s ease;
	}
	a:hover {
		text-shadow: 0 0 0.5rem var(--secondary);
	}
</style>
