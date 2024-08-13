<script lang="ts">
	import TravelGallery from '$lib/ui/TravelGallery.svelte';
	import { posts } from '$lib/posts';
	import { onMount } from 'svelte';
	import { getPosts } from '$lib/api';
	import Loading from '$lib/ui/Loading.svelte';

	const titles = [
		'May the force be with you',
		'One ring to rule them all',
		'Do or do not, there is no try',
		'Not all those who wander are lost',
		'The Force will be with you, always',
		'May the odds be ever in your favor',
		'I solemnly swear that I am up to no good',
		'Live long and prosper',
		'Valar Morghulis',
		'Winter is coming',
		'May the Schwartz be with you',
		'Great power comes with great responsibility',
		'May the bridges I burn light the way',
		'Stay hungry, stay foolish',
		'Adventure awaits',
		'Courage is not the absence of fear',
		'Be yourself; everyone else is already taken',
		'Stay curious',
		'Embrace the journey',
		'Find your own path',
		'Believe in the impossible',
		'Explore, dream, discover',
		'Create your own destiny',
		'Follow your passion',
		'Seek the unknown',
		'Chase your dreams',
		'Discover the magic',
		'Escape the ordinary',
		'Embrace your inner nerd',
		'Unlock your imagination',
		'Venture into the unknown'
	];

	let title = titles[0];
	let intervalId: NodeJS.Timeout;

	const randomTitle = () => {
		const randomIndex = Math.floor(Math.random() * titles.length);
		const randomT = titles[randomIndex];
		title = randomT[0];
		const dur = 500;

		const id = setInterval(() => {
			// add a characters to the title
			title = randomT.slice(0, title.length + 1);
			if (title === randomT) {
				clearInterval(intervalId);
				const id = setTimeout(() => {
					randomTitle();
				}, dur);
				intervalId = id;
			}
		}, dur);

		intervalId = id;
	};

	onMount(() => {
		randomTitle();
		// disable scroll
		document.body.style.overflow = 'hidden';

		return () => {
			clearInterval(intervalId);
			document.body.style.overflow = 'auto';
		};
	});

	let isLoaded = false;
	onMount(() => {
		if (isLoaded) return;
		getPosts().then(() => {
			isLoaded = true;
		});
	});
</script>

<title>
	{title}
</title>

<Loading />

{#if $posts.length > 0}
	<TravelGallery />
{/if}
