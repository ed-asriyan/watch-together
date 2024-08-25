import { type DatabaseReference, child } from 'firebase/database';
import { type Readable, type Subscriber, type Unsubscriber, get } from 'svelte/store';
import { BoundStore } from './bound-store';
import { Destructable } from '../../destructable';
import { me } from '../me';
import type { BoundCurrentTime } from './bound-current-time';

export class BoundMinutesWatched extends Destructable implements Readable<number> {
    private readonly store: BoundStore<number>;
    private readonly currentTimeStore: BoundCurrentTime;

    constructor (ref: DatabaseReference, currentTimeStore: BoundCurrentTime) {
        super();
        this.currentTimeStore = currentTimeStore;
        this.store = new BoundStore<number>(child(ref, get(me).id), 0);
    }

    subscribe(run: Subscriber<number>): Unsubscriber {
        return this.store.subscribe(run);
    }

    async init() {
        await this.store.init();

        let lastTime = get(this.currentTimeStore);
        const idMinuteSpent = setInterval(() => {
            const currentTime = get(this.currentTimeStore);
            if (currentTime !== lastTime) {
                this.store.update(x => x + 1);
                lastTime = currentTime;
            }
        }, 60000);
        this.onDestruct(() => clearInterval(idMinuteSpent));
    }
}
