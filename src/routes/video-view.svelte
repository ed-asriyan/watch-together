<script lang="ts">
    export let url: string;
    export let time: number;
    export let paused: boolean;

    const onLoaded = function (this: HTMLVideoElement) {
        this.currentTime = time;
    }
</script>

<video
    class="video"
    src={url}
    controls
    crossOrigin="anonymous"
    on:loadeddata={onLoaded}
    bind:currentTime={time}
    bind:paused={paused}
    preload="metadata"
    autoplay
    playsInline
></video>

<style>
    .video {
        max-height: 40rem;
        width: 100%;
    }
</style>
