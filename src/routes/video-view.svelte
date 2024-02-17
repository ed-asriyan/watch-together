<script lang="ts">
    export let url: string;
    export let time: number;
    export let paused: boolean;
</script>

<video
    class="video"
    src={url}
    controls
    crossOrigin="anonymous"
    bind:currentTime={time}
    bind:paused={paused}
    preload="metadata"
    autoplay
></video>

<style>
    .video {
        max-height: 40rem;
        width: 100%;
    }
</style>
