<script lang="ts" context="module">
    import { analytics, isProduction } from './settings';

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

    abstract class Event<T> {
        abstract readonly name: string;
        readonly params: T;

        constructor(params: T) {
            this.params = params;
        }
    };

    export const getUserId = function (): string {
        return globalThis.gaGlobal?.vid.replace('.', '-');
    };

    export class ClickEvent extends Event<{
        target: string;
    }> {
        readonly name: string = 'click';
    }

    export class WatchedMinuteEvent extends Event<{
        roomId: string;
        url: string;
    }> {
        readonly name: string = 'watch_minute';
    }

    export class UrlPasteEvent extends Event<{
        roomId: string;
        url: string;
        isExample: boolean;
    }> {
        readonly name: string = 'url_paste';
    }

    export class LocaleChangedEvent extends Event<{
        locale: string;
    }> {
        readonly name: string = 'locale_changed';
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
