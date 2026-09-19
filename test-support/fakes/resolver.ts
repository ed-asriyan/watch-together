import type {
    DeliveryStats, MediaResolverPort, ResolvedMedia,
} from '../../src/domains/watch-session/ports/outbound/media-resolver';
import type { MediaSourceRef } from '../../src/domains/watch-session/model/media-source';
import type { Observable, Unsubscribe } from '../../src/domains/watch-session/model/shared/observable';
import { classify } from '../../src/adapters/driven/media/classify';

const IDLE: DeliveryStats = {
    active: false, seeding: false, peers: 0,
    downloadBytesPerSecond: 0, uploadBytesPerSecond: 0,
    progress: null, secondsRemaining: null,
};

/**
 * Real classification, instant resolution. A scenario is about two clients
 * agreeing on a playhead, not about probing proxies.
 */
export class FakeResolver implements MediaResolverPort {
    classify(raw: string): MediaSourceRef | null {
        return classify(raw);
    }

    async resolve(ref: MediaSourceRef): Promise<ResolvedMedia> {
        return { ref, playbackUrl: `resolved:${ref.locator}`, via: 'direct' };
    }

    async share(file: File): Promise<MediaSourceRef> {
        return { kind: 'magnet', locator: `magnet:?xt=urn:btih:${file.name}` as MediaSourceRef['locator'] };
    }

    async localOnly(file: File): Promise<ResolvedMedia> {
        const ref: MediaSourceRef = { kind: 'localOnly', locator: file.name as MediaSourceRef['locator'] };
        return { ref, playbackUrl: `blob:${file.name}`, via: 'blob' };
    }

    stats(): Observable<DeliveryStats> {
        return {
            subscribe(run: (value: DeliveryStats) => void): Unsubscribe {
                run(IDLE);
                return () => undefined;
            },
        };
    }

    async release(): Promise<void> {}
}
