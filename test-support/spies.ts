/**
 * Spy implementations of every outbound port, plus handles to drive them.
 *
 * They record into a shared {@link CallLog} so a test can assert not just which
 * ports were used but in what order and with what arguments.
 *
 * The replica is spied too: these tests are about ORCHESTRATION — what the
 * coordinator does with the ports — not about the sync rules, which
 * `model/*.spec.ts` covers. Canned decisions keep the two concerns apart.
 */
import type { CallLog } from './call-log';
import type { RoomGatewayPort, RoomSession } from '../src/domains/watch-session/ports/outbound/room-gateway';
import type { MediaPlayerPort } from '../src/domains/watch-session/ports/outbound/media-player';
import type { MediaResolverPort, DeliveryStats, ResolvedMedia } from '../src/domains/watch-session/ports/outbound/media-resolver';
import type { ProfileStorePort, StoredProfile } from '../src/domains/watch-session/ports/outbound/profile-store';
import type { IdGeneratorPort } from '../src/domains/watch-session/ports/outbound/id-generator';
import type { TelemetryPort } from '../src/domains/watch-session/ports/outbound/telemetry';
import type { ErrorReporterPort } from '../src/domains/watch-session/ports/outbound/error-reporter';
import type { LocationPort } from '../src/domains/watch-session/ports/outbound/location';
import type { RemoteRoomListener } from '../src/domains/watch-session/ports/inbound/remote-room-listener';
import type { MediaPlayerListener } from '../src/domains/watch-session/ports/inbound/media-player-listener';
import type { RoomReplica, RoomReplicaFactory, RoomReplicaParams } from '../src/domains/watch-session/model/room-replica';
import type { Decision } from '../src/domains/watch-session/model/decision';
import type { ObservedPlayback } from '../src/domains/watch-session/model/reconcile';
import type { RoomId, ActivityId, ParticipantId, Nickname } from '../src/domains/watch-session/model/ids';
import type { Observable, Unsubscribe } from '../src/domains/watch-session/model/shared/observable';
import { ALICE, ROOM, observed, source } from './builders';

const NOTHING: Decision = { events: [], publish: [], correct: { kind: 'none' } };

/** A gateway session tagged with the room it belongs to, so writes are attributable. */
export interface SpyRoomSession extends RoomSession {
    readonly roomId: RoomId;
    closed: boolean;
}

export interface SpyGateway extends RoomGatewayPort {
    /** Every session opened, newest last. */
    readonly sessions: SpyRoomSession[];
    /** The listener the coordinator handed over, for simulating remote traffic. */
    listenerFor(roomId: RoomId): RemoteRoomListener | undefined;
    /** Make the next write reject, to exercise the failure path. */
    failNextWrite(): void;
}

export const spyGateway = (log: CallLog): SpyGateway => {
    const sessions: SpyRoomSession[] = [];
    const listeners = new Map<RoomId, RemoteRoomListener>();
    let failNext = false;

    const guard = async (name: string, roomId: RoomId, ...args: unknown[]) => {
        log.record(name, roomId, ...args);
        if (failNext) {
            failNext = false;
            throw new Error('write rejected');
        }
    };

    return {
        sessions,
        listenerFor: (roomId) => listeners.get(roomId),
        failNextWrite: () => { failNext = true; },

        async open({ roomId, self, listener }) {
            log.record('gateway.open', roomId, self);
            listeners.set(roomId, listener);
            const session: SpyRoomSession = {
                roomId,
                closed: false,
                publishPlayhead: (i) => guard('session.publishPlayhead', roomId, i),
                publishSource: (s) => guard('session.publishSource', roomId, s),
                publishPresence: (p) => guard('session.publishPresence', roomId, p),
                appendActivity: (a) => guard('session.appendActivity', roomId, a),
                retractActivities: (ids) => guard('session.retractActivities', roomId, ids),
                recordWatchedMinutes: (d) => guard('session.recordWatchedMinutes', roomId, d),
                armDisconnectCleanup: () => guard('session.armDisconnectCleanup', roomId),
                async close() {
                    log.record('session.close', roomId);
                    session.closed = true;
                    listeners.delete(roomId);
                },
            };
            sessions.push(session);
            return session;
        },
    };
};

export interface SpyPlayer extends MediaPlayerPort {
    listener: MediaPlayerListener | null;
    state: ObservedPlayback;
    attached: boolean;
}

export const spyPlayer = (log: CallLog): SpyPlayer => {
    const player: SpyPlayer = {
        listener: null,
        attached: false,
        state: observed({ ready: true }),
        attach(listener) {
            log.record('player.attach');
            player.listener = listener;
            player.attached = true;
            return () => {
                log.record('player.detach');
                player.listener = null;
                player.attached = false;
            };
        },
        async load(media) { log.record('player.load', media); },
        async play() { log.record('player.play'); },
        pause() { log.record('player.pause'); },
        seekTo(position) { log.record('player.seekTo', position); },
        setRate(rate) { log.record('player.setRate', rate); },
        setMuted(muted) { log.record('player.setMuted', muted); },
        observe: () => player.state,
    };
    return player;
};

export interface SpyResolver extends MediaResolverPort {
    /** Signals handed to `resolve`, so aborts are assertable. */
    readonly signals: AbortSignal[];
    classifyResult: ReturnType<MediaResolverPort['classify']>;
}

export const spyResolver = (log: CallLog): SpyResolver => {
    const resolver: SpyResolver = {
        signals: [],
        classifyResult: source(),
        classify(raw) {
            log.record('resolver.classify', raw);
            return raw.trim() ? resolver.classifyResult : null;
        },
        async resolve(ref, signal) {
            log.record('resolver.resolve', ref);
            resolver.signals.push(signal);
            const media: ResolvedMedia = { ref, playbackUrl: 'https://cdn/x.mp4', via: 'direct' };
            return media;
        },
        async share(file) {
            log.record('resolver.share', file.name);
            return source({ kind: 'magnet', locator: 'magnet:?xt=urn:btih:deadbeef' });
        },
        async localOnly(file) {
            log.record('resolver.localOnly', file.name);
            return { ref: source({ kind: 'localOnly', locator: file.name }), playbackUrl: 'blob:x', via: 'blob' };
        },
        stats(): Observable<DeliveryStats> {
            return {
                subscribe(run): Unsubscribe {
                    run({
                        active: false, seeding: false, peers: 0,
                        downloadBytesPerSecond: 0, uploadBytesPerSecond: 0,
                        progress: null, secondsRemaining: null,
                    });
                    return () => undefined;
                },
            };
        },
        async release() { log.record('resolver.release'); },
    };
    return resolver;
};

export interface SpyProfiles extends ProfileStorePort {
    stored: StoredProfile | null;
}

export const spyProfiles = (log: CallLog, initial: StoredProfile | null = null): SpyProfiles => {
    const profiles: SpyProfiles = {
        stored: initial,
        load() {
            log.record('profiles.load');
            return profiles.stored;
        },
        save(profile) {
            log.record('profiles.save', profile);
            profiles.stored = profile;
        },
    };
    return profiles;
};

export interface SpyLocation extends LocationPort {
    current: RoomId | null;
    onChange: ((roomId: RoomId | null) => void) | null;
}

export const spyLocation = (log: CallLog, current: RoomId | null = ROOM): SpyLocation => {
    const location: SpyLocation = {
        current,
        onChange: null,
        currentRoomId() {
            log.record('location.currentRoomId');
            return location.current;
        },
        navigateToRoom(roomId) {
            log.record('location.navigateToRoom', roomId);
            location.current = roomId;
        },
        onRoomChanged(run) {
            log.record('location.onRoomChanged');
            location.onChange = run;
            return () => { location.onChange = null; };
        },
        roomUrl: (roomId) => `https://watchtogether.online/#${roomId}`,
        canShare: () => false,
        async share() { log.record('location.share'); },
        async copyToClipboard() { log.record('location.copyToClipboard'); },
    };
    return location;
};

export const spyIds = (log: CallLog, rooms: string[] = ['new-room']): IdGeneratorPort => {
    let room = 0;
    let activity = 0;
    return {
        roomId() {
            log.record('ids.roomId');
            return (rooms[room++] ?? `room-${room}`) as RoomId;
        },
        participantId() {
            log.record('ids.participantId');
            return ALICE;
        },
        activityId() {
            log.record('ids.activityId');
            return `a${++activity}` as ActivityId;
        },
    };
};

export const spyTelemetry = (log: CallLog): TelemetryPort => ({
    record: (event) => log.record('telemetry.record', event.type),
    identify: (participantId) => log.record('telemetry.identify', participantId),
});

export const spyErrors = (log: CallLog): ErrorReporterPort => ({
    capture: (error) => log.record('errors.capture', String(error)),
    addBreadcrumb: (message) => log.record('errors.breadcrumb', message),
});

export interface SpyReplica extends RoomReplica {
    /** What every command should return next. Replace per test. */
    next: Decision;
    readonly params: RoomReplicaParams;
}

export const spyReplicas = (log: CallLog): RoomReplicaFactory & { readonly made: SpyReplica[] } => {
    const made: SpyReplica[] = [];
    return {
        made,
        create(params) {
            log.record('replica.create', params.roomId, params.self);
            const replica = {
                params,
                next: NOTHING,
                requestPlay: () => { log.record('replica.requestPlay'); return replica.next; },
                requestPause: () => { log.record('replica.requestPause'); return replica.next; },
                requestSeek: () => { log.record('replica.requestSeek'); return replica.next; },
                selectSource: () => { log.record('replica.selectSource'); return replica.next; },
                postChat: () => { log.record('replica.postChat'); return replica.next; },
                throwReaction: () => { log.record('replica.throwReaction'); return replica.next; },
                postNotice: () => { log.record('replica.postNotice'); return replica.next; },
                rename: () => { log.record('replica.rename'); return replica.next; },
                applyRemoteSnapshot: () => { log.record('replica.applyRemoteSnapshot'); return replica.next; },
                applyRemotePlayhead: () => { log.record('replica.applyRemotePlayhead'); return replica.next; },
                applyRemoteSource: () => { log.record('replica.applyRemoteSource'); return replica.next; },
                applyRemotePresence: () => { log.record('replica.applyRemotePresence'); return replica.next; },
                applyRemoteActivity: () => { log.record('replica.applyRemoteActivity'); return replica.next; },
                applyConnectionChange: () => { log.record('replica.applyConnectionChange'); return replica.next; },
                applyClockConfidence: () => { log.record('replica.applyClockConfidence'); return replica.next; },
                observePlayer: () => replica.next,
                tick: () => { log.record('replica.tick'); return replica.next; },
                snapshot: () => { throw new Error('snapshot is not stubbed in this test'); },
            } as unknown as SpyReplica;
            made.push(replica);
            return replica;
        },
    };
};

export const profile = (over: Partial<StoredProfile> = {}): StoredProfile => ({
    participantId: ALICE as ParticipantId,
    nickname: 'alice' as Nickname,
    lastRoomId: null,
    locale: null,
    ...over,
});
