import { type Writable, writable, get, type Subscriber, type Updater } from 'svelte/store';
import type { DatabaseReference } from 'firebase/database';
import { now } from './clock';
import { BoundTimedStore } from './bound-timed-store';

const maximumDelta = 0.5;
const syncInterval = 10;

const shouldUpdateCurrentTime = function(
    localCurrentTime: number,
    localUpdatedAt: number,
    remoteCurrentTime: number,
    remoteUpdatedAt: number,
): boolean {
    const playbackDelta = remoteCurrentTime - localCurrentTime;
    const timeDelta = remoteUpdatedAt - localUpdatedAt;

    return Math.abs(playbackDelta - timeDelta) > maximumDelta;
};

export class BoundCurrentTime implements Writable<number> {
    private readonly remote: BoundTimedStore<number>;
    private readonly currentTime: Writable<number>;
    private readonly updatedAt: Writable<number>;

    constructor (ref: DatabaseReference) {
        this.remote = new BoundTimedStore<number>(ref, 0);
        this.currentTime = writable<number>(get(this.remote), set => {
            return this.remote.subscribe(newCurrentTime => {
                const remoteUpdatedAtValue = get(this.remote.updatedAt);
                if (shouldUpdateCurrentTime(get(this.currentTime), get(this.updatedAt), newCurrentTime, remoteUpdatedAtValue)) {
                    set(newCurrentTime);
                    this.updatedAt.set(remoteUpdatedAtValue);
                }
            })
        });
        this.updatedAt = writable(get(this.remote.updatedAt));
    }

    subscribe (func: Subscriber<number>) {
        return this.currentTime.subscribe(func);
    }

    set (value: number) {
        const nowTime = now();

        this.currentTime.set(value);
        this.updatedAt.set(nowTime);

        const remoteCurrentTimeValue = get(this.remote);
        const remoteUpdatedAtValue = get(this.remote.updatedAt);
        if (Math.abs(remoteCurrentTimeValue - value) > syncInterval ||  Math.abs(nowTime - remoteUpdatedAtValue) > syncInterval) {
            this.remote.set(value);
        }
    }

    update (func: Updater<number>) {
        const newValue = func(get(this.currentTime));
        this.set(newValue);
    }

    async init () {
        await this.remote.init();
    }
}
