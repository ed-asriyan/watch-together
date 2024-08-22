import { type DatabaseReference } from 'firebase/database';
import { type Readable, type Subscriber, type Unsubscriber, get } from 'svelte/store';
import { BoundStore } from './bound-store';
import { now } from '../clock';
import { Destructable } from '../../destructable';
import { myId } from '../my-id';
import { randomStr } from '../../utils';

const messageTimeout = 10;
const invalidateInterval = 1;

interface MessageRaw {
    timestamp: number;
    userId: string;
    text: string;
}

export interface Message extends MessageRaw {
    id: string;
}

interface MessageMap {
    [x: string]: MessageRaw;
}

const filterMessageMap = function (messagesMap: MessageMap): MessageMap {
    const nowTime = now();
    const newMessages: MessageMap = {};
    let anythingRemoved = false;
    for (const [id, message] of Object.entries(messagesMap)) {
        if (message.timestamp + messageTimeout >= nowTime) {
            newMessages[id] = message;
        } else {
            anythingRemoved = true;
        }
    }
    return anythingRemoved ? newMessages : messagesMap;
}

export class MessagesBoundStore extends Destructable implements Readable<Message[]> {
    private readonly storeMessagesMap: BoundStore<MessageMap>;

    constructor (ref: DatabaseReference) {
        super();
        this.storeMessagesMap = new BoundStore<MessageMap>(ref, {});
    }

    subscribe(run: Subscriber<Message[]>): Unsubscriber {
        const timeNow = now();
        return this.storeMessagesMap.subscribe((messagesMap: MessageMap) => {
            run(
                Object.entries(filterMessageMap(messagesMap))
                .sort(([_, m1], [__, m2]) => m1.timestamp - m2.timestamp)
                .map(([id, message]) => ({ ...message, id }))
            );
        });
    }

    private async invalidate () {
        const messagesMap = get(this.storeMessagesMap);
        const newMessagesMap = filterMessageMap(messagesMap);
        if (newMessagesMap !== messagesMap) {
            this.storeMessagesMap.set(newMessagesMap);
        }
    }

    async init() {
        await this.storeMessagesMap.init();

        const invalidateJob = () => this.invalidate();
        const invalidateJobId = setInterval(invalidateJob, invalidateInterval * 1000);
        await invalidateJob();

        this.onDestruct(() => clearInterval(invalidateJobId));
    }

    addMessage(text: string) {
        this.storeMessagesMap.set({
            ...get(this.storeMessagesMap),
            [randomStr(6)]: { userId: myId, text, timestamp: now() },
        })
    }
}
