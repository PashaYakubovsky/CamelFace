<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Scene from './scene';
	import gsap from 'gsap';
	import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';
	import { ScrollSmoother } from 'gsap/dist/ScrollSmoother';

	let canvasElem: HTMLCanvasElement;
	let parentElem: HTMLElement;
	let scene: Scene;

	onMount(() => {
		gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
		const smoother = new ScrollSmoother({
			content: parentElem,
			smooth: 1.5,
			effects: true,
			speed: 0.5,
			smoothTouch: true,
			normalizeScroll: true
		});

		scene = new Scene(canvasElem);
		scene.onReady = () => {
			const particlesMaterial = scene.particles.material;

			const tl = gsap.timeline({
				scrollTrigger: {
					trigger: parentElem,
					pin: canvasElem,
					start: 'top top',
					end: 'bottom bottom',
					toggleActions: 'play none none reverse',
					scrub: 1,
					onUpdate: (self) => {
						const targetIndex = Math.floor(self.progress * 3);
						const index = Math.ceil(self.progress * 3);
						const progress = (self.progress * 3) % 1;

						scene.debugObject.progress = progress;
						// update gui
						if (scene.gui) scene.gui.controllers[1].updateDisplay();

						console.log('[morph:targets]', index, targetIndex);

						if (index !== targetIndex && progress > 0) {
							scene.morph({
								index,
								targetIndex
							});
						}

						if (particlesMaterial) {
							// 0-1 for progress for each morph
							console.log('[morph:progress]', progress);
							// if index is 3 and progress is 0, then it's the last morph and we should set progress to 1
							particlesMaterial.uniforms.uProgress.value =
								index === 3 && progress === 0 ? 1 : progress;
						}
					}
				}
			});
		};
	});

	onDestroy(() => {
		if (scene) scene.destroy();
	});
</script>

<title>Morphing</title>

<div bind:this={parentElem} class="parent">
	<canvas bind:this={canvasElem} />
</div>

<style>
	/* global style for body */
	:global(body) {
		overflow: auto !important;
	}
	.parent {
		width: 100vw;
		height: 600vh;
		overflow: hidden;
		position: relative;
	}
	canvas {
		width: 100vw;
		height: 100vh;
		position: absolute;
		left: 0;
		top: 0;
		z-index: 10;
	}
</style>
