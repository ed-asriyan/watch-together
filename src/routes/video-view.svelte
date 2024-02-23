<script lang="ts">
    // Import styles.
    import 'vidstack/player/styles/default/theme.css';
    import 'vidstack/player/styles/default/layouts/audio.css';
    import 'vidstack/player/styles/default/layouts/video.css';
    // Register elements.
    import 'vidstack/player';
    import 'vidstack/player/layouts';
    import 'vidstack/player/ui';

    import { onMount } from 'svelte';
    import type { MediaPlayerElement } from 'vidstack/elements';

    export let url: string;
    export let time: number;
    export let paused: boolean;

    let player: MediaPlayerElement;

    let isMounted = false;

    $: isMounted && (player.currentTime = time);
    $: isMounted && (player.paused = paused);

    $: isBlob = url.startsWith('blob:');

    const onLoaded = function (this: HTMLVideoElement) {
        this.currentTime = time;
    };

    onMount(() => {
        player.subscribe(options => {
            paused = options.paused;
            time = options.currentTime;
        });
        player.currentTime = time;
        player.paused = paused;
        isMounted = true;
    });
</script>

{#if isBlob}
    <video
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
    class:uk-invisible={isBlob}
    bind:this={player}
    src={url}
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
