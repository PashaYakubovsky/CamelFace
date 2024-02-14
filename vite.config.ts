import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
import resolve from 'rollup-plugin-node-resolve';

export default defineConfig({
	plugins: [
		sveltekit(),
		glsl(),
		resolve({
			dedupe: ['svelte', 'svelte/transition', 'svelte/internal'] // important!
		})
	]
});
