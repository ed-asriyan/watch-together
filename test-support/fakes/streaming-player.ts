import type { MediaPlayerPort } from '../../src/domains/watch-session/ports/outbound/media-player';
import type { MediaPlayerListener } from '../../src/domains/watch-session/ports/inbound/media-player-listener';
import type { ResolvedMedia } from '../../src/domains/watch-session/ports/outbound/media-resolver';
import type { ObservedPlayback } from '../../src/domains/watch-session/model/reconcile';
import type { Seconds } from '../../src/domains/watch-session/model/shared/time';
import type { Unsubscribe } from '../../src/domains/watch-session/model/shared/observable';
import type { FakeClock } from './clock';

export interface StreamingBehaviour {
    /** After play(), how long before the position starts moving. */
    readonly startupMs: number;
    /** After a seek, how long the element buffers before it plays on. */
    readonly seekCostMs: number;
    /**
     * How often the reported position is refreshed. An `<video>` element
     * reports continuously; an embedded provider reports what its iframe
     * last posted, so the reading is a staircase lagging the real position.
     */
    readonly reportEveryMs: number;
    /** Only rates on this grid are honoured; 1.05 rounds back to 1. */
    readonly rateStep: number;
}

/**
 * A player that behaves like an embedded streaming provider (YouTube, Vimeo)
 * rather than a local file: starting and seeking cost buffering time, and the
 * position it reports is refreshed only now and then.
 *
 * The numbers are a model, not a measurement — the provider's real cadence is
 * undocumented. What matters is the SHAPE: every correction the room issues
 * costs this element time it then has to make up again, which is the
 * condition under which a sync loop chases its own tail.
 *
 * Buffering is reported the way vidstack reports it: `waiting` only after it
 * has lasted 300ms (vidstack debounces it), and only while playing.
 */
export class StreamingPlayer implements MediaPlayerPort {
    private listener: MediaPlayerListener | null = null;
    private position = 0;
    private anchoredAt: number;
    private paused = true;
    private bufferingSince = 0;
    private bufferingUntil = 0;
    private rate = 1;
    private ready = false;
    private discontinuityAt: number;

    /** Every seek this element was asked to make, by the room or by the user. */
    seeks = 0;

    constructor(private readonly clock: FakeClock, private readonly behaviour: StreamingBehaviour) {
        this.anchoredAt = clock.now();
        this.discontinuityAt = clock.now();
    }

    attach(listener: MediaPlayerListener): Unsubscribe {
        this.listener = listener;
        return () => {
            if (this.listener === listener) this.listener = null;
        };
    }

    async load(_media: ResolvedMedia): Promise<void> {
        this.ready = true;
        this.listener?.onReady(600 as Seconds);
    }

    async play(): Promise<void> {
        if (!this.paused) return;
        this.reanchor();
        this.paused = false;
        this.buffer(this.behaviour.startupMs);
        this.listener?.onPlayed(this.observe().position);
    }

    pause(): void {
        if (this.paused) return;
        this.reanchor();
        this.paused = true;
        this.bufferingUntil = 0;
        this.listener?.onPaused(this.observe().position);
    }

    seekTo(position: Seconds): void {
        this.seeks += 1;
        this.position = position;
        this.anchoredAt = this.clock.now();
        this.discontinuityAt = this.clock.now();
        this.buffer(this.behaviour.seekCostMs);
        this.listener?.onSeeked(position);
    }

    setRate(rate: number): void {
        this.reanchor();
        this.rate = Math.round(rate / this.behaviour.rateStep) * this.behaviour.rateStep;
    }

    setMuted(): void {
        // Position is all this models.
    }

    observe(): ObservedPlayback {
        const now = this.clock.now();
        const lastReport = Math.floor(now / this.behaviour.reportEveryMs) * this.behaviour.reportEveryMs;
        const buffering = !this.paused && now < this.bufferingUntil;
        return {
            position: this.positionAt(Math.max(lastReport, this.discontinuityAt)) as Seconds,
            paused: this.paused,
            ready: this.ready,
            stalled: buffering && now - this.bufferingSince >= 300,
        };
    }

    /** The truth, for assertions: where the picture actually is. */
    actualPosition(): number {
        return this.positionAt(this.clock.now());
    }

    userPresses(action: 'play' | 'pause'): void {
        if (action === 'play') void this.play();
        else this.pause();
    }

    userSeeks(position: Seconds): void {
        this.seekTo(position);
    }

    private buffer(ms: number): void {
        this.bufferingSince = this.clock.now();
        this.bufferingUntil = this.clock.now() + ms;
    }

    private positionAt(t: number): number {
        if (this.paused) return this.position;
        const movingFrom = Math.max(this.anchoredAt, this.bufferingUntil);
        return this.position + (Math.max(0, t - movingFrom) / 1000) * this.rate;
    }

    private reanchor(): void {
        this.position = this.positionAt(this.clock.now());
        this.anchoredAt = this.clock.now();
        this.discontinuityAt = this.clock.now();
    }
}
