<script lang="ts">
    import { onMount } from 'svelte';
    import 'uikit/dist/js/uikit';
    import { _ } from 'svelte-i18n';
    import { randomStr } from './utils';
    import Analytics from './analytics.svelte';
    import Page from './components/index.svelte';
    import { environment, isProduction } from './settings';
    import './app.scss';

    let header;
    let roomId: string;

    const testPrefix = 'test_';
    const syncHashAndRoomId = function () {
        let hash = document.location.hash?.slice(1).toLowerCase() || localStorage.getItem('roomId') || randomStr(6);
        if (!isProduction && !hash?.startsWith(testPrefix)) {
            hash = `${testPrefix}${hash}`;
        }
        localStorage.setItem('roomId', hash);
        roomId = hash;
        document.location.hash = `#${hash}`;
    };

    syncHashAndRoomId();
</script>

<svelte:window on:hashchange={syncHashAndRoomId}></svelte:window>

<Analytics/>

{#if !isProduction}
    <span class="uk-position-fixed uk-text-warning" style:top="0" style:left="0" style:z-index="10">
        Running in non-production environment: environment="{ environment }", isProd={ isProduction }
    </span>
{/if}

<h1 bind:this={header} class="header">
    🎬 Watch Together
</h1>

<div class="uk-section-secondary window-height uk-flex uk-flex-column">
    <div style:height={header?.clientHeight + 'px'}></div>
    <div class="uk-flex-1 uk-flex uk-flex-center">
        {#if roomId}
            <Page roomId={roomId}/>
        {/if}
    </div>
    <div class="uk-text-small uk-text-muted uk-text-center uk-padding">
        <div>
            <span>{ $_('poweredBy') }</span>
            · <a class="uk-text-muted" href="https://svelte.dev" target="_blank">Svelte</a>
            · <a class="uk-text-muted" href="https://firebase.google.com" target="_blank">Firebase</a>
            · <a class="uk-text-muted" href="https://vidstack.io" target="_blank">Vidstack</a>
            · <a class="uk-text-muted" href="https://getuikit.com" target="_blank">UIkit</a>
        </div>
        <div>
            <a class="uk-text-muted" href="https://asriyan.me" target="_blank">Ed Asriyan</a>
        </div>
    </div>
</div>

<style lang="scss">
    .window-height {
        min-height: 100lvh;
    }

    .header {
        position: fixed;
        color: white;
        width: 100%;
        margin: 0;
        text-align: center;
        font-family: Avenir Next;
        font-size: 2rem;
        padding: 1rem;
        border-bottom: 1px solid rgb(255 255 255 / .1);
        background-color: rgba(1, 1, 1, 0.9);
        z-index: 2;
    }

    .uk-section-secondary {
        background-color: #000;
    }
</style>
