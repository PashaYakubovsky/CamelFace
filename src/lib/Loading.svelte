<script lang="ts">
	import { loading } from '$lib/loading';
	import { Clock } from 'svelte-loading-spinners';
</script>

{#if $loading}
	<div>
		<Clock size="50" color="#c19ce9" unit="vw" duration="10s" />
	</div>
{/if}

<style>
	div {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}
</style>
