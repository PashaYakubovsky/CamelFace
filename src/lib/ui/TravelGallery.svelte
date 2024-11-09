<script lang="ts">
	import { onDestroy, onMount } from "svelte"
	import {
		handleHoverIn,
		handleHoverOut,
		pageTransition,
	} from "$lib/pageTransition"
	import { goto } from "$app/navigation"
	import { posts } from "$lib/posts"
	import { isInitNeeded } from "$lib/galleryStore"
	import TravelGalleryScene from "../../routes/Sketch"

	let canvasElement: HTMLCanvasElement
	let pageWrapperElement: HTMLDivElement | null = $state(null)
	let attractMode = $state(false)

	let scene: TravelGalleryScene | null = $state(null)
	let initHappen = $state(false)
	let showInfoBlocks = $state(false)
	let allTextureLoaded = $state(false)

	$effect(() => {
		if (allTextureLoaded && !initHappen) {
			initHappen = true
			showInfoBlocks = true
		}
	})

	onMount(() => {
		const handlePopState = (event: PopStateEvent) => {
			// Handle back/forward navigation
			console.log("Navigation occurred", event.state)
			$isInitNeeded = false
		}
		window.addEventListener("popstate", handlePopState)

		const init = async () => {
			// main scene setup
			scene = new TravelGalleryScene(canvasElement, $posts)
			await scene.addGallery()

			scene.handleHoverIn = () => {
				handleHoverIn({
					color: scene?.textColors[scene.currentIndex] || "",
					start: $pageTransition.start,
				})
			}
			scene.handleHoverOut = () => {
				const ctx = handleHoverOut({ start: $pageTransition.start })
			}
			scene.handleHoverNavItem = (post) => {
				if (!scene) return
				const index = scene.posts.findIndex((p) => p.slug === post.slug)
				if (index !== -1) {
					scene.attractTo = index
					if (!attractMode) {
						scene.attractMode = true
					}
					scene.handleChangeSelection()
				}
			}
			scene.handleHoverOutNavItem = () => {
				if (scene) scene.attractMode = false
			}
			scene.onClickEvent = (meshIndex: number) => {
				if (window.innerWidth < 768) {
					return
				}
				// reverse the index
				const rI = meshIndex
				goto($posts[rI].slug)
			}
		}

		init()
	})

	onDestroy(() => {
		if (scene) {
			scene.destroy()
		}
	})
</script>

<div class="pageWrapper transition-colors" bind:this={pageWrapperElement}>
	<!-- svelte-ignore element_invalid_self_closing_tag -->
	<canvas bind:this={canvasElement}></canvas>

	<!-- loop over posts -->
	{#each $posts as post, index (post.id)}
		<section
			class={`post-info hidden flex absolute left-5 h-screen w-1/2 max-md:w-full align-center text-inherit transition duration-300 ease-in-out pl-5 max-md:pl-0 flex-col justify-center max-md:bottom-0 max-md:h-[60%]`}
		>
			<div
				class="post-info__content h-[fit-content] flex flex-col gap-[1rem] py-8 px-4 max-md:py-0 max-md:px-4"
			>
				<button
					class="p-0 m-0 w-fit"
					onclick={() => {
						if (scene?.isMobile) {
							goto(post.slug)
						}
					}}
				>
					<a
						id="postTitle"
						data-content={post.title}
						class={`text-[5.6vw] leading-normal font-bold whitespace-nowrap hover:underline`}
						style={`color: ${post.textColor};`}
						href={`${post.slug}`}
					>
						{post.title}
					</a>
				</button>

				<p
					class={`text-[1rem] leading-7 max-md:h-[30vh] overflow-ellipsis overflow-hidden break-words`}
					style={`color: ${post.textColor};`}
				>
					{@html post.content}
				</p>
			</div>
		</section>
	{/each}
</div>

<style>
	#postTitle {
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
		min-height: 100svh;
		height: 100svh;
		width: 100%;
		overflow: hidden;
	}
	canvas {
		width: 100%;
		height: 100%;
		position: fixed;
		top: 0;
		left: 0;
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
		@media (max-width: 768px) {
			left: 0;
			flex-direction: row;
			bottom: 1rem;
			width: 100%;
			justify-content: space-around;
			padding: 0.5rem 0;
			top: auto;
			bottom: 0;
		}
	}
	.nav-item {
		background-color: rgb(250, 248, 248);
		color: rgb(47, 47, 47);
		border: 1px solid currentColor;
		align-self: flex-start;
		margin-top: 0.5rem;
		transition: 0.3s ease-in-out all;
		font-size: 1rem;
		line-height: 1rem;
		overflow: hidden;
		font-weight: 600;
		border-radius: 2rem;
		min-width: 1.5rem;
		min-height: 1.5rem;
		font-family: "Manrope", sans-serif;
	}
	.nav-item_active {
		background-color: rgb(47, 47, 47);
		color: rgb(250, 248, 248);
	}
	.nav-item__text {
		display: block;
		width: 0px;
		overflow: hidden;
		transition: 0.3s ease-in-out all;
		white-space: nowrap;
	}
	.nav-item:hover .nav-item__text {
		width: 9rem;
	}
	.nav-item:hover {
		width: 100%;
		height: fit-content;
		@media (max-width: 768px) {
			width: fit-content;
		}
	}
	.post-info__content {
		max-width: 95svw;
		opacity: 1;
		transition: 0.3s ease-in-out all;
	}
	@keyframes slideIn {
		from {
			transform: translateY(30%);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}
	.hidden .post-info__content {
		opacity: 0;
	}
	:not(.hidden) .post-info__content {
		animation: slideIn 0.6s ease-in-out forwards;
	}

	@media (max-width: 768px) {
		#postTitle {
			-webkit-text-fill-color: currentColor;
		}
		canvas {
			height: 100vh !important;
		}
		.post-info {
			max-height: 200px;
			flex-direction: column;
			justify-content: center;
			align-items: flex-start;
		}
	}
</style>
