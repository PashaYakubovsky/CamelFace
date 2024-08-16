<script lang="ts">
	import { page } from '$app/stores';
	// get is production or development
	import { onMount } from 'svelte';

	$: {
		const mode = import.meta.env.MODE;
		if (typeof gtag !== 'undefined' && mode !== 'development') {
			console.log('gtag is defined');
			gtag('config', 'G-WNGXJE3D6K', {
				page_title: document.title,
				page_path: $page.url.pathname
			});
		}
	}
</script>

<svelte:head>
	<script async src="https://www.googletagmanager.com/gtag/js?id=G-WNGXJE3D6K">
	</script>
	<script>
		window.dataLayer = window.dataLayer || [];

		function gtag() {
			dataLayer.push(arguments);
		}

		gtag('js', new Date());
		gtag('config', 'G-WNGXJE3D6K');
	</script>
</svelte:head>
