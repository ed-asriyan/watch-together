import { child, type DatabaseReference } from 'firebase/database';
import { type Readable, type Subscriber, type Unsubscriber, get } from 'svelte/store';
import { BoundStore } from './bound-store';
import { now } from '../clock';
import { myNameStore } from '../my-name';
import { Destructable } from '../../destructable';
import { myId } from '../my-id';

const onlineTimeout = 13;
const onlineRefreshInteval = 5;

interface RawUser {
    lastSeen: number;
    name: string;
}
export interface User extends RawUser {
    id: string;
}
interface RawUsers {
    [id: string]: RawUser;
}

const generateMe = function (): RawUser {
    return { name: get(myNameStore), lastSeen: now() };
}

export class UsersBoundStore extends Destructable implements Readable<User[]> {
    private readonly storeUsers: BoundStore<RawUsers>;
    private readonly storeUser: BoundStore<RawUser>;

    constructor (ref: DatabaseReference) {
        super();
        this.storeUsers = new BoundStore<RawUsers>(ref, {});
        this.storeUser = new BoundStore<RawUser>(child(ref, myId), generateMe());
    }

    subscribe(run: Subscriber<User[]>): Unsubscriber {
        const timeNow = now();
        return this.storeUsers.subscribe(users  => {
            run(Object.entries(users)
                .filter(([id, user]) => id !== myId && user.lastSeen + onlineTimeout > timeNow)
                .map(([id, user]) => ({ ...user, id })));
        });
    }

    nameUpdated () {
        this.invalidate();
    }

    async updateOnlineStatus () {
        this.storeUser.set(generateMe());
    }

    async invalidate () {
        const nowTime = now();
        const newUsers: RawUsers = {};
        let anythingRemoved = false;
        for (const [id, user] of Object.entries(get(this.storeUsers))) {
            if (user.lastSeen + 10 >= nowTime) {
                newUsers[id] = user;
            } else {
                anythingRemoved = true;
            }
        }
        anythingRemoved && this.storeUsers.set(newUsers);
    }

    async init() {
        await this.storeUser.init();
        await this.storeUsers.init();

        const invalidateJob = () => this.invalidate();
        const invalidateJobId = setInterval(invalidateJob, onlineTimeout * 1000);
        await invalidateJob();

        const updateOnlineStatusJob = () => this.updateOnlineStatus();
        const updateOnlineStatusJobId = setInterval(updateOnlineStatusJob, onlineRefreshInteval * 1000);

        this.onDestruct(() => clearInterval(invalidateJobId));
        this.onDestruct(() => clearInterval(updateOnlineStatusJobId));
        this.onDestruct(myNameStore.subscribe(updateOnlineStatusJob));
    }
}
