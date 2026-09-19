import type { EpochMs, Seconds } from '../../../domains/watch-session/model/shared/time';
import type { Stamped } from '../../../domains/watch-session/model/shared/stamped';
import type { ActivityId, ParticipantId } from '../../../domains/watch-session/model/ids';
import type { Nickname } from '../../../domains/watch-session/model/ids';
import type { MediaSourceRef } from '../../../domains/watch-session/model/media-source';
import type { PlayheadIntent } from '../../../domains/watch-session/model/playhead';
import type { Presence } from '../../../domains/watch-session/model/participant';
import type { Activity } from '../../../domains/watch-session/model/activity';
import { MESSAGE_TYPE, type MessageDto, type RoomDto, type TimedValueDto, type UserDto } from './schema';

/**
 * THE ANTI-CORRUPTION LAYER.
 *
 * Everything the old schema gets wrong is corrected here and nowhere else:
 * seconds become milliseconds, the two playhead nodes become one value, and an
 * integer message type becomes a structured notice.
 */

/** Legacy stored seconds; the domain works in milliseconds throughout. */
export const toEpochMs = (seconds: number): EpochMs => Math.round(seconds * 1000) as EpochMs;
export const toLegacySeconds = (at: EpochMs): number => at / 1000;

/** Writes that predate this client carry no author; ties fall back to a constant. */
const LEGACY_AUTHOR = '~legacy' as ParticipantId;

const authorOf = (dto: { by?: string } | undefined): ParticipantId =>
    (dto?.by as ParticipantId | undefined) ?? LEGACY_AUTHOR;

/**
 * Join the two nodes back into one value.
 *
 * `paused` and `currentTime` are written with the SAME timestamp, so normally
 * they agree. When they do not — an old client wrote one of them — the newer
 * stamp wins and the other node's value is taken as-is, which is the best that
 * can be done with a schema that never should have split them.
 */
export const readPlayhead = (room: RoomDto): PlayheadIntent | null => {
    const time = room.currentTime;
    const paused = room.paused;
    if (!time && !paused) return null;

    const at = toEpochMs(Math.max(time?.updatedAt ?? 0, paused?.updatedAt ?? 0));
    const newer = (time?.updatedAt ?? 0) >= (paused?.updatedAt ?? 0) ? time : paused;

    return {
        value: {
            position: (time?.value ?? 0) as Seconds,
            paused: paused?.value ?? true,
            rate: time?.rate ?? 1,
        },
        at,
        by: authorOf(newer),
    };
};

export const writePlayhead = (intent: PlayheadIntent): {
    currentTime: TimedValueDto<number>;
    paused: TimedValueDto<boolean>;
} => {
    const updatedAt = toLegacySeconds(intent.at);
    return {
        currentTime: { value: intent.value.position, updatedAt, by: intent.by, rate: intent.value.rate },
        paused: { value: intent.value.paused, updatedAt, by: intent.by },
    };
};

export const readSource = (
    room: RoomDto,
    classify: (raw: string) => MediaSourceRef | null,
): Stamped<MediaSourceRef | null> | null => {
    if (!room.url) return null;
    return {
        value: room.url.value ? classify(room.url.value) : null,
        at: toEpochMs(room.url.updatedAt),
        by: authorOf(room.url),
    };
};

export const writeSource = (source: Stamped<MediaSourceRef | null>): TimedValueDto<string> => ({
    value: source.value?.locator ?? '',
    updatedAt: toLegacySeconds(source.at),
    by: source.by,
});

export const readPresences = (room: RoomDto): Presence[] =>
    Object.entries(room.users ?? {}).map(([id, user]) => ({
        participantId: id as ParticipantId,
        nickname: (user.name ?? '') as Nickname,
        lastSeen: toEpochMs(user.lastSeen ?? 0),
    }));

export const writePresence = (presence: Presence): UserDto => ({
    name: presence.nickname,
    lastSeen: toLegacySeconds(presence.lastSeen),
});

export const readActivities = (room: RoomDto): Activity[] =>
    Object.entries(room.messages ?? {}).map(([id, message]) => ({
        id: id as ActivityId,
        author: message.userId as ParticipantId,
        at: toEpochMs(message.timestamp ?? 0),
        body: readBody(message),
    }));

const readBody = (message: MessageDto): Activity['body'] => {
    const seconds = Number(message.text) as Seconds;
    switch (message.type) {
        case MESSAGE_TYPE.reaction: return { kind: 'reaction', emoji: message.text };
        case MESSAGE_TYPE.seek: return { kind: 'notice', notice: { type: 'seeked', to: seconds } };
        case MESSAGE_TYPE.play: return { kind: 'notice', notice: { type: 'played', from: seconds } };
        case MESSAGE_TYPE.pause: return { kind: 'notice', notice: { type: 'paused', at: seconds } };
        case MESSAGE_TYPE.selectedLocalFile: return { kind: 'notice', notice: { type: 'pickedLocalFile' } };
        default: return { kind: 'chat', text: message.text ?? '' };
    }
};

export const writeActivity = (activity: Activity): MessageDto => {
    const timestamp = toLegacySeconds(activity.at);
    const base = { userId: activity.author, timestamp };
    switch (activity.body.kind) {
        case 'chat':
            return { ...base, text: activity.body.text, type: MESSAGE_TYPE.regular };
        case 'reaction':
            return { ...base, text: activity.body.emoji, type: MESSAGE_TYPE.reaction };
        case 'notice':
            switch (activity.body.notice.type) {
                case 'seeked':
                    return { ...base, text: String(activity.body.notice.to), type: MESSAGE_TYPE.seek };
                case 'played':
                    return { ...base, text: String(activity.body.notice.from), type: MESSAGE_TYPE.play };
                case 'paused':
                    return { ...base, text: String(activity.body.notice.at), type: MESSAGE_TYPE.pause };
                default:
                    // Old clients have no rendering for anything else; the
                    // closest existing notice is better than an empty bubble.
                    return { ...base, text: '', type: MESSAGE_TYPE.selectedLocalFile };
            }
    }
};

export const readWatchedMinutes = (room: RoomDto): number =>
    Object.values(room.minutesWatched ?? {}).reduce((total, minutes) => total + (minutes ?? 0), 0);
