<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { fade } from 'svelte/transition';
</script>

<div class="container" transition:fade>
    <div class="mouse glass"></div>
    {#each $_('scrollUp').split(' ') as word}
    <div class="uk-text-center uk-text-small uk-text-muted uk-text-light">{ word }</div>
    {/each}
</div>

<style lang="scss">
    $height: 4rem;

    .container {
        position: fixed;
        right: 1rem;
        top: calc(50% - $height / 2);
    }
    .mouse {
        margin-left: auto;
        margin-right: auto;
        width: 1.5rem;
        height: $height;
        border-radius: 1rem;
        &::before {
            content: '';
            width: 0.5rem;
            height: 0.5rem;
            position: absolute;
            top: 65%;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(255, 255, 255, .4);
            border-radius: 50%;
            opacity: 1;
            animation: wheel 2s ease-out infinite;
        }
    }

    @keyframes wheel {
        to {
            opacity: 0;
            top: 15%;
        }
    }

    .reverse {
        transform: rotate(180deg)
    }
</style>