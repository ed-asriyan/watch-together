<script lang="ts">
    import { fade } from 'svelte/transition';
    import { _ } from 'svelte-i18n';
    import prettierBytes from 'prettier-bytes';
    import Interpolator from '../interpolator.svelte';
    import FileButton from './file-button.svelte';
    import { useSession } from '../session-context';
    import { pickExample, ui } from '../../../../composition/config';

    const { commands, view } = useSession();
    const source = view.source;
    const delivery = view.delivery;

    /**
     * The input does NOT bind to `$source.raw`.
     *
     * The user's keystrokes and a remote change are two writers of one value.
     * Echoing every keystroke back through the application moves the caret and
     * fights the user. So the component owns a local draft and adopts the
     * view's value only when `revision` changes — i.e. only when someone else
     * changed the source.
     */
    let draft = $state('');
    let adoptedRevision = $state(-1);
    $effect(() => {
        if ($source.revision !== adoptedRevision) {
            adoptedRevision = $source.revision;
            draft = $source.raw;
        }
    });

    // Read the value off the event rather than off `draft`: Svelte's binding
    // and this handler both fire on `input`, and taking `draft` here makes the
    // command lag one keystroke behind what the user typed.
    const onInput = function (event: Event) {
        commands.setSourceFromUserInput((event.currentTarget as HTMLInputElement).value);
    };

    const onExample = function (event: Event) {
        event.preventDefault();
        // The demo list is configuration, so it enters the domain the same way
        // anything else does: as ordinary user input.
        const example = pickExample();
        if (!example) return;
        draft = example;
        commands.setSourceFromUserInput(example);
    };
</script>

<b>🔗 { $_('selectVideo.link.title') }</b>
<div class="uk-margin-bottom">
    <Interpolator text={$_('selectVideo.link.description')}>
        {#snippet children({ data })}
            {#if data.name === 'type'}<u>{ data.text }</u>{/if}
        {/snippet}
    </Interpolator>
</div>

<div class="uk-margin-bottom">
    <div class="uk-inline uk-width-1-1">
        <input
            bind:value={draft}
            oninput={onInput}
            class="uk-input"
            class:uk-form-danger={!$source.empty && !$source.valid}
            placeholder="Video URL"
        />
        {#if $source.empty && ui.hasExamples}
            <a
                class="uk-form-icon uk-form-icon-flip uk-text-small uk-padding-small uk-width-auto example pointer"
                onclick={onExample}
                href="/#"
                transition:fade
            >
                { $_('selectVideo.link.insertExample') }
            </a>
        {/if}
    </div>
    {#if $delivery.visible && !$delivery.seeding && $delivery.progress !== null}
        <progress class="uk-progress progress uk-margin-remove" value={$delivery.progress} max="1"></progress>
    {/if}
</div>

<div class="hint uk-text-center uk-text-small">
    {#if $source.empty}
        { $_('selectVideo.link.hintEmpty') }
        <Interpolator text={$_('selectVideo.link.help')}>
            {#snippet children({ data })}
                {#if data.name === 'link'}
                    <u><a
                        href="https://telegra.ph/How-to-watch-movies-from-websites-together-online-03-17"
                        target="_blank"
                        onclick={() => commands.recordInteraction('url_tutorial')}
                    >{ data.text }</a></u>
                {/if}
            {/snippet}
        </Interpolator>
    {:else if !$source.valid}
        { $_('selectVideo.link.hintInvalid') }
    {:else if $source.kind === 'direct' || $source.kind === 'hls'}
        <Interpolator text={$_('selectVideo.link.hintNotWorking')}>
            {#snippet children({ data })}
                {#if data.name === 'u'}<u>{ data.text }</u>{/if}
            {/snippet}
        </Interpolator>
        <Interpolator text={$_('selectVideo.link.help')}>
            {#snippet children({ data })}
                {#if data.name === 'link'}
                    <a
                        href="https://telegra.ph/How-to-watch-movies-from-websites-together-online-03-17"
                        target="_blank"
                        onclick={() => commands.recordInteraction('url_tutorial')}
                    >{ data.text }</a>
                {/if}
            {/snippet}
        </Interpolator>
    {:else if $source.kind === 'magnet'}
        <div class="uk-flex uk-text-small uk-relative uk-padding-top">
            <div class="uk-flex-1">{ $_('downloadSpeed', { values: { speed: `${prettierBytes($delivery.downloadBytesPerSecond)}/s` } }) }</div>
            <div class="uk-flex-1">{ $_('uploadSpeed', { values: { speed: `${prettierBytes($delivery.uploadBytesPerSecond)}/s` } }) }</div>
            <div class="uk-flex-1">{ $_('peers', { values: { peers: $delivery.peers } }) }</div>
        </div>
        {#if $delivery.seeding}
            <div class="uk-margin-small-top">{ $_('dontRefresh') }</div>
        {/if}
    {/if}
</div>

<hr class="uk-margin-bottom"/>

<b>📂 { $_('selectVideo.file.title') }</b>
<div class="uk-margin-bottom">{ $_('selectVideo.file.description') }</div>
<div class="uk-text-center">
    <FileButton />
    <div class="hint uk-margin-top uk-text-center uk-text-small">
        { $_('selectVideo.file.hint') }
        <Interpolator text={$_('selectVideo.file.help')}>
            {#snippet children({ data })}
                {#if data.name === 'link'}
                    <u><a
                        href="https://www.youtube.com/watch?v=FsT7kUaqBdM"
                        target="_blank"
                        onclick={() => commands.recordInteraction('download_tutorial')}
                    >{ data.text }</a></u>
                {/if}
            {/snippet}
        </Interpolator>
    </div>
</div>

<style lang="scss">
    .hint { font-style: italic; }
    .example { z-index: 99; }
    .example:hover { text-decoration: underline; }
    .progress {
        height: 5px;
        background: transparent;
        border-top-left-radius: 0;
        border-top-right-radius: 0;
    }
</style>
