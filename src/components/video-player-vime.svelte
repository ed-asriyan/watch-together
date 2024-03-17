<script lang="ts">
    import { type Link, LinkType } from '../normalize-link';
    import { Player, Dailymotion, DefaultUi } from '@vime/svelte';

    export let link: Link;
    export let time: number;
    export let paused: boolean;

    let player: Player;

    let isOdd = false;
    const onTimeUpdate = (event: CustomEvent<number>) => {
        // here is the bug in vime:
        // after updating currentTime from outside, vime player sends two events in a row:
        // 1st: vmCurrentTimeChange with new time
        // 2nd: vmCurrentTimeChange with old time
        // this immitates that user "scrolled back" to the previous time
        if (isOdd) {
            console.log('local', event.detail);
            time = event.detail;
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
    bind:currentTime={time}
    on:vmCurrentTimeChange={onTimeUpdate}
    on:vmPausedChange={onPausedUpdate}
    controls
    muted
>
    {#key link.url}
        {#if link.type === LinkType.DailyMotion}
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
