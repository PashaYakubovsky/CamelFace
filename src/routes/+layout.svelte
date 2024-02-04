<script lang="ts">
	import '../styles/globals.scss';
	import '../styles/app.css';
	import Loading from '$lib/Loading.svelte';
	import { pageTransition, transitionIn, transitionOut } from '$lib/pageTransition';
	import { afterNavigate } from '$app/navigation';
	import { loading } from '$lib/loading';
	import { onMount } from 'svelte';
	import { gsap } from 'gsap/all';
	import CursorLight from '$lib/CursorLight.svelte';
	import Copyright from '$lib/Copyright.svelte';
	import Nav from '$lib/Nav.svelte';

	let transition: HTMLDivElement;

	let previousPage: string | null = null;
	let animationStarted = false;
	// get current page in svelte
	let currentPage = window.location.pathname;

	afterNavigate(({ from }) => {
		previousPage = from?.url?.pathname || previousPage;
		currentPage = window.location.pathname;
	});

	pageTransition.subscribe((value) => {
		if (value.start && transition && !animationStarted) {
			animationStarted = true;
			const tween = transitionIn({ toPage: value.toPage });

			if (tween) {
				tween.then(() => {
					transitionOut().then(() => {
						animationStarted = false;
					});
				});
			} else {
				animationStarted = false;
			}
		}
	});

	onMount(() => {
		gsap.set(transition, { xPercent: -99.5, filter: 'blur(3px)' });
	});
</script>

<Loading />

<!-- go back button -->
<div
	class={`absolute top-[2rem] max-md:top-[1rem] right-[4rem] max-md:right-[1rem] z-[10] ${
		$loading.loading ? 'cursor-progress' : ''
	}`}
	style={`opacity:${previousPage || window.location.pathname !== '/' ? 1 : 0}`}
>
	<button
		id="goBackButton"
		class="bg-transparent hover:scale-110 transition ease-in-out border border-[currentColor] rounded-full w-[2.5rem] h-[2.5rem] flex justify-center items-center text-[var(--secondary)]"
		on:click={() => {
			pageTransition.update((state) => ({ ...state, start: true, toPage: previousPage || '/' }));
		}}
	>
		<svg
			width="24"
			height="24"
			xmlns="http://www.w3.org/2000/svg"
			fill-rule="evenodd"
			clip-rule="evenodd"
		>
			<path
				class="fill-[currentColor]"
				d="M21.883
				 12l-7.527 6.235.644.765 9-7.521-9-7.479-.645.764 7.529 6.236h-21.884v1h21.883z"
			/>
		</svg>
	</button>
</div>

<div bind:this={transition} id="transition" />

<CursorLight />

<slot />

<Copyright />

<Nav />

<style>
	svg {
		transform: rotate(180deg);
	}
	#transition {
		background-size: 100% 100%;
		background-repeat: no-repeat;
		background-position: center;
		height: 100vh;
		width: 100vw;
		position: absolute;
		z-index: 9;
	}
</style>
