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

    function handleUserInteraction() {
        resetTimer();
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleUserInteraction);
    window.addEventListener('keydown', handleUserInteraction);

    const destroy = function () {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mousedown', handleUserInteraction);
        window.removeEventListener('keydown', handleUserInteraction);
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
