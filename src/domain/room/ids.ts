import type { Brand } from '../shared/brand';

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
export declare function roomId(raw: string): RoomId | null;
export declare function participantId(raw: string): ParticipantId | null;
export declare function activityId(raw: string): ActivityId | null;

/** Trims, collapses whitespace and caps at {@link NICKNAME_MAX_LENGTH}. */
export declare function nickname(raw: string): Nickname | null;

/** Deterministic and stable across clients. Legacy: `utils.stringToColor`. */
export declare function colourFor(id: ParticipantId): HexColour;
