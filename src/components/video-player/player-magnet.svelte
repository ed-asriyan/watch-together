<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { _ } from 'svelte-i18n';
    import { Source, SourceType } from '../../normalize-source';
    import Loader from '../loader.svelte';
    import { getStreamUrl } from '../../stores/web-torrent';
    import { sleep } from '../../utils';
    import VideoPlayerVidstack from './video-player-vidstack.svelte';
    import VideoSelectorBtn from '../controls/video-selector-btn.svelte';
    import type { Room } from '../../stores/room';

    interface Props {
        room: Room;
        source: Source;
        currentTime: number;
        paused: boolean;
        muted: boolean;
        chat?: import('svelte').Snippet;
        children?: import('svelte').Snippet;
    }

    let {
        room,
        source,
        currentTime = $bindable(),
        paused = $bindable(),
        muted = $bindable(),
        chat,
        children
    }: Props = $props();

    const dispatch = createEventDispatcher();

    const children_render = $derived(children);
</script>

{#if !navigator.serviceWorker}
    { $_('player.torrentNotSupported') }
    <div class="chat">
        {@render chat?.()}
    </div>
{:else}
    {#await getStreamUrl(source.src)}
        <Loader />
        {#await sleep(10000)}
        {:then}
            <div class="uk-margin-top uk-text-center">
                { $_('player.isHostActive') }
                <br class="uk-margin"/>
                <VideoSelectorBtn room={room} forceLocal={true} />
            </div>
            <div class="chat">
                {@render chat?.()}
            </div>
        {/await}
    {:then streamUrl}
        <VideoPlayerVidstack
            source={new Source({ type: SourceType.magnet, src: streamUrl })}
            bind:paused={paused}
            bind:currentTime={currentTime}
            bind:muted={muted}
            on:seeked={() => dispatch('seeked')}
            on:seeking={() => dispatch('seeking')}
            on:pause={() => dispatch('pause')}
            on:play={() => dispatch('play')}
            on:timeupdate={() => dispatch('timeupdate')}
        >
            {#snippet children({ source })}
                {@render children_render?.()}
            {/snippet}
        </VideoPlayerVidstack>
    {/await}
{/if}
