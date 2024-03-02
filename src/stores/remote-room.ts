import { get as getStore, writable, type Updater, type Writable } from 'svelte/store';
import { ref, onValue, get, child, update, type DatabaseReference } from 'firebase/database';
import { database } from './firebase/firebase';

export interface RemoteRoomRaw {
    url: string;
    time: number;
    paused: boolean;
    isLocalMode: boolean;
    name: string;
}

export class RemoteRoom implements Writable<RemoteRoomRaw> {
    private readonly store: Writable<RemoteRoomRaw>;
    private readonly roomRef: DatabaseReference;

    constructor(roomId: string) {
        this.roomRef = child(ref(database), `room/${roomId}`);
        this.store = writable<RemoteRoomRaw>(undefined, set => {
            return onValue(this.roomRef, snapshot => {
                set(snapshot.val());
            });
        });
    }

    async load () {
        const initSnapshot = await get(this.roomRef);
        let initRoom: RemoteRoomRaw;
        if (initSnapshot.exists()) {
            initRoom = initSnapshot.val();
        } else {
            initRoom = {
                url: '',
                paused: true,
                time: 0,
                isLocalMode: false,
                name: 'Watch Together',
            };
        }
        this.store.set(initRoom);
    }

    get subscribe () {
        return this.store.subscribe;
    }

    set (data: Partial<RemoteRoomRaw>) {
        return update(this.roomRef, { ...data, timestamp: Math.round(new Date().getTime() / 1000) });
    }

    update (func: Updater<RemoteRoomRaw>) {
        const currentValue = getStore(this.store);
        const newValue = func(currentValue);
        this.set(newValue);
    }
}
