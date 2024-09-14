import { sveltekit } from "@sveltejs/kit/vite"
import { defineConfig } from "vite"
import glsl from "vite-plugin-glsl"

export default defineConfig({
	plugins: [sveltekit(), glsl()],
	server: {
		port: Number(process.env.PORT) || 5173,
	},
})
