<script lang="ts">
    import { fade } from 'svelte/transition';
    import { _ } from 'svelte-i18n';
    import prettierBytes from 'prettier-bytes';
    import { track, ClickEvent, UrlPasteEvent } from '../analytics.svelte';
    import Interpolator from './interpolator.svelte';
    import { getExampleVideo, isExample, haveExamples } from '../stores/video-example';
    import VideoSelectorBtn from './video-selector-btn.svelte';
    import { downloadSpeed, uploadSpeed, progress, isSeeding, peers } from '../stores/web-torrent';
    import { Room } from '../stores/room';
    import Loader from './loader.svelte';
    import { SourceType } from '../normalize-link';
    import { blobUrl } from '../stores/blob';

    export let room: Room;

    $: url = room?.url;
    $: link = room?.link;
    $: if ($url) {
        $blobUrl = '';
    }

    const selectExample = function () {
        $url = getExampleVideo();
        track(new ClickEvent({ target: 'example' }));
    };

    const clickDownloadTutorial = function () {
        track(new ClickEvent({ target: 'download_tutorial' }));
    };

    const clickUrlTutorial = function () {
        track(new ClickEvent({ target: 'url_tutorial' }));
    };

    const onInput = function () {
        track(new UrlPasteEvent({ roomId: room.id, url: $url, isExample: isExample($url) }));
    };
</script>

<b>🔗 { $_('selectVideo.link.title') }</b>
<div class="uk-margin-bottom">
    <Interpolator text={$_('selectVideo.link.description')} let:data={data}>
        {#if data.name === 'type'}
            <u>{ data.text }</u>
        {/if}
    </Interpolator>
</div>
<div class="uk-margin-bottom">
    <div class="uk-inline uk-width-1-1">
        {#if room}
            <input
                bind:value={$url}
                on:input={onInput}
                class="uk-input"
                class:uk-form-danger={!$link}
                placeholder="Video URL"
            />
            {#if !$url && haveExamples}
                <a
                    class="uk-form-icon uk-form-icon-flip uk-text-small uk-padding-small uk-width-auto example pointer"
                    on:click|preventDefault={selectExample}
                    href="/#"
                    transition:fade
                >
                    { $_('selectVideo.link.insertExample') }
                </a>
            {/if}
        {:else}
            <button class="uk-input" disabled><Loader ratio={0.5} /></button>
        {/if}
    </div>
    {#if $link && $link.type == SourceType.magnet && !$isSeeding && isFinite($progress)}
        <progress class="uk-progress progress uk-margin-remove" value={$progress} max="1"></progress>
    {/if}
    </div>

<div class="hint uk-text-center uk-text-small">
    {#if $url}
        {#if $link}
            {#if $link.type == SourceType.direct}
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
            {:else if $link && ($link.type === SourceType.magnet)}
                    <div class="uk-flex uk-text-small uk-relative uk-padding-top">
                            <div class="uk-flex-1">{ $_('downloadSpeed', { values: { speed: `${prettierBytes($downloadSpeed || 0)}/s` }}) }</div>
                            <div class="uk-flex-1">{ $_('uploadSpeed', { values: { speed: `${prettierBytes($uploadSpeed || 0)}/s` }}) }</div>
                            <div class="uk-flex-1">{ $_('peers', { values: { peers: $peers }}) }</div>
                    </div>
                    {#if $isSeeding}
                        <div class="uk-margin-small-top">
                            { $_('dontRefresh') }
                        </div>
                    {/if}
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
</div>

<hr class="uk-margin-bottom"/>

<b>📂 { $_('selectVideo.file.title') }</b>
<div class="uk-margin-bottom">
    { $_('selectVideo.file.description') }
</div>
{#if room}
    <VideoSelectorBtn bind:url={$url} />
{:else}
    <button class="uk-button uk-button-default" disabled><Loader ratio={0.5} /></button>
{/if}
<div class="hint uk-margin-top uk-text-center uk-text-small">
    { $_('selectVideo.file.hint') }
    <Interpolator text={$_('selectVideo.file.help')} let:data={data}>
        {#if data.name === 'link'}
            <a href="https://www.youtube.com/watch?v=FsT7kUaqBdM" target="_blank" on:click={clickDownloadTutorial}>{ data.text }</a>
        {/if}
    </Interpolator>
</div>

<style lang="scss">
    .hint {
       font-style: italic;
    }

    .example {
        z-index: 99;
    }

    .example:hover {
        text-decoration: underline;
    }

    .progress {
        height: 5px;
        background: transparent;
        border-top-left-radius: 0;
        border-top-right-radius: 0;
    }
</style>
