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

    let isLoaded = false;
    const onLoaded = function (this: HTMLVideoElement) {
        player.currentTime = time;
        isLoaded = true;
    };

    $: isLoaded && (player.currentTime = time);
    $: isLoaded && (player.paused = paused);

    onMount(() => {
        player.subscribe(options => {
            paused = options.paused;
            time = options.currentTime;
        });
    });
</script>

<media-player
    bind:this={player}
    src={url}
    autoplay
    playsInline
    preload="metadata"
    crossOrigin
    muted
    on:loaded-metadata={onLoaded}
>
    <media-provider>
    </media-provider>
    <!-- Layouts -->
    <media-audio-layout />
    <media-video-layout />
</media-player>
