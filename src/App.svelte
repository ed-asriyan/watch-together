<script lang="ts">
    import 'uikit/dist/js/uikit';
    import { _ } from 'svelte-i18n';
    import { randomStr } from './utils';
    import Analytics from './analytics.svelte';
    import Page from './components/index.svelte';
    import { environment, isProduction } from './settings';
    import './app.scss';

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
    <span class="uk-position-fixed uk-text-warning" style:top="0" style:left="0" style:z-index="1000">
        Running in non-production environment: environment="{ environment }", isProd={ isProduction }
    </span>
{/if}

<div class="uk-section-secondary window-height uk-flex uk-flex-column">
    {#if roomId}
        <Page roomId={roomId} />
    {/if}
</div>

<style lang="scss">
    .window-height {
        min-height: 100lvh;
    }

    .uk-section-secondary {
        background-color: #000;
    }

    .footer {
        z-index: 1;
    }
</style>
