<script lang="ts">
    import { _ } from 'svelte-i18n';
    import Message from './message.svelte';
    import type { Room } from '../../../stores/room';
    import { fade } from 'svelte/transition';

    export let room: Room;
    export let displayInput: boolean;

    $: users = room?.users;
    $: messages = room?.messages;

    let input: string;

    const sendMessage = function () {
        if (!input) return;
        messages.addMessage(input);
        input = '';
    };
</script>

<div class="chat">
    {#if messages}
        <div class="messages-box uk-margin-bottom uk-text-left">
            {#each $messages as message (message.id)}
                <Message message={message} users={$users} />
            {/each}
        </div>
    {/if}

    <form class="uk-form uk-width-1-1" transition:fade style:visibility={displayInput ? '' : 'collapse'} on:submit|preventDefault={sendMessage}>
        <input class="uk-input uk-width-1-1" bind:value={input} placeholder={$_('player.chat.inputPlaceholder')} />
    </form>
</div>

<style lang="scss">
    .chat {
        position: absolute;
        left: 1rem;
        bottom: 5rem;
        z-index: 100000;
        width: min(max(30%, 30rem), 100%);
    }

    @media (max-width : 675px) {
        .chat {
            bottom: 4rem;
            left: 0;
        }
    }
</style>