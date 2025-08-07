<script lang="ts">
    import { tick } from 'svelte';
    import { _ } from 'svelte-i18n';
    import type { Room } from '../../stores/room';
    import { blob } from '../../stores/blob';
    import CardUsers from './card-users/index.svelte';
    import CardVideoSelector from './card-video-selector.svelte';
    import Interpolator from '../interpolator.svelte';
    import LanguageSelector from './language-selector.svelte';
    import { ClickEvent, track } from '../../analytics.svelte';
    import { randomStr } from '../../utils';
    import normalizeSource, { type Source } from '../../normalize-source';
    import { version } from '../../settings';
    import { sendFile } from '../../stores/web-torrent';

    interface Props {
        room: Room;
    }

    let { room }: Props = $props();

    let users = $derived(room?.users);
    let url = $derived(room?.url);
    let highlightVideoSelector = $derived(room && !$url && !$blob);
    let highlightInvite = $derived(room && !highlightVideoSelector && $users?.length < 1);

    let source = $derived(url && $url && normalizeSource($url));
    let captionsMagnet = $derived(room?.captions);

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

    let container: HTMLElement = $state();
    let firstTime = $state(true);
    let lastSource: Source | null | "" = $state(null);
    let lastUsersCount = $state(0);
    $effect(() => {
        let shouldScroll: boolean = false;

        if (window.innerWidth > 675) {
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
        }
        shouldScroll && tick().then(() => scroll(source && $users.length ? 'top' : 'bottom'));
    });

    // Handler for selecting captions file
    const onCaptionsSelected = async (event: Event) => {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;
        const file = input.files[0];
        const magnet = await sendFile(file);
        room.captions.set(magnet);
    };
</script>

<div bind:this={container} class="uk-container uk-grid-collapse uk-grid-match" uk-grid>
    <div class="uk-width-1-2@m uk-padding-small">
        <div class="tile uk-width-1-1" class:focus={highlightVideoSelector}>
            <h2 class="uk-card-title uk-text-center" class:gradient-text={highlightVideoSelector}>🍿 { $_('selectVideo.title') }</h2>
            <CardVideoSelector room={room} />
            <div class="uk-margin-top">
                <label class="uk-button glass tile uk-width-1-1">
                    🎫 { $_('selectCaptions.title', { default: 'Select captions file' }) }
                    <input type="file" accept=".vtt,.srt" on:change={onCaptionsSelected} hidden />
                </label>
            </div>
        </div>
    </div>
    <div class="uk-width-1-2@m uk-padding-small">
        <div class="tile uk-text-center uk-width-1-1" class:focus={highlightInvite}>
            <h2 class="uk-card-title" class:gradient-text={highlightInvite}>👥 { $_('invite.title') }</h2>
            <CardUsers room={room} highlight={highlightInvite} />
        </div>
        <div class="uk-flex uk-margin-top uk-flex-column">
            <button class="uk-button glass tile uk-padding-remove" onclick={generateNewRoom}>
                ↻
                { $_('room.generateNewRoom.button') }
            </button>
        </div>
        <div class="uk-flex uk-margin-top uk-flex-column">
            <button class="uk-button glass tile uk-padding-remove" onclick={joinAnotherRoom}>
                { $_('room.joinAnotherRoom') }
                →
            </button>
        </div>
    </div>
</div>
<div class="uk-text-small uk-width-1-1 uk-text-center uk-margin-medium-top">
    <Interpolator text={$_('feedback.linkText')} >
        {#snippet children({ data: data })}
                {#if data.name === 'link'}
                <a href={$_('feedback.link')} target="_blank">{ data.text }</a>
            {/if}
                    {/snippet}
        </Interpolator>
</div>
<div class="footer uk-text-small uk-text-muted uk-text-center uk-padding uk-padding-remove-bottom">
    <LanguageSelector />
    <div class="uk-margin-top">
        <a href="/terms-and-conditions.txt" class="uk-text-muted" target="_blank">{ $_('termsAndConditions') }</a>
        · <a href="/privacy-policy.txt" class="uk-text-muted" target="_blank">{ $_('privacyPolicy') }</a>
    </div>
    <div class="uk-margin-top">
        <span>{ $_('poweredBy') }</span>
        · <a class="uk-text-muted" href="https://svelte.dev" target="_blank">Svelte</a>
        · <a class="uk-text-muted" href="https://firebase.google.com" target="_blank">Firebase</a>
        · <a class="uk-text-muted" href="https://vidstack.io" target="_blank">Vidstack</a>
        · <a class="uk-text-muted" href="https://webtorrent.io" target="_blank">WebTorrent</a>
        · <a class="uk-text-muted" href="https://getuikit.com" target="_blank">UIkit</a>
    </div>
    <div class="uk-margin-top">
        <div>v.{ version }</div>
        <a class="uk-text-muted" href="https://asriyan.me" target="_blank">Ed Asriyan</a>
    </div>
</div>

<style lang="scss">
    .uk-card-title {
        font-weight: bold;
    }

    .tile.uk-button:hover {
        background-color: rgba(255, 255, 255, 0.1);
    }
</style>
