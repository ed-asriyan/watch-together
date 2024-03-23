import { get as getStore, writable, type Updater, type Writable } from 'svelte/store';
import { ref, onValue, get, child, update, type DatabaseReference } from 'firebase/database';
import { database } from './firebase/firebase';
import { now } from './clock';


export interface RemoteRoomRaw {
    url: string;
    currentTime: number;
    paused: boolean;
    isLocalMode: boolean;
    updatedAt: number;
    minutesWatched: number;
    createdAt: number;
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

    async load (): Promise<RemoteRoomRaw> {
        const initSnapshot = await get(this.roomRef);
        let initRoom: RemoteRoomRaw;
        if (initSnapshot.exists()) {
            initRoom = initSnapshot.val();
        } else {
            const time = now()
            initRoom = {
                url: '',
                paused: true,
                currentTime: 0,
                isLocalMode: false,
                minutesWatched: 0,
                updatedAt: time,
                createdAt: time,
            };
        }
        this.store.set(initRoom);
        return initRoom;
    }

    get subscribe () {
        return this.store.subscribe;
    }

    set (data: RemoteRoomRaw) {
        return update(this.roomRef, data);
    }

    update (func: Updater<RemoteRoomRaw>) {
        const currentValue = getStore(this.store);
        const newValue = func(currentValue);
        this.set(newValue);
    }
}
