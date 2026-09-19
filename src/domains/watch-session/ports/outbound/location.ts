import type { Unsubscribe } from '../../model/shared/observable';
import type { RoomId } from '../../model/ids';

/**
 * DRIVEN PORT — the address bar and the platform's sharing affordances.
 *
 * Replaces the hash handling inlined in `src/legacy/App.svelte`, which also
 * force-prefixed room ids with `test_` outside production and wrote to
 * `localStorage` as a side effect of routing.
 */
export interface LocationPort {
    /**
     * The room currently in the address bar.
     *
     * @returns `null` when the URL carries no room, or one that does not
     *          validate — the caller then restores the last room or creates a
     *          new one.
     */
    currentRoomId(): RoomId | null;

    /**
     * Point the address bar at a room. Does not join it; the resulting change
     * comes back through {@link onRoomChanged}, so navigation has one path
     * whether it started here or in the browser's back button.
     *
     * @param roomId Room to navigate to.
     */
    navigateToRoom(roomId: RoomId): void;

    /**
     * Observe room changes, including the user editing the URL or pressing
     * back.
     *
     * @param run Receives the new room, or `null` when the URL no longer names
     *            a valid one.
     * @returns Stops observing.
     */
    onRoomChanged(run: (roomId: RoomId | null) => void): Unsubscribe;

    /**
     * Build the shareable URL for a room, for the invite card.
     *
     * @param roomId Room to link to.
     * @returns An absolute URL on the current origin.
     */
    roomUrl(roomId: RoomId): string;

    /** Whether the platform offers a native share sheet. */
    canShare(): boolean;

    /**
     * Open the native share sheet.
     *
     * @param payload.title Shown by the sheet.
     * @param payload.url   The room URL.
     * @returns Rejects when the user dismisses the sheet, which is not an
     *          error worth reporting.
     */
    share(payload: { readonly title: string; readonly url: string }): Promise<void>;

    /**
     * Copy text to the clipboard; the fallback when sharing is unavailable.
     *
     * @param text What to copy.
     * @returns Rejects when the platform refuses, e.g. without a user gesture.
     */
    copyToClipboard(text: string): Promise<void>;
}
