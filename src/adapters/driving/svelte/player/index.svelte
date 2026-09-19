<script lang="ts">
    import { onDestroy } from 'svelte';
    import { _ } from 'svelte-i18n';
    import 'vidstack/bundle';
    import Loader from '../loader.svelte';
    import Overlay from './overlay.svelte';
    import FileButton from '../controls/file-button.svelte';
    import { useSession } from '../session-context';
    import { cursorActive } from '../cursor';

    const { player, view } = useSession();
    const source = view.source;
    const playback = view.playback;
    const delivery = view.delivery;

    /**
     * The whole player component is now four lines of wiring.
     *
     * No `bind:paused`, no `bind:currentTime`, no `src`. The element is handed
     * to whoever implements `MediaPlayerPort`, and that adapter sets the
     * source, applies corrections and reports events. This view does not know
     * the video URL, does not know the position, and cannot start playback.
     */
    let element: HTMLElement | undefined = $state();
    $effect(() => {
        if (element) {
            player.mount(element);
            return () => player.unmount();
        }
    });
    onDestroy(() => player.unmount());

    let innerWidth: number = $state(0);
    let chromeVisible = $derived($playback.paused || $cursorActive || innerWidth < 675);
    let stalledOnPeers = $derived($delivery.visible && $playback.stalled && !$delivery.seeding);
</script>

<svelte:window bind:innerWidth />

<div class="viewer uk-text-small uk-flex uk-flex-center uk-flex-column uk-text-break uk-text-center">
    {#if $source.empty}
        <div class="uk-text-muted">{ $_('player.placeholder') }</div>
    {:else if !$source.valid}
        <div class="uk-text-muted">{ $_('selectVideo.link.hintInvalid') }</div>
    {:else}
        {#if $source.resolving}
            <Loader/>
            <div class="uk-margin-top">{ $_('player.analyzing') }</div>
        {/if}
        {#if stalledOnPeers}
            <div class="uk-margin-top uk-text-center">
                { $_('player.isHostActive') }
                <br class="uk-margin"/>
                <FileButton forceLocal={true} />
            </div>
        {/if}
        <!--
            `muted` is set as an attribute, not only as a property from the
            adapter: the custom element upgrades asynchronously and a property
            written before that does not survive. Starting muted is what makes
            a remote resume playable at all — the browser refuses audible
            playback without a gesture this client never made.
        -->
        <media-player
            bind:this={element}
            class="uk-width-1-1 uk-height-1-1"
            muted={$playback.muted}
            playsInline
            preload="metadata"
            crossOrigin
        >
            <media-provider></media-provider>
            <media-audio-layout></media-audio-layout>
            <media-video-layout></media-video-layout>
        </media-player>
    {/if}

    <Overlay visible={chromeVisible} />
</div>

<style lang="scss">
    .viewer {
        width: 100%;
        height: 100%;
    }

    @media (max-width: 675px) {
        .viewer { height: calc(100% - 6rem); }
    }

    :global(media-player) { border: none !important; }
    :global(media-fullscreen-button) { opacity: 0; visibility: hidden; }
</style>
