<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { _ } from 'svelte-i18n';
    import type { Source } from '../../normalize-source';
    import { SourceType } from '../../normalize-source';
    import Loader from '../loader.svelte';
    import { getStreamUrl } from '../../stores/web-torrent';
    import { sleep } from '../../utils';
    import VideoPlayerVidstack from './video-player-vidstack.svelte';
    import VideoSelectorBtn from '../video-selector-btn.svelte';

    export let source: Source;
    export let currentTime: number;
    export let paused: boolean;
    export let muted: boolean;

    const dispatch = createEventDispatcher();
</script>

{#if !navigator.serviceWorker}
    { $_('player.torrentNotSupported') }
    <div class="chat">
        <slot name="chat" />
    </div>
{:else}
    {#await getStreamUrl(source.src)}
        <Loader />
        {#await sleep(10000)}
        {:then}
            <div class="uk-margin-top uk-text-center">
                { $_('player.isHostActive') }
                <br class="uk-margin"/>
                <VideoSelectorBtn forceLocal={true} />
            </div>
            <div class="chat">
                <slot name="chat" />
            </div>
        {/await}
    {:then streamUrl}
        <VideoPlayerVidstack
            source={{ type: SourceType.magnet, src: streamUrl }}
            bind:paused={paused}
            bind:currentTime={currentTime}
            bind:muted={muted}
            on:seeked={() => dispatch('seeked')}
            on:seeking={() => dispatch('seeking')}
            on:pause={() => dispatch('pause')}
            on:play={() => dispatch('play')}
            on:timeupdate={() => dispatch('timeupdate')}
        >
            <slot />
        </VideoPlayerVidstack>
    {/await}
{/if}
