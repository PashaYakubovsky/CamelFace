<script lang="ts">
	import { loading } from "$lib/loading"
	import { Clock } from "svelte-loading-spinners"
</script>

{#if $loading.loading}
	<div class="wrapper">
		<Clock size="50" color={$loading.color} unit="vh" duration="10s" />
	</div>
{/if}

<style>
	.wrapper {
		width: 100vw;
		height: 100vh;
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 10;
		background-color: black;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
	}
</style>
