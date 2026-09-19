import { readable, type Readable } from 'svelte/store';

/**
 * Whether the pointer/keyboard has been active recently. Purely presentational
 * — it decides when overlay chrome fades — so it stays in the driving adapter
 * and needs no port.
 */
export const createCursorActive = function (timeoutMs: number): Readable<boolean> {
    return readable(false, (set) => {
        let id: ReturnType<typeof setTimeout>;
        const bump = () => {
            set(true);
            clearTimeout(id);
            id = setTimeout(() => set(false), timeoutMs);
        };
        const events = ['mousedown', 'keydown', 'mousemove'] as const;
        events.forEach((e) => window.addEventListener(e, bump));
        bump();
        return () => {
            clearTimeout(id);
            events.forEach((e) => window.removeEventListener(e, bump));
        };
    });
};

export const cursorActive = createCursorActive(5000);
