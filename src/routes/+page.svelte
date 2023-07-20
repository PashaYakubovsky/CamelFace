<script lang="ts">
	import { onMount } from 'svelte';
	import Scene from './scene';
	import db from '../lib/posts.json';
	import type { TravelBlogPost } from '../types';
	import { gsap } from 'gsap';
	import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';
	import { loading } from '$lib/loading';

	let posts = db.posts as TravelBlogPost[];

	let canvasElement: HTMLCanvasElement;
	let sectionsElements: HTMLElement[] = [];
	let pageWrapperElement: HTMLDivElement | null = null;
	let element: HTMLDivElement;
	let attractMode = false;
	let attractTo = 0;
	let rots: THREE.Euler[] = [];
	let positions: THREE.Vector3[] = [];
	let scene: Scene;
	let navElements: HTMLButtonElement[] = [];
	let currentIndex = 0;
	let direction: 1 | -1 = 1;
	let disableAttractMode = false;
	let disableBackground = false;

	// scroll over bottom handle
	$: if (currentIndex < 0 && direction === -1) {
		attractMode = true;
		attractTo = 0;
		disableAttractMode = true;
	}
	// scroll over top handle
	$: if (currentIndex > db.posts.length - 1 && direction === 1) {
		attractMode = true;
		attractTo = db.posts.length - 1;
		disableAttractMode = true;
	}
	// disable attract mode when we scrolled to the right section
	$: if (currentIndex === attractTo && disableAttractMode) {
		setTimeout(() => (attractMode = false), 700);
		disableAttractMode = false;
	}

	$: if (scene) {
		scene.loaderManager.onLoad = () => {
			setTimeout(() => {
				loading.set(false);
			}, 1000);
		};
	}

	onMount(async () => {
		gsap.registerPlugin(ScrollTrigger);
		scene = new Scene(canvasElement);

		sectionsElements = Array.from(document.querySelectorAll('section')) as HTMLElement[];
		navElements = Array.from(document.querySelectorAll('nav > button')) as HTMLButtonElement[];

		await scene.addGallery();

		let speed = 0;
		let position = 0;
		let rounded = 0;
		rots = scene.groups.map((g) => g.rotation);
		positions = scene.meshes.map((g) => g.position);

		const objs = Array(db.posts.length)
			.fill(null)
			.map(() => {
				return {
					dist: 0
				};
			});

		window.addEventListener('wheel', (e) => {
			speed += e.deltaY * 0.0003;
			direction = Math.sign(e.deltaY) as 1 | -1;
		});
		let lastY = 0;
		window.addEventListener('touchmove', (e) => {
			const currentY = e.touches[0].clientY;
			if (currentY > lastY) {
				direction = -1;
			} else if (currentY < lastY) {
				direction = 1;
			}
			lastY = currentY;

			speed += e.touches[0].clientY * 0.0001 * -direction;
		});

		const raf = () => {
			position += speed;
			speed *= 0.8;
			rounded = Math.round(position);

			let diff = rounded - position;
			// get current index of anchor
			currentIndex = +position.toFixed(0);

			objs.forEach((obj, i) => {
				obj.dist = Math.min(Math.abs(position - i), 1);
				obj.dist = 1 - obj.dist ** 2;

				if (pageWrapperElement) {
					// set color animated for canvas
					if (!disableBackground) {
						pageWrapperElement.style.backgroundColor = scene.backgroundColors[currentIndex];
					}
					navElements.forEach((navElement, i) => {
						if (i === currentIndex) {
							navElement.style.backgroundColor = scene.backgroundColors[i];
						} else {
							navElement.style.backgroundColor = '';
						}
					});
				}

				const mesh = scene.meshes[i];
				if (mesh) {
					const scale = 1 + 0.4 * obj.dist;
					mesh.scale.set(scale, scale, scale);
					(mesh.material as THREE.ShaderMaterial).uniforms.distanceFromCenter.value = obj.dist;
					mesh.position.y = i * 2.5 + -(position * 2.5);
				}
			});

			if (attractMode) {
				position += -(position - attractTo) * 0.1;
			} else {
				position += Math.sign(diff) * Math.pow(Math.abs(diff), 0.7) * 0.015;
				if (element) element.style.transform = `translateY(${-position * 100}px)`;
			}

			requestAnimationFrame(raf);
		};

		raf();

		window.addEventListener('keydown', (e) => {
			if (attractMode) return;

			attractMode = true;

			setTimeout(() => {
				attractMode = false;
			}, 700);

			if (e.key === 'ArrowUp' && attractTo <= db.posts.length - 1) {
				attractTo = attractTo + 1 > db.posts.length - 1 ? db.posts.length - 1 : attractTo + 1;
			} else if (e.key === 'ArrowDown' && attractTo >= 0) {
				attractTo = attractTo - 1 > 0 ? attractTo - 1 : 0;
			}
		});
	});
</script>

<div class="pageWrapper" bind:this={pageWrapperElement}>
	<!-- loop over posts -->
	<!-- {#each posts as post (post.id)}
		<section data-scroll-section>
			{JSON.stringify(post)}
		</section>
	{/each} -->
	<canvas bind:this={canvasElement} />

	<nav
		on:mouseenter={() => {
			attractMode = true;
			disableBackground = true;

			gsap.to(rots, {
				duration: 0.3,
				ease: 'power0.inOut',
				x: -0.5,
				y: 0,
				z: 0
			});

			gsap.to(positions, {
				duration: 0.3,
				ease: 'power0.inOut',
				x: 0
			});

			gsap.to(pageWrapperElement, {
				backgroundColor: '#000000',
				duration: 0.3,
				ease: 'power0.inOut'
			});
		}}
		on:mouseleave={() => {
			attractMode = false;
			disableBackground = false;

			gsap.to(rots, {
				duration: 0.3,
				ease: 'power0.inOut',
				x: scene.eulerValues.x,
				y: scene.eulerValues.y,
				z: scene.eulerValues.z
			});

			gsap.to(positions, {
				duration: 0.3,
				ease: 'power0.inOut',
				x: scene.positionValues.x
			});
		}}
	>
		{#each posts as post, index (post.id)}
			<button
				class={`button-active-${index}`}
				on:mouseenter={() => {
					attractTo = index;
				}}
				on:click={() => {
					attractTo = index;
				}}
			>
				<!-- {post.title} -->
			</button>
		{/each}
	</nav>

	<div bind:this={element} class="scrollWrapper">
		<!-- <div class="anchor" />
		<div class="anchor" />
		<div class="anchor" />
		<div class="anchor" />
		<div class="anchor" />
		<div class="anchor" /> -->
	</div>
</div>

<style>
	nav {
		list-style: none;
		display: flex;
		align-items: flex-end;
		flex-direction: column-reverse;
		width: fit-content;
		gap: 1rem;
		position: absolute;
		z-index: 10;
		right: 0;
		padding-right: 2rem;
		top: 50%;
		width: 10vw;
		transform: translateY(-50%);
	}
	nav > button {
		list-style: none;
		padding: 0.5rem;
		cursor: pointer;
		border: 1px solid #e5e5e5;
		border-radius: 0.5rem;
	}
	.pageWrapper {
		transition: 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) background-color;
		position: absolute;
		left: 0;
		top: 0;
		z-index: 100;
		min-height: 100vh;
		width: 100%;
		height: 100%;
	}
	.scrollWrapper {
		display: flex;
		flex-direction: column;
		gap: 10rem;
		position: relative;
		align-items: flex-end;
		height: 100%;
		z-index: 9;
	}
	canvas {
		width: 100%;
		height: 100%;
		position: fixed;
		top: 0;
		left: 0;
	}
</style>
