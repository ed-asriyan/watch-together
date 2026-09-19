<script lang="ts">
    import { locale } from 'svelte-i18n';
    import { locales } from '../../../../i18n/index';
    import { useSession } from '../session-context';

    const { commands } = useSession();

    // The locale is part of the persisted profile, so the UI cannot own it
    // alone — hence `setLocale` on the command port. svelte-i18n's own store
    // still drives rendering; the command is what makes it survive a reload
    // and what makes the change measurable.
    const onChange = function (event: Event) {
        const value = (event.currentTarget as HTMLSelectElement).value;
        locale.set(value);
        commands.setLocale(value);
    };
</script>

<select class="uk-button uk-button-default uk-text-center" value={$locale} onchange={onChange}>
    {#each Object.entries(locales) as [code, messages]}
        <option value={code}>{ messages.locale.flag } { messages.locale.name }</option>
    {/each}
</select>
