import type { EpochMs } from '../shared/time';
import type { ParticipantId } from './ids';
import type { Presence } from './participant';
import type { SyncPolicy } from './sync-policy';

/**
 * ONE rule for "is this participant here?", evaluated against the CURRENT
 * `now` every time.
 *
 * The legacy filter captured `const timeNow = now()` outside its subscription
 * callback (`bound-users.ts:32`), freezing the cut-off at subscription time so
 * a disconnected participant could stay "online" indefinitely.
 */
export declare function isOnline(presence: Presence, now: EpochMs, policy: SyncPolicy): boolean;

export declare function onlineOnly(
    all: readonly Presence[],
    now: EpochMs,
    policy: SyncPolicy,
): readonly Presence[];

/** Ids safe to drop from the remote store. Same rule, not a second copy of it. */
export declare function staleIds(
    all: readonly Presence[],
    now: EpochMs,
    policy: SyncPolicy,
): readonly ParticipantId[];

/** Whether it is time to restate our own presence. */
export declare function heartbeatDue(
    lastPublished: EpochMs | null,
    now: EpochMs,
    policy: SyncPolicy,
): boolean;
