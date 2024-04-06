<script lang="ts">
    import { onDestroy} from 'svelte';
    import { fade } from 'svelte/transition';
    import { _, locale } from 'svelte-i18n';
    import { locales } from '../i18n/index';
    import Loader from './loader.svelte';
    import { Room } from '../stores/room';
    import { type Link } from '../normalize-link'
    import VideoSelector from './1-video-selector.svelte';
    import CopyUrl from './2-copy-url.svelte';
    import VideoPlayer from './video-player/index.svelte';
    import Users from './users/index.svelte';
    import { randomStr } from '../utils';
    import { syncTime } from '../stores/clock';
    import { track, ClickEvent, LocaleChangedEvent } from '../analytics.svelte';
    import { isExample } from '../stores/video-example';
        
    export let roomId: string;

    let room: Room;
    $: (async (roomId) => {
        isRoomLoading = true;
        if (room) {
            room.destruct();
        }
        room = new Room(roomId);
        try {
            await room.init();
        } finally {
            isRoomLoading = false;
        }
    })(roomId);
    $: url = room?.url;
    $: play = room?.play;
    $: paused = room?.paused;
    $: minutesWatched = room?.minutesWatched;
    $: currentTime = room?.currentTime;
    $: users = room?.users;

    onDestroy(() => {
        if (room) {
            room.destruct();
        }
    });

    let isRoomLoading = true;
    let isTimeLoading = true;

    const initRoom = async function (room: Room) {

    };

    const initTime = async function () {
        isTimeLoading = true;
        try {
            await syncTime()
        } finally {
            isTimeLoading = false;
        }
    };
    initTime();

    const updateRoom = function (newRoomId: string, copyData?: boolean) {
        // otherwise roomId isn't reactively updated inside exactle CopyUrl component. svelte bug?
        isRoomLoading = true;
        setTimeout(() => {
            document.location.hash = `#${newRoomId}`;
        }, 1200);
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

    
    const onLanguageChangeClick = function () {
        track(new ClickEvent({ target: 'language_selector' }));
    };

    const onLanguageChanged = function () {
        track(new LocaleChangedEvent({ locale: $locale }));
    };

    $: isLoading = !room || isRoomLoading || isTimeLoading;
    </script>

<div class="uk-flex-1 uk-flex uk-flex-center" class:uk-flex-middle={isLoading}>
    {#if isLoading}
        <Loader/>
    {:else}
        <div uk-grid class="container uk-margin-top uk-grid-small" transition:fade>
            <div class="player uk-width-expand">
                <VideoPlayer bind:paused={$paused} bind:currentTime={$currentTime} link={$play} />
            </div>
            <div class="controls">
                <div uk-grid class="uk-grid-small">
                    <div class="tile uk-flex uk-flex-column">
                        <h2 class="uk-card-title">🍿 { $_('selectVideo.title') }</h2>
                        <VideoSelector room={room} />
                    </div>
                    <div class="tile uk-flex uk-flex-column">
                        <h2 class="uk-card-title">👥 { $_('invite.title') }</h2>
                        <CopyUrl roomId={roomId} />
                        <Users users={$users} />
                    </div>

                    <div class="buttons uk-flex uk-margin-top uk-flex-column">
                        <button class="uk-button uk-button-default uk-margin" on:click={generateNewRoom}>
                            ↻
                            { $_('room.generateNewRoom.button') }
                        </button>
                        <button class="uk-button uk-button-default uk-margin-bottom" on:click={joinAnotherRoom}>
                            { $_('room.joinAnotherRoom') }
                            →
                        </button>

                        <select class="uk-button uk-button-default bottom uk-text-center" bind:value={$locale} on:change={onLanguageChanged} on:click={onLanguageChangeClick}>
                            {#each Object.entries(locales) as lang}
                                <option value={ lang[0] }>{ lang[1].locale.flag } { lang[1].locale.name }</option>
                            {/each}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div>


<style lang="scss">
    .container {
        width: 100%;
    }

    .tile {
        border: 1px solid rgb(255 255 255 / .1);
        background-color: #1c1c1c;
        border-radius: 1rem;
        padding: 2rem 1rem;
        margin-left: 1rem;
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

    .buttons {
        width: 100%;
    }
</style>
