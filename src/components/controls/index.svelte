<script lang="ts">
    import { tick } from 'svelte';
    import { _ } from 'svelte-i18n';
    import type { Room } from '../../stores/room';
    import { blob } from '../../stores/blob';
    import CardCopyUrl from './card-copy-url.svelte';
    import CardVideoSelector from './card-video-selector.svelte';
    import Users from './users/index.svelte';
    import Interpolator from '../interpolator.svelte';
    import LanguageSelector from './language-selector.svelte';
    import { ClickEvent, track } from '../../analytics.svelte';
    import { randomStr } from '../../utils';
    import normalizeSource, { type Source } from '../../normalize-source';

    export let room: Room;

    $: users = room?.users;
    $: url = room?.url;
    $: highlightVideoSelector = room && !$url && !$blob;
    $: highlightInvite = room && !highlightVideoSelector && $users?.length < 1;

    $: source = url && $url && normalizeSource($url);

    const updateRoom = function (newRoomId: string) {
        document.location.hash = `#${newRoomId}`;
    };

    const generateNewRoom = function () {
        if (confirm($_('room.generateNewRoom.confirmation'))) {
            updateRoom(randomStr(6));
            track(new ClickEvent(room, { target: 'generate_new_room' }));
        }
    };

    const joinAnotherRoom = function () {
        const input = prompt($_('invite.joinPromt'));
        if (!input) return;

        let newRoomId;
        try {
            const url = new URL(input);
            if (url.protocol === location.protocol && url.host === location.host && url.hash.length > 1) {
                newRoomId = url.hash.slice(1);
            } else {
                throw 0;
            }
        } catch {
            newRoomId = input;
        }
        updateRoom(newRoomId);
        track(new ClickEvent(room, { target: 'join_another_room' }));
    };

    const scroll = function (direction: 'top' | 'bottom') {
        let top;
        if (direction === 'top') {
            top = 0;
        } else {
            top = container.getBoundingClientRect().top + window.scrollY - 86;
        }
        window.scrollTo({ top, behavior: 'smooth' });
    };

    let container: HTMLElement;
    let firstTime = true;
    let lastSource: Source | null | "" = null;
    let lastUsersCount = 0;
    $: {
        let shouldScroll: boolean = false;
        if (firstTime) {
            if (users) {
                firstTime = false;
                shouldScroll = true;
            }
        } else {
            if (lastUsersCount === 0 && $users.length || (lastSource === "" || lastSource === null) !== (source === "" || source === null)) {
                shouldScroll = true;
            }
            lastSource = source;
            lastUsersCount = $users.length;
        }
        shouldScroll && tick().then(() => scroll(source && $users.length ? 'top' : 'bottom'));
    };
</script>

<div bind:this={container} class="uk-container uk-grid-collapse uk-grid-match" uk-grid>
    <div class="uk-width-1-2@m uk-padding-small">
        <div class="tile uk-width-1-1">
            <h2 class="uk-card-title uk-text-center" class:gradient-text={highlightVideoSelector}>🍿 { $_('selectVideo.title') }</h2>
            <CardVideoSelector room={room} />
        </div>
    </div>
    <div class="uk-width-1-2@m uk-padding-small">
        <div class:gradient-border={highlightInvite}>
            <div class="tile uk-text-center uk-width-1-1">
                <h2 class="uk-card-title" class:gradient-text={highlightInvite}>👥 { $_('invite.title') }</h2>
                <CardCopyUrl room={room} highlight={highlightInvite} />
            </div>
        </div>
        <div class="uk-width-1-1 uk-margin-top">
            <Users users={$users} />
        </div>
        <div class="button uk-flex uk-margin-top uk-flex-column">
            <button class="uk-button uk-button-default glass" on:click={generateNewRoom}>
                ↻
                { $_('room.generateNewRoom.button') }
            </button>
        </div>
        <div class="button uk-flex uk-margin-top uk-flex-column">
            <button class="uk-button uk-button-default glass" on:click={joinAnotherRoom}>
                { $_('room.joinAnotherRoom') }
                →
            </button>
        </div>
    </div>
</div>
<div class="uk-text-small uk-width-1-1 uk-text-center uk-margin-medium-top">
    <Interpolator text={$_('feedback.linkText')} let:data={data}>
        {#if data.name === 'link'}
            <a href={$_('feedback.link')} target="_blank">{ data.text }</a>
        {/if}
    </Interpolator>
</div>
<div class="footer uk-text-small uk-text-muted uk-text-center uk-padding">
    <LanguageSelector />
    <div class="uk-margin-top">
        <span>{ $_('poweredBy') }</span>
        · <a class="uk-text-muted" href="https://svelte.dev" target="_blank">Svelte</a>
        · <a class="uk-text-muted" href="https://firebase.google.com" target="_blank">Firebase</a>
        · <a class="uk-text-muted" href="https://vidstack.io" target="_blank">Vidstack</a>
        · <a class="uk-text-muted" href="https://webtorrent.io" target="_blank">WebTorrent</a>
        · <a class="uk-text-muted" href="https://getuikit.com" target="_blank">UIkit</a>
    </div>
    <div>
        <a class="uk-text-muted" href="https://asriyan.me" target="_blank">Ed Asriyan</a>
    </div>
</div>

<style lang="scss">
    .uk-card-title {
        font-weight: bold;;
    }
</style>
