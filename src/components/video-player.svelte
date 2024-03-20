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
    import { SourceType } from '../normalize-link';
    import VideoPlayerNative from './video-player-native.svelte';
    import VideoPlayerVidstack from './video-player-vidstack.svelte';
    import VideoPlayerVime from './video-player-vime.svelte';

    export let link: Link | null;
    export let currentTime: number;
    export let paused: boolean;

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
</script>

<div class="player uk-text-small uk-flex uk-flex-center uk-flex-column uk-text-break uk-text-center">
    {#if link}
        {#if playerType === 'native'}
            <VideoPlayerNative link={link} bind:paused={paused} bind:currentTime={currentTime}/>
        {:else if playerType === 'vidstack'}
            <VideoPlayerVidstack link={link} bind:paused={paused} bind:currentTime={currentTime}/>
        {:else if playerType === 'vime'}
            <VideoPlayerVime link={link} bind:paused={paused} bind:currentTime={currentTime}/>
        {/if}
    {:else}
        <slot/>
    {/if}
</div>

<style lang="scss">
    .player {
        box-sizing: border-box;
        width: 90vw;

        height: calc(90vw * 0.5);
        max-height: 70vh; 

        border-radius: 6px;
        border: 1px solid rgb(255 255 255 / .1);

        background-color: black;
    }
</style>
