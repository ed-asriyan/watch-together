<script lang="ts">
    import { onDestroy, onMount, tick } from 'svelte';
    import { fade } from 'svelte/transition';
    import { _ } from 'svelte-i18n';
    import FeedItem from './feed-item.svelte';
    import Lock from '../lock.svelte';
    import { useSession } from '../session-context';

    interface Props {
        displayInput: boolean;
    }

    let { displayInput }: Props = $props();

    const { commands, view } = useSession();
    const feed = view.feed;

    let draft: string = $state('');
    let locked: boolean = $state(false);
    let unlockTimer: ReturnType<typeof setTimeout> | 0 = $state(0);
    let inputElement: HTMLInputElement | undefined = $state();

    let inputVisible = $derived(displayInput || locked || Boolean(draft) || Boolean(unlockTimer));

    const send = function (event: Event) {
        event.preventDefault();
        if (!draft.trim()) return;
        commands.postChatMessage(draft);
        draft = '';
    };

    const resetTimer = function () {
        if (unlockTimer) clearTimeout(unlockTimer);
        unlockTimer = setTimeout(async () => {
            unlockTimer = 0;
            await tick();
            inputElement?.focus();
        }, 10_000);
    };

    const onKeyDown = async function (event: KeyboardEvent) {
        resetTimer();
        if ((event.key === 'q' || event.key === 'Q') && document.activeElement !== inputElement) {
            event.preventDefault();
            await tick();
            inputElement?.focus();
        }
    };

    onMount(() => window.addEventListener('keydown', onKeyDown));
    onDestroy(() => {
        window.removeEventListener('keydown', onKeyDown);
        if (unlockTimer) clearTimeout(unlockTimer);
    });
</script>

<div class="chat">
    <div class="messages-box uk-margin-bottom uk-text-left">
        {#each $feed.items as item (item.id)}
            <FeedItem item={item} />
        {/each}
    </div>

    <form
        class="uk-form uk-width-1-1"
        transition:fade
        style:visibility={inputVisible ? '' : 'collapse'}
        onsubmit={send}
    >
        <input
            bind:this={inputElement}
            class="uk-input uk-width-1-1"
            bind:value={draft}
            placeholder={$_('player.chat.inputPlaceholder')}
        />
        <span class="lock-btn uk-text-large" transition:fade>
            <Lock bind:locked={locked} />
        </span>
    </form>

    {#if !inputVisible}
        <div class="video-text tooltip uk-with-1-1 uk-text-left" out:fade>
            { $_('player.chat.inputReminder') }
        </div>
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

    @media (max-width: 675px) {
        .chat {
            bottom: 3rem;
            width: calc(100% - 2rem);
            left: 1rem;
        }
        .messages-box { margin-bottom: 5rem !important; }
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
