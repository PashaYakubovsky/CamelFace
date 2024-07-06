<script lang="ts">
	import '../styles/globals.scss';
	import '../styles/app.css';
	import Copyright from '$lib/ui/Copyright.svelte';

	import { onMount } from 'svelte';
	import { firebaseAuth } from '$lib/firebase/firebase.app';
	import { v4 as uuidv4 } from 'uuid';
	import { PUBLIC_GOOGLE_ANALYTICS_ID as GOOGLE_ANALYTICS_ID } from '$env/static/public';
	let userId: string = localStorage.getItem('userId') || uuidv4();

	onMount(() => {
		localStorage.setItem('userId', userId);

		// Listen to token generation
		firebaseAuth.onIdTokenChanged(async (user) => {
			if (user) {
				//send the token to the server
				const token = await user.getIdToken();
				await fetch('/api/auth', {
					method: 'POST',
					body: JSON.stringify({ token: token })
				});
			}
		});
		firebaseAuth.onAuthStateChanged(async (user) => {});
	});

	onMount(() => {
		//@ts-ignore
		window.dataLayer = window.dataLayer || [];
		function gtag() {
			//@ts-ignore
			dataLayer.push(arguments);
		}
		//@ts-ignore
		gtag('js', new Date());
		//@ts-ignore
		gtag('config', GOOGLE_ANALYTICS_ID);
	});
</script>

<slot />

<Copyright />

<!-- <Nav /> -->
