<script lang="ts">
	import type { Post } from '../types';
	import { onMount } from 'svelte';
	import Scene from '../routes/scene';
	import { gsap } from 'gsap';
	import type * as THREE from 'three';
	import { handleHoverIn, handleHoverOut, pageTransition } from '$lib/pageTransition';
	import { loading } from './loading';

	export let blogPost: Post[] = [];

	let canvasElement: HTMLCanvasElement;
	let contentElements: HTMLElement[] = [];
	let pageWrapperElement: HTMLDivElement | null = null;
	let element: HTMLDivElement;
	let attractMode = false;
	let attractTo = 0;
	let rots: THREE.Euler[] = [];
	let positions: THREE.Vector3[] = [];
	let scales: THREE.Vector3[] = [];
	let scene: Scene;
	let navElements: HTMLButtonElement[] = [];
	let currentIndex = 0;
	let direction: 1 | -1 = 1;
	let disableBackground = false;
	let initAnimation = false;
	let goBackButtonElement: HTMLButtonElement;

	$: if (
		contentElements.length > 0 &&
		contentElements[currentIndex] &&
		(!attractMode || scene.isMobile)
	) {
		contentElements.forEach((content, idx) => {
			if (idx !== currentIndex) {
				content.classList.add('hidden');
			} else if (idx === currentIndex && content.classList.contains('hidden')) {
				content.classList.remove('hidden');
				gsap.fromTo(
					content.querySelector('.post-info__content'),
					{
						opacity: 0,
						yPercent: 20,
						ease: 'power0.inOut'
					},
					{
						opacity: 1,
						yPercent: 0,
						duration: 0.6,
						ease: 'power0.inOut'
					}
				);
			}
		});
	}

	// // scroll over bottom handle
	// $: if (currentIndex < 0 && direction === -1) {
	// 	attractMode = true;
	// 	attractTo = 0;
	// 	disableAttractMode = true;
	// }
	// // scroll over top handle
	// $: if (currentIndex > blogPost.length - 1 && direction === 1) {
	// 	attractMode = true;
	// 	attractTo = blogPost.length - 1;
	// 	disableAttractMode = true;
	// }
	// // disable attract mode when we scrolled to the right section
	// $: if (currentIndex === attractTo && disableAttractMode) {
	// 	setTimeout(() => (attractMode = false), 700);
	// 	disableAttractMode = false;
	// }

	$: {
		if (scene && !scene.isMobile) {
			scene.handleHoverIn = () => {
				handleHoverIn({ color: scene.textColors[currentIndex], start: $pageTransition.start });
			};

			scene.handleHoverOut = () => {
				const ctx = handleHoverOut({ start: $pageTransition.start });
			};

			scene.onClickEvent = (meshIndex: number) => {
				// reverse the index
				const rI = blogPost.length - 1 - meshIndex;
				debugger;
				if (meshIndex === currentIndex) {
					pageTransition.update((state) => ({
						...state,
						start: true,
						toPage: blogPost[rI].slug
						// toPage: '/posts/' + blogPost[currentIndex].id || '/'
					}));
				}
			};
		}
	}

	onMount(() => {
		const init = async () => {
			scene = new Scene(canvasElement);

			scene.textColors = blogPost.map((post) => post.textColor);
			// scene.backgroundColors = blogPost.map((post) => post.backgroundColor);

			goBackButtonElement = document.querySelector('#goBackButton') as HTMLButtonElement;

			navElements = Array.from(document.querySelectorAll('nav > button')) as HTMLButtonElement[];
			contentElements = Array.from(
				document.querySelectorAll('.post-info')
			).reverse() as HTMLElement[];

			await scene.addGallery({ posts: blogPost });

			rots = scene.groups.map((g) => g.rotation);
			positions = scene.meshes.map((g) => g.position);
			scales = scene.groups.map((g) => g.scale);

			let speed = 0;
			let position = 0;
			let rounded = 0;

			const objs = Array(blogPost.length)
				.fill(null)
				.map(() => {
					return {
						dist: 0
					};
				});

			window.addEventListener('wheel', (e) => {
				if (!scene.isMobile) {
					speed += e.deltaY * 0.0003;
					direction = Math.sign(e.deltaY) as 1 | -1;

					if (direction === -1 && Math.abs(currentIndex) === 0) {
						speed += e.deltaY * -0.0003;
					}
					if (direction === 1 && currentIndex === blogPost.length - 1) {
						speed += e.deltaY * -0.0003;
					}
				}
			});

			const raf = () => {
				position += speed;
				speed *= 0.8;
				rounded = Math.round(position);
				let diff = rounded - position;
				const nextIndex = +position.toFixed(0);

				// get current index of anchor
				currentIndex = nextIndex;

				if (pageWrapperElement) {
					// set color animated for canvas
					if (!disableBackground) {
						pageWrapperElement.style.backgroundColor = scene.backgroundColors[currentIndex];
						if (goBackButtonElement)
							goBackButtonElement.style.color = scene.textColors[currentIndex];
						loading.update((state) => ({ ...state, color: scene.textColors[currentIndex] }));

						scene.addColorToBGShader(scene.backgroundColors[currentIndex]);
					}

					navElements.forEach((navElement, i) => {
						if (i === currentIndex) {
							navElement.style.backgroundColor = scene.backgroundColors[i];
						} else {
							navElement.style.backgroundColor = '#fff';
						}
					});
				}

				if (initAnimation) {
					requestAnimationFrame(raf);
					return;
				}

				objs.forEach((obj, i) => {
					obj.dist = Math.min(Math.abs(position - i), 1);
					obj.dist = 1 - obj.dist ** 2;

					const mesh = scene.meshes[i];

					if (mesh) {
						(mesh.material as THREE.ShaderMaterial).uniforms.distanceFromCenter.value = obj.dist;
						const delta =
							(mesh.geometry as unknown as { parameters: { height: number } }).parameters.height *
							1.15;

						if (scene.isMobile) {
							mesh.position.x = i * 3.1 + -(position * 3.1);
						} else {
							const scale = 1 + 0.2 * obj.dist;
							mesh.scale.set(scale, scale, scale);
							mesh.position.y = i * delta + -(position * delta);
						}
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
				if (attractMode || initAnimation) return;

				attractMode = true;

				setTimeout(() => {
					attractMode = false;
				}, 700);

				if (e.key === 'ArrowUp' && attractTo <= blogPost.length - 1) {
					attractTo = attractTo + 1 > blogPost.length - 1 ? blogPost.length - 1 : attractTo + 1;
				} else if (e.key === 'ArrowDown' && attractTo >= 0) {
					attractTo = attractTo - 1 > 0 ? attractTo - 1 : 0;
				}
			});
		};

		init();

		return () => {
			scene.destroy();
		};
	});
</script>

<div class="pageWrapper" bind:this={pageWrapperElement}>
	<canvas bind:this={canvasElement} />

	<nav
		class="max-md:flex-row max-md:w-full absolute left-2 max-md:right-0 top-2 max-md:top-[auto] max-md:bottom-2 max-md:justify-center transform flex flex-col-reverse z-[10]"
		on:mouseenter={(e) => {
			e.stopPropagation();
			if (initAnimation) return;
			attractMode = true;

			if (!scene.isMobile) {
				disableBackground = true;

				contentElements.forEach((content) => {
					content.classList.add('hidden');
				});

				let scale = {
					x: 2.5,
					y: 2,
					z: 2
				};

				if (scene.screens.isMd) {
					scale = {
						x: 2.2,
						y: 1.7,
						z: 1.7
					};
				}
				if (scene.screens.isXl) {
					scale = {
						x: 1.5,
						y: 1,
						z: 1
					};
				}

				gsap.to(scales, {
					duration: 0.3,
					ease: 'power0.inOut',
					...scale
				});

				// const geometry = new THREE.PlaneGeometry(
				// 	window.innerWidth * 0.004,
				// 	window.innerWidth * 0.0025,
				// 	10,
				// 	10
				// );

				// scene.meshes.forEach((mesh) => {
				// 	// change with and height of mesh
				// 	mesh.geometry = geometry;
				// });

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
			}

			gsap.to(pageWrapperElement, {
				backgroundColor: '#000000',
				duration: 0.3,
				ease: 'power0.inOut'
			});
		}}
		on:mouseleave={(e) => {
			e.stopPropagation();
			if (initAnimation) return;
			attractMode = false;

			if (!scene.isMobile) {
				disableBackground = false;

				contentElements.forEach((content, idx) => {
					if (idx === currentIndex) {
						content.classList.remove('hidden');
					}
				});

				// scene.meshes.forEach((mesh) => {
				// 	// change with and height of mesh
				// 	mesh.geometry = scene.geometry;
				// });
				gsap.to(scales, {
					duration: 0.3,
					ease: 'power0.inOut',
					x: 1,
					y: 1,
					z: 1
				});

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
			}
		}}
	>
		{#each blogPost as post, index (post.id)}
			<button
				on:click={() => {
					if (scene.isMobile) {
						currentIndex = index;
					}
				}}
				on:mouseenter={() => {
					attractTo = index;
				}}
				class="bg-white mt-1 max-md:ml-1 min-w-[2vw] max-md:min-w-[4vw] min-h-[2vw] max-md:min-h-[4vw] h-4 rounded-full border border-gray-700 cursor-pointer"
			>
				<!-- {post.title} -->
			</button>
		{/each}
	</nav>

	<!-- loop over posts -->
	{#each blogPost as post, index (post.id)}
		<section
			class="post-info absolute left-0 h-screen w-1/2 max-md:w-full text-inherit transition duration-300 ease-in-out hidden mt-[5rem] pl-5 max-md:pl-0 flex-col justify-center max-md:bottom-0 max-md:h-[60%]"
		>
			<div
				class="post-info__content h-[fit-content] flex flex-col gap-[1rem] py-8 px-4 max-md:py-0 max-md:px-4"
			>
				<h2
					id="postTitle"
					data-content={post.title}
					style={`color:${scene?.textColors?.[index]}`}
					class="text-[7.2vw] leading-normal font-bold"
				>
					{post.title}
				</h2>

				<p
					style={`color:${scene?.textColors?.[index]}`}
					class={`text-[1rem] leading-7 max-md:h-[30vh] overflow-ellipsis overflow-hidden break-words`}
				>
					<!-- pas raw html -->
					{@html post.content}
				</p>
				<button
					on:mouseenter={() => {
						handleHoverIn({ color: scene.textColors[index], start: $pageTransition.start });
					}}
					on:mouseleave={() => {
						handleHoverOut({ start: $pageTransition.start });
					}}
					on:click={() => {
						pageTransition.update((state) => ({
							...state,
							start: true,
							toPage: '/posts/' + post.id
						}));
					}}
					style={`color:${scene?.textColors?.[index]}`}
					class="bg-transparent border-none cursor-pointer p-0 text-lg leading-5 flex items-center justify-start gap-4 uppercase w-fit"
				>
					Read more
					<svg
						width="24"
						height="24"
						xmlns="http://www.w3.org/2000/svg"
						fill-rule="evenodd"
						clip-rule="evenodd"
					>
						<path
							class="fill-[currentColor]"
							d="M21.883 12l-7.527 6.235.644.765 9-7.521-9-7.479-.645.764 7.529 6.236h-21.884v1h21.883z"
						/>
					</svg>
				</button>
			</div>
		</section>
	{/each}

	<!-- <div bind:this={element} class="scrollWrapper" /> -->
</div>

<style>
	button:hover svg {
		transform: translateX(0.5rem);
	}
	svg {
		transition: 0.3s ease-in-out transform;
	}
	h2 {
		overflow: hidden;
		transition: clip-path 0.3s ease-in-out;
		position: relative;
		display: inline-block;
		-webkit-text-fill-color: transparent;
		-webkit-text-stroke-width: 1px;
		-webkit-text-stroke-color: currentColor;
	}
	.pageWrapper {
		transition: 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) background-color;
		position: absolute;
		left: 0;
		top: 0;
		z-index: 1;
		min-height: 100vh;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}
	canvas {
		width: 100%;
		height: 100%;
		position: fixed;
		top: 0;
		left: 0;
	}
	@media (max-width: 768px) {
		h2 {
			-webkit-text-fill-color: currentColor;
		}
		canvas {
			height: 35% !important;
		}
	}
</style>
