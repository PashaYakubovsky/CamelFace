<script lang="ts">
	import '../styles/globals.scss';
	import '../styles/app.css';
	import Copyright from '$lib/ui/Copyright.svelte';
	import { page } from '$app/stores';

	import { onMount } from 'svelte';
	import { firebaseAuth } from '$lib/firebase/firebase.app';
	import { v4 as uuidv4 } from 'uuid';

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

	$: {
		if (typeof gtag !== 'undefined') {
			gtag('config', 'G-WNGXJE3D6K', {
				page_title: document.title,
				page_path: $page.url.pathname
			});
		}
	}
</script>

<svelte:head>
	<script async src="https://www.googletagmanager.com/gtag/js?id=G-WNGXJE3D6K">
	</script>
	<script>
		window.dataLayer = window.dataLayer || [];

		function gtag() {
			dataLayer.push(arguments);
		}

		gtag('js', new Date());
		gtag('config', 'G-WNGXJE3D6K');
	</script>
</svelte:head>

<slot />

<Copyright />

<!-- <Nav /> -->
