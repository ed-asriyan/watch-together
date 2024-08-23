import { writable, type Readable } from 'svelte/store';

export const createCursorStore = function (timeout: number): Readable<boolean> {
    const { subscribe, set } = writable(false);
    
    let timeoutId: number;

    function resetTimer() {
        set(true);
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            set(false);
        }, timeout);
    }

    function handleMouseMove() {
        resetTimer();
    }

    window.addEventListener('mousemove', handleMouseMove);

    const destroy = function () {
        window.removeEventListener('mousemove', handleMouseMove);
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }

    return {
        subscribe (func) {
            const unsubscribe = subscribe(func);
            return function() {
                unsubscribe();
                destroy();
            }
        }
    };
};
