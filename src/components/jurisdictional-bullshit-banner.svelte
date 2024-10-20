<script lang="ts">
    import { fade } from 'svelte/transition';
    import { _ } from 'svelte-i18n';
    import { sleep } from '../utils';
    import Interpolator from './interpolator.svelte';
    import { createLocalStore } from '../stores/local-store';
    import { onMount } from 'svelte';

    const LIMIT = 10;

    const counter = createLocalStore('jurisdictionl-bullshit-banner-shown-times', '0');

    onMount(() => {
        if (+$counter < LIMIT) {
            counter.update((v) => (+v + 1).toString());
        }
    });
</script>

{#if +$counter < LIMIT}
    {#await sleep(5000)}
        <div transition:fade class="terms-and-conditions uk-text-center">
            <Interpolator text={$_('termsAndConditionsReminder')} let:data={data}>
                {#if data.name === 'termsAndConditions'}
                    <a href="/terms-and-conditions.txt" class="uk-text-muted" target="_blank">{ data.text }</a>
                {/if}
                {#if data.name === 'privacyPolicy'}
                <a href="/privacy-policy.txt" class="uk-text-muted" target="_blank">{ data.text }</a>
            {/if}
            </Interpolator>
        </div>
    {:then a}
    {/await}
{/if}

<style lang="scss">
    .terms-and-conditions {
        position: fixed;
        left: 0;
        top: 6rem;
        z-index: 2;
        width: 100%;
    }
</style>
