<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { NICKNAME_MAX_LENGTH } from '../../../../domains/watch-session/model/ids';
    import { useSession } from '../session-context';

    interface Props {
        name: string;
        colour: string;
        canEdit: boolean;
        status: string;
    }

    let { name, colour, canEdit, status }: Props = $props();

    const { commands } = useSession();

    const emojiRegex = /^\p{Emoji}$/u;

    const rename = function () {
        if (!canEdit) return;
        const next = prompt($_('users.nameEditPromt', { values: { maxLength: NICKNAME_MAX_LENGTH } }), name);
        if (next === null) return;
        commands.renameSelf(next);
    };
</script>

<div class="user uk-text-center uk-flex uk-flex-column uk-flex-center uk-flex-middle uk-margin-small-right uk-margin-small-left">
    <div
        class="uk-text-emphasis uk-margin-small-top"
        class:pointer={canEdit}
        class:text-large={name.length === 1 || emojiRegex.test(name)}
        style:color={colour}
        onclick={rename}
        uk-tooltip={canEdit ? $_('users.nameEdit') : undefined}
    >
        { name.slice(0, NICKNAME_MAX_LENGTH) }
    </div>
    <span class="uk-text-muted uk-text-small">{ status }</span>
</div>

<style lang="scss">
    .user {
        height: 4.5rem;
        width: 4.5rem;
        text-wrap: wrap;
        padding: 0.5rem;
        font-size: 1.5rem;
    }
    .text-large { font-size: 3rem; }
</style>
