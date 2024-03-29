import { writable, type Writable, type Updater, type Readable, readable } from 'svelte/store';
import { get as getStore } from 'svelte/store';
import type { BoundStore, RemoteRoom } from './remote-room';
import normalizeLink, { type Link } from '../normalize-link';
import { now } from './clock';

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

const getPlayLink = function (isLocalMode: boolean, url: string, blobUrl: string) {
    return normalizeLink(isLocalMode ? blobUrl : url);
};

const createLocalCurrentTime = function(
    remoteCurrentTime: BoundStore<number>, 
): { currentTime: Writable<number>, updatedAt: Writable<number> } {
    const localUpdatedAt = writable<number>(getStore(remoteCurrentTime.updatedAt));
    const localCurrentTime = writable<number>(getStore(remoteCurrentTime), set => {
        return remoteCurrentTime.subscribe(newCurrentTime => {
            const remoteUpdatedAtValue = getStore(remoteCurrentTime.updatedAt);
            if (shouldUpdateCurrentTime(getStore(localCurrentTime), getStore(localUpdatedAt), newCurrentTime, remoteUpdatedAtValue)) {
                set(newCurrentTime);
                localUpdatedAt.set(remoteUpdatedAtValue);
            }
        })
    });

    const set = function (value: number) {
        const nowTime = now();

        localCurrentTime.set(value);
        localUpdatedAt.set(nowTime);

        const remoteCurrentTimeValue = getStore(remoteCurrentTime);
        const remoteUpdatedAtValue = getStore(remoteCurrentTime.updatedAt);
        if (Math.abs(remoteCurrentTimeValue - value) > syncInterval ||  Math.abs(nowTime - remoteUpdatedAtValue) > syncInterval) {
            remoteCurrentTime.set(value);
        }
    };

    return {
        updatedAt: localUpdatedAt,
        currentTime: {
            subscribe: localCurrentTime.subscribe,
            set,
            update: function (f) {
                const newValue = f(getStore(localCurrentTime));
                set(newValue);
            },
        },
    };
};

export class LocalRoom {
    readonly id: string;

    private readonly remoteRoom: RemoteRoom;

    readonly play: Readable<Link | null>;
    readonly blobUrl: Writable<string> = writable<string>('');
    readonly fileName: Writable<string> = writable<string>('');

    readonly url: Writable<string>;
    readonly isLocalMode: Writable<boolean>;
    readonly paused: Writable<boolean>;
    readonly minutesWatched: Writable<number>;
    readonly currentTime: Writable<number>;
    readonly updatedAt: Writable<number>;

    constructor (remoteRoom: RemoteRoom) {
        this.id = remoteRoom.id;
        this.remoteRoom = remoteRoom;

        this.url = remoteRoom.url;
        this.isLocalMode = remoteRoom.isLocalMode;
        this.paused = remoteRoom.paused;
        this.minutesWatched = remoteRoom.minutesWatched;

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

        const { currentTime, updatedAt } = createLocalCurrentTime(remoteRoom.currentTime);
        this.currentTime = currentTime;
        this.updatedAt = updatedAt;
    }
}
