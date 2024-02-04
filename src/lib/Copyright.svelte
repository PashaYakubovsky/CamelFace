<script>
	export let githubLink = 'https://github.com/PashaYakubovsky?tab=repositories';
</script>

<footer>
	<p>&copy; {new Date().getFullYear()}</p>
	<a href={githubLink}>Author</a>
</footer>

<style>
	footer {
		text-align: center;
		position: absolute;
		bottom: 0.5rem;
		left: 0.5rem;
		z-index: 1000;
		display: flex;
		gap: 0.5rem;
	}
	a {
		color: var(--secondary);
		cursor: pointer;
	}
</style>
