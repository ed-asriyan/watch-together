import type { EpochMs, Seconds } from './shared/time';
import type { PlayheadIntent } from './playhead';
import type { SyncPolicy } from './sync-policy';

/** A cheap synchronous read of the actual media element. */
export interface ObservedPlayback {
    readonly position: Seconds;
    readonly paused: boolean;
    /** Metadata loaded and seeking is possible. No correction before this. */
    readonly ready: boolean;
    /** Currently buffering; drift readings are meaningless while true. */
    readonly stalled: boolean;
}

/** What the domain tells the player to do. Data, not a call. */
export type Correction =
    | { readonly kind: 'none' }
    | { readonly kind: 'seek'; readonly to: Seconds }
    | { readonly kind: 'nudge'; readonly rate: number; readonly until: EpochMs }
    | { readonly kind: 'resume'; readonly from: Seconds }
    | { readonly kind: 'halt'; readonly at: Seconds };

/**
 * The whole synchronization decision, as one pure function.
 *
 * `halt` and `resume` carry the projected position, so "pause" and "where we
 * paused" can never arrive out of order — they are one value.
 *
 * Replaces `shouldUpdateCurrentTime` (`bound-current-time.ts:9`) plus the
 * tolerance band in `bound-timed-store.ts:21` plus the ad-hoc guards in
 * `video-player/index.svelte:64-66`.
 *
 * @param observed What the local media element is actually doing right now.
 * @param intent   The room's agreed playback intent, after LWW merge.
 * @param now      Synchronized clock reading. The intent is projected forward
 *                 to this instant before drift is measured — passing a stale
 *                 `now` produces a correction toward the past.
 * @param policy   Thresholds deciding seek vs nudge vs nothing.
 * @returns        What to do about the divergence, as data. `none` is the
 *                 common case and must stay cheap.
 */
export declare function reconcile(
    observed: ObservedPlayback,
    intent: PlayheadIntent,
    now: EpochMs,
    policy: SyncPolicy,
): Correction;

/**
 * Measured divergence, for the debug overlay and the `DriftCorrected` event.
 *
 * @param observed Actual element state.
 * @param intent   Agreed intent.
 * @param now      Synchronized clock reading.
 * @returns        Signed: positive means the player is AHEAD of where it
 *                 should be, negative means it is lagging.
 */
export declare function driftOf(
    observed: ObservedPlayback,
    intent: PlayheadIntent,
    now: EpochMs,
): Seconds;
