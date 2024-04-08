<script lang="ts">
    import { _, locale } from 'svelte-i18n';
    import { locales } from '../i18n/index';
    import { track, ClickEvent, LocaleChangedEvent } from '../analytics.svelte';


    const onLanguageChangeClick = function () {
        track(new ClickEvent({ target: 'language_selector' }));
    };

    const onLanguageChanged = function () {
        track(new LocaleChangedEvent({ locale: $locale }));
    };
</script>

<select class="uk-button uk-button-default uk-text-center" bind:value={$locale} on:change={onLanguageChanged} on:click={onLanguageChangeClick}>
    {#each Object.entries(locales) as lang}
        <option value={ lang[0] }>{ lang[1].locale.flag } { lang[1].locale.name }</option>
    {/each}
</select>
