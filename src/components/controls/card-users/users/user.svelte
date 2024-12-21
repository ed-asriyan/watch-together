<script lang="ts">
    import { _ } from 'svelte-i18n';

    interface Props {
        userName: string;
        canEdit: boolean;
        status: string;
    }

    let { userName = $bindable(), canEdit, status }: Props = $props();

    const maxLength = 10;

    const updateName = function () {
        if (canEdit) {
            userName = prompt($_('users.nameEditPromt', { values: { maxLength }}), userName) || '';
        }
    };

    const emojiRegex = /^\p{Emoji}$/u;
    const isEmoji = function (text: string): boolean {
       return emojiRegex.test(text);
    };
</script>

<div
    class="user uk-text-center uk-flex uk-flex-column uk-flex-center uk-flex-middle uk-flex-middle uk-margin-small-right uk-margin-small-left"
>
    <div
        class="uk-text-emphasis uk-margin-small-top"
        class:pointer={canEdit}
        class:text-large={userName.length === 1 || isEmoji(userName)}
        onclick={updateName}
        uk-tooltip={canEdit ? $_('users.nameEdit') : undefined }
    >
        { userName.slice(0, maxLength) }
    </div>
    <span class="uk-text-muted uk-text-small">
        { status }
    </span>
</div>

<style lang="scss">
    .user {
        height: 4.5rem;
        width: 4.5rem;
        text-wrap: wrap;
        padding: 0.5rem;
        font-size: 1.5rem;
    }

    .text-large {
        font-size: 3rem;
    }
</style>
