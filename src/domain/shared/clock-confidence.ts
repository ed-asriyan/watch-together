/**
 * How much the local notion of "now" can be trusted.
 *
 * Part of the domain, not just the clock adapter, because LWW correctness is
 * bounded by clock agreement: a client whose clock is an hour fast silently
 * wins every conflict in the room for an hour. Invariant I9 lets the replica
 * refuse to publish rather than corrupt the room.
 */
export type ClockConfidence =
    | 'unsynced'   // local device clock only
    | 'estimated'  // an offset was obtained once, possibly stale
    | 'synced';    // continuously corrected against a shared reference
