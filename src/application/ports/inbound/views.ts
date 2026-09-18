import type { Seconds } from '../../../domain/shared/time';
import type { MediaSourceKind } from '../../../domain/room/media-source';
import type { ClockConfidence } from '../../../domain/shared/clock-confidence';
import type { ConnectionState } from '../../../domain/room/connection';

/**
 * READ MODELS.
 *
 * Two rules, both load-bearing:
 *
 *  1. No domain types and no behaviour — strings, numbers, booleans, arrays
 *     only. A component physically cannot reach through a view model into the
 *     model, the way `room.messages.sendMessage(...)` is called from inside a
 *     chat component today.
 *
 *  2. Position is NOT published at player frequency. The media element renders
 *     its own position; `PlaybackView` carries it only at the granularity the
 *     UI actually displays (~4Hz), and `driftSeconds` only for a debug overlay.
 */

export interface ConnectionView {
    readonly state: ConnectionState['status'];
    readonly clock: ClockConfidence;
    /** True when writes are being withheld (I9) — the UI should say so. */
    readonly readOnly: boolean;
    readonly message: string | null;
}

export interface SourceView {
    /** Exactly what is in the input field; echoes remote changes. */
    readonly raw: string;
    readonly kind: MediaSourceKind | null;
    readonly valid: boolean;
    readonly empty: boolean;
    readonly resolving: boolean;
    readonly resolveFailed: boolean;
    readonly isExample: boolean;
    /** True while this viewer is seeding, i.e. must not close the tab. */
    readonly seeding: boolean;
}

export interface PlaybackView {
    readonly paused: boolean;
    readonly muted: boolean;
    readonly ready: boolean;
    readonly stalled: boolean;
    readonly positionSeconds: Seconds;
    readonly durationSeconds: Seconds | null;
    /** Debug overlay only. */
    readonly driftSeconds: Seconds;
}

export interface ParticipantView {
    readonly id: string;
    readonly name: string;
    readonly colour: string;
    readonly isSelf: boolean;
}

export interface ParticipantListView {
    readonly self: ParticipantView;
    readonly others: readonly ParticipantView[];
    /** Including self, which is what the UI labels "users online (N)". */
    readonly total: number;
}

/**
 * One rendered feed item. Grouping of consecutive identical notices
 * (legacy `utils.ts:27` `groupConsecutiveElements`) happens HERE — it is
 * presentation. TTL happens in the domain. Legacy interleaved both in one
 * `subscribe`.
 */
export interface FeedItemView {
    readonly id: string;
    readonly authorName: string;
    readonly authorColour: string;
    readonly isSelf: boolean;
    readonly kind: 'chat' | 'notice';
    readonly text: string | null;
    /** i18n key + values for a notice; null for plain chat. */
    readonly notice: { readonly key: string; readonly values: Readonly<Record<string, string | number>> } | null;
    /** How many identical consecutive items this row stands for. */
    readonly repeat: number;
}

export interface FeedView {
    readonly items: readonly FeedItemView[];
    /** Reactions are rendered as floating emoji, not as feed rows. */
    readonly reactions: readonly ReactionView[];
}

export interface ReactionView {
    readonly id: string;
    readonly emoji: string;
    readonly count: number;
}

export interface DeliveryView {
    readonly visible: boolean;
    readonly peers: number;
    readonly downloadLabel: string;
    readonly uploadLabel: string;
    readonly progress: number | null;
    readonly seeding: boolean;
}

export interface InviteView {
    readonly roomId: string;
    readonly url: string;
    readonly canShare: boolean;
}

export interface SelfView {
    readonly name: string;
    readonly colour: string;
    readonly maxNameLength: number;
}
