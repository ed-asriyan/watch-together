<script lang="ts">
    import { _ } from 'svelte-i18n';
    import type { User } from '../../stores/bound-user';

    export let user: User;
    export let myName: string;
    export let me: boolean;
    export let status: string;

    const maxLength = 10;

    const updateName = function () {
        if (me) {
            myName = prompt($_('users.nameEditPromt', { values: { maxLength }}), myName);
        }
    };

    const emojiRegex = /^\p{Emoji}$/u;
    const isEmoji = function (text: string): boolean {
       return emojiRegex.test(text);
    };
</script>

<div
    class="tile user uk-text-center uk-flex uk-flex-column uk-flex-center uk-flex-middle uk-flex-middle uk-margin-small-right uk-margin-small-left"
>
    <div
        class="uk-text-emphasis uk-margin-small-top"
        class:pointer={me}
        class:uk-text-large={user.name.length === 1 || isEmoji(user.name)}
        on:click={updateName}
        uk-tooltip={me ? $_('users.nameEdit') : undefined }
    >
        { user.name.slice(0, maxLength) }
    </div>
    <span class="uk-text-muted uk-text-small">
        {#if me}
            { $_('you') }
        {:else}
            { status }
        {/if}
    </span>
</div>

<style lang="scss">
    .user {
        height: 4.5rem;
        width: 4.5rem;
        text-wrap: wrap;
        padding: 0.5rem;
    }
</style>