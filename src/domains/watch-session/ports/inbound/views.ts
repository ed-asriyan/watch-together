import type { Seconds } from '../../model/shared/time';
import type { MediaSourceKind } from '../../model/media-source';
import type { ClockConfidence } from '../../model/shared/clock-confidence';
import type { ConnectionState } from '../../model/connection';

/**
 * READ MODELS.
 *
 * Three rules, all load-bearing:
 *
 *  1. No domain types and no behaviour — strings, numbers, booleans, arrays and
 *     plain unions only. A component physically cannot reach through a view
 *     model into the model, the way `room.messages.sendMessage(...)` is called
 *     from inside a chat component today.
 *
 *  2. No presentation either. No i18n keys, no formatted byte counts, no
 *     human-readable sentences. The application says *what happened*; the
 *     driving adapter decides how to word it. The first draft of this file
 *     violated that in three places and the Svelte adapter found all three.
 *
 *  3. Position is NOT published at player frequency. The media element renders
 *     its own position; `PlaybackView` carries it at the granularity the UI
 *     actually displays (~4Hz), and `driftSeconds` only for a debug overlay.
 */

/** Why the session is not fully usable. A code, not a sentence. */
export type ConnectionProblemView =
    | 'offline'
    | 'clock-unsynced'
    | 'write-rejected'
    | 'read-only'
    | 'failed';

export interface ConnectionView {
    readonly state: ConnectionState['status'];
    readonly clock: ClockConfidence;
    /** True when writes are being withheld (I9) — the UI must say so. */
    readonly readOnly: boolean;
    /** `null` while healthy. */
    readonly problem: ConnectionProblemView | null;
}

export interface SourceView {
    /**
     * The room's agreed source as text, for the input field.
     *
     * The field must NOT bind to this directly: the user's keystrokes and a
     * remote change are two writers, and echoing every keystroke back through
     * the application moves the caret. The component keeps a local draft and
     * overwrites it only when {@link revision} changes.
     */
    readonly raw: string;
    /** Bumped only when the source changed remotely, never on local typing. */
    readonly revision: number;
    readonly kind: MediaSourceKind | null;
    readonly valid: boolean;
    readonly empty: boolean;
    readonly resolving: boolean;
    readonly resolveFailed: boolean;
    readonly isExample: boolean;
    /** True while this viewer is seeding and must not close the tab. */
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
 * A system notice in the feed, as a view-level union.
 *
 * Deliberately NOT the domain's `Notice` (rule 1) and deliberately NOT an i18n
 * key (rule 2). The component maps `type` to a message and formats `seconds`
 * however the locale wants.
 */
export type FeedNoticeView =
    | { readonly type: 'seeked'; readonly seconds: number }
    | { readonly type: 'played'; readonly seconds: number }
    | { readonly type: 'paused'; readonly seconds: number }
    | { readonly type: 'pickedLocalFile' }
    | { readonly type: 'changedSource'; readonly kind: MediaSourceKind };

export interface FeedItemView {
    readonly id: string;
    /** Names of everyone this row stands for, after grouping. */
    readonly authors: readonly { readonly name: string; readonly colour: string; readonly isSelf: boolean }[];
    /** Chat text, or `null` for a notice. */
    readonly text: string | null;
    /** The notice, or `null` for plain chat. */
    readonly notice: FeedNoticeView | null;
}

export interface FeedView {
    readonly items: readonly FeedItemView[];
    /** Rendered as floating emoji, not as feed rows. */
    readonly reactions: readonly ReactionView[];
}

export interface ReactionView {
    readonly id: string;
    readonly emoji: string;
    /** How many copies to animate. */
    readonly count: number;
}

export interface DeliveryView {
    /** False when the current source needs no special delivery. */
    readonly visible: boolean;
    readonly peers: number;
    /** Raw bytes per second. Formatting is the component's job (rule 2). */
    readonly downloadBytesPerSecond: number;
    readonly uploadBytesPerSecond: number;
    /** 0..1, or `null` when not applicable. */
    readonly progress: number | null;
    readonly seeding: boolean;
}

export interface InviteView {
    readonly roomId: string;
    readonly url: string;
    readonly canShare: boolean;
}
