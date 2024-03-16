<script lang="ts">
	import { loading } from '$lib/loading';
	import { Clock } from 'svelte-loading-spinners';
	import { threejsLoading } from '$lib/loading';
</script>

{#if $loading.loading}
	<div class="wrapper">
		<Clock size="50" color={$loading.color} unit="vh" duration="10s" />
		<progress max="100" value={$threejsLoading.progress} />
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
	progress {
		position: fixed;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 100;
		width: 50vw;
		height: 1rem;
		border-radius: 1rem;
	}
	progress::-webkit-progress-bar {
		background-color: #f4f4f4;
		border-radius: 1rem;
	}
	progress::-webkit-progress-value {
		background-color: #00c8ff;
		border-radius: 1rem;
	}
</style>
