<script lang="ts">
    // component compatible with https://github.com/kaisermann/svelte-i18n/blob/main/docs/Formatting.md
    const regex = /({[^}]*}[^{]*{\/[^}]*}|{[^}]+})/i;
    const itemRegex = /{([^}]*)}([^{]*){\/[^}]*}/i;

    export let text: string;

    const getData = function (item: string) {
        const result = item.split(itemRegex);
        return { name: result[1], text: result[2] }
    };
</script>

{#each text.split(regex) as item}
    {#if item.startsWith('{')}
        <slot data={getData(item)}/>
    {:else}
        { item }
    {/if}
{/each}
