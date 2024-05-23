<script lang="ts">
    import { onDestroy } from 'svelte';
    import { _ } from 'svelte-i18n';
    import Loader from './loader.svelte';
    import type { Room } from '../stores/room';
    import CardVideoSelector from './card-video-selector.svelte';
    import CardCopyUrl from './card-copy-url.svelte';
    import Interpolator from './interpolator.svelte';
    import VideoPlayer from './video-player/index.svelte';
    import Users from './users/index.svelte';
    import { randomStr } from '../utils';
    import { track, ClickEvent } from '../analytics.svelte';
    import { isExample } from '../stores/video-example';
    import { blobUrl } from '../stores/blob';

    export let roomId: string;
    export let room: Room;

    $: users = room?.users;

    $: url = room?.url;
    $: highlightVideoSelector = room && !$url && !$blobUrl;
    $: highlightInvite = room && !highlightVideoSelector && $users?.length < 1;

    const updateRoom = function (newRoomId: string, copyData?: boolean) {
        document.location.hash = `#${newRoomId}`;
    };

    const generateNewRoom = function () {
        if (confirm($_('room.generateNewRoom.confirmation'))) {
            updateRoom(randomStr(6), true);
            track(new ClickEvent({ target: 'generate_new_room' }));
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
        updateRoom(newRoomId, false);
        track(new ClickEvent({ target: 'join_another_room' }));
    };
</script>

<div class="uk-container player uk-width-expand">
    <VideoPlayer room={room} />
</div>
<div class="uk-container uk-grid-collapse uk-grid-match uk-margin-top" uk-grid>
    <div class="uk-width-1-2@m uk-padding-small">
        <div class:gradient-border={highlightVideoSelector}>
            <div class="tile uk-width-1-1">
                <h2 class="uk-card-title uk-text-center">🍿 { $_('selectVideo.title') }</h2>
                <CardVideoSelector room={room} />
            </div>
        </div>
    </div>
    <div class="uk-width-1-2@m uk-padding-small">
        <div class:gradient-border={highlightInvite}>
            <div class="tile uk-text-center uk-width-1-1">
                <h2 class="uk-card-title">👥 { $_('invite.title') }</h2>
                <CardCopyUrl roomId={roomId} />
            </div>
        </div>
        <div class="uk-width-1-1 uk-margin-top">
            <Users users={$users} />
        </div>
        <div class="button uk-flex uk-margin-top uk-flex-column">
            <button class="uk-button uk-button-default" on:click={generateNewRoom}>
                ↻
                { $_('room.generateNewRoom.button') }
            </button>
        </div>
        <div class="button uk-flex uk-margin-top uk-flex-column">
            <button class="uk-button uk-button-default" on:click={joinAnotherRoom}>
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


<style lang="scss">
    .player {
        width: 100vw;
        min-height: min(calc(100vw * 9 / 16), 65vh);
        max-height: min(calc(100vw * 9 / 16), 65vh);
    }

    @keyframes moveGradient {
        50% {
            background-position: 100% 100%;
            opacity: 60%;
        }
    }

    $border-width: 1px;
    .gradient-border {
        position: relative;
        display: flex;
        z-index: 0;
    
        &::after {
            position: absolute;
            content: "";
            top: -$border-width;
            left: -$border-width;
            z-index: -1;
            width: calc(100% + $border-width * 2);
            height: calc(100% + $border-width * 2);
            background: linear-gradient(
                60deg,
                hsl(224, 85%, 66%),
                hsl(269, 85%, 66%),
                hsl(314, 85%, 66%),
                hsl(359, 85%, 66%),
                hsl(44, 85%, 66%),
                hsl(89, 85%, 66%),
                hsl(134, 85%, 66%),
                hsl(179, 85%, 66%),
            );
            background-size: 300% 300%;
            background-position: 0 0;
            border-radius: 1rem;
            animation: moveGradient 2s linear infinite;
        }
    }
</style>
