<script lang="ts">
    export let locked: boolean;
</script>

<span class="lock pointer" on:click={() => locked = !locked }>
    {#if locked}
        🔒
    {:else}
        🔓
    {/if}
</span>

<style lang="scss">
    .lock {
        z-index: 101;
        opacity: 0.7;

        transition: opacity 100ms ease-in-out;

        &:hover {
            opacity: 1;
        }
    }
</style>