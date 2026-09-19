import { describe, expect, it } from 'vitest';
import type { RoomGatewayPort, RoomSession } from '../room-gateway';
import type { RemoteRoomListener } from '../../inbound/remote-room-listener';
import type { PlayheadIntent } from '../../../model/playhead';
import type { Presence } from '../../../model/participant';
import type { Activity } from '../../../model/activity';
import type { RemoteRoomState } from '../../../model/room-replica';
import type { ConnectionState } from '../../../model/connection';
import type { MediaSourceRef } from '../../../model/media-source';
import type { Stamped } from '../../../model/shared/stamped';
import { ALICE, BOB, ROOM, T0, activity, at, intent, presence, sec, source, stamped } from '../../../../../../test-support/builders';

/**
 * THE CONTRACT every `RoomGatewayPort` implementation must satisfy.
 *
 * This is what makes "swap the backend" a claim rather than a hope. Run it
 * against `InMemoryRoomGateway`, against `FirebaseRoomGateway` on the emulator,
 * and against anything added later — one suite, one definition of correct.
 *
 * Nothing runs it yet: no adapter exists. It is written first so the adapters
 * are built against a spec instead of the spec being reverse-engineered from
 * whatever the first adapter happened to do.
 *
 * @param name  Shown in the test output, e.g. "in-memory" or "firebase-emulator".
 * @param make  Builds a fresh, empty backend for each test.
 */
export const roomGatewayContract = (name: string, make: () => Promise<RoomGatewayPort>): void => {
    describe(`RoomGatewayPort contract: ${name}`, () => {
        const recorder = () => {
            const seen = {
                snapshots: [] as RemoteRoomState[],
                playheads: [] as PlayheadIntent[],
                sources: [] as Stamped<MediaSourceRef | null>[],
                presences: [] as (readonly Presence[])[],
                activities: [] as (readonly Activity[])[],
                connections: [] as ConnectionState[],
                errors: [] as unknown[],
            };
            const listener: RemoteRoomListener = {
                onSnapshot: (s) => seen.snapshots.push(s),
                onPlayheadChanged: (i) => seen.playheads.push(i),
                onSourceChanged: (s) => seen.sources.push(s),
                onPresenceChanged: (p) => seen.presences.push(p),
                onActivityChanged: (a) => seen.activities.push(a),
                onConnectionChanged: (c) => seen.connections.push(c),
                onRemoteError: (e) => seen.errors.push(e),
            };
            return { seen, listener };
        };

        const open = async (gateway: RoomGatewayPort, self = ALICE) => {
            const { seen, listener } = recorder();
            const session = await gateway.open({ roomId: ROOM, self, listener });
            return { seen, session };
        };

        describe('opening', () => {
            it('delivers a snapshot before any incremental update', async () => {
                const gateway = await make();
                const { seen } = await open(gateway);
                expect(seen.snapshots).toHaveLength(1);
            });

            it('opens a room that does not exist yet without erroring', async () => {
                const gateway = await make();
                const { seen } = await open(gateway);
                expect(seen.snapshots[0]).toMatchObject({ presences: [], activities: [] });
                expect(seen.errors).toHaveLength(0);
            });

            it('replays existing state to a client joining later', async () => {
                const gateway = await make();
                const first = await open(gateway, ALICE);
                await first.session.publishSource(stamped(source(), T0, ALICE));

                const second = await open(gateway, BOB);
                expect(second.seen.snapshots[0]?.source?.value).toMatchObject({ kind: 'direct' });
            });
        });

        describe('propagation', () => {
            it('delivers one client\'s playhead to another in the same room', async () => {
                const gateway = await make();
                const alice = await open(gateway, ALICE);
                const bob = await open(gateway, BOB);

                await alice.session.publishPlayhead(intent({ position: sec(42), paused: false }, T0, ALICE));

                expect(bob.seen.playheads.at(-1)?.value).toMatchObject({ position: 42, paused: false });
            });

            it('preserves the stamp through a publish/receive round trip', async () => {
                // If `at` or `by` are lost or rewritten in the wire mapping, LWW
                // silently stops converging. This is the single most important
                // thing an adapter can get wrong.
                const gateway = await make();
                const alice = await open(gateway, ALICE);
                const bob = await open(gateway, BOB);

                const published = intent({ position: sec(7), paused: true }, at(1_234), ALICE);
                await alice.session.publishPlayhead(published);

                expect(bob.seen.playheads.at(-1)).toEqual(published);
            });

            it('keeps position and paused atomic across the wire', async () => {
                // An adapter storing them in two nodes must join them back into
                // one value with one timestamp, or peers apply one against a
                // stale other.
                const gateway = await make();
                const alice = await open(gateway, ALICE);
                const bob = await open(gateway, BOB);

                await alice.session.publishPlayhead(intent({ position: sec(99), paused: true }, at(2_000), ALICE));

                const received = bob.seen.playheads.at(-1);
                expect(received?.value.position).toBe(99);
                expect(received?.value.paused).toBe(true);
            });

            it('never reports an intent that was not published', async () => {
                // Settling on the right value in the end is not enough. An
                // adapter that reports a HALF of one write joined to a half of
                // the previous one hands the domain an intent nobody had; it
                // carries the newer timestamp, so it wins the LWW merge, and
                // the truth arriving behind it is then too old to apply. That
                // is how a client could press play and stay frozen at zero.
                const gateway = await make();
                const alice = await open(gateway, ALICE);
                const bob = await open(gateway, BOB);

                const published = [
                    intent({ position: sec(0), paused: true }, at(1_000), ALICE),
                    intent({ position: sec(30), paused: false }, at(2_000), ALICE),
                    intent({ position: sec(90), paused: true }, at(3_000), ALICE),
                ];
                for (const next of published) {
                    await alice.session.publishPlayhead(next);
                    await new Promise((resolve) => setTimeout(resolve, 5));
                }

                expect(bob.seen.playheads.length).toBeGreaterThan(0);
                for (const received of bob.seen.playheads) {
                    expect(published).toContainEqual(received);
                }
            });

            it('delivers presence and activity to other clients', async () => {
                const gateway = await make();
                const alice = await open(gateway, ALICE);
                const bob = await open(gateway, BOB);

                await alice.session.publishPresence(presence(ALICE, at(1_000), 'alice'));
                await alice.session.appendActivity(activity('a1', at(1_000)));

                expect(bob.seen.presences.at(-1)?.some((p) => p.participantId === ALICE)).toBe(true);
                expect(bob.seen.activities.at(-1)?.some((a) => a.id === 'a1')).toBe(true);
            });

            it('does not leak updates between rooms', async () => {
                const gateway = await make();
                const { seen, listener } = recorder();
                const other = await gateway.open({ roomId: 'other-room' as typeof ROOM, self: BOB, listener });
                const alice = await open(gateway, ALICE);

                await alice.session.publishPlayhead(intent({ position: sec(5) }, T0, ALICE));

                expect(seen.playheads).toHaveLength(0);
                await other.close();
            });
        });

        describe('room lifetime', () => {
            it('reports no creation time for a room nobody has written to', async () => {
                const gateway = await make();
                const { seen } = await open(gateway);
                expect(seen.snapshots[0]?.createdAt).toBeNull();
            });

            it('records when the room was first written', async () => {
                // Not used by the domain — the scheduled cleanup job prunes
                // rooms by it. A gateway that never records it leaves the
                // database growing forever.
                const gateway = await make();
                const alice = await open(gateway, ALICE);
                await alice.session.publishSource(stamped(source(), T0, ALICE));

                const bob = await open(gateway, BOB);
                expect(bob.seen.snapshots[0]?.createdAt).not.toBeNull();
            });

            it('does not move the creation time on later writes', async () => {
                const gateway = await make();
                const alice = await open(gateway, ALICE);
                await alice.session.publishSource(stamped(source(), T0, ALICE));
                const first = (await open(gateway, BOB)).seen.snapshots[0]?.createdAt;

                await alice.session.publishPlayhead(intent({ position: sec(5) }, at(60_000), ALICE));
                const later = (await open(gateway, BOB)).seen.snapshots[0]?.createdAt;

                expect(later).toBe(first);
            });
        });

        describe('retraction', () => {
            it('removes retracted activities', async () => {
                const gateway = await make();
                const alice = await open(gateway, ALICE);
                await alice.session.appendActivity(activity('a1', at(1_000)));
                await alice.session.retractActivities(['a1' as never]);

                const bob = await open(gateway, BOB);
                expect(bob.seen.snapshots[0]?.activities.map((a) => a.id)).not.toContain('a1');
            });

            it('retracting something already gone is not an error', async () => {
                // Two clients sweeping the same expired item at the same moment
                // is normal, not a fault.
                const gateway = await make();
                const alice = await open(gateway, ALICE);
                await expect(alice.session.retractActivities(['never-existed' as never])).resolves.toBeUndefined();
            });
        });

        describe('watch time', () => {
            it('increments rather than overwriting', async () => {
                const gateway = await make();
                const alice = await open(gateway, ALICE);
                await alice.session.recordWatchedMinutes(2);
                await alice.session.recordWatchedMinutes(3);

                const bob = await open(gateway, BOB);
                expect(bob.seen.snapshots[0]?.watchedMinutes).toBe(5);
            });
        });

        describe('lifecycle', () => {
            it('stops delivering after close()', async () => {
                const gateway = await make();
                const alice = await open(gateway, ALICE);
                const bob = await open(gateway, BOB);
                await bob.session.close();

                const before = bob.seen.playheads.length;
                await alice.session.publishPlayhead(intent({ position: sec(1) }, T0, ALICE));
                expect(bob.seen.playheads).toHaveLength(before);
            });

            it('close() is idempotent', async () => {
                const gateway = await make();
                const alice = await open(gateway, ALICE);
                await alice.session.close();
                await expect(alice.session.close()).resolves.toBeUndefined();
            });

            it('removes presence when a client disconnects abruptly', async () => {
                // armDisconnectCleanup must be armed BEFORE the first presence
                // publish, or a connection lost between the two leaves a ghost.
                const gateway = await make();
                const alice = await open(gateway, ALICE);
                await alice.session.armDisconnectCleanup();
                await alice.session.publishPresence(presence(ALICE, at(1_000), 'alice'));

                const bob = await open(gateway, BOB);
                await alice.session.close();

                expect(bob.seen.presences.at(-1)?.some((p) => p.participantId === ALICE)).toBe(false);
            });
        });

        describe('failure reporting', () => {
            it('reports a rejected write instead of swallowing it', async () => {
                // The legacy transport called Firebase set() and ignored the
                // result, so a failed write diverged local from remote state
                // permanently and silently.
                const gateway = await make();
                const alice = await open(gateway, ALICE);
                await alice.session.close();

                await alice.session.publishPlayhead(intent({ position: sec(1) }, T0, ALICE)).catch(() => undefined);
                expect(alice.seen.errors.length + alice.seen.connections.length).toBeGreaterThan(0);
            });
        });
    });
};

/** Placeholder so the file is a module even before any adapter binds it. */
export type RoomGatewayContractSubject = { gateway: RoomGatewayPort; session: RoomSession };
