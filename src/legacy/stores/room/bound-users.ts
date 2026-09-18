import { child, type DatabaseReference } from 'firebase/database';
import { type Readable, type Subscriber, type Unsubscriber, get } from 'svelte/store';
import { BoundStore } from './bound-store';
import { now } from '../clock';
import { Destructable } from '../../destructable';
import { User, type RawUser } from '../user';
import { me } from '../me';


export interface RawUsers {
    [id: string]: RawUser;
}

const onlineTimeout = 13;
const onlineRefreshInteval = 5;

const generateMe = function (): RawUser {
    return { name: get(me).name, lastSeen: now() };
};

export class UsersBoundStore extends Destructable implements Readable<User[]> {
    private readonly storeUsers: BoundStore<RawUsers>;
    private readonly storeUser: BoundStore<RawUser>;

    constructor (ref: DatabaseReference) {
        super();
        this.storeUsers = new BoundStore<RawUsers>(ref, {});
        this.storeUser = new BoundStore<RawUser>(child(ref, get(me).id), generateMe());
    }

    subscribe(run: Subscriber<User[]>): Unsubscriber {
        const timeNow = now();
        return this.storeUsers.subscribe(users => {
            run(Object.entries(users)
                .filter(([id, user]) => id !== get(me).id && user.lastSeen + onlineTimeout > timeNow)
                .map(([id, userData]) => new User(id, userData)));
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
        this.onDestruct(me.subscribe(updateOnlineStatusJob));
    }
}
