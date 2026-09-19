import type { Stamped } from './shared/stamped';
import type { ActivityId } from './ids';
import type { MediaSourceRef } from './media-source';
import type { PlayheadIntent } from './playhead';
import type { Presence } from './participant';
import type { Activity } from './activity';
import type { Correction } from './reconcile';
import type { DomainEvent } from './events';

/** A write the application should perform against the remote store. */
export type PublishIntent =
    | { readonly kind: 'playhead'; readonly intent: PlayheadIntent }
    | { readonly kind: 'source'; readonly source: Stamped<MediaSourceRef | null> }
    | { readonly kind: 'presence'; readonly presence: Presence }
    | { readonly kind: 'activity'; readonly activity: Activity }
    | { readonly kind: 'retract'; readonly ids: readonly ActivityId[] }
    | { readonly kind: 'watchTime'; readonly deltaMinutes: number };

/**
 * Everything the aggregate wants to happen, expressed as data.
 *
 * The aggregate performs no I/O and awaits nothing: it returns a Decision and
 * the application executes it. This is what makes the whole sync core a pure
 * state machine — a test is a sequence of calls with hand-picked timestamps and
 * assertions on the returned Decision.
 *
 * It is an unusual shape for frontend code and needs a paragraph in
 * CONTRIBUTING.md. See §15.
 */
export interface Decision {
    /** What happened. Fanned out to projections and read models. */
    readonly events: readonly DomainEvent[];
    /** What to write remotely, in order. */
    readonly publish: readonly PublishIntent[];
    /** What to tell the local player. At most one per decision (I4). */
    readonly correct: Correction;
}

export declare const NO_DECISION: Decision;
