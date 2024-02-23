<script lang="ts">
    import { fade } from 'svelte/transition';
    import { goto } from '$app/navigation'
    import { browser } from '$app/environment';
    import { page } from '$app/stores';
    import { v4 as uuidv4 } from 'uuid';
    import VideoView from './video-view.svelte';
    import Loader from './loader.svelte';
    import VideoSelector from './video-selector.svelte';
    import { RemoteRoom } from '../remote-room';
    import { LocalRoom } from '../local-room';

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

    $: playUrl = $localRoom?.isLocalMode ? blobUrl : $localRoom?.url;

    const copyToClipboard = function (text: string) {
        const input = document.createElement('input');
        input.setAttribute('value', text);
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
    };

    const copyUrl = function () {
        copyToClipboard($page.url.href);
    };

    $: isUrlValid = (() => {
        if ($localRoom?.isLocalMode) {
            return blobUrl;
        }
        try {
            const url = new URL($localRoom.url);
            return url.protocol === "http:" || url.protocol === "https:";
        } catch {
            return false;
        }
    })();
</script>

<svelte:head>
    <title>{$localRoom?.name || 'Watch Together'}</title>
</svelte:head>

{#if isLoading}
    <div class="uk-text-center loader" transition:fade>
        <Loader/>
    </div>
{:else}
    <div class="uk-flex uk-flex-column">
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
                                <a on:click={() => $localRoom.isLocalMode = false} class="uk-button-default">Online link</a>
                            </li>
                            <span>or</span>
                            <li class:uk-active={$localRoom.isLocalMode}>
                                <a on:click={() => $localRoom.isLocalMode = true} class="uk-button-default">Local file</a>
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
                    <input
                        bind:value={$localRoom.url}
                        class="uk-input"
                        class:uk-form-danger={$localRoom.url && !isUrlValid}
                        placeholder="Video URL"
                        disabled={$localRoom.isLocalMode}
                    />
                    {/if}
                </div>
            </div>
        </div>
        <div class="uk-section uk-section-primary uk-section-small" transition:fade>
            <div class="uk-container uk-container-small">
                <h3>2. Share the link to this room with who you want to watch a movie with</h3>

                <div class="uk-text-center uk-margin-top">
                    <input style="width: 100%;" class="pointer uk-button uk-button-link uk-text-lowercase" uk-tooltip="Click to copy" on:click={copyUrl} value={$page.url} readonly/>
                    <div class="uk-text-muted uk-text-small">Click the link to copy it to the clipboard</div>
                </div>
            </div>
        </div>
        <div class="uk-section uk-section-secondary uk-section-small uk-flex-1 watch">
            <div class="uk-container uk-container-small">
                <h3>3. Watch the movie together!</h3>
                <div class="uk-margin">
                    Playback, time, and video scrolling are synchronized with everyone who has the page open.
                </div>
                <div class="uk-text-center">
                    {#if isUrlValid}
                        <VideoView bind:paused={$localRoom.paused} bind:time={$localRoom.time} url={playUrl}/>
                    {:else}
                        <div class="stub uk-text-small">
                            Video player will appear here when you insert a link or select a video
                        </div>
                    {/if}
                    <div class="uk-text-small uk-text-muted uk-margin-top">
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
    $purple-color: rgba(255, 0, 0, 0.015);
    $purple-color: rgba(255, 0, 0, 0.015);
    $red-color: #f0731e;

    h1 {
        font-family: Academy Engraved LET;
    }

    .pointer {
        cursor: pointer;
    }

    .stub {
        line-height: 20rem;
        vertical-align: center;
    }

    .loader {
        position: absolute;
        height: 100vh;
        width: 100vw;
        display: grid;             
        place-items: center;
    }

    .watch {
        height: 100vh;
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
