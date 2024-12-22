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
    <div class="header" transition:fade>
        <h1 class="name" class:offline={!isOnline}>
            {#if isOnline}
                🎬 Watch Together
            {:else}
                { $_('noInternet')}
            {/if}
        </h1>
    </div>
{/if}



<style lang="scss">
    .header {
        position: fixed;
        border-left: none;
        z-index: 200;
        width: 100%;
        left: 0;
        top: 0;

        background: linear-gradient(to bottom, rgba(0, 0, 0, 0.2), transparent);

        & .name {
            font-size: 2rem;
            padding: 1rem;
            margin: 0;
            text-align: center;
            font-family: Avenir Next;

            transition: background-color 500ms ease-in-out;
            color: white;
        }
    }

    .offline {
        background-color: red;
    }
</style>