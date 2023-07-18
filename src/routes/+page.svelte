<script lang="ts">
	import { onMount } from 'svelte';
	import Scene from './scene';
	import db from '../lib/posts.json';
	import type { TravelBlogPost } from '../types';
	import { gsap } from 'gsap';
	import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

	let posts = db.posts as TravelBlogPost[];

	let canvasElement: HTMLCanvasElement;
	let sectionsElements: HTMLElement[] = [];
	let pageWrapperElement: HTMLDivElement | null = null;
	let currentIndex = 0;
	let element: HTMLDivElement;
	let attractMode = false;
	let attractTo = 0;
	let rots: THREE.Euler[] = [];
	let scene: Scene;

	onMount(async () => {
		// if (pageWrapperElement) {
		// 	pageWrapperElement.style.backgroundColor = scene.backgroundColors[0];
		// 	sectionsElements[0].style.color = scene.textColors[0];
		// }
		// gsap.to(sectionsElements, {
		// 	scrollTrigger: {
		// 		trigger: pageWrapperElement,
		// 		start: 'min',
		// 		end: 'max',
		// 		scrub: true,
		// 		toggleActions: 'play none none reverse',
		// 		onUpdate: (tween) => {
		// 			const progress = tween.progress;
		// 			const _currentIndex = Math.round(progress * (sectionsElements.length - 1));
		// 			scene.groups.forEach((mesh) => {
		// 				gsap.to(mesh.position, {
		// 					y: tween.direction ? '+' : '-' + '=0.01'
		// 				});
		// 			});
		// 			if (currentIndex !== _currentIndex && pageWrapperElement && sectionsElements) {
		// 				currentIndex = _currentIndex;
		// 				pageWrapperElement.style.backgroundColor = scene.backgroundColors[currentIndex];
		// 				sectionsElements[currentIndex].style.color = scene.textColors[currentIndex];
		// 			}
		// 		},
		// 		snap: {
		// 			snapTo: 1 / (sectionsElements.length - 1),
		// 			duration: 0.3,
		// 			delay: 0.1,
		// 			ease: 'power1.inOut'
		// 		}
		// 	}
		// });
		// scene.meshes.forEach((mesh, index) => {
		// 	let dist = 0.02;
		// 	dist = 1 - dist ** 2;
		// 	gsap.to(mesh.scale, {
		// 		duration: 1,
		// 		x: 1.8,
		// 		y: 1.8,
		// 		z: 1.8,
		// 		scrollTrigger: {
		// 			trigger: sectionsElements[index],
		// 			start: 'top 0%',
		// 			end: '50%',
		// 			scrub: true,
		// 			toggleActions: 'play none none reverse',
		// 			markers: true
		// 		}
		// 	});
		// });
	});

	onMount(async () => {
		gsap.registerPlugin(ScrollTrigger);
		scene = new Scene(canvasElement);

		sectionsElements = Array.from(document.querySelectorAll('section')) as HTMLElement[];

		await scene.addGallery();

		let speed = 0;
		let position = 0;
		let rounded = 0;
		rots = scene.groups.map((g) => g.rotation);

		const objs = Array(db.posts.length)
			.fill(null)
			.map(() => {
				return {
					dist: 0
				};
			});

		window.addEventListener('wheel', (e) => {
			speed += e.deltaY * 0.0003;
		});

		const raf = () => {
			position += speed;
			speed *= 0.8;

			rounded = Math.round(position);

			let diff = rounded - position;

			objs.forEach((obj, i) => {
				obj.dist = Math.min(Math.abs(position - i), 1);
				obj.dist = 1 - obj.dist ** 2;

				// get current index of anchor
				const index = Math.round(position);

				if (pageWrapperElement) {
					// set color animated for canvas
					pageWrapperElement.style.backgroundColor = scene.backgroundColors[index];
				}

				const mesh = scene.meshes[i];
				if (mesh) {
					const scale = 1 + 0.4 * obj.dist;
					mesh.scale.set(scale, scale, scale);
					(mesh.material as THREE.ShaderMaterial).uniforms.distanceFromCenter.value = obj.dist;
					mesh.position.y = i * 2 + -(position * 2);
				}
			});

			if (attractMode) {
				position += -(position - attractTo) * 0.1;
			} else {
				position += Math.sign(diff) * Math.pow(Math.abs(diff), 0.7) * 0.15;
				if (element) element.style.transform = `translateY(${-position * 100}px)`;
			}

			requestAnimationFrame(raf);
		};

		raf();
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

			gsap.to(rots, {
				duration: 0.3,
				ease: 'power4.inOut',
				x: 0,
				y: 0,
				z: 0
			});
		}}
		on:mouseleave={() => {
			attractMode = false;

			gsap.to(rots, {
				duration: 0.3,
				ease: 'power0.inOut',
				x: scene.eulerValues.x,
				y: scene.eulerValues.y,
				z: scene.eulerValues.z
			});
		}}
	>
		{#each posts as post, index (post.id)}
			<button
				on:click={() => {
					attractTo = index;
				}}
			>
				{post.title}
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
		align-items: flex-start;
		flex-direction: column-reverse;
		width: fit-content;
		gap: 1rem;
		margin-left: 0.5rem;
		margin-top: 0.5rem;
		position: relative;
		z-index: 10;
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
		z-index: 20;
	}
	canvas {
		width: 100%;
		height: 100%;
		position: fixed;
		top: 0;
		left: 0;
	}
	.anchor {
		width: 50%;
		height: 0.5rem;
		background-color: blue;
	}
</style>
