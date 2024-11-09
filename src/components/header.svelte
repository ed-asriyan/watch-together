<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { fade } from 'svelte/transition';

    interface Props {
        display: boolean;
    }

    let { display }: Props = $props();
    let isOnline: boolean = $state();
</script>

<svelte:window bind:online={isOnline}></svelte:window>

{#if display || !isOnline}
    <h1 class="header glass" class:offline={!isOnline} transition:fade>
        {#if isOnline}
            🎬 Watch Together
        {:else}
            { $_('noInternet')}
        {/if}
    </h1>
{/if}

<style lang="scss">
    .header {
        position: fixed;
        color: white;
        width: 100%;
        left: 0;
        top: 0;
        text-align: center;
        font-family: Avenir Next;
        font-size: 2rem;
        padding: 1rem 0;
        z-index: 200;
        transition: background-color 500ms ease-in-out;
        border-left: none;
    }

    .offline {
        background-color: red;
    }
</style>