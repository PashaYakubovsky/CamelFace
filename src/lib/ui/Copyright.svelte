<script>
	export let githubLink = "https://github.com/pashaydev?tab=repositories"
</script>

<footer>
	<p>&copy;</p>
	<a href={githubLink}>Author</a>
</footer>

<style>
	footer {
		text-align: center;
		position: fixed;
		bottom: 0.5rem;
		left: 0.5rem;
		z-index: 1000;
		display: flex;
		gap: 0.25rem;
		align-items: center;
		font-size: 0.55rem;
	}
	a {
		color: var(--secondary);
		cursor: pointer;
	}
</style>
