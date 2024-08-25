<script lang="ts" context="module">
    import type { Message } from '../../../stores/room/bound-messages';

    export type GroupedMessages = Message[];
</script>

<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { fade, slide } from 'svelte/transition';
    import { MessageType } from '../../../stores/room/bound-messages';
    import type { User } from '../../../stores/user';
    import { me } from '../../../stores/me';

    export let messageGroup: GroupedMessages;
    export let users: User[];

    const getUser = function (userId: string): User | undefined {
        return users.find(({ id }) => id == userId);
    };

    const secondsToTimeStr = function (seconds: number): string {
        const date = new Date(0);
        date.setSeconds(seconds);
        return date.toISOString().slice(14, 19);
    };

    $: messageText = (function (): string {
        const message = messageGroup[0];
        switch (message.type) {
            case MessageType.regular:
                return message.text;
            case MessageType.seek:
                return $_('player.chat.message.seeked', { values: { time: secondsToTimeStr(+message.text) } });
            case MessageType.pause:
                return $_('player.chat.message.paused', { values: { time: secondsToTimeStr(+message.text) } });
            case MessageType.play:
                return $_('player.chat.message.played', { values: { time: secondsToTimeStr(+message.text) } });
            case MessageType.selectedLocalFile:
                return $_('player.chat.message.selectedLocalFile');
        }
        return '';
    })();
</script>

<div transition:slide>
    {#if messageText.trim() }
        <div transition:fade class="video-text uk-text-break" class:user-message={messageGroup[0].type === MessageType.regular}>
            {#each new Set(messageGroup.map(({ userId }) => userId)) as userId, i}
                {#if messageGroup.length > 1}
                    {#if i > 0 && i < messageGroup.length - 1}
                        ,
                    {:else if i === messageGroup.length - 1}
                    &nbspand
                    {/if}
                {/if}
                <span style:color={getUser(userId)?.color}>
                    { getUser(userId)?.name || `${$me.name} (${$_('you')})` }
                </span>
            {/each}
            {#if messageGroup[0].type === MessageType.regular}:{/if}
            { messageText }
        </div>
    {/if}
</div>

<style lang="scss">
    .user-message {
        color: white;
    }
</style>