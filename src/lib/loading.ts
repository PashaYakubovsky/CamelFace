import { writable } from 'svelte/store';

export const loading = writable({ loading: false, color: '#fff' });
