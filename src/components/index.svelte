<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { tick } from 'svelte';
    import { fade } from 'svelte/transition';
    import { _, locale } from 'svelte-i18n';
    import { locales } from '../i18n/index';
    import Loader from './loader.svelte';
    import { RemoteRoom } from '../stores/remote-room';
    import { LocalRoom } from '../stores/local-room';
    import { type Link } from '../normalize-link'
    import VideoSelector from './1-video-selector.svelte';
    import CopyUrl from './2-copy-url.svelte';
    import VideoViewer from './3-video-viewer.svelte';
    import { randomStr } from '../utils';
    import { syncTime } from '../stores/clock';
    import { track, ClickEvent, WatchedMinuteEvent, LocaleChangedEvent } from './analytics.svelte';
    import { isExample } from '../stores/video-example';

    export let roomId: string;

    let remoteRoom: RemoteRoom;
    let localRoom: LocalRoom;

    $: initRoom(roomId);
    $: url = localRoom?.url;
    $: play = localRoom?.play;
    $: paused = localRoom?.paused;
    $: minutesWatched = localRoom?.minutesWatched;

    let isRoomLoading = true;
    let isTimeLoading = true;

    const initRoom = async function (roomId: number) {
        isRoomLoading = true;
        try {
            remoteRoom = new RemoteRoom(roomId);
            await remoteRoom.load();
            localRoom = new LocalRoom(remoteRoom);
        } finally {
            isRoomLoading = false;
        }
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
        updateRoom(randomStr(6), true);
        track(new ClickEvent({ target: 'generate_new_room' }));
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

    let timeSpentInterval;
    onMount(() => {
        timeSpentInterval = setInterval(() => {
            if ($play && !$paused) {
                $minutesWatched += 1;
                track(new WatchedMinuteEvent({ roomId, sourceType: $play.type, isExample: isExample($url) }));
            }
        }, 60000);
    });

    onDestroy(() => {
        clearInterval(timeSpentInterval);
    });
</script>

<div class="uk-section-secondary window-height uk-flex uk-flex-column">
    <div class="header">
        Watch Together
    </div>
    <div class="content uk-flex-1 uk-flex uk-flex-center uk-flex-middle">
        {#if !localRoom || isRoomLoading || isTimeLoading}
            <Loader/>
        {:else}
            <div uk-grid class="full-width" transition:fade>
                <div class="player uk-width-expand">
                    <VideoViewer room={localRoom} />
                </div>
                <div class="controls uk-width-1-3@m uk-width-1-4@xl uk-flex uk-flex-column">
                    <h2>{ $_('selectVideo.title') }</h2>
                    <VideoSelector room={localRoom} />

                    <h2>{ $_('invite.title') }</h2>
                    <CopyUrl roomId={roomId}/>
                    <button class="block uk-button uk-button-default uk-margin" on:click={generateNewRoom}>
                        ↻
                        { $_('room.generateNewRoom') }
                    </button>
                    <button class="block uk-button uk-button-default uk-margin-bottom" on:click={joinAnotherRoom}>
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
        {/if}
    </div>
    <div class="uk-text-small uk-text-muted uk-text-center uk-padding">
        <div>
            <span>{ $_('poweredBy') }</span>
            · <a class="uk-text-muted" href="https://svelte.dev" target="_blank">Svelte</a>
            · <a class="uk-text-muted" href="https://firebase.google.com" target="_blank">Firebase</a>
            · <a class="uk-text-muted" href="https://vidstack.io" target="_blank">Vidstack</a>
            · <a class="uk-text-muted" href="https://getuikit.com" target="_blank">UIkit</a>
        </div>
    </div>
</div>

<style lang="scss">
    .window-height {
        min-height: 100lvh;
    }

    .header {
        text-align: center;
        font-family: Avenir Next;
        font-size: 2rem;
        background-color: #0b0b0b;
        padding: 1rem;
    }

    .full-width {
        width: 100%;
    }

    .bottom {
        margin-top: auto;
    }

    @media only screen and (min-width: 960px) {
        .content {
            margin-top: 1rem;
        }

        .player {
            width: 100%;
        }

        .controls {
            padding-left: 1rem;
            margin-left: 0;
        }
    }

    @media only screen and (max-width: 960px) {
        .player {
            padding: 0;
            position: relative;
            left: 15px;
            width: 100vw;
        }
        .controls {
            box-sizing: border-box;
            padding-left: 2rem;
        }

        :global(media-player) {
            border-radius: 0 !important;
        }
    }
</style>
