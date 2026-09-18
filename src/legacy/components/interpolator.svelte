<script lang="ts">
    // component compatible with https://github.com/kaisermann/svelte-i18n/blob/main/docs/Formatting.md
    const regex = /({[^}]*}[^{]*{\/[^}]*}|{[^}]+})/i;
    const itemRegex = /{([^}]*)}([^{]*){\/[^}]*}/i;

    interface Props {
        text: string;
        children?: import('svelte').Snippet<[any]>;
    }

    let { text, children }: Props = $props();

    const getData = function (item: string) {
        const result = item.split(itemRegex);
        return { name: result[1], text: result[2] }
    };
</script>

{#each text.split(regex) as item}
    {#if item.startsWith('{')}
        {@render children?.({ data: getData(item), })}
    {:else}
        { item }
    {/if}
{/each}
