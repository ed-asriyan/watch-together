<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { fade, slide } from 'svelte/transition';
    import type { User } from '../../../stores/room/bound-users';
    import { MessageType, type Message } from '../../../stores/room/bound-messages';
    import { myNameStore } from '../../../stores/my-name';

    export let message: Message;
    export let users: User[];

    const stringToColor = function (str: string) {
        const hash = [...str].reduce((hash, char) => char.charCodeAt(0) + ((hash << 5) - hash), 0);
        let colour = '#';
        for (let i = 0; i < 3; i++) {
            const value = 192 + (hash >> (i * 2)) & 0xff;
            colour += value.toString(16).padStart(2, '0');
        }
        return colour;
    };

    const secondsToTimeStr = function (seconds: number): string {
        const date = new Date(0);
        date.setSeconds(seconds);
        return date.toISOString().slice(14, 19);
    }

    const getMessageText = function (): string {
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
    }
</script>

<div in:slide>
    <div transition:fade class="message uk-text-break" class:user={message.type === MessageType.regular}>
        <span style:color={stringToColor(message.userId)}>
            { users.find(user => user.id == message.userId)?.name || $myNameStore }
        </span>{#if message.type === MessageType.regular}:{/if}
        { getMessageText() }
    </div>
</div>

<style lang="scss">
    .message {
        text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
        &.user {
            color: white;
        }
    }
</style>