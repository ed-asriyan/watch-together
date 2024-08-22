import { writable } from "svelte/store";

export const blob = writable<Blob | null>(null);
