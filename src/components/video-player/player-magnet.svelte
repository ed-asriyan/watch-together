<script lang="ts">
    import { _ } from 'svelte-i18n';
    import type { Link } from '../normalize-link';
    import Loader from '../loader.svelte';
    import { getStreamUrl } from '../../stores/web-torrent';
    import VideoPlayerNative from './video-player-native.svelte';
    import VideoSelectorBtn from '../video-selector-btn.svelte';

    export let link: Link;
    export let currentTime: number;
    export let paused: boolean;
    export let muted: boolean;

    const sleep = function(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    };
</script>

{#if !navigator.serviceWorker}
    { $_('player.torrentNotSupported') }
{:else}
    {#await getStreamUrl(link.url)}
        <Loader />
        {#await sleep(10000)}
        {:then}
            <div class="uk-margin-top uk-text-center">
                { $_('player.isHostActive') }
                <br class="uk-margin"/>
                <VideoSelectorBtn forceLocal={true} />
            </div>
        {/await}
    {:then streamUrl}
        <VideoPlayerNative url={streamUrl} bind:paused={paused} bind:currentTime={currentTime} bind:muted={muted} />
    {/await}
{/if}
