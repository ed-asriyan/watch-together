<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import { _ } from 'svelte-i18n';
    import normalizeSource, { Source, SourceType } from '../../normalize-source';
    import { exploreUrl } from './explore-url';
    import VideoPlayerVidstack from './video-player-vidstack.svelte';
    import VideoPlayerMagnet from './player-magnet.svelte';
    import Loader from '../loader.svelte';
    import Inplayer from './inplayer.svelte';
    import { blob } from '../../stores/blob';
    import type { Room } from '../../stores/room';
    import { cursorActive } from '../../stores/cursor';
    import { MessageType } from '../../stores/room/bound-messages';
    import { PausedEvent, PlayedEvent, SeekedEvent, track, WatchedMinuteEvent } from '../../analytics.svelte';
    import { defaultVideos } from '../../settings';

    interface Props {
        room: Room;
    }

    let { room }: Props = $props();

    let url = $derived(room?.url);
    let currentTime = $derived(room?.currentTime);
    let paused = $derived(room?.paused);
    let source = $derived(normalizeSource($url));

    let innerWidth: number = $state();

    let displayControls = $derived((source && $paused) || $cursorActive || innerWidth < 675);
    
    let muted = $state(true);

    type Player = 'vidstack' | 'magnet' | null;
    let playerType: Player = $derived((function(): Player {
        switch (source?.type) {
            case SourceType.Vimeo:
            case SourceType.YouTube:
            case SourceType.direct:
                return 'vidstack';
            case SourceType.magnet:
                return 'magnet';
            default:
                return null;
        }
    })());

    let watchMinuteAnalyticsTimeInterval: number;;
    onMount(() => {
        watchMinuteAnalyticsTimeInterval = setInterval(() => {
            if (source && !$paused) {
                track(new WatchedMinuteEvent(room));
            }
        }, 60000);
    });

    onDestroy(() => {
        clearInterval(watchMinuteAnalyticsTimeInterval);
    });

    let urlUpdatedAt = $derived(room?.url?.updatedAt);
    let defaultVideo = $derived(defaultVideos[Math.round($urlUpdatedAt % defaultVideos.length)]);

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

<svelte:window bind:innerWidth />

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
            />
        {:else}
            {#if source}
                {#await exploreUrl(source)}
                    <Loader/>
                    <div class="uk-margin-top">{ $_('player.analyzing') }</div>              
                {:then normalizedSource}
                    {#if playerType === 'vidstack'}
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
                        />
                    {:else if playerType === 'magnet'}
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
                        />
                    {/if}
                {/await}
            {:else}
                {#if defaultVideo}
                    <VideoPlayerVidstack
                        source={normalizeSource(defaultVideo)}
                        bind:paused={$paused}
                        bind:currentTime={$currentTime}
                        bind:muted={muted}
                        on:seeked={onSeeked}
                        on:seeking={onSeeking}
                        on:pause={onPause}
                        on:play={onPlay}
                        on:timeupdate={onTimeUpdate}
                    />
                {/if}
            {/if}
        {/if}
    {/if}
    {#if room}
        <Inplayer room={room} visible={displayControls}/>
    {/if}
</div>

<style lang="scss">
    .viewer {
        width: 100%;
        height: 100%;
    }

    @media (max-width: 675px) {
        .viewer {
            height: calc(100% - 6rem);
        }
    }
</style>
