import type { ClockConfidence } from '../shared/clock-confidence';

/**
 * Liveness of the link to the remote synchronized store.
 *
 * Legacy had no concept of this at all — the UI could not tell it was offline,
 * although `i18n` already carries a `noInternet` string with no code behind it.
 */
export type ConnectionState =
    | { readonly status: 'connecting' }
    | { readonly status: 'online' }
    | { readonly status: 'offline' }
    /** Connected, but writes are unsafe — e.g. clock unsynchronized (I9). */
    | { readonly status: 'degraded'; readonly reason: DegradationReason }
    | { readonly status: 'error'; readonly message: string };

export type DegradationReason = 'clock-unsynced' | 'write-rejected' | 'read-only';

export interface SyncHealth {
    readonly connection: ConnectionState;
    readonly clock: ClockConfidence;
}
