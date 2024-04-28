import { type DatabaseReference, child } from 'firebase/database';
import { type Readable, type Subscriber, type Unsubscriber, get } from 'svelte/store';
import { BoundStore } from './bound-store';
import { track, WatchedMinuteEvent } from '../../analytics.svelte';
import { Destructable } from '../../destructable';
import { myId } from '../my-id';
import { type Link } from '../../normalize-link';

export class BoundMinutesWatched extends Destructable implements Readable<number> {
    private readonly store: BoundStore<number>;
    private readonly pausedStore: Readable<boolean>;
    private readonly linkStore: Readable<Link | null>;
    private readonly roomId: string;

    constructor (ref: DatabaseReference, roomId: string, linkStore: Readable<Link | null>, pausedStore: Readable<boolean>) {
        super();
        this.roomId = roomId;
        this.pausedStore = pausedStore;
        this.linkStore = linkStore;
        this.store = new BoundStore<number>(child(ref, myId), 0);
    }

    subscribe(run: Subscriber<number>): Unsubscriber {
        return this.store.subscribe(run);
    }

    async init() {
        await this.store.init();

        const idMinuteSpent = setInterval(() => {
            const link = get(this.linkStore);
            if (link && !get(this.pausedStore)) {
                this.store.update(x => x + 1);
                track(new WatchedMinuteEvent({ roomId: this.roomId, sourceType: link.type }));
            }
        }, 60000);
        this.onDestruct(() => clearInterval(idMinuteSpent));
    }
}
