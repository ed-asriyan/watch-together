<script lang="ts" context="module">
    import { analytics, isProduction } from './settings';
    import normalizeSource, { SourceType } from './normalize-source';
    import { blob } from './stores/blob';
    import type { MessageType } from './stores/room/bound-messages';
    import type { Room } from './stores/room';
    import { get } from 'svelte/store';

    const trackRaw = function (...args: any[]) {
        if (isProduction) {
            // @ts-ignore
            analytics.measurementId && window.dataLayer.push(arguments);
        } else {
            console.log('Google Analytics:', ...args);
        }
    };

    export interface TrackUrlPaste {
        roomId: string;
        url: string;
        isExample: boolean;
    }

    export interface RoomDetails {
        roomId: string;
        paused: boolean;
        srcType: SourceType | undefined;
        srcUrl: string | undefined;
        usersCount: number;
        isExample: boolean | undefined;
    }

    abstract class Event<T> {
        abstract readonly name: string;
        readonly params: T;

        constructor(params: T) {
            this.params = params;
        }
    };

    abstract class RoomEvent<T> extends Event<T & RoomDetails> {
        constructor(room: Room, params: T) {
            let srcType: SourceType | undefined;
            let srcUrl: string | undefined;
            let isExample: boolean = false;

            const blobValue = get(blob);
            if (blobValue) {
                srcType = SourceType.blob;
                isExample = false;
            } else {
                const source = normalizeSource(get(room.url));
                if (source) {
                    srcType = source.type;
                    if (srcType === SourceType.direct) {
                        srcUrl = new URL(source.src).hostname;
                    } else {
                        srcUrl = source.src;
                    }
                    isExample = source.isExaple();
                } else {
                    srcType = undefined;
                    srcUrl = undefined;
                }
            }
            
            super({
                ...params,
                roomId: room.id,
                paused: get(room.paused),
                srcType,
                srcUrl,
                usersCount: (get(room.users)?.length || 0) + 1, // yourself
                isExample,
            });
        }
    }

    export class ClickEvent extends RoomEvent<{
        target: string;
    }> {
        readonly name: string = 'click';
    }

    export class WatchedMinuteEvent extends RoomEvent<void> {
        readonly name: string = 'watch_minute';
    }

    export class SeekedEvent extends RoomEvent<void> {
        readonly name: string = 'seeked';
    }

    export class PausedEvent extends RoomEvent<void> {
        readonly name: string = 'paused';
    }

    export class PlayedEvent extends RoomEvent<void> {
        readonly name: string = 'played';
    }

    export class UrlPasteEvent extends RoomEvent<{
        url: string;
    }> {
        readonly name: string = 'url_paste';
    }

    export class LocaleChangedEvent extends Event<{
        locale: string;
    }> {
        readonly name: string = 'locale_changed';
    }

    export class MessageSentEvent extends RoomEvent<{
        messageType: MessageType;
    }> {
        readonly name: string = 'message_sent';
    }

    export class ReactionSentEvent extends RoomEvent<{
        reactionEmoji: string;
    }> {
        readonly name: string = 'reaction_sent';
    }

    export const track = function<T> (event: Event<T>) {
        trackRaw('event', event.name, event.params);
    };
</script>

<script lang="ts">
    import { onMount } from 'svelte';

    onMount(() => {
        // @ts-ignore
        window.dataLayer = window.dataLayer || [];

        trackRaw('js', new Date());
        trackRaw('config', analytics.measurementId);
    });
</script>

<svelte:head>
    {#if isProduction && analytics.measurementId}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${analytics.measurementId}`}></script>
    {/if}
</svelte:head>
