import type { EpochMs, Seconds } from '../shared/time';
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
 */
export declare function reconcile(
    observed: ObservedPlayback,
    intent: PlayheadIntent,
    now: EpochMs,
    policy: SyncPolicy,
): Correction;

/** Signed: positive = the player is ahead of where it should be. */
export declare function driftOf(
    observed: ObservedPlayback,
    intent: PlayheadIntent,
    now: EpochMs,
): Seconds;
