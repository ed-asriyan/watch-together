<script lang="ts">
    import { fade } from 'svelte/transition';
    import { goto } from '$app/navigation'
    import { browser } from '$app/environment';
    import { page } from '$app/stores';
    import randomStr from '../random-str';
    import Loader from './loader.svelte';
    import { RemoteRoom } from '../remote-room';
    import { LocalRoom } from '../local-room';
    import VideoSelector from './1-video-selector.svelte';
    import CopyUrl from './2-copy-url.svelte';
    import VideoViewer from './3-video-viewer.svelte';

    let roomId = $page.url.hash?.slice(1);
    if (!roomId) {
        roomId = randomStr(8);
        if (browser) {
            goto(`#${roomId}`);
        }
    }
    roomId = roomId.toLocaleLowerCase();

    $: remoteRoom = new RemoteRoom(roomId);
    let isLoading = true;
    $: remoteRoom.load().finally(() => isLoading = false);
    $: localRoom = new LocalRoom(remoteRoom);

    let playUrl: string | null;
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
                <VideoSelector room={localRoom} bind:playUrl={playUrl} />
            </div>
        </div>
    </div>
    <div class="uk-section uk-section-primary uk-section-small" transition:fade>
        <div class="uk-container uk-container-small">
            <CopyUrl />
        </div>
    </div>
    <div class="uk-section uk-section-secondary uk-section-small window-height uk-flex">
        <div class="uk-container uk-container-small uk-flex-1 uk-flex uk-flex-column">
            <VideoViewer room={localRoom} playUrl={playUrl} /> 
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
    @import '../constants.scss';

    h1 {
        font-family: Academy Engraved LET;
    }

    h1:hover {
        color: gray;
    }

    h1:active {
        color: black;
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
        min-width: 100vw;
    }
</style>
