<script lang="ts">
    import { onMount, onDestroy, tick } from 'svelte';
    import { fade } from 'svelte/transition';
    import { _ } from 'svelte-i18n';
    import Message from './message.svelte';
    import Lock from '../lock.svelte';
    import type { Room } from '../../../stores/room';
    import { sleep } from '../../../utils';

    const temporaryUnlockTimeout = 10;

    export let room: Room;
    export let displayInput: boolean;

    $: users = room?.users;
    $: messages = room?.messages;

    let input: string;
    let lockState: boolean = false;
    let temporaryUnlock: number = 0;
    let inputElement: HTMLInputElement;

    $: inputVisibility = displayInput || lockState || input || temporaryUnlock;

    const sendMessage = function () {
        if (!input) return;
        messages.sendMessage(input);
        input = '';
    };

    const resetTimeout = function () {
        if (temporaryUnlock) {
            clearTimeout(temporaryUnlock);
        }
        temporaryUnlock = setTimeout(async () => {
            temporaryUnlock = 0;
            await tick()
            inputElement.focus();
        }, temporaryUnlockTimeout * 1000);
    }

    const onKeyPress = async function (event: KeyboardEvent) {
        resetTimeout();
        if ((event.key === 'x' || event.key === 'X') && document.activeElement !== inputElement) {
            event.preventDefault();
            resetTimeout();
            await tick();
            inputElement.focus();
        }
    };

    onMount(() => {
        window.addEventListener('keydown', onKeyPress);
    });

    onDestroy(() => {
        window.removeEventListener('keydown', onKeyPress);
    });
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
    {#if !inputVisibility}
        {#await sleep(3000)}
            <div class="tooltip uk-with-1-1 uk-text-left" out:fade>{ $_('player.chat.inputReminder') }</div>
        {:then x} 
        {/await}
    {/if}
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

    .tooltip {
        position: absolute;
        bottom: 0;
        text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
    }
</style>