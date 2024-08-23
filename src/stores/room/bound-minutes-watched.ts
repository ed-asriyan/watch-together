import { type DatabaseReference, child } from 'firebase/database';
import { type Readable, type Subscriber, type Unsubscriber, get } from 'svelte/store';
import { BoundStore } from './bound-store';
import { track, WatchedMinuteEvent } from '../../analytics.svelte';
import { Destructable } from '../../destructable';
import { me } from '../me';
import { type Source } from '../../normalize-source';

export class BoundMinutesWatched extends Destructable implements Readable<number> {
    private readonly store: BoundStore<number>;
    private readonly pausedStore: Readable<boolean>;
    private readonly sourceStore: Readable<Source | null>;
    private readonly roomId: string;

    constructor (ref: DatabaseReference, roomId: string, sourceStore: Readable<Source | null>, pausedStore: Readable<boolean>) {
        super();
        this.roomId = roomId;
        this.pausedStore = pausedStore;
        this.sourceStore = sourceStore;
        this.store = new BoundStore<number>(child(ref, get(me).id), 0);
    }

    subscribe(run: Subscriber<number>): Unsubscriber {
        return this.store.subscribe(run);
    }

    async init() {
        await this.store.init();

        const idMinuteSpent = setInterval(() => {
            const source = get(this.sourceStore);
            if (source && !get(this.pausedStore)) {
                this.store.update(x => x + 1);
                track(new WatchedMinuteEvent({ roomId: this.roomId, sourceType: source.type }));
            }
        }, 60000);
        this.onDestruct(() => clearInterval(idMinuteSpent));
    }
}
