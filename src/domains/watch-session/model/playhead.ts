import type { EpochMs, Seconds } from './shared/time';
import type { Stamped } from './shared/stamped';

/**
 * The complete playback intent, as ONE atomic value.
 *
 * The legacy model kept `paused` and `currentTime` as two independent LWW
 * registers on two RTDB nodes with two `updatedAt` stamps, so a peer could
 * apply a fresh `paused` against a stale position (or vice versa). Folding them
 * into one value makes that class of glitch unrepresentable.
 */
export interface Playhead {
    readonly position: Seconds;
    readonly paused: boolean;
    /** 1.0 today. The extension point for shared slow-motion / 1.5x. */
    readonly rate: number;
}

/** A Playhead as declared by someone, at some instant. The shared truth. */
export type PlayheadIntent = Stamped<Playhead>;

/**
 * Where the playhead SHOULD be at `now`, given the declared intent.
 *
 * This is the centre of the design: shared playback state is not a number, it
 * is a linear function of time. Drift, reconciliation, the stale-playback
 * guard and the publish cadence are all consequences of this one function.
 *
 * See docs/architecture/001-ddd-hexagonal-design.md §5.2.
 *
 * @param intent The agreed playback intent, carrying the position, the paused
 *               flag, the rate, and the instant it was declared.
 * @param now    Synchronized clock reading to project forward to.
 * @returns      The position a perfectly synchronized player would be at.
 *               Equal to `intent.value.position` while paused.
 */
export declare function projectedPositionAt(intent: PlayheadIntent, now: EpochMs): Seconds;

/**
 * How long the intent has gone without being restated. Feeds the
 * stale-playback guard: running but silent for too long means the participant
 * who started it is gone, so playback is forced to pause.
 *
 * @param intent The agreed intent.
 * @param now    Synchronized clock reading.
 */
export declare function silentFor(intent: PlayheadIntent, now: EpochMs): Seconds;

export declare function isAdvancing(intent: PlayheadIntent): boolean;
