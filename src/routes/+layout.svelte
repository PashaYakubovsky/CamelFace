<script lang="ts">
	import '../styles/globals.scss';
	import '../styles/app.css';
	import Loading from '$lib/Loading.svelte';
	import { pageTransition, transitionIn, transitionOut } from '$lib/pageTransition';
	import { afterNavigate } from '$app/navigation';
	import { gsap } from 'gsap/all';

	let transition: HTMLDivElement;

	let previousPage: string | null = null;

	afterNavigate(({ from }) => {
		previousPage = from?.url?.pathname || previousPage;
	});

	pageTransition.subscribe((value) => {
		if (value.start && transition) {
			const tween = transitionIn({ toPage: value.toPage });

			tween.then(() => {
				transitionOut();
			});
		}
	});

	$: if (transition) gsap.set(transition, { opacity: 1, xPercent: -99.5, filter: 'blur(3px)' });
</script>

<Loading />

<!-- go back button -->
<div class={`absolute top-[4rem] right-[4rem] z-[10]`} style={`opacity:${previousPage ? 1 : 0}`}>
	<button
		id="goBackButton"
		class="bg-transparent border border-[currentColor] rounded-full w-[2rem] h-[2rem] flex justify-center items-center text-sky-500"
		on:click={() => {
			pageTransition.set({ start: true, toPage: previousPage || '/' });
		}}
	>
		←
	</button>
</div>

<div bind:this={transition} id="transition" class="h-screen w-screen bg-white absolute z-[9]" />

<slot />
