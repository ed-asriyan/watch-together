import { get as getStore, writable, type Updater, type Writable, type Readable, type Subscriber, readable } from 'svelte/store';
import { ref, onValue, get, set, child, update, getDatabase, type DatabaseReference } from 'firebase/database';
import { initializeApp } from 'firebase/app';
import { now } from './clock';
import { firebaseConfig } from '../settings';

export const database = getDatabase(initializeApp(firebaseConfig));

export class BoundStore<T> implements Writable<T> {
    private readonly store: Writable<{ value: T, updatedAt: number }>;
    private readonly ref: DatabaseReference;
    readonly updatedAt: Readable<number>;

    constructor (ref: DatabaseReference) {
        this.ref = ref;
        this.store = writable<{ value: T, updatedAt: number }>(undefined, set => {
            return onValue(ref, snapshot => {
                const newValue = snapshot.val();
                const storeValue = getStore(this.store);
                if (!storeValue || newValue.updatedAt > getStore(this.store).updatedAt) {
                    set(newValue);
                }
            });
        });
        this.updatedAt = readable<number>(getStore(this.store)?.updatedAt, set => {
            return this.store.subscribe(x => set(x?.updatedAt));
        });
    }

    subscribe (f: Subscriber<T>) {
        return this.store.subscribe(item => {
            f(item && item.value);
        });
    }

    set (value: T) {
        if (value === undefined) {
            return;
        }
        const raw = { value, updatedAt: now() };
        this.store.set(raw);
        update(this.ref, raw);
    }

    update (func: Updater<T>) {
        const currentValue = getStore(this.store)?.value;
        const newValue = func(currentValue);
        this.set(newValue);
    }

    async init (defaultValue: T) {
        const snapshot = await get(this.ref);
        this.store.set(snapshot.exists() ? snapshot.val() : { value: defaultValue, updatedAt: now() });
    }
}

export class RemoteRoom {
    readonly id: string;

    readonly url: BoundStore<string>;
    readonly currentTime: BoundStore<number>;
    readonly paused: BoundStore<boolean>;
    readonly isLocalMode: BoundStore<boolean>;
    readonly minutesWatched: BoundStore<number>;

    constructor(roomId: string) {
        this.id = roomId;

        const roomRef = this.getRoomRef();
        this.url = new BoundStore<string>(child(roomRef, 'url'));
        this.currentTime = new BoundStore<number>(child(roomRef, 'currentTime'));
        this.paused = new BoundStore<boolean>(child(roomRef, 'paused'));
        this.isLocalMode = new BoundStore<boolean>(child(roomRef, 'isLocalMode'));
        this.minutesWatched = new BoundStore<number>(child(roomRef, 'minutesWatched'));
    }

    async load (): Promise<void> {
        await this.url.init('');
        await this.currentTime.init(0);
        await this.paused.init(true);
        await this.isLocalMode.init(false);
        await this.minutesWatched.init(0);

        const createdAtRef = child(this.getRoomRef(), 'createdAt');
        if (!(await get(createdAtRef)).exists()) {
            set(createdAtRef, now());
        }
    }

    private getRoomRef () {
        return child(ref(database), `room/${this.id}`);
    }
}
