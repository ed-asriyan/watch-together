import { writable, type Writable, type Updater, type Readable, readable } from 'svelte/store';
import { get as getStore } from 'svelte/store';
import { getTime, type RemoteRoom, type RemoteRoomRaw } from './remote-room';
import normalizeLink from '../components/normalize-link';

const maximumDelta = 0.5;
const syncInterval = 10;

export type LocalRoomRaw = RemoteRoomRaw;

export class LocalRoom implements Writable<LocalRoomRaw> {
    private readonly store: Writable<LocalRoomRaw>;
    private readonly remoteRoom: RemoteRoom;
    readonly playUrl: Readable<string>;
    readonly blobUrl: Writable<string | null>;
    readonly fileName: Writable<string | null>;

    constructor (remoteRoom: RemoteRoom) {
        this.remoteRoom = remoteRoom;
        this.store = writable<LocalRoomRaw>({
            name: 'Watch Together',
            time: 0,
            paused: false,
            isLocalMode: false,
            url: '',
            timestamp: getTime(),
        }, set => {
            return remoteRoom.subscribe(newRemoteRoom => {
                if (!newRemoteRoom) return;

                let newTime: number;
                const localRoom = getStore(this.store);
                if (localRoom) {
                    const playbackDelta = newRemoteRoom.time - localRoom.time;
                    const timeDelta = newRemoteRoom.timestamp - localRoom.timestamp;
                    if (Math.abs(playbackDelta - timeDelta) > maximumDelta) {
                        newTime = newRemoteRoom.time;
                    } else {
                        newTime = localRoom.time;
                    }
                } else {
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

    set (newValue: Omit<LocalRoomRaw, 'timestamp'>) {
        const val = newValue;
        const now = getTime();

        const newRooom: LocalRoomRaw = { ...newValue, timestamp: now };

        this.store.set(newRooom);
        const remoteValue = getStore(this.remoteRoom);

        console.log(remoteValue.time, val.time);
        if (
            remoteValue.name !== newValue.name ||
            remoteValue.isLocalMode !== newValue.isLocalMode ||
            remoteValue.paused !== newValue.paused ||
            remoteValue.url !== newValue.url ||
            Math.abs(remoteValue.time - val.time) > syncInterval ||
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
