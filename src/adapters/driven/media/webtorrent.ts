import type { DeliveryStats } from '../../../domains/watch-session/ports/outbound/media-resolver';

export interface TorrentConfig {
    readonly iceServers: unknown;
    readonly trackers: readonly string[];
    readonly serviceWorkerUrl: string;
}

export interface TorrentDelivery {
    seed(file: File): Promise<string>;
    stream(magnet: string, signal: AbortSignal): Promise<string>;
    stats(): DeliveryStats | null;
    release(): Promise<void>;
}

/**
 * Peer-to-peer delivery, with all of its awkwardness contained.
 *
 * The runtime import from a CDN, the service-worker registration, the polling
 * loops and the untyped client are unchanged from `legacy/stores/web-torrent.ts`
 * — they are genuinely how this library works. What has changed is that they
 * are behind one interface, so replacing or removing WebTorrent touches one
 * file instead of the player, the controls and the source selector.
 */
export class WebTorrentDelivery implements TorrentDelivery {
    private client: any = null;
    private torrent: any = null;
    private seeding = false;
    private registration: ServiceWorkerRegistration | null = null;

    constructor(private readonly config: TorrentConfig) {}

    async seed(file: File): Promise<string> {
        const client = await this.ready();
        await this.dropCurrent();
        this.seeding = true;
        return new Promise((resolve) => {
            const options = this.config.trackers.length
                ? { announceList: this.config.trackers.map((tracker) => [tracker]) }
                : {};
            client.seed([file], options, (torrent: any) => {
                this.torrent = torrent;
                resolve(torrent.magnetURI);
            });
        });
    }

    async stream(magnet: string, signal: AbortSignal): Promise<string> {
        const client = await this.ready();
        if (this.torrent?.magnetURI !== magnet) {
            this.seeding = false;
            await this.dropCurrent();
            this.torrent = await new Promise((resolve) => client.add(magnet, resolve));
        }

        // The file list appears asynchronously once metadata arrives; there is
        // no event for it in this version of the API.
        while (!this.torrent.files?.length) {
            if (signal.aborted) throw new DOMException('aborted', 'AbortError');
            await new Promise((resolve) => setTimeout(resolve, 250));
        }
        return this.torrent.files[0].streamURL;
    }

    stats(): DeliveryStats | null {
        if (!this.torrent) return null;
        return {
            active: true,
            seeding: this.seeding,
            peers: this.torrent.numPeers ?? 0,
            downloadBytesPerSecond: this.client?.downloadSpeed ?? 0,
            uploadBytesPerSecond: this.client?.uploadSpeed ?? 0,
            progress: Number.isFinite(this.torrent.progress) ? this.torrent.progress : null,
            secondsRemaining: Number.isFinite(this.torrent.timeRemaining)
                ? this.torrent.timeRemaining / 1000
                : null,
        };
    }

    async release(): Promise<void> {
        await this.dropCurrent();
        this.seeding = false;
    }

    private async dropCurrent(): Promise<void> {
        const current = this.torrent;
        this.torrent = null;
        if (!current || !this.client) return;
        await new Promise<void>((resolve) => this.client.remove(current.magnetURI, () => resolve()));
    }

    private async ready(): Promise<any> {
        if (this.client) return this.client;

        const [module] = await Promise.all([
            import(/* @vite-ignore */ 'https://esm.sh/webtorrent@2.2.1'),
            this.registerWorker(),
        ]);

        const WebTorrent = (module as { default: any }).default;
        this.client = new WebTorrent({
            tracker: {
                rtcConfig: { iceServers: this.config.iceServers },
                sdpSemantics: 'unified-plan',
                bundlePolicy: 'max-bundle',
                iceCandidatePoolsize: 1,
            },
            // https://github.com/webtorrent/webtorrent/issues/1071
            torrentPort: 12318,
        });
        this.client.createServer({ controller: this.registration });
        return this.client;
    }

    private async registerWorker(): Promise<void> {
        if (!navigator.serviceWorker || this.registration) return;
        const registration = await navigator.serviceWorker.register(this.config.serviceWorkerUrl);
        for (;;) {
            const ready = await navigator.serviceWorker.ready;
            if (ready.active?.state === 'activated') {
                this.registration = registration;
                return;
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
    }
}
