<script lang="ts">
    import type { Link } from '../normalize-link';

    export let link: Link;
    export let time: number;
    export let paused: boolean;

    const onLoaded = function (this: HTMLVideoElement) {
        this.currentTime = time;
    };
</script>

<video
    class="uk-width-1-1 uk-height-1-1"
    src={link.url}
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
