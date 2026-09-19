import { getContext, setContext } from 'svelte';
import type { WatchSessionCommands } from '../../../domains/watch-session/ports/inbound/watch-session-commands';
import type { WatchSessionView } from '../../../domains/watch-session/ports/inbound/watch-session-view';

/**
 * Handover of the actual DOM element to whoever implements `MediaPlayerPort`.
 *
 * `MediaPlayerPort` is deliberately DOM-free — it speaks `play`, `pause`,
 * `seekTo`, `observe`. But the element is created by Svelte, not by the
 * adapter, so something has to carry it across. This is that something: the
 * composition root builds it around the concrete player adapter, and the one
 * component that renders `<media-player>` calls `mount` on it.
 *
 * It lives here rather than in the ports because it is a driving-side concern:
 * the UI *gives* the element away, it does not consume a port.
 */
export interface PlayerSurface {
    mount(element: HTMLElement): void;
    unmount(): void;
}

/** Everything a component is allowed to touch. Nothing else is in context. */
export interface Session {
    readonly commands: WatchSessionCommands;
    readonly view: WatchSessionView;
    readonly player: PlayerSurface;
}

/** Exported so a component spec can mount a subtree with a session in scope. */
export const SESSION_KEY = Symbol('watch-session');

export const provideSession = (session: Session): void => {
    setContext(SESSION_KEY, session);
};

export const useSession = (): Session => getContext<Session>(SESSION_KEY);
