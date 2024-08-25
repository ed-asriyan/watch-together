<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import { derived, type Readable } from 'svelte/store';
    import { _ } from 'svelte-i18n';
    import { Source, SourceType } from '../../normalize-source';
    import { exploreUrl } from './explore-url';
    import VideoPlayerVidstack from './video-player-vidstack.svelte';
    import VideoPlayerVime from './video-player-vime.svelte';
    import VideoPlayerMagnet from './player-magnet.svelte';
    import Loader from '../loader.svelte';
    import Inplayer from './inplayer.svelte';
    import { blob } from '../../stores/blob';
    import type { Room } from '../../stores/room';
    import { MessageType } from '../../stores/room/bound-messages';
    import { createCursorStore } from './cursor';
    import { PausedEvent, PlayedEvent, SeekedEvent, track, WatchedMinuteEvent } from '../../analytics.svelte';

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

    let watchMinuteAnalyticsTimeInterval: number;;
    onMount(() => {
        watchMinuteAnalyticsTimeInterval = setInterval(() => {
            if ($source && !$paused) {
                track(new WatchedMinuteEvent(room));
            }
        }, 60000);
    });

    onDestroy(() => {
        clearInterval(watchMinuteAnalyticsTimeInterval);
    });

    let currentVideoTime = 0;
    let saveCurrentTime = true;
    let firstSeek = true;
    const onSeeked = function () {
        saveCurrentTime = true;
        if (!firstSeek && Math.abs(currentVideoTime - $currentTime) > 2) {
            room.messages.sendMessage($currentTime.toString(), MessageType.seek);
        }
        firstSeek = false;
    };
    const onSeeking = function () {
        saveCurrentTime = false;
        track(new SeekedEvent(room));
    };
    const onPlay = function () {
        room.messages.sendMessage(Math.round($currentTime).toString(), MessageType.play);
        track(new PlayedEvent(room));
    };
    const onPause = function () {
        room.messages.sendMessage(Math.round($currentTime).toString(), MessageType.pause);
        track(new PausedEvent(room));
    };
    const onTimeUpdate = function () {
        if (saveCurrentTime) {
            currentVideoTime = $currentTime;
        }
    };
</script>

<div class="viewer uk-text-small uk-flex uk-flex-center uk-flex-column uk-text-break uk-text-center">
    {#if room}
        {#if $blob}
            <VideoPlayerVidstack
                source={new Source({ type: SourceType.blob, src: $blob })}
                bind:paused={$paused}
                bind:currentTime={$currentTime}
                bind:muted={muted}
                on:seeked={onSeeked}
                on:seeking={onSeeking}
                on:pause={onPause}
                on:play={onPlay}
                on:timeupdate={onTimeUpdate}
            >
                <Inplayer room={room} visible={displayControls}/>
            </VideoPlayerVidstack>
        {:else}
            {#if $source}
                {#await exploreUrl($source)}
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
                            <Inplayer room={room} visible={displayControls}/>
                        </VideoPlayerVidstack>
                    {:else if $playerType === 'vime'}
                        <VideoPlayerVime source={normalizedSource} bind:paused={$paused} bind:currentTime={$currentTime} bind:muted={muted}/>
                    {:else if $playerType === 'magnet'}
                        <VideoPlayerMagnet
                            source={normalizedSource}
                            room={room}
                            bind:paused={$paused}
                            bind:currentTime={$currentTime}
                            bind:muted={muted}
                            on:seeked={onSeeked}
                            on:seeking={onSeeking}
                            on:pause={onPause}
                            on:play={onPlay}
                            on:timeupdate={onTimeUpdate}
                        >
                            <Inplayer room={room} visible={displayControls}/>
                        </VideoPlayerMagnet>
                    {/if}
                {/await}
            {:else}
                <div class="uk-padding">
                    { $_('player.placeholder') }
                </div>
                <Inplayer room={room} visible={displayControls}/>
            {/if}
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
