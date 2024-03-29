<script lang="ts">
    import { LocalRoom } from '../stores/local-room';
    import VideoPlayer from './video-player.svelte';
    import VideoSelectorBtn from './video-selector-btn.svelte';

    export let room: LocalRoom;

    $: play = room.play;
    $: currentTime = room.currentTime;
    $: paused = room.paused;
</script>

<div class="uk-flex-1 uk-flex uk-flex-center uk-flex-column uk-flex-center uk-flex-middle">
    <VideoPlayer bind:paused={$paused} bind:currentTime={$currentTime} link={$play} />
</div>
