<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { track, ClickEvent } from '../../analytics.svelte';
    import Loader from '../loader.svelte';
    import { blob } from '../../stores/blob';
    import { sendFile } from '../../stores/web-torrent';
    import normalizeSource, { SourceType } from '../../normalize-source';
    import type { Room } from '../../stores/room';

    interface Props {
        forceLocal?: boolean;
        room: Room;
    }

    let { forceLocal = false, room }: Props = $props();

    let url = $derived(room.url);

    let input: HTMLInputElement = $state();

    let sharingPending = $state(false);
    const loadSource = async function (file: any): Promise<void> {
        if (!forceLocal && navigator.serviceWorker && confirm($_('selectVideo.file.streamingConfirmation'))) {
            sharingPending = true;
            try {
                $url = await sendFile(file);
            } catch (e) {
                alert($_('selectVideo.file.streamingFailed'));
                console.trace(e);
            } finally {
                sharingPending = false;
            }
        } else {
            $blob = file;
        }
        room?.currentTime.set(0);
        track(new ClickEvent(room, { target: 'file_select' }));
    };
</script>

<input bind:this={input} type="file" onchange={e => loadSource(e.target.files[0])}/>
<button disabled={sharingPending} onclick={() => input.click()} class="uk-button uk-button-default">
    {#if sharingPending}
        <Loader ratio={0.6} /> { $_('selectVideo.file.streamingPending') }
    {:else if $blob}
        { $_('selectVideo.file.selectAnother') }
    {:else if normalizeSource($url)?.type === SourceType.magnet}
        { $_('selectVideo.file.selectAnotherStream') }
    {:else}
        { $_('selectVideo.file.select') }
    {/if}
</button>

<style lang="scss">
    input {
        display: none;
    }
</style>
