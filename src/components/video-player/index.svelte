<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { derived, readable, type Readable } from 'svelte/store';
    import type { MediaPlayerElement } from 'vidstack/elements';
    import { _ } from 'svelte-i18n';
    import Loader from '../loader.svelte';
    import { SourceType } from '../../normalize-link';
    import VideoPlayerNative from './video-player-native.svelte';
    import VideoPlayerVidstack from './video-player-vidstack.svelte';
    import VideoPlayerVime from './video-player-vime.svelte';
    import VideoPlayerMagnet from './player-magnet.svelte';
    import { proxies } from '../../settings';
    import { blobUrl } from '../../stores/blob';

    export let room: Room;

    $: link = room?.link;
    $: url = room?.url;
    $: currentTime = room?.currentTime;
    $: paused = room?.paused;
    
    let muted = true;

    let isLoading: boolean = true;

    type Player = 'vime' | 'vidstack' | 'magnet' | null;
    $: playerType = room && derived<Readable<Link | null>, Player>(room.link, ($link) => {
        switch ($link?.type) {
            case SourceType.DailyMotion:
                return 'vime';
            case SourceType.Vimeo:
            case SourceType.YouTube:
            case SourceType.direct:
                return 'vidstack';
            case SourceType.magnet:
                return 'magnet';
            default:
                return null;
        }
    });

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
    {#if !room}
        <Loader />
    {:else if $blobUrl}
        <VideoPlayerNative url={$blobUrl} bind:paused={$paused} bind:currentTime={$currentTime} bind:muted={muted}/>
    {:else}
        {#if $link}
            {#await normalizeLink($link)}
                <Loader/>
            {:then normalizedLink}
                {#if $playerType === 'vidstack'}
                    <VideoPlayerVidstack link={normalizedLink} bind:paused={$paused} bind:currentTime={$currentTime} bind:muted={muted}/>
                {:else if $playerType === 'vime'}
                    <VideoPlayerVime link={normalizedLink} bind:paused={$paused} bind:currentTime={$currentTime} bind:muted={muted}/>
                {:else if $playerType === 'magnet'}
                    <VideoPlayerMagnet link={normalizedLink} bind:paused={$paused} bind:currentTime={$currentTime} bind:muted={muted}/>
                {/if}
            {/await}
        {:else}
            <div class="uk-padding">
                { $_('player.placeholder') }
            </div>
        {/if}
    {/if}
</div>

<style lang="scss">
    .viewer {
        width: 100%;
        height: 100%;
        max-height: 100%;
    }
</style>
