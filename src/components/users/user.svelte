<script lang="ts">
    import { _ } from 'svelte-i18n';
    import type { User } from '../../stores/bound-user';

    export let user: User;
    export let myName: string;
    export let me: boolean;

    const maxLength = 10;

    const updateName = function () {
        myName = prompt($_('users.nameEditPromt', { values: { maxLength }}), myName);
    };

    const code = function (str: string): number {
        return [...str].reduce((a, x) => a + x.charCodeAt(0), 0);
    };

    function pseudoRandom(seed) {
        return function() {
            seed = seed * 16807 % 2147483647;
            return seed;
        }
    }

    const stringToColor = function (str: string): string {
        const rand = pseudoRandom(code(str + user.id.slice(1)));
        const randColor = () => (rand() % 100 + 64).toString(16).padStart(2, '0');
        return `#${randColor()}${randColor()}${randColor()}70`;
    };

    const emojiRegex = /^\p{Emoji}$/u;
    const isEmoji = function (text: string): boolean {
       return emojiRegex.test(text);
    };
</script>

<div
    class="user uk-text-center uk-flex uk-flex-column uk-flex-center uk-flex-middle uk-flex-middle uk-margin-right"
    style:background-color={stringToColor(user.name)}
>
    <div class="uk-text-emphasis uk-margin-small-top" class:uk-text-large={user.name.length === 1 || isEmoji(user.name)}>
        { user.name.slice(0, maxLength) }
    </div>
    <span class="uk-text-muted uk-text-small">
        {#if me}
            <u on:click={updateName} class="pointer">{ $_('users.nameEdit') }</u>
        {:else}
            online
        {/if}
    </span>
</div>

<style lang="scss">
    .user {
        height: 4rem;
        width: 4rem;
        min-height: 4rem;
        min-width: 4rem;
        border-radius: 1.5rem;
        border: 1px solid #7d7d7d;
        text-wrap: wrap;
        padding: 0.5rem;
    }
</style>