import { writable, type Writable, type Readable, get } from 'svelte/store';
import { ref, child, getDatabase } from 'firebase/database';
import { initializeApp } from 'firebase/app';
import { BoundStore } from './bound-store';
import { BoundTimedStore } from './bound-timed-store';
import { UsersBoundStore } from './bound-users';
import { BoundMinutesWatched } from './bound-minutes-watched';
import { now } from '../clock';
import { Destructable } from '../../destructable';
import { firebaseConfig } from '../../settings';
import { BoundCurrentTime } from './bound-current-time';
import { MessagesBoundStore } from './bound-messages';

const database = getDatabase(initializeApp(firebaseConfig));

export class Room extends Destructable {
    readonly id: string;

    readonly fileName: Writable<string> = writable<string>('');

    readonly url: BoundTimedStore<string>;
    readonly paused: BoundTimedStore<boolean>;
    readonly minutesWatched: BoundMinutesWatched;
    readonly currentTime: BoundCurrentTime;
    readonly users: UsersBoundStore;
    readonly messages: MessagesBoundStore;

    private readonly createdAt: BoundStore<number>;

    constructor (roomId: string) {
        super();
        this.id = roomId;

        const roomRef = child(ref(database), `room/${roomId}`);
        this.url = new BoundTimedStore<string>(child(roomRef, 'url'), '');
        this.currentTime = new BoundCurrentTime(child(roomRef, 'currentTime'));
        this.paused = new BoundTimedStore<boolean>(child(roomRef, 'paused'), true);
        this.createdAt = new BoundStore<number>(child(roomRef, 'createdAt'), now());
        this.users = new UsersBoundStore(child(roomRef, 'users'));
        this.messages = new MessagesBoundStore(child(roomRef, 'messages'));
        this.minutesWatched = new BoundMinutesWatched(child(roomRef, 'minutesWatched'), this.currentTime);

        this.registerDependency(this.messages);
        this.registerDependency(this.users);
        this.registerDependency(this.minutesWatched);
    }

    async init (): Promise<void> {
        await Promise.all([
            this.url.init(),
            this.currentTime.init(),
            this.paused.init(),
            this.minutesWatched.init(),
            this.createdAt.init(),
            this.users.init(),
            this.messages.init(),
        ]);

        const CURRENT_TIME_SYNC_INTERVAL = 60;
        const pausedSyncId = setInterval(() => {
            if (!get(this.paused) && get(this.currentTime.updatedAt) + CURRENT_TIME_SYNC_INTERVAL < now()) {
                this.paused.set(true);
            }
        }, CURRENT_TIME_SYNC_INTERVAL * 1000);
        this.onDestruct(() => clearInterval(pausedSyncId));
    }
}
