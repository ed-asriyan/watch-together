import type { LocationPort } from '../../../domains/watch-session/ports/outbound/location';
import type { RoomId } from '../../../domains/watch-session/model/ids';
import { roomId as parseRoomId } from '../../../domains/watch-session/model/ids';
import type { Unsubscribe } from '../../../domains/watch-session/model/shared/observable';

/**
 * The room lives in the URL hash, as it always has.
 *
 * Legacy did this inline in `App.svelte` and, while routing, also wrote to
 * `localStorage` and force-prefixed ids with `test_` outside production. Both
 * are gone: remembering the last room is the profile store's job, and the
 * environment does not get to rewrite the room someone was invited to.
 */
export class HashLocation implements LocationPort {
    currentRoomId(): RoomId | null {
        return parseRoomId(decodeURIComponent(location.hash.slice(1)));
    }

    navigateToRoom(id: RoomId): void {
        if (this.currentRoomId() === id) return;
        location.hash = `#${id}`;
    }

    onRoomChanged(run: (id: RoomId | null) => void): Unsubscribe {
        const handler = () => run(this.currentRoomId());
        window.addEventListener('hashchange', handler);
        return () => window.removeEventListener('hashchange', handler);
    }

    roomUrl(id: RoomId): string {
        return `${location.protocol}//${location.host}${location.pathname}#${id}`;
    }

    canShare(): boolean {
        return typeof navigator.share === 'function';
    }

    async share(payload: { readonly title: string; readonly url: string }): Promise<void> {
        await navigator.share({ title: payload.title, url: payload.url });
    }

    async copyToClipboard(text: string): Promise<void> {
        await navigator.clipboard.writeText(text);
    }
}
