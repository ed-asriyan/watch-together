import { afterEach, describe, expect, it } from 'vitest';
import { roomGatewayContract } from '../../../domains/watch-session/ports/outbound/__contracts__/room-gateway.contract';
import { BroadcastChannelRoomGateway } from './broadcast-room-gateway';
import type { RemoteRoomListener } from '../../../domains/watch-session/ports/inbound/remote-room-listener';
import type { ParticipantId, RoomId } from '../../../domains/watch-session/model/ids';
import { ALICE, BOB, ROOM, T0, intent, sec } from '../../../../test-support/builders';

// Each run gets its own channel, or contract cases would leak into each other.
let channel = 0;
const open: BroadcastChannelRoomGateway[] = [];

roomGatewayContract('broadcast-channel', async () => {
    const gateway = new BroadcastChannelRoomGateway(() => T0, `contract-${channel++}`);
    open.push(gateway);
    return gateway;
});

describe('BroadcastChannelRoomGateway across instances', () => {
    afterEach(() => {
        open.splice(0).forEach((gateway) => gateway.close());
    });

    const listen = () => {
        const playheads: unknown[] = [];
        const listener = {
            onSnapshot: () => undefined,
            onPlayheadChanged: (i: unknown) => playheads.push(i),
            onSourceChanged: () => undefined,
            onPresenceChanged: () => undefined,
            onActivityChanged: () => undefined,
            onConnectionChanged: () => undefined,
            onRemoteError: () => undefined,
        } as unknown as RemoteRoomListener;
        return { playheads, listener };
    };

    const settle = () => new Promise((resolve) => setTimeout(resolve, 120));

    it('carries a write from one instance to another', async () => {
        const name = `cross-${channel++}`;
        const first = new BroadcastChannelRoomGateway(() => T0, name);
        const second = new BroadcastChannelRoomGateway(() => T0, name);
        open.push(first, second);

        const a = listen();
        const b = listen();
        const sessionA = await first.open({ roomId: ROOM, self: ALICE, listener: a.listener });
        await second.open({ roomId: ROOM, self: BOB as ParticipantId, listener: b.listener });

        await sessionA.publishPlayhead(intent({ position: sec(42), paused: false }, T0, ALICE));
        await settle();

        expect(b.playheads.at(-1)).toMatchObject({ value: { position: 42 } });
    });

    it('gives a late instance the state already in the room', async () => {
        const name = `late-${channel++}`;
        const first = new BroadcastChannelRoomGateway(() => T0, name);
        open.push(first);

        const a = listen();
        const sessionA = await first.open({ roomId: ROOM, self: ALICE, listener: a.listener });
        await sessionA.publishPlayhead(intent({ position: sec(99), paused: true }, T0, ALICE));
        await settle();

        const second = new BroadcastChannelRoomGateway(() => T0, name);
        open.push(second);
        const b = listen();
        let snapshot: { playhead?: { value?: { position?: number } } } | null = null;
        await second.open({
            roomId: 'other' as RoomId,
            self: BOB as ParticipantId,
            listener: { ...b.listener, onSnapshot: (s) => { snapshot = s as never; } },
        });
        expect(snapshot).not.toBeNull();

        const c = listen();
        let joined: { playhead?: { value?: { position?: number } } } | null = null;
        await second.open({
            roomId: ROOM,
            self: 'carol' as ParticipantId,
            listener: { ...c.listener, onSnapshot: (s) => { joined = s as never; } },
        });

        expect(joined).toMatchObject({ playhead: { value: { position: 99 } } });
    });
});
