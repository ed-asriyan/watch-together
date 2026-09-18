import { writable, get, type Writable, type Updater } from 'svelte/store';
import { userNames } from '../settings';
import { User } from './user';
import { setUserId } from '@amplitude/analytics-browser';

const nameLocalStorageKey = 'my-name';
const idLocalStorageKey = 'my-id';

const generateId = function (): string {
    return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString();
};

const generateName = function () {
    return userNames[Math.floor(Math.random() * userNames.length)];
};

let myId: string = localStorage.getItem(idLocalStorageKey) || '';
if (!myId) {
    myId = generateId();
    localStorage.setItem(idLocalStorageKey, myId);
}

const createMyStore = function (id: string, name: string): Writable<User> {
    const store = writable<User>(new User(id, { lastSeen: 0, name }));
    setUserId(id);
    const set = function(value: User) {
        if (!value.name) {
            value.name = generateName();
        }
        localStorage.setItem(nameLocalStorageKey, value.name);
        setUserId(value.id);
        store.set({ ...value, id: myId });
    };
    return {
        ...store,
        set,
        update(updater: Updater<User>): void {
            const value = get(store);
            const newValue = updater(value);
            set(newValue);
        }
    }
}

export const me = createMyStore(myId, localStorage.getItem(nameLocalStorageKey) || generateName());
