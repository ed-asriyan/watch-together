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

    export let url: string | null;
    export let time: number;
    export let paused: boolean;

    let player: MediaPlayerElement;

    let isMounted = false;

    $: isMounted && (player.currentTime = time);
    $: isMounted && (player.paused = paused);

    $: isBlob = url?.startsWith('blob:');

    const onLoaded = function (this: HTMLVideoElement) {
        this.currentTime = time;
    };

    let unsubscribe: () => void;
    onMount(() => {
        unsubscribe = player.subscribe(options => {
            paused = options.paused;
            time = options.currentTime;
        });
        player.currentTime = time;
        player.paused = paused;
        isMounted = true;
    });

    onDestroy(() => {
        unsubscribe && unsubscribe();
    });
</script>


{#if isBlob}
    <video
        class="player"
        src={url}
        autoplay
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        bind:paused={paused}
        bind:currentTime={time}
        on:loadeddata={onLoaded}
        muted
        controls
    >
    </video>
{/if}

<media-player
    class="player"
    class:uk-hidden={!url || isBlob}
    bind:this={player}
    src={url || ''}
    autoplay
    playsInline
    preload="metadata"
    crossOrigin
    muted
>
    <media-provider>
    </media-provider>
    <!-- Layouts -->
    <media-audio-layout />
    <media-video-layout />
</media-player>

{#if !url}
    <div class="player uk-text-small uk-flex uk-flex-center uk-flex-column uk-text-break uk-text-center">
        <slot/>
    </div>
{/if}

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

    @media only screen and (max-width: 1024px) {
        .player {
            width: auto;
            height: auto;
        }
    }
</style>
