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
    const normalised = raw.trim().toLowerCase();
    return /^[a-z0-9_-]{1,64}$/.test(normalised) ? (normalised as RoomId) : null;
}
export function participantId(raw: string): ParticipantId | null {
    const trimmed = raw.trim();
    return /^[A-Za-z0-9_-]{1,64}$/.test(trimmed) ? (trimmed as ParticipantId) : null;
}
export function activityId(raw: string): ActivityId | null {
    const trimmed = raw.trim();
    return /^[A-Za-z0-9_-]{1,64}$/.test(trimmed) ? (trimmed as ActivityId) : null;
}

/** Trims, collapses whitespace and caps at {@link NICKNAME_MAX_LENGTH}. */
export function nickname(raw: string): Nickname | null {
    const collapsed = raw.trim().replace(/\s+/g, ' ');
    if (!collapsed) return null;
    return collapsed.slice(0, NICKNAME_MAX_LENGTH) as Nickname;
}

/** Deterministic and stable across clients. Legacy: `utils.stringToColor`. */
export function colourFor(id: ParticipantId): HexColour {
    // Legacy `utils.stringToColor`, kept bit-for-bit so a participant does not
    // change colour when this ships. Biased light so it reads on a black page.
    let hash = 0;
    for (const char of id) {
        hash = char.charCodeAt(0) + ((hash << 5) - hash);
    }
    let colour = '#';
    for (let i = 0; i < 3; i++) {
        const value = (192 + (hash >> (i * 2))) & 0xff;
        colour += value.toString(16).padStart(2, '0');
    }
    return colour as HexColour;
}
