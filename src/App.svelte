<script lang="ts">
    import { onMount } from 'svelte';
    import 'uikit/dist/js/uikit';
    import { randomStr } from './utils';
    import Analytics from './components/analytics.svelte';
    import GitHub from './components/github.svelte';
    import Page from './components/index.svelte';
    import { environment, isProduction } from './settings';
    import './app.scss';

    const getRoomId = function () {
        return document.location.hash?.slice(1).toLowerCase();
    };

    let roomId = getRoomId();
    if (!roomId) {
        document.location.hash = `#${localStorage.getItem('roomId') || randomStr(6)}`;
    }

    $: roomId && localStorage.setItem('roomId', roomId);

    const onHashChanged = function () {
        roomId = getRoomId();
    };
</script>

<svelte:window on:hashchange={onHashChanged}></svelte:window>

<Analytics/>

<GitHub/>

{#if !isProduction}
    <span class="uk-position-absolute uk-text-warning">
        Running in non-production environment: environment="{ environment }", isProd={ isProduction }
    </span>
{/if}

{#if roomId}
    <Page roomId={roomId}/>
{/if}
