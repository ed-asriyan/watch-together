<script lang="ts">
    import { run } from 'svelte/legacy';
    import 'vidstack/bundle';
    import { defineCustomElement, MediaPlayerElement } from 'vidstack/elements';

    import { onDestroy, createEventDispatcher } from 'svelte';
    import type { Source } from '../../normalize-source';

    defineCustomElement(MediaPlayerElement);

    const dispatch = createEventDispatcher();

    interface Props {
        source: Source;
        currentTime: number;
        paused: boolean;
        muted: boolean;
    }

    let {
        source,
        currentTime = $bindable(),
        paused = $bindable(),
        muted = $bindable()
    }: Props = $props();

    let player: MediaPlayerElement = $state();

    let isMounted = $state(false);

    run(() => {
        isMounted && (player.currentTime = currentTime);
    });
    run(() => {
        isMounted && (player.paused = paused);
    });
    run(() => {
        isMounted && (player.muted = muted);
    });


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

    run(() => {
        if (player) {
            init();
        }
    });

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
    <media-audio-layout></media-audio-layout>
    <media-video-layout></media-video-layout>
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
