<script lang="ts">
    import { goto } from '$app/navigation'
    import { browser } from '$app/environment';
    import { page } from '$app/stores';
    import { v4 as uuidv4 } from 'uuid';
    import VideoView from './video-view.svelte';
    import Loader from './loader.svelte';
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

    const copyToClipboard = function (text: string) {
        const input = document.createElement('input');
        input.setAttribute('value', text);
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
    }

    const copyUrl = function () {
        copyToClipboard($page.url.href);
    };

    $: isUrlValid = (() => {
        try {
            const url = new URL($localRoom.url);
            return url.protocol === "http:" || url.protocol === "https:";
        } catch {
            return false;
        }
    })();
</script>

<svelte:head>
    <title>Movie Together</title>
</svelte:head>

<div class="uk-flex uk-flex-column window-height">
    <div class="uk-section uk-section-muted uk-section-small">
        <div class="uk-container">
            <div class="title uk-margin-top">
                <h1 class="uk-text-center uk-heading-medium">Watch Movies Together</h1>
                <hr class="uk-divider-icon">
            </div>
            {#if isLoading}
                <Loader/>
            {:else}
                <div class="uk-container uk-container-small">
                    <h3>1. Select a video</h3>
                    <div class="uk-margin">
                        Insert a link to YouTube, Vimeo, HLS playlist, video or audio file. The input is synchronized with everyone in the room.
                    </div>
                    <input
                        bind:value={$localRoom.url}
                        class="uk-input"
                        class:uk-form-danger={$localRoom.url && !isUrlValid}
                        placeholder="Video URL"
                    />
                </div>
            {/if}
        </div>
    </div>
    {#if !isLoading}
        <div class="uk-section uk-section-primary uk-section-small">
            <div class="uk-container uk-container-small">
                <h3>2. Share the link to this room with anyone you want to watch a movie with</h3>

                <div class="uk-text-center uk-margin-top">
                    <input style="width: 100%;" class="pointer uk-button uk-button-link uk-text-lowercase" uk-tooltip="Click to copy" on:click={copyUrl} value={$page.url} readonly/>
                    <div class="uk-text-muted uk-text-small">Click the link to copy it to the clipboard.</div>
                </div>
            </div>
        </div>
        <div class="uk-section uk-section-secondary uk-light uk-section-small uk-flex-1">
            <div class="uk-container uk-container-small">
                <h3>3. Watch the movie together!</h3>
                <div class="uk-margin">
                    Playback, time, and video scrolling are synchronized with everyone who has the page open.
                </div>
                {#if isUrlValid}
                    <VideoView bind:paused={$localRoom.paused} bind:time={$localRoom.time} bind:url={$localRoom.url}/>
                {/if}
            </div>
        </div>
    {/if}
</div>
<style lang="scss">
    .pointer {
        cursor: pointer;
    }

    .window-height {
        min-height: 100vh;
    }
</style>
