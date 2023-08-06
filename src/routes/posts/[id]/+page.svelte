<script lang="ts">
	import { loading } from '$lib/loading';
	import { onMount } from 'svelte';
	import { getPost } from '$lib/api';
	import { page } from '$app/stores';
	import type { Post } from '../../../types';
	import Sidebar from '$lib/Sidebar.svelte';

	let post: Post | null;

	onMount(() => {
		const init = async () => {
			loading.update((state) => ({ ...state, loading: true }));

			post = await getPost({
				postId: $page.params.id ?? ''
			});

			loading.update((state) => ({ ...state, loading: false }));
		};

		init();
	});
</script>

{#if post}
	<title>{post.title}</title>

	<main class="p-5 flex overflow-y-scroll h-[100vh]">
		<div class="w-full flex justify-center flex-col">
			<h1 class="text-8xl mb-[2rem] text-center">{post?.title}</h1>

			<div class="w-full h-[25rem]">
				{#if typeof post?.backgroundImage === 'string'}
					<img
						class="w-full h-full object-contain"
						src={post.backgroundImage}
						alt={`image for ${post?.title} post`}
					/>
				{:else if post?.backgroundImage}
					<img
						class="w-full h-full object-contain"
						src={post.backgroundImage.url}
						alt={`image for ${post?.title} post`}
					/>
				{/if}
			</div>

			{#if post?.content}
				<div class="text-lg mt-[2rem] text-center">{post.content}</div>
			{/if}
		</div>

		<Sidebar />
	</main>
{/if}

<style>
	:global(#cursorP) {
		display: none;
	}
	main {
		background: linear-gradient(180deg, var(--primary) 0%, var(--secondary) 100%);
	}
</style>
