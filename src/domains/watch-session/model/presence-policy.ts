import { notImplemented } from './shared/not-implemented';
import type { EpochMs } from './shared/time';
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
export function isOnline(presence: Presence, now: EpochMs, policy: SyncPolicy): boolean {
    return presence.lastSeen + policy.presenceTimeout * 1000 > now;
}

export function onlineOnly(
    all: readonly Presence[],
    now: EpochMs,
    policy: SyncPolicy,
): readonly Presence[] {
    return all.filter((presence) => isOnline(presence, now, policy));
}

/** Ids safe to drop from the remote store. Same rule, not a second copy of it. */
export function staleIds(
    all: readonly Presence[],
    now: EpochMs,
    policy: SyncPolicy,
): readonly ParticipantId[] {
    return all
        .filter((presence) => !isOnline(presence, now, policy))
        .map((presence) => presence.participantId);
}

/** Whether it is time to restate our own presence. */
export function heartbeatDue(
    lastPublished: EpochMs | null,
    now: EpochMs,
    policy: SyncPolicy,
): boolean {
    if (lastPublished === null) return true;
    return now - lastPublished >= policy.presenceHeartbeat * 1000;
}
