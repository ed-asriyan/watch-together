import { writable, type Writable, type Updater } from 'svelte/store';
import { get as getStore } from 'svelte/store';
import type { RemoteRoom, RemoteRoomRaw } from './remote-room';

const maximumDelta = 0.5;
const syncInterval = 10;

export class LocalRoom implements Writable<RemoteRoomRaw> {
    private readonly store: Writable<RemoteRoomRaw>;
    private readonly remoteRoom: RemoteRoom;

    constructor (remoteRoom: RemoteRoom) {
        this.remoteRoom = remoteRoom;
        this.store = writable<RemoteRoomRaw>(undefined, set => {
            return remoteRoom.subscribe(newRemoteRoom => {
                if (!newRemoteRoom) return;

                let newTime = getStore(this.store)?.time;
                if (!newTime || Math.abs(newRemoteRoom.time - newTime) > maximumDelta) {
                    newTime = newRemoteRoom.time;
                }
                set({ ...newRemoteRoom, time: newTime });
            });
        });
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
