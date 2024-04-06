import { get as getStore, writable, type Updater, type Writable, type Readable, type Subscriber, readable } from 'svelte/store';
import { ref, onValue, get, set, child, update, getDatabase, type DatabaseReference } from 'firebase/database';
import { initializeApp } from 'firebase/app';
import { now } from './clock';
import { firebaseConfig } from '../settings';

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
            update(this.ref, value);
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
        }
    }
}

interface TimedValue<T> {
    value: T;
    updatedAt: number;
}
export class TimedBoundStore<T> implements Writable<T> {
    private readonly remote: BoundStore<TimedValue<T>>;
    private readonly store: Writable<TimedValue<T>>;
    readonly updatedAt: Readable<number>;

    constructor (ref: DatabaseReference, defaultValue: T) {
        const defauleRaw = { value: defaultValue, updatedAt: now() };
        this.remote = new BoundStore(ref, defauleRaw);
        this.store = writable<TimedValue<T>>(defauleRaw, set => {
            return this.remote.subscribe(newValue => {
                const storeValue = getStore(this.store);
                if (!storeValue || newValue.updatedAt > storeValue.updatedAt) {
                    set(newValue);
                }
            });
        });
        this.updatedAt = readable<number>(getStore(this.store)?.updatedAt, set => {
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
        const currentValue = getStore(this.store)?.value;
        const newValue = func(currentValue);
        this.set(newValue);
    }

    async init () {
        await this.remote.init();
    }
}

const database = getDatabase(initializeApp(firebaseConfig));

export class RemoteRoom {
    readonly id: string;
    readonly url: TimedBoundStore<string>;
    readonly currentTime: TimedBoundStore<number>;
    readonly paused: TimedBoundStore<boolean>;
    readonly isLocalMode: TimedBoundStore<boolean>;
    readonly minutesWatched: TimedBoundStore<number>;
    readonly createdAt: BoundStore<number>;

    constructor(roomId: string) {
        this.id = roomId;
        const roomRef = child(ref(database), `room/${roomId}`);
        this.url = new TimedBoundStore<string>(child(roomRef, 'url'), '');
        this.currentTime = new TimedBoundStore<number>(child(roomRef, 'currentTime'), 0);
        this.paused = new TimedBoundStore<boolean>(child(roomRef, 'paused'), true);
        this.isLocalMode = new TimedBoundStore<boolean>(child(roomRef, 'isLocalMode'), false);
        this.minutesWatched = new TimedBoundStore<number>(child(roomRef, 'minutesWatched'), 0);
        this.createdAt = new BoundStore<number>(child(roomRef, 'createdAt'), now());
    }

    async load (): Promise<void> {
        await this.url.init();
        await this.currentTime.init();
        await this.paused.init();
        await this.isLocalMode.init();
        await this.minutesWatched.init();
        await this.createdAt.init();
    }
}
