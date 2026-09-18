import type { EpochMs } from '../../../domain/shared/time';

/**
 * DRIVING PORT — the scheduler as a driving adapter.
 *
 * One tick drives presence heartbeats, the feed TTL sweep, the stale-playback
 * guard, watch-time accrual and the drift check. Legacy ran five independent
 * `setInterval`s buried in five constructors (`stores/room/index.ts:60`,
 * `bound-users.ts:67,71`, `bound-messages.ts:82`,
 * `bound-minutes-watched.ts:26`), each with its own period and each stoppable
 * only through the `Destructable` chain.
 */
export interface SessionTicks {
    onTick(now: EpochMs): void;
}
