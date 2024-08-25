<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { fade } from 'svelte/transition';
    import { MessageType, type Message } from '../../../stores/room/bound-messages';
    import type { Room } from '../../../stores/room';
    import { reactions } from '../../../settings';
    import { ReactionSentEvent, track } from '../../../analytics.svelte';

    export let room: Room;
    export let displayButtons: boolean;

    $: messagesStore = room?.messages;
    $: chatReactions = $messagesStore
        .filter(({ type }) => type == MessageType.reaction)
        .map(({ text, id, timestamp }) => ({ id, text, count: Math.round(timestamp * 1000) % 9 + 1 }));

    $: buttonsVisibility = displayButtons;

    const sendReaction = function (reaction: string) {
        room.messages.sendMessage(reaction, MessageType.reaction);
        track(new ReactionSentEvent(room, { reactionEmoji: reaction }));
    };

    const generateAnimation = function (): string {
        const duration = Math.round(Math.random() * 2000 + 2000);
        const endLeft = Math.round(Math.random() * 50);
        const endBottom = Math.round(Math.random() * 50 + 100);
        return `
            --duration:${duration}ms;
            --end-left:${endLeft}%;
            --end-bottom:${endBottom}%;
            `;
    };
</script>

{#if buttonsVisibility}
    <div class="reactions-btns noselect" transition:fade>
        {#each reactions as reaction}
            <span class="reaction-btn pointer" on:click={() => sendReaction(reaction)}>{ reaction }</span>
        {/each}
    </div>
{/if}

{#each chatReactions as reaction (reaction.id)}
    {#each Array(reaction.count) as _}
        <div class="reaction noselect" style={generateAnimation()}>{ reaction.text }</div>
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
            size var(--duration) ease-in-out,
            sideWays 1s ease-in-out infinite alternate,
        ;
    }

    @keyframes up {
        0% { 
            bottom: -10%;
        }

        100% { 
            bottom: var(--end-bottom);
        }
    }

    @keyframes left {
        0% { 
            right: -10%;
        }

        50% { 
            right: var(--end-left);
        }

        100% {
            right: var(--end-left);
        }
    }

    @keyframes sideWays { 
        0% { 
            margin-left: 0px;
            transform: rotate(20deg);
        }
        100% { 
            margin-left: 50px;
            transform: rotate(-20deg);
        }
    }
</style>