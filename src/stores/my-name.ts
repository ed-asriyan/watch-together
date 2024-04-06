import { writable, get, type Subscriber, type Unsubscriber, type Writable, type Updater } from 'svelte/store';
import { userNames } from '../settings';

const localStorageKey = 'my-name';

const generateName = function () {
    return userNames[Math.floor(Math.random() * userNames.length)];
};

class MyName implements Writable<string> {
    private store = writable<string>(localStorage.getItem(localStorageKey) || generateName());

    subscribe(run: Subscriber<string>): Unsubscriber {
        return this.store.subscribe(run);
    }

    set (value: string) {
        if (!value) {
            value = generateName();
        }
        localStorage.setItem(localStorageKey, value);
        this.store.set(value);
    }

    update(updater: Updater<string>): void {
        const value = get(this.store);
        const newValue = updater(value);
        this.set(newValue);
    }
}

export const myNameStore = new MyName();