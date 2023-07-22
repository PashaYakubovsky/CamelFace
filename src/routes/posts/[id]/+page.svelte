<script lang="ts">
	import { posts } from '$lib/posts';
	import { loading } from '$lib/loading';
	import { onMount } from 'svelte';
	import { getPost } from '$lib/api';
	import { page } from '$app/stores';
	import type { Post } from '../../../types';

	let post: Post | null;

	onMount(async () => {
		loading.update((state) => ({ ...state, loading: true }));

		post = await getPost({
			postId: $page.params.id ?? ''
		});

		loading.update((state) => ({ ...state, loading: false }));
	});
</script>
