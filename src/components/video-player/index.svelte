<script lang="ts">
    import { derived, type Readable } from 'svelte/store';
    import { _ } from 'svelte-i18n';
    import Loader from '../loader.svelte';
    import { SourceType } from '../../normalize-source';
    import VideoPlayerVidstack from './video-player-vidstack.svelte';
    import VideoPlayerVime from './video-player-vime.svelte';
    import VideoPlayerMagnet from './player-magnet.svelte';
    import Chat from './chat/index.svelte';
    import Online from './online/index.svelte';
    import { proxies } from '../../settings';
    import { blob } from '../../stores/blob';
    import { MessageType } from '../../stores/room/bound-messages';
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

        const paths = new URL(source.src).pathname.split('.');
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


    let currentVideoTime = 0;
    let saveCurrentTime = true;
    let firstSeek = true;
    const onSeeked = function () {
        saveCurrentTime = true;
        if (!firstSeek && Math.abs(currentVideoTime - $currentTime) > 2) {
            room.messages.sendMessage($currentTime, MessageType.seek);
        }
        firstSeek = false;
    };
    const onSeeking = function () {
        saveCurrentTime = false;
    };
    const onPlay = function () {
        room.messages.sendMessage(Math.round($currentTime), MessageType.play);
    };
    const onPause = function () {
        room.messages.sendMessage(Math.round($currentTime), MessageType.pause);
    };
    const onTimeUpdate = function () {
        if (saveCurrentTime) {
            currentVideoTime = $currentTime;
        }
    };
</script>

<div class="viewer uk-text-small uk-flex uk-flex-center uk-flex-column uk-text-break uk-text-center">
    {#if !room}
        <Loader />
    {:else if $blob}
        <VideoPlayerVidstack
            source={{ type: SourceType.blob, src: $blob }}
            bind:paused={$paused}
            bind:currentTime={$currentTime}
            bind:muted={muted}
            on:seeked={onSeek}
            on:pause={onPause}
            on:play={onPlay}
        >
            <Chat room={room} displayInput={displayControls} />
            <Online room={room} visible={displayControls}/>
        </VideoPlayerVidstack>
    {:else}
        {#if $source}
            {#await normalizeSource($source)}
                <Loader/>
            {:then normalizedSource}
                {#if $playerType === 'vidstack'}
                    <VideoPlayerVidstack
                        source={normalizedSource}
                        bind:paused={$paused}
                        bind:currentTime={$currentTime}
                        bind:muted={muted}
                        on:seeked={onSeeked}
                        on:seeking={onSeeking}
                        on:pause={onPause}
                        on:play={onPlay}
                        on:timeupdate={onTimeUpdate}
                    >
                        <Chat room={room} displayInput={displayControls} />
                        <Online room={room} visible={displayControls}/>
                    </VideoPlayerVidstack>
                {:else if $playerType === 'vime'}
                    <VideoPlayerVime source={normalizedSource} bind:paused={$paused} bind:currentTime={$currentTime} bind:muted={muted}/>
                {:else if $playerType === 'magnet'}
                    <VideoPlayerMagnet
                        source={normalizedSource}
                        bind:paused={$paused}
                        bind:currentTime={$currentTime}
                        bind:muted={muted}
                        on:seeked={onSeeked}
                        on:seeking={onSeeking}
                        on:pause={onPause}
                        on:play={onPlay}
                        on:timeupdate={onTimeUpdate}
                    >
                        <Chat room={room} displayInput={displayControls} />
                        <Online room={room} visible={displayControls}/>
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
