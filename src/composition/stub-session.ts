/**
 * TEMPORARY SCAFFOLD — delete when the real implementation lands.
 *
 * `ports/index.ts` declares `createWatchSession` but has no body, so nothing
 * satisfies `WatchSession` at runtime and the Svelte adapter could not be
 * built, let alone opened in a browser. This is the smallest object that makes
 * the driving adapter compile and render: every command is a logged no-op and
 * every view is a constant.
 *
 * It contains no logic and encodes no decisions. Its only job is to let the
 * port design be exercised by real UI code before any of it is implemented.
 * Clicking things does nothing, on purpose.
 */
import type { Observable, Unsubscribe } from '../domains/watch-session/model/shared/observable';
import type { Seconds } from '../domains/watch-session/model/shared/time';
import type { RoomId } from '../domains/watch-session/model/ids';
import type { DomainEvent } from '../domains/watch-session/model/events';
import type { DomainEventBus } from '../domains/watch-session/ports/event-bus';
import type { WatchSession } from '../domains/watch-session/ports';
import type {
    ConnectionView,
    DeliveryView,
    FeedView,
    InviteView,
    ParticipantListView,
    PlaybackView,
    SourceView,
} from '../domains/watch-session/ports/inbound/views';
import type { SetSourceResult, ShareFileResult } from '../domains/watch-session/ports/inbound/watch-session-commands';

const constant = <T,>(value: T): Observable<T> => ({
    subscribe(run: (value: T) => void): Unsubscribe {
        run(value);
        return () => undefined;
    },
});

const noop = (name: string) => (...args: unknown[]) => {
    console.warn(`[stub] ${name}`, ...args);
};

const asyncNoop = (name: string) => async (...args: unknown[]) => {
    console.warn(`[stub] ${name}`, ...args);
};

const seconds = (n: number) => n as Seconds;

const connection: ConnectionView = { state: 'online', clock: 'synced', readOnly: false, problem: null };

const source: SourceView = {
    raw: '', revision: 0, kind: null, valid: false, empty: true,
    resolving: false, resolveFailed: false, isExample: false, seeding: false,
};

const playback: PlaybackView = {
    paused: true, muted: true, ready: false, stalled: false,
    positionSeconds: seconds(0), durationSeconds: null, driftSeconds: seconds(0),
};

const participants: ParticipantListView = {
    self: { id: 'stub-self', name: 'you', colour: '#c0c0c0', isSelf: true },
    others: [],
    total: 1,
};

const feed: FeedView = { items: [], reactions: [] };

const delivery: DeliveryView = {
    visible: false, peers: 0, downloadBytesPerSecond: 0,
    uploadBytesPerSecond: 0, progress: null, seeding: false,
};

const events: DomainEventBus = {
    emit: noop('events.emit') as (event: DomainEvent) => void,
    subscribe: () => () => undefined,
    on: () => () => undefined,
};

export const createStubSession = (roomId: string): WatchSession => {
    const invite: InviteView = {
        roomId,
        url: `${location.protocol}//${location.host}${location.pathname}#${roomId}`,
        canShare: Boolean(navigator.share),
    };

    return {
        view: {
            connection: constant(connection),
            source: constant(source),
            playback: constant(playback),
            participants: constant(participants),
            feed: constant(feed),
            delivery: constant(delivery),
            invite: constant(invite),
        },
        events,

        // WatchSessionCommands
        join: asyncNoop('join'),
        resume: asyncNoop('resume'),
        leave: asyncNoop('leave'),
        setSourceFromUserInput: async (raw: string): Promise<SetSourceResult> => {
            console.warn('[stub] setSourceFromUserInput', raw);
            return raw.trim() ? { status: 'unrecognized' } : { status: 'cleared' };
        },
        pickExampleSource: asyncNoop('pickExampleSource'),
        shareLocalFile: async (file: File): Promise<ShareFileResult> => {
            console.warn('[stub] shareLocalFile', file.name);
            return { status: 'failed', reason: 'seeding-failed' };
        },
        playLocalFilePrivately: asyncNoop('playLocalFilePrivately'),
        postChatMessage: noop('postChatMessage'),
        throwReaction: noop('throwReaction'),
        renameSelf: noop('renameSelf'),
        setLocale: noop('setLocale'),
        recordInteraction: noop('recordInteraction'),
        generateNewRoom: async (): Promise<RoomId> => {
            console.warn('[stub] generateNewRoom');
            return roomId as RoomId;
        },
        joinRoomByLinkOrId: async (input: string): Promise<RoomId | null> => {
            console.warn('[stub] joinRoomByLinkOrId', input);
            return null;
        },

        // RemoteRoomListener
        onSnapshot: noop('onSnapshot'),
        onPlayheadChanged: noop('onPlayheadChanged'),
        onSourceChanged: noop('onSourceChanged'),
        onPresenceChanged: noop('onPresenceChanged'),
        onActivityChanged: noop('onActivityChanged'),
        onConnectionChanged: noop('onConnectionChanged'),
        onRemoteError: noop('onRemoteError'),

        // MediaPlayerListener
        onReady: noop('onReady'),
        onPlayed: noop('onPlayed'),
        onPaused: noop('onPaused'),
        onSeeked: noop('onSeeked'),
        onProgress: noop('onProgress'),
        onStalled: noop('onStalled'),
        onEnded: noop('onEnded'),
        onError: noop('onError'),

        // SessionTicks
        onTick: noop('onTick'),

        dispose: asyncNoop('dispose'),
    };
};

/** Stub `PlayerSurface`: accepts the element and does nothing with it. */
export const createStubPlayerSurface = () => ({
    mount: (element: HTMLElement) => console.warn('[stub] player.mount', element.tagName),
    unmount: () => console.warn('[stub] player.unmount'),
});
