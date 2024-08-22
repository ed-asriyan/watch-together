<script lang="ts">
    import { Player, Dailymotion } from '@vime/svelte';
    import { type Source, SourceType } from '../../normalize-source';

    export let source: Source;
    export let currentTime: number;
    export let paused: boolean;
    export let muted: boolean;

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
    {#key source.src}
        {#if source.type === SourceType.DailyMotion}
            <Dailymotion videoId={source.src} />
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
