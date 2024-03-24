<script lang="ts">
    import { trackClick } from '../google-analytics';
    import type { LocalRoom } from '../stores/local-room';

    export let room: LocalRoom;

    $: blobUrl = room.blobUrl;
    $: fileName = room.fileName;

    let input: HTMLInputElement;

    const loadSource = async function (file: any): Promise<void> {
        room.blobUrl.set(window.URL.createObjectURL(file) as string);
        room.fileName.set(file.name);
        trackClick('file_select');
    };
</script>

<input bind:this={input} type="file" on:change={e => loadSource(e.target.files[0])}/>
<button on:click={() => input.click()} class="uk-button uk-button-default block">
    {#if $blobUrl}
        Click to select another video
    {:else}
        Click to select video file
    {/if}
</button>

<style lang="scss">
    input {
        display: none;
    }
</style>
