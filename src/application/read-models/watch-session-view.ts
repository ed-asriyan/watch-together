import type { Observable } from '../../domain/shared/observable';
import type {
    ConnectionView,
    DeliveryView,
    FeedView,
    InviteView,
    ParticipantListView,
    PlaybackView,
    SelfView,
    SourceView,
} from './views';

/**
 * The read side handed to the UI, alongside `WatchSessionCommands`.
 *
 * Every member is an `Observable`, which is structurally a Svelte store, so a
 * component writes `$playback` with no `svelte` import anywhere below the
 * driving adapter.
 */
export interface WatchSessionView {
    readonly connection: Observable<ConnectionView>;
    readonly source: Observable<SourceView>;
    readonly playback: Observable<PlaybackView>;
    readonly participants: Observable<ParticipantListView>;
    readonly feed: Observable<FeedView>;
    readonly delivery: Observable<DeliveryView>;
    readonly invite: Observable<InviteView>;
    readonly self: Observable<SelfView>;
}
