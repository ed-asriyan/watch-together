import type { Millis, Seconds } from './shared/time';

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

/**
 * Production defaults. These are DATA, not logic — written out rather than
 * stubbed, because the tests need concrete numbers to assert against and
 * because every value here is a decision worth reading in one place.
 */
export const DEFAULT_SYNC_POLICY: SyncPolicy = {
    hardSeekThreshold: 1 as Seconds,
    softNudgeThreshold: 0.25 as Seconds,
    nudgeRateDelta: 0.05,
    maxNudgeDuration: 4_000 as Millis,

    playheadHeartbeat: 10 as Seconds,
    stalePlaybackTimeout: 60 as Seconds,

    presenceHeartbeat: 5 as Seconds,
    presenceTimeout: 30 as Seconds,

    activityTtl: 10 as Seconds,
    activitySweepInterval: 3 as Seconds,

    echoSuppressionWindow: 1_500 as Millis,
    echoPositionTolerance: 0.75 as Seconds,
    requireClockSync: true,

    watchTimeGranularity: 60 as Seconds,
};

/**
 * The legacy constants exactly as they are today, for characterization tests
 * (migration step 2). Where legacy held one rule twice with two numbers, the
 * stricter one is used and the discrepancy is noted.
 */
export const LEGACY_SYNC_POLICY: SyncPolicy = {
    ...DEFAULT_SYNC_POLICY,
    hardSeekThreshold: 0.5 as Seconds,   // maximumDelta
    softNudgeThreshold: 0.5 as Seconds,  // legacy had no soft correction
    nudgeRateDelta: 0,
    playheadHeartbeat: 10 as Seconds,    // syncInterval
    stalePlaybackTimeout: 60 as Seconds, // CURRENT_TIME_SYNC_INTERVAL
    presenceHeartbeat: 5 as Seconds,     // onlineRefreshInteval
    presenceTimeout: 13 as Seconds,      // onlineTimeout — sweeper used 10
    activityTtl: 10 as Seconds,          // messageTimeout
    activitySweepInterval: 3 as Seconds, // invalidateInterval
    requireClockSync: false,             // legacy published regardless
};
