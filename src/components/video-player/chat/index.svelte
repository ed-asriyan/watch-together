<script lang="ts">
    import { preventDefault } from 'svelte/legacy';

    import { onMount, onDestroy, tick } from 'svelte';
    import { fade } from 'svelte/transition';
    import { _ } from 'svelte-i18n';
    import MessageComponent, { type GroupedMessages } from './message.svelte';
    import { MessageType, type Message } from '../../../stores/room/bound-messages';
    import Lock from '../lock.svelte';
    import type { Room } from '../../../stores/room';
    import { groupConsecutiveElements, sleep } from '../../../utils';
    import { MessageSentEvent, track } from '../../../analytics.svelte';

    const temporaryUnlockTimeout = 10;

    interface Props {
        room: Room;
        displayInput: boolean;
    }

    let { room, displayInput }: Props = $props();

    let users = $derived(room?.users);
    let messagesStore = $derived(room?.messages);
    let messages = $derived($messagesStore.filter(({ type }) => type !== MessageType.reaction));

    let input: string = $state();
    let lockState: boolean = $state(false);
    let temporaryUnlock: number = $state(0);
    let inputElement: HTMLInputElement = $state();

    let inputVisibility = $derived(displayInput || lockState || input || temporaryUnlock);

    const groupByType = function (messages: Message[]): GroupedMessages[] {
        return groupConsecutiveElements(messages, (m1, m2) => 
            m1.type !== MessageType.regular
            && m2.type !== MessageType.regular
            && m1.type === m2.type
            && m1.text === m2.text
        );
    }

    const sendMessage = function () {
        if (!input) return;
        messagesStore.sendMessage(input);
        input = '';
        track(new MessageSentEvent(room, { messageType: MessageType.regular }));
    };

    const resetTimeout = function () {
        if (temporaryUnlock) {
            clearTimeout(temporaryUnlock);
        }
        temporaryUnlock = setTimeout(async () => {
            temporaryUnlock = 0;
            await tick();
            inputElement?.focus();
            await tick();
            inputElement?.focus();
        }, temporaryUnlockTimeout * 1000);
    }

    const onKeyPress = async function (event: KeyboardEvent) {
        resetTimeout();
        if ((event.key === 'q' || event.key === 'Q') && document.activeElement !== inputElement) {
            event.preventDefault();
            resetTimeout();
            await tick();
            inputElement?.focus();
            await tick();
            inputElement?.focus();
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
            {#each groupByType(messages) as messageGroup (messageGroup.map(({ id }) => id).join('.'))}
                <MessageComponent messageGroup={messageGroup} users={$users} />
            {/each}
        </div>
    {/if}

    <form class="uk-form uk-width-1-1" transition:fade style:visibility={inputVisibility ? '' : 'collapse'} onsubmit={preventDefault(sendMessage)}>
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
            <div class="video-text tooltip uk-with-1-1 uk-text-left" out:fade>{ $_('player.chat.inputReminder') }</div>
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
    }
</style>