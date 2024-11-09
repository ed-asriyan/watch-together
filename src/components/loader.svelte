<script lang="ts">
    interface Props {
        ratio?: number;
        children?: import('svelte').Snippet;
    }

    let { ratio = 3, children }: Props = $props();

    const children_render = $derived(children);
</script>

<span class="container">
    <span uk-spinner={`ratio: ${ratio}`}></span>
    <span>{@render children_render?.()}</span>
</span>
