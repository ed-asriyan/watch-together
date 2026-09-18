import type { Seconds } from '../../../domain/shared/time';

/**
 * DRIVING PORT — inbound signals from the local media element.
 *
 * Symmetric to `RemoteRoomListener`: the player adapter is a driven adapter
 * that also drives us. Declared and implemented by the application, called by
 * `VidstackMediaPlayer`.
 *
 * Replaces `bind:paused` / `bind:currentTime`
 * (`src/legacy/components/video-player/index.svelte:100`), which made the
 * element and the Firebase-backed store two masters of one value.
 *
 * The adapter reports events verbatim. It never decides what is an echo — that
 * is the domain's job (`domain/room/echo.ts`).
 */
export interface MediaPlayerListener {
    onReady(duration: Seconds): void;
    onPlayed(at: Seconds): void;
    onPaused(at: Seconds): void;
    onSeeked(to: Seconds): void;
    /** Throttled by the adapter to ~4Hz; the raw event fires far more often. */
    onProgress(position: Seconds): void;
    onStalled(): void;
    onEnded(): void;
    onError(error: PlayerError): void;
}

export interface PlayerError {
    readonly kind: 'unsupported-source' | 'network' | 'decode' | 'aborted' | 'unknown';
    readonly message: string;
    readonly cause?: unknown;
}
