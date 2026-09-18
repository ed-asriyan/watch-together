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

    const events: (keyof WindowEventMap)[] = [
        'mousedown',
        'keydown',
        'mousemove',
    ];

    for (const event of events) {
        window.addEventListener(event, resetTimer);
    }

    return {
        subscribe
    };
};

export const cursorActive = createCursorStore(5000);
