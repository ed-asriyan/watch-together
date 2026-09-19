import type { EpochMs, Seconds } from './shared/time';
import type { ActivityId, ParticipantId } from './ids';
import type { MediaSourceKind } from './media-source';

/**
 * A system notice: a domain event projected into the feed.
 *
 * Legacy stored these as chat messages with an empty/numeric `text` and a
 * `MessageType` enum, authored by *view components*
 * (`src/legacy/components/video-player/index.svelte:70,79,83`). Here the domain
 * emits an event, a projection decides whether it deserves a notice, and i18n
 * renders this VO — so the payload is structured, not a stringified number.
 */
export type Notice =
    | { readonly type: 'seeked'; readonly to: Seconds }
    | { readonly type: 'played'; readonly from: Seconds }
    | { readonly type: 'paused'; readonly at: Seconds }
    | { readonly type: 'pickedLocalFile' }
    | { readonly type: 'changedSource'; readonly kind: MediaSourceKind };

export type ActivityBody =
    | { readonly kind: 'chat'; readonly text: string }
    | { readonly kind: 'reaction'; readonly emoji: string }
    | { readonly kind: 'notice'; readonly notice: Notice };

/** One item in the room's ephemeral feed. */
export interface Activity {
    readonly id: ActivityId;
    readonly author: ParticipantId;
    readonly at: EpochMs;
    readonly body: ActivityBody;
}

export function isChat(activity: Activity): boolean {
    return activity.body.kind === 'chat';
}
export function isReaction(activity: Activity): boolean {
    return activity.body.kind === 'reaction';
}
