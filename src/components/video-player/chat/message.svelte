<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { fade, slide } from 'svelte/transition';
    import type { User } from '../../../stores/room/bound-users';
    import type { Message } from '../../../stores/room/bound-messages';
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
</script>

<div in:slide>
    <div transition:fade class="message uk-text-break">
        <span style:color={stringToColor(message.userId)}>{ users.find(user => user.id == message.userId)?.name || $myNameStore }</span>: { message.text }
    </div>
</div>

<style lang="scss">
    .message {
        color: white;
        text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
    }
</style>