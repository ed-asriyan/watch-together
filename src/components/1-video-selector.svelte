<script lang="ts">
    import { fade } from 'svelte/transition';
    import { track, ClickEvent, UrlPasteEvent } from '../analytics';
    import { getExampleVideo, isExample } from '../stores/video-example';
    import VideoSelectorBtn from './video-selector-btn.svelte';
    import { LocalRoom } from '../stores/local-room';
    import { SourceType } from '../normalize-link';

    export let room: LocalRoom;

    const selectExample = function () {
        $room.url = getExampleVideo();
        track(new ClickEvent({ target: 'example' }));
        trackClick('example');
    };

    const selectOnlineMode = function () {
        $room.isLocalMode = false;
        track(new ClickEvent({ target: 'select_online_mode' }));
    };

    const selectLocalMode = function () {
        $room.isLocalMode = true;
        track(new ClickEvent({ target: 'select_local_mode' }));
    };

    const clickDownloadTutorial = function () {
        track(new ClickEvent({ target: 'download_tutorial' }));
    };

    const clickUrlTutorial = function () {
        track(new ClickEvent({ target: 'url_tutorial' }));
    };

    const onInput = function () {
        track(new UrlPasteEvent({ roomId: room.id, url: $room.url, isExample: isExample($room.url) }));
    };


    $: play = room.play;
</script>

<span>Select movie source:</span>
<div class="uk-margin-bottom uk-margin-top">
    <button
        class="uk-button uk-button-small"
        class:uk-button-default={$room.isLocalMode}
        class:uk-button-secondary={!$room.isLocalMode}
        on:click={selectOnlineMode}
    >
        Online link
    </button>
    <span class="uk-margin-left uk-margin-right">or</span>
    <button
        class="uk-button uk-button-small"
        class:uk-button-default={!$room.isLocalMode}
        class:uk-button-secondary={$room.isLocalMode}
        on:click={selectLocalMode}
    >
        From computer
    </button>
</div>
{#if $room.isLocalMode}
    <div class="uk-margin-bottom">
        You all downloaded a movie already!? Well done! Everyone should select the same video file.
    </div>
        <VideoSelectorBtn room={room}/>
{:else}
    <div class="uk-margin-bottom">
        Insert a link to <u>Dailymotion</u>, <u>YouTube</u>, <u>Vimeo</u>, <u>HLS</u> playlist, <u>video</u> or <u>audio</u> file. The input is synced with everyone in the room.
    </div>
    <div class="uk-inline uk-width-1-1">
        <input
            bind:value={$room.url}
            on:input={onInput}
            class="uk-input"
            class:uk-form-danger={!$play}
            placeholder="Video URL"
        />
        {#if !$room.url}
            <a
                class="uk-form-icon uk-form-icon-flip uk-text-small uk-padding-small uk-width-auto example pointer"
                on:click|preventDefault={selectExample}
                href="/#"
                transition:fade
            >
                click here to paste random example
            </a>
        {/if}
    </div>
{/if}

<div class="uk-margin-top uk-text-center uk-text-small hint">
    <i>
        {#if $room.isLocalMode}
            Don't know how to download a video from a website? It's easy, <a href="https://www.youtube.com/watch?v=FsT7kUaqBdM" target="_blank" on:click={clickDownloadTutorial}>watch here</a>!
        {:else}
            {#if $room.url}
                {#if $play}
                    {#if $play.type == SourceType.direct}
                        If the movie doesn't play, make sure the <u>direct</u> video link is inserted. It's easy, <a href="https://telegra.ph/How-to-watch-movies-from-websites-together-online-03-17" target="_blank" on:click={clickUrlTutorial}>read here</a>!
                    {/if}
                {:else}
                    Video link is invalid
                {/if}
            {:else}
                Don't know how to get a video link from a website? It's easy, <a href="https://telegra.ph/How-to-watch-movies-from-websites-together-online-03-17" target="_blank" on:click={clickUrlTutorial}>read here</a>!
            {/if}
        {/if}
    </i>
</div>

<style lang="scss">
    .hint {
        height: 1.5rem;
    }

    .example {
        z-index: 99;
    }

    .example:hover {
        text-decoration: underline;
    }
</style>