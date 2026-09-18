import type { Seconds } from '../../../domain/shared/time';
import type { Unsubscribe } from '../../../domain/shared/observable';
import type { ObservedPlayback } from '../../../domain/room/reconcile';
import type { MediaPlayerListener } from '../inbound/media-player-listener';
import type { ResolvedMedia } from './media-resolver';

/**
 * DRIVEN PORT — the local media element.
 *
 * Commands in, events out. No two-way binding. This is the change that removes
 * the largest source of accidental complexity in the current code.
 *
 * Implementations: `VidstackMediaPlayer`, `FakeMediaPlayer` (deterministic sync
 * scenario tests without a browser).
 */
export interface MediaPlayerPort {
    attach(listener: MediaPlayerListener): Unsubscribe;

    load(media: ResolvedMedia): Promise<void>;
    play(): Promise<void>;
    pause(): void;
    seekTo(position: Seconds): void;
    /** Used by soft `nudge` corrections; 1.0 restores normal speed. */
    setRate(rate: number): void;
    setMuted(muted: boolean): void;

    /**
     * Cheap SYNCHRONOUS read. `reconcile()` runs on every tick and needs a
     * snapshot, not a subscription.
     */
    observe(): ObservedPlayback;
}
