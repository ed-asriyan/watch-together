<script lang="ts">
    import { fade } from 'svelte/transition';
    import { _ } from 'svelte-i18n';
    import { useSession } from './session-context';

    const { view } = useSession();
    const connection = view.connection;

    // The view hands over a CODE, never a sentence — wording is this layer's
    // job. Legacy had a `noInternet` string with no code behind it at all.
    const messageKey: Record<string, string> = {
        offline: 'sync.offline',
        'clock-unsynced': 'sync.clockUnsynced',
        'write-rejected': 'sync.writeRejected',
        failed: 'sync.failed',
        'read-only': 'sync.writeRejected',
    };
</script>

{#if $connection.problem}
    <div class="banner uk-text-center uk-text-small" transition:fade>
        { $_(messageKey[$connection.problem] ?? 'sync.failed') }
    </div>
{/if}

<style lang="scss">
    .banner {
        position: fixed;
        left: 0;
        top: 0;
        z-index: 300;
        width: 100%;
        padding: 0.4rem;
        background-color: #8b0000;
        color: white;
    }
</style>
