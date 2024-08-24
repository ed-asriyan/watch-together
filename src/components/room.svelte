<script lang="ts">
    import { _ } from 'svelte-i18n';
    import type { Room } from '../stores/room';
    import CardVideoSelector from './card-video-selector.svelte';
    import CardCopyUrl from './card-copy-url.svelte';
    import Interpolator from './interpolator.svelte';
    import VideoPlayer from './video-player/index.svelte';
    import Users from './users/index.svelte';
    import { randomStr } from '../utils';
    import { track, ClickEvent } from '../analytics.svelte';
    import { blob } from '../stores/blob';
    import { MessageType } from '../stores/room/bound-messages';

    export let roomId: string;
    export let room: Room;
    export let headerHeight: number;

    $: users = room?.users;

    $: url = room?.url;
    $: highlightVideoSelector = room && !$url && !$blob;
    $: highlightInvite = room && !highlightVideoSelector && $users?.length < 1;

    $: if (room && $blob) {
        room?.messages.sendMessage('', MessageType.selectedLocalFile);
    }

    const updateRoom = function (newRoomId: string, copyData?: boolean) {
        document.location.hash = `#${newRoomId}`;
    };

    const generateNewRoom = function () {
        if (confirm($_('room.generateNewRoom.confirmation'))) {
            updateRoom(randomStr(6), true);
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
        updateRoom(newRoomId, false);
        track(new ClickEvent(room, { target: 'join_another_room' }));
    };
</script>

<div class="uk-container player uk-width-expand" style:top={headerHeight + 'px'}>
    <VideoPlayer room={room}/>
</div>
<div class="uk-width-expand controls uk-flex uk-flex-middle uk-flex-column">
    <div class="uk-container uk-grid-collapse uk-grid-match" uk-grid>
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
                    <h2 class="uk-card-title" class:gradient-text={highlightInvite}>👥 { $_('invite.title') }</h2>
                    <CardCopyUrl room={room} />
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
</div>

<style lang="scss">
    .player {
        position: fixed;
        left: 0;
        z-index: 0;
        height: min(calc(100vw * 9 / 16), 65vh);
        max-height: min(calc(100vw * 9 / 16), 65vh);
    }

    .controls {
        z-index: 2;
        background: radial-gradient(
            100% 100% at bottom center,
            #000 80%, transparent 100%
        );
        margin-top: min(calc(100vw * 9 / 16), 65vh);
    }

    @keyframes moveGradient {
        50% {
            background-position: 100% 100%;
            opacity: 60%;
        }
    }

    $border-width: 2px;
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

    @keyframes hue {
        from {
            -webkit-filter: hue-rotate(0deg);
        }
        to {
            -webkit-filter: hue-rotate(-360deg);
        }
    }

    .gradient-text {
        background-image: linear-gradient(92deg, #f35626, #feab3a);
        background-clip: text;
        fill-color: transparent;
        animation: hue 5s infinite linear;
    }
</style>
