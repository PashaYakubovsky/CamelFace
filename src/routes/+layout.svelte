<script lang="ts">
	import '../styles/globals.scss';
	import { navigating } from '$app/stores';
	import { loading } from '$lib/loading';
	import Loading from '$lib/Loading.svelte';

	$: setTimeout(() => {
		loading.set(false);
	}, 2000);
</script>

<Loading />

<slot />
