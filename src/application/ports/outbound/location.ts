import type { Unsubscribe } from '../../../domain/shared/observable';
import type { RoomId } from '../../../domain/room/ids';

/**
 * DRIVEN PORT — the address bar.
 *
 * Replaces the hash handling inlined in `src/legacy/App.svelte`, which also
 * force-prefixed room ids with `test_` outside production and wrote to
 * `localStorage` as a side effect of routing.
 */
export interface LocationPort {
    currentRoomId(): RoomId | null;
    navigateToRoom(roomId: RoomId): void;
    onRoomChanged(run: (roomId: RoomId | null) => void): Unsubscribe;

    /** For the invite card. */
    roomUrl(roomId: RoomId): string;
    /** `navigator.share` availability. */
    canShare(): boolean;
    share(payload: { readonly title: string; readonly url: string }): Promise<void>;
    copyToClipboard(text: string): Promise<void>;
}
