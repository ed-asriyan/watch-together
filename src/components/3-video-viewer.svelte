<script lang="ts">
    import { LocalRoom } from '../stores/local-room';
    import VideoView from './video-view.svelte';
    import VideoSelectorBtn from './video-selector-btn.svelte';

    export let room: LocalRoom;

    $: playUrl = room.playUrl;
</script>

<h3>3. Watch the movie together!</h3>
<div>
    Playback, time, and video scrolling are synchronized with everyone who has the page open.
</div>
<div class="uk-flex-1 uk-flex uk-flex-center uk-flex-column uk-flex-center uk-flex-middle uk-padding">
    <VideoView bind:paused={$room.paused} bind:time={$room.time} url={$playUrl}>
        {#if $room.isLocalMode}
            <div>
                <VideoSelectorBtn room={room}/>
            </div>
        {:else}
            Video player will appear here when you insert a link
        {/if}
    </VideoView>
</div>
