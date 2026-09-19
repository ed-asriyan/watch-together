import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RemoteRoomListener } from '../../../domains/watch-session/ports/inbound/remote-room-listener';
import type { PlayheadIntent } from '../../../domains/watch-session/model/playhead';
import { ALICE, BOB, ROOM, T0, at, intent, sec } from '../../../../test-support/builders';
import { classify } from '../media/classify';

/**
 * A Realtime Database that behaves the way the real one does in the respect
 * that mattered: there is a listener per node, and a multi-node write reaches
 * ANOTHER client as one event per node, in separate turns.
 *
 * That is not a detail. Joining `currentTime` and `paused` across those two
 * turns is what fabricated an intent nobody had — the new position beside the
 * old paused flag — and, since the fabrication carried the newer timestamp, it
 * won the LWW merge for good. One client pressed play and froze the room at
 * zero. Every test below would pass against a database that delivered the pair
 * atomically, which is exactly why this fake does not.
 */
const db = vi.hoisted(() => {
    let store: Record<string, unknown> = {};
    const listeners = new Map<string, Set<(value: unknown) => void>>();
    const writes: { op: 'set' | 'update' | 'remove' | 'transaction'; path: string; value: unknown }[] = [];

    const segments = (path: string) => path.split('/').filter(Boolean);

    const readAt = (path: string): unknown =>
        segments(path).reduce<unknown>(
            (node, key) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined),
            store,
        ) ?? null;

    const writeAt = (path: string, value: unknown): void => {
        const keys = segments(path);
        let node = store;
        for (const key of keys.slice(0, -1)) {
            if (typeof node[key] !== 'object' || node[key] === null) node[key] = {};
            node = node[key] as Record<string, unknown>;
        }
        const last = keys[keys.length - 1]!;
        if (value === null) delete node[last];
        else node[last] = value;
    };

    const touched = (written: string, listening: string) =>
        written === listening || written.startsWith(`${listening}/`) || listening.startsWith(`${written}/`);

    /** One turn per node, as a remote update arrives. */
    const notify = (paths: string[]): void => {
        for (const path of paths) {
            for (const [listening, subscribers] of listeners) {
                if (!touched(path, listening)) continue;
                for (const run of [...subscribers]) {
                    setTimeout(() => run(readAt(listening)), 0);
                }
            }
        }
    };

    return {
        writes,
        readAt,
        listeners,
        reset() {
            store = {};
            listeners.clear();
            writes.length = 0;
        },
        /** A write from some other client. */
        serverUpdate(path: string, values: Record<string, unknown>) {
            for (const [key, value] of Object.entries(values)) writeAt(`${path}/${key}`, value);
            notify(Object.keys(values).map((key) => `${path}/${key}`));
        },
        set(path: string, value: unknown) {
            writes.push({ op: 'set', path, value });
            writeAt(path, value);
            notify([path]);
        },
        update(path: string, values: Record<string, unknown>) {
            writes.push({ op: 'update', path, value: values });
            for (const [key, value] of Object.entries(values)) writeAt(`${path}/${key}`, value);
            notify(Object.keys(values).map((key) => `${path}/${key}`));
        },
        remove(path: string) {
            writes.push({ op: 'remove', path, value: null });
            writeAt(path, null);
            notify([path]);
        },
        transaction(path: string, run: (existing: unknown) => unknown) {
            const next = run(readAt(path));
            writes.push({ op: 'transaction', path, value: next });
            writeAt(path, next ?? null);
            notify([path]);
        },
    };
});

vi.mock('firebase/app', () => ({ initializeApp: () => ({}) }));

vi.mock('firebase/database', () => {
    const snapshot = (path: string) => ({ val: () => db.readAt(path) });
    return {
        getDatabase: () => ({}),
        ref: () => ({ path: '' }),
        child: (parent: { path: string }, sub: string) =>
            ({ path: parent.path ? `${parent.path}/${sub}` : sub }),
        get: async (target: { path: string }) => snapshot(target.path),
        set: async (target: { path: string }, value: unknown) => { db.set(target.path, value); },
        update: async (target: { path: string }, values: Record<string, unknown>) => { db.update(target.path, values); },
        remove: async (target: { path: string }) => { db.remove(target.path); },
        runTransaction: async (target: { path: string }, run: (existing: unknown) => unknown) => {
            db.transaction(target.path, run);
        },
        onDisconnect: () => ({ remove: async () => undefined, cancel: async () => undefined }),
        onValue: (target: { path: string }, run: (snap: { val: () => unknown }) => void) => {
            const wrapped = (value: unknown) => run({ val: () => value });
            const set = db.listeners.get(target.path) ?? new Set();
            set.add(wrapped);
            db.listeners.set(target.path, set);
            run(snapshot(target.path));
            return () => set.delete(wrapped);
        },
    };
});

const { FirebaseRoomGateway } = await import('./room-gateway');

const settle = () => new Promise((resolve) => setTimeout(resolve, 5));

const recorder = () => {
    const playheads: PlayheadIntent[] = [];
    const listener: RemoteRoomListener = {
        onSnapshot: () => undefined,
        onPlayheadChanged: (i) => playheads.push(i),
        onSourceChanged: () => undefined,
        onPresenceChanged: () => undefined,
        onActivityChanged: () => undefined,
        onConnectionChanged: () => undefined,
        onRemoteError: () => undefined,
    };
    return { playheads, listener };
};

const open = async (self = ALICE) => {
    const { playheads, listener } = recorder();
    const gateway = new FirebaseRoomGateway({} as never, classify, () => T0);
    const session = await gateway.open({ roomId: ROOM, self, listener });
    await settle();
    playheads.length = 0;
    return { session, playheads };
};

const ROOM_PATH = `room/${ROOM}`;

describe('FirebaseRoomGateway', () => {
    beforeEach(() => db.reset());

    describe('publishing the playhead', () => {
        it('commits the position and the paused flag as one indivisible write', async () => {
            const { session } = await open();
            db.writes.length = 0;

            await session.publishPlayhead(intent({ position: sec(30), paused: false }, at(10_000), ALICE));

            const playheadWrites = db.writes.filter((w) => /currentTime|paused/.test(w.path) || (w.op === 'update'));
            expect(playheadWrites).toHaveLength(1);
            expect(playheadWrites[0]!.op).toBe('update');
            expect(Object.keys(playheadWrites[0]!.value as object).sort()).toEqual(['currentTime', 'paused']);
        });

        it('stamps both nodes together, so a reader can tell a split write from a lone one', async () => {
            const { session } = await open();
            await session.publishPlayhead(intent({ position: sec(30), paused: false }, at(10_000), ALICE));

            const time = db.readAt(`${ROOM_PATH}/currentTime`) as { updatedAt: number; by: string };
            const paused = db.readAt(`${ROOM_PATH}/paused`) as { updatedAt: number; by: string };
            expect(time.updatedAt).toBe(paused.updatedAt);
            expect(time.by).toBe(paused.by);
        });
    });

    describe('receiving a playhead another client wrote', () => {
        /** What `publishPlayhead` puts on the wire, without going through it. */
        const wire = (position: number, paused: boolean, atMs: number, by: string) => ({
            currentTime: { value: position, updatedAt: atMs / 1000, by, rate: 1 },
            paused: { value: paused, updatedAt: atMs / 1000, by },
        });

        it('never reports a position from one write beside a paused flag from another', async () => {
            const { playheads } = await open();

            db.serverUpdate(ROOM_PATH, wire(0, true, at(0), BOB));
            await settle();
            db.serverUpdate(ROOM_PATH, wire(30, false, at(10_000), BOB));
            await settle();

            // The hybrid `{ position: 30, paused: true }` is the bug. It is
            // not merely "an extra event": stamped at 10s it outranks the
            // truth, which then can never be applied.
            expect(playheads.map((p) => p.value)).not.toContainEqual(
                expect.objectContaining({ position: 30, paused: true }),
            );
        });

        it('reports the intent that was actually written, once both halves are in', async () => {
            const { playheads } = await open();

            db.serverUpdate(ROOM_PATH, wire(0, true, at(0), BOB));
            await settle();
            db.serverUpdate(ROOM_PATH, wire(30, false, at(10_000), BOB));
            await settle();

            expect(playheads.at(-1)).toEqual({
                value: { position: 30, paused: false, rate: 1 },
                at: at(10_000),
                by: BOB,
            });
        });

        it('still honours a legacy client, which really does write one node alone', async () => {
            const { playheads } = await open();

            db.serverUpdate(ROOM_PATH, wire(30, false, at(10_000), BOB));
            await settle();
            // `legacy/stores/room/index.ts:62` pauses a stale room by writing
            // `paused` and nothing else — no author tag, and the mismatch with
            // `currentTime` is real information, not a write in flight.
            db.serverUpdate(ROOM_PATH, { paused: { value: true, updatedAt: at(20_000) / 1000 } });
            await settle();

            expect(playheads.at(-1)).toMatchObject({
                value: { position: 30, paused: true },
                at: at(20_000),
            });
        });
    });
});
