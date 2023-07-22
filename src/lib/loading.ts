import { writable } from 'svelte/store';

export const loading = writable({ loading: true, color: '#fff' });
