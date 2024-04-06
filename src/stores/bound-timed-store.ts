import { type Writable, type Readable, readable, writable, get, type Subscriber, type Updater } from 'svelte/store';
import type { DatabaseReference } from 'firebase/database';
import { BoundStore } from './bound-store';
import { now } from './clock';

interface TimedValue<T> {
    value: T;
    updatedAt: number;
}
export class BoundTimedStore<T> implements Writable<T> {
    private readonly remote: BoundStore<TimedValue<T>>;
    private readonly store: Writable<TimedValue<T>>;
    readonly updatedAt: Readable<number>;

    constructor (ref: DatabaseReference, defaultValue: T) {
        const defauleRaw = { value: defaultValue, updatedAt: 0 };
        this.remote = new BoundStore(ref, defauleRaw);
        this.store = writable<TimedValue<T>>(defauleRaw, set => {
            return this.remote.subscribe(newValue => {
                const storeValue = get(this.store);
                if (newValue.updatedAt > storeValue.updatedAt) {
                    set(newValue);
                }
            });
        });
        this.updatedAt = readable<number>(get(this.store)?.updatedAt, set => {
            return this.store.subscribe(({ updatedAt }) => set(updatedAt));
        });
    }

    subscribe (f: Subscriber<T>) {
        return this.store.subscribe(({ value }) => f(value));
    }

    set (value: T) {
        if (value !== undefined) {
            const raw = { value, updatedAt: now() };
            this.store.set(raw);
            this.remote.set(raw);
        }
    }

    update (func: Updater<T>) {
        const currentValue = get(this.store)?.value;
        const newValue = func(currentValue);
        this.set(newValue);
    }

    async init () {
        await this.remote.init();
    }
}
