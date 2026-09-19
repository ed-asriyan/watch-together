import { notImplemented } from './shared/not-implemented';
import type { EpochMs } from './shared/time';
import type { Activity } from './activity';
import type { ActivityId } from './ids';
import type { SyncPolicy } from './sync-policy';

/**
 * Feed retention. Expiry is COMPUTED from `at` and never stored, so two
 * replicas cannot disagree about what is still visible.
 *
 * Legacy pruning rewrote the entire `messages` map back to the shared node
 * (`bound-messages.ts:74`) — a read-modify-write over shared state, and a
 * lost-update race whenever two clients swept at the same moment.
 */
export function isExpired(activity: Activity, now: EpochMs, policy: SyncPolicy): boolean {
    return notImplemented('isExpired');
}

export function liveOnly(
    all: readonly Activity[],
    now: EpochMs,
    policy: SyncPolicy,
): readonly Activity[] {
    return notImplemented('liveOnly');
}

/** Ids to retract from the remote store. */
export function expiredIds(
    all: readonly Activity[],
    now: EpochMs,
    policy: SyncPolicy,
): readonly ActivityId[] {
    return notImplemented('expiredIds');
}

export function sweepDue(
    lastSweep: EpochMs | null,
    now: EpochMs,
    policy: SyncPolicy,
): boolean {
    return notImplemented('sweepDue');
}
