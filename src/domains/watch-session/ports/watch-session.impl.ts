import type { EpochMs, Millis, Seconds } from '../model/shared/time';
import type { Unsubscribe } from '../model/shared/observable';
import type { RoomId } from '../model/ids';
import { nickname as parseNickname, roomId as parseRoomId } from '../model/ids';
import type { MediaSourceRef } from '../model/media-source';
import type { Activity } from '../model/activity';
import type { Presence } from '../model/participant';
import type { PlayheadIntent } from '../model/playhead';
import type { Stamped } from '../model/shared/stamped';
import type { ConnectionState } from '../model/connection';
import type { ClockConfidence } from '../model/shared/clock-confidence';
import type { Decision, PublishIntent } from '../model/decision';
import type { RemoteRoomState, RoomReplica } from '../model/room-replica';
import type { RoomSnapshot } from '../model/room-state';
import type { ObservedPlayback } from '../model/reconcile';
import type { RoomSession } from './outbound/room-gateway';
import type { ResolvedMedia, DeliveryStats } from './outbound/media-resolver';
import type { StoredProfile } from './outbound/profile-store';
import type { GatewayError } from './inbound/remote-room-listener';
import type { PlayerError } from './inbound/media-player-listener';
import type {
    InteractionTarget, SetSourceResult, ShareFileResult,
} from './inbound/watch-session-commands';
import type {
    ConnectionProblemView, ConnectionView, DeliveryView, FeedItemView, FeedNoticeView,
    FeedView, InviteView, ParticipantListView, ParticipantView, PlaybackView, ReactionView, SourceView,
} from './inbound/views';
import type { WatchSession, WatchSessionDependencies } from './index';
import { emitter, type Emitter } from './observable.impl';
import { createEventBus } from './event-bus.impl';

/**
 * The coordinator.
 *
 * The only stateful, only impure object below the adapters. It holds no rules:
 * it decides which room to enter, sequences port calls, and executes the
 * `Decision`s the replica returns. Every timestamp it uses comes from
 * `ClockPort`; it never reads a clock of its own.
 */
export const createWatchSession = (deps: WatchSessionDependencies): WatchSession => {
    const {
        gateway, player, resolver, clock, scheduler, profiles, ids,
        telemetry, errors, location, replicas, policy,
    } = deps;

    const events = createEventBus((error) => errors.capture(error, { where: 'event-bus' }));

    let profile: StoredProfile | null = null;
    let replica: RoomReplica | null = null;
    let room: RoomSession | null = null;
    let roomId: RoomId | null = null;
    let joining: Promise<void> | null = null;

    let stopTick: Unsubscribe | null = null;
    let detachPlayer: Unsubscribe | null = null;
    let stopLocation: Unsubscribe | null = null;
    let stopClock: Unsubscribe | null = null;
    let stopDelivery: Unsubscribe | null = null;

    let resolving: AbortController | null = null;
    let lastResolve: AbortController | null = null;
    let sourceDraft = '';
    let sourceRevision = 0;
    let resolveFailed = false;
    let muted = true;
    let confidence: ClockConfidence = 'synced';
    let duration: Seconds | null = null;
    let delivery: DeliveryStats | null = null;

    // ---- views --------------------------------------------------------------

    const views = {
        connection: emitter<ConnectionView>({ state: 'connecting', clock: 'unsynced', readOnly: false, problem: null }),
        source: emitter<SourceView>({
            raw: '', revision: 0, kind: null, valid: false, empty: true,
            resolving: false, resolveFailed: false, isExample: false, seeding: false,
        }),
        playback: emitter<PlaybackView>({
            paused: true, muted: true, ready: false, stalled: false,
            positionSeconds: 0 as Seconds, durationSeconds: null, driftSeconds: 0 as Seconds,
        }),
        participants: emitter<ParticipantListView>({
            self: { id: '', name: '', colour: '#ffffff', isSelf: true }, others: [], total: 1,
        }),
        feed: emitter<FeedView>({ items: [], reactions: [] }),
        delivery: emitter<DeliveryView>({
            visible: false, peers: 0, downloadBytesPerSecond: 0,
            uploadBytesPerSecond: 0, progress: null, seeding: false,
        }),
        invite: emitter<InviteView>({ roomId: '', url: '', canShare: false }),
    };

    const problemOf = (state: ConnectionState): ConnectionProblemView | null => {
        switch (state.status) {
            case 'offline': return 'offline';
            case 'error': return 'failed';
            case 'degraded': return state.reason === 'clock-unsynced' ? 'clock-unsynced'
                : state.reason === 'read-only' ? 'read-only' : 'write-rejected';
            default: return null;
        }
    };

    const toParticipant = (p: { id: string; nickname: string; colour: string; isSelf: boolean }): ParticipantView =>
        ({ id: p.id, name: p.nickname, colour: p.colour, isSelf: p.isSelf });

    const noticeView = (activity: Activity): FeedNoticeView | null => {
        if (activity.body.kind !== 'notice') return null;
        const notice = activity.body.notice;
        switch (notice.type) {
            case 'seeked': return { type: 'seeked', seconds: notice.to };
            case 'played': return { type: 'played', seconds: notice.from };
            case 'paused': return { type: 'paused', seconds: notice.at };
            case 'pickedLocalFile': return { type: 'pickedLocalFile' };
            case 'changedSource': return { type: 'changedSource', kind: notice.kind };
        }
    };

    const render = (snapshot: RoomSnapshot, now: EpochMs): void => {
        const everyone = [snapshot.self, ...snapshot.others];
        const nameOf = (id: string) => everyone.find((p) => p.id === id);

        const chatAndNotices: FeedItemView[] = [];
        const reactions: ReactionView[] = [];

        for (const activity of snapshot.liveActivities) {
            const author = nameOf(activity.author);
            const who = [{
                name: author?.nickname ?? '…',
                colour: author?.colour ?? '#999999',
                isSelf: activity.author === snapshot.self.id,
            }];
            if (activity.body.kind === 'reaction') {
                reactions.push({
                    id: activity.id,
                    emoji: activity.body.emoji,
                    count: (Math.round(activity.at / 100) % 9) + 1,
                });
            } else if (activity.body.kind === 'chat') {
                chatAndNotices.push({ id: activity.id, authors: who, text: activity.body.text, notice: null });
            } else {
                chatAndNotices.push({ id: activity.id, authors: who, text: null, notice: noticeView(activity) });
            }
        }

        const observed = safeObserve();
        const source = snapshot.source;

        views.connection.set({
            state: snapshot.connection.status,
            clock: snapshot.clockConfidence,
            readOnly: snapshot.connection.status === 'degraded',
            problem: problemOf(snapshot.connection),
        });
        views.source.set({
            raw: sourceDraft,
            revision: sourceRevision,
            kind: source?.kind ?? null,
            valid: source !== null,
            empty: source === null && sourceDraft.trim() === '',
            resolving: resolving !== null,
            resolveFailed,
            isExample: false,
            seeding: delivery?.seeding ?? false,
        });
        views.playback.set({
            paused: snapshot.playhead.value.paused,
            muted,
            ready: observed.ready,
            stalled: observed.stalled,
            positionSeconds: snapshot.projectedPosition,
            durationSeconds: duration,
            driftSeconds: (observed.position - snapshot.projectedPosition) as Seconds,
        });
        views.participants.set({
            self: toParticipant(snapshot.self),
            others: snapshot.others.map(toParticipant),
            total: snapshot.others.length + 1,
        });
        views.feed.set({ items: chatAndNotices, reactions });
        views.delivery.set({
            visible: source?.kind === 'magnet',
            peers: delivery?.peers ?? 0,
            downloadBytesPerSecond: delivery?.downloadBytesPerSecond ?? 0,
            uploadBytesPerSecond: delivery?.uploadBytesPerSecond ?? 0,
            progress: delivery?.progress ?? null,
            seeding: delivery?.seeding ?? false,
        });
        if (snapshot.roomId) {
            views.invite.set({
                roomId: snapshot.roomId,
                url: location.roomUrl(snapshot.roomId),
                canShare: location.canShare(),
            });
        }
        void now;
    };

    const safeObserve = (): ObservedPlayback => {
        try {
            return player.observe();
        } catch {
            return { position: 0 as Seconds, paused: true, ready: false, stalled: false };
        }
    };

    /**
     * Rendering must never take the session down. A projection that throws is a
     * display bug; the command that triggered it has already been executed and
     * the room must stay usable.
     */
    const peek = (): RoomSnapshot | null => {
        if (!replica) return null;
        try {
            return replica.snapshot(clock.now());
        } catch {
            return null;
        }
    };

    /**
     * Adopt a source somebody else picked.
     *
     * The field is not bound to the view — the user's keystrokes and a remote
     * change are two writers of one string — so a remote change has to be
     * handed over explicitly, by bumping `revision`. Without this the receiving
     * client plays the right video with an empty input box, which reads as
     * "it never arrived".
     */
    let lastSeenLocator: string | null = null;

    const adoptRemoteSource = (snapshot: RoomSnapshot): void => {
        const locator = snapshot.source?.locator ?? null;
        if (locator === lastSeenLocator) return;
        lastSeenLocator = locator;
        if ((locator ?? '') === sourceDraft) return;
        sourceDraft = locator ?? '';
        sourceRevision += 1;
    };

    const refresh = (): void => {
        const snapshot = peek();
        if (!snapshot) return;
        adoptRemoteSource(snapshot);
        render(snapshot, clock.now());
    };

    // ---- decision execution -------------------------------------------------

    const telemetryContext = () => {
        const snapshot = peek();
        return {
            roomId: (snapshot?.roomId ?? roomId ?? '') as RoomId,
            paused: snapshot?.playhead.value.paused ?? true,
            sourceKind: snapshot?.source?.kind ?? null,
            sourceHost: hostOf(snapshot?.source ?? null),
            participantCount: (snapshot?.others.length ?? 0) + 1,
            isExampleSource: false,
        };
    };

    const hostOf = (source: MediaSourceRef | null): string | null => {
        if (!source || (source.kind !== 'direct' && source.kind !== 'hls')) return null;
        try {
            return new URL(source.locator).hostname;
        } catch {
            return null;
        }
    };

    const write = async (session: RoomSession, intent: PublishIntent): Promise<void> => {
        try {
            switch (intent.kind) {
                case 'playhead': return await session.publishPlayhead(intent.intent);
                case 'source': return await session.publishSource(intent.source);
                case 'presence': return await session.publishPresence(intent.presence);
                case 'activity': return await session.appendActivity(intent.activity);
                case 'retract': return await session.retractActivities(intent.ids);
                case 'watchTime': return await session.recordWatchedMinutes(intent.deltaMinutes);
            }
        } catch (error) {
            errors.capture(error, { where: 'publish', kind: intent.kind });
            degrade('write-rejected');
        }
    };

    /**
     * A nudge is a temporary change of speed and has to be taken back.
     *
     * `Correction.nudge` carries `until` precisely because it is bounded;
     * nothing was acting on it, so a client that nudged once played at 0.95x
     * for the rest of the film, drifted the other way, nudged back, and
     * oscillated forever. Exactly the "fights itself" failure the design set
     * out to prevent.
     */
    let releaseNudge: Unsubscribe | null = null;
    let rate = 1;

    /** Only when it actually changes: re-setting it every tick disturbs decoding. */
    const setRate = (next: number): void => {
        if (next === rate) return;
        rate = next;
        player.setRate(next);
    };

    const correct = (decision: Decision): void => {
        if (decision.correct.kind !== 'nudge' && releaseNudge) {
            releaseNudge();
            releaseNudge = null;
            setRate(1);
        }

        switch (decision.correct.kind) {
            case 'seek': return player.seekTo(decision.correct.to);
            case 'halt': player.seekTo(decision.correct.at); return player.pause();
            case 'resume': player.seekTo(decision.correct.from); void player.play(); return;
            case 'nudge': {
                const { until } = decision.correct;
                releaseNudge?.();
                setRate(decision.correct.rate);
                releaseNudge = scheduler.after(
                    Math.max(0, until - clock.now()) as Millis,
                    () => {
                        releaseNudge = null;
                        setRate(1);
                    },
                );
                return;
            }
            case 'none': return;
        }
    };

    /**
     * The single place a decision turns into I/O: writes, then the player, then
     * events.
     *
     * Serialized, because it re-enters itself. Correcting the player makes the
     * element emit — a `pause()` produces `paused` — which the coordinator
     * feeds straight back to the replica, producing another decision while this
     * one is still being applied. A real media element defers its events, so
     * the recursion is invisible in a browser and unbounded anywhere the events
     * are synchronous. Queueing turns it into a loop that drains.
     */
    let applying = false;
    const pendingDecisions: { decision: Decision; session: RoomSession | null }[] = [];

    const apply = (decision: Decision, session: RoomSession | null = room): void => {
        pendingDecisions.push({ decision, session });
        if (applying) return;

        applying = true;
        try {
            while (pendingDecisions.length) {
                const next = pendingDecisions.shift()!;
                if (next.session) {
                    for (const intent of next.decision.publish) void write(next.session, intent);
                }
                correct(next.decision);
                const context = telemetryContext();
                for (const event of next.decision.events) {
                    events.emit(event);
                    telemetry.record(event, context);
                }
            }
        } finally {
            applying = false;
        }
        refresh();
    };

    /** Writes are withheld while the clock cannot be trusted (I9). */
    const blocked = (): boolean => policy.requireClockSync && confidence === 'unsynced';

    const degrade = (reason: 'write-rejected' | 'clock-unsynced' | 'read-only'): void => {
        if (!replica) return;
        apply(replica.applyConnectionChange({ status: 'degraded', reason }, clock.now()));
    };

    // ---- lifecycle ----------------------------------------------------------

    const loadProfile = (): StoredProfile => {
        if (profile) return profile;
        const stored = profiles.load();
        profile = stored ?? {
            participantId: ids.participantId(),
            nickname: parseNickname('anon') ?? ('anon' as StoredProfile['nickname']),
            lastRoomId: null,
            locale: null,
        };
        if (!stored) profiles.save(profile);
        telemetry.identify(profile.participantId);
        return profile;
    };

    const teardown = async (): Promise<void> => {
        stopTick?.();
        stopTick = null;
        detachPlayer?.();
        detachPlayer = null;
        resolving?.abort();
        resolving = null;
        releaseNudge?.();
        releaseNudge = null;
        rate = 1;
        const closing = room;
        room = null;
        replica = null;
        roomId = null;
        await resolver.release().catch(() => undefined);
        await closing?.close().catch(() => undefined);
    };

    const enter = async (target: RoomId): Promise<void> => {
        // The old room is closed synchronously, before anything about the new
        // one starts, so a callback still in flight from it finds nothing to
        // act on.
        stopTick?.();
        stopTick = null;
        detachPlayer?.();
        detachPlayer = null;
        resolving?.abort();
        resolving = null;
        releaseNudge?.();
        releaseNudge = null;
        rate = 1;
        const closing = room;
        room = null;
        replica = null;
        roomId = null;
        void resolver.release().catch(() => undefined);
        void closing?.close().catch(() => undefined);

        const me = loadProfile();

        // Never stamp anything before the clock is trustworthy (I1).
        await clock.sync();

        const created = replicas.create({
            roomId: target,
            self: me.participantId,
            nickname: me.nickname,
            policy,
            now: clock.now(),
        });
        replica = created;
        roomId = target;

        // Tell the replica what the clock is worth straight away. Without this
        // a client whose clock never synchronized shows "online" while its
        // writes are silently withheld — the worst of both.
        let level: ClockConfidence = 'synced';
        clock.confidence.subscribe((value) => { level = value; })();
        confidence = level;
        apply(created.applyClockConfidence(level, clock.now()), null);

        // Attached BEFORE the room is opened. Opening delivers a snapshot,
        // which can start a load, which reports readiness — and a listener
        // attached after that has already missed the only event that would have
        // positioned a client joining mid-film.
        detachPlayer = player.attach(playerListener);

        const opened = await gateway.open({
            roomId: target,
            self: me.participantId,
            listener: listenerFor(created),
        });
        if (replica !== created) {
            void opened.close().catch(() => undefined);
            return;
        }
        room = opened;

        // Before the first presence write: a connection lost between the two
        // leaves a permanent ghost participant in the room.
        await opened.armDisconnectCleanup();
        await write(opened, { kind: 'presence', presence: selfPresence() });

        apply(created.applyRemoteSnapshot(emptyRemote(), clock.now()), opened);

        stopTick = scheduler.every(TICK_PERIOD, (now) => {
            if (replica !== created) return;
            // The drift check belongs on the tick, not only on player events:
            // a client that has fallen behind emits nothing while it does so.
            apply(created.observePlayer(safeObserve(), now));
            apply(created.tick(now));
        });

        profile = { ...me, lastRoomId: target };
        profiles.save(profile);
        refresh();
    };

    const emptyRemote = (): RemoteRoomState =>
        ({ createdAt: null, playhead: null, source: null, presences: [], activities: [], watchedMinutes: 0 });

    /**
     * One second. Fast enough that the shortest rule in any policy — the feed
     * sweep — is never late by more than a tick, cheap enough to ignore: a tick
     * that decides nothing performs no I/O at all.
     */
    const TICK_PERIOD = 1_000 as Millis;

    const go = async (target: RoomId): Promise<void> => {
        joining = enter(target);
        try {
            await joining;
        } finally {
            joining = null;
        }
    };

    // ---- inbound: remote ----------------------------------------------------

    /**
     * Bound to ONE replica. Traffic that arrives from a room we have already
     * left finds `replica !== mine` and is dropped, rather than being applied
     * to whatever room we are in now.
     */
    const listenerFor = (mine: RoomReplica) => ({
        onSnapshot(state: RemoteRoomState) {
            if (replica !== mine) return;
            apply(mine.applyRemoteSnapshot(state, clock.now()));
            // A joining client has to load what the room is already watching.
            // Waiting for the next `onSourceChanged` means waiting for somebody
            // else to write something, which may never happen.
            if (state.source?.value) void load(state.source.value);
        },
        onPlayheadChanged(intent: PlayheadIntent) {
            if (replica === mine) apply(mine.applyRemotePlayhead(intent, clock.now()));
        },
        onSourceChanged(source: Stamped<MediaSourceRef | null>) {
            if (replica !== mine) return;
            apply(mine.applyRemoteSource(source, clock.now()));
            void load(source.value);
        },
        onPresenceChanged(all: readonly Presence[]) {
            if (replica === mine) apply(mine.applyRemotePresence(all, clock.now()));
        },
        onActivityChanged(all: readonly Activity[]) {
            if (replica === mine) apply(mine.applyRemoteActivity(all, clock.now()));
        },
        onConnectionChanged(state: ConnectionState) {
            if (replica !== mine) return;
            apply(mine.applyConnectionChange(state, clock.now()));
            if (state.status === 'online') {
                // Re-establish the offset and re-announce ourselves rather than
                // waiting out a full heartbeat after a reconnect.
                void clock.sync().then(() => {
                    if (replica && room) void write(room, { kind: 'presence', presence: selfPresence() });
                });
            }
        },
        onRemoteError(error: GatewayError) {
            errors.capture(error, { where: 'gateway' });
            if (replica === mine) {
                apply(mine.applyConnectionChange({ status: 'error', message: error.message }, clock.now()));
            }
        },
    });

    const selfPresence = (): Presence => {
        const me = loadProfile();
        return { participantId: me.participantId, nickname: me.nickname, lastSeen: clock.now() };
    };

    // ---- inbound: player ----------------------------------------------------

    const observeNow = (): void => {
        if (replica) apply(replica.observePlayer(safeObserve(), clock.now()));
    };

    const playerListener = {
        onReady(total: Seconds) {
            duration = total;
            observeNow();
        },
        onPlayed() { observeNow(); },
        onPaused() { observeNow(); },
        onSeeked() { observeNow(); },
        onProgress() { observeNow(); },
        onStalled() { observeNow(); },
        onEnded() { observeNow(); },
        onError(error: PlayerError) {
            errors.capture(error, { where: 'player' });
            resolveFailed = true;
            refresh();
        },
    };

    // ---- media --------------------------------------------------------------

    const load = async (source: MediaSourceRef | null): Promise<ResolvedMedia | null> => {
        // Cancel the previous attempt unconditionally, finished or not: once the
        // room has moved on, nothing from the old source may reach the player,
        // and an abort on a settled controller costs nothing.
        lastResolve?.abort();
        resolving = null;
        if (!source) {
            resolving = null;
            refresh();
            return null;
        }
        const controller = new AbortController();
        resolving = controller;
        lastResolve = controller;
        resolveFailed = false;
        refresh();
        try {
            const media = await resolver.resolve(source, controller.signal);
            if (resolving !== controller) return null;
            await player.load(media);
            return media;
        } catch (error) {
            if (resolving === controller) {
                resolveFailed = true;
                errors.capture(error, { where: 'resolve' });
            }
            return null;
        } finally {
            if (resolving === controller) {
                resolving = null;
                refresh();
            }
        }
    };

    // ---- outbound of the UI -------------------------------------------------

    const session: WatchSession = {
        view: views,
        events,

        async resume() {
            const me = loadProfile();
            const target = location.currentRoomId() ?? me.lastRoomId ?? ids.roomId();
            stopLocation ??= location.onRoomChanged((next) => {
                if (next && next !== roomId) void go(next);
            });
            stopClock ??= clock.confidence.subscribe((level: ClockConfidence) => {
                confidence = level;
                if (replica) apply(replica.applyClockConfidence(level, clock.now()));
            });
            stopDelivery ??= resolver.stats().subscribe((stats) => {
                delivery = stats;
                refresh();
            });
            if (target !== location.currentRoomId()) location.navigateToRoom(target);
            await go(target);
        },

        async join(next: RoomId) {
            if (next !== location.currentRoomId()) location.navigateToRoom(next);
            await go(next);
        },

        async leave() {
            await teardown();
        },

        async setSourceFromUserInput(raw: string): Promise<SetSourceResult> {
            sourceDraft = raw;
            const classified = resolver.classify(raw);
            if (!classified) {
                refresh();
                return raw.trim() ? { status: 'unrecognized' } : { status: 'cleared' };
            }
            if (!replica) return { status: 'rejected', reason: 'offline' };
            if (blocked()) return { status: 'rejected', reason: 'clock-unsynced' };
            apply(replica.selectSource(classified, clock.now()));
            await load(classified);
            return { status: 'accepted', source: classified };
        },

        async pickExampleSource() {
            // The example list is configuration, so it reaches the domain the
            // same way any other pick does: as raw user input.
            await session.setSourceFromUserInput('');
        },

        async shareLocalFile(file: File): Promise<ShareFileResult> {
            if (!replica) return { status: 'failed', reason: 'aborted' };
            try {
                const ref = await resolver.share(file);
                apply(replica.selectSource(ref, clock.now()));
                await load(ref);
                return { status: 'shared', source: ref };
            } catch (error) {
                errors.capture(error, { where: 'share' });
                return { status: 'failed', reason: 'seeding-failed' };
            }
        },

        async playLocalFilePrivately(file: File) {
            const media = await resolver.localOnly(file);
            await player.load(media);
            if (replica) apply(replica.postNotice(ids.activityId(), { type: 'pickedLocalFile' }, clock.now()));
        },

        postChatMessage(text: string) {
            if (!replica) return;
            apply(replica.postChat(ids.activityId(), text, clock.now()));
        },

        throwReaction(emoji: string) {
            if (!replica) return;
            apply(replica.throwReaction(ids.activityId(), emoji, clock.now()));
        },

        renameSelf(raw: string) {
            const parsed = parseNickname(raw);
            if (!parsed || !replica) return;
            profile = { ...loadProfile(), nickname: parsed };
            profiles.save(profile);
            apply(replica.rename(parsed, clock.now()));
        },

        setLocale(locale: string) {
            profile = { ...loadProfile(), locale };
            profiles.save(profile);
            telemetry.record({ type: 'RoomJoined', roomId: (roomId ?? '') as RoomId, self: profile.participantId }, telemetryContext());
        },

        recordInteraction(target: InteractionTarget) {
            telemetry.record({ type: 'RoomJoined', roomId: (roomId ?? '') as RoomId, self: loadProfile().participantId }, { ...telemetryContext(), sourceHost: target });
        },

        async generateNewRoom(): Promise<RoomId> {
            const next = ids.roomId();
            location.navigateToRoom(next);
            await go(next);
            return next;
        },

        async joinRoomByLinkOrId(input: string): Promise<RoomId | null> {
            const trimmed = input.trim();
            if (!trimmed) return null;
            let candidate = trimmed;
            try {
                const url = new URL(trimmed);
                if (!url.hash || url.hash.length < 2) return null;
                candidate = url.hash.slice(1);
            } catch {
                // not a URL: treat the whole string as a room id
            }
            const parsed = parseRoomId(candidate);
            if (!parsed) return null;
            await session.join(parsed);
            return parsed;
        },

        // MediaPlayerListener
        ...{} as Record<string, never>,
        ...playerListener,

        // RemoteRoomListener — the session itself forwards to whatever replica
        // is current, for adapters that hand it over directly.
        onSnapshot(state: RemoteRoomState) {
            if (replica) apply(replica.applyRemoteSnapshot(state, clock.now()));
        },
        onPlayheadChanged(intent: PlayheadIntent) {
            if (replica) apply(replica.applyRemotePlayhead(intent, clock.now()));
        },
        onSourceChanged(source: Stamped<MediaSourceRef | null>) {
            if (!replica) return;
            apply(replica.applyRemoteSource(source, clock.now()));
            void load(source.value);
        },
        onPresenceChanged(all: readonly Presence[]) {
            if (replica) apply(replica.applyRemotePresence(all, clock.now()));
        },
        onActivityChanged(all: readonly Activity[]) {
            if (replica) apply(replica.applyRemoteActivity(all, clock.now()));
        },
        onConnectionChanged(state: ConnectionState) {
            if (!replica) return;
            apply(replica.applyConnectionChange(state, clock.now()));
        },
        onRemoteError(error: GatewayError) {
            errors.capture(error, { where: 'gateway' });
            if (replica) {
                apply(replica.applyConnectionChange({ status: 'error', message: error.message }, clock.now()));
            }
        },

        onTick(now: EpochMs) {
            if (replica) apply(replica.tick(now));
        },

        async dispose() {
            stopLocation?.();
            stopClock?.();
            stopDelivery?.();
            stopLocation = stopClock = stopDelivery = null;
            await teardown();
        },
    };

    void joining;
    void muted;
    return session;
};
