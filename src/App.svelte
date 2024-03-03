<script lang="ts">
    import 'uikit/dist/js/uikit';
    import GitHub from './components/github.svelte';
    import { init } from './google-analytics';
    import randomStr from './random-str';
    import './app.scss';

    import Page from './components/index.svelte';

    init();

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

<svelte:head>
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-39LEN0SXX6"></script>
</svelte:head>

<GitHub/>

{#if roomId}
    <Page roomId={roomId}/>
{/if}
