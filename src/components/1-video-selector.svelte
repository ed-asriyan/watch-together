<script lang="ts">
    import { fade } from 'svelte/transition';
    import { trackClick } from '../google-analytics';
    import videoExample from '../stores/video-example';
    import VideoSelectorBtn from './video-selector-btn.svelte';
    import { LocalRoom } from '../stores/local-room';

    export let room: LocalRoom;

    const selectExample = function () {
        $room.url = videoExample();
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

    $: playUrl = room.playUrl;
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
        You all downloaded a movie already!? Well done! Everyone should select the same video file, please.
    </div>
    <VideoSelectorBtn room={room}/>
{:else}
    <div class="uk-margin-bottom">
        Insert a link to YouTube, Vimeo, HLS playlist, video or audio file. The input is synchronized with everyone in the room.
    </div>
    <div class="uk-inline uk-width-1-1">
        <input
            bind:value={$room.url}
            class="uk-input"
            class:uk-form-danger={!$playUrl}
            placeholder="Video URL"
        />
        {#if !$playUrl}
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

<style lang="scss">
    @import '../constants.scss';
    
    .uk-subnav-pill > .uk-active > a {
        background-color: $red-color;
    }

    .example {
        z-index: 99;
    }

    .example:hover {
        text-decoration: underline;
    }
</style>