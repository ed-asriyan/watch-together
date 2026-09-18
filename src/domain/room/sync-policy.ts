import type { Millis, Seconds } from '../shared/time';

/**
 * Every timing constant in the system, in one injectable object.
 *
 * Legacy values were scattered across six files as module-level consts, and at
 * least one rule existed twice with two different numbers (presence timeout:
 * 13s in the filter at `bound-users.ts:35`, 10s in the sweeper at `:53`).
 *
 * Tests construct degenerate policies (zero tolerance, infinite tolerance) to
 * pin edge behaviour; production can retune without touching logic.
 */
export interface SyncPolicy {
    // ---- playback reconciliation ------------------------------------------
    /** Drift above this ⇒ hard seek. Legacy: `maximumDelta = 0.5`. */
    readonly hardSeekThreshold: Seconds;
    /** Drift above this ⇒ gentle playbackRate nudge instead of a jump. New. */
    readonly softNudgeThreshold: Seconds;
    /** e.g. 0.05 ⇒ correct by playing at 0.95x / 1.05x. New. */
    readonly nudgeRateDelta: number;
    /** A nudge is always bounded; it never becomes the steady state. New. */
    readonly maxNudgeDuration: Millis;

    // ---- publishing cadence ------------------------------------------------
    /** Restate an unchanged running playhead at most this often. Legacy: 10s. */
    readonly playheadHeartbeat: Seconds;
    /** Running but silent for this long ⇒ force pause. Legacy: 60s. */
    readonly stalePlaybackTimeout: Seconds;

    // ---- presence ----------------------------------------------------------
    /** Legacy: `onlineRefreshInteval = 5`. */
    readonly presenceHeartbeat: Seconds;
    /** Legacy: 13 (filter) / 10 (sweeper). Pick one — see §16 Q4. */
    readonly presenceTimeout: Seconds;

    // ---- ephemeral feed ----------------------------------------------------
    /** Legacy: `messageTimeout = 10`. */
    readonly activityTtl: Seconds;
    /** Legacy: `invalidateInterval = 3`. */
    readonly activitySweepInterval: Seconds;

    // ---- correctness guards ------------------------------------------------
    /** How long after issuing a correction player events count as echoes. New. */
    readonly echoSuppressionWindow: Millis;
    /** Position tolerance when matching a `seeked` echo to its command. New. */
    readonly echoPositionTolerance: Seconds;
    /**
     * Refuse to publish while the clock is unsynchronized. An LWW timestamp
     * from a skewed clock silently wins (or loses) every conflict. New.
     */
    readonly requireClockSync: boolean;

    // ---- watch-time accounting --------------------------------------------
    /** Granularity of watch-time accrual. Legacy: 60s. */
    readonly watchTimeGranularity: Seconds;
}

export declare const DEFAULT_SYNC_POLICY: SyncPolicy;

/** The legacy constants exactly as they are today, for characterization tests. */
export declare const LEGACY_SYNC_POLICY: SyncPolicy;
