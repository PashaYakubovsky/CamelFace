<script lang="ts">
	import '../styles/globals.scss';
	import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';
	import gsap from 'gsap';
	import { onMount } from 'svelte';
	import LocomotiveScroll from 'locomotive-scroll';

	let element: HTMLElement;

	// onMount(() => {
	// 	gsap.registerPlugin(ScrollTrigger);

	// 	const locomotiveScroll = new LocomotiveScroll({
	// 		el: document.querySelector('[data-scroll-container]') as HTMLElement,
	// 		lerp: 0.01
	// 	});

	// 	// tell ScrollTrigger to use these proxy methods for the ".smooth-scroll" element since Locomotive Scroll is hijacking things
	// 	ScrollTrigger.scrollerProxy('.smooth-scroll', {
	// 		scrollTop(value) {
	// 			if (!Number.isFinite(value)) {
	// 				// @ts-ignore
	// 				return locomotiveScroll.scroll.instance.scroll.y;
	// 			}
	// 			// @ts-ignore
	// 			return locomotiveScroll.scrollTo(value, 0);
	// 		}, // we don't have to define a scrollLeft because we're only scrolling vertically.
	// 		getBoundingClientRect() {
	// 			return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
	// 		}
	// 	});

	// 	locomotiveScroll.on('scroll', ScrollTrigger.update);

	// 	ScrollTrigger.defaults({ scroller: element });
	// });

	
</script>

<main class="smooth-scroll" data-scroll-container>
	<slot />
</main>
