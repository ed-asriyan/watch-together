<script lang="ts">
    import Header from './header.svelte';
    import TermsBanner from './terms-banner.svelte';
    import ConnectionBanner from './connection-banner.svelte';
    import Player from './player/index.svelte';
    import Controls from './controls/index.svelte';
    import Fullscreen from './fullscreen.svelte';
    import ScrollIcon from './scroll-icon.svelte';
    import { cursorActive } from './cursor';

    let scrollY: number = $state(0);
    let clientHeight: number = $state(1);

    let blur = $derived(Math.round((scrollY / clientHeight) * 10));
    let brightness = $derived(1 - (scrollY / clientHeight) * 0.5);
</script>

<svelte:window bind:scrollY={scrollY} bind:innerHeight={clientHeight}></svelte:window>

<ConnectionBanner />
<Header display={scrollY !== 0} />
<TermsBanner />

<div class="player" style:filter={`blur(${blur}px) brightness(${brightness})`}>
    <Player />
</div>
<div class="controls">
    <Controls />
</div>

{#if $cursorActive || scrollY !== 0}
    <Fullscreen />
{/if}
{#if scrollY !== 0}
    <ScrollIcon />
{/if}

<style lang="scss">
    .player, .controls {
        --height: 100vh;
    }

    @media (max-width: 675px) {
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
