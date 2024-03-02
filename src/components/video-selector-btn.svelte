<script lang="ts">
    import { trackClick } from '../google-analytics';

    export let videoUri: string;
    export let fileName: string;

    let input: HTMLInputElement;

    const loadSource = async function (file: any): Promise<void> {
        console.log(file);
        videoUri = window.URL.createObjectURL(file) as string;
        fileName = file.name;
        trackClick('file_select');
    };
</script>

<input bind:this={input} type="file" on:change={e => loadSource(e.target.files[0])}/>
<button on:click={() => input.click()} class="uk-button uk-button-default">
    {#if videoUri}
        Click to select another video
    {:else}
        Click to select video file
    {/if}
</button>
{#if fileName}
    <span class="uk-margin-left">{fileName}</span>
{/if}

<style lang="scss">
    input {
        display: none;
    }
</style>
