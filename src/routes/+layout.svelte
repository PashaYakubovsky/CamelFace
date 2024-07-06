<script lang="ts">
	import '../styles/globals.scss';
	import '../styles/app.css';
	import Copyright from '$lib/ui/Copyright.svelte';

	import Analytics from '$lib/analytics.svelte';
</script>

<slot />

<Analytics />

<Copyright />

<!-- <Nav /> -->
