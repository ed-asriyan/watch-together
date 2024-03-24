<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { tick } from 'svelte';
    import { fade } from 'svelte/transition';
    import Loader from './loader.svelte';
    import { RemoteRoom } from '../stores/remote-room';
    import { LocalRoom } from '../stores/local-room';
    import { type Link } from '../normalize-link'
    import VideoSelector from './1-video-selector.svelte';
    import CopyUrl from './2-copy-url.svelte';
    import VideoViewer from './3-video-viewer.svelte';
    import { randomStr } from '../utils';
    import { syncTime } from '../stores/clock';
    import { trackClick, trackWatchedMinute } from '../google-analytics';
    import { isExample } from '../stores/video-example';

    export let roomId: string;

    let remoteRoom: RemoteRoom;
    let localRoom: LocalRoom;
    let play: Link;
    $: initRoom(roomId);
    let isRoomLoading = true;
    let isTimeLoading = true;

    const initRoom = async function (roomId: number) {
        isRoomLoading = true;
        try {
            remoteRoom = new RemoteRoom(roomId);
            const remoteRoomData = await remoteRoom.load();
            if (remoteRoomData.isLocalMode || remoteRoomData.url) {
                setTimeout(scrollDown, 10);
            }
            localRoom = new LocalRoom(remoteRoom);
            play = localRoom.play
        } finally {
            isRoomLoading = false;
        }
    };

    let scrollContainer;
    const scrollDown = function () {
        scrollContainer.scrollTo(0, document.body.scrollHeight);
    };

    const scrollUp = function () {
        scrollContainer.scrollTo(0, 0);
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
        const roomData = $localRoom;
        // otherwise roomId isn't reactively updated inside exactle CopyUrl component. svelte bug?
        isRoomLoading = true;
        setTimeout(() => {
            document.location.hash = `#${newRoomId}`;
            // todo: relect this shitcode oneday
            copyData && setTimeout(() => {
                $localRoom = roomData;
            }, 1000);
        }, 1200);
    };

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

    $: ;
    let timeSpentInterval;
    onMount(() => {
        timeSpentInterval = setInterval(() => {
            if ($play && !$localRoom.paused) {
                $localRoom.minutesWatched += 1;
                trackWatchedMinute({ roomId, sourceType: $play.type, isExample: isExample($localRoom.url) });
            }
        }, 60000);
    });

    onDestroy(() => {
        clearInterval(timeSpentInterval);
    });
</script>

{#if isRoomLoading || isTimeLoading}
    <div class="uk-text-center loader" transition:fade>
        <Loader/>
    </div>
{:else}
    <div class="scroll-container" bind:this={scrollContainer}>
        <div class="window-height uk-flex uk-flex-column uk-text-emphasis uk-margin-remove scroll-start" transition:fade>
            <div class="uk-flex-1 uk-flex uk-flex-center uk-flex-column">
                <div class="uk-flex uk-flex-column uk-flex-center uk-flex-1">
                    <div class="uk-section uk-section-small">
                        <div class="uk-container">
                            <h1 class="title uk-margin-top uk-heading-large uk-visible@s">Watch Together</h1>
                            <h1 class="title uk-margin-top uk-hidden@s">Watch Together</h1>
                            <div class="uk-text-center uk-text-muted description">Watch movies together anytime, anywhere</div>
                            <hr/>
                        </div>
                    </div>
                </div>
                <div class="uk-section uk-section-small uk-margin-bottom uk-padding-remove">
                    <div class="uk-container uk-container-small">
                        <h3>Select a video</h3>
                        <VideoSelector room={localRoom} />
                    </div>
                </div>
                <div class="uk-section uk-section-small uk-section-default">
                    <div class="uk-container uk-container-small">
                        <h3>Invite people to this room</h3>
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
            </div>
            <div class="uk-section uk-section-secondary uk-section-small uk-text-center">
                <button class="uk-block uk-button uk-button-default" on:click={scrollDown}>
                    Watch together!
                </button>
            </div>
        </div>
        <div class="uk-section uk-section-secondary uk-section-small window-height uk-flex uk-margin-remove scroll-start" transition:fade>
            <div class="uk-container uk-container-small uk-flex-1 uk-flex uk-flex-column">
                <div class="uk-flex">
                    <h3 class="uk-flex-1">Watch the movie together!</h3>
                    <div>
                        <button class="uk-block uk-button uk-button-default" on:click={scrollUp}>Change video</button>
                    </div>
                </div>
                <p>Playback, time, and video scrolling are synchronized with everyone who has the page open.</p>
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
    </div>
{/if}

<style lang="scss">
    .uk-section-default {
        background-color: whitesmoke;
    }

    .scroll-container {
        max-height: 100vh;
        overflow-y: scroll;
        scroll-snap-type: y mandatory;
        scroll-behavior: smooth;
        scrollbar-width: none;
    }

    .scroll-start {
        scroll-snap-align: start;
    }

    .uk-section-secondary {
        background-color: #0b0b0b;
    }

    .loader {
        position: absolute;
        height: 100vh;
        width: 100vw;
        display: grid;             
        place-items: center;
    }

    .window-height {
        min-height: 100lvh;
    }

    .window-width {
        min-width: 100vw;
    }

    .title {
        text-align: center;
        font-family: Avenir Next;
    }

    .description {
        margin-top: -10px;
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
