<script lang="ts">
	import { onDestroy, onMount } from "svelte"
	import VoronoiScene from "./scene"

	let canvas: HTMLCanvasElement
	let scene: VoronoiScene
	let isSampling = true

	onMount(() => {
		scene = new VoronoiScene(canvas)
		scene.onSampleLoaded = () => {
			isSampling = false
		}
	})

	onDestroy(() => {
		if (scene) scene.destroy()
	})

	const handleSampleChange = (index: number) => {
		scene.index = index
		if (scene.material) {
			const target = scene.targets[index]
			scene.velocityUniforms["uTarget"].value = target
			scene.positionUniforms["uTarget"].value = target
		}
	}
</script>

<title>Voronoi</title>

<nav>
	<!-- samples list -->
	<ul>
		<li
			on:mouseenter={() => handleSampleChange(0)}
			class:active={scene?.index === 0}
		>
			Sample 1
		</li>
		<li
			on:mouseenter={() => handleSampleChange(1)}
			class:active={scene?.index === 1}
		>
			Sample 2
		</li>
		<li
			on:mouseenter={() => handleSampleChange(2)}
			class:active={scene?.index === 2}
		>
			Sample 3
		</li>
	</ul>
</nav>

{#if isSampling}
	<p class="loader">Sampling...</p>
{/if}

<canvas bind:this={canvas} class="canvas" />

<style>
	.loader {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 10;
		color: white;
	}
	.canvas {
		width: 100vw;
		height: 100vh;
		position: absolute;
		left: 0;
		top: 0;
		z-index: 1;
		object-fit: contain;
	}
	nav {
		position: absolute;
		top: 50%;
		left: 1rem;
		transform: translateY(-50%);
		z-index: 20;
		background: rgba(0, 0, 0, 0.5);
		color: rgb(23, 18, 18);
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		background-color: rgba(255, 248, 238, 0.995);
	}
	ul {
		list-style: none;
		padding: 0;
	}
	li {
		margin: 0.5rem 0;
		cursor: pointer;
	}
	li.active {
		font-weight: bold;
	}
</style>
