<script lang="ts">
    import { fade } from 'svelte/transition';
    import { _ } from 'svelte-i18n';
    import { track, ClickEvent, UrlPasteEvent } from '../analytics';
    import Interpolator from './interpolator.svelte';
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

<span>{ $_('selectVideo.selectMovieSource')}</span>
<div class="uk-margin-bottom uk-margin-top">
    <button
        class="uk-button uk-button-small"
        class:uk-button-default={$room.isLocalMode}
        class:uk-button-secondary={!$room.isLocalMode}
        on:click={selectOnlineMode}
    >
        { $_('selectVideo.link.title')}
    </button>
    <span class="uk-margin-left uk-margin-right">{ $_('or') }</span>
    <button
        class="uk-button uk-button-small"
        class:uk-button-default={!$room.isLocalMode}
        class:uk-button-secondary={$room.isLocalMode}
        on:click={selectLocalMode}
    >
        { $_('selectVideo.file.title')}
    </button>
</div>
{#if $room.isLocalMode}
    <div class="uk-margin-bottom">
        { $_('selectVideo.file.description') }
    </div>
        <VideoSelectorBtn room={room}/>
{:else}
    <div class="uk-margin-bottom">
        <Interpolator text={$_('selectVideo.link.description')} let:data={data}>
            {#if data.name === 'type'}
                <u>{ data.text }</u>
            {/if}
        </Interpolator>
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
                { $_('selectVideo.link.insertExample') }
            </a>
        {/if}
    </div>
{/if}

<div class="uk-margin-top uk-text-center uk-text-small hint">
    <i>
        {#if $room.isLocalMode}
            { $_('selectVideo.file.hint') }
            <br/>
            <Interpolator text={$_('selectVideo.file.help')} let:data={data}>
                {#if data.name === 'link'}
                    <a href="https://www.youtube.com/watch?v=FsT7kUaqBdM" target="_blank" on:click={clickDownloadTutorial}>{ data.text }</a>
                {/if}
            </Interpolator>
        {:else}
            {#if $room.url}
                {#if $play}
                    {#if $play.type == SourceType.direct}
                        <Interpolator text={$_('selectVideo.link.hintNotWorking')} let:data={data}>
                            {#if data.name === 'u'}
                                <u>{ data.text }</u>
                            {/if}
                        </Interpolator>
                        <Interpolator text={$_('selectVideo.link.help')} let:data={data}>
                            {#if data.name === 'link'}
                                <a href="https://telegra.ph/How-to-watch-movies-from-websites-together-online-03-17" target="_blank" on:click={clickUrlTutorial}>{ data.text }</a>
                            {/if}
                        </Interpolator>
                    {/if}
                {:else}
                    { $_('selectVideo.link.hintInvalid') }
                {/if}
            {:else}
                { $_('selectVideo.link.hintEmpty') }
                <Interpolator text={$_('selectVideo.link.help')} let:data={data}>
                    {#if data.name === 'link'}
                        <a href="https://telegra.ph/How-to-watch-movies-from-websites-together-online-03-17" target="_blank" on:click={clickUrlTutorial}>{ data.text }</a>
                    {/if}
                </Interpolator>
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