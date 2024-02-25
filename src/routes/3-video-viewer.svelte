<script lang="ts">
    import { LocalRoom } from '../local-room';
    import VideoView from './video-view.svelte';

    export let room: LocalRoom;
    export let playUrl: string | null;
</script>

<h3>3. Watch the movie together!</h3>
<div>
    Playback, time, and video scrolling are synchronized with everyone who has the page open.
</div>
<div class="uk-flex-1 uk-flex uk-flex-center uk-flex-column uk-flex-center uk-flex-middle">
    {#if playUrl}
        <VideoView bind:paused={$room.paused} bind:time={$room.time} url={playUrl}/>
    {:else}
        <div class="uk-text-small uk-flex uk-flex-center uk-flex-column uk-text-break uk-text-center">
            Video player will appear here when you insert a link or select a video
        </div>
    {/if}
</div>
