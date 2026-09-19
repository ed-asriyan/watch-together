import type { Seconds } from '../../model/shared/time';

/**
 * DRIVING PORT — facts reported by the local media element.
 *
 * Declared and implemented by the application; CALLED by the player adapter
 * (`VidstackMediaPlayer`). Since the app renders no transport controls of its
 * own, this is where *all* local playback intent enters the system: a user
 * pressing the player's own play button arrives here, not through
 * `WatchSessionCommands`.
 *
 * Everything here is past tense and unconditional. The adapter reports what the
 * element did and never decides whether it mattered:
 *
 *  - it does not know whether an event was caused by the user, by the
 *    application's own `MediaPlayerPort.seekTo()`, or by the browser
 *    (autoplay blocked, buffering);
 *  - echo detection is the domain's job (`model/echo.ts`), because only
 *    the domain knows which correction is outstanding.
 *
 * Replaces `bind:paused` / `bind:currentTime`
 * (`src/legacy/components/video-player/index.svelte:100`), which made the
 * element and the Firebase-backed store two masters of one value, and the
 * three booleans in view scope that damped the resulting loop.
 */
export interface MediaPlayerListener {
    /**
     * Metadata has loaded; seeking and reliable position reads are possible.
     * No correction is issued before this fires (`ObservedPlayback.ready`).
     *
     * @param duration Total media length. `Infinity` for a live stream.
     */
    onReady(duration: Seconds): void;

    /**
     * The element started (or resumed) playing.
     *
     * @param at Position at the moment playback started. Used as the new
     *           `Playhead.position` when this turns out not to be an echo.
     */
    onPlayed(at: Seconds): void;

    /**
     * The element stopped playing. Fires for user pauses, for the application's
     * own `pause()`, and when the browser blocks autoplay.
     *
     * @param at Position at the moment playback stopped. Published together
     *           with `paused: true` as one atomic intent (invariant I2).
     */
    onPaused(at: Seconds): void;

    /**
     * A seek completed. Fires both for user scrubbing and for the
     * application's own `seekTo()` — `isEcho` tells them apart.
     *
     * @param to Position the element landed on, which may differ from the
     *           requested one by up to a keyframe interval.
     */
    onSeeked(to: Seconds): void;

    /**
     * Ordinary playback progress, used to measure drift against the projected
     * position. Carries no intent and is never published on its own.
     *
     * @param position Current position. The adapter throttles this to roughly
     *                 4Hz; the underlying `timeupdate` event fires far more
     *                 often and drove reactive statements in the legacy UI.
     */
    onProgress(position: Seconds): void;

    /**
     * Playback is waiting on data. Drift readings are meaningless while
     * stalled, so the domain suppresses corrections until it clears.
     */
    onStalled(): void;

    /** Playback reached the end of the media. */
    onEnded(): void;

    /**
     * The element failed. The application surfaces this and, for a resolved
     * source, may retry resolution through a different delivery path.
     *
     * @param error What went wrong, classified by the adapter.
     */
    onError(error: PlayerError): void;
}

export interface PlayerError {
    readonly kind: 'unsupported-source' | 'network' | 'decode' | 'aborted' | 'unknown';
    /** Human-readable, for the error overlay and for Sentry. */
    readonly message: string;
    /** The original exception or media error, for the error reporter. */
    readonly cause?: unknown;
}
