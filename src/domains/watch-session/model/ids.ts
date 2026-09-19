import { notImplemented } from './shared/not-implemented';
import type { Brand } from './shared/brand';

/** Human-shareable room key, carried in the URL hash. Legacy: `randomStr(6)`. */
export type RoomId = Brand<string, 'RoomId'>;

/** Stable per-browser identity. Legacy: `localStorage['my-id']`. */
export type ParticipantId = Brand<string, 'ParticipantId'>;

/** Feed item key. Legacy: `randomStr(6)` — ~31 bits, collision-prone. */
export type ActivityId = Brand<string, 'ActivityId'>;

/** Display name, validated and length-capped. Legacy: `User.name`. */
export type Nickname = Brand<string, 'Nickname'>;

/** `#rrggbb`, derived deterministically from a ParticipantId. */
export type HexColour = Brand<string, 'HexColour'>;

export const NICKNAME_MAX_LENGTH = 10;

/**
 * Parsing constructors. They return `null` rather than throwing, because every
 * caller is handling untrusted input (a URL hash, a prompt, a remote payload)
 * and has a sensible fallback.
 */
export function roomId(raw: string): RoomId | null {
    return notImplemented('roomId');
}
export function participantId(raw: string): ParticipantId | null {
    return notImplemented('participantId');
}
export function activityId(raw: string): ActivityId | null {
    return notImplemented('activityId');
}

/** Trims, collapses whitespace and caps at {@link NICKNAME_MAX_LENGTH}. */
export function nickname(raw: string): Nickname | null {
    return notImplemented('nickname');
}

/** Deterministic and stable across clients. Legacy: `utils.stringToColor`. */
export function colourFor(id: ParticipantId): HexColour {
    return notImplemented('colourFor');
}
