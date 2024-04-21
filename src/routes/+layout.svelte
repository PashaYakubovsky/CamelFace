<script lang="ts">
	import '../styles/globals.scss';
	import '../styles/app.css';
	import Copyright from '$lib/ui/Copyright.svelte';

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
</script>

<slot />

<Copyright />

<!-- <Nav /> -->
