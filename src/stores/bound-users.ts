import type { DatabaseReference } from 'firebase/database';
import { type Readable, type Subscriber, type Unsubscriber, get } from 'svelte/store';
import { BoundStore } from './bound-store';
import { now } from './clock';
import { myNameStore } from './my-name';
import { Destructable } from '../destructable';
import { myId } from '../stores/my-id';

const onlineTimeout = 10;
const onlineRefreshInteval = 5

export interface User {
    id: string;
    lastSeen: number;
    name: string;
}
interface Users {
    [id: string]: Omit<User, 'id'>;
}
export class UsersBoundStore extends Destructable implements Readable<User[]> {
    private readonly store: BoundStore<Users>;

    constructor (ref: DatabaseReference) {
        super();
        this.store = new BoundStore<Users>(ref, {});
    }

    subscribe(run: Subscriber<User[]>): Unsubscriber {
        const timeNow = now();
        return this.store.subscribe(users  => {
            run(Object.entries(users)
                .filter(([id, user]) => id !== myId && user.lastSeen + onlineTimeout > timeNow)
                .map(([id, user]) => ({ ...user, id })));
        });
    }

    nameUpdated () {
        this.invalidate();
    }

    async invalidate () {
        const nowTime = now();
        const newUsers: Users = {};
        for (const [id, user] of Object.entries(get(this.store))) {
            if (user.lastSeen + 10 >= nowTime) {
                newUsers[id] = user;
            }
        }
        if (myId) {
            newUsers[myId] = { name: get(myNameStore), lastSeen: now() };
        }
        this.store.set(newUsers);
    }

    async init() {
        await this.store.init();

        const updateOnline = () => this.invalidate();
        const idOnline = setInterval(updateOnline, onlineRefreshInteval * 1000);
        await updateOnline();

        this.onDestruct(() => clearInterval(idOnline));
        this.onDestruct(myNameStore.subscribe(() => this.invalidate()));
    }
}
