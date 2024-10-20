<script lang="ts">
    import { _ } from 'svelte-i18n';
    import type { Room } from '../stores/room';
    import VideoPlayer from './video-player/index.svelte';
    import { blob } from '../stores/blob';
    import { MessageType } from '../stores/room/bound-messages';
    import Header from './header.svelte';
    import Controls from './controls/index.svelte';
    import Fullscreen from './fullscreen.svelte';
    import JuristicionalBullshitBanner from './jurisdictional-bullshit-banner.svelte';
    import ScrollIcon from './scroll-icon.svelte';
    import { cursorActive } from '../stores/cursor';

    export let roomId: string;
    export let room: Room;
    let scrollY: number;
    let clientHeight: number;

    $: if (room && $blob) {
        room?.messages.sendMessage('', MessageType.selectedLocalFile);
    }
</script>

<svelte:window bind:scrollY={scrollY} bind:innerHeight={clientHeight}></svelte:window>

<Header display={scrollY !== 0}/>
<JuristicionalBullshitBanner />

<div class="player" style:filter={`blur(${Math.round((scrollY / clientHeight) * 10)}px) brightness(${1 - (scrollY / clientHeight) * 0.5})`}>
    <VideoPlayer room={room}/>
</div>
<div class="controls">
    <Controls room={room} />
</div>
{#if $cursorActive || !!scrollY}
    <Fullscreen />
{/if}
{#if !!scrollY}
    <ScrollIcon />
{/if}

<style lang="scss">
    .player {
        position: fixed;
        left: 0;
        top: 0;
        z-index: 0;
        height: 100vh;
        width: 100vw;
    }

    .controls {
        z-index: 2;
        margin-top: 100vh;
    }
</style>
