<script lang="ts">
    import { fade, slide } from 'svelte/transition';
    import { _ } from 'svelte-i18n';
    import type { FeedItemView } from '../../../../domains/watch-session/ports/inbound/views';

    interface Props {
        item: FeedItemView;
    }

    let { item }: Props = $props();

    const clock = function (seconds: number): string {
        const date = new Date(0);
        date.setSeconds(Math.max(0, Math.round(seconds)));
        return date.toISOString().slice(14, 19);
    };

    /**
     * The view hands over a structured notice, not an i18n key and not a
     * stringified number. Wording and time formatting belong here — legacy
     * shipped `'seek'` with the position stuffed into the message `text`.
     */
    let text = $derived((function (): string {
        if (item.text !== null) return item.text;
        const notice = item.notice;
        if (!notice) return '';
        switch (notice.type) {
            case 'seeked': return $_('player.chat.message.seeked', { values: { time: clock(notice.seconds) } });
            case 'played': return $_('player.chat.message.played', { values: { time: clock(notice.seconds) } });
            case 'paused': return $_('player.chat.message.paused', { values: { time: clock(notice.seconds) } });
            case 'pickedLocalFile': return $_('player.chat.message.selectedLocalFile');
            case 'changedSource': return $_('player.chat.message.changedSource');
        }
    })());
</script>

<div transition:slide>
    {#if text.trim()}
        <div transition:fade class="video-text uk-text-break" class:user-message={item.text !== null}>
            {#each item.authors as author, i}
                {#if i > 0}{ i === item.authors.length - 1 ? ' and ' : ', ' }{/if}
                <span style:color={author.colour}>{ author.name }</span>
            {/each}{#if item.text !== null}:{/if}
            { text }
        </div>
    {/if}
</div>

<style lang="scss">
    .user-message { color: white; }
</style>
