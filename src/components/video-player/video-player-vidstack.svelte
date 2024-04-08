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

    import type { Link } from '../../normalize-link';

    export let link: Link;
    export let currentTime: number;
    export let paused: boolean;
    export let muted: boolean;

    let player: MediaPlayerElement;

    let isMounted = false;

    $: isMounted && (player.currentTime = currentTime);
    $: isMounted && (player.paused = paused);
    $: isMounted && (player.muted = muted);

    const onLoaded = function (this: HTMLVideoElement) {
        this.currentTime = currentTime;
        isMounted = true;
    };

    let unsubscribe: () => void;
    onMount(() => {
        unsubscribe = player.subscribe(options => {
            const optionsTime = options.currentTime;
            const optionsPaused = options.paused;
            const optionsMuted = options.muted;
            if (isMounted) {
                paused = optionsPaused;
                currentTime = optionsTime;
                muted = optionsMuted;
            }
            isMounted = true;
        });
        player.currentTime = currentTime;
        player.paused = paused;
        player.muted = muted;
    });

    onDestroy(() => {
        unsubscribe && unsubscribe();
    });
</script>

<media-player
    class="uk-width-1-1 uk-height-1-1"
    bind:this={player}
    src={link.url}
    autoplay
    playsInline
    preload="metadata"
    crossOrigin
    muted={muted}
>
    <media-provider>
    </media-provider>
    <!-- Layouts -->
    <media-audio-layout />
    <media-video-layout />
</media-player>

<style lang="scss">
    :global(media-player) {
        border: none !important;
    }
</style>
