import { derived,writable, type Writable, type Readable } from 'svelte/store';
import { ref, child, getDatabase } from 'firebase/database';
import { initializeApp } from 'firebase/app';
import { BoundStore } from './bound-store';
import { BoundTimedStore } from './bound-timed-store';
import { UsersBoundStore } from './bound-users';
import { BoundMinutesWatched } from './bound-minutes-watched';
import normalizeLink, { type Link } from '../../normalize-link';
import { now } from '../clock';
import { Destructable } from '../../destructable';
import { firebaseConfig } from '../../settings';
import { BoundCurrentTime } from './bound-current-time';

const database = getDatabase(initializeApp(firebaseConfig));

export class Room extends Destructable {
    readonly id: string;

    readonly link: Readable<Link | null>;
    readonly fileName: Writable<string> = writable<string>('');

    readonly url: BoundTimedStore<string>;
    readonly paused: BoundTimedStore<boolean>;
    readonly minutesWatched: BoundMinutesWatched;
    readonly currentTime: BoundCurrentTime;
    readonly users: UsersBoundStore;

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
        this.link = derived<Readable<string>, Link | null>(this.url, (($url) => {
            return normalizeLink($url);
        }));
        this.minutesWatched = new BoundMinutesWatched(child(roomRef, 'minutesWatched'), roomId, this.url, this.paused);

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
        ]);
    }
}
