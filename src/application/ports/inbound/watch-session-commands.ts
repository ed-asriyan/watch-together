import type { RoomId } from '../../../domain/room/ids';
import type { MediaSourceRef } from '../../../domain/room/media-source';

/**
 * DRIVING PORT — the controls the site renders *outside* the media element.
 *
 * Implemented by the application, called by driving adapters (Svelte
 * components, the hash router). Injected into the component tree via context;
 * no component imports a store, a gateway or the aggregate.
 *
 * ## Why there is no `requestPlay` / `requestPause` / `requestSeek` here
 *
 * Three different things were being confused, and only two of them exist:
 *
 * | Thing                             | Direction | Caller             | Meaning                        |
 * |-----------------------------------|-----------|--------------------|--------------------------------|
 * | `MediaPlayerListener.onPlayed`    | inbound   | Vidstack adapter   | fact: the element *did* start  |
 * | `MediaPlayerPort.play()`          | outbound  | the application    | command: make the element play |
 * | ~~`WatchSessionCommands.requestPlay()`~~ | inbound | (nobody) | intent: "user asked to play"   |
 *
 * The app renders no transport controls of its own — `<media-video-layout>`
 * owns play, pause, scrub and volume, and acts on the element directly. So
 * every playback intent originates *inside* the player and reaches the
 * application as a `MediaPlayerListener` fact, never as a command. Adding
 * `requestPlay()` here would be an entry point with no caller.
 *
 * If custom transport controls or keyboard shortcuts are ever added, that is
 * the moment to add `requestPlay()` / `requestPause()` / `requestSeek(to)`
 * back — they would then be the *only* honest way for that UI to speak, since
 * a custom button must not poke `MediaPlayerPort` behind the domain's back.
 */
export interface WatchSessionCommands {
    // ---- session lifecycle -------------------------------------------------

    /**
     * Enter a room: load the local profile, synchronize the clock, open the
     * gateway, arm disconnect cleanup, announce presence, start the tick loop.
     * Leaves any previously joined room first.
     *
     * @param roomId Room to enter, already validated by `domain/room/ids`.
     *               Comes from the URL hash or from `joinRoomByLinkOrId`.
     * @returns Resolves once the initial remote snapshot has been applied, so
     *          the first render shows real state rather than defaults.
     */
    join(roomId: RoomId): Promise<void>;

    /**
     * Leave the current room: stop the tick loop, retract presence, release
     * any torrent, close the gateway. Safe to call when not joined.
     */
    leave(): Promise<void>;

    // ---- source selection --------------------------------------------------

    /**
     * Set the room's video source from what the user typed or pasted.
     *
     * Classification happens behind `MediaResolverPort.classify` (synchronous,
     * no network), so the input field can render validity on every keystroke.
     * Resolution (proxies, extractor, torrent) happens afterwards and is
     * reported through `WatchSessionView.source`, not through this return.
     *
     * Selecting a new source resets the shared playhead to zero — that reset
     * belongs to this use case, which is the other reason no standalone
     * `requestSeek` is needed (legacy did it by hand in the component:
     * `card-video-selector.svelte` calls `room.currentTime.set(0)`).
     *
     * @param raw Exactly what is in the input, untrimmed and untrusted. An
     *            empty or whitespace-only string clears the room's source.
     * @returns What the field should render right now. Never throws.
     */
    setSourceFromUserInput(raw: string): Promise<SetSourceResult>;

    /**
     * Set the source to a randomly chosen configured example video. Backs the
     * "paste an example" affordance shown when the field is empty.
     */
    pickExampleSource(): Promise<void>;

    /**
     * Seed a local file peer-to-peer and publish the resulting magnet ref to
     * the room, so everyone watches this viewer's copy.
     *
     * The viewer must keep the tab open while seeding; `WatchSessionView.source`
     * exposes `seeding` so the UI can say so.
     *
     * @param file The file chosen in the file picker.
     * @returns `unsupported` when the browser has no Service Worker, which the
     *          P2P delivery path requires; `failed` carries a reason to show.
     */
    shareLocalFile(file: File): Promise<ShareFileResult>;

    /**
     * Play a local file for this viewer only, without changing the room's
     * source. Playback position still synchronizes, so two viewers holding the
     * same file can watch together without transferring it.
     *
     * This is the legacy `blob` store made explicit. It means the room's agreed
     * source and what this viewer sees can legitimately differ — see open
     * question §16 Q5 in the design doc.
     *
     * @param file The file chosen in the file picker.
     */
    playLocalFilePrivately(file: File): Promise<void>;

    // ---- social ------------------------------------------------------------

    /**
     * Post a chat message to the room's ephemeral feed. Ignored when the text
     * is empty after trimming.
     *
     * @param text Raw input from the chat field. The application trims it and
     *             assigns an id; the domain assigns the timestamp and author.
     */
    postChatMessage(text: string): void;

    /**
     * Throw an emoji reaction, rendered as floating emoji rather than a feed
     * row. Same ephemeral lifetime as chat.
     *
     * @param emoji One of the configured reaction emoji. Not validated against
     *              the configured set here — the UI only offers valid ones.
     */
    throwReaction(emoji: string): void;

    /**
     * Change this viewer's display name and republish presence immediately,
     * so other participants see it without waiting for the next heartbeat.
     *
     * @param raw Raw input from the rename prompt. Trimmed and capped at
     *            `NICKNAME_MAX_LENGTH`; blank input picks a random name, which
     *            is the legacy behaviour.
     */
    renameSelf(raw: string): void;

    // ---- navigation --------------------------------------------------------

    /**
     * Create a fresh empty room and navigate to it. The current room keeps its
     * state; nothing is copied. The caller is responsible for confirming with
     * the user first — this command does not prompt.
     *
     * @returns The id of the room just navigated to.
     */
    generateNewRoom(): Promise<RoomId>;

    /**
     * Join a room the user identified by pasting either a full room URL from
     * this site or a bare room id.
     *
     * @param input Raw text from the join prompt.
     * @returns The room joined, or `null` when the input is neither a URL for
     *          this origin carrying a hash nor a valid room id.
     */
    joinRoomByLinkOrId(input: string): Promise<RoomId | null>;
}

/**
 * The outcome of `setSourceFromUserInput`, as a discriminated union so the
 * input field can render its invalid state without owning any regex.
 */
export type SetSourceResult =
    /** Recognized and published to the room. */
    | { readonly status: 'accepted'; readonly source: MediaSourceRef }
    /** Non-empty input that matches no known source kind. */
    | { readonly status: 'unrecognized' }
    /** Input was empty; the room now has no source. */
    | { readonly status: 'cleared' }
    /** Recognized, but the write was refused — e.g. clock unsynced (I9). */
    | { readonly status: 'rejected'; readonly reason: string };

/** The outcome of `shareLocalFile`. */
export type ShareFileResult =
    | { readonly status: 'shared'; readonly source: MediaSourceRef }
    /** No Service Worker, so the P2P delivery path cannot run. */
    | { readonly status: 'unsupported' }
    | { readonly status: 'failed'; readonly reason: string };
