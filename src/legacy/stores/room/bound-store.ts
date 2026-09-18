import { get as getStore, writable, type Updater, type Writable, type Subscriber } from 'svelte/store';
import { onValue, get, set,type DatabaseReference } from 'firebase/database';

export class BoundStore<T> implements Writable<T> {
    private readonly store: Writable<T>;
    private readonly ref: DatabaseReference;

    constructor (ref: DatabaseReference, defaultValue: T) {
        this.ref = ref;
        this.store = writable<T>(defaultValue, set => {
            return onValue(ref, snapshot => {
                const newValue = snapshot.val();
                if (newValue !== undefined && newValue !== null) {
                    set(newValue);
                }
            });
        });
    }

    subscribe (f: Subscriber<T>) {
        return this.store.subscribe(f);
    }

    set (value: T) {
        if (value !== undefined) {
            this.store.set(value);
            set(this.ref, value);
        }
    }

    update (func: Updater<T>) {
        const currentValue = getStore(this.store);
        const newValue = func(currentValue);
        this.set(newValue);
    }

    async init () {
        const snapshot = await get(this.ref);
        if (snapshot.exists()) {
            this.store.set(snapshot.val());
        } else {
            this.set(getStore(this.store));
        }
    }
}
