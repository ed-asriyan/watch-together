import { stringToColor } from '../utils';

export interface RawUser {
    lastSeen: number;
    name: string;
}

export class User implements RawUser {
    readonly id: string;
    lastSeen: number;
    name: string;
    readonly color: string;

    constructor (id: string, data: RawUser) {
        this.id = id;
        this.lastSeen = data.lastSeen;
        this.name = data.name;
        this.color = stringToColor(id);
    }
}
