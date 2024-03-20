<script lang="ts">
    import { fade } from 'svelte/transition';
    import { trackClick } from '../google-analytics';
    import { getExampleVideo } from '../stores/video-example';
    import VideoSelectorBtn from './video-selector-btn.svelte';
    import { LocalRoom } from '../stores/local-room';
    import { SourceType } from '../normalize-link';

    export let room: LocalRoom;

    const selectExample = function () {
        $room.url = getExampleVideo();
        trackClick('example');
    };

    const selectOnlineMode = function () {
        $room.isLocalMode = false;
        trackClick('select_online_mode');
    };

    const selectLocalMode = function () {
        $room.isLocalMode = true;
        trackClick('select_local_mode');
    };

    const clickDownloadTutorial = function () {
        trackClick('download_tutorial');
    };

    const clicUrlTutorial = function () {
        trackClick('url_tutorial');
    };

    $: play = room.play;
</script>

<h3>1. Select a video</h3>
    <span class="uk-hidden@s">Select movie source:</span>
    <ul class="swticher uk-subnav uk-subnav-pill" uk-switcher>
        <span class="uk-visible@s">Select movie source:</span>
        <li class:uk-active={!$room.isLocalMode}>
            <a on:click={selectOnlineMode} class="uk-button-default">Online link</a>
        </li>
        <span>or</span>
        <li class:uk-active={$room.isLocalMode}>
            <a on:click={selectLocalMode} class="uk-button-default">File on computer</a>
        </li>
    </ul>
{#if $room.isLocalMode}
    <div class="uk-margin-bottom">
        You all downloaded a movie already!? Well done! Everyone should select the same video file.
    </div>
    <div class="uk-text-center">
        <VideoSelectorBtn room={room}/>
    </div>
{:else}
    <div class="uk-margin-bottom">
        Insert a link to <u>Dailymotion</u>, <u>YouTube</u>, <u>Vimeo</u>, <u>HLS</u> playlist, <u>video</u> or <u>audio</u> file. The input is synced with everyone in the room.
    </div>
    <div class="uk-inline uk-width-1-1">
        <input
            bind:value={$room.url}
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
                        If the movie doesn't play, make sure the <u>direct</u> video link is inserted. It's easy, <a href="https://telegra.ph/How-to-watch-movies-from-websites-together-online-03-17" target="_blank" on:click={clicUrlTutorial}>read here</a>!
                    {/if}
                {:else}
                    Video link is invalid
                {/if}
            {:else}
                Don't know how to get a video link from a website? It's easy, <a href="https://telegra.ph/How-to-watch-movies-from-websites-together-online-03-17" target="_blank" on:click={clicUrlTutorial}>read here</a>!
            {/if}
        {/if}
    </i>
</div>

<style lang="scss">
    @import '../constants.scss';

    .hint {
        margin-bottom: -1rem;
    }
    
    .uk-subnav-pill > .uk-active > a {
        background-color: $step2-color;
    }

    .example {
        z-index: 99;
    }

    .example:hover {
        text-decoration: underline;
    }
</style>