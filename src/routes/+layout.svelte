<script lang="ts">
	import '../styles/globals.scss';
	import '../styles/app.css';
	import Loading from '../lib/ui/Loading.svelte';
	import { pageTransition, transitionIn, transitionOut } from '$lib/pageTransition';
	import { afterNavigate } from '$app/navigation';
	import { loading } from '$lib/loading';
	import { onMount } from 'svelte';
	import { gsap } from 'gsap/all';
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

<slot />

<Copyright />

<!-- <Nav /> -->
