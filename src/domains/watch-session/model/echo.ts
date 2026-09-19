import type { EpochMs, Seconds } from './shared/time';
import type { Correction } from './reconcile';
import type { SyncPolicy } from './sync-policy';

/** A raw event from the media element, before the domain interprets it. */
export type PlayerObservation =
    | { readonly type: 'played'; readonly position: Seconds }
    | { readonly type: 'paused'; readonly position: Seconds }
    | { readonly type: 'seeked'; readonly position: Seconds }
    | { readonly type: 'progress'; readonly position: Seconds };

/** A correction we sent to the player and are still expecting the echo of. */
export interface IssuedCorrection {
    readonly correction: Correction;
    readonly issuedAt: EpochMs;
    /** Monotonic, for debugging and for ordering in the decision log. */
    readonly seq: number;
}

/**
 * Did we cause this event ourselves?
 *
 * `player.seekTo(x)` makes the element emit `seeked`, which is indistinguishable
 * from a user seeking. Publishing it would bounce back as a remote intent and
 * trigger another correction — the feedback loop the legacy code damps with
 * `saveCurrentTime` / `firstSeek` / `currentVideoTime` booleans held in a view
 * component, and with the 0.5s tolerance bands.
 *
 * A time window plus a value match is a heuristic; sequence-tagging was
 * rejected because `HTMLMediaElement` provides no causal link between assigning
 * `currentTime` and the resulting event (§5.5). The win is that the heuristic
 * is named, centralized and testable rather than implicit in a view.
 *
 * @param observation The event the player just reported.
 * @param issued      The correction still awaiting its echo, or `null` when
 *                    nothing is outstanding — in which case nothing is an echo.
 * @param now         Synchronized clock reading, compared against
 *                    `issued.issuedAt` to close the suppression window.
 * @param policy      Supplies the window length and the position tolerance
 *                    used to match a `seeked` event to its command (the
 *                    element may land a keyframe away from the request).
 * @returns           True when this event was caused by us and must NOT be
 *                    published (invariant I5).
 */
export declare function isEcho(
    observation: PlayerObservation,
    issued: IssuedCorrection | null,
    now: EpochMs,
    policy: SyncPolicy,
): boolean;

/**
 * Whether an outstanding correction can be forgotten.
 *
 * @param issued The correction being tracked.
 * @param now    Synchronized clock reading.
 * @param policy Supplies the suppression window.
 * @returns      True once the window has closed, whether or not the echo ever
 *               arrived — a correction the element silently ignored must not
 *               suppress real user events forever.
 */
export declare function hasSettled(
    issued: IssuedCorrection,
    now: EpochMs,
    policy: SyncPolicy,
): boolean;
