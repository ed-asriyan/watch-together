<script lang="ts">
    import { fade } from 'svelte/transition';
    import { useSession } from '../session-context';
    import { ui } from '../../../../composition/config';

    interface Props {
        displayButtons: boolean;
    }

    let { displayButtons }: Props = $props();

    const { commands, view } = useSession();
    const feed = view.feed;

    const animation = function (): string {
        const duration = Math.round(Math.random() * 2000 + 2000);
        const endLeft = Math.round(Math.random() * 50);
        const endBottom = Math.round(Math.random() * 50 + 100);
        return `--duration:${duration}ms;--end-left:${endLeft}%;--end-bottom:${endBottom}%;`;
    };
</script>

{#if displayButtons}
    <div class="reactions-btns noselect" transition:fade>
        {#each ui.reactions as reaction}
            <span class="reaction-btn pointer" onclick={() => commands.throwReaction(reaction)}>{ reaction }</span>
        {/each}
    </div>
{/if}

{#each $feed.reactions as reaction (reaction.id)}
    {#each Array(reaction.count) as _unused}
        <div class="reaction noselect" style={animation()}>{ reaction.emoji }</div>
    {/each}
{/each}

<style lang="scss">
    .reactions-btns {
        position: absolute;
        right: 1rem;
        bottom: 5rem;
        z-index: 10;

        & .reaction-btn {
            display: inline-grid;
            user-select: none;
            opacity: 0.7;
            font-size: 3rem;
            margin: 0.5rem;
            filter: grayscale(50%);
            transform: scale(1);

            &:hover {
                filter: none;
                opacity: 1;
                transform: scale(1.002);
                transition: transform 0.3s cubic-bezier(0.5, 400, 0.5, -400);
            }
        }
    }

    @media (max-width: 675px) {
        .reactions-btns {
            left: 0;
            width: 100%;
            margin: 0;
            bottom: -1rem;

            & .reaction-btn { font-size: 2rem; }
        }
    }

    .reaction {
        position: absolute;
        display: inline-block;
        font-size: 5rem;
        bottom: var(--end-bottom);
        z-index: 99;
        animation-iteration-count: 1;
        animation-duration: 1s;
        animation:
            up var(--duration) ease-in-out,
            left var(--duration) ease,
            sideWays 1s ease-in-out infinite alternate;
    }

    @keyframes up {
        0% { bottom: -10%; }
        100% { bottom: var(--end-bottom); }
    }

    @keyframes left {
        0% { right: -10%; }
        50% { right: var(--end-left); }
        100% { right: var(--end-left); }
    }

    @keyframes sideWays {
        0% { margin-left: 0px; transform: rotate(20deg); }
        100% { margin-left: 50px; transform: rotate(-20deg); }
    }
</style>
