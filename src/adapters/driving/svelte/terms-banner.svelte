<script lang="ts">
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
    import { _ } from 'svelte-i18n';
    import Interpolator from './interpolator.svelte';

    // A per-viewer UI preference: how many times this was already shown.
    // Browser storage is the right home for it — it is not shared state and
    // nothing reads it back, so it needs no port.
    const KEY = 'terms-banner-shown-times';
    const LIMIT = 10;

    const read = function (): number {
        try {
            return Number(localStorage.getItem(KEY) ?? '0') || 0;
        } catch {
            return LIMIT;
        }
    };

    let shown = $state(read());
    let visible = $state(false);

    onMount(() => {
        if (shown < LIMIT) {
            try {
                localStorage.setItem(KEY, String(shown + 1));
            } catch { /* private mode: just do not count it */ }
            const id = setTimeout(() => (visible = true), 5000);
            return () => clearTimeout(id);
        }
    });
</script>

{#if visible}
    <div transition:fade class="terms uk-text-center">
        <Interpolator text={$_('termsAndConditionsReminder')}>
            {#snippet children({ data })}
                {#if data.name === 'termsAndConditions'}
                    <a href="/terms-and-conditions.txt" class="uk-text-muted" target="_blank">{ data.text }</a>
                {/if}
                {#if data.name === 'privacyPolicy'}
                    <a href="/privacy-policy.txt" class="uk-text-muted" target="_blank">{ data.text }</a>
                {/if}
            {/snippet}
        </Interpolator>
    </div>
{/if}

<style lang="scss">
    .terms {
        position: fixed;
        left: 0;
        top: 6rem;
        z-index: 2;
        width: 100%;
    }
</style>
