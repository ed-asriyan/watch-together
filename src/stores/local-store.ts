import { writable, type Writable } from 'svelte/store';

export const createLocalStore = function (key: string, initialValue: string): Writable<string> {
    const storedValue = localStorage.getItem(key);
    const value = storedValue === null ? initialValue : storedValue;

    const { subscribe, set, update } = writable<string>(value);

    return {
        subscribe,
        set: (newValue: string) => {
            localStorage.setItem(key, newValue);
            set(newValue);
        },
        update: (updater: (value: string) => string) => {
            const newValue = updater(value);
            localStorage.setItem(key, newValue);
            update(updater);
        }
    };
};
