<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { track, ClickEvent } from '../analytics';
    import type { LocalRoom } from '../stores/local-room';

    export let room: LocalRoom;

    $: blobUrl = room.blobUrl;
    $: fileName = room.fileName;

    let input: HTMLInputElement;

    const loadSource = async function (file: any): Promise<void> {
        room.blobUrl.set(window.URL.createObjectURL(file) as string);
        room.fileName.set(file.name);
        track(new trackClick({ target: 'file_select' }));
    };
</script>

<input bind:this={input} type="file" on:change={e => loadSource(e.target.files[0])}/>
<button on:click={() => input.click()} class="uk-button uk-button-default block">
    {#if $blobUrl}
        { $_('selectVideo.file.selectAnother') }
    {:else}
        { $_('selectVideo.file.select') }
    {/if}
</button>

<style lang="scss">
    input {
        display: none;
    }
</style>
