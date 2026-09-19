/**
 * Inbound (driving) ports: interfaces the application IMPLEMENTS and adapters
 * CALL.
 *
 *  - `WatchSessionCommands` + `WatchSessionView` — the UI's entire surface;
 *  - `RemoteRoomListener` — signals from the remote synchronized store;
 *  - `MediaPlayerListener` — facts from the local media element;
 *  - `SessionTicks` — the scheduler.
 *
 * The implementation that satisfies all four lives in `../index.ts`.
 */

export type {
    WatchSessionCommands,
    SetSourceResult,
    ShareFileResult,
} from './watch-session-commands';

export type { WatchSessionView } from './watch-session-view';

export type {
    ConnectionView,
    SourceView,
    PlaybackView,
    ParticipantView,
    ParticipantListView,
    FeedItemView,
    FeedView,
    ReactionView,
    DeliveryView,
    InviteView,
    SelfView,
} from './views';

export type { RemoteRoomListener, GatewayError } from './remote-room-listener';
export type { MediaPlayerListener, PlayerError } from './media-player-listener';
export type { SessionTicks } from './session-ticks';
