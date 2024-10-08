<script lang="ts">
    // Import styles.
    import 'vidstack/player/styles/default/theme.css';
    import 'vidstack/player/styles/default/layouts/audio.css';
    import 'vidstack/player/styles/default/layouts/video.css';
    // Register elements.
    import 'vidstack/player';
    import 'vidstack/player/layouts';
    import 'vidstack/player/ui';

    import { onDestroy, createEventDispatcher } from 'svelte';
    import type { MediaPlayerElement } from 'vidstack/elements';
    import type { Source } from '../../normalize-source';

    const dispatch = createEventDispatcher();

    export let source: Source;
    export let currentTime: number;
    export let paused: boolean;
    export let muted: boolean;

    let player: MediaPlayerElement;

    let isMounted = false;

    $: isMounted && (player.currentTime = currentTime);
    $: isMounted && (player.paused = paused);
    $: isMounted && (player.muted = muted);


    let unsubscribe: () => void;
    const init = function () {
        destroy();
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
    };

    const destroy = function () {
        unsubscribe && unsubscribe();
    };

    $: if (player) {
        init();
    }

    onDestroy(() => {
        destroy()
    });
</script>

<media-player
    class="uk-width-1-1 uk-height-1-1"
    bind:this={player}
    src={source.src}
    autoplay
    playsInline
    preload="metadata"
    crossOrigin
    muted={muted}
    on:seeked={() => dispatch('seeked')}
    on:seeking={() => dispatch('seeking')}
    on:pause={() => dispatch('pause')}
    on:play={() => dispatch('play')}
    on:time-update={() => dispatch('timeupdate')}
>
    <media-provider>
    </media-provider>
    <!-- Layouts -->
    <media-audio-layout />
    <media-video-layout />
    <!-- <media-controls>
        
    </media-controls> -->
</media-player>

<style lang="scss">
    :global(media-player) {
        border: none !important;
    }

    :global(media-fullscreen-button) {
        opacity: 0;
        visibility:hidden;
    }
</style>
