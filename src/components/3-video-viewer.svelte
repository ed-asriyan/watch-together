<script lang="ts">
    import { LocalRoom } from '../stores/local-room';
    import VideoPlayer from './video-player.svelte';
    import VideoSelectorBtn from './video-selector-btn.svelte';

    export let room: LocalRoom;

    $: play = room.play;
</script>

<h3>3. Watch the movie together!</h3>
<div>
    Playback, time, and video scrolling are synchronized with everyone who has the page open.
</div>
<div class="uk-flex-1 uk-flex uk-flex-center uk-flex-column uk-flex-center uk-flex-middle">
    <VideoPlayer bind:paused={$room.paused} bind:currentTime={$room.currentTime} link={$play}>
        {#if $room.isLocalMode}
            <div>
                <VideoSelectorBtn room={room}/>
            </div>
        {:else}
            <div class="uk-padding">
                Video player will appear here when you insert a link
            </div>
        {/if}
    </VideoPlayer>
</div>
