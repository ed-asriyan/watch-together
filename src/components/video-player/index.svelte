<script lang="ts">
    import { derived, type Readable } from 'svelte/store';
    import { _ } from 'svelte-i18n';
    import Loader from '../loader.svelte';
    import { SourceType } from '../../normalize-source';
    import VideoPlayerVidstack from './video-player-vidstack.svelte';
    import VideoPlayerVime from './video-player-vime.svelte';
    import VideoPlayerMagnet from './player-magnet.svelte';
    import Chat from './chat/index.svelte';
    import { proxies } from '../../settings';
    import { blob } from '../../stores/blob';
    import { createCursorStore } from './cursor';

    export let room: Room;

    $: source = room?.source;
    $: currentTime = room?.currentTime;
    $: paused = room?.paused;

    const cursor = createCursorStore(2000);

    $: displayControls = $paused || $cursor;
    
    let muted = true;

    type Player = 'vime' | 'vidstack' | 'magnet' | null;
    $: playerType = room && derived<Readable<Source | null>, Player>(room.source, ($source) => {
        switch ($source?.type) {
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

    const normalizeSource = async function(source: Source): Source {
        if (source.type !== SourceType.direct || (!proxies.hlsUrl && !proxies.regularUrl)) {
            return source;
        }

        const paths = new URL(source.url).pathname.split('.');
        const extenssion = paths[paths.length - 1];
        const isHls = extenssion === 'm3u8';
        if ((isHls && !proxies.hlsUrl) || (!isHls && !proxies.regularUrl)) {
            return source;
        }

        try {
            await fetch(source.src, { mode: 'cors', method: 'HEAD' });
            return source;
        } catch {
            let src = source.src;
            if (isHls) {
                src = `${proxies.hlsUrl}/${btoa(source.src)}.m3u8`;
            } else {
                src = `${proxies.regularUrl}?url=${source.src}`;
            }
            return { ...source, src };
        }
    };
</script>

<div class="viewer uk-text-small uk-flex uk-flex-center uk-flex-column uk-text-break uk-text-center">
    {#if !room}
        <Loader />
    {:else if $blob}
        <VideoPlayerVidstack source={{ type: SourceType.blob, src: $blob }} bind:paused={$paused} bind:currentTime={$currentTime} bind:muted={muted}>
            <Chat room={room} displayInput={displayControls} />
        </VideoPlayerVidstack>
    {:else}
        {#if $source}
            {#await normalizeSource($source)}
                <Loader/>
            {:then normalizedSource}
                {#if $playerType === 'vidstack'}
                    <VideoPlayerVidstack source={normalizedSource} bind:paused={$paused} bind:currentTime={$currentTime} bind:muted={muted}>
                        <Chat room={room} displayInput={displayControls} />
                    </VideoPlayerVidstack>
                {:else if $playerType === 'vime'}
                    <VideoPlayerVime source={normalizedSource} bind:paused={$paused} bind:currentTime={$currentTime} bind:muted={muted}/>
                {:else if $playerType === 'magnet'}
                    <VideoPlayerMagnet source={normalizedSource} bind:paused={$paused} bind:currentTime={$currentTime} bind:muted={muted}>
                        <Chat room={room} displayInput={displayControls} />
                    </VideoPlayerMagnet>
                {/if}
            {/await}
        {:else}
            <div class="uk-padding">
                { $_('player.placeholder') }
            </div>
            <Chat room={room} displayInput={displayControls} />
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
