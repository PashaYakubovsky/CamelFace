/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { dev } from '$app/environment';

const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

if ('serviceWorker' in navigator) {
	addEventListener('load', function () {
		navigator.serviceWorker.register('./workers/sw.js', {
			type: dev ? 'module' : 'classic'
		});
	});
}
