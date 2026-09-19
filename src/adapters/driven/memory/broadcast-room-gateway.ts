import type { RoomId } from '../../../domains/watch-session/model/ids';
import type { EpochMs } from '../../../domains/watch-session/model/shared/time';
import type { RemoteRoomState } from '../../../domains/watch-session/model/room-replica';
import { InMemoryRoomGateway } from './room-gateway';
import type { RoomMutation } from './room-store';

type Wire =
    | { readonly type: 'mutation'; readonly roomId: string; readonly mutation: RoomMutation }
    | { readonly type: 'hello'; readonly roomId: string }
    | { readonly type: 'state'; readonly roomId: string; readonly state: RemoteRoomState };

/**
 * The in-memory room, shared across tabs of one browser.
 *
 * It exists so the app is fully usable — two participants, real synchronization
 * — with no backend configured at all: open two tabs and they are in the same
 * room. That makes local development and manual testing possible without
 * credentials, and it is the second `RoomGatewayPort` implementation the design
 * promised, so the claim that the backend is swappable is now demonstrated
 * rather than asserted.
 *
 * It is not a backend: nothing survives closing the last tab, and it does not
 * cross browsers or profiles. Mutations replicate; a tab joining a room already
 * in progress asks for the current state and adopts the first answer.
 */
export class BroadcastChannelRoomGateway extends InMemoryRoomGateway {
    private readonly channel: BroadcastChannel;

    constructor(
        now: () => EpochMs = () => Date.now() as EpochMs,
        channelName = 'watch-together.rooms',
    ) {
        super(now);
        this.channel = new BroadcastChannel(channelName);
        this.channel.onmessage = (event: MessageEvent<Wire>) => this.onWire(event.data);
    }

    protected override relay(roomId: RoomId, mutation: RoomMutation): void {
        this.post({ type: 'mutation', roomId, mutation });
    }

    protected override async onOpened(roomId: RoomId): Promise<void> {
        // Ask whoever is already in this room for its state, and give them a
        // moment to answer before the snapshot goes out.
        this.post({ type: 'hello', roomId });
        await new Promise((resolve) => setTimeout(resolve, 60));
    }

    private onWire(message: Wire): void {
        const roomId = message.roomId as RoomId;
        switch (message.type) {
            case 'mutation':
                this.receive(roomId, message.mutation);
                return;
            case 'hello':
                if (this.rooms.has(roomId)) {
                    this.post({ type: 'state', roomId, state: this.store(roomId).snapshot() });
                }
                return;
            case 'state':
                this.store(roomId).adopt(message.state);
                this.fanOut(roomId);
                return;
        }
    }

    private post(message: Wire): void {
        try {
            this.channel.postMessage(message);
        } catch {
            // A value that will not clone is a programming error in a mutation
            // shape, not something a viewer can do anything about.
        }
    }

    close(): void {
        this.channel.close();
    }
}
