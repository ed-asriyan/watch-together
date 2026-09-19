import type { MediaPlayerPort } from '../../src/domains/watch-session/ports/outbound/media-player';
import type { MediaPlayerListener } from '../../src/domains/watch-session/ports/inbound/media-player-listener';
import type { ResolvedMedia } from '../../src/domains/watch-session/ports/outbound/media-resolver';
import type { ObservedPlayback } from '../../src/domains/watch-session/model/reconcile';
import type { Seconds } from '../../src/domains/watch-session/model/shared/time';
import type { Unsubscribe } from '../../src/domains/watch-session/model/shared/observable';
import type { FakeClock } from './clock';

/**
 * A media element that actually plays.
 *
 * Its position advances with the fake clock, so a scenario can let thirty
 * virtual seconds pass and ask where two clients ended up. Like the real
 * adapter it reports every event verbatim, including the ones caused by
 * corrections — deciding what is an echo is the domain's job.
 */
export class FakePlayer implements MediaPlayerPort {
    private listener: MediaPlayerListener | null = null;
    private anchor: Seconds = 0 as Seconds;
    private anchoredAt: number;
    private paused = true;
    private rate = 1;
    private loaded: ResolvedMedia | null = null;

    constructor(private readonly clock: FakeClock, private ready = false) {
        this.anchoredAt = clock.now();
    }

    attach(listener: MediaPlayerListener): Unsubscribe {
        this.listener = listener;
        return () => {
            if (this.listener === listener) this.listener = null;
        };
    }

    async load(media: ResolvedMedia): Promise<void> {
        this.loaded = media;
        this.reanchor();
        this.ready = true;
        this.listener?.onReady(600 as Seconds);
    }

    async play(): Promise<void> {
        this.reanchor();
        this.paused = false;
        this.listener?.onPlayed(this.observe().position);
    }

    pause(): void {
        this.reanchor();
        this.paused = true;
        this.listener?.onPaused(this.observe().position);
    }

    seekTo(position: Seconds): void {
        this.anchor = position;
        this.anchoredAt = this.clock.now();
        this.listener?.onSeeked(position);
    }

    setRate(rate: number): void {
        this.reanchor();
        this.rate = rate;
    }

    setMuted(): void {
        // Muting changes nothing about position, which is all this models.
    }

    observe(): ObservedPlayback {
        const elapsed = this.paused ? 0 : ((this.clock.now() - this.anchoredAt) / 1000) * this.rate;
        return {
            position: (this.anchor + elapsed) as Seconds,
            paused: this.paused,
            ready: this.ready,
            stalled: false,
        };
    }

    /** What the user does: a scrub on the player's own controls. */
    userSeeks(position: Seconds): void {
        this.seekTo(position);
    }

    userPresses(action: 'play' | 'pause'): void {
        if (action === 'play') void this.play();
        else this.pause();
    }

    get source(): ResolvedMedia | null {
        return this.loaded;
    }

    private reanchor(): void {
        const { position } = this.observe();
        this.anchor = position;
        this.anchoredAt = this.clock.now();
    }
}
