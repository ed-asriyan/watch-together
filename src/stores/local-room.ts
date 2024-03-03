import { writable, type Writable, type Updater, type Readable, readable } from 'svelte/store';
import { get as getStore } from 'svelte/store';
import type { RemoteRoom, RemoteRoomRaw } from './remote-room';
import normalizeLink from '../components/normalize-link';

const maximumDelta = 0.5;
const syncInterval = 10;

export class LocalRoom implements Writable<RemoteRoomRaw> {
    private readonly store: Writable<RemoteRoomRaw>;
    private readonly remoteRoom: RemoteRoom;
    readonly playUrl: Readable<string>;
    readonly blobUrl: Writable<string | null>;
    readonly fileName: Writable<string | null>;

    constructor (remoteRoom: RemoteRoom) {
        this.remoteRoom = remoteRoom;
        this.store = writable<RemoteRoomRaw>({
            name: 'Watch Together',
            time: 0,
            paused: false,
            isLocalMode: false,
            url: '',
        }, set => {
            return remoteRoom.subscribe(newRemoteRoom => {
                if (!newRemoteRoom) return;

                let newTime = getStore(this.store)?.time;
                if (!newTime || Math.abs(newRemoteRoom.time - newTime) > maximumDelta) {
                    newTime = newRemoteRoom.time;
                }
                set({ ...newRemoteRoom, time: newTime });
            });
        });
        this.blobUrl = writable<string | null>('');
        this.playUrl = readable<string>('', set => {
            const own = this.store.subscribe(newRoom => {
                if (newRoom?.isLocalMode) {
                    set(getStore(this.blobUrl) || '');
                } else {
                    const link = normalizeLink(newRoom?.url);
                    link && set(link);
                }
            });
            const blob = this.blobUrl.subscribe(newBlob => {
                const room = getStore(this.store);
                if (room?.isLocalMode) {
                    set(newBlob || '');
                } else {
                    const link = normalizeLink(room?.url);
                    link && set(link);
                }
            });
            return () => [own, blob].forEach(x => x());
        });
        this.fileName = writable<string | null>('');
    }

    get subscribe () {
        return this.store.subscribe;
    }

    set (newValue: RemoteRoomRaw) {
        const val = newValue;
        this.store.set(newValue);
        const remoteValue = getStore(this.remoteRoom);

        if (
            remoteValue.name !== newValue.name ||
            remoteValue.isLocalMode !== newValue.isLocalMode ||
            remoteValue.paused !== newValue.paused ||
            remoteValue.url !== newValue.url ||
            Math.abs(remoteValue.time - val.time) > syncInterval
        ) {
            this.remoteRoom.set(newValue);
        }
    }

    update (func: Updater<RemoteRoomRaw>) {
        const currentValue = getStore(this.store);
        const newValue = func(currentValue);
        this.set(newValue);
    }
}
