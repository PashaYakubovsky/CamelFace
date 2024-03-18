<script lang="ts">
	import '../styles/globals.scss';
	import '../styles/app.css';
	import Copyright from '$lib/ui/Copyright.svelte';
	import Nav from '$lib/ui/Nav.svelte';
</script>

<slot />

<Copyright />

<Nav />
