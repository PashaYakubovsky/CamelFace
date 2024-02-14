<script lang="ts">
	import '../styles/globals.scss';
	import '../styles/app.css';
	import Loading from '../lib/ui/Loading.svelte';
	import { pageTransition, transitionIn, transitionOut } from '$lib/pageTransition';
	import { afterNavigate } from '$app/navigation';
	import { loading } from '$lib/loading';
	import { onMount, getContext } from 'svelte';
	import { gsap } from 'gsap/all';
	import CursorLight from '$lib/ui/CursorLight.svelte';
	import Copyright from '$lib/ui/Copyright.svelte';
	import Nav from '$lib/ui/Nav.svelte';
	import { popupStore } from '$lib/popup';
	import { Modal } from 'svelte-simple-modal';
	import io from 'socket.io-client';
	import { onlineUsers } from '$lib/onlineUsers';

	const socket = io('https://travelblogcms.onrender.com:3000');
	// const socket = io('http://localhost:3000');

	let transition: HTMLDivElement;
	let previousPage: string | null = null;
	let animationStarted = false;
	let currentPage = window.location.pathname;

	let userName = '';
	let openPopup = false;
	let popupMessage = '';

	popupStore.subscribe((value) => {
		openPopup = value.show;
		popupMessage = value.message;
	});

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
		const uN = localStorage.getItem('userName');
		if (uN) {
			userName = uN;
			socket.emit('join', { name: userName });
		} else {
			popupStore.update((state) => ({
				...state,
				show: true,
				message: 'Please enter your name',
				type: 'input'
			}));
		}

		socket.on('users', (data) => {
			if (socket.id && socket.id in data) delete data[socket.id];
			onlineUsers.update((state) => ({
				...state,
				users: data
			}));
		});

		const handleMouseMove = (e: MouseEvent) => {
			const xPercent = Math.round((e.clientX / window.innerWidth) * 100);
			const yPercent = Math.round((e.clientY / window.innerHeight) * 100);
			socket.emit('mousemove', {
				x: xPercent,
				y: yPercent
			});
		};

		document.addEventListener('mousemove', handleMouseMove);

		return () => {
			socket.emit('leave', { name: userName });
			socket.disconnect();
		};
	});
</script>

<Loading />

{#if openPopup}
	<div
		class="absolute
		top-0 left-0 w-full h-full flex justify-center items-center z-[100]"
	>
		<Modal>
			<div class="bg-[var(--primary)] p-4 rounded-lg">
				<p class="text-[var(--secondary)]">{popupMessage}</p>
				<input
					type="text"
					class="bg-[var(--secondary)] text-[var(--primary)] p-2 rounded-lg w-full mt-4"
					bind:value={userName}
				/>
				<button
					class="bg-[var(--secondary)] text-[var(--primary)] p-2 rounded-lg w-full mt-4"
					on:click={() => {
						localStorage.setItem('userName', userName);
						socket.emit('join', { name: userName });
						popupStore.update((state) => ({ ...state, show: false }));
					}}
				>
					Submit
				</button>
			</div>
		</Modal>
	</div>
{/if}
<!-- go back button -->
<!-- <div
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
</div> -->

<!-- <div bind:this={transition} id="transition" /> -->

<!-- <CursorLight /> -->

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
