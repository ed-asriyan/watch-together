<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { tick } from 'svelte';
    import { fade } from 'svelte/transition';
    import Loader from './loader.svelte';
    import { RemoteRoom } from '../stores/remote-room';
    import { LocalRoom } from '../stores/local-room';
    import VideoSelector from './1-video-selector.svelte';
    import CopyUrl from './2-copy-url.svelte';
    import VideoViewer from './3-video-viewer.svelte';
    import randomStr from '../random-str';
    import { trackClick } from '../google-analytics';

    export let roomId: string;

    let localRoom: LocalRoom;
    $: remoteRoom = new RemoteRoom(roomId);
    let isLoading = true;
    $: remoteRoom.load()
        .then(room => {
            if (room.isLocalMode || room.url) {
                setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 10);
            }
        })
        .finally(() => {
            isLoading = false;
        });
    $: localRoom = new LocalRoom(remoteRoom);

    const updateRoom = function (newRoomId: string, copyData?: boolean) {
        const roomData = $localRoom;
        isLoading = true;
        // otherwise roomId isn't reactively updated inside exactle CopyUrl component. svelte bug?
        setTimeout(() => {
            document.location.hash = `#${newRoomId}`;
            // todo: relect this shitcode oneday
            copyData && setTimeout(() => {
                $localRoom = roomData;
            }, 1000);
        }, 1200);
    }

    const generateNewRoom = function () {
        updateRoom(randomStr(6), true);
        trackClick('generate_new_room');
    };

    const joinAnotherRoom = function () {
        const input = prompt('Paste the link to the room you want to join or enter the room ID:');
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
        trackClick('join_another_room');
    };

    $: play = localRoom.play;
    let timeSpentInterval;
    onMount(() => {
        timeSpentInterval = setInterval(() => {
            if ($play && !$localRoom.paused) {
                $localRoom.minutesWatched += 1;
                trackWatchedMinute(roomId);
            }
        }, 60000);
    });

    onDestroy(() => {
        clearInterval(timeSpentInterval);
    });
</script>

<svelte:head>
    <title>{$localRoom.name}</title>
</svelte:head>

{#if isLoading || !localRoom}
    <div class="uk-text-center loader" transition:fade>
        <Loader/>
    </div>
{:else}
    <div class="uk-section uk-section-muted uk-section-small" transition:fade>
        <div class="uk-container">
            <h1 class="uk-text-center uk-heading-medium uk-text-bold title uk-margin-top" contenteditable="true" bind:innerHTML={$localRoom.name}></h1>
            <div class="uk-text-center uk-text-muted" style="margin-top: -30px">Watch movies together anytime, anywhere</div>
            <hr style="border-color: black" class="uk-margin" />
            <div class="uk-container uk-container-small">
                <VideoSelector room={localRoom} />
            </div>
        </div>
    </div>
    <div class="uk-section uk-section-primary uk-section-small" transition:fade>
        <div class="uk-container uk-container-small">
            <CopyUrl roomId={roomId}/>
            <div class="uk-flex uk-flex-row uk-flex-middle uk-flex-center uk-margin-top uk-flex-wrap">
                <button class="uk-block uk-button uk-button-default room-btn" on:click={generateNewRoom}>
                    ↻
                    Generate a new room
                </button>
                <button class="uk-block uk-button uk-button-default room-btn" on:click={joinAnotherRoom}>
                    Join another room →
                </button>
            </div>
        </div>
    </div>
    <div class="uk-section uk-section-secondary uk-section-small window-height uk-flex" transition:fade>
        <div class="uk-container uk-container-small uk-flex-1 uk-flex uk-flex-column">
            <VideoViewer room={localRoom} /> 
            <div class="uk-text-small uk-text-muted uk-text-center uk-margin-top">
                <div>
                    <span>Powered by</span>
                    · <a class="uk-text-muted" href="https://svelte.dev" target="_blank">Svelte</a>
                    · <a class="uk-text-muted" href="http://firebase.google.com" target="_blank">Firebase</a>
                    · <a class="uk-text-muted" href="http://vidstack.io" target="_blank">Vidstack</a>
                    · <a class="uk-text-muted" href="https://getuikit.com" target="_blank">UIkit</a>
                </div>
            </div>
        </div>
    </div>
{/if}

<style lang="scss">
    @import '../constants.scss';

    h1 {
        font-family: Academy Engraved LET;
    }

    h1:hover {
        color: gray;
    }

    h1:active {
        color: black;
    }

    .uk-input:focus, .uk-select:focus, .uk-textarea:focus {
        border-color: $step2-color;
    }

    .uk-section-primary {
        background-color: $step2-color;
    }

    .uk-section-secondary {
        background-color: $step3-color;
    }

    :global(body), .uk-section-muted {
        background-color: $step1-color;
    }

    .loader {
        position: absolute;
        height: 100vh;
        width: 100vw;
        display: grid;             
        place-items: center;
    }

    .window-height {
        min-height: calc(100vh + 1px);
    }

    .window-width {
        min-width: 100vw;
    }

    @media only screen and (max-width: 740px) {
        .room-btn {
            width: 100%;
            margin-top: 1rem;
        }
    }
    @media only screen and (min-width: 740px) {
        .room-btn {
            margin: 0 1rem;
        }
    }
</style>
