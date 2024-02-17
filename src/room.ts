import { writable } from 'svelte/store';

export const url = writable<string>('');

export const time = writable<number>(0);

export const paused = writable<boolean>(false);
