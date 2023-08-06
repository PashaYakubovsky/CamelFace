<script lang="ts">
	import TravelGallery from '$lib/TravelGallery.svelte';
	import { posts } from '$lib/posts';
	import { onMount } from 'svelte';
	import type { Post } from '../../types';
	import { getPosts } from '$lib/api';

	let blogPost: Post[] = [];

	posts.subscribe((value) => {
		blogPost = value;
	});

	onMount(async () => {
		await getPosts();
	});
</script>

<title>Jet Set Together</title>

{#if blogPost.length > 0}
	<TravelGallery {blogPost} />
{/if}
