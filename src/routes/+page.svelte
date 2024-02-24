<script lang="ts">
    import { fade } from 'svelte/transition';
    import { goto } from '$app/navigation'
    import { browser } from '$app/environment';
    import { page } from '$app/stores';
    import { v4 as uuidv4 } from 'uuid';
    import { trackClick } from '../google-analytics';
    import VideoView from './video-view.svelte';
    import Loader from './loader.svelte';
    import VideoSelector from './video-selector.svelte';
    import { RemoteRoom } from '../remote-room';
    import { LocalRoom } from '../local-room';
    import normalizeLink from './normalize-link';
    import videoExample from '../video-example';
    import CopyUrl from './copy-url.svelte';

    let roomId = $page.url.hash?.slice(1);
    if (!roomId) {
        roomId = uuidv4();
        if (browser) {
            goto(`#${roomId}`);
        }
    }
    roomId = roomId.toLocaleLowerCase();

    $: remoteRoom = new RemoteRoom(roomId);
    let isLoading = true;
    $: remoteRoom.load().finally(() => isLoading = false);
    $: localRoom = new LocalRoom(remoteRoom);
    let blobUrl: string;
    let fileName: string;

    $: playUrl = $localRoom?.isLocalMode ? blobUrl : normalizeLink($localRoom?.url);

    const selectExample = function () {
        $localRoom.url = videoExample();
        trackClick('example');
    };

    const selectOnlineMode = function () {
        $localRoom.isLocalMode = false;
        trackClick('select_online_mode');
    };

    const selectLocalMode = function () {
        $localRoom.isLocalMode = true;
        trackClick('select_local_mode');
    };
</script>

<svelte:head>
    <title>{$localRoom?.name || 'Watch Together'}</title>
</svelte:head>

{#if isLoading}
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
                <h3>1. Select a video</h3>
                    <ul class="uk-subnav uk-subnav-pill" uk-switcher>
                        <span>Select movie source:</span>
                        <li class:uk-active={!$localRoom.isLocalMode}>
                            <a on:click={selectOnlineMode} class="uk-button-default">Online link</a>
                        </li>
                        <span>or</span>
                        <li class:uk-active={$localRoom.isLocalMode}>
                            <a on:click={selectLocalMode} class="uk-button-default">File on computer</a>
                        </li>
                    </ul>
                {#if $localRoom.isLocalMode}
                    <div class="uk-margin-bottom">
                        You all downloaded a movie already!? Well done! Everyone should select the same video file, please.
                    </div>
                    <VideoSelector bind:videoUri={blobUrl} bind:fileName={fileName}/>
                {:else}
                <div class="uk-margin-bottom">
                    Insert a link to YouTube, Vimeo, HLS playlist, video or audio file. The input is synchronized with everyone in the room.
                </div>
                <div class="uk-inline uk-width-1-1">
                    <a
                        class="uk-form-icon uk-form-icon-flip uk-text-small uk-padding-small uk-width-auto pointer"
                        on:click={selectExample}
                    >
                        paste random example
                    </a>
                    <input
                        bind:value={$localRoom.url}
                        class="uk-input"
                        class:uk-form-danger={!playUrl}
                        placeholder="Video URL"
                    />
                </div>
                {/if}
            </div>
        </div>
    </div>
    <div class="uk-section uk-section-primary uk-section-small" transition:fade>
        <div class="uk-container uk-container-small">
            <CopyUrl />
        </div>
    </div>
    <div class="uk-section uk-section-secondary uk-section-small window-height uk-flex uk-flex-column">
        <div class="uk-container uk-container-small uk-flex-1 uk-flex uk-flex-column max-width">
            <h3>3. Watch the movie together!</h3>
            <div>
                Playback, time, and video scrolling are synchronized with everyone who has the page open.
            </div>
            <div class="uk-flex-1 uk-flex uk-flex-center uk-flex-column uk-flex-center uk-flex-middle">
                {#if playUrl}
                    <VideoView bind:paused={$localRoom.paused} bind:time={$localRoom.time} url={playUrl}/>
                {:else}
                    <div class="uk-text-small uk-flex uk-flex-center uk-flex-column">
                        Video player will appear here when you insert a link or select a video
                    </div>
                {/if}
            </div>
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
    $purple-color: rgba(255, 0, 0, 0.015);
    $purple-color: rgba(255, 0, 0, 0.015);
    $red-color: #f0731e;

    h1 {
        font-family: Academy Engraved LET;
    }

    .pointer {
        cursor: pointer;
    }

    .loader {
        position: absolute;
        height: 100vh;
        width: 100vw;
        display: grid;             
        place-items: center;
    }

    .window-height {
        min-height: 100vh;
    }

    .window-width {
        min-width: 100vw;;
    }

    .max-width {
        width: 100%;
    }

    .uk-subnav-pill > .uk-active > a {
        background-color: $red-color;
    }

    .uk-input:focus, .uk-select:focus, .uk-textarea:focus {
        border-color: $red-color;
    }

    .uk-section-primary {
        background-color: $red-color;
    }

    .uk-section-secondary {
        background-color: #0b0b0b;
    }

    :global(body), .uk-section-muted {
        background-color: $purple-color;
    }

    h1:hover {
        color: gray;
    }

    h1:active {
        color: black;
    }
</style>
