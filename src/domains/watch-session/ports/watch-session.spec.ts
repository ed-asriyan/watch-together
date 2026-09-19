import { beforeEach, describe, expect, it } from 'vitest';
import { createWatchSession, type WatchSession, type WatchSessionDependencies } from './index';
import { DEFAULT_SYNC_POLICY } from '../model/sync-policy';
import type { Decision } from '../model/decision';
import type { RoomId } from '../model/ids';
import { CallLog } from '../../../../test-support/call-log';
import {
    profile, spyErrors, spyGateway, spyIds, spyLocation, spyPlayer, spyProfiles,
    spyReplicas, spyResolver, spyTelemetry,
    type SpyGateway, type SpyLocation, type SpyPlayer, type SpyProfiles, type SpyResolver,
} from '../../../../test-support/spies';
import { FakeClock } from '../../../../test-support/fakes/clock';
import { FakeScheduler } from '../../../../test-support/fakes/scheduler';
import { ALICE, BOB, ROOM, T0, at, dur, intent, presence, sec, source, stamped } from '../../../../test-support/builders';

/**
 * COORDINATOR ORCHESTRATION.
 *
 * `model/*.spec.ts` says what the rules are. This says what the coordinator
 * does with the ports: which outbound calls an inbound call produces, in what
 * ORDER, with what arguments, and — when the room changes — which room they
 * land in.
 *
 * Order is most of the value here. The failures that hurt are not "it forgot to
 * publish" but "it published before the clock was synchronized", "it announced
 * presence before arming disconnect cleanup", "it opened the new room before
 * closing the old one".
 */

interface Harness {
    readonly session: WatchSession;
    readonly log: CallLog;
    readonly gateway: SpyGateway;
    readonly player: SpyPlayer;
    readonly resolver: SpyResolver;
    readonly profiles: SpyProfiles;
    readonly location: SpyLocation;
    readonly clock: FakeClock;
    readonly scheduler: FakeScheduler;
    readonly replicas: ReturnType<typeof spyReplicas>;
}

const decision = (over: Partial<Decision> = {}): Decision =>
    ({ events: [], publish: [], correct: { kind: 'none' }, ...over });

const harness = (over: Partial<WatchSessionDependencies> = {}): Harness => {
    const log = new CallLog();
    const clock = new FakeClock(T0);
    const scheduler = new FakeScheduler(clock);
    const gateway = spyGateway(log);
    const player = spyPlayer(log);
    const resolver = spyResolver(log);
    const profiles = spyProfiles(log, profile());
    const location = spyLocation(log, ROOM);
    const replicas = spyReplicas(log);

    const session = createWatchSession({
        gateway, player, resolver, clock, scheduler, profiles, location, replicas,
        ids: spyIds(log),
        telemetry: spyTelemetry(log),
        errors: spyErrors(log),
        policy: DEFAULT_SYNC_POLICY,
        ...over,
    });

    return { session, log, gateway, player, resolver, profiles, location, clock, scheduler, replicas };
};

describe('WatchSession: joining', () => {
    let h: Harness;
    beforeEach(() => {
        h = harness();
    });

    it('enters the room the address bar names', async () => {
        await h.session.resume();
        expect(h.log.first('gateway.open')?.args[0]).toBe(ROOM);
    });

    it('falls back to the last visited room when the address bar is empty', async () => {
        const last = harness({ profiles: spyProfiles(new CallLog(), profile({ lastRoomId: 'previous' as RoomId })) });
        last.location.current = null;
        await last.session.resume();
        expect(last.log.first('gateway.open')?.args[0]).toBe('previous');
    });

    it('generates a room when there is neither', async () => {
        h.location.current = null;
        h.profiles.stored = profile({ lastRoomId: null });
        await h.session.resume();
        expect(h.log.names).toContain('ids.roomId');
        expect(h.log.first('gateway.open')?.args[0]).toBe('new-room');
    });

    it('navigates so the address bar ends up naming the room actually joined', async () => {
        h.location.current = null;
        h.profiles.stored = profile({ lastRoomId: 'previous' as RoomId });
        await h.session.resume();
        expect(h.log.first('location.navigateToRoom')?.args[0]).toBe('previous');
    });

    it('synchronizes the clock BEFORE anything is published (I1)', async () => {
        // A timestamp written from an unsynchronized clock wins or loses every
        // conflict in the room for as long as the skew lasts.
        await h.session.resume();
        expect(h.log.before('clock.sync', 'session.publishPresence')).toBe(true);
    });

    it('creates the replica only after the clock is synchronized', async () => {
        await h.session.resume();
        expect(h.log.before('clock.sync', 'replica.create')).toBe(true);
    });

    it('arms disconnect cleanup BEFORE announcing presence', async () => {
        // The documented Firebase ordering. A connection lost between the two
        // leaves a permanent ghost participant in the room.
        await h.session.resume();
        expect(h.log.before('session.armDisconnectCleanup', 'session.publishPresence')).toBe(true);
    });

    it('applies the initial snapshot before starting the tick loop', async () => {
        await h.session.resume();
        expect(h.log.before('replica.applyRemoteSnapshot', 'replica.tick')).toBe(false);
        expect(h.log.names).toContain('replica.applyRemoteSnapshot');
    });

    it('attaches to the player', async () => {
        await h.session.resume();
        expect(h.player.attached).toBe(true);
    });

    it('identifies the viewer to telemetry once the profile is loaded', async () => {
        await h.session.resume();
        expect(h.log.before('profiles.load', 'telemetry.identify')).toBe(true);
        expect(h.log.all('telemetry.identify')).toHaveLength(1);
    });

    it('persists a freshly generated identity', async () => {
        const fresh = harness({ profiles: spyProfiles(new CallLog(), null) });
        await fresh.session.resume();
        expect(fresh.profiles.stored).not.toBeNull();
    });
});

describe('WatchSession: changing rooms', () => {
    let h: Harness;
    beforeEach(async () => {
        h = harness();
        await h.session.resume();
        h.log.clear();
    });

    it('closes the old room before opening the new one', async () => {
        await h.session.join('room-2' as RoomId);
        expect(h.log.before('session.close', 'gateway.open')).toBe(true);
    });

    it('never writes to the old room again', async () => {
        await h.session.join('room-2' as RoomId);
        h.log.clear();

        h.session.postChatMessage('hello');
        h.scheduler.advance(dur(DEFAULT_SYNC_POLICY.presenceHeartbeat * 1000));

        const strays = h.log.calls.filter((c) => c.name.startsWith('session.') && c.args[0] === ROOM);
        expect(strays).toEqual([]);
    });

    it('marks the old session closed so a late callback cannot resurrect it', async () => {
        await h.session.join('room-2' as RoomId);
        expect(h.gateway.sessions[0]!.closed).toBe(true);
        expect(h.gateway.sessions[1]!.closed).toBe(false);
    });

    it('ignores remote traffic arriving late from the room just left', async () => {
        const stale = h.gateway.listenerFor(ROOM);
        await h.session.join('room-2' as RoomId);
        h.log.clear();

        stale?.onPlayheadChanged(intent({ position: sec(900) }, at(1_000), BOB));
        expect(h.log.only('replica.')).toEqual([]);
    });

    it('builds a fresh replica for the new room rather than reusing one', async () => {
        await h.session.join('room-2' as RoomId);
        expect(h.replicas.made).toHaveLength(2);
        expect(h.replicas.made[1]!.params.roomId).toBe('room-2');
    });

    it('releases media delivery when leaving, so a torrent is not left seeding', async () => {
        await h.session.join('room-2' as RoomId);
        expect(h.log.names).toContain('resolver.release');
    });

    it('generateNewRoom mints an id, navigates, and joins it', async () => {
        const roomId = await h.session.generateNewRoom();
        expect(h.log.before('ids.roomId', 'location.navigateToRoom')).toBe(true);
        expect(h.log.before('location.navigateToRoom', 'gateway.open')).toBe(true);
        expect(h.log.first('gateway.open')?.args[0]).toBe(roomId);
    });

    it('joinRoomByLinkOrId accepts a bare id', async () => {
        const joined = await h.session.joinRoomByLinkOrId('friends-room');
        expect(joined).toBe('friends-room');
        expect(h.log.first('gateway.open')?.args[0]).toBe('friends-room');
    });

    it('joinRoomByLinkOrId accepts a full room URL', async () => {
        const joined = await h.session.joinRoomByLinkOrId('https://watchtogether.online/#friends-room');
        expect(joined).toBe('friends-room');
    });

    it('joinRoomByLinkOrId rejects junk without touching the gateway', async () => {
        const joined = await h.session.joinRoomByLinkOrId('   ');
        expect(joined).toBeNull();
        expect(h.log.only('gateway.')).toEqual([]);
        expect(h.log.only('session.close')).toEqual([]);
    });

    it('follows the address bar when the user edits it or presses back', async () => {
        h.location.onChange?.('typed-room' as RoomId);
        await Promise.resolve();
        expect(h.log.first('gateway.open')?.args[0]).toBe('typed-room');
    });

    it('remembers the new room for the next visit', async () => {
        await h.session.join('room-2' as RoomId);
        expect(h.profiles.stored?.lastRoomId).toBe('room-2');
    });
});

describe('WatchSession: leaving', () => {
    let h: Harness;
    beforeEach(async () => {
        h = harness();
        await h.session.resume();
        h.log.clear();
    });

    it('closes the gateway, detaches the player and releases delivery', async () => {
        await h.session.leave();
        expect(h.log.names).toEqual(expect.arrayContaining(['session.close', 'player.detach', 'resolver.release']));
    });

    it('stops the tick loop', async () => {
        await h.session.leave();
        h.log.clear();
        h.scheduler.advance(dur(DEFAULT_SYNC_POLICY.presenceHeartbeat * 1000 * 5));
        expect(h.log.only('replica.tick')).toEqual([]);
    });

    it('is safe to call when not joined', async () => {
        const idle = harness();
        await expect(idle.session.leave()).resolves.toBeUndefined();
    });
});

describe('WatchSession: a command becomes outbound calls', () => {
    let h: Harness;
    beforeEach(async () => {
        h = harness();
        await h.session.resume();
        h.log.clear();
    });

    it('executes a decision as publishes, then the player correction', async () => {
        h.replicas.made[0]!.next = decision({
            publish: [{ kind: 'playhead', intent: intent({ position: sec(10), paused: true }, T0, ALICE) }],
            correct: { kind: 'seek', to: sec(10) },
        });
        h.player.listener?.onPaused(sec(10));
        await Promise.resolve();
        expect(h.log.before('session.publishPlayhead', 'player.seekTo')).toBe(true);
    });

    it('classifies a typed source synchronously, before any network call', async () => {
        // The input field renders validity on every keystroke; classification
        // that awaited anything would make it lag behind the caret.
        await h.session.setSourceFromUserInput('https://example.com/v.mp4');
        expect(h.log.before('resolver.classify', 'resolver.resolve')).toBe(true);
    });

    it('publishes the source before resolving it', async () => {
        // Peers should learn what to watch immediately; resolution is this
        // client working out how to fetch the bytes.
        await h.session.setSourceFromUserInput('https://example.com/v.mp4');
        expect(h.log.before('session.publishSource', 'resolver.resolve')).toBe(true);
    });

    it('loads the player only with resolved media, never a raw user string', async () => {
        await h.session.setSourceFromUserInput('https://example.com/v.mp4');
        expect(h.log.before('resolver.resolve', 'player.load')).toBe(true);
        expect(h.log.first('player.load')?.args[0]).toMatchObject({ playbackUrl: expect.any(String) });
    });

    it('does not touch the gateway for unrecognized input', async () => {
        h.resolver.classifyResult = null as never;
        const result = await h.session.setSourceFromUserInput('nonsense');
        expect(result.status).toBe('unrecognized');
        expect(h.log.only('session.publishSource')).toEqual([]);
    });

    it('aborts an in-flight resolution when the source changes again', async () => {
        await h.session.setSourceFromUserInput('https://example.com/one.mp4');
        await h.session.setSourceFromUserInput('https://example.com/two.mp4');
        expect(h.resolver.signals[0]?.aborted).toBe(true);
        expect(h.resolver.signals[1]?.aborted).toBe(false);
    });

    it('shares a local file by seeding it, then publishing the magnet', async () => {
        await h.session.shareLocalFile(new File(['x'], 'movie.mkv'));
        expect(h.log.before('resolver.share', 'session.publishSource')).toBe(true);
    });

    it('plays a private local file without changing the room\'s source', async () => {
        await h.session.playLocalFilePrivately(new File(['x'], 'movie.mkv'));
        expect(h.log.only('session.publishSource')).toEqual([]);
        expect(h.log.names).toContain('player.load');
    });

    it('still tells the room someone is watching their own copy', async () => {
        // Legacy posted a `selectedLocalFile` notice for this. Without it the
        // room sees a participant whose playback moves for no visible reason.
        h.replicas.made[0]!.next = decision({
            publish: [{ kind: 'activity', activity: { id: 'n1' as never, author: ALICE, at: T0, body: { kind: 'notice', notice: { type: 'pickedLocalFile' } } } }],
        });
        await h.session.playLocalFilePrivately(new File(['x'], 'movie.mkv'));
        expect(h.log.names).toContain('replica.postNotice');
        expect(h.log.names).toContain('session.appendActivity');
    });

    it('mints an id for a chat message rather than letting the domain invent one', async () => {
        h.session.postChatMessage('hello');
        expect(h.log.before('ids.activityId', 'replica.postChat')).toBe(true);
    });

    it('persists a locale change and reports it', async () => {
        h.session.setLocale('ru');
        expect(h.profiles.stored?.locale).toBe('ru');
        expect(h.log.names).toContain('telemetry.record');
    });

    it('a UI interaction reaches telemetry and nothing else', async () => {
        h.session.recordInteraction('link_share');
        expect(h.log.names).toContain('telemetry.record');
        expect(h.log.only('session.')).toEqual([]);
    });

    it('republishes presence immediately on rename, without waiting for the heartbeat', async () => {
        h.replicas.made[0]!.next = decision({
            publish: [{ kind: 'presence', presence: presence(ALICE, T0, 'newname') }],
        });
        h.session.renameSelf('newname');
        await Promise.resolve();
        expect(h.log.names).toContain('session.publishPresence');
    });
});

describe('WatchSession: remote signals become domain calls', () => {
    let h: Harness;
    beforeEach(async () => {
        h = harness();
        await h.session.resume();
        h.log.clear();
    });

    it('feeds an incoming playhead to the replica and applies its correction', async () => {
        h.replicas.made[0]!.next = decision({ correct: { kind: 'seek', to: sec(300) } });
        h.gateway.listenerFor(ROOM)?.onPlayheadChanged(intent({ position: sec(300) }, T0, BOB));
        await Promise.resolve();
        expect(h.log.names).toContain('replica.applyRemotePlayhead');
        expect(h.log.first('player.seekTo')?.args[0]).toBe(300);
    });

    it('loads new media when the room switches source', async () => {
        h.gateway.listenerFor(ROOM)?.onSourceChanged(stamped(source({ locator: 'https://example.com/new.mp4' }), T0, BOB));
        await Promise.resolve();
        expect(h.log.before('replica.applyRemoteSource', 'resolver.resolve')).toBe(true);
    });

    it('reports a gateway error and does not swallow it', async () => {
        h.gateway.listenerFor(ROOM)?.onRemoteError({ kind: 'write-rejected', message: 'nope' });
        await Promise.resolve();
        expect(h.log.names).toContain('errors.capture');
        expect(h.log.names).toContain('replica.applyConnectionChange');
    });

    it('surfaces a rejected write rather than diverging silently', async () => {
        h.replicas.made[0]!.next = decision({
            publish: [{ kind: 'playhead', intent: intent({ position: sec(1) }, T0, ALICE) }],
        });
        h.gateway.failNextWrite();
        h.player.listener?.onPaused(sec(1));
        await Promise.resolve();
        await Promise.resolve();
        expect(h.log.names).toContain('errors.capture');
    });

    it('republishes presence after a reconnect instead of waiting a full interval', async () => {
        h.gateway.listenerFor(ROOM)?.onConnectionChanged({ status: 'offline' });
        h.log.clear();
        h.gateway.listenerFor(ROOM)?.onConnectionChanged({ status: 'online' });
        await Promise.resolve();
        expect(h.log.names).toContain('session.publishPresence');
    });

    it('forwards clock confidence to the replica', async () => {
        h.clock.setConfidence('unsynced');
        await Promise.resolve();
        expect(h.log.names).toContain('replica.applyClockConfidence');
    });
});

describe('WatchSession: the tick loop', () => {
    let h: Harness;
    beforeEach(async () => {
        h = harness();
        await h.session.resume();
        h.log.clear();
    });

    it('ticks on the schedule, with the synchronized reading', async () => {
        h.scheduler.advance(dur(2_000));
        expect(h.log.only('replica.tick').length).toBeGreaterThan(0);
    });

    it('a stale participant disappears from the room without anyone acting', async () => {
        // The scenario end to end: a peer stops heartbeating, time passes, and
        // the presence the driving port reads no longer contains them — and the
        // stale entry is retracted from the store too.
        h.replicas.made[0]!.next = decision({
            publish: [{ kind: 'presence', presence: presence(ALICE, T0, 'alice') }],
        });
        h.scheduler.advance(dur(DEFAULT_SYNC_POLICY.presenceTimeout * 1000 + 5_000));
        expect(h.log.only('replica.tick').length).toBeGreaterThan(0);
        expect(h.log.names).toContain('session.publishPresence');
    });

    it('retracts expired feed items through the gateway', async () => {
        h.replicas.made[0]!.next = decision({
            publish: [{ kind: 'retract', ids: ['old' as never] }],
        });
        h.scheduler.advance(dur(DEFAULT_SYNC_POLICY.activitySweepInterval * 1000 + 100));
        expect(h.log.first('session.retractActivities')?.args[1]).toEqual(['old']);
    });

    it('records watch time through the gateway', async () => {
        h.replicas.made[0]!.next = decision({ publish: [{ kind: 'watchTime', deltaMinutes: 1 }] });
        h.scheduler.advance(dur(DEFAULT_SYNC_POLICY.watchTimeGranularity * 1000 + 100));
        expect(h.log.first('session.recordWatchedMinutes')?.args[1]).toBe(1);
    });

    it('a tick that decides nothing produces no outbound calls at all', async () => {
        h.replicas.made[0]!.next = decision();
        h.log.clear();
        h.scheduler.advance(dur(1_000));
        expect(h.log.only('session.')).toEqual([]);
        expect(h.log.only('player.')).toEqual([]);
    });
});
