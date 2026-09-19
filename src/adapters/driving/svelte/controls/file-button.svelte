<script lang="ts">
    import { _ } from 'svelte-i18n';
    import Loader from '../loader.svelte';
    import { useSession } from '../session-context';

    interface Props {
        /** Offered inside the player when a torrent stalls: local copy only. */
        forceLocal?: boolean;
    }

    let { forceLocal = false }: Props = $props();

    const { commands, view } = useSession();
    const source = view.source;

    let input: HTMLInputElement | undefined = $state();
    let pending = $state(false);

    const pick = async function (file: File | undefined) {
        if (!file) return;
        const canStream = !forceLocal && Boolean(navigator.serviceWorker);
        if (canStream && confirm($_('selectVideo.file.streamingConfirmation'))) {
            pending = true;
            try {
                const result = await commands.shareLocalFile(file);
                if (result.status !== 'shared') {
                    alert($_('selectVideo.file.streamingFailed'));
                }
            } finally {
                pending = false;
            }
        } else {
            await commands.playLocalFilePrivately(file);
        }
    };
</script>

<input
    bind:this={input}
    type="file"
    onchange={(e) => pick((e.currentTarget as HTMLInputElement).files?.[0])}
/>
<button disabled={pending} onclick={() => input?.click()} class="uk-button uk-button-default">
    {#if pending}
        <Loader ratio={0.6} /> { $_('selectVideo.file.streamingPending') }
    {:else if $source.kind === 'localOnly'}
        { $_('selectVideo.file.selectAnother') }
    {:else if $source.kind === 'magnet'}
        { $_('selectVideo.file.selectAnotherStream') }
    {:else}
        { $_('selectVideo.file.select') }
    {/if}
</button>

<style lang="scss">
    input { display: none; }
</style>
