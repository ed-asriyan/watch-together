import type { Seconds } from '../../../domain/shared/time';
import type { Unsubscribe } from '../../../domain/shared/observable';
import type { ObservedPlayback } from '../../../domain/room/reconcile';
import type { MediaPlayerListener } from '../inbound/media-player-listener';
import type { ResolvedMedia } from './media-resolver';

/**
 * DRIVEN PORT — the local media element.
 *
 * Commands in, facts out through `MediaPlayerListener`. No two-way binding.
 * This is the change that removes the largest source of accidental complexity
 * in the current code.
 *
 * Note the asymmetry with `WatchSessionCommands`: `play()` here is the
 * application TELLING the element what to do, as the result of a `Correction`.
 * It is not a user intent, and it is not reachable from a component.
 *
 * Implementations: `VidstackMediaPlayer`, `FakeMediaPlayer` (deterministic
 * synchronization scenarios with no browser).
 */
export interface MediaPlayerPort {
    /**
     * Start reporting element events.
     *
     * @param listener Receives every event verbatim; the adapter filters
     *                 nothing and interprets nothing.
     * @returns Detaches the listener. The element itself is unaffected.
     */
    attach(listener: MediaPlayerListener): Unsubscribe;

    /**
     * Point the element at resolved media and begin loading.
     *
     * @param media Output of `MediaResolverPort.resolve` — a concrete playable
     *              URL plus how it was obtained. The port never receives a raw
     *              user string.
     * @returns Resolves when loading has started, not when playback is ready;
     *          readiness arrives as `MediaPlayerListener.onReady`.
     */
    load(media: ResolvedMedia): Promise<void>;

    /**
     * Start playback, applying a `resume` correction.
     *
     * @returns Rejects when the browser refuses — typically autoplay policy
     *          with sound on. The caller retries muted rather than treating it
     *          as a synchronization failure.
     */
    play(): Promise<void>;

    /** Stop playback, applying a `halt` correction. */
    pause(): void;

    /**
     * Jump to a position, applying a `seek` correction.
     *
     * @param position Target position. The element may land up to a keyframe
     *                 away, which is why echo matching uses a tolerance rather
     *                 than equality.
     */
    seekTo(position: Seconds): void;

    /**
     * Change playback speed, applying a `nudge` correction — the gentle way to
     * absorb sub-threshold drift without a visible jump.
     *
     * @param rate Multiplier. `1` restores normal speed and ends the nudge.
     */
    setRate(rate: number): void;

    /**
     * Mute or unmute.
     *
     * @param muted Muting is not synchronized between participants; it exists
     *              so the first `play()` can succeed under autoplay policy.
     */
    setMuted(muted: boolean): void;

    /**
     * Read the element's current state synchronously.
     *
     * `reconcile()` runs on every tick and needs a cheap snapshot, not a
     * subscription. Must not allocate or touch the network.
     *
     * @returns Position, paused, readiness and stall state right now.
     */
    observe(): ObservedPlayback;
}
