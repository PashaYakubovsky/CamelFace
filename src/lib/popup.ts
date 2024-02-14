import { writable } from 'svelte/store';

export const popupStore = writable<{ show: boolean; message: string; type: string }>({
	show: false,
	message: '',
	type: ''
});
