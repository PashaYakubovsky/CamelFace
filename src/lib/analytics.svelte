<script lang="ts">
	import { page } from "$app/stores"
	// get is production or development

	$: {
		const mode = import.meta.env.MODE
		if (typeof gtag !== "undefined" && mode !== "development") {
			console.log("gtag is defined")
			gtag("config", "G-PR3VD9Z8NB", {
				page_title: document.title,
				page_path: $page.url.pathname,
			})
		}
	}
</script>

<svelte:head>
	<script async src="https://www.googletagmanager.com/gtag/js?id=G-PR3VD9Z8NB">
	</script>
	<script>
		window.dataLayer = window.dataLayer || []

		function gtag() {
			dataLayer.push(arguments)
		}

		gtag("js", new Date())
		gtag("config", "G-PR3VD9Z8NB")
	</script>
</svelte:head>
