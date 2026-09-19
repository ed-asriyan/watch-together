import type {
    DeliveryStats, MediaResolverPort, ResolvedMedia,
} from '../../../domains/watch-session/ports/outbound/media-resolver';
import type { MediaSourceRef } from '../../../domains/watch-session/model/media-source';
import type { Observable, Unsubscribe } from '../../../domains/watch-session/model/shared/observable';
import { classify } from './classify';
import type { TorrentDelivery } from './webtorrent';

export interface ProxyConfig {
    readonly hlsProxyUrl: string | null;
    readonly httpProxyUrl: string | null;
    readonly videoExtractorUrl: string | null;
}

const IDLE: DeliveryStats = {
    active: false, seeding: false, peers: 0,
    downloadBytesPerSecond: 0, uploadBytesPerSecond: 0,
    progress: null, secondsRemaining: null,
};

const PLAYABLE = ['mpeg', 'mp4', 'mp3', 'video', '3gp', 'm3u8', 'mpegurl'];

/**
 * Everything the room does not need to know about getting bytes.
 *
 * Absorbs `legacy/normalize-source.ts`, `legacy/components/video-player/explore-url.ts`
 * and `legacy/stores/web-torrent.ts`, including the runtime CDN import, the
 * service-worker registration and the module-level singletons. The core sees a
 * `MediaSourceRef` going in and a playable URL coming out.
 */
export class CompositeMediaResolver implements MediaResolverPort {
    private objectUrl: string | null = null;

    constructor(
        private readonly proxies: ProxyConfig,
        private readonly torrents: TorrentDelivery,
    ) {}

    classify(raw: string): MediaSourceRef | null {
        return classify(raw);
    }

    async resolve(ref: MediaSourceRef, signal: AbortSignal): Promise<ResolvedMedia> {
        const stop = () => {
            if (signal.aborted) throw new DOMException('aborted', 'AbortError');
        };
        stop();

        switch (ref.kind) {
            case 'youtube':
            case 'vimeo':
                // Vidstack resolves provider ids itself.
                return { ref, playbackUrl: ref.locator, via: 'direct' };
            case 'magnet': {
                const url = await this.torrents.stream(ref.locator, signal);
                stop();
                return { ref, playbackUrl: url, via: 'p2p' };
            }
            case 'localOnly':
                return { ref, playbackUrl: ref.locator, via: 'blob' };
            default:
                return this.resolveHttp(ref, signal, stop);
        }
    }

    /**
     * The legacy probe chain, in the order it was written: as-is, then any URL
     * hidden in a query parameter, then the proxy, then the extractor. The
     * first candidate that actually serves media wins.
     */
    private async resolveHttp(
        ref: MediaSourceRef,
        signal: AbortSignal,
        stop: () => void,
    ): Promise<ResolvedMedia> {
        for await (const candidate of this.candidates(ref)) {
            stop();
            if (candidate.via !== 'direct' || await this.playable(candidate.playbackUrl, signal)) {
                return candidate;
            }
        }
        throw new Error(`no delivery path works for ${ref.kind}`);
    }

    private async *candidates(ref: MediaSourceRef): AsyncGenerator<ResolvedMedia> {
        yield { ref, playbackUrl: ref.locator, via: 'direct' };

        const url = (() => {
            try {
                return new URL(ref.locator);
            } catch {
                return null;
            }
        })();

        if (url) {
            for (const [, value] of url.searchParams) {
                try {
                    new URL(value);
                } catch {
                    continue;
                }
                yield { ref, playbackUrl: value, via: 'direct' };
            }
        }

        const proxied = this.throughProxy(ref);
        if (proxied) yield proxied;

        yield* this.throughExtractor(ref);
    }

    private throughProxy(ref: MediaSourceRef): ResolvedMedia | null {
        const isHls = ref.kind === 'hls' || ref.locator.toLowerCase().includes('.m3u8');
        if (isHls && this.proxies.hlsProxyUrl) {
            return {
                ref,
                playbackUrl: `${this.proxies.hlsProxyUrl}/${btoa(ref.locator)}.m3u8`,
                via: 'proxy',
            };
        }
        if (!isHls && this.proxies.httpProxyUrl) {
            return {
                ref,
                playbackUrl: `${this.proxies.httpProxyUrl}?url=${encodeURIComponent(ref.locator)}`,
                via: 'proxy',
            };
        }
        return null;
    }

    private async *throughExtractor(ref: MediaSourceRef): AsyncGenerator<ResolvedMedia> {
        const endpoint = this.proxies.videoExtractorUrl;
        if (!endpoint) return;

        const found: string[] = await new Promise((resolve) => {
            const urls: string[] = [];
            let socket: WebSocket;
            try {
                socket = new WebSocket(endpoint);
            } catch {
                resolve([]);
                return;
            }
            socket.onopen = () => socket.send(ref.locator);
            socket.onmessage = (event) => {
                try {
                    urls.push(JSON.parse(String(event.data)).url);
                } catch {
                    // The extractor sends one JSON object per candidate;
                    // anything else is noise.
                }
            };
            socket.onerror = () => resolve(urls);
            socket.onclose = () => resolve(urls);
        });

        for (const url of found) {
            yield { ref, playbackUrl: url, via: 'extractor' };
        }
    }

    private async playable(url: string, signal: AbortSignal): Promise<boolean> {
        try {
            const response = await fetch(url, { mode: 'cors', method: 'HEAD', signal });
            const type = response.headers.get('Content-Type') ?? '';
            return response.ok && PLAYABLE.some((fragment) => type.includes(fragment));
        } catch {
            return false;
        }
    }

    async share(file: File): Promise<MediaSourceRef> {
        const magnet = await this.torrents.seed(file);
        return { kind: 'magnet', locator: magnet as MediaSourceRef['locator'] };
    }

    async localOnly(file: File): Promise<ResolvedMedia> {
        if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
        this.objectUrl = URL.createObjectURL(file);
        return {
            ref: { kind: 'localOnly', locator: this.objectUrl as MediaSourceRef['locator'] },
            playbackUrl: this.objectUrl,
            via: 'blob',
        };
    }

    stats(): Observable<DeliveryStats> {
        return {
            subscribe: (run: (value: DeliveryStats) => void): Unsubscribe => {
                run(this.torrents.stats() ?? IDLE);
                const id = setInterval(() => run(this.torrents.stats() ?? IDLE), 1_000);
                return () => clearInterval(id);
            },
        };
    }

    async release(): Promise<void> {
        if (this.objectUrl) {
            URL.revokeObjectURL(this.objectUrl);
            this.objectUrl = null;
        }
        await this.torrents.release();
    }
}
