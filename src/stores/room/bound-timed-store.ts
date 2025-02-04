import { type Writable, type Readable, readable, writable, get, type Subscriber, type Updater } from 'svelte/store';
import type { DatabaseReference } from 'firebase/database';
import { BoundStore } from './bound-store';
import { now } from '../clock';

interface TimedValue<T> {
    value: T;
    updatedAt: number;
}
export class BoundTimedStore<T> implements Writable<T> {
    private readonly remote: BoundStore<TimedValue<T>>;
    private readonly store: Writable<TimedValue<T>>;
    readonly updatedAt: Readable<number>;

    constructor (ref: DatabaseReference, defaultValue: T, tolerance: number = 0) {
        const defauleRaw = { value: defaultValue, updatedAt: now() };
        this.remote = new BoundStore(ref, defauleRaw);
        this.store = writable<TimedValue<T>>(defauleRaw, set => {
            return this.remote.subscribe(newValue => {
                const storeValue = get(this.store);
                if (newValue.value !== storeValue.value && newValue.updatedAt > storeValue.updatedAt + tolerance) {
                    set(newValue);
                }
            });
        });
        this.updatedAt = readable<number>(get(this.store)?.updatedAt, set => {
            return this.store.subscribe(({ updatedAt }) => set(updatedAt));
        });
    }

    subscribe (f: Subscriber<T>) {
        let oldValue: T | null = null;
        return this.store.subscribe(({ value }) => {
            if (value !== oldValue) {
                oldValue = value;
                f(value)
            }
        });
    }

    private setWithKnownCurrentValue (value: T, currentValue: T) {
        if (value !== undefined && value !== currentValue) {
            const raw = { value, updatedAt: now() };
            this.store.set(raw);
            this.remote.set(raw);
        }
    }

    set (value: T) {
        this.setWithKnownCurrentValue(value, get(this.store)?.value);
    }

    update (func: Updater<T>) {
        const currentValue = get(this.store)?.value;
        const newValue = func(currentValue);
        this.setWithKnownCurrentValue(newValue, currentValue);
    }

    async init () {
        await this.remote.init();
        this.store.set(get(this.remote));
    }
}
