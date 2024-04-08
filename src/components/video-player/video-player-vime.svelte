<script lang="ts">
    import { Player, Dailymotion, DefaultUi } from '@vime/svelte';
    import { type Link, SourceType } from '../../normalize-link';

    export let link: Link;
    export let currentTime: number;
    export let paused: boolean;
    export let muted: boolean;

    let player: Player;

    let isOdd = false;
    const onTimeUpdate = (event: CustomEvent<number>) => {
        // here is the bug in vime:
        // after updating currentTime from outside, vime player sends two events in a row:
        // 1st: vmCurrentTimeChange with new currentTime
        // 2nd: vmCurrentTimeChange with old currentTime
        // this immitates that user "scrolled back" to the previous currentTime
        if (isOdd) {
            currentTime = event.detail;
        }
        isOdd = !isOdd;
    };

    const onPausedUpdate = (event: CustomEvent<boolean>) => {
        paused = event.detail;
    };
</script>

<Player
    theme="dark"
    bind:paused={paused}
    bind:currentTime={currentTime}
    on:vmCurrentTimeChange={onTimeUpdate}
    on:vmPausedChange={onPausedUpdate}
    controls
    bind:muted={muted}
>
    {#key link.url}
        {#if link.type === SourceType.DailyMotion}
            <Dailymotion videoId={link.url} />
        {/if}
    {/key}
</Player>

<style lang="scss">
    vm-player {
        max-width: 100%;
        max-height: 100%;
        width: 100%;
        height: 100%;
    }
</style>
