<script lang="ts">
    import { onDestroy } from 'svelte';
    import { _ } from 'svelte-i18n';
    import Loader from './loader.svelte';
    import type { Room } from '../stores/room';
    import CardVideoSelector from './card-video-selector.svelte';
    import CardCopyUrl from './card-copy-url.svelte';
    import VideoPlayer from './video-player/index.svelte';
    import Users from './users/index.svelte';
    import { randomStr } from '../utils';
    import { track, ClickEvent } from '../analytics.svelte';
    import { isExample } from '../stores/video-example';

    export let roomId: string;
    export let room: Room;

    $: users = room?.users;

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

<div uk-grid class="container uk-margin-top uk-grid-small">
    <div class="player uk-width-expand">
        <VideoPlayer room={room} />
    </div>
    <div class="controls">
        <div uk-grid class="uk-grid-small">
            <div class="tile uk-flex uk-flex-column">
                <h2 class="uk-card-title">🍿 { $_('selectVideo.title') }</h2>
                <CardVideoSelector room={room} />
            </div>
            <div class="tile uk-flex uk-flex-column">
                <h2 class="uk-card-title">👥 { $_('invite.title') }</h2>
                <CardCopyUrl roomId={roomId} />
            </div>
            <div class="uk-width-1-1">
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
</div>


<style lang="scss">
    .container {
        width: 100%;
    }

    $controls-width: 32rem;
    $controls-threshold-ratio: 2.5;

    @media (min-width: calc($controls-width * $controls-threshold-ratio)) {
        .controls {
            width: 32rem;
        }

        .player {
            height: none;
        }

        .tile {
            width: 100%;
        }

        .button {
            flex: 1;
        }
    }


    @media (min-width: 960px) and (max-width: calc($controls-width * $controls-threshold-ratio)) {
        .controls {
            width: 100%;
        }

        .tile {
            flex: 1;
        }
    }

    .player {
        width: 100vw;
        height: min(calc(100vw * 9 / 16), 60vh);
    }

    .tile {
        width: 100%;
    }

    .button {
        width: 100%;
    }
</style>
