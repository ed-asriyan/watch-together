<script lang="ts">
    import { run } from 'svelte/legacy';

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

    interface Props {
        room: Room;
    }

    let { room }: Props = $props();
    let scrollY: number = $state();
    let clientHeight: number = $state();

    run(() => {
        if (room && $blob) {
            room?.messages.sendMessage('', MessageType.selectedLocalFile);
        }
    });
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
    .player, .controls {
        --height: 100vh;
    }
    @media (max-width : 675px) {
        .player, .controls {
            --height: 50vh;
        }
    }

    .player {
        position: fixed;
        left: 0;
        top: 0;
        z-index: 0;
        height: var(--height);
        width: 100vw;
    }

    .controls {
        z-index: 2;
        margin-top: var(--height);
    }
</style>
