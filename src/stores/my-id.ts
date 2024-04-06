const localStorageKey = 'my-id';

const generateId = function (): string {
    return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString();
};

let myId: string = localStorage.getItem(localStorageKey) || '';
if (!myId) {
    myId = generateId();
    localStorage.setItem(localStorageKey, myId);
}
export { myId };
