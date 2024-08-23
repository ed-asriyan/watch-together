<script lang="ts">
    import { _ } from 'svelte-i18n';
    import Message from './message.svelte';
    import Lock from '../lock.svelte';
    import type { Room } from '../../../stores/room';
    import { fade } from 'svelte/transition';

    export let room: Room;
    export let displayInput: boolean;

    $: users = room?.users;
    $: messages = room?.messages;

    let input: string;
    let lockState: boolean = false;
    let inputElement;

    $: inputVisibility = displayInput || lockState || input;

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

    <form class="uk-form uk-width-1-1" transition:fade style:visibility={inputVisibility ? '' : 'collapse'} on:submit|preventDefault={sendMessage}>
        <input bind:this={inputElement} class="uk-input uk-width-1-1" bind:value={input} placeholder={$_('player.chat.inputPlaceholder')} />
        <span
            class="lock-btn uk-text-large"
            transition:fade
        >
            <Lock bind:locked={lockState} />
    </span>
    </form>
</div>

<style lang="scss">
    .chat {
        position: absolute;
        left: 1rem;
        bottom: 5rem;
        z-index: 100;
        width: min(min(30%, 30rem), 100%);
    }

    @media (max-width : 675px) {
        .chat {
            bottom: 4rem;
            left: 0;
        }
    }

    .lock-btn {
        position: absolute;
        bottom: 0.15rem;
        right: 0.5rem;
        text-decoration: none;
    }
</style>