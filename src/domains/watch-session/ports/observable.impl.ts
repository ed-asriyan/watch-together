import type { Observable, Unsubscribe } from '../model/shared/observable';

/**
 * The smallest thing that satisfies `Observable`: a current value plus
 * subscribers, emitting synchronously on subscribe.
 *
 * Structurally a Svelte store, so the driving adapter gets `$view` for free
 * without anything below it importing `svelte`.
 */
export interface Emitter<T> extends Observable<T> {
    set(value: T): void;
    get(): T;
}

export const emitter = <T>(initial: T): Emitter<T> => {
    let current = initial;
    const listeners = new Set<(value: T) => void>();

    return {
        get: () => current,
        set(value: T) {
            current = value;
            listeners.forEach((run) => run(value));
        },
        subscribe(run: (value: T) => void): Unsubscribe {
            run(current);
            listeners.add(run);
            return () => listeners.delete(run);
        },
    };
};
