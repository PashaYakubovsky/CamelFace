<script lang="ts">
	import { onMount } from "svelte"
	import Scene from "../../routes/scene"
	import { gsap } from "$gsap"
	import type * as THREE from "three"
	import {
		handleHoverIn,
		handleHoverOut,
		pageTransition,
	} from "$lib/pageTransition"
	import { loading, threejsLoading } from "$lib/loading"
	import { onlineUsers } from "$lib/onlineUsers"
	import { goto } from "$app/navigation"
	import { posts } from "$lib/posts"
	import NavGallery from "./NavGallary.svelte"

	let canvasElement: HTMLCanvasElement
	let contentElements: HTMLElement[] = []
	let pageWrapperElement: HTMLDivElement | null = null
	let attractMode = false
	let attractTo = 0
	let rots: THREE.Euler[] = []
	let positions: THREE.Vector3[] = []
	let scales: THREE.Vector3[] = []
	let materials: THREE.ShaderMaterial[] = []
	let scene: Scene
	let currentIndex = 0
	let direction: 1 | -1 = 1
	let initAnimation = false
	let goBackButtonElement: HTMLButtonElement
	let initHappen = false
	let showInfoBlocks = false
	let allTextureLoaded = false
	let rafId: number | null = null

	let users = [] as {
		id: string
		name: string
		x: number
		y: number
	}[]

	onlineUsers.subscribe((value) => {
		users = value.users ?? []
	})

	$: if (allTextureLoaded && !initHappen) {
		initHappen = true
		showInfoBlocks = true
	}

	threejsLoading.subscribe((value) => {
		allTextureLoaded = value.loaded
		if (value.loaded) {
			attractTo = localStorage.getItem("attractTo")
				? parseInt(localStorage.getItem("attractTo") || "")
				: $posts.length - 1
			attractMode = true
			setTimeout(() => {
				attractMode = false
			}, 1000)
		}
	})

	const setAttractTo = (index: number) => {
		attractTo = index
		currentIndex = index
	}
	const setAttractMode = (mode: boolean) => {
		attractMode = mode
	}

	$: if (
		contentElements.length > 0 &&
		contentElements[currentIndex] &&
		(!attractMode || scene.isMobile) &&
		showInfoBlocks
	) {
		contentElements.forEach((content, idx) => {
			if (idx !== currentIndex) {
				content.classList.add("hidden")
				// stop animation loop in inner scene
				const integratedScene = scene.integratedScenesDict[$posts[idx].slug]

				if (integratedScene && typeof integratedScene.rafId === "number") {
					cancelAnimationFrame(integratedScene.rafId)
					integratedScene.rafId = null
				}
			} else if (
				idx === currentIndex &&
				content.classList.contains("hidden") &&
				scene.loaded
			) {
				content.classList.remove("hidden")
				const integratedScene = scene.integratedScenesDict[$posts[idx].slug]

				// animate html content
				gsap.fromTo(
					".post-info__content",
					{
						opacity: 0,
						yPercent: 20,
						ease: "power0.inOut",
					},
					{
						opacity: 1,
						yPercent: 0,
						duration: 0.6,
						ease: "power0.inOut",
					}
				)
				// start animation loop in inner scene
				if (integratedScene) {
					// console.log(integratedScene, 'SHOW');
					if (integratedScene.rafId) {
						cancelAnimationFrame(integratedScene.rafId)
						integratedScene.rafId = null
					}

					integratedScene.animate()
				}

				// animate color transition
				scene.addColorToBGShader(scene.backgroundColors[currentIndex])

				if (!canvasElement.classList.contains("canvas-ready")) {
					canvasElement.classList.add("canvas-ready")
				} else if (canvasElement) {
					canvasElement.classList.remove("canvas-ready")
					setTimeout(() => {
						if (canvasElement) canvasElement.classList.add("canvas-ready")
					}, 2000)
				}
			}
		})
	}

	let speed = 0
	let position = 0
	let rounded = 0

	onMount(() => {
		currentIndex = localStorage.getItem("attractTo")
			? parseInt(localStorage.getItem("attractTo") || "")
			: 0
		attractTo = currentIndex
		position = currentIndex

		const handleKeydown = (e: KeyboardEvent) => {
			if (attractMode || initAnimation) return

			attractMode = true

			setTimeout(() => {
				attractMode = false
			}, 700)

			if (e.key === "ArrowUp" && attractTo <= $posts.length - 1) {
				attractTo =
					attractTo + 1 > $posts.length - 1 ? $posts.length - 1 : attractTo + 1
			} else if (e.key === "ArrowDown" && attractTo >= 0) {
				attractTo = attractTo - 1 > 0 ? attractTo - 1 : 0
			}
		}

		const handleWheel = (e: WheelEvent) => {
			speed += e.deltaY * -0.0003
			direction = Math.sign(e.deltaY) as 1 | -1

			if (scene.bgMaterial) {
				scene.bgMaterial.uniforms.uSpeed.value = speed * 10
			}

			if (direction === 1 && Math.abs(currentIndex) === 0) {
				speed += e.deltaY * 0.0003
			}
			if (direction === -1 && currentIndex === $posts.length - 1) {
				speed += e.deltaY * 0.0003
			}
		}

		let prevPos = 0
		let lastInteraction = 0
		const handleTouchMove = (e: TouchEvent) => {
			if (Date.now() - lastInteraction > 100) {
				prevPos = e.touches[0].clientY
			}
			const touch = e.touches[0]
			const diff = touch.clientY - prevPos
			speed += diff * 0.003
			prevPos = touch.clientY
			lastInteraction = Date.now()
		}

		const init = async () => {
			// main scene setup
			scene = new Scene(canvasElement)
			scene.textColors = $posts.map((post) => post.textColor)
			goBackButtonElement = document.querySelector(
				"#goBackButton"
			) as HTMLButtonElement

			contentElements = Array.from(
				document.querySelectorAll(".post-info")
			) as HTMLElement[]
			await scene.addGallery({ posts: $posts.slice() })

			// fake loader
			scene.groups.forEach((g) => {
				g.visible = false
			})
			const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
			await wait(3000)

			scene.groups.forEach((g) => {
				g.visible = true
			})
			positions = scene.groups.map((g) => g.position)
			rots = scene.groups.map((g) => g.rotation)
			scales = scene.groups.map((g) => g.scale)
			materials = scene.groups.flatMap((g) =>
				"material" in g.children[0]
					? [g.children[0].material as THREE.ShaderMaterial]
					: []
			)

			const objs = Array($posts.length)
				.fill(null)
				.map(() => {
					return {
						dist: 0,
					}
				})

			const raf = () => {
				position += speed
				speed *= 0.7
				rounded = Math.round(position)
				let diff = rounded - position
				let nextIndex = +position.toFixed(0)

				// get current index of anchor
				currentIndex = nextIndex
				localStorage.setItem("attractTo", currentIndex.toString())

				if (pageWrapperElement) {
					// set color animated for canvas
					gsap.to(pageWrapperElement, {
						backgroundColor: scene.backgroundColors[+position.toFixed(0)],
						duration: 0.6,
						ease: "power0.inOut",
					})

					if (goBackButtonElement)
						goBackButtonElement.style.color = scene.textColors[currentIndex]
					loading.update((state) => ({
						...state,
						color: scene.textColors[currentIndex],
					}))
				}

				if (initAnimation) {
					rafId = requestAnimationFrame(raf)
					return
				}

				objs.forEach((obj, i) => {
					obj.dist = Math.min(Math.abs(position - i), 1)
					obj.dist = 1 - obj.dist ** 2

					const mesh = scene.meshes[i]

					if (mesh) {
						;(
							mesh.material as THREE.ShaderMaterial
						).uniforms.distanceFromCenter.value = obj.dist
						const delta =
							(mesh.geometry as unknown as { parameters: { height: number } })
								.parameters.height * 1.15

						// if (scene.isMobile) {
						// mesh.position.x = i * 3.1 + -(position * 3.1)
						// } else {
						const scale = 1 + 0.2 * obj.dist
						mesh.scale.set(scale, scale, scale)
						mesh.position.y = i * delta + -(position * delta)
						// }
					}
				})

				if (attractMode) {
					position += -(position - attractTo) * 0.1
				} else {
					position += Math.sign(diff) * Math.pow(Math.abs(diff), 0.7) * 0.015
				}

				// console.log(scene.integratedScenes[currentIndex], $posts[currentIndex]);

				rafId = requestAnimationFrame(raf)
			}

			if (
				scene
				// && !scene.isMobile
			) {
				scene.handleHoverIn = () => {
					handleHoverIn({
						color: scene.textColors[currentIndex],
						start: $pageTransition.start,
					})
				}

				scene.handleHoverOut = () => {
					const ctx = handleHoverOut({ start: $pageTransition.start })
				}

				scene.onClickEvent = (meshIndex: number) => {
					// reverse the index
					const rI = meshIndex
					if (meshIndex === currentIndex) {
						goto($posts[rI].slug)
					}
				}
			}

			raf()

			window.addEventListener("wheel", handleWheel)
			window.addEventListener("keydown", handleKeydown)
			window.addEventListener("touchmove", handleTouchMove)
		}

		init()

		return () => {
			scene.destroy()
			window.removeEventListener("wheel", handleWheel)
			window.removeEventListener("keydown", handleKeydown)
			window.removeEventListener("touchmove", handleTouchMove)
			if (rafId) cancelAnimationFrame(rafId)
		}
	})
</script>

<div class="pageWrapper transition-colors" bind:this={pageWrapperElement}>
	<canvas bind:this={canvasElement} />

	<NavGallery
		{setAttractTo}
		{setAttractMode}
		{scene}
		{contentElements}
		{currentIndex}
		{allTextureLoaded}
		{materials}
		{positions}
		{rots}
		{pageWrapperElement}
		{scales}
		{initAnimation}
	/>

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
					on:click={() => {
						if (scene.isMobile) {
							goto(post.slug)
						}
					}}
				>
					<h2
						id="postTitle"
						data-content={post.title}
						style={`color:${scene?.textColors?.[index]}`}
						class="text-[5.2vw] leading-normal font-bold"
					>
						{post.title}
					</h2>
				</button>

				<p
					style={`color:${scene?.textColors?.[index]}`}
					class={`text-[1rem] leading-7 max-md:h-[30vh] overflow-ellipsis overflow-hidden break-words`}
				>
					{@html post.content}
				</p>
			</div>
		</section>
	{/each}
</div>

<style>
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
	}

	@media (max-width: 768px) {
		h2 {
			-webkit-text-fill-color: currentColor;
		}
		canvas {
			height: 100vh !important;
		}
	}
</style>
