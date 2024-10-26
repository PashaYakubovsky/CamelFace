<script lang="ts">
	import { goto } from "$app/navigation"
	import { gsap } from "gsap"
	import { posts } from "$lib/posts"
	import * as THREE from "three"
	import type TravelGalleryScene from "../../routes/scene"

	type Props = {
		allTextureLoaded: boolean
		attractMode: boolean
		attractTo: number
		initAnimation: boolean
		contentElements: HTMLElement[]
		pageWrapperElement: HTMLElement
		scales: THREE.Vector3[]
		rots: THREE.Euler[]
		positions: THREE.Vector3[]
		materials: THREE.ShaderMaterial[]
		scene: TravelGalleryScene
		currentIndex: number
		setAttractTo: (index: number) => void
		setAttractMode: (a: boolean) => void
	}

	let {
		allTextureLoaded,
		attractMode,
		attractTo,
		initAnimation,
		contentElements,
		pageWrapperElement,
		scales,
		rots,
		positions,
		materials,
		scene,
		currentIndex,
		setAttractTo,
		setAttractMode,
	}: Props = $props()
</script>

<nav
	class={`gallery-nav ${
		allTextureLoaded ? "opacity-100" : "opacity-0 pointer-events-none"
	}`}
	onmouseenter={(e) => {
		e.stopPropagation()
		// if (initAnimation) return
		attractMode = true
		setAttractMode?.(attractMode)

		contentElements.forEach((content) => {
			content.classList.add("hidden")
		})

		if (scene && scene.bgMaterial)
			scene.bgMaterial.uniforms.uEnabled.value = false

		for (let i = 0; i < materials.length; i++) {
			const mat = materials[i]
			mat.uniforms.uMouse.value = { x: 0.5, y: 0.5 }
		}

		gsap.to(rots, {
			duration: 0.3,
			ease: "power0.inOut",
			x: -0.5,
			y: 0,
			z: 0,
		})
		gsap.to(scales, {
			duration: 0.3,
			ease: "power0.inOut",
			x: "+=0.5",
			y: "+=0.2",
			z: 1,
		})
		gsap.to(positions, {
			duration: 0.3,
			ease: "power0.inOut",
			x: 0,
		})

		gsap.to(pageWrapperElement, {
			backgroundColor: "#000000",
			duration: 0.3,
			ease: "power0.inOut",
		})
	}}
	onmouseleave={(e) => {
		e.stopPropagation()
		if (initAnimation) return
		attractMode = false
		setAttractMode?.(attractMode)

		// if (!scene.isMobile) {

		contentElements.forEach((content, idx) => {
			if (idx === currentIndex) {
				content.classList.remove("hidden")
			}
		})

		gsap.to(scales, {
			duration: 0.3,
			ease: "power0.inOut",
			x: 1,
			y: 1,
			z: 1,
		})

		gsap.to(rots, {
			duration: 0.3,
			ease: "power0.inOut",
			x: scene?.eulerValues.x,
			y: scene?.eulerValues.y,
			z: scene?.eulerValues.z,
		})
		gsap.to(positions, {
			duration: 0.3,
			ease: "power0.inOut",
			x: scene?.positionValues.x,
		})
		// }
	}}
>
	{#each $posts as post, index (post.id)}
		{@const angle = (2 * Math.PI * index) / $posts.length}
		{@const itemWidth = 0.5}
		{@const radius = (10.5 - itemWidth) / 2}
		{@const x = radius * (1.2 + Math.cos(angle))}
		{@const y = radius * (1.2 + Math.sin(angle))}
		{@const style = `left: ${x}rem; top: ${y}rem;`}

		<button
			onclick={() => {
				if (scene?.isMobile) {
					// currentIndex = index
					attractMode = true
					attractTo = index
				} else {
					goto(post.slug)
					// route to post
				}
			}}
			onmouseenter={() => {
				attractTo = $posts.findIndex((p) => p.id === post.id)

				setAttractTo?.(attractTo)

				if (!attractMode) {
					attractMode = true
					setAttractMode?.(attractMode)
				}
				if (scene)
					scene.addColorToBGShader(scene?.backgroundColors[currentIndex])
			}}
			onmouseleave={() => {
				if (scene && scene?.bgMaterial)
					scene.bgMaterial.uniforms.uEnabled.value = true
			}}
			{style}
			class={`nav-item ${currentIndex === index ? "nav-item_active" : ""}`}
		>
			<span class="nav-item__text">
				{post.title}
			</span>
		</button>
	{/each}
</nav>

<style>
	.gallery-nav {
		position: fixed;
		top: 0.5rem;
		left: 0.5rem;
		display: flex;
		z-index: 10;
		transition: 0.3s ease-in-out all;
		border-radius: 50%;
		background-color: rgba(47, 47, 47, 0.5);
		width: 3.5rem;
		height: 3.5rem;
		border: 1px solid transparent;
	}
	.gallery-nav:hover {
		background-color: rgba(47, 47, 47, 0.9);
		border-color: rgba(250, 248, 248, 0.9);
	}
	.gallery-nav:hover .nav-item {
		opacity: 1;
	}
	.gallery-nav:after {
		content: "";
		position: absolute;
		left: 2rem;
		top: 2rem;
		width: 11rem;
		height: 11rem;
		background-color: transparent;
		z-index: 0;
		/* display: none; */
	}
	.gallery-nav:hover + .gallery-nav:after {
		display: block;
	}

	.nav-item {
		opacity: 0;
		position: absolute;
		z-index: 1;
		background-color: rgba(47, 47, 47, 0.9);
		color: #fff;
		border: 1px solid currentColor;
		align-self: flex-start;
		margin-top: 0.5rem;
		transition: 0.3s ease-in-out all;
		font-size: 1rem;
		line-height: 1rem;
		font-weight: 600;
		border-radius: 2rem;
		min-width: 2.5rem;
		min-height: 2.5rem;
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
		width: fit-content;
		padding: 0 0.25rem;
	}
	.nav-item:hover {
		width: fit-content;
		height: fit-content;
		z-index: 10;
		@media (max-width: 768px) {
			width: fit-content;
		}
	}
</style>
