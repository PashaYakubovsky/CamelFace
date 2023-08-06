<script lang="ts">
	import { onMount } from 'svelte';
	import cloudsScene from './clouds';
	import { loading } from '$lib/loading';
	import { PUBLIC_EMAIL_ACCESS_KEY } from '$env/static/public';

	let status = '';
	let canvasElement: HTMLCanvasElement;

	const handleSubmit = async (
		data: Event & {
			readonly submitter: HTMLElement | null;
		} & {
			currentTarget: EventTarget & HTMLFormElement;
		}
	) => {
		status = 'Submitting...';
		const formData = new FormData(data.currentTarget);
		const object = Object.fromEntries(formData);
		const json = JSON.stringify(object);

		const response = await fetch('https://api.web3forms.com/submit', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			body: json
		});
		const result = await response.json();
		if (result.success) {
			status = result.message || 'Success';
		}
	};

	onMount(async () => {
		loading.update((state) => ({ ...state, loading: false }));
		const scene = new cloudsScene(canvasElement);
	});
</script>

<title>Contact us</title>

<form
	class="placeholder:text-gray-900 text-black max-md:ml-2 max-md:mr-2"
	on:submit|preventDefault={(e) => handleSubmit(e)}
>
	<input type="hidden" name="access_key" value={PUBLIC_EMAIL_ACCESS_KEY} />
	<input class="w-1/2 max-md:w-[90%]" placeholder="name" type="text" name="name" required />
	<input class="w-1/2 max-md:w-[90%]" placeholder="email" type="email" name="email" required />
	<textarea class="w-1/2 max-md:w-[90%]" placeholder="message" name="message" required rows="3" />
	<input
		class="w-1/2 max-md:w-[90%] cursor-pointer border border-gray-100 text-white hover:scale-110 transition ease-in-out"
		type="submit"
	/>
</form>

<div class="text-green-300 absolute left-[50%] top-[5rem] transform translate-x-[-50%] z-[11]">
	{status}
</div>

<canvas bind:this={canvasElement} />

<style>
	form {
		position: absolute;
		z-index: 2;
		top: 0;
		left: 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		width: 100%;
		height: 100%;
	}
	input,
	textarea {
		padding: 0.5rem 1rem;
		border-radius: 4px;
	}

	canvas {
		width: 100%;
		height: 100%;
		position: absolute;
		left: 0;
		top: 0;
		z-index: 1;
	}
</style>
