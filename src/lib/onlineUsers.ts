import { writable } from 'svelte/store';

export const onlineUsers = writable<{
	users: { id: string; name: string; x: number; y: number }[];
}>({
	users: []
});
