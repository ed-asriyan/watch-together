<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { track, ClickEvent } from '../analytics.svelte';
    import { blobUrl } from '../stores/blob';
    import { sendFile } from '../stores/web-torrent';
    import normalizeLink, { SourceType } from '../normalize-link';

    export let url: string = '';
    export let forceLocal: boolean = false;

    let input: HTMLInputElement;

    let sharingPending = false;
    const loadSource = async function (file: any): Promise<void> {
        if (!forceLocal && navigator.serviceWorker && confirm($_('selectVideo.file.streamingConfirmation'))) {
            sharingPending = true;
            try {
                url = await sendFile(file);
            } catch (e) {
                alert($_('selectVideo.file.streamingFailed'));
                console.trace(e);
            } finally {
                sharingPending = false;
            }
        } else {
            $blobUrl = window.URL.createObjectURL(file);
        }
        track(new ClickEvent({ target: 'file_select' }));
    };
</script>

<input bind:this={input} type="file" on:change={e => loadSource(e.target.files[0])}/>
<button disabled={sharingPending} on:click={() => input.click()} class="uk-button uk-button-default">
    {#if sharingPending}
        { $_('selectVideo.file.streamingPending') }
    {:else if $blobUrl}
        { $_('selectVideo.file.selectAnother') }
    {:else if normalizeLink(url)?.type === SourceType.magnet}
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
