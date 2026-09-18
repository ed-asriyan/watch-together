import type { Observable } from '../../../domain/shared/observable';
import type { MediaSourceRef } from '../../../domain/room/media-source';

/**
 * DRIVEN PORT — the public face of the Media Delivery subdomain.
 *
 * Absorbs `src/legacy/normalize-source.ts` (classification),
 * `src/legacy/components/video-player/explore-url.ts` (proxy / extractor
 * probing) and `src/legacy/stores/web-torrent.ts` (P2P seeding and streaming),
 * including the runtime `esm.sh` import, the service-worker registration, the
 * busy-wait polling loops and the module-level `__client` / `__torrent`
 * singletons. All of it stays inside one adapter.
 *
 * Implemented by `CompositeMediaResolver` delegating to per-kind resolvers.
 */
export interface MediaResolverPort {
    /**
     * Classify raw user input. Pure, synchronous, no network — this is the
     * "is the URL valid?" answer the input field renders on every keystroke.
     */
    classify(raw: string): MediaSourceRef | null;

    /**
     * Turn a ref into something playable. May hit proxies, an extractor
     * WebSocket, or the torrent swarm, and may take a long time.
     */
    resolve(ref: MediaSourceRef, signal: AbortSignal): Promise<ResolvedMedia>;

    /** Seed a local file and return the ref to publish to the room. */
    share(file: File): Promise<MediaSourceRef>;

    /** Wrap a local file for this viewer only, without sharing it. */
    localOnly(file: File): Promise<ResolvedMedia>;

    /** Live delivery telemetry. Legacy: the `readable` polling stores. */
    stats(): Observable<DeliveryStats>;

    /** Stop seeding / drop the torrent. Called on leave. */
    release(): Promise<void>;
}

export interface ResolvedMedia {
    readonly ref: MediaSourceRef;
    /** What the player is actually given. May be a blob:, proxy or SW URL. */
    readonly playbackUrl: string;
    readonly via: 'direct' | 'proxy' | 'extractor' | 'p2p' | 'blob';
}

export interface DeliveryStats {
    readonly active: boolean;
    readonly seeding: boolean;
    readonly peers: number;
    readonly downloadBytesPerSecond: number;
    readonly uploadBytesPerSecond: number;
    /** 0..1, or null when not applicable. */
    readonly progress: number | null;
    readonly secondsRemaining: number | null;
}
