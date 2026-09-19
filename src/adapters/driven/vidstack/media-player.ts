import type { MediaPlayerElement } from 'vidstack/elements';
import type { MediaPlayerPort } from '../../../domains/watch-session/ports/outbound/media-player';
import type { MediaPlayerListener } from '../../../domains/watch-session/ports/inbound/media-player-listener';
import type { ResolvedMedia } from '../../../domains/watch-session/ports/outbound/media-resolver';
import type { ObservedPlayback } from '../../../domains/watch-session/model/reconcile';
import type { Seconds } from '../../../domains/watch-session/model/shared/time';
import type { Unsubscribe } from '../../../domains/watch-session/model/shared/observable';
import type { PlayerSurface } from '../../driving/svelte/session-context';

const PROGRESS_INTERVAL_MS = 250;

/**
 * Vidstack behind the port: commands in, facts out.
 *
 * No two-way binding. The element and the shared state used to be two masters
 * of one value, with the feedback loop damped by three booleans in a view
 * component; now the element only ever reports what it did, and only the domain
 * decides whether that mattered.
 *
 * It deliberately does NOT filter its own echoes. Echo detection needs to know
 * which correction is outstanding, and only the domain knows that. An adapter
 * that swallowed them would also swallow the user input that follows one.
 */
export class VidstackMediaPlayer implements MediaPlayerPort, PlayerSurface {
    private element: MediaPlayerElement | null = null;
    private listener: MediaPlayerListener | null = null;
    private readonly detachers: Unsubscribe[] = [];
    private lastProgressAt = 0;
    private muted = true;
    private pendingMedia: ResolvedMedia | null = null;
    private state: ObservedPlayback = {
        position: 0 as Seconds, paused: true, ready: false, stalled: false,
    };

    // ---- PlayerSurface: the driving adapter hands the element over ----------

    mount(element: HTMLElement): void {
        this.unmount();
        const player = element as MediaPlayerElement;
        this.element = player;

        const on = <T extends keyof HTMLElementEventMap | string>(type: T, run: () => void) => {
            const handler = () => run();
            player.addEventListener(type as string, handler);
            this.detachers.push(() => player.removeEventListener(type as string, handler));
        };

        on('can-play', () => {
            this.state = { ...this.state, ready: true };
            this.listener?.onReady((Number(player.state.duration) || 0) as Seconds);
        });
        on('play', () => {
            this.sample();
            this.listener?.onPlayed(this.state.position);
        });
        on('pause', () => {
            this.sample();
            this.listener?.onPaused(this.state.position);
        });
        on('seeked', () => {
            this.sample();
            this.listener?.onSeeked(this.state.position);
        });
        on('waiting', () => {
            this.state = { ...this.state, stalled: true };
            this.listener?.onStalled();
        });
        on('playing', () => {
            this.state = { ...this.state, stalled: false };
        });
        on('end', () => this.listener?.onEnded());
        on('error', () => this.listener?.onError({ kind: 'unknown', message: 'playback failed' }));

        // The raw event fires far more often than anything needs; throttling
        // here keeps it from driving the whole reactive tree at 60Hz.
        on('time-update', () => {
            this.sample();
            const now = Date.now();
            if (now - this.lastProgressAt < PROGRESS_INTERVAL_MS) return;
            this.lastProgressAt = now;
            this.listener?.onProgress(this.state.position);
        });

        // Muted to start, exactly as before this refactor. Browsers refuse to
        // start audible playback without a gesture, and the room can tell this
        // client to resume at any moment; vidstack's own control unmutes.
        player.muted = true;
        this.muted = true;

        if (this.pendingMedia) void this.load(this.pendingMedia);
    }

    unmount(): void {
        this.detachers.splice(0).forEach((detach) => detach());
        this.element = null;
        this.state = { position: 0 as Seconds, paused: true, ready: false, stalled: false };
    }

    // ---- MediaPlayerPort ----------------------------------------------------

    attach(listener: MediaPlayerListener): Unsubscribe {
        this.listener = listener;
        return () => {
            if (this.listener === listener) this.listener = null;
        };
    }

    async load(media: ResolvedMedia): Promise<void> {
        this.pendingMedia = media;
        if (!this.element) return;
        this.state = { ...this.state, ready: false, stalled: false };
        // Re-asserted here as well as on mount: the custom element upgrades
        // asynchronously and resets its own properties on the way, so a value
        // set before it was live does not survive.
        this.element.muted = this.muted;
        this.element.src = media.playbackUrl;
    }

    /**
     * Start playback, falling back to muted when the browser refuses.
     *
     * A resume is usually triggered by somebody ELSE pressing play, so this
     * client has no user gesture to spend and autoplay policy rejects it.
     * Failing there would leave one viewer silently paused while the room
     * watches on — a muted picture is better than no picture.
     */
    async play(): Promise<void> {
        const player = this.element;
        if (!player) return;
        try {
            await player.play();
        } catch {
            player.muted = true;
            this.muted = true;
            await player.play();
        }
    }

    pause(): void {
        void this.element?.pause();
    }

    seekTo(position: Seconds): void {
        if (this.element) this.element.currentTime = position;
    }

    setRate(rate: number): void {
        if (this.element) this.element.playbackRate = rate;
    }

    setMuted(muted: boolean): void {
        this.muted = muted;
        if (this.element) this.element.muted = muted;
    }

    observe(): ObservedPlayback {
        this.sample();
        return this.state;
    }

    /** Cheap synchronous read; `reconcile` runs on every tick and every event. */
    private sample(): void {
        const player = this.element;
        if (!player) return;
        this.state = {
            position: (Number(player.currentTime) || 0) as Seconds,
            paused: Boolean(player.paused),
            ready: this.state.ready || Number(player.state?.duration) > 0,
            stalled: this.state.stalled,
        };
    }
}
