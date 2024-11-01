import adapter from "@sveltejs/adapter-node"
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte"

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// See https://kit.svelte.dev/docs/adapters for more information about adapters.
		adapter: adapter(),
		alias: {
			$gsap: "src/lib/gsap-business/esm/index.js",
			$scrollTrigger: "src/lib/gsap-business/esm/ScrollTrigger.js",
			$scrollSmoother: "src/lib/gsap-business/esm/ScrollSmoother.js",
		},
		// since <link rel="stylesheet"> isn't
		// allowed, inline all styles
		// inlineStyleThreshold: Infinity,
	},
}

export default config
