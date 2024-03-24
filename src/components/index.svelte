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
            await remoteRoom.load();
            localRoom = new LocalRoom(remoteRoom);
            play = localRoom.play
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

<div class="uk-section-secondary window-height uk-flex uk-flex-column">
    <div class="header">
        Watch Together
    </div>
    <div class="content uk-flex-1 uk-margin-top uk-flex uk-flex-center uk-flex-middle">
        {#if isRoomLoading || isTimeLoading}
            <Loader/>
        {:else}
            <div uk-grid class="full-width" transition:fade>
                <div class="uk-width-expand">
                    <VideoViewer room={localRoom} />
                </div>
                <div class="controls uk-width-1-3@m uk-width-1-4@xl uk-flex uk-flex-column uk-padding-remove-left uk-margin-left">
                    <h2>Select a video</h2>
                    <VideoSelector room={localRoom} />

                    <h2>Invite people to this room</h2>
                    <CopyUrl roomId={roomId}/>
                    <button class="block uk-button uk-button-default uk-margin" on:click={generateNewRoom}>
                        ↻
                        Generate a new room
                    </button>
                    <button class="block uk-button uk-button-default" on:click={joinAnotherRoom}>
                        Join another room →
                    </button>
                </div>
            </div>
        {/if}
    </div>
    <div class="uk-text-small uk-text-muted uk-text-center uk-padding">
        <div>
            <span>Powered by</span>
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

    :global(.uk-grid-stack > .controls) {
        padding-left: 1rem !important;
    }
</style>
