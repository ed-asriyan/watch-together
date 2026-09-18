import type { Seconds } from '../../../domain/shared/time';
import type { RoomId } from '../../../domain/room/ids';
import type { MediaSourceRef } from '../../../domain/room/media-source';

/**
 * DRIVING PORT — every control on the site, as named intentions.
 *
 * Implemented by the application (`WatchSession`), called by driving adapters
 * (Svelte components, keyboard handlers, the hash router). Injected into the
 * component tree via Svelte context; no component ever imports a store, a
 * gateway or the aggregate.
 *
 * Contrast with today, where a control expresses itself by assigning to a
 * store that happens to be wired to Firebase — `bind:value={$url}` on the
 * source input writes to the database on every keystroke.
 */
export interface WatchSessionCommands {
    // ---- session lifecycle -------------------------------------------------
    join(roomId: RoomId): Promise<void>;
    leave(): Promise<void>;

    // ---- source selection --------------------------------------------------
    /**
     * Raw user input from the URL field. Classification and validation happen
     * behind `MediaResolverPort`; the caller only renders the result.
     */
    setSourceFromUserInput(raw: string): Promise<SetSourceResult>;
    clearSource(): Promise<void>;
    /** Seed a local file peer-to-peer and publish the resulting ref. */
    shareLocalFile(file: File): Promise<ShareFileResult>;
    /** Play a local file for this viewer only — see §16 Q5. */
    playLocalFilePrivately(file: File): Promise<void>;
    pickExampleSource(): Promise<void>;

    // ---- playback ----------------------------------------------------------
    requestPlay(): void;
    requestPause(): void;
    requestSeek(to: Seconds): void;
    setMuted(muted: boolean): void;

    // ---- social ------------------------------------------------------------
    postChatMessage(text: string): void;
    throwReaction(emoji: string): void;
    renameSelf(raw: string): void;

    // ---- navigation --------------------------------------------------------
    generateNewRoom(): Promise<RoomId>;
    /** Accepts a full room URL or a bare room id. */
    joinRoomByLinkOrId(input: string): Promise<RoomId | null>;
}

/** Discriminated so the input field can render invalid state without regexes. */
export type SetSourceResult =
    | { readonly status: 'accepted'; readonly source: MediaSourceRef }
    | { readonly status: 'unrecognized' }
    | { readonly status: 'cleared' }
    | { readonly status: 'rejected'; readonly reason: string };

export type ShareFileResult =
    | { readonly status: 'shared'; readonly source: MediaSourceRef }
    | { readonly status: 'unsupported' }
    | { readonly status: 'failed'; readonly reason: string };
