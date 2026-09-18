import type { Observable } from '../../../domain/shared/observable';
import type { MediaSourceRef } from '../../../domain/room/media-source';

/**
 * DRIVEN PORT — the public face of the Media Delivery subdomain.
 *
 * Absorbs `src/legacy/normalize-source.ts` (classification),
 * `src/legacy/components/video-player/explore-url.ts` (proxy and extractor
 * probing) and `src/legacy/stores/web-torrent.ts` (P2P seeding and streaming),
 * including the runtime `esm.sh` import, the Service Worker registration, the
 * busy-wait polling loops and the module-level `__client` / `__torrent`
 * singletons. All of it stays behind this one interface.
 *
 * Implemented by `CompositeMediaResolver`, delegating per source kind.
 */
export interface MediaResolverPort {
    /**
     * Classify raw user input into a source reference.
     *
     * Pure and synchronous — no network. This is the "is the URL valid?"
     * answer the input field renders on every keystroke, which is why it must
     * never await anything.
     *
     * @param raw Exactly what the user typed or pasted, untrimmed.
     * @returns The recognized reference, or `null` when nothing matches. Order
     *          matters inside the adapter: a bare http(s) URL is the fallback
     *          and must be tried last.
     */
    classify(raw: string): MediaSourceRef | null;

    /**
     * Turn a reference into something the player can actually load.
     *
     * May probe query parameters for a nested URL, route through the HLS or
     * HTTP proxy, drive the extractor WebSocket, or join the torrent swarm —
     * and may take tens of seconds.
     *
     * @param ref    What the room agreed to watch.
     * @param signal Aborts the attempt when the room's source changes again or
     *               the viewer leaves. Implementations must stop probing and
     *               reject promptly.
     * @returns A playable URL plus how it was obtained. Rejects when no
     *          delivery path works.
     */
    resolve(ref: MediaSourceRef, signal: AbortSignal): Promise<ResolvedMedia>;

    /**
     * Seed a local file peer-to-peer and return the reference to publish.
     *
     * @param file The file chosen by the viewer.
     * @returns A `magnet` reference other participants can resolve. Rejects
     *          when the browser cannot seed — no Service Worker, or the swarm
     *          could not be joined.
     */
    share(file: File): Promise<MediaSourceRef>;

    /**
     * Wrap a local file for this viewer only, without publishing anything.
     * Backs `WatchSessionCommands.playLocalFilePrivately`.
     *
     * @param file The file chosen by the viewer.
     * @returns Playable media backed by an object URL.
     */
    localOnly(file: File): Promise<ResolvedMedia>;

    /**
     * Live delivery telemetry for the UI — peers, speeds, progress, seeding.
     * Legacy exposed the same numbers as five `readable` stores that each
     * polled the torrent client on their own interval.
     *
     * @returns Emits the current stats immediately, then on change.
     */
    stats(): Observable<DeliveryStats>;

    /**
     * Stop seeding, drop the torrent, revoke object URLs. Called on leave and
     * when the source changes. Idempotent.
     */
    release(): Promise<void>;
}

/** A concrete, playable handle on some media. */
export interface ResolvedMedia {
    /** The reference this was resolved from. */
    readonly ref: MediaSourceRef;
    /**
     * What the player is handed. May be a proxied URL, a Service Worker URL
     * for a torrent stream, or a `blob:` URL — the player does not care.
     */
    readonly playbackUrl: string;
    /** How it was obtained. Diagnostics and telemetry only. */
    readonly via: 'direct' | 'proxy' | 'extractor' | 'p2p' | 'blob';
}

export interface DeliveryStats {
    /** False when the current source needs no special delivery. */
    readonly active: boolean;
    /** True when THIS viewer is the source and must not close the tab. */
    readonly seeding: boolean;
    readonly peers: number;
    readonly downloadBytesPerSecond: number;
    readonly uploadBytesPerSecond: number;
    /** 0..1, or `null` when not applicable (e.g. a direct URL). */
    readonly progress: number | null;
    readonly secondsRemaining: number | null;
}
