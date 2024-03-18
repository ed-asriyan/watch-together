import { writable, type Writable, type Updater, type Readable, readable } from 'svelte/store';
import { get as getStore } from 'svelte/store';
import { getTime, type RemoteRoom, type RemoteRoomRaw } from './remote-room';
import normalizeLink, { type Link } from '../normalize-link';

const maximumDelta = 0.5;
const syncInterval = 10;

export type LocalRoomRaw = RemoteRoomRaw;

export class LocalRoom implements Writable<LocalRoomRaw> {
    private readonly store: Writable<LocalRoomRaw>;
    private readonly remoteRoom: RemoteRoom;
    readonly play: Readable<Link | null>;
    readonly blobUrl: Writable<string | null>;
    readonly fileName: Writable<string | null>;

    private copyFromRemoteRoom(set: (localRoom: LocalRoomRaw) => void, remoteRoom: RemoteRoomRaw) {
        let newTime: number;
        const localRoom = getStore(this.store);
        if (localRoom) {
            const playbackDelta = remoteRoom.currentTime - localRoom.currentTime;
            const timeDelta = remoteRoom.timestamp - localRoom.timestamp;
            if (Math.abs(playbackDelta - timeDelta) > maximumDelta) {
                newTime = remoteRoom.currentTime;
            } else {
                newTime = localRoom.currentTime;
            }
        } else {
            newTime = remoteRoom.currentTime;
        }
        set({
            ...remoteRoom,
            currentTime: newTime,
            minutesWatched: remoteRoom.minutesWatched || 0,
        });
    }

    private updatePlayLink(set: (link: Link | null) => void, isLocalMode: boolean, url: string, blobUrl: string) {
        if (isLocalMode) {
            set(normalizeLink(blobUrl));
        } else {
            const link = normalizeLink(url);
            set(link);
        }
    }

    constructor (remoteRoom: RemoteRoom) {
        this.remoteRoom = remoteRoom;
        this.store = writable<LocalRoomRaw>({
            name: 'Watch Together',
            currentTime: 0,
            paused: false,
            isLocalMode: false,
            url: '',
            timestamp: getTime(),
            minutesWatched: 0,
        }, set => {
            return remoteRoom.subscribe(newRemoteRoom => {
                if (newRemoteRoom) {
                    this.copyFromRemoteRoom(set, newRemoteRoom);
                }
            });
        });

        this.blobUrl = writable<string | null>('');

        this.play = readable<Link | null>(null, set => {
            const own = this.store.subscribe(newRoom => {
                this.updatePlayLink(set, newRoom?.isLocalMode, newRoom?.url, getStore(this.blobUrl));
            });
            const blob = this.blobUrl.subscribe(newBlob => {
                const room = getStore(this.store);
                this.updatePlayLink(set, room?.isLocalMode, room?.url, newBlob);
            });
            return () => [own, blob].forEach(x => x());
        });
        this.fileName = writable<string | null>('');
    }

    get subscribe () {
        return this.store.subscribe;
    }

    set (newValue: Omit<LocalRoomRaw, 'timestamp'>) {
        const val = newValue;
        const now = getTime();

        const newRooom: LocalRoomRaw = { ...newValue, timestamp: now };

        this.store.set(newRooom);
        const remoteValue = getStore(this.remoteRoom);

        if (
            remoteValue.isLocalMode !== newValue.isLocalMode ||
            remoteValue.paused !== newValue.paused ||
            remoteValue.url !== newValue.url ||
            remoteValue.minutesWatched !== newValue.minutesWatched ||
            Math.abs(remoteValue.currentTime - val.currentTime) > syncInterval ||
            Math.abs(now - remoteValue.timestamp) > syncInterval
        ) {
            this.remoteRoom.set(newRooom);
        }
    }

    update (func: Updater<LocalRoomRaw>) {
        const currentValue = getStore(this.store);
        const newValue = func(currentValue);
        this.set(newValue);
    }
}
