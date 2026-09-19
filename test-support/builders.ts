/**
 * Test data builders.
 *
 * Every domain function takes `now` as an argument, so none of these needs a
 * clock, a timer or a mock — they are plain object factories. That is the
 * single clearest payoff of banning ambient state from the model.
 */
import type { EpochMs, Millis, Seconds } from '../src/domains/watch-session/model/shared/time';
import type { Stamped } from '../src/domains/watch-session/model/shared/stamped';
import type { ActivityId, ParticipantId, RoomId, Nickname } from '../src/domains/watch-session/model/ids';
import type { Playhead, PlayheadIntent } from '../src/domains/watch-session/model/playhead';
import type { ObservedPlayback } from '../src/domains/watch-session/model/reconcile';
import type { Presence } from '../src/domains/watch-session/model/participant';
import type { Activity, ActivityBody } from '../src/domains/watch-session/model/activity';
import type { MediaSourceKind, MediaSourceRef } from '../src/domains/watch-session/model/media-source';

export const ms = (n: number) => n as EpochMs;
export const dur = (n: number) => n as Millis;
export const sec = (n: number) => n as Seconds;

export const ALICE = 'alice' as ParticipantId;
export const BOB = 'bob' as ParticipantId;
export const CAROL = 'carol' as ParticipantId;
export const ROOM = 'room-1' as RoomId;

/** A round, readable epoch to anchor every test on. */
export const T0 = ms(1_700_000_000_000);

export const at = (offsetMs: number) => ms(T0 + offsetMs);

export const stamped = <T,>(value: T, atMs: EpochMs, by: ParticipantId = ALICE): Stamped<T> =>
    ({ value, at: atMs, by });

export const playhead = (over: Partial<Playhead> = {}): Playhead =>
    ({ position: sec(0), paused: true, rate: 1, ...over });

export const intent = (
    over: Partial<Playhead> = {},
    atMs: EpochMs = T0,
    by: ParticipantId = ALICE,
): PlayheadIntent => stamped(playhead(over), atMs, by);

export const observed = (over: Partial<ObservedPlayback> = {}): ObservedPlayback =>
    ({ position: sec(0), paused: true, ready: true, stalled: false, ...over });

export const presence = (
    participantId: ParticipantId,
    lastSeen: EpochMs,
    name = 'nick',
): Presence => ({ participantId, nickname: name as Nickname, lastSeen });

export const activity = (
    id: string,
    atMs: EpochMs,
    body: ActivityBody = { kind: 'chat', text: 'hi' },
    author: ParticipantId = ALICE,
): Activity => ({ id: id as ActivityId, author, at: atMs, body });

export const source = (
    over: { kind?: MediaSourceKind; locator?: string } = {},
): MediaSourceRef => ({
    kind: over.kind ?? 'direct',
    locator: (over.locator ?? 'https://example.com/v.mp4') as MediaSourceRef['locator'],
});
