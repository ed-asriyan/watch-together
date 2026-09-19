import type { Observable } from '../../model/shared/observable';
import type {
    ConnectionView,
    DeliveryView,
    FeedView,
    InviteView,
    ParticipantListView,
    PlaybackView,
    SourceView,
} from './views';

/**
 * DRIVING PORT (read side) — what the UI is allowed to observe.
 *
 * The companion to `WatchSessionCommands`: commands go in, views come out, and
 * nothing else crosses into the UI. A component cannot reach through a view
 * into the model the way `room.messages.sendMessage(...)` is called from
 * inside a chat component today.
 *
 * Every member is an `Observable`, which is structurally a Svelte store, so a
 * component writes `$playback` with no `svelte` import anywhere below the
 * driving adapter. Each emits its current value synchronously on subscribe.
 */
export interface WatchSessionView {
    /**
     * Link and clock health: connecting / online / offline / degraded, plus
     * whether writes are currently being withheld. Backs the offline banner
     * and any read-only affordance.
     */
    readonly connection: Observable<ConnectionView>;

    /**
     * The room's video source as the selector card needs it: the raw string
     * for the input field, its kind, whether it is valid, and whether
     * resolution is still in flight.
     */
    readonly source: Observable<SourceView>;

    /**
     * Playback state at UI granularity — roughly 4Hz, not player frequency.
     * The media element renders its own position; this exists for chrome
     * around it and for the debug drift overlay.
     */
    readonly playback: Observable<PlaybackView>;

    /** Who is in the room, self first. Backs the presence list and the count. */
    readonly participants: Observable<ParticipantListView>;

    /**
     * The ephemeral feed, already filtered by TTL, sorted, and grouped —
     * grouping is presentation and happens here, TTL is domain and happens
     * there. Reactions come separately, since they render as floating emoji
     * rather than rows.
     */
    readonly feed: Observable<FeedView>;

    /**
     * Peer-to-peer delivery telemetry: peers, speeds, progress, and whether
     * this viewer is seeding and must not close the tab.
     */
    readonly delivery: Observable<DeliveryView>;

    /** The shareable room URL and whether the platform can share natively. */
    readonly invite: Observable<InviteView>;

}
