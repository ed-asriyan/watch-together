<script lang="ts">
    // Import styles.
    import 'vidstack/player/styles/default/theme.css';
    import 'vidstack/player/styles/default/layouts/audio.css';
    import 'vidstack/player/styles/default/layouts/video.css';
    // Register elements.
    import 'vidstack/player';
    import 'vidstack/player/layouts';
    import 'vidstack/player/ui';

    import { onMount, onDestroy } from 'svelte';
    import type { MediaPlayerElement } from 'vidstack/elements';
    import { _ } from 'svelte-i18n';
    import Loader from '../loader.svelte';
    import { SourceType } from '../../normalize-link';
    import VideoPlayerNative from './video-player-native.svelte';
    import VideoPlayerVidstack from './video-player-vidstack.svelte';
    import VideoPlayerVime from './video-player-vime.svelte';
    import { proxies } from '../../settings';

    export let link: Link | null;
    export let currentTime: number;
    export let paused: boolean;

    let isLoading: boolean = true;

    $: playerType = (() => {
        switch (link?.type) {
            case SourceType.DailyMotion:
                return 'vime';
            case SourceType.Vimeo:
            case SourceType.YouTube:
            case SourceType.direct:
                return 'vidstack';
            case SourceType.blob:
                return 'native';
            default:
                return null;
        }
    })();

    const normalizeLink = async function(link: Link): Link {
        if (link.type !== SourceType.direct || (!proxies.hlsUrl && !proxies.regularUrl)) {
            return link;
        }

        const paths = new URL(link.url).pathname.split('.');
        const extenssion = paths[paths.length - 1];
        const isHls = extenssion === 'm3u8';
        if ((isHls && !proxies.hlsUrl) || (!isHls && !proxies.regularUrl)) {
            return link;
        }

        try {
            await fetch(link.url, { mode: 'cors', method: 'HEAD' });
            return link;
        } catch {
            let url = link.url;
            if (isHls) {
                url = `${proxies.hlsUrl}/${btoa(link.url)}.m3u8`;
            } else {
                url = `${proxies.regularUrl}?url=${link.url}`;
            }
            return { ...link, url };
        }
    };
</script>

<div class="viewer uk-text-small uk-flex uk-flex-center uk-flex-column uk-text-break uk-text-center">
    {#if link}
        {#await normalizeLink(link)}
            <Loader/>
        {:then link}
            {#if playerType === 'native'}
                <VideoPlayerNative link={link} bind:paused={paused} bind:currentTime={currentTime}/>
            {:else if playerType === 'vidstack'}
                <VideoPlayerVidstack link={link} bind:paused={paused} bind:currentTime={currentTime}/>
            {:else if playerType === 'vime'}
                <VideoPlayerVime link={link} bind:paused={paused} bind:currentTime={currentTime}/>
            {/if}
        {/await}
    {:else}
        <div class="uk-padding">
            { $_('player.placeholder') }
        </div>
    {/if}
</div>

<style lang="scss">
    .viewer {
        width: 100%;
        height: 100%;
        max-height: 100%;
    }
</style>
