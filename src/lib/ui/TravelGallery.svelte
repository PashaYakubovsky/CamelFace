<script lang="ts">
	import type { Post } from '../../types';
	import { onMount } from 'svelte';
	import Scene from '../../routes/scene';
	import { gsap } from 'gsap';
	import type * as THREE from 'three';
	import { handleHoverIn, handleHoverOut, pageTransition } from '$lib/pageTransition';
	import { loading, threejsLoading } from '$lib/loading';
	import { onlineUsers } from '$lib/onlineUsers';
	import { goto } from '$app/navigation';
	import { posts } from '$lib/posts';

	// export let $posts: Post[] = [];

	let canvasElement: HTMLCanvasElement;
	let contentElements: HTMLElement[] = [];
	let pageWrapperElement: HTMLDivElement | null = null;
	// let element: HTMLDivElement;
	let attractMode = false;
	let attractTo = 0;
	let rots: THREE.Euler[] = [];
	let positions: THREE.Vector3[] = [];
	let scales: THREE.Vector3[] = [];
	let materials: THREE.Material[] = [];
	let scene: Scene;
	let navElements: HTMLButtonElement[] = [];
	let currentIndex = 0;
	let direction: 1 | -1 = 1;
	let disableBackground = false;
	let initAnimation = false;
	let goBackButtonElement: HTMLButtonElement;
	let initHappen = false;
	let showInfoBlocks = false;
	let allTextureLoaded = false;

	let users = [] as {
		id: string;
		name: string;
		x: number;
		y: number;
	}[];

	onlineUsers.subscribe((value) => {
		users = value.users ?? [];
	});

	$: if (allTextureLoaded && !initHappen) {
		initHappen = true;
		showInfoBlocks = true;

		if (scene) {
			const tl = scene.initGalleryAnimation();
		}
	}

	threejsLoading.subscribe((value) => {
		allTextureLoaded = value.loaded;
		if (value.loaded) {
			attractTo = $posts.length - 1;
			attractMode = true;
			currentIndex = $posts.length - 1;
			setTimeout(() => {
				attractTo = 0;
				attractMode = false;
			}, 1000);
		}
	});

	$: if (
		contentElements.length > 0 &&
		contentElements[currentIndex] &&
		(!attractMode || scene.isMobile) &&
		showInfoBlocks
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

	let speed = 0;
	let position = 0;
	let rounded = 0;

	onMount(() => {
		const handleKeydown = (e: KeyboardEvent) => {
			if (attractMode || initAnimation) return;

			attractMode = true;

			setTimeout(() => {
				attractMode = false;
			}, 700);

			if (e.key === 'ArrowUp' && attractTo <= $posts.length - 1) {
				attractTo = attractTo + 1 > $posts.length - 1 ? $posts.length - 1 : attractTo + 1;
			} else if (e.key === 'ArrowDown' && attractTo >= 0) {
				attractTo = attractTo - 1 > 0 ? attractTo - 1 : 0;
			}
		};

		const handleWheel = (e: WheelEvent) => {
			if (!scene.isMobile) {
				speed += e.deltaY * -0.0003;
				direction = Math.sign(e.deltaY) as 1 | -1;

				if (scene.bgMaterial) {
					scene.bgMaterial.uniforms.uSpeed.value = speed * 10;
				}

				if (direction === 1 && Math.abs(currentIndex) === 0) {
					speed += e.deltaY * 0.0003;
				}
				if (direction === -1 && currentIndex === $posts.length - 1) {
					speed += e.deltaY * 0.0003;
				}
			}
		};

		const init = async () => {
			scene = new Scene(canvasElement);
			scene.textColors = $posts.map((post) => post.textColor);
			goBackButtonElement = document.querySelector('#goBackButton') as HTMLButtonElement;
			navElements = Array.from(document.querySelectorAll('nav > button')) as HTMLButtonElement[];
			contentElements = Array.from(document.querySelectorAll('.post-info')) as HTMLElement[];
			await scene.addGallery({ posts: $posts.slice() });
			rots = scene.groups.map((g) => g.rotation);
			positions = scene.groups.map((g) => g.position);
			scales = scene.groups.map((g) => g.scale);
			materials = scene.groups.map((g) => g.children[0].material);

			const objs = Array($posts.length)
				.fill(null)
				.map(() => {
					return {
						dist: 0
					};
				});

			const raf = () => {
				position += speed;
				speed *= 0.8;
				rounded = Math.round(position);
				let diff = rounded - position;
				let nextIndex = +position.toFixed(0);

				// get current index of anchor
				currentIndex = nextIndex;

				if (pageWrapperElement) {
					// set color animated for canvas
					if (!disableBackground) {
						gsap.to(pageWrapperElement, {
							backgroundColor: scene.backgroundColors[+position.toFixed(0)],
							duration: 0.6,
							ease: 'power0.inOut'
						});

						if (goBackButtonElement)
							goBackButtonElement.style.color = scene.textColors[currentIndex];
						loading.update((state) => ({ ...state, color: scene.textColors[currentIndex] }));

						scene.addColorToBGShader(scene.backgroundColors[currentIndex]);
					}
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
				}

				requestAnimationFrame(raf);
			};

			if (scene && !scene.isMobile) {
				scene.handleHoverIn = () => {
					handleHoverIn({ color: scene.textColors[currentIndex], start: $pageTransition.start });
				};

				scene.handleHoverOut = () => {
					const ctx = handleHoverOut({ start: $pageTransition.start });
				};

				scene.onClickEvent = (meshIndex: number) => {
					// reverse the index
					const rI = meshIndex;
					if (meshIndex === currentIndex) {
						goto($posts[rI].slug);
					}
				};
			}

			raf();

			window.addEventListener('wheel', handleWheel);
			window.addEventListener('keydown', handleKeydown);
		};

		init();

		return () => {
			scene.destroy();
			window.removeEventListener('wheel', handleWheel);
			window.removeEventListener('keydown', handleKeydown);
		};
	});

	const randomColorFromString = (str: string) => {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash);
		}
		let color = '#';
		for (let i = 0; i < 3; i++) {
			let value = (hash >> (i * 8)) & 0xff;
			color += ('00' + value.toString(16)).substr(-2);
		}
		return color;
	};
</script>

{#each Object.values(users) as user}
	<div
		class="user-mouse"
		style={`color:${randomColorFromString(user?.id)};transform:translate(${user.x * 100}%,${
			user.y * 100
		}%);transition:0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) transform`}
	>
		<span>{user.name}</span>
	</div>
{/each}

<div class="pageWrapper transition-colors" bind:this={pageWrapperElement}>
	<canvas bind:this={canvasElement} />

	<nav
		class={`gallery-nav ${allTextureLoaded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
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
						x: 1.6,
						y: 1.3,
						z: 1.2
					};
				}

				gsap.to(scales, {
					duration: 0.3,
					ease: 'power0.inOut',
					...scale
				});
				if (scene && scene.bgMaterial) scene.bgMaterial.uniforms.uEnabled = false;

				for (let i = 0; i < materials.length; i++) {
					const mat = materials[i];
					mat.uniforms.uMouse = { value: { x: 0.5, y: 0.5 } };
				}

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
		{#each $posts as post, index (post.id)}
			<button
				on:click={() => {
					if (scene.isMobile) {
						currentIndex = index;
					}
				}}
				on:mouseenter={() => {
					attractTo = $posts.findIndex((p) => p.id === post.id);
					// scene.changeVideo(index);
					scene.addColorToBGShader(scene.backgroundColors[currentIndex]);
				}}
				on:mouseleave={() => {
					if (scene && scene.bgMaterial) scene.bgMaterial.uniforms.uEnabled = true;
				}}
				class={`bg-white mt-1 max-md:ml-1 min-w-[2vw] max-md:min-w-[4vw] min-h-[2vw] max-md:min-h-[4vw] h-4 rounded-full border border-gray-700 cursor-pointer ${
					scene?.isMobile ? 'opacity-0' : 'opacity-100'
				} ${currentIndex === index ? 'bg-gray-700' : ''}`}
			>
				<!-- {post.title} -->
			</button>
		{/each}
	</nav>
	<!-- loop over posts -->
	{#each $posts as post, index (post.id)}
		<section
			class={`post-info hidden flex absolute left-5 h-screen w-1/2 max-md:w-full align-center text-inherit transition duration-300 ease-in-out pl-5 max-md:pl-0 flex-col justify-center max-md:bottom-0 max-md:h-[60%]`}
		>
			<div
				class="post-info__content h-[fit-content] flex flex-col gap-[1rem] py-8 px-4 max-md:py-0 max-md:px-4"
			>
				<h2
					id="postTitle"
					data-content={post.title}
					style={`color:${scene?.textColors?.[index]}`}
					class="text-[5.2vw] leading-normal font-bold"
				>
					{post.title}
				</h2>

				<p
					style={`color:${scene?.textColors?.[index]}`}
					class={`text-[1rem] leading-7 max-md:h-[30vh] overflow-ellipsis overflow-hidden break-words`}
				>
					{@html post.content}
				</p>
				<!-- <button
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
				</button> -->
			</div>
		</section>
	{/each}

	<!-- <div bind:this={element} class="scrollWrapper" /> -->
</div>

<style>
	/* button:hover svg {
		transform: translateX(0.5rem);
	}
	svg {
		transition: 0.3s ease-in-out transform;
	} */
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
	.user-mouse {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		position: absolute;
		z-index: 10;
		background-color: currentColor;
		text-align: center;
	}
	.user-mouse > span {
		position: absolute;
		top: 0;
		left: 100%;
		transform: translateX(0.5rem);
		opacity: 0;
		transition: 0.3s ease-in opacity;
	}
	.user-mouse > span:hover {
		opacity: 1;
	}
	.user-mouse:hover > span {
		opacity: 1;
	}
	.gallery-nav {
		position: fixed;
		top: 50%;
		transform: translateY(-50%);
		left: 0.5rem;
		display: flex;
		flex-direction: column-reverse;
		align-items: center;
		justify-content: center;
		z-index: 10;
		transition: 0.3s ease-in-out opacity;
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
