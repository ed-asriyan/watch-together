<script lang="ts">
    import { _, locale } from 'svelte-i18n';
    import { locales } from '../i18n/index';
    import { track, LocaleChangedEvent } from '../analytics.svelte';

    const onLanguageChanged = function () {
        track(new LocaleChangedEvent({ locale: $locale as string }));
    };
</script>

<select class="uk-button uk-button-default uk-text-center" bind:value={$locale} on:change={onLanguageChanged}>
    {#each Object.entries(locales) as lang}
        <option value={ lang[0] }>{ lang[1].locale.flag } { lang[1].locale.name }</option>
    {/each}
</select>
