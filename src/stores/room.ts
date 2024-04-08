import { writable, type Writable, type Readable, readable } from 'svelte/store';
import { get as getStore } from 'svelte/store';
import { ref, child, getDatabase } from 'firebase/database';
import { initializeApp } from 'firebase/app';
import { BoundStore } from './bound-store';
import { BoundTimedStore } from './bound-timed-store';
import { UsersBoundStore } from './bound-users';
import { BoundMinutesWatched } from './bound-minutes-watched';
import normalizeLink, { type Link } from '../normalize-link';
import { now } from './clock';
import { Destructable } from '../destructable';
import { firebaseConfig } from '../settings';
import { BoundCurrentTime } from './bound-current-time';

const database = getDatabase(initializeApp(firebaseConfig));

const getPlayLink = function (isLocalMode: boolean, url: string, blobUrl: string) {
    return normalizeLink(isLocalMode ? blobUrl : url);
};

export class Room extends Destructable {
    readonly id: string;

    readonly play: Readable<Link | null>;
    readonly blobUrl: Writable<string> = writable<string>('');
    readonly fileName: Writable<string> = writable<string>('');

    readonly url: BoundTimedStore<string>;
    readonly isLocalMode: BoundTimedStore<boolean>;
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
        this.isLocalMode = new BoundTimedStore<boolean>(child(roomRef, 'isLocalMode'), false);
        this.createdAt = new BoundStore<number>(child(roomRef, 'createdAt'), now());
        this.users = new UsersBoundStore(child(roomRef, 'users'));
        this.play = readable<Link | null>(null, set => {
            const url = this.url.subscribe(newUrl => {
                set(getPlayLink(getStore(this.isLocalMode), newUrl, getStore(this.blobUrl)));
            });
            const blob = this.blobUrl.subscribe(newBlob => {
                set(getPlayLink(getStore(this.isLocalMode), getStore(this.url), newBlob));
            });
            const localMode = this.isLocalMode.subscribe(newLocalMode => {
                set(getPlayLink(newLocalMode, getStore(this.url), getStore(this.blobUrl)));
            });
            return () => [url, blob, localMode].forEach(x => x());
        });
        this.minutesWatched = new BoundMinutesWatched(child(roomRef, 'minutesWatched'), roomId, this.play, this.paused);

        this.registerDependency(this.users);
        this.registerDependency(this.minutesWatched);
    }

    async init (): Promise<void> {
        await this.url.init();
        await this.currentTime.init();
        await this.paused.init();
        await this.isLocalMode.init();
        await this.minutesWatched.init();
        await this.createdAt.init();
        await this.users.init();
    }
}
